import { NodeKwil, WebKwil, Types } from "@kwilteam/kwil-js";
import { EthSigner } from "@kwilteam/kwil-js/dist/core/builders";
import { assertNotNull } from "@subsquid/util-internal";
import { Config as KwilConfig } from "@kwilteam/kwil-js/dist/api_client/config";

export interface KwilAction {
    execute(inputs: Types.ActionInput | Types.ActionInput[]): Promise<void>;
}

/**
 * KwilAction is a wrapper around the Kwil SDK that allows you to easily deploy records to Kwil Database.
 */
export class KwilAction implements KwilAction {
    private kwil: NodeKwil | WebKwil;
    private actionName: string;
    private dbid: string | (() => Promise<string>);
    private signer: EthSigner;
    private publicKey: string | (() => Promise<string>);
    private txQueryTries: number = 0;

    /**
     * Creates a new `KwilAction` instance.
     * 
     * @param {KwilConfig} config - The configuration object for the `KwilAction`. 
     * @param {string} actionName - The name of the action from your Kuneiform schema that will be executed.
     * @param {string | (() => Promise<string>)} dbid - The dbid of the Kwil Database you want to deploy to. Can be a string or a function that returns a string (e.g. for lazy eval).
     * @param {EthSigner} signer - The signer that will sign the transaction. It must be a signer from Ethers v5 or v6.
     * @param {string | (() => Promise<string>)} publicKey - The public key of the signer. Can be a string or a function that returns a string (e.g. for lazy eval). 
     * 
     * @example
     * ```ts
     * import { KwilConfig, KwilAction } from "kwil-subsquid-adapter";
        import { Wallet } from "ethers";
        import { Utils } from "@kwilteam/kwil-js";

     * const kwilConfig: KwilConfig = {
     *      kwilProvider: "http://localhost:8080",
     * };
     * const wallet = new Wallet(<private_key>);
     * const publicKey = async () => Utils.recoverSecp256k1PubKey(wallet);
     * const dbid = async () => Utils.generateDBID(await publicKey(), "test_subsquid");
     * 
     * const AddDate = new KwilAction(kwilConfig, "add_records", dbid, wallet, publicKey);
     * ```
     */
    constructor(
        config: KwilConfig,
        actionName: string,
        dbid: string | (() => Promise<string>),
        signer: EthSigner,
        publicKey: string | (() => Promise<string>)
    ) {
        // create Kwil class
        if (typeof window !== "undefined") {
            this.kwil = new WebKwil(config);
        } else {
            this.kwil = new NodeKwil(config);
        }

        this.dbid = dbid;
        this.signer = signer;
        this.publicKey = publicKey;
        this.actionName = actionName;
    }

    public async execute(inputs: Types.ActionInput | Types.ActionInput[]): Promise<void> {
        // resolve publicKey if it is a function
        if (typeof this.publicKey === "function") {
            this.publicKey = await this.publicKey();
        }

        // resolve dbid if it is a function
        if (typeof this.dbid === "function") {
            this.dbid = await this.dbid();
        }

        // construct kwil tx - note to subsquid-team: the tx build process will be much simpler in the next release see {@link https://github.com/kwilteam/kwil-js/issues/32}
        const tx = await this.kwil
            .actionBuilder()
            .dbid(this.dbid)
            .signer(this.signer)
            .publicKey(this.publicKey)
            .name(this.actionName)
            .concat(inputs)
            .buildTx();

        // broadcast tx to Kwil Database
        const { data } = await this.kwil.broadcast(tx);

        // retrieve hash from response
        const hash = data?.tx_hash;
        assertNotNull(hash, "No hash returned. Ensure you are connect to Kwil Database.");

        // wait for the TX to be mined on the local Kwil chain
        await this.waitForDeployment(hash as string);

        if (!Array.isArray(inputs)) {
            inputs = [inputs];
        }

        console.log(`Successfully deployed ${inputs.length} records to Kwil Database.`);
    }

    /**
     * `waitForDeployment` waits for the tx to be mined on the local Kwil chain.
     * 
     * @param {string} hash - The hash of the tx that was broadcast to Kwil Database.
     */
    private async waitForDeployment(hash: string): Promise<void> {
        return new Promise(async (resolve, reject) => {
            setTimeout(async () => {
                try {
                    // check the status of the tx
                    const txQuery = await this.kwil.txInfo(hash);

                    // retrieve the log from the tx
                    const log = txQuery.data?.tx_result.log;
                    assertNotNull(log, "No log returned. Ensure you are connect to Kwil Database.");

                    // if tx is successful, resolve
                    if (txQuery.status === 200 && log === "success") {
                        resolve();
                        this.txQueryTries = 0;
                    }

                    // if log is empty string, it means tx is still pending
                    if (txQuery.status === 200 && log === "") {
                        // retry after 500 ms if log has not yet loaded
                        resolve(await this.waitForDeployment(hash));
                    }

                    // if log is not empty string and not success, reject
                    if (txQuery.status === 200 && log !== "success") {
                        reject(`Error deploying action: ${log}`);
                        this.txQueryTries = 0;
                    }
                } catch (err) {
                    // sometimes there is a slight delay between when a hash is returned and when it is accessible via txInfo. We will try to retrieve it 4 times (2 seconds) before we assume something went wrong.
                    if (this.txQueryTries >= 4) {
                        reject(`Error deploying action: ${err}`);
                        this.txQueryTries = 0;
                    }

                    this.txQueryTries++;
                    resolve(await this.waitForDeployment(hash));
                }
            }, 500);
        });
    }
}

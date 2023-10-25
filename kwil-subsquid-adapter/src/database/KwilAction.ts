import { NodeKwil, Utils, WebKwil, Types } from "@kwilteam/kwil-js"
import { EthSigner } from "@kwilteam/kwil-js/dist/core/builders"
import { assertNotNull } from "@subsquid/util-internal"
import { Config } from "@kwilteam/kwil-js/dist/api_client/config"

export interface KwilAction {
    execute(inputs: Types.ActionInput | Types.ActionInput[]): Promise<void>
}

export class KwilAction implements KwilAction {
    private kwil: NodeKwil | WebKwil;
    private actionName: string;
    private dbid: string | (() => Promise<string>)
    private signer: EthSigner 
    private publicKey: string| (() => Promise<string>)
    private txQueryTries: number = 0

    constructor(config: Config, actionName: string, dbid: string | (() => Promise<string>), signer: EthSigner, publicKey: string | (() => Promise<string>)) {
        if(typeof window !== 'undefined') {
            this.kwil = new WebKwil(config)
        } else {
            this.kwil = new NodeKwil(config)
        }

        this.dbid = dbid
        this.signer = signer
        this.publicKey = publicKey
        this.actionName = actionName
    }

    public async execute(inputs: Types.ActionInput | Types.ActionInput[]): Promise<void> {
        // resolve publicKey if it is a function
        if(typeof this.publicKey === 'function') {
            this.publicKey = await this.publicKey()
        }

        console.log('attempting to deploy')

        // resolve dbid if it is a function
        if(typeof this.dbid === 'function') {
            this.dbid = await this.dbid()
        }

        const tx = await this.kwil.actionBuilder()
            .dbid(this.dbid)
            .signer(this.signer)
            .publicKey(this.publicKey)
            .name(this.actionName)
            .concat(inputs)
            .buildTx()

        const { data } = await this.kwil.broadcast(tx)
        const hash = data?.tx_hash
        assertNotNull(hash, 'No hash returned. Ensure you are connect to Kwil Database.')

        await this.waitForDeployment(hash as string)

        if(!Array.isArray(inputs)) {
            inputs = [inputs]
        }

        console.log(`Successfully deployed ${inputs.length} records to Kwil Database.`)
    }

    private async waitForDeployment(hash: string): Promise<void> {
        return new Promise(async (resolve, reject) => {
            setTimeout(async () => {
                try {
                    const txQuery = await this.kwil.txInfo(hash);
                    const log = txQuery.data?.tx_result.log
                    assertNotNull(log, 'No log returned. Ensure you are connect to Kwil Database.')

                    // if tx is successful, resolve
                    if(txQuery.status === 200 && log === 'success') {
                        resolve()
                        this.txQueryTries = 0
                    }

                    // if log is empty string, it means tx is still pending
                    if(txQuery.status === 200 && log === '') {
                        // retry after 500 ms if log has not yet loaded
                        resolve(await this.waitForDeployment(hash))
                    }

                    // if log is not empty string and not success, reject
                    if(txQuery.status === 200 && log !== 'success') {
                        reject(`Error deploying action: ${log}`)
                        this.txQueryTries = 0
                    }
                } catch (err) {
                    // sometimes there is a slight delay between when a hash is returned and when it is accessible via txInfo. We will try to retrieve it 4 times (2 seconds) before we assume something went wrong
                    if(this.txQueryTries >= 4) {
                        reject(`Error deploying action: ${err}`)
                        this.txQueryTries = 0
                    }

                    this.txQueryTries++
                    resolve(await this.waitForDeployment(hash))
                }
            }, 500);
        })
    }
}
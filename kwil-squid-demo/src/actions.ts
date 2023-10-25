import { KwilConfig, KwilAction } from "../../kwil-subsquid-adapter/dist";
import { Wallet } from "ethers";
import { Utils } from "@kwilteam/kwil-js";

// create the kwil config. Default for local development is http://localhost:8080
const kwilConfig: KwilConfig = {
    kwilProvider: "http://localhost:8080",
};

// create the wallet for signing txs
const wallet = new Wallet(process.env.PRIVATE_KEY as string);

// create the public key for the wallet. Because recoverySecp256k1PubKey is async, we need to wrap it in a function and call it later
const publicKey = async () => Utils.recoverSecp256k1PubKey(wallet);

// create the dbid. Because we need to call the async publicKey function, we need to wrap it in a function and call it later
const dbid = async () => Utils.generateDBID(await publicKey(), "test_subsquid");

// create an action
export const AddData = new KwilAction(kwilConfig, "add_records", dbid, wallet, publicKey);
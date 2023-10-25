import { KwilConfig, KwilAction } from "../../kwil-subsquid-adapter/dist";
import { Wallet } from "ethers";
import { Utils } from "@kwilteam/kwil-js";

const kwilConfig: KwilConfig = {
    kwilProvider: "http://localhost:8080",
};
const wallet = new Wallet(process.env.PRIVATE_KEY as string);
const publicKey = async () => Utils.recoverSecp256k1PubKey(wallet);
const dbid = async () => Utils.generateDBID(await publicKey(), "test_subsquid");

export const AddData = new KwilAction(kwilConfig, "add_records", dbid, wallet, publicKey);
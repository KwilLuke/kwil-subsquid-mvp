import { KwilConfig, KwilAction } from "../../kwil-subsquid-adapter/dist";
import { Wallet } from "ethers";
import { Utils, KwilSigner } from "@kwilteam/kwil-js";
import dotenv from "dotenv";
dotenv.config();

// create the kwil config. Default for local development is http://localhost:8080
const kwilConfig: KwilConfig = {
    kwilProvider: "http://localhost:8080",
    chainId: process.env.CHAIN_ID as string
};

// create the wallet for signing txs
const wallet = new Wallet(process.env.PRIVATE_KEY as string);

// create the kwilSigner
const kwilSigner = new KwilSigner(wallet, wallet.address)

// create the dbid. Because we need to call the async publicKey function, we need to wrap it in a function and call it later
const dbid = Utils.generateDBID(kwilSigner.identifier, "test_subsquid");

// create an action
export const AddData = new KwilAction(kwilConfig, "add_records", dbid, kwilSigner);
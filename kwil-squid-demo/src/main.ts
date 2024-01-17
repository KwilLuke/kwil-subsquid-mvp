import * as bayc from "./abi/bayc";
import { CONTRACT_ADDRESS, processor } from "./processor";
import { db } from "./db";
import { NodeKwil, Utils } from "@kwilteam/kwil-js";
import { Wallet } from "ethers";
import dotenv from "dotenv";

dotenv.config();

const ActionInput = Utils.ActionInput;

processor.run(db, async (ctx) => {
    // create array to store inputs as they are created
    let inputs = [];

    for (let block of ctx.blocks) {
        for (let log of block.logs) {
            if (log.address === CONTRACT_ADDRESS && log.topics[0] === bayc.events.Transfer.topic) {
                let { from, to, tokenId } = bayc.events.Transfer.decode(log);

                // create the input to be passed to the execute function: https://github.com/KwilLuke/kwil-subsquid-mvp/blob/main/kwil-subsquid-adapter/src/database/KwilAction.ts
                const input = {
                    $id: log.id,
                    $token_id: tokenId.toString(),
                    $transfer_from: from,
                    $transfer_to: to,
                    $tx_timestamp: String(block.header.timestamp),
                    $block_number: Number(block.header.height),
                    $tx_hash: log.transactionHash,
                };

                // add input to inputs array
                inputs.push(input);

                // once there are 1000 records, we will batch insert them into the database
                // the default config for batch actions on a kwil network is 1mb. This is something that can be changed at network genesis.
                // I generally assume 1000 records for this index is below 1mb.
                if (inputs.length >= 1000) {
                    await ctx.store.AddData.execute(inputs);
                    inputs = [];
                }
            }
        }
    }
});

import * as bayc from './abi/bayc'
import {CONTRACT_ADDRESS, processor} from './processor'
import { db } from './db'
import { NodeKwil, Utils } from '@kwilteam/kwil-js'
import { Wallet } from 'ethers'
import dotenv from 'dotenv'

dotenv.config()

const ActionInput = Utils.ActionInput

processor.run(db, async (ctx) => {
    let inputs = [];

    for (let block of ctx.blocks) {
        for (let log of block.logs) {
            if (log.address === CONTRACT_ADDRESS && log.topics[0] === bayc.events.Transfer.topic) {
                let {from, to, tokenId} = bayc.events.Transfer.decode(log)

                const input = new ActionInput()
                    .putFromObject({
                        '$id': log.id,
                        '$token_id': tokenId.toString(),
                        '$transfer_from': from,
                        '$transfer_to': to,
                        '$tx_timestamp': String(block.header.timestamp),
                        '$block_number': Number(block.header.height),
                        '$tx_hash': log.transactionHash
                    })

                inputs.push(input)

                if(inputs.length >= 1000) {
                    await ctx.store.AddData.execute(inputs)
                    inputs = []
                }
            }
        }
    }
})
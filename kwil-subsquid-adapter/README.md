# kwil-subsquid-adapter

This is a library for using the Subsquid SDK to index data into a Kwil Database.

This library is considered experimental and is not yet recommended for production use.

## Usage

This library exports two classes to be used in the Subsquid SDK: `KwilDatabase` and `KwilAction`.

### KwilDatabase

The `KwilDatabase` class is a custom database implementation that can be used in the Subsquid SDK.

To create an instance of the `KwilDatabase` class, you will need to pass in the following parameters:

```typescript
import { MyAction } from "./actions";
import { KwilDatabase, LocalDest } from "../../kwil-subsquid-adapter/dist";

export const db = new KwilDatabase({
    // add actions to local kwil database
    actions: {
        MyAction,
    },
    // indicate where the indexing status should be stored
    status: new LocalDest("./status"),
});
```

Then, pass the `db` instance to the Subsquid SDK's `processor.run()` method:

```typescript
import { db } from "./db";

processor.run(db, async(ctx) => { ... });
```

### KwilAction

The `KwilAction` class is used to create a simple interface for executing actions on a Kwil [Kuneiform Schema](https://docs.kwil.com/docs/kuneiform/introduction).

To create an instance of the `KwilAction` class, you will need to pass in the following parameters:

```typescript
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
```

Then, you can add this action to the `KwilDatabase` instance.

## Execute Action

Once data is indexed, you can execute on the action on the Kwil Database by calling the `execute()` method on the processor's `ctx.store` object:

```typescript
import { Utils } from '@kwilteam/kwil-js';

const ActionInput = Utils.ActionInput;

processor.run(db, async (ctx) => {
    ...
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

    await ctx.store.AddData.execute(input); 
})
```

It is recommended to execute inputs in batch. You can see a sample implementation of this in the [kwil-squid-demo](https://github.com/KwilLuke/kwil-subsquid-mvp/blob/main/kwil-squid-demo/src/main.ts).

## Quickstart

To run a subsquid indexer against a Kwil Database, follow the steps in the repo-level [README.md](../README.md).

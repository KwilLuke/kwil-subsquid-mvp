import { FinalDatabase, FinalTxInfo, HashAndHeight } from "@subsquid/util-internal-processor-tools";
import assert from "assert";
import { DatabaseHooks } from "../types/database";
import { defaultHooks } from "./hooks";
import { Dest } from "../types/dest";
import { Actions, Store } from "../types/actions";

/**
 * `DatabaseConfig` is the configuration object for the KwilDatabase.
 *
 * `T` should extend `Action` and `D` should extend `Dest`.
 *
 * `hooks` is optional and allows for writing the indexing status to local filesystem.
 *
 * @example
 * ```ts
 * const dbConfig: DatabaseConfig = {
 *    actions : {
 *      AddData,
 *   },
 *  status: new LocalDest("./status"),
 * };
 * ```
 */
interface DatabaseConfig<T, D> {
    actions: T;
    status: D;
    hooks?: DatabaseHooks;
}

/**
 * `StoreConstructor` is a constructor for the `Store` class.
 *  It is to allow the processors `ctx` to have a `store` property that contains each action's name.
 *  See github link {@link https://github.com/KwilLuke/kwil-subsquid-mvp/blob/main/kwil-squid-demo/src/main.ts} for more example.
 */
interface StoreConstructor<T extends Actions> {
    new (foo: () => any): Store<T>;
}

/**
 * `KwilDatabase` is the database class for the Kwil Subsquid Adapter.
 *
 * `T` should extend `Action` and `D` should extend `Dest`.
 *
 */
export class KwilDatabase<T extends Actions, D extends Dest> implements FinalDatabase<Store<T>> {
    public readonly actions: T;
    private state?: HashAndHeight;
    private readonly hooks: DatabaseHooks<D>;
    private dest: D;
    private StoreConstructor: StoreConstructor<T>;

    /**
     * Creates a new `KwilDatabase` instance.
     *
     * @param config The configuration object for the `KwilDatabase`.
     */
    constructor(config: DatabaseConfig<T, D>) {
        this.actions = config.actions;
        this.dest = config.status;

        // hooks allow for writing the indexing status to local filesystem
        this.hooks = config.hooks || defaultHooks;

        // create a Store class that has each action's name as a property
        class Store {
            constructor(protected foo: () => any) {}
        }

        // add each action's name as a property to the Store class
        for (let name in this.actions) {
            Object.defineProperty(Store.prototype, name, {
                get(this: Store) {
                    return this.foo()[name];
                },
            });
        }

        // set the StoreConstructor
        this.StoreConstructor = Store as any;
    }

    /**
     * `connect` is called when the indexer is first started. @Subsquid-team, is this correct?
     *
     * @returns {HashAndHeight} The latest hash and height from the local filesystem.
     */
    async connect(): Promise<HashAndHeight> {
        // because the of the risk having conflicting primary key ids, it is best to restart the indexer
        // to restart the indexer, first remove the old status.txt file
        // in the future, we can create a better system for tracking the indexing state for data last pushed to Kwil. This will allow for a more robust index pause and resume.
        await this.dest.rm("status.txt");

        // get the state from the local filesystem, which creates a new status.txt file if it does not exist
        this.state = await this.getState();

        return this.state;
    }

    /**
     * `transact` is called when the indexer is processing a new block. @Subsquid-team, is this correct?
     *
     * @param {FinalTxInfo} info The `FinalTxInfo` object that contains the block's hash and height. This is provided from the subsquid SDK.
     * @param {(Store<T>) => Promise<void>} cb The callback function that is executed when the state is updated. @Subsquid-team - what exactly is the callback function that is passed from the Squid SDK, and what is its purpose?
     */
    async transact(info: FinalTxInfo, cb: (store: Store<T>) => Promise<void>): Promise<void> {
        let dbState = await this.getState();
        let { nextHead: newState } = info;

        // ensure that we are indexing a new state
        assert(
            dbState.hash === dbState.hash && dbState.height === dbState.height,
            "state was updated by foreign process, make sure no other processor is running"
        );
        assert(dbState.height < newState.height);
        assert(dbState.hash != newState.hash);

        // if all asserts pass, execute callback and update state

        //@Subsquid-team - what is the purpose of the callback function / where is it passed in the Squid SDK?
        await cb(new this.StoreConstructor(() => this.actions));

        // update state
        await this.hooks.onStateUpdate(this.dest, newState, dbState);
    }

    /**
     * `getState` gets the latest hash and height from the local filesystem.
     *
     * @returns {HashAndHeight} The latest hash and height from the local filesystem.
     */
    private async getState(): Promise<HashAndHeight> {
        let state = await this.hooks.onStateRead(this.dest);

        // if null, write to local filesystem
        if (state == null) {
            state = { height: -1, hash: "0x" };
            await this.hooks.onStateUpdate(this.dest, state);
        }
        assert(Number.isSafeInteger(state.height));
        return state;
    }
}

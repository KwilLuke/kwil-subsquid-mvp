import { FinalDatabase, FinalTxInfo, HashAndHeight } from "@subsquid/util-internal-processor-tools";
import assert from "assert";
import { DatabaseHooks } from "../types/database";
import { defaultHooks } from "./hooks";
import { Dest } from "../types/dest";
import { Actions, Store } from "../types/tables";

interface KwilConfig<T, D> {
    actions: T;
    status: D;
    hooks?: DatabaseHooks;
}

interface StoreConstructor<T extends Actions> {
    new (foo: () => any): Store<T>
}

export class KwilDatabase<T extends Actions, D extends Dest> implements FinalDatabase<Store<T>> {
    public readonly actions: T;
    private state?: HashAndHeight;
    private readonly hooks: DatabaseHooks<D>;
    private dest: D;
    private StoreConstructor: StoreConstructor<T>;

    constructor(config: KwilConfig<T, D>) {
        this.actions = config.actions;
        this.dest = config.status;
        this.hooks = config.hooks || defaultHooks;

        class Store {
            constructor(protected foo: () => any) {}
        }

        for (let name in this.actions) {
            Object.defineProperty(Store.prototype, name, {
                get(this: Store) {
                    return this.foo()[name]
                }
            })
        }

        this.StoreConstructor = Store as any;
    }

    async connect(): Promise<HashAndHeight> {
        // reset status.txt
        await this.dest.rm('status.txt');
        this.state = await this.getState();

        return this.state;
    }

    async transact(info: FinalTxInfo, cb: (store: Store<T>) => Promise<void>): Promise<void> {
        let dbState = await this.getState();
        let { nextHead: newState } = info;

        assert(
            dbState.hash === dbState.hash && dbState.height === dbState.height,
            "state was updated by foreign process, make sure no other processor is running"
        );
        assert(dbState.height < newState.height);
        assert(dbState.hash != newState.hash);

        // if all asserts pass, execute callback and update state
        await cb(new this.StoreConstructor(() => this.actions));
        await this.hooks.onStateUpdate(this.dest, newState, dbState);
    }

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

import { Dest } from "./dest";

interface HashAndHeight {
    hash: string;
    height: number;
}

interface FinalTxInfo {
    prevHead: HashAndHeight;
    nextHead: HashAndHeight;
    isOnTop: boolean;
}

export interface DatabaseHooks<D extends Dest = Dest> {
    onStateRead(dest: D): Promise<HashAndHeight | undefined>;
    onStateUpdate(dest: D, state: HashAndHeight, prev?: HashAndHeight): Promise<void>;
}

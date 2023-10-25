import { HashAndHeight } from "@subsquid/util-internal-processor-tools";
import { Dest } from "./dest";

export interface DatabaseHooks<D extends Dest = Dest> {
    onStateRead(dest: D): Promise<HashAndHeight | undefined>;
    onStateUpdate(dest: D, state: HashAndHeight, prev?: HashAndHeight): Promise<void>;
}

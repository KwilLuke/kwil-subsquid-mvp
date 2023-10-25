import { AddData } from "./actions";
import { KwilDatabase, LocalDest } from "../../kwil-subsquid-adapter/dist";

export const db = new KwilDatabase({
    actions: {
        AddData,
    },
    status: new LocalDest("./status"),
});

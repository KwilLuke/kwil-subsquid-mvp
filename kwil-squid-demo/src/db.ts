import { AddData } from "./actions";
import { KwilDatabase, LocalDest } from "../../kwil-subsquid-adapter/dist";

export const db = new KwilDatabase({
    // add actions to local kwil database
    actions: {
        AddData,
    },
    // indicate where the indexing status should be stored
    status: new LocalDest("./status"),
});

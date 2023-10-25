import { DatabaseHooks } from "../types/database"

const DEFAULT_STATUS_FILE = `status.txt`

export const defaultHooks: DatabaseHooks = {
    async onStateRead(dest) {
        if (await dest.exists(DEFAULT_STATUS_FILE)) {
            let [height, hash] = await dest.readFile(DEFAULT_STATUS_FILE).then((d) => d.split('\n'))
            return {height: Number(height), hash: hash || '0x'}
        } else {
            return undefined
        }
    },
    async onStateUpdate(dest, info) {
        await dest.writeFile(DEFAULT_STATUS_FILE, info.height + '\n' + info.hash)
    },
}
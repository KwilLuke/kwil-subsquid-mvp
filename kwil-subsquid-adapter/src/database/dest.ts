import {existsSync} from 'fs'
import fs from 'fs/promises'
import path from 'upath'
import { Dest } from '../types/dest'

/**
 * Dest implementation for interacting with local filesystems.
 */
export class LocalDest implements Dest {
    protected dir: string

    /**
     * Dest implementation for interacting with local filesystems.
     *
     * @param dir - output folder
     */
    constructor(dir: string) {
        this.dir = path.normalize(dir)
    }

    async exists(name: string) {
        return existsSync(this.path(name))
    }

    async readFile(name: string): Promise<string> {
        return fs.readFile(this.path(name), 'utf-8')
    }

    async writeFile(name: string, data: string | Uint8Array): Promise<void> {
        let destPath = this.path(name)
        await this.mkdir(path.dirname(destPath))
        return fs.writeFile(destPath, data, 'utf-8')
    }

    async rm(name: string): Promise<void> {
        return fs.rm(this.path(name), {recursive: true, force: true})
    }

    async readdir(dir: string): Promise<string[]> {
        if (await this.exists(dir)) {
            return fs.readdir(this.path(dir))
        } else {
            return []
        }
    }

    async mkdir(dir: string): Promise<void> {
        await fs.mkdir(dir, {recursive: true})
    }

    async rename(oldPath: string, newPath: string): Promise<void> {
        return fs.rename(this.path(oldPath), this.path(newPath))
    }


    path(...paths: string[]) {
        return path.join(this.dir, ...paths)
    }
}
export interface Dest {
    readFile(file: string): Promise<string>
    writeFile(file: string, data: string | Uint8Array): Promise<void>
    exists(path: string): Promise<boolean>
    mkdir(path: string): Promise<void> // always recursive
    readdir(path: string): Promise<string[]>
    rm(path: string): Promise<void> // always recursive and force
    path(...paths: string[]): string
}
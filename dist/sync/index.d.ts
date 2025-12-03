export interface SyncOptions {
    manifestPath?: string;
    host: string;
    port?: number;
    username: string;
    privateKeyPath?: string;
    password?: string;
    remoteDir: string;
}
export declare function sync(options: SyncOptions): Promise<void>;
//# sourceMappingURL=index.d.ts.map
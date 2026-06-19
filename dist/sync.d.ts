export interface SyncOptions {
    localDir: string;
    manifestPath?: string;
    host: string;
    port?: number;
    username: string;
    privateKeyPath?: string;
    password?: string;
    passphrase?: string;
    remoteDir: string;
    deleteExtra?: boolean;
    fast?: boolean;
    dry?: boolean;
    quiet?: boolean;
    progress?: boolean;
    exclude?: string[];
    include?: string[];
}
export declare function sync(options: SyncOptions): Promise<void>;
//# sourceMappingURL=sync.d.ts.map
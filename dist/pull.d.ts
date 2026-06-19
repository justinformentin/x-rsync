export interface PullOptions {
    manifestPath?: string;
    host: string;
    port?: number;
    username: string;
    privateKeyPath?: string;
    password?: string;
    passphrase?: string;
    remoteDir: string;
    quiet?: boolean;
    progress?: boolean;
}
export declare function pull(options: PullOptions, internal?: boolean): Promise<{
    manifest: import("./types.js").Manifest;
    sftp: import("ssh2-sftp-client");
} | undefined>;
//# sourceMappingURL=pull.d.ts.map
export interface DeployOptions {
    localDir: string;
    manifestPath?: string;
    host: string;
    port?: number;
    username: string;
    privateKeyPath?: string;
    password?: string;
    remoteDir: string;
    deleteExtra?: boolean;
    fast?: boolean;
    dry?: boolean;
}
export declare function deploy(options: DeployOptions): Promise<void>;
//# sourceMappingURL=index.d.ts.map
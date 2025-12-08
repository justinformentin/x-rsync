import { Manifest } from './types.js';
import type SFTPClient from 'ssh2-sftp-client';
export interface PushOptions {
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
    exclude?: string[];
    include?: string[];
}
type PullRes = {
    manifest?: Manifest;
    sftp?: SFTPClient;
};
export declare function push(options: PushOptions, pullRes?: PullRes): Promise<void>;
export {};
//# sourceMappingURL=push.d.ts.map
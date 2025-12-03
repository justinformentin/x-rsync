import SFTPClient from 'ssh2-sftp-client';
import { Manifest } from '../types';
export declare function computeDiff(prev: Manifest | null, next: Manifest, fast?: boolean): {
    toUpload: string[];
    toDelete: string[];
};
export declare function ensureRemoteDir(sftp: SFTPClient, remotePath: string): Promise<void>;
export declare function hashFile(filePath: string): Promise<string>;
export declare function scanDirectory(root: string, fast?: boolean): Promise<Manifest>;
export declare function loadManifest(filePath: string): Promise<Manifest | null>;
//# sourceMappingURL=utils.d.ts.map
import type SFTPClient from 'ssh2-sftp-client';
import type { Manifest } from '../types.js';
export declare function hashRemoteFile(sftp: SFTPClient, remotePath: string): Promise<string>;
export declare function scanRemoteDirectory(sftp: SFTPClient, baseRemoteDir: string, onProgress?: (hashed: number, discovered: number, currentFile: string) => void): Promise<Manifest>;
//# sourceMappingURL=scan-remote.d.ts.map
import SFTPClient from 'ssh2-sftp-client';
import { Manifest } from '../types.js';
export declare function hashRemoteFile(sftp: SFTPClient, remotePath: string): Promise<string>;
export declare function scanRemoteDirectory(sftp: SFTPClient, baseRemoteDir: string): Promise<Manifest>;
//# sourceMappingURL=scan-remote.d.ts.map
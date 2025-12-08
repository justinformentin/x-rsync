import SFTPClient from 'ssh2-sftp-client';
import { type Logger } from '../logger';
type InitSftpArgs = {
    host: string;
    port: number;
    username: string;
    privateKeyPath?: string;
    password?: string;
    passphrase?: string;
    logger: Logger;
};
export declare function initSftp({ host, port, username, privateKeyPath, password, passphrase, logger }: InitSftpArgs): Promise<SFTPClient>;
export {};
//# sourceMappingURL=init-sftp.d.ts.map
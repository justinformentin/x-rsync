import SFTPClient from 'ssh2-sftp-client';
type InitSftpArgs = {
    host: string;
    port: number;
    username: string;
    privateKeyPath?: string;
    password?: string;
};
export declare function initSftp({ host, port, username, privateKeyPath, password, }: InitSftpArgs): Promise<SFTPClient>;
export {};
//# sourceMappingURL=init-sftp.d.ts.map
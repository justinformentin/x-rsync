import fs from 'fs';
import SFTPClient from 'ssh2-sftp-client';
export async function initSftp({ host, port, username, privateKeyPath, password, }) {
    const sftp = new SFTPClient();
    const connectConfig = {
        host,
        port,
        username,
    };
    if (privateKeyPath) {
        const keyBuf = fs.readFileSync(privateKeyPath);
        const keyStr = keyBuf.toString('utf8');
        if (keyStr.startsWith('PuTTY-User-Key-File-')) {
            throw new Error(`The private key at ${privateKeyPath} is a PuTTY .ppk file.\n` +
                `Please convert it to an OpenSSH private key (via PuTTYgen: Conversions -> Export OpenSSH key)\n` +
                `and point DEPLOY_PRIVATE_KEY_PATH at that file instead.`);
        }
        connectConfig.privateKey = keyBuf;
    }
    else if (password) {
        connectConfig.password = password;
    }
    else {
        throw new Error('Either privateKeyPath or password must be provided');
    }
    console.log(`Connecting to ${username}@${host}:${port}...`);
    await sftp.connect(connectConfig);
    console.log('Connected.');
    return sftp;
}

// src/sync.ts
import path from 'path';
import fs from 'fs';
import SFTPClient from 'ssh2-sftp-client';
import { saveManifest } from '../shared';
import { scanRemoteDirectory } from './utils';
export async function sync(options) {
    const { manifestPath = path.resolve(process.cwd(), '.xsync', 'manifest.json'), host, port = 22, username, privateKeyPath, password, remoteDir, } = options;
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
    console.log(`Sync: connecting to ${username}@${host}:${port}, scanning ${remoteDir}`);
    await sftp.connect(connectConfig);
    console.log('Sync: connected.');
    try {
        const manifest = await scanRemoteDirectory(sftp, remoteDir);
        console.log(`Sync: found ${Object.keys(manifest.files).length} files on remote.`);
        await saveManifest(manifestPath, manifest);
        console.log(`Sync: wrote manifest to ${manifestPath}`);
    }
    finally {
        await sftp.end();
        console.log('Sync: disconnected.');
    }
}

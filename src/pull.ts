// pull.ts
import path from 'path';
import { saveManifest } from './lib/manifest.js';
import { scanRemoteDirectory } from './lib/scan-remote.js';
import { initSftp } from './lib/init-sftp.js';

export interface PullOptions {
  manifestPath?: string;
  host: string;
  port?: number;
  username: string;
  privateKeyPath?: string;
  password?: string;
  remoteDir: string;
}

export async function pull(options: PullOptions) {
  const {
    manifestPath = path.resolve(process.cwd(), '.xsync', 'manifest.json'),
    host,
    port = 22,
    username,
    privateKeyPath,
    password,
    remoteDir,
  } = options;

  const sftp = await initSftp({
    host,
    port,
    username,
    privateKeyPath,
    password,
  });

  try {
    const manifest = await scanRemoteDirectory(sftp, remoteDir);
    console.log(
      `Pull: found ${Object.keys(manifest.files).length} files on remote.`
    );

    await saveManifest(manifestPath, manifest);
    console.log(`Pull: wrote manifest to ${manifestPath}`);
  } finally {
    await sftp.end();
    console.log('Pull: disconnected.');
  }
}

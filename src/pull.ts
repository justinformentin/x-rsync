// pull.ts
import path from 'path';
import { saveManifest } from './lib/manifest.js';
import { scanRemoteDirectory } from './lib/scan-remote.js';
import { initSftp } from './lib/init-sftp.js';
import { Logger } from './logger.js';

export interface PullOptions {
  manifestPath?: string;
  host: string;
  port?: number;
  username: string;
  privateKeyPath?: string;
  password?: string;
  passphrase?:string;
  remoteDir: string;
  quiet?: boolean;
}

export async function pull(options: PullOptions, internal?: boolean) {
  const logger = new Logger(options.quiet)
  const {
    manifestPath = path.resolve(process.cwd(), '.xsync', 'manifest.json'),
    host,
    port = 22,
    username,
    privateKeyPath,
    password,
    remoteDir,
    passphrase
  } = options;

  const sftp = await initSftp({
    host,
    port,
    username,
    privateKeyPath,
    password,
    passphrase,
    logger
  });

  try {
    const manifest = await scanRemoteDirectory(sftp, remoteDir);
    logger.info(
      `Pull: found ${Object.keys(manifest.files).length} files on remote.`
    );

    await saveManifest(manifestPath, manifest);
    logger.info(`Pull: wrote manifest to ${manifestPath}`);

    // If this pull function is being called from the sync function,
    // we need to return these values to be used by the push function
    if (internal) return { manifest, sftp };
  } finally {
    await sftp.end();
    logger.info('Pull: disconnected.');
  }
}

// pull.ts
// @ts-expect-error
import cliProgress from 'cli-progress';
import path from 'path';
import { initSftp } from './lib/init-sftp.js';
import { saveManifest } from './lib/manifest.js';
import { scanRemoteDirectory } from './lib/scan-remote.js';
import { Logger } from './logger.js';

export interface PullOptions {
  manifestPath?: string;
  host: string;
  port?: number;
  username: string;
  privateKeyPath?: string;
  password?: string;
  passphrase?: string;
  remoteDir: string;
  quiet?: boolean;
  progress?: boolean;
}

export async function pull(options: PullOptions, internal?: boolean) {
  const logger = new Logger(options.quiet);
  const {
    manifestPath = path.resolve(process.cwd(), '.xsync', 'manifest.json'),
    host,
    port = 22,
    username,
    privateKeyPath,
    password,
    remoteDir,
    passphrase,
    progress = true,
  } = options;

  const sftp = await initSftp({
    host,
    port,
    username,
    privateKeyPath,
    password,
    passphrase,
    logger,
  });

  try {
    const showProgress = progress && !options.quiet;
    let bar: InstanceType<typeof cliProgress.SingleBar> | undefined;
    if (showProgress) {
      bar = new cliProgress.SingleBar(
        { format: 'Scanning [{bar}] {value}/{total} files | {file}' },
        cliProgress.Presets.shades_classic
      );
      bar.start(1, 0, { file: '' });
    }
    const onProgress = bar
      ? (hashed: number, discovered: number, file: string) => {
          bar!.setTotal(discovered);
          bar!.update(hashed, { file });
        }
      : undefined;

    const manifest = await scanRemoteDirectory(sftp, remoteDir, onProgress);
    bar?.stop();
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

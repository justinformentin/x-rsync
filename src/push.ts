import path from 'path';
import { saveManifest, loadManifest } from './lib/manifest.js';
import { scanLocalDirectory } from './lib/scan-local.js';
// @ts-ignore
import cliProgress from 'cli-progress';
import { initSftp } from './lib/init-sftp.js';
import { computeDiff } from './lib/compute-diff.js';
import { ensureRemoteDir } from './lib/ensure-remote-dir.js';
import { Manifest } from './types.js';
import type SFTPClient from 'ssh2-sftp-client';

export interface PushOptions {
  localDir: string;
  manifestPath?: string;
  host: string;
  port?: number;
  username: string;
  privateKeyPath?: string;
  password?: string;
  remoteDir: string;
  deleteExtra?: boolean;
  fast?: boolean;
  dry?: boolean;
  exclude?: string[];
  include?: string[];
}

type PullRes = {
  manifest?: Manifest;
  sftp?: SFTPClient;
};

export async function push(options: PushOptions, pullRes?: PullRes) {
  const {
    localDir,
    manifestPath = path.resolve(process.cwd(), '.xsync', 'manifest.json'),
    host,
    port = 22,
    username,
    privateKeyPath,
    password,
    remoteDir,
    deleteExtra = false,
    fast = false,
    dry = false,
    exclude,
    include,
  } = options;

  const localRoot = path.resolve(localDir);

  console.log(
    `Scanning local directory: ${localRoot}${fast ? ' (fast mode)' : ''}${
      dry ? ' (dry run)' : ''
    }`
  );
  const prevManifest = pullRes?.manifest || (await loadManifest(manifestPath));

  const nextManifest = await scanLocalDirectory(
    localRoot,
    fast,
    exclude,
    include
  );

  const { toUpload, toDelete } = computeDiff(prevManifest, nextManifest, fast);

  console.log(
    `Files to upload: ${toUpload.length}, files to delete: ${
      deleteExtra ? toDelete.length : 0
    }`
  );

  if (dry) {
    console.log('No changes made (dry run).');
    return;
  }

  const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

  const barMax = toUpload.length + (toDelete.length || 0);

  bar.start(barMax, 0);

  const sftp =
    pullRes?.sftp ||
    (await initSftp({
      host,
      port,
      username,
      privateKeyPath,
      password,
    }));

  try {
    for (const rel of toUpload) {
      const localPath = path.join(localRoot, rel);
      const remotePath = `${remoteDir}/${rel}`.replace(/\\/g, '/');
      const remoteDirPath = remotePath.split('/').slice(0, -1).join('/');

      //   console.log(`Uploading ${rel}`);
      await ensureRemoteDir(sftp, remoteDirPath);
      await sftp.fastPut(localPath, remotePath);
      bar.increment();
    }

    if (deleteExtra) {
      for (const rel of toDelete) {
        const remotePath = `${remoteDir}/${rel}`.replace(/\\/g, '/');
        // console.log(`Deleting remote ${rel}`);
        try {
          await sftp.delete(remotePath);
        } catch (err) {
          console.warn(
            `Failed to delete ${remotePath}:`,
            (err as Error).message
          );
        }
        bar.increment();
      }
      // Note: removing empty remote directories is more work; you can add it later if you want.
    }
  } finally {
    bar.stop();
    await sftp.end();
    console.log('Disconnected.');
  }

  console.log('Saving new manifest.');
  await saveManifest(manifestPath, nextManifest);
  console.log('Push completed.');
}

import path from 'path';
import { saveManifest } from '../save-manifest.js';
import {
  loadManifest,
  scanDirectory,
  computeDiff,
  ensureRemoteDir,
} from './utils.js';
// @ts-ignore
import cliProgress from 'cli-progress';
import { initSftp } from '../init-sftp.js';
import { scanRemoteDirectory } from '../sync/utils.js';

export interface DeployOptions {
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

export async function deploy(options: DeployOptions) {
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
  const nextManifest = await scanDirectory(localRoot, fast, exclude, include);

  const sftp = await initSftp({
    host,
    port,
    username,
    privateKeyPath,
    password,
  });

  console.log(`Loading previous manifest from: ${manifestPath}`);
  let prevManifest = await loadManifest(manifestPath);
  if (!prevManifest) {
    prevManifest = await scanRemoteDirectory(sftp, remoteDir);
    await saveManifest(manifestPath, prevManifest);
  }

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
  console.log('Deploy completed.');
}

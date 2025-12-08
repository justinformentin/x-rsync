import { pull } from './pull.js';
import { push } from './push.js';
import { loadManifest } from './lib/manifest.js';
import path from 'path';

export interface SyncOptions {
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

export async function sync(options: SyncOptions) {
  const manifestPath =
    options.manifestPath ||
    path.resolve(process.cwd(), '.xsync', 'manifest.json');

  // Check if manifest exists
  const prevManifest = await loadManifest(manifestPath);

  let sftp, manifest;
  // If no manifest exists, pull from remote first
  if (!prevManifest) {
    const pullRes = await pull(options, true);
    sftp = pullRes?.sftp;
    manifest = pullRes?.manifest;
  }

  // Now push local changes to remote
  await push(options, { manifest, sftp });
}

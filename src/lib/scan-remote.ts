import crypto from 'crypto';
import SFTPClient from 'ssh2-sftp-client';
import { Manifest, FileEntry } from '../types.js';

// Hash a remote file by downloading it into memory once
export async function hashRemoteFile(
  sftp: SFTPClient,
  remotePath: string
): Promise<string> {
  const buf = (await sftp.get(remotePath)) as Buffer;
  const hash = crypto.createHash('sha256');
  hash.update(buf);
  return hash.digest('hex');
}

// Recursively walk the remote directory and build a Manifest
export async function scanRemoteDirectory(
  sftp: SFTPClient,
  baseRemoteDir: string
): Promise<Manifest> {
  const files: Record<string, FileEntry> = {};
  const base = baseRemoteDir.replace(/\/+$/, ''); // strip trailing slash

  async function walk(remotePath: string) {
    const list = await sftp.list(remotePath);

    for (const item of list) {
      const fullPath = `${remotePath.replace(/\/+$/, '')}/${item.name}`;

      if (item.type === 'd') {
        await walk(fullPath);
      } else if (item.type === '-') {
        const rel = fullPath
          .slice(base.length)
          .replace(/^\/+/, '') // remove leading slash
          .replace(/\\/g, '/');

        const hash = await hashRemoteFile(sftp, fullPath);

        files[rel] = {
          hash,
          size: item.size,
          mtimeMs: item.modifyTime ?? 0,
        };
      }
    }
  }

  await walk(base);

  return {
    root: base,
    generatedAt: new Date().toISOString(),
    files,
  };
}

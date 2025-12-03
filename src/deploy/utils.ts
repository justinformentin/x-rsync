import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import SFTPClient from 'ssh2-sftp-client';
import { Manifest, FileEntry } from '../types';

export function computeDiff(prev: Manifest | null, next: Manifest) {
  const toUpload: string[] = [];
  const toDelete: string[] = [];

  const prevFiles = prev?.files ?? {};
  const nextFiles = next.files;

  // New or changed
  for (const [relPath, entry] of Object.entries(nextFiles)) {
    const prevEntry = prevFiles[relPath];
    if (!prevEntry || prevEntry.hash !== entry.hash) {
      toUpload.push(relPath);
    }
  }

  // Deleted
  for (const relPath of Object.keys(prevFiles)) {
    if (!nextFiles[relPath]) {
      toDelete.push(relPath);
    }
  }

  return { toUpload, toDelete };
}

export async function ensureRemoteDir(sftp: SFTPClient, remotePath: string) {
  const segments = remotePath.split('/').filter(Boolean);
  let current = '';
  for (const seg of segments) {
    current += `/${seg}`;
    try {
      // mkdir with 'true' to ignore if exists in some implementations
      await sftp.mkdir(current, true);
    } catch {
      // Many SFTP servers throw generic errors even if the dir exists.
      // We can safely ignore errors here.
    }
  }
}

export async function hashFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => {
      resolve(hash.digest('hex'));
    });
  });
}

export async function scanDirectory(root: string): Promise<Manifest> {
  const files: Record<string, FileEntry> = {};
  const rootAbs = path.resolve(root);

  async function walk(current: string) {
    const entries = await fs.promises.readdir(current, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        const stat = await fs.promises.stat(fullPath);
        const hash = await hashFile(fullPath);

        // Path relative to root, always POSIX-style
        const rel = path.relative(rootAbs, fullPath).split(path.sep).join('/');

        files[rel] = {
          hash,
          size: stat.size,
          mtimeMs: stat.mtimeMs,
        };
      }
    }
  }

  await walk(rootAbs);

  return {
    root: rootAbs,
    generatedAt: new Date().toISOString(),
    files,
  };
}

export async function loadManifest(filePath: string): Promise<Manifest | null> {
  try {
    const data = await fs.promises.readFile(filePath, 'utf8');
    return JSON.parse(data) as Manifest;
  } catch (err: any) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

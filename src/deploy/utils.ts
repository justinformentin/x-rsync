import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import SFTPClient from 'ssh2-sftp-client';
import { minimatch } from 'minimatch';
import { Manifest, FileEntry } from '../types.js';

export function computeDiff(prev: Manifest | null, next: Manifest, fast: boolean = false) {
  const toUpload: string[] = [];
  const toDelete: string[] = [];

  const prevFiles = prev?.files ?? {};
  const nextFiles = next.files;

  // New or changed
  for (const [relPath, entry] of Object.entries(nextFiles)) {
    const prevEntry = prevFiles[relPath];
    if (!prevEntry) {
      // New file
      toUpload.push(relPath);
    } else if (fast) {
      // Fast mode: compare size and mtime only
      if (prevEntry.size !== entry.size || prevEntry.mtimeMs !== entry.mtimeMs) {
        toUpload.push(relPath);
      }
    } else {
      // Normal mode: compare hash
      if (prevEntry.hash !== entry.hash) {
        toUpload.push(relPath);
      }
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

export async function scanDirectory(
  root: string,
  fast: boolean = false,
  exclude?: string[],
  include?: string[]
): Promise<Manifest> {
  const files: Record<string, FileEntry> = {};
  const rootAbs = path.resolve(root);

  /**
   * Check if a file path should be included based on exclude/include patterns
   * Logic:
   * 1. If include patterns exist and path matches any include pattern -> include
   * 2. If exclude patterns exist and path matches any exclude pattern -> exclude
   * 3. Otherwise -> include
   */
  function shouldIncludeFile(relPath: string): boolean {
    // Check include patterns first (they override exclude)
    if (include && include.length > 0) {
      const matchesInclude = include.some(pattern => minimatch(relPath, pattern));
      if (matchesInclude) {
        return true;
      }
    }

    // Check exclude patterns
    if (exclude && exclude.length > 0) {
      const matchesExclude = exclude.some(pattern => minimatch(relPath, pattern));
      if (matchesExclude) {
        // If there are include patterns, exclude unless explicitly included
        // If there are no include patterns, exclude
        return false;
      }
    }

    // If include patterns exist but didn't match, and we got here, exclude
    if (include && include.length > 0) {
      return false;
    }

    // Default: include
    return true;
  }

  async function walk(current: string) {
    const entries = await fs.promises.readdir(current, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      const relPath = path.relative(rootAbs, fullPath).split(path.sep).join('/');

      if (entry.isDirectory()) {
        // Check if directory itself should be excluded
        // Also check with trailing slash for directory-specific patterns
        if (shouldIncludeFile(relPath) || shouldIncludeFile(relPath + '/')) {
          await walk(fullPath);
        }
      } else if (entry.isFile()) {
        // Check if file should be included
        if (shouldIncludeFile(relPath)) {
          const stat = await fs.promises.stat(fullPath);

          // In fast mode, use a placeholder hash to skip expensive hashing
          const hash = fast ? '' : await hashFile(fullPath);

          files[relPath] = {
            hash,
            size: stat.size,
            mtimeMs: stat.mtimeMs,
          };
        }
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

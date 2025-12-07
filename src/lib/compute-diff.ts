import { Manifest } from '../types.js';

export function computeDiff(
  prev: Manifest | null,
  next: Manifest,
  fast: boolean = false
) {
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
      if (
        prevEntry.size !== entry.size ||
        prevEntry.mtimeMs !== entry.mtimeMs
      ) {
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

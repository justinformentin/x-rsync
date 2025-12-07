import fs from 'fs';
import path from 'path';
import { Manifest } from '../types.js';

export async function saveManifest(filePath: string, manifest: Manifest) {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(
    filePath,
    JSON.stringify(manifest, null, 2),
    'utf8'
  );
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

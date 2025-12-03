import fs from 'fs';
import path from 'path';
import { Manifest } from './types.js';

export async function saveManifest(filePath: string, manifest: Manifest) {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(
    filePath,
    JSON.stringify(manifest, null, 2),
    'utf8'
  );
}

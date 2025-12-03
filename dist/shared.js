import fs from 'fs';
import path from 'path';
export async function saveManifest(filePath, manifest) {
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(filePath, JSON.stringify(manifest, null, 2), 'utf8');
}

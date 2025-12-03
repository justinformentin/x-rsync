import path from "path";
import { scanDirectory, saveManifest } from "./fs-utils.js";

export interface SyncOptions {
  localDir: string;
  manifestPath?: string;
}

export async function sync(options: SyncOptions) {
  const {
    localDir,
    manifestPath = path.resolve(process.cwd(), ".sync", "manifest.json"),
  } = options;

  const root = path.resolve(localDir);
  console.log(`Sync: scanning directory ${root}`);

  const manifest = await scanDirectory(root);
  await saveManifest(manifestPath, manifest);

  console.log(`Sync: wrote manifest to ${manifestPath}`);
}

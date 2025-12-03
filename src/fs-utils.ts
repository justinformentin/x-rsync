import fs from "fs";
import path from "path";
import crypto from "crypto";
import { Manifest, FileEntry } from "./types.js";

export async function hashFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);

    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => {
      resolve(hash.digest("hex"));
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
        const rel = path.relative(rootAbs, fullPath).split(path.sep).join("/");

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
    const data = await fs.promises.readFile(filePath, "utf8");
    return JSON.parse(data) as Manifest;
  } catch (err: any) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

export async function saveManifest(filePath: string, manifest: Manifest) {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(
    filePath,
    JSON.stringify(manifest, null, 2),
    "utf8"
  );
}

// src/sync.ts
import path from "path";
import fs from "fs";
import crypto from "crypto";
import SFTPClient from "ssh2-sftp-client";
import { Manifest, FileEntry } from "./types.js";
import { saveManifest } from "./fs-utils.js";

export interface SyncOptions {
  manifestPath?: string;
  host: string;
  port?: number;
  username: string;
  privateKeyPath?: string;
  password?: string;
  remoteDir: string;
}

// Hash a remote file by downloading it into memory once
async function hashRemoteFile(
  sftp: SFTPClient,
  remotePath: string
): Promise<string> {
  const buf = (await sftp.get(remotePath)) as Buffer;
  const hash = crypto.createHash("sha256");
  hash.update(buf);
  return hash.digest("hex");
}

// Recursively walk the remote directory and build a Manifest
async function scanRemoteDirectory(
  sftp: SFTPClient,
  baseRemoteDir: string
): Promise<Manifest> {
  const files: Record<string, FileEntry> = {};
  const base = baseRemoteDir.replace(/\/+$/, ""); // strip trailing slash

  async function walk(remotePath: string) {
    const list = await sftp.list(remotePath);

    for (const item of list) {
      const fullPath = `${remotePath.replace(/\/+$/, "")}/${item.name}`;

      if (item.type === "d") {
        await walk(fullPath);
      } else if (item.type === "-") {
        const rel = fullPath
          .slice(base.length)
          .replace(/^\/+/, "") // remove leading slash
          .replace(/\\/g, "/");

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

export async function sync(options: SyncOptions) {
  const {
    manifestPath = path.resolve(process.cwd(), ".sync", "manifest.json"),
    host,
    port = 22,
    username,
    privateKeyPath,
    password,
    remoteDir,
  } = options;

  const sftp = new SFTPClient();
  const connectConfig: any = {
    host,
    port,
    username,
  };

  if (privateKeyPath) {
    const keyBuf = fs.readFileSync(privateKeyPath);
    const keyStr = keyBuf.toString("utf8");
    if (keyStr.startsWith("PuTTY-User-Key-File-")) {
      throw new Error(
        `The private key at ${privateKeyPath} is a PuTTY .ppk file.\n` +
          `Please convert it to an OpenSSH private key (via PuTTYgen: Conversions -> Export OpenSSH key)\n` +
          `and point DEPLOY_PRIVATE_KEY at that file instead.`
      );
    }

    connectConfig.privateKey = keyBuf;
  } else if (password) {
    connectConfig.password = password;
  } else {
    throw new Error("Either privateKeyPath or password must be provided");
  }

  console.log(
    `Sync: connecting to ${username}@${host}:${port}, scanning ${remoteDir}`
  );
  await sftp.connect(connectConfig);
  console.log("Sync: connected.");

  try {
    const manifest = await scanRemoteDirectory(sftp, remoteDir);
    console.log(
      `Sync: found ${Object.keys(manifest.files).length} files on remote.`
    );

    await saveManifest(manifestPath, manifest);
    console.log(`Sync: wrote manifest to ${manifestPath}`);
  } finally {
    await sftp.end();
    console.log("Sync: disconnected.");
  }
}

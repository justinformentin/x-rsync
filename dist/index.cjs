"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  deploy: () => deploy,
  loadConfig: () => loadConfig,
  mergeConfig: () => mergeConfig,
  sync: () => sync
});
module.exports = __toCommonJS(index_exports);

// src/sync/index.ts
var import_path2 = __toESM(require("path"), 1);
var import_fs2 = __toESM(require("fs"), 1);
var import_ssh2_sftp_client = __toESM(require("ssh2-sftp-client"), 1);

// src/shared.ts
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
async function saveManifest(filePath, manifest) {
  await import_fs.default.promises.mkdir(import_path.default.dirname(filePath), { recursive: true });
  await import_fs.default.promises.writeFile(
    filePath,
    JSON.stringify(manifest, null, 2),
    "utf8"
  );
}

// src/sync/utils.ts
var import_crypto = __toESM(require("crypto"), 1);
async function hashRemoteFile(sftp, remotePath) {
  const buf = await sftp.get(remotePath);
  const hash = import_crypto.default.createHash("sha256");
  hash.update(buf);
  return hash.digest("hex");
}
async function scanRemoteDirectory(sftp, baseRemoteDir) {
  const files = {};
  const base = baseRemoteDir.replace(/\/+$/, "");
  async function walk(remotePath) {
    const list = await sftp.list(remotePath);
    for (const item of list) {
      const fullPath = `${remotePath.replace(/\/+$/, "")}/${item.name}`;
      if (item.type === "d") {
        await walk(fullPath);
      } else if (item.type === "-") {
        const rel = fullPath.slice(base.length).replace(/^\/+/, "").replace(/\\/g, "/");
        const hash = await hashRemoteFile(sftp, fullPath);
        files[rel] = {
          hash,
          size: item.size,
          mtimeMs: item.modifyTime ?? 0
        };
      }
    }
  }
  await walk(base);
  return {
    root: base,
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    files
  };
}

// src/sync/index.ts
async function sync(options) {
  const {
    manifestPath = import_path2.default.resolve(process.cwd(), ".sync", "manifest.json"),
    host,
    port = 22,
    username,
    privateKeyPath,
    password,
    remoteDir
  } = options;
  const sftp = new import_ssh2_sftp_client.default();
  const connectConfig = {
    host,
    port,
    username
  };
  if (privateKeyPath) {
    const keyBuf = import_fs2.default.readFileSync(privateKeyPath);
    const keyStr = keyBuf.toString("utf8");
    if (keyStr.startsWith("PuTTY-User-Key-File-")) {
      throw new Error(
        `The private key at ${privateKeyPath} is a PuTTY .ppk file.
Please convert it to an OpenSSH private key (via PuTTYgen: Conversions -> Export OpenSSH key)
and point DEPLOY_PRIVATE_KEY_PATH at that file instead.`
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

// src/deploy/index.ts
var import_fs4 = __toESM(require("fs"), 1);
var import_path4 = __toESM(require("path"), 1);
var import_ssh2_sftp_client2 = __toESM(require("ssh2-sftp-client"), 1);

// src/deploy/utils.ts
var import_fs3 = __toESM(require("fs"), 1);
var import_path3 = __toESM(require("path"), 1);
var import_crypto2 = __toESM(require("crypto"), 1);
function computeDiff(prev, next, fast = false) {
  const toUpload = [];
  const toDelete = [];
  const prevFiles = prev?.files ?? {};
  const nextFiles = next.files;
  for (const [relPath, entry] of Object.entries(nextFiles)) {
    const prevEntry = prevFiles[relPath];
    if (!prevEntry) {
      toUpload.push(relPath);
    } else if (fast) {
      if (prevEntry.size !== entry.size || prevEntry.mtimeMs !== entry.mtimeMs) {
        toUpload.push(relPath);
      }
    } else {
      if (prevEntry.hash !== entry.hash) {
        toUpload.push(relPath);
      }
    }
  }
  for (const relPath of Object.keys(prevFiles)) {
    if (!nextFiles[relPath]) {
      toDelete.push(relPath);
    }
  }
  return { toUpload, toDelete };
}
async function ensureRemoteDir(sftp, remotePath) {
  const segments = remotePath.split("/").filter(Boolean);
  let current = "";
  for (const seg of segments) {
    current += `/${seg}`;
    try {
      await sftp.mkdir(current, true);
    } catch {
    }
  }
}
async function hashFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = import_crypto2.default.createHash("sha256");
    const stream = import_fs3.default.createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => {
      resolve(hash.digest("hex"));
    });
  });
}
async function scanDirectory(root, fast = false) {
  const files = {};
  const rootAbs = import_path3.default.resolve(root);
  async function walk(current) {
    const entries = await import_fs3.default.promises.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = import_path3.default.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        const stat = await import_fs3.default.promises.stat(fullPath);
        const hash = fast ? "" : await hashFile(fullPath);
        const rel = import_path3.default.relative(rootAbs, fullPath).split(import_path3.default.sep).join("/");
        files[rel] = {
          hash,
          size: stat.size,
          mtimeMs: stat.mtimeMs
        };
      }
    }
  }
  await walk(rootAbs);
  return {
    root: rootAbs,
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    files
  };
}
async function loadManifest(filePath) {
  try {
    const data = await import_fs3.default.promises.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

// src/deploy/index.ts
var import_cli_progress = __toESM(require("cli-progress"), 1);
async function deploy(options) {
  const {
    localDir,
    manifestPath = import_path4.default.resolve(process.cwd(), ".sync", "manifest.json"),
    host,
    port = 22,
    username,
    privateKeyPath,
    password,
    remoteDir,
    deleteExtra = false,
    fast = false,
    dry = false
  } = options;
  const localRoot = import_path4.default.resolve(localDir);
  console.log(`Scanning local directory: ${localRoot}${fast ? " (fast mode)" : ""}${dry ? " (dry run)" : ""}`);
  const nextManifest = await scanDirectory(localRoot, fast);
  console.log(`Loading previous manifest from: ${manifestPath}`);
  const prevManifest = await loadManifest(manifestPath);
  const { toUpload, toDelete } = computeDiff(prevManifest, nextManifest, fast);
  console.log(
    `Files to upload: ${toUpload.length}, files to delete: ${deleteExtra ? toDelete.length : 0}`
  );
  if (dry) {
    console.log("No changes made (dry run).");
    return;
  }
  const sftp = new import_ssh2_sftp_client2.default();
  const connectConfig = {
    host,
    port,
    username
  };
  if (privateKeyPath) {
    connectConfig.privateKeyPath = import_fs4.default.readFileSync(privateKeyPath);
  } else if (password) {
    connectConfig.password = password;
  } else {
    throw new Error("Either privateKeyPath or password must be provided");
  }
  console.log(`Connecting to ${username}@${host}:${port}...`);
  await sftp.connect(connectConfig);
  console.log("Connected.");
  const bar = new import_cli_progress.default.SingleBar({}, import_cli_progress.default.Presets.shades_classic);
  const barMax = toUpload.length + (toDelete.length || 0);
  bar.start(barMax, 0);
  try {
    for (const rel of toUpload) {
      const localPath = import_path4.default.join(localRoot, rel);
      const remotePath = `${remoteDir}/${rel}`.replace(/\\/g, "/");
      const remoteDirPath = remotePath.split("/").slice(0, -1).join("/");
      await ensureRemoteDir(sftp, remoteDirPath);
      await sftp.fastPut(localPath, remotePath);
      bar.increment();
    }
    if (deleteExtra) {
      for (const rel of toDelete) {
        const remotePath = `${remoteDir}/${rel}`.replace(/\\/g, "/");
        try {
          await sftp.delete(remotePath);
        } catch (err) {
          console.warn(
            `Failed to delete ${remotePath}:`,
            err.message
          );
        }
        bar.increment();
      }
    }
  } finally {
    bar.stop();
    await sftp.end();
    console.log("Disconnected.");
  }
  console.log("Saving new manifest.");
  await saveManifest(manifestPath, nextManifest);
  console.log("Deploy completed.");
}

// src/config.ts
var import_fs5 = __toESM(require("fs"), 1);
var import_path5 = __toESM(require("path"), 1);
var import_url = require("url");
var import_config = require("dotenv/config");
async function loadConfig() {
  const cwd = process.cwd();
  const configFiles = [
    "xsync.config.ts",
    "xsync.config.js"
  ];
  for (const configFile of configFiles) {
    const configPath = import_path5.default.join(cwd, configFile);
    if (import_fs5.default.existsSync(configPath)) {
      try {
        const fileUrl = (0, import_url.pathToFileURL)(configPath).href;
        const module2 = await import(fileUrl);
        const config = module2.default || module2.config || module2;
        return config;
      } catch (err) {
        console.warn(`Failed to load config from ${configFile}:`, err.message);
      }
    }
  }
  return null;
}
function mergeConfig(configFile) {
  const env = process.env;
  return {
    host: env.DEPLOY_HOST || configFile?.host,
    username: env.DEPLOY_USER || configFile?.username,
    port: env.DEPLOY_PORT ? parseInt(env.DEPLOY_PORT, 10) : configFile?.port || 22,
    remoteDir: env.DEPLOY_REMOTE_DIR || configFile?.remoteDir,
    privateKeyPath: env.DEPLOY_PRIVATE_KEY_PATH || configFile?.privateKeyPath,
    password: env.DEPLOY_PASSWORD || configFile?.password,
    delete: !!process.env.DEPLOY_DELETE || configFile?.delete || false,
    fast: configFile?.fast || false
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  deploy,
  loadConfig,
  mergeConfig,
  sync
});

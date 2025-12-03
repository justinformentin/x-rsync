# x-sync

A tiny rsync-style deployment tool built for Node/TypeScript using **SFTP + SHA-256 diffing**.

It lets you **deploy only changed files** to a remote server over SSH — no rsync or native binaries required.
Works on **Windows, macOS, and Linux**.

---

## ✨ Features

- 🔄 **Sync remote → local manifest**
  `x-sync sync` scans the remote server and writes `.sync/manifest.json`.

- 🚀 **Deploy changed files only**
  `x-sync deploy ./dist` uploads only files whose hashes differ from the remote manifest.

- 🗑️ **Optional remote deletion**
  Use `--delete` (or `DEPLOY_DELETE=1`) to remove remote files not present locally.

- 🔐 **SSH support**
  - OpenSSH private key
  - Password auth
  - Custom ports
  - Works perfectly on Windows (including key conversion from `.ppk`)

- ⚙️ **Flexible configuration**
  - Config file support (`xsync.config.js` or `xsync.config.ts`)
  - Environment variables
  - `.env` file support

- 📦 **Bundled CLI** (single JS file via esbuild)

---

## 📦 Installing in Your Project

In your project (the one you want to deploy **from**):

```bash
npm install -D x-sync ssh2-sftp-client
```

Add to your `package.json`:

```json
{
  "scripts": {
    "sync": "x-sync sync",
    "deploy": "x-sync deploy ./dist"
  }
}
```

---

## ⚙️ Configuration

You can configure x-sync using either a **config file** (recommended) or **environment variables**.

### Option 1: Config File (Recommended)

Create `xsync.config.js` in your project root:

```javascript
export default {
  host: "your.server.ip",
  user: "root",
  port: 22,
  remoteDir: "/var/www/website",
  privateKeyPath: "C:/Users/you/.ssh/id_rsa",
  // OR use password:
  // password: "your_password",

  // Optional settings:
  delete: false,  // set to true to delete remote files not present locally
  fast: false     // set to true to skip hashing (compare size+mtime only)
};
```

Or use TypeScript (`xsync.config.ts`):

```typescript
export default {
  host: "your.server.ip",
  user: "root",
  port: 22,
  remoteDir: "/var/www/website",
  privateKeyPath: "~/.ssh/id_rsa",
  delete: false,
  fast: false
};
```

### Option 2: Environment Variables

Set these before running `sync` or `deploy`. Environment variables **override** config file settings.

**Minimum:**

```bash
DEPLOY_HOST=your.server.ip
DEPLOY_USER=root
DEPLOY_REMOTE_DIR=/var/www/website
```

**Authentication (choose ONE):**

```bash
# Using a private key (recommended)
DEPLOY_PRIVATE_KEY_PATH=C:/Users/you/.ssh/id_rsa

# OR using a password
DEPLOY_PASSWORD=your_password
```

**Optional:**

```bash
DEPLOY_PORT=22
DEPLOY_DELETE=1   # enable deletes during deploy
```

### Option 3: .env File

Create a `.env` file in your project root:

```env
DEPLOY_HOST=your.server.ip
DEPLOY_USER=root
DEPLOY_REMOTE_DIR=/var/www/website
DEPLOY_PRIVATE_KEY_PATH=~/.ssh/id_rsa
```

---

## 🚀 Usage

### 1. Sync (populate manifest from server)

```bash
npm run sync
```

**What this does:**

- Connects to your server via SFTP
- Recursively walks `DEPLOY_REMOTE_DIR`
- Downloads + hashes each file
- Writes the state into:

```
.sync/manifest.json
```

This manifest now represents "what exists on the server".

**Run this whenever someone changes files on the server outside of this tool** (e.g., Cyberduck/manual edits).

---

### 2. Deploy (upload only changed files)

```bash
npm run deploy
```

or specify a local folder:

```bash
npm run deploy -- ./dist
```

**The deploy logic:**

- Recursively scans your local folder
- Compares local file hashes against `.sync/manifest.json`
- Uploads only:
  - new files
  - changed files
- Optionally deletes files on the server that no longer exist locally
- Updates `.sync/manifest.json` to match the server after deploy

#### Fast Mode

For faster deployments (with slightly lower accuracy), use the `--fast` flag or set `fast: true` in your config file:

**Via CLI flag:**
```bash
npm run deploy -- --fast
```

**Via config file:**
```javascript
export default {
  // ... other config
  fast: true
};
```

**Fast mode:**
- Skips SHA-256 hashing
- Compares only file size and modification time (mtime)
- Significantly faster for large codebases
- May miss changes if file size and mtime are unchanged
- CLI flag `--fast` overrides config file setting

#### Dry Run Mode

To preview what would be changed without actually uploading or deleting files:

```bash
npm run deploy -- --dry
```

**Dry run mode:**
- Scans local files and compares with manifest
- Shows how many files would be uploaded/deleted
- Does not connect to the server
- Does not modify any files
- Useful for testing before actual deployment

---

## 🗑️ Deleting Remote Files

To remove remote files that no longer exist locally:

```bash
npm run deploy -- --delete
```

Or set:

```bash
DEPLOY_DELETE=1
```

---

## 🔐 Using SSH Keys on Windows

x-sync does **NOT** support `.ppk` files (PuTTY format).

**Convert to OpenSSH using PuTTYgen:**

1. Open PuTTYgen
2. Load your `.ppk`
3. Go to: **Conversions → Export OpenSSH key**
4. Save as: `id_rsa` (or any name)
5. Use the saved file path in `privateKeyPath` (config file) or `DEPLOY_PRIVATE_KEY_PATH` (env var)

---

## 📁 Project Structure

```
.sync/manifest.json    # Remote server state (generated by sync command)
dist/cli.cjs          # Bundled CLI binary
src/
  cli.ts             # Entry point
  sync/              # Sync command logic
  deploy/            # Deploy command logic
  shared.ts          # Shared utilities
  types.ts           # TypeScript types
```

---

## 🛠️ Development

**Build the CLI:**

```bash
npm run build
```

This bundles `src/cli.ts` → `dist/cli.cjs` using esbuild.

---

## 📝 Example Workflow

### Using Config File

**1. Create `xsync.config.js`:**

```javascript
export default {
  host: "192.168.1.100",
  user: "root",
  privateKeyPath: "~/.ssh/id_rsa",
  remoteDir: "/var/www/myapp",
  fast: true  // Optional: enable fast mode by default
};
```

**2. Use the CLI:**

```bash
# Initial sync from server
npm run sync

# Make local changes to your code
# ... edit files ...

# Deploy only changed files
npm run deploy

# Deploy with deletion of removed files
npm run deploy -- --delete

# Fast deploy (skip hashing, use size+mtime comparison)
npm run deploy -- --fast

# Dry run (preview changes without actually deploying)
npm run deploy -- --dry

# Combine flags
npm run deploy -- --fast --delete

# Dry run with fast mode
npm run deploy -- --dry --fast
```

### Using Environment Variables

```bash
# 1. Set up environment variables
export DEPLOY_HOST=192.168.1.100
export DEPLOY_USER=root
export DEPLOY_PRIVATE_KEY_PATH=~/.ssh/id_rsa
export DEPLOY_REMOTE_DIR=/var/www/myapp

# 2. Initial sync from server
npm run sync

# 3. Deploy
npm run deploy
```

---

## 📄 License

MIT

---

## 🤝 Contributing

Contributions welcome! Feel free to open issues or pull requests.

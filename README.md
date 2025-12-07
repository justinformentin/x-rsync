# x-sync

A tiny rsync-style deployment tool built for Node/TypeScript using **SFTP + SHA-256 diffing**.

It lets you **deploy only changed files** to a remote server over SSH — no rsync or native binaries required.
Works on **Windows, macOS, and Linux**.

---

## ✨ Features

- 🚀 **Deploy changed files only**
  `x-sync deploy ./dist` uploads only files whose hashes differ from the remote manifest.

- 🔄 **Auto-sync on first deploy**
  No manifest? No problem. The first deploy automatically syncs from the remote server.

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
  fast: false,    // set to true to skip hashing (compare size+mtime only)

  // Exclude/Include patterns (glob syntax):
  exclude: [
    "node_modules/**",
    "config/**",
    "*.log"
  ],
  include: [
    "config/production.json"  // include this even if excluded by exclude patterns
  ]
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
  fast: false,
  exclude: ["node_modules/**", ".git/**"],
  include: ["config/production.json"]
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
DEPLOY_EXCLUDE="node_modules/**,.git/**,*.log"  # comma-separated glob patterns
DEPLOY_INCLUDE="config/production.json"  # comma-separated glob patterns
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

### Deploy (upload only changed files)

```bash
npm run deploy
```

or specify a local folder:

```bash
npm run deploy -- ./dist
```

**The deploy logic:**

- On first run: Automatically syncs from remote server to create initial manifest (`.xsync/manifest.json`)
- Recursively scans your local folder
- Compares local file hashes against `.xsync/manifest.json`
- Uploads only:
  - new files
  - changed files
- Optionally deletes files on the server that no longer exist locally
- Updates `.xsync/manifest.json` to match the server after deploy

**Note:** The first time you run deploy, it will automatically connect to your remote server and scan all existing files to create the initial manifest. This ensures future deploys only upload changed files.

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

#### Exclude/Include Patterns

Control which files are deployed using glob patterns:

**Via CLI flags:**
```bash
# Exclude files
npm run deploy -- --exclude="node_modules/**" --exclude=".git/**"

# Include files (overrides exclude)
npm run deploy -- --exclude="config/*" --include="config/production.json"
```

**Via config file:**
```javascript
export default {
  // ... other config
  exclude: [
    "node_modules/**",
    ".git/**",
    "*.log",
    "test/**"
  ],
  include: [
    "config/production.json",  // include this specific file
    "assets/critical/**"        // include this directory even if excluded
  ]
};
```

**Via environment variables:**
```bash
DEPLOY_EXCLUDE="node_modules/**,.git/**,*.log"
DEPLOY_INCLUDE="config/production.json"
```

**How it works:**
- By default, all files are included
- `exclude` patterns mark files to skip
- `include` patterns override `exclude` - use this to include specific files that would otherwise be excluded
- Example: `--exclude="config/*" --include="config/production.json"` excludes all config files except production.json
- Patterns use [minimatch](https://github.com/isaacs/minimatch) glob syntax
- Patterns are matched against the relative file path from the local directory

**Common patterns:**
- `src/**/*.{js,ts}` all JS and TS files in src or src subdirectories
- `**/*.log` - all .log files in any directory
- `node_modules/**` - everything in node_modules
- `*.tmp` - all .tmp files in root only
- `test/**` - all files in test directory

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
.xsync/manifest.json  # Remote server state (auto-generated on first deploy)
dist/cli.js          # Bundled CLI (ESM)
dist/cli.cjs         # Bundled CLI (CommonJS)
src/
  cli.ts             # Entry point
  deploy/            # Deploy command logic
  sync/              # Remote sync utilities
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
# First deploy - automatically syncs from remote server to create manifest
npm run deploy

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

# 2. Deploy (first run will auto-sync from remote)
npm run deploy
```

---

## 📄 License

MIT

---

## 🤝 Contributing

Contributions welcome! Feel free to open issues or pull requests.

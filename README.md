# x-sync

A tiny rsync-style tool built for Node/TypeScript using **SFTP + SHA-256 diffing**.

It lets you **sync only changed files** to a remote server over SSH — no rsync or native binaries required.
Works on **Windows, macOS, and Linux**.

---

## ✨ Features

- 🚀 **Three simple commands**
  - `sync` - Pull remote state + push local changes (one command to rule them all)
  - `pull` - Download remote file list and create/update manifest
  - `push` - Upload only changed files based on manifest

- 🔄 **Smart auto-pull**
  No manifest? The `sync` command automatically pulls from remote first.

- 🗑️ **Optional remote deletion**
  Use `--delete` (or `XSYNC_DELETE=1`) to remove remote files not present locally.

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

In your project (the one you want to sync **from**):

```bash
npm install -D x-sync ssh2-sftp-client
```

Add to your `package.json`:

```json
{
  "scripts": {
    "sync": "x-sync sync ./dist",
    "pull": "x-sync pull",
    "push": "x-sync push ./dist"
  }
}
```

**Or just the essentials:**
```json
{
  "scripts": {
    "sync": "x-sync sync ./dist"
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

Set these before running `sync`. Environment variables **override** config file settings.

**Minimum:**

```bash
XSYNC_HOST=your.server.ip
XSYNC_USER=root
XSYNC_REMOTE_DIR=/var/www/website
```

**Authentication (choose ONE):**

```bash
# Using a private key (recommended)
XSYNC_PRIVATE_KEY_PATH=C:/Users/you/.ssh/id_rsa

# OR using a password
XSYNC_PASSWORD=your_password
```

**Optional:**

```bash
XSYNC_PORT=22
XSYNC_DELETE=1   # enable deletes during sync
XSYNC_EXCLUDE="node_modules/**,.git/**,*.log"  # comma-separated glob patterns
XSYNC_INCLUDE="config/production.json"  # comma-separated glob patterns
```

### Option 3: .env File

Create a `.env` file in your project root:

```env
XSYNC_HOST=your.server.ip
XSYNC_USER=root
XSYNC_REMOTE_DIR=/var/www/website
XSYNC_PRIVATE_KEY_PATH=~/.ssh/id_rsa
```

---

## 🚀 Usage

### Command Overview

x-sync provides three commands:

#### `sync` - The all-in-one command (recommended)

```bash
x-sync sync <localDir>
```

Combines `pull` + `push` into one command:
1. Checks if manifest exists
2. If no manifest: runs `pull` to download remote file list
3. Runs `push` to upload changed files

**Example:**
```bash
npm run sync         # sync current directory
npm run sync -- ./dist   # sync ./dist directory
```

#### `pull` - Download remote file list

```bash
x-sync pull
```

Connects to your remote server, scans all files, and creates/updates `.xsync/manifest.json`. Use this when:
- You want to manually update the manifest from remote
- Someone made changes directly on the server
- You're setting up sync for the first time

#### `push` - Upload changed files

```bash
x-sync push <localDir>
```

Scans your local directory, compares with manifest, and uploads only changed files. Use this when:
- You already have a manifest and just want to push changes
- You want more control over the sync process

**Note:** Most of the time, you'll just use `sync` - it handles everything automatically!

#### Fast Mode

For faster syncs (with slightly lower accuracy), use the `--fast` flag or set `fast: true` in your config file:

**Via CLI flag:**
```bash
npm run sync -- --fast
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
npm run sync -- --dry
```

**Dry run mode:**
- Scans local files and compares with manifest
- Shows how many files would be uploaded/deleted
- Does not connect to the server
- Does not modify any files
- Useful for testing before actual sync

#### Exclude/Include Patterns

Control which files are synced using glob patterns:

**Via CLI flags:**
```bash
# Exclude files
npm run sync -- --exclude="node_modules/**" --exclude=".git/**"

# Include files (overrides exclude)
npm run sync -- --exclude="config/*" --include="config/production.json"
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
XSYNC_EXCLUDE="node_modules/**,.git/**,*.log"
XSYNC_INCLUDE="config/production.json"
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
npm run sync -- --delete
```

Or set:

```bash
XSYNC_DELETE=1
```

---

## 🔐 Using SSH Keys on Windows

x-sync does **NOT** support `.ppk` files (PuTTY format).

**Convert to OpenSSH using PuTTYgen:**

1. Open PuTTYgen
2. Load your `.ppk`
3. Go to: **Conversions → Export OpenSSH key**
4. Save as: `id_rsa` (or any name)
5. Use the saved file path in `privateKeyPath` (config file) or `XSYNC_PRIVATE_KEY_PATH` (env var)

---

## 📁 Project Structure

```
.xsync/manifest.json  # Remote server state (auto-generated on first sync)
dist/cli.js          # Bundled CLI (ESM)
dist/cli.cjs         # Bundled CLI (CommonJS)
src/
  cli.ts             # Entry point
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
# Most common: just sync everything
npm run sync

# Sync with options
npm run sync -- --delete    # Delete remote files not in local
npm run sync -- --fast      # Skip hashing (faster, less accurate)
npm run sync -- --dry       # Preview changes without uploading

# Combine flags
npm run sync -- --fast --delete

# Manual control (advanced)
npm run pull                # Update manifest from remote
npm run push                # Push local changes only
npm run push -- --exclude="*.log"  # Push with exclusions
```

### Using Environment Variables

```bash
# 1. Set up environment variables
export XSYNC_HOST=192.168.1.100
export XSYNC_USER=root
export XSYNC_PRIVATE_KEY_PATH=~/.ssh/id_rsa
export XSYNC_REMOTE_DIR=/var/www/myapp

# 2. Sync (first run will auto-pull from remote, then push changes)
npm run sync
```

---

## 📄 License

MIT

---

## 🤝 Contributing

Contributions welcome! Feel free to open issues or pull requests.

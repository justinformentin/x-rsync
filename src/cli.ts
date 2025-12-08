#!/usr/bin/env node
import { sync } from './sync.js';
import { pull } from './pull.js';
import { push } from './push.js';
import { loadConfig, mergeConfig } from './lib/config.js';

function printHelp() {
  console.log(`
Usage:
  x-sync sync <localDir> [options]   # Pull + push (recommended)
  x-sync pull                         # Download remote file list
  x-sync push <localDir> [options]    # Upload changed files

Commands:
  sync    Auto-pull (if needed) + push local changes
  pull    Download remote file list and create/update manifest
  push    Upload only changed files based on manifest

Configuration:
  Create xsync.config.js or xsync.config.ts in your project root with:
  {
    host: "your.server.ip",
    user: "root",
    port: 22,
    remoteDir: "/var/www/website",
    privateKeyPath: "path/to/key",
    password: "password",
    delete: false,
    fast: false,
    exclude: ["node_modules/**", "config/**"],
    include: ["config/production.json"]
  }

Environment variables (override config file):
  XSYNC_HOST         Required. e.g. "your.server.ip"
  XSYNC_USER         Required. e.g. "root"
  XSYNC_PORT         Optional. default 22
  XSYNC_REMOTE_DIR   Required. e.g. "/var/www/website"
  XSYNC_PRIVATE_KEY_PATH  Path to private key (recommended)
  XSYNC_PASSWORD     Password (alternative to key)
  XSYNC_DELETE       "1" to delete files on remote that no longer exist locally
  XSYNC_EXCLUDE      Comma-separated glob patterns to exclude (e.g. "node_modules/**,.git/**")
  XSYNC_INCLUDE      Comma-separated glob patterns to include (overrides exclude)

Flags:
  --delete            Delete remote files that don't exist locally
  --fast              Skip hashing, compare only size and mtime (faster but less accurate)
  --dry               Dry run mode - show what would be changed without actually uploading/deleting
  --exclude=<pattern> Exclude files matching glob pattern (can be used multiple times)
  --include=<pattern> Include files matching glob pattern, overriding exclude (can be used multiple times)
`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || ['-h', '--help'].includes(args[0])) {
    printHelp();
    process.exit(0);
  }

  // Load config file
  const configFile = await loadConfig();

  // Merge config file with environment variables (env vars take priority)
  const config = mergeConfig(configFile);

  const { host, username, remoteDir, port, privateKeyPath, password } = config;

  if (!host || !username || !remoteDir) {
    console.error(
      'Missing required configuration: host, user, and remoteDir must be set via config file or environment variables (XSYNC_HOST, XSYNC_USER, XSYNC_REMOTE_DIR)'
    );
    process.exit(1);
  }

  if (!privateKeyPath && !password) {
    console.error(
      'You must set either privateKeyPath or password via config file or environment variables (XSYNC_PRIVATE_KEY_PATH or XSYNC_PASSWORD)'
    );
    process.exit(1);
  }

  const command = args[0];

  const params = {
    host,
    port,
    username,
    privateKeyPath,
    password,
    remoteDir,
  };

  if (command === 'pull') {
    await pull(params);
    return;
  }

  if (command === 'push' || command === 'sync') {
    const localDir = args[1] || '.';
    const deleteExtra = args.includes('--delete') || config?.delete === true;
    const fast = args.includes('--fast') || config?.fast === true;
    const dry = args.includes('--dry');

    // Parse --exclude and --include arguments
    const excludeArgs: string[] = [];
    const includeArgs: string[] = [];

    for (const arg of args) {
      if (arg.startsWith('--exclude=')) {
        excludeArgs.push(arg.slice('--exclude='.length));
      } else if (arg.startsWith('--include=')) {
        includeArgs.push(arg.slice('--include='.length));
      }
    }

    // Merge with config (CLI args take priority)
    const exclude = excludeArgs.length > 0 ? excludeArgs : config?.exclude;
    const include = includeArgs.length > 0 ? includeArgs : config?.include;

    const opts = {
      ...params,
      localDir,
      deleteExtra,
      fast,
      dry,
      exclude,
      include,
    };

    if (command === 'push') {
      return await push(opts);
    } else if (command === 'sync') {
      return await sync(opts);
    }

    return;
  }

  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exit(1);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

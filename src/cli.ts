#!/usr/bin/env node
import path from 'path';
import { sync } from './sync/index.js';
import { deploy } from './deploy/index.js';
import { loadConfig, mergeConfig } from './config.js';

function printHelp() {
  console.log(`
Usage:
  x-sync sync
  x-sync deploy <localDir> [--delete] [--fast] [--dry] [--exclude=<pattern>] [--include=<pattern>]

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
  DEPLOY_HOST         Required. e.g. "your.server.ip"
  DEPLOY_USER         Required. e.g. "root"
  DEPLOY_PORT         Optional. default 22
  DEPLOY_REMOTE_DIR   Required. e.g. "/var/www/website"
  DEPLOY_PRIVATE_KEY_PATH  Path to private key (recommended)
  DEPLOY_PASSWORD     Password (alternative to key)
  DEPLOY_DELETE       "1" to delete files on remote that no longer exist locally
  DEPLOY_EXCLUDE      Comma-separated glob patterns to exclude (e.g. "node_modules/**,.git/**")
  DEPLOY_INCLUDE      Comma-separated glob patterns to include (overrides exclude)

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
      'Missing required configuration: host, user, and remoteDir must be set via config file or environment variables (DEPLOY_HOST, DEPLOY_USER, DEPLOY_REMOTE_DIR)'
    );
    process.exit(1);
  }

  if (!privateKeyPath && !password) {
    console.error(
      'You must set either privateKeyPath or password via config file or environment variables (DEPLOY_PRIVATE_KEY_PATH or DEPLOY_PASSWORD)'
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

  if (command === 'sync') {
    const manifestPath = path.resolve(process.cwd(), '.xsync', 'manifest.json');
    await sync({ ...params, manifestPath });
    return;
  }

  if (command === 'deploy') {
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

    await deploy({ ...params, localDir, deleteExtra, fast, dry, exclude, include });
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

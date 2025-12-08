#!/usr/bin/env node
import { Command } from 'commander';
import { sync } from './sync.js';
import { pull } from './pull.js';
import { push } from './push.js';
import { loadConfig, mergeConfig } from './lib/config.js';
const program = new Command();
program
    .name('x-rsync')
    .description('A tiny rsync-style tool using SFTP + SHA-256 diffing')
    .version('0.1.1')
    .addHelpText('after', `
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
  XSYNC_EXCLUDE      Comma-separated glob patterns to exclude
  XSYNC_INCLUDE      Comma-separated glob patterns to include
`);
function addCommonOptions(cmd) {
    return cmd
        .option('-q, --quiet', 'Disable logging. Default false.', false)
        .option('-m, --manifest <path>', 'Manifest file path', './.xsync/manifest.json')
        .option('-c, --config <path>', 'Config file path', './xsync.config.{js,ts}')
        .option('--host <address>', 'SFTP host IP Address')
        .option('-p, --port <number>', 'SFTP port. Default 22.', '22')
        .option('-u, --username <name>', 'SFTP username')
        .option('--password <password>', 'SFTP password. Not needed if passing privatekey')
        .option('--passphrase <passphrase>', 'SFTP passphrase. Used if your privatekey is encrypted.')
        .option('--privatekey <path>', 'SFTP Private key path')
        .option('--remote <path>', 'Remote directory path');
}
// Pull command
addCommonOptions(program
    .command('pull')
    .description('Download remote file list and create/update manifest')
    .action(async (options) => {
    const config = await getConfig(options);
    await pull({
        host: config.host,
        port: config.port,
        username: config.username,
        privateKeyPath: config.privateKeyPath,
        password: config.password,
        passphrase: config.passphrase,
        remoteDir: config.remoteDir,
        manifestPath: options.manifest,
        quiet: config.quiet,
    });
}));
function registerFileCommand(name, description, action) {
    return addCommonOptions(program
        .command(`${name} [localDir]`)
        .description(description)
        .option('-d, --delete', "Delete remote files that don't exist locally. Default false.", false)
        .option('-f, --fast', 'Skip hashing, compare only size and mtime. Default false.', false)
        .option('--dry', 'Dry run mode - preview changes without uploading. Default false.', false)
        .option('--exclude <pattern...>', 'Exclude files matching glob pattern')
        .option('--include <pattern...>', 'Include files matching glob pattern')
        .action(async (localDir, options) => {
        const config = await getConfig(options);
        const opts = buildOptions(config, localDir || '.', options);
        await action(opts);
    }));
}
registerFileCommand('push', 'Upload only changed files based on manifest', async (opts) => await push(opts, {}));
registerFileCommand('sync', 'Auto-pull (if needed) + push local changes (recommended)', async (opts) => await sync(opts));
async function getConfig(cliOptions) {
    const configFile = await loadConfig(cliOptions?.config);
    const config = mergeConfig(configFile);
    // CLI options override everything
    const host = cliOptions?.host || config.host;
    const username = cliOptions?.username || config.username;
    const remoteDir = cliOptions?.remote || config.remoteDir;
    const port = cliOptions?.port ? parseInt(cliOptions.port, 10) : config.port;
    const privateKeyPath = cliOptions?.privatekey || config.privateKeyPath;
    const password = cliOptions?.password || config.password;
    const passphrase = cliOptions?.passphrase || config.passphrase;
    if (!host || !username || !remoteDir) {
        console.error('Missing required configuration: host, user, and remoteDir must be set via config file or environment variables (XSYNC_HOST, XSYNC_USER, XSYNC_REMOTE_DIR)');
        process.exit(1);
    }
    if (!privateKeyPath && !password) {
        console.error('You must set either privateKeyPath or password via config file or environment variables (XSYNC_PRIVATE_KEY_PATH or XSYNC_PASSWORD)');
        process.exit(1);
    }
    return {
        host,
        port,
        username,
        privateKeyPath,
        password,
        passphrase,
        remoteDir,
        delete: config.delete,
        fast: config.fast,
        exclude: config.exclude,
        include: config.include,
        quiet: cliOptions?.quiet || false,
    };
}
function buildOptions(config, localDir, cmdOptions) {
    return {
        host: config.host,
        port: config.port,
        username: config.username,
        privateKeyPath: config.privateKeyPath,
        password: config.password,
        passphrase: config.passphrase,
        remoteDir: config.remoteDir,
        manifestPath: cmdOptions.manifest,
        localDir,
        deleteExtra: cmdOptions.delete ?? config.delete ?? false,
        fast: cmdOptions.fast ?? config.fast ?? false,
        dry: cmdOptions.dry ?? false,
        quiet: config.quiet,
        exclude: cmdOptions.exclude ?? config.exclude,
        include: cmdOptions.include ?? config.include,
    };
}
program.parse();

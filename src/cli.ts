#!/usr/bin/env node
import path from 'path';
import { sync } from './sync';
import { deploy } from './deploy';
import "dotenv/config";


function printHelp() {
  console.log(`
Usage:
  sftp-sync sync
  sftp-sync deploy <localDir> [--delete]

Environment variables for BOTH sync and deploy:
  DEPLOY_HOST         Required. e.g. "your.server.ip"
  DEPLOY_USER         Required. e.g. "root"
  DEPLOY_PORT         Optional. default 22
  DEPLOY_REMOTE_DIR   Required. e.g. "/var/www/website"
  DEPLOY_PRIVATE_KEY  Path to private key (recommended)
  DEPLOY_PASSWORD     Password (alternative to key)

Additional for deploy:
  DEPLOY_DELETE       "1" to delete files on remote that no longer exist locally
`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || ['-h', '--help'].includes(args[0])) {
    printHelp();
    process.exit(0);
  }

  const env = process.env;
  const host = env.DEPLOY_HOST;
  const username = env.DEPLOY_USER;
  const remoteDir = env.DEPLOY_REMOTE_DIR;
  const port = env.DEPLOY_PORT ? parseInt(env.DEPLOY_PORT, 10) : 22;
  const privateKeyPath = env.DEPLOY_PRIVATE_KEY;
  const password = env.DEPLOY_PASSWORD;

  if (!host || !username || !remoteDir) {
    console.error(
      'Missing required env vars for sync: DEPLOY_HOST, DEPLOY_USER, DEPLOY_REMOTE_DIR'
    );
    process.exit(1);
  }

  if (!privateKeyPath && !password) {
    console.error(
      'You must set either DEPLOY_PRIVATE_KEY or DEPLOY_PASSWORD for sync'
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
    const manifestPath = path.resolve(process.cwd(), '.sync', 'manifest.json');
    await sync({ ...params, manifestPath });
    return;
  }

  if (command === 'deploy') {
    const localDir = args[1] || '.';
    const deleteExtra = args.includes('--delete') || env.DEPLOY_DELETE === '1';
    await deploy({ ...params, localDir, deleteExtra });
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

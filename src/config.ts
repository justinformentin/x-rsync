import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import "dotenv/config";

export interface XSyncConfig {
  host?: string;
  username?: string;
  port?: number;
  remoteDir?: string;
  privateKeyPath?: string;
  password?: string;
  delete?: boolean;
  fast?: boolean;
}

/**
 * Load configuration from xsync.config.{ts,js} file
 * Tries to find and load the config file from the current working directory
 */
export async function loadConfig(): Promise<XSyncConfig | null> {
  const cwd = process.cwd();

  // Try to find config file in order of preference
  const configFiles = [
    'xsync.config.ts',
    'xsync.config.js',
  ];

  for (const configFile of configFiles) {
    const configPath = path.join(cwd, configFile);

    if (fs.existsSync(configPath)) {
      try {
        // For .ts files, we need to use a bundler or ts-node in production
        // For now, we'll try to dynamically import
        const fileUrl = pathToFileURL(configPath).href;
        const module = await import(fileUrl);

        // Support both default export and named export
        const config = module.default || module.config || module;

        return config as XSyncConfig;
      } catch (err) {
        console.warn(`Failed to load config from ${configFile}:`, (err as Error).message);
        // Continue to next config file
      }
    }
  }

  return null;
}

/**
 * Merge configuration from multiple sources with priority:
 * 1. Environment variables (highest priority)
 * 2. Config file
 * 3. Defaults (lowest priority)
 */
export function mergeConfig(
  configFile: XSyncConfig | null,
):XSyncConfig {
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

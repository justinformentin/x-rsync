import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import 'dotenv/config';
/**
 * Load configuration from xsync.config.{ts,js} file
 * Tries to find and load the config file from the current working directory
 */
export async function loadConfig(configPath) {
    const cwd = process.cwd();
    // Try to find config file in order of preference
    const configFiles = ['xsync.config.ts', 'xsync.config.js'];
    if (configPath)
        configFiles.unshift(configPath);
    for (const configFile of configFiles) {
        const fullConfigPath = path.join(cwd, configFile);
        if (fs.existsSync(fullConfigPath)) {
            try {
                // For .ts files, we need to use a bundler or ts-node in production
                // For now, we'll try to dynamically import
                const fileUrl = pathToFileURL(fullConfigPath).href;
                const module = await import(fileUrl);
                // Support both default export and named export
                const config = module.default || module.config || module;
                return config;
            }
            catch (err) {
                console.warn(`Failed to load config from ${configFile}:`, err.message);
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
export function mergeConfig(configFile) {
    const env = process.env;
    // Parse exclude/include from env vars (comma-separated)
    const envExclude = env.XSYNC_EXCLUDE?.split(',').map((s) => s.trim());
    const envInclude = env.XSYNC_INCLUDE?.split(',').map((s) => s.trim());
    return {
        host: env.XSYNC_HOST || configFile?.host,
        username: env.XSYNC_USER || configFile?.username,
        port: env.XSYNC_PORT
            ? parseInt(env.XSYNC_PORT, 10)
            : configFile?.port || 22,
        remoteDir: env.XSYNC_REMOTE_DIR || configFile?.remoteDir,
        privateKeyPath: env.XSYNC_PRIVATE_KEY_PATH || configFile?.privateKeyPath,
        password: env.XSYNC_PASSWORD || configFile?.password,
        passphrase: env.XSYNC_PASSPHRASE || configFile?.passphrase,
        delete: !!process.env.XSYNC_DELETE || configFile?.delete || false,
        fast: configFile?.fast || false,
        exclude: envExclude || configFile?.exclude,
        include: envInclude || configFile?.include,
    };
}

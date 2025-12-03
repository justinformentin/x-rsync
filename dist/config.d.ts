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
export declare function loadConfig(): Promise<XSyncConfig | null>;
/**
 * Merge configuration from multiple sources with priority:
 * 1. Environment variables (highest priority)
 * 2. Config file
 * 3. Defaults (lowest priority)
 */
export declare function mergeConfig(configFile: XSyncConfig | null): XSyncConfig;
//# sourceMappingURL=config.d.ts.map
// Public API exports for library usage
export { pull, type SyncOptions } from './pull.js';
export { deploy, type DeployOptions } from './sync.js';
export { loadConfig, mergeConfig, type XSyncConfig } from './lib/config.js';
export type { Manifest, FileEntry } from './types.js';

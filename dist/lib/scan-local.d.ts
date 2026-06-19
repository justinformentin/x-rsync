import type { Manifest } from '../types.js';
export declare function hashLocalFile(filePath: string): Promise<string>;
export declare function scanLocalDirectory(root: string, fast?: boolean, exclude?: string[], include?: string[]): Promise<Manifest>;
//# sourceMappingURL=scan-local.d.ts.map
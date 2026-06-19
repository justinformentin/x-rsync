import type { Manifest } from '../types.js';
export declare function computeDiff(prev: Manifest | null, next: Manifest, fast?: boolean): {
    toUpload: string[];
    toDelete: string[];
};
//# sourceMappingURL=compute-diff.d.ts.map
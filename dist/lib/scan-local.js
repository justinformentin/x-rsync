import { createHash } from 'crypto';
import fs from 'fs';
import { minimatch } from 'minimatch';
import path from 'path';
import { pipeline } from 'stream/promises';
export async function hashLocalFile(filePath) {
    const hash = createHash('sha256');
    await pipeline(fs.createReadStream(filePath), hash);
    return hash.digest('hex');
}
/**
 * Check if a file path should be included based on exclude/include patterns
 * Logic:
 * 1. If include patterns exist and path matches any include pattern -> include
 * 2. If exclude patterns exist and path matches any exclude pattern -> exclude
 * 3. Otherwise -> include
 */
const initShouldInclude = ({ include, exclude }) => (relPath) => {
    // Check include patterns first (they override exclude)
    if (include && include.length > 0) {
        const matchesInclude = include.some((pattern) => minimatch(relPath, pattern));
        if (matchesInclude)
            return true;
    }
    // Check exclude patterns
    if (exclude && exclude.length > 0) {
        const matchesExclude = exclude.some((pattern) => minimatch(relPath, pattern));
        // If there are include patterns, exclude unless explicitly included
        // If there are no include patterns, exclude
        if (matchesExclude)
            return false;
    }
    // If include patterns exist but didn't match, and we got here, exclude
    if (include && include.length > 0)
        return false;
    // Default: include
    return true;
};
export async function scanLocalDirectory(root, fast = false, exclude, include) {
    const files = {};
    const rootAbs = path.resolve(root);
    const shouldIncludeFile = initShouldInclude({ include, exclude });
    async function walk(current) {
        const entries = await fs.promises.readdir(current, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(current, entry.name);
            const relPath = path
                .relative(rootAbs, fullPath)
                .split(path.sep)
                .join('/');
            if (entry.isDirectory()) {
                // Check if directory itself should be excluded
                // Also check with trailing slash for directory-specific patterns
                if (shouldIncludeFile(relPath) || shouldIncludeFile(relPath + '/')) {
                    await walk(fullPath);
                }
            }
            else if (entry.isFile()) {
                // Check if file should be included
                if (shouldIncludeFile(relPath)) {
                    const stat = await fs.promises.stat(fullPath);
                    // In fast mode, use a placeholder hash to skip expensive hashing
                    const hash = fast ? '' : await hashLocalFile(fullPath);
                    files[relPath] = {
                        hash,
                        size: stat.size,
                        mtimeMs: stat.mtimeMs,
                    };
                }
            }
        }
    }
    await walk(rootAbs);
    return {
        root: rootAbs,
        generatedAt: new Date().toISOString(),
        files,
    };
}

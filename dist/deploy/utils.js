import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
export function computeDiff(prev, next, fast = false) {
    const toUpload = [];
    const toDelete = [];
    const prevFiles = prev?.files ?? {};
    const nextFiles = next.files;
    // New or changed
    for (const [relPath, entry] of Object.entries(nextFiles)) {
        const prevEntry = prevFiles[relPath];
        if (!prevEntry) {
            // New file
            toUpload.push(relPath);
        }
        else if (fast) {
            // Fast mode: compare size and mtime only
            if (prevEntry.size !== entry.size || prevEntry.mtimeMs !== entry.mtimeMs) {
                toUpload.push(relPath);
            }
        }
        else {
            // Normal mode: compare hash
            if (prevEntry.hash !== entry.hash) {
                toUpload.push(relPath);
            }
        }
    }
    // Deleted
    for (const relPath of Object.keys(prevFiles)) {
        if (!nextFiles[relPath]) {
            toDelete.push(relPath);
        }
    }
    return { toUpload, toDelete };
}
export async function ensureRemoteDir(sftp, remotePath) {
    const segments = remotePath.split('/').filter(Boolean);
    let current = '';
    for (const seg of segments) {
        current += `/${seg}`;
        try {
            // mkdir with 'true' to ignore if exists in some implementations
            await sftp.mkdir(current, true);
        }
        catch {
            // Many SFTP servers throw generic errors even if the dir exists.
            // We can safely ignore errors here.
        }
    }
}
export async function hashFile(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);
        stream.on('error', reject);
        stream.on('data', (chunk) => hash.update(chunk));
        stream.on('end', () => {
            resolve(hash.digest('hex'));
        });
    });
}
export async function scanDirectory(root, fast = false) {
    const files = {};
    const rootAbs = path.resolve(root);
    async function walk(current) {
        const entries = await fs.promises.readdir(current, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(current, entry.name);
            if (entry.isDirectory()) {
                await walk(fullPath);
            }
            else if (entry.isFile()) {
                const stat = await fs.promises.stat(fullPath);
                // In fast mode, use a placeholder hash to skip expensive hashing
                const hash = fast ? '' : await hashFile(fullPath);
                // Path relative to root, always POSIX-style
                const rel = path.relative(rootAbs, fullPath).split(path.sep).join('/');
                files[rel] = {
                    hash,
                    size: stat.size,
                    mtimeMs: stat.mtimeMs,
                };
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
export async function loadManifest(filePath) {
    try {
        const data = await fs.promises.readFile(filePath, 'utf8');
        return JSON.parse(data);
    }
    catch (err) {
        if (err.code === 'ENOENT')
            return null;
        throw err;
    }
}

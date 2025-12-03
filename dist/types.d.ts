export interface FileEntry {
    hash: string;
    size: number;
    mtimeMs: number;
}
export interface Manifest {
    root: string;
    generatedAt: string;
    files: Record<string, FileEntry>;
}
//# sourceMappingURL=types.d.ts.map
#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

// Create a stub .d.cts file for TypeScript CJS imports
const indexDts = path.join(distDir, 'index.d.ts');
const indexDcts = path.join(distDir, 'index.d.cts');
if (fs.existsSync(indexDts) && !fs.existsSync(indexDcts)) {
  fs.writeFileSync(indexDcts, `export * from './index.js';\n`);
  console.log('Created index.d.cts stub for CJS TypeScript support');
}

console.log('Post-build: Complete');

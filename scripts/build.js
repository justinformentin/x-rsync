#!/usr/bin/env node
import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

// Clean dist directory
console.log('Cleaning dist directory...');
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}

// Build TypeScript (ESM + .d.ts)
console.log('Building TypeScript (ESM + type definitions)...');
try {
  execSync('tsc', { cwd: rootDir, stdio: 'inherit' });
} catch (error) {
  console.error('TypeScript build failed');
  process.exit(1);
}

// Add shebang to ESM CLI file (TypeScript strips it during compilation)
console.log('Adding shebang to ESM CLI...');
const cliJs = path.join(distDir, 'cli.js');
if (fs.existsSync(cliJs)) {
  const content = fs.readFileSync(cliJs, 'utf8');
  if (!content.startsWith('#!')) {
    fs.writeFileSync(cliJs, `#!/usr/bin/env node\n${content}`);
  }
}

// External dependencies (not bundled)
const external = ['ssh2-sftp-client', 'dotenv', 'cli-progress'];

// Build CJS bundles
console.log('Building CJS bundles...');

const cjsOptions = {
  bundle: true,
  platform: 'node',
  format: 'cjs',
  external,
  sourcemap: false,
};

await Promise.all([
  // Build index.cjs (library entry)
  esbuild.build({
    ...cjsOptions,
    entryPoints: ['src/index.ts'],
    outfile: 'dist/index.cjs',
  }),
  // Build cli.cjs (CLI entry) - shebang already in source
  esbuild.build({
    ...cjsOptions,
    entryPoints: ['src/cli.ts'],
    outfile: 'dist/cli.cjs',
  }),
]);

// Create .d.cts stub for CJS TypeScript support
console.log('Creating .d.cts stub for CJS TypeScript support...');
const indexDts = path.join(distDir, 'index.d.ts');
const indexDcts = path.join(distDir, 'index.d.cts');
if (fs.existsSync(indexDts)) {
  fs.writeFileSync(indexDcts, `export * from './index.js';\n`);
}

console.log('✓ Build complete!');

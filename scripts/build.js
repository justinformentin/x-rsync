#!/usr/bin/env node
import { execSync } from 'child_process';
import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const { version } = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));

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

// Add shebang to ESM CLI file and inject version (TypeScript strips both during compilation)
console.log('Adding shebang and injecting version into ESM CLI...');
const cliJs = path.join(distDir, 'cli.js');
if (fs.existsSync(cliJs)) {
  let content = fs.readFileSync(cliJs, 'utf8');
  content = content.replace(/\b__CLI_VERSION__\b/g, JSON.stringify(version));
  if (!content.startsWith('#!')) {
    content = `#!/usr/bin/env node\n${content}`;
  }
  fs.writeFileSync(cliJs, content);
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
  define: { __CLI_VERSION__: JSON.stringify(version) },
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

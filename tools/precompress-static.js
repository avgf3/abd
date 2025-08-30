#!/usr/bin/env node
// Precompress static assets (Brotli + Gzip) in dist/public/assets
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const distAssets = path.resolve(process.cwd(), 'dist', 'public', 'assets');
const exts = new Set(['.js', '.css', '.svg', '.json', '.html', '.ttf', '.woff', '.woff2']);

function shouldCompress(file) {
  const ext = path.extname(file).toLowerCase();
  return exts.has(ext) && !file.endsWith('.br') && !file.endsWith('.gz');
}

function walk(dir, list = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, list);
    else list.push(full);
  }
  return list;
}

function compressFile(file) {
  const data = fs.readFileSync(file);
  // Brotli
  try {
    const brotli = zlib.brotliCompressSync(data, {
      [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
    });
    fs.writeFileSync(file + '.br', brotli);
  } catch {}
  // Gzip
  try {
    const gz = zlib.gzipSync(data, { level: 9 });
    fs.writeFileSync(file + '.gz', gz);
  } catch {}
}

function main() {
  if (!fs.existsSync(distAssets)) {
    console.error('No build assets found at', distAssets);
    process.exit(0);
  }
  const files = walk(distAssets).filter(shouldCompress);
  for (const f of files) compressFile(f);
  console.log(`Precompressed ${files.length} assets.`);
}

main();


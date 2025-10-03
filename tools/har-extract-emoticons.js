#!/usr/bin/env node
/**
 * Extract emoticon images from a Chrome HAR export and write them locally.
 * Usage:
 *   node tools/har-extract-emoticons.js path/to/export.har
 *
 * Tip: In Chrome DevTools > Network:
 *  - Filter by "emoticon" then (⋯) > Save all as HAR with content
 */
import fs from 'fs';
import path from 'path';

function ensureDirSync(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function guessExt(mime, url) {
  const uext = (url.split('?')[0].split('#')[0].split('.').pop() || '').toLowerCase();
  if (uext === 'gif' || uext === 'png' || uext === 'svg' || uext === 'webp') return '.' + uext;
  if (mime.includes('gif')) return '.gif';
  if (mime.includes('png')) return '.png';
  if (mime.includes('jpeg') || mime.includes('jpg')) return '.jpg';
  if (mime.includes('webp')) return '.webp';
  return '.bin';
}

function getTargetSubdir(url) {
  if (/\/emoticon\/food\//i.test(url)) return 'food';
  if (/\/emoticon\/sticker_animals\//i.test(url)) return 'sticker_animals';
  return 'base';
}

async function main() {
  const harPath = process.argv[2];
  if (!harPath) {
    console.error('Usage: node tools/har-extract-emoticons.js path/to/export.har');
    process.exit(1);
  }
  const outRoot = path.resolve('client/public/assets/emojis/arabic');
  ensureDirSync(outRoot);
  ensureDirSync(path.join(outRoot, 'base'));
  ensureDirSync(path.join(outRoot, 'food'));
  ensureDirSync(path.join(outRoot, 'sticker_animals'));

  const har = JSON.parse(fs.readFileSync(harPath, 'utf8'));
  const entries = har.log?.entries || [];
  let saved = 0;
  for (const e of entries) {
    const url = e.request?.url || '';
    if (!/https?:\/\/storage\.arabic\.chat\/emoticon\//i.test(url)) continue;
    const content = e.response?.content;
    if (!content) continue;
    const text = content.text;
    const encoding = (content.encoding || '').toLowerCase();
    if (!text) continue;
    const mime = content.mimeType || '';

    const subdir = getTargetSubdir(url);
    const nameFromUrl = path.basename(url.split('?')[0].split('#')[0]);
    const ext = guessExt(mime, url);
    const baseName = nameFromUrl.replace(/\.[a-z0-9]+$/i, '');
    const outPath = path.join(outRoot, subdir, baseName + ext);

    let buffer;
    try {
      buffer = encoding === 'base64' ? Buffer.from(text, 'base64') : Buffer.from(text, 'utf8');
    } catch {
      continue;
    }

    fs.writeFileSync(outPath, buffer);
    saved++;
  }

  console.log(`Saved ${saved} emoticon files into ${outRoot}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import os from 'node:os';
import sharp from 'sharp';

const IBB_URLS = [
  'https://ibb.co/chy31kJC',
  'https://ibb.co/Ngc7F9Mw',
  'https://ibb.co/GvvfR2by',
  'https://ibb.co/VFK3ykk',
  'https://ibb.co/tpY4gtx8',
  'https://ibb.co/mr8H6WkT',
  'https://ibb.co/8n09kPrT',
  'https://ibb.co/JRThHYWj',
  'https://ibb.co/6JJGD0kQ',
  'https://ibb.co/FLPTV9Kt',
  'https://ibb.co/m5mMfw6W',
  'https://ibb.co/NgSXmZZr',
];

const REPO_ROOT = path.resolve(path.join(path.dirname(new URL(import.meta.url).pathname), '..'));
const OUT_DIR = path.join(REPO_ROOT, 'client', 'public', 'tags');

function httpGetBuffer(url) {
  const headers = { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36' };
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      protocol: u.protocol,
      hostname: u.hostname,
      path: u.pathname + (u.search || ''),
      method: 'GET',
      headers,
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Follow redirect
        resolve(httpGetBuffer(new URL(res.headers.location, url).toString()));
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
    req.end();
  });
}

function httpGetString(url) {
  return httpGetBuffer(url).then((b) => b.toString('utf8'));
}

function extractOgImage(html) {
  // Try to match <meta property="og:image" content="...">
  const re = /<meta[^>]*?(?:property|name)\s*=\s*['\"]og:image['\"][^>]*?content\s*=\s*['\"]([^'\"]+)['\"][^>]*?>/i;
  const m = html.match(re);
  if (m) return m[1];
  // Fallback: scan meta tags
  const metas = html.match(/<meta[^>]*?>/gi) || [];
  for (const tag of metas) {
    if (/og:image/i.test(tag)) {
      const m2 = tag.match(/content\s*=\s*['\"]([^'\"]+)['\"]/i);
      if (m2) return m2[1];
    }
  }
  return null;
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) {
    console.error('Output directory not found:', OUT_DIR);
    process.exit(1);
  }

  for (let i = 0; i < IBB_URLS.length; i++) {
    const pageUrl = IBB_URLS[i];
    const outPath = path.join(OUT_DIR, `tag${i + 1}.webp`);
    console.log(`Processing ${pageUrl} -> ${path.basename(outPath)}`);

    const html = await httpGetString(pageUrl);
    let direct = extractOgImage(html);
    if (!direct) {
      console.error('Failed to extract og:image from', pageUrl);
      process.exit(1);
    }
    if (direct.startsWith('//')) direct = 'https:' + direct;

    const inputBuffer = await httpGetBuffer(direct);
    const webpBuffer = await sharp(inputBuffer).webp({ quality: 85 }).toBuffer();
    fs.writeFileSync(outPath, webpBuffer);
    fs.chmodSync(outPath, 0o644);
  }
  console.log('All 12 tag images replaced successfully.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

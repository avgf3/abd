#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import sharp from 'sharp';

// User-provided ibb links (13 images)
const IBB_URLS = [
  'https://ibb.co/nq4r2RPN',
  'https://ibb.co/mKbk9Rm',
  'https://ibb.co/6JbKbGF7',
  'https://ibb.co/fYWwWwrV',
  'https://ibb.co/HDZjWrvN',
  'https://ibb.co/bjpzwz7H',
  'https://ibb.co/jvsnbBpt',
  'https://ibb.co/tMmXsZ58',
  'https://ibb.co/d4t30zZ3',
  'https://ibb.co/yvNXZSd',
  'https://ibb.co/BJMRCT0',
  'https://ibb.co/rKqJR3t2',
  'https://ibb.co/21wmBX9Z',
];

// Start index to append after existing title1..title17.webp
const START_INDEX = 18; // will generate title18.webp .. title30.webp

const REPO_ROOT = path.resolve(path.join(path.dirname(new URL(import.meta.url).pathname), '..'));
const OUT_DIR = path.join(REPO_ROOT, 'client', 'public', 'titles');

function httpGetBuffer(url) {
  const headers = { 'User-Agent': 'Mozilla/5.0' };
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
  const re = /<meta[^>]*?(?:property|name)\s*=\s*['\"]og:image['\"][^>]*?content\s*=\s*['\"]([^'\"]+)['\"][^>]*?>/i;
  const m = html.match(re);
  if (m) return m[1];
  const metas = html.match(/<meta[^>]*?>/gi) || [];
  for (const tag of metas) {
    if (/og:image/i.test(tag)) {
      const m2 = tag.match(/content\s*=\s*['\"]([^'\"]+)['\"]/i);
      if (m2) return m2[1];
    }
  }
  return null;
}

async function ensureOutDir() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }
}

async function main() {
  await ensureOutDir();

  for (let i = 0; i < IBB_URLS.length; i++) {
    const pageUrl = IBB_URLS[i];
    const outName = `title${START_INDEX + i}.webp`;
    const outPath = path.join(OUT_DIR, outName);
    console.log(`Processing ${pageUrl} -> ${outName}`);

    try {
      const html = await httpGetString(pageUrl);
      let direct = extractOgImage(html);
      if (!direct) throw new Error('Failed to extract og:image from ' + pageUrl);
      if (direct.startsWith('//')) direct = 'https:' + direct;

      const inputBuffer = await httpGetBuffer(direct);
      const webpBuffer = await sharp(inputBuffer).webp({ quality: 85 }).toBuffer();
      fs.writeFileSync(outPath, webpBuffer);
      fs.chmodSync(outPath, 0o644);
    } catch (err) {
      console.error(`Failed: ${pageUrl} -> ${outName}`, err);
      process.exitCode = 1;
    }
  }
  console.log('Saved new title images to client/public/titles');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

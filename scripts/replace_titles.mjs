#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import sharp from 'sharp';

// روابط ibb المقدمة من المستخدم (17 صورة)
const IBB_URLS = [
  'https://ibb.co/fYXx6Xb7',
  'https://ibb.co/hJFLzPSW',
  'https://ibb.co/Kpvmx4d8',
  'https://ibb.co/MXk3wTx',
  'https://ibb.co/fzbB1pvZ',
  'https://ibb.co/VWBt9Tq1',
  'https://ibb.co/5WgnYTmp',
  'https://ibb.co/HLbFV6Vt',
  'https://ibb.co/jkDvNRT7',
  'https://ibb.co/TDjxYpNS',
  'https://ibb.co/CsYxgtNz',
  'https://ibb.co/Vc70wbbX',
  'https://ibb.co/8LYypPDR',
  'https://ibb.co/ksCRk94J',
  'https://ibb.co/3yRNNDjM',
  'https://ibb.co/0jXyPfJH',
  'https://ibb.co/FLG6fZBV',
];

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

async function main() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  for (let i = 0; i < IBB_URLS.length; i++) {
    const pageUrl = IBB_URLS[i];
    const outPath = path.join(OUT_DIR, `title${i + 1}.webp`);
    console.log(`Processing ${pageUrl} -> ${path.basename(outPath)}`);

    const html = await httpGetString(pageUrl);
    let direct = extractOgImage(html);
    if (!direct) throw new Error('Failed to extract og:image from ' + pageUrl);
    if (direct.startsWith('//')) direct = 'https:' + direct;

    const inputBuffer = await httpGetBuffer(direct);
    const webpBuffer = await sharp(inputBuffer).webp({ quality: 85 }).toBuffer();
    fs.writeFileSync(outPath, webpBuffer);
    fs.chmodSync(outPath, 0o644);
  }
  console.log('All title images saved to client/public/titles');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

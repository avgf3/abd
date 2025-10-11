const https = require('https');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const urls = [
  'https://ibb.co/W4ddQ2K2',
  'https://ibb.co/rGBZdKyB',
  'https://ibb.co/4wmwZCvj',
  'https://ibb.co/ZZPc6bx',
  'https://ibb.co/TBJvG7Vd',
  'https://ibb.co/DfMHmB29',
  'https://ibb.co/zHfJGHNy',
  'https://ibb.co/8nzZvkdf',
  'https://ibb.co/yFnHR9nL',
  'https://ibb.co/cSpLnxmw',
  'https://ibb.co/QLypZyG',
  'https://ibb.co/ymNPS2t6',
];

const outDir = path.join(process.cwd(), 'client', 'public', 'tags');

function fetchBuffer(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && maxRedirects > 0) {
        const next = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).toString();
        res.resume();
        resolve(fetchBuffer(next, maxRedirects - 1));
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        res.resume();
        return;
      }
      const chunks = [];
      res.on('data', (d) => chunks.push(d));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
  });
}

function fetchText(url) {
  return fetchBuffer(url).then((buf) => buf.toString('utf8'));
}

function extractOgImage(html) {
  const m = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i);
  if (m && m[1]) return m[1];
  const m2 = html.match(/<img[^>]+src=["'](https?:\/\/i\.ibb\.co\/[^"']+)["']/i);
  return m2 ? m2[1] : null;
}

async function run() {
  fs.mkdirSync(outDir, { recursive: true });
  let ok = 0;
  for (let i = 0; i < urls.length; i++) {
    const pageUrl = urls[i];
    const outPath = path.join(outDir, `tag${i + 1}.webp`);
    try {
      process.stdout.write(`➡️  Fetching page ${i + 1}: ${pageUrl}\n`);
      const html = await fetchText(pageUrl);
      const imgUrl = extractOgImage(html);
      if (!imgUrl) throw new Error('og:image not found');
      process.stdout.write(`   ⤷ image: ${imgUrl}\n`);
      const imgBuf = await fetchBuffer(imgUrl);
      const webpBuf = await sharp(imgBuf).webp({ quality: 92 }).toBuffer();
      fs.writeFileSync(outPath, webpBuf);
      process.stdout.write(`   ✅ Saved ${outPath}\n`);
      ok++;
    } catch (e) {
      process.stderr.write(`   ❌ Failed for ${pageUrl}: ${e.message}\n`);
    }
  }
  process.stdout.write(`\nDone. Saved ${ok}/${urls.length} tags to ${outDir}\n`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

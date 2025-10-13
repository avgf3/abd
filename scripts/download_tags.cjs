const https = require('https');
const fs = require('fs');
const path = require('path');
// No external image processing: save original bytes with original extension

// New tag pages from ibb.co (8 items)
const urls = [
  'https://ibb.co/7x6RKbzj',
  'https://ibb.co/39dctkPV',
  'https://ibb.co/8DykwnGt',
  'https://ibb.co/hJX7PHmC',
  'https://ibb.co/3YCgrnDf',
  'https://ibb.co/wm1331p',
  'https://ibb.co/Xk67SDwK',
  'https://ibb.co/cKvFst48',
];

// Save as tag13..tag20 using original extension (webp/png/jpg)
const startIndex = 13;

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
    const outPath = path.join(outDir, `tag${startIndex + i}.webp`);
    try {
      process.stdout.write(`➡️  Fetching page ${i + 1}: ${pageUrl}\n`);
      const html = await fetchText(pageUrl);
      const imgUrl = extractOgImage(html);
      if (!imgUrl) throw new Error('og:image not found');
      process.stdout.write(`   ⤷ image: ${imgUrl}\n`);
      const imgBuf = await fetchBuffer(imgUrl);
      // Determine extension from URL (default to .webp if not present)
      const u = new URL(imgUrl);
      const extMatch = (u.pathname.match(/\.(webp|png|jpg|jpeg)$/i) || [])[1];
      const ext = (extMatch ? extMatch.toLowerCase() : 'webp');
      const outPath = path.join(outDir, `tag${startIndex + i}.${ext}`);
      fs.writeFileSync(outPath, imgBuf);
      process.stdout.write(`   ✅ Saved ${outPath} (${imgBuf.length} bytes)\n`);
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

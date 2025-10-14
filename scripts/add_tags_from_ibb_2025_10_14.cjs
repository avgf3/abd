const https = require('https');
const fs = require('fs');
const path = require('path');

// 14 new ibb pages from the user (2025-10-14)
const urls = [
  'https://ibb.co/fY4smN22',
  'https://ibb.co/KpWcHCzz',
  'https://ibb.co/JwbkDf09',
  'https://ibb.co/5WQ9k5Cn',
  'https://ibb.co/HTFX7hvx',
  'https://ibb.co/8gwCwX6D',
  'https://ibb.co/gLQ5V62j',
  'https://ibb.co/Kp9Ltd8f',
  'https://ibb.co/ksFmdhLw',
  'https://ibb.co/tn8JYLs',
  'https://ibb.co/1fDhT15S',
  'https://ibb.co/DD3pdyFf',
  'https://ibb.co/xKngWzMF',
  'https://ibb.co/0jvD1PyT',
];

const startIndex = 21; // save as tag21..tag34
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

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  let ok = 0;
  for (let i = 0; i < urls.length; i++) {
    const pageUrl = urls[i];
    process.stdout.write(`➡️  Fetching page ${i + 1}: ${pageUrl}\n`);
    try {
      const html = await fetchText(pageUrl);
      let imgUrl = extractOgImage(html);
      if (!imgUrl) throw new Error('og:image not found');
      if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl;
      process.stdout.write(`   ⤷ image: ${imgUrl}\n`);
      const imgBuf = await fetchBuffer(imgUrl);

      const u = new URL(imgUrl);
      const extMatch = (u.pathname.match(/\.(webp|png|jpg|jpeg)$/i) || [])[1];
      const ext = (extMatch ? extMatch.toLowerCase() : 'webp');
      const outPath = path.join(outDir, `tag${startIndex + i}.${ext}`);
      fs.writeFileSync(outPath, imgBuf);
      fs.chmodSync(outPath, 0o644);
      process.stdout.write(`   ✅ Saved ${outPath} (${imgBuf.length} bytes)\n`);
      ok++;
    } catch (e) {
      process.stderr.write(`   ❌ Failed for ${pageUrl}: ${e.message}\n`);
    }
  }
  process.stdout.write(`\nDone. Saved ${ok}/${urls.length} tags to ${outDir}\n`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

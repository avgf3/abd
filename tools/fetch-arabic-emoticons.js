#!/usr/bin/env node
/*
  Download arabic.chat base emoticons locally under client/public/assets/emojis/arabic/base
  Safe local assets (no hotlinking).
*/
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseOutDir = path.resolve(__dirname, '../client/public/assets/emojis/arabic/base');

const baseNames = [
  'amazing','angel','angry','anxious','bad','bigsmile','blink','cool','crisped','cry','cry2','dead','desperate','devil','doubt','feelgood','funny','good','happy','happy3','hee','heu','hilarous','hmm','hono','hoo','hooo','idontcare','indiferent','kiss','kiss2','kiss3','kiss4','med','medsmile','muted','nana','neutral','noooo','nosebleed','omg','omgomg','pokerface','reverse','sad','sad2','scared','sick2','sleep','smile','smileface','smileteeth','sweat','tongue','tongue2','tongue3','toro','totalangry','totallove','verysad','whaaa','whocare','wot'
];

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function download(url, outPath) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.promises.writeFile(outPath, buf);
}

async function main() {
  await ensureDir(baseOutDir);

  let ok = 0, fail = 0;

  for (const name of baseNames) {
    const candidates = [
      `https://storage.arabic.chat/emoticon/${name}.png`,
      `https://storage.arabic.chat/emoticon/${name}.gif`,
    ];
    let saved = false;
    for (const url of candidates) {
      const ext = url.endsWith('.gif') ? '.gif' : '.png';
      const out = path.join(baseOutDir, `${name}${ext}`);
      try {
        if (fs.existsSync(out)) { saved = true; ok++; break; }
        await download(url, out);
        saved = true; ok++;
        break;
      } catch (e) {
        // try next extension
      }
    }
    if (!saved) {
      fail++;
      console.warn(`[warn] failed ${name}`);
    }
  }

  console.log(`Downloaded ${ok} files. Failed ${fail}. Output dir: ${baseOutDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

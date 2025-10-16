#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Repo-relative paths
const TAGS_DIR = path.resolve(__dirname, '..', 'client', 'public', 'tags');

// Match logic from client src/config/tagLayouts.ts
const DEFAULT_LAYOUT = { widthRatio: 1.10, xAdjustPx: 0, yAdjustPx: 1, anchorY: 0.37, autoAnchor: true };
function getLayout(num){
  const l = { ...DEFAULT_LAYOUT };
  const override = (layout) => Object.assign(l, layout);
  if (num === 1) override({ anchorY: 0.54, yAdjustPx: 4 });
  if (num === 2) override({ anchorY: 0.32, yAdjustPx: 1 });
  if (num === 3) override({ anchorY: 0.30, yAdjustPx: 1, widthRatio: 1.08 });
  if (num === 4) override({ anchorY: 0.42, yAdjustPx: 1, widthRatio: 1.12 });
  if (num === 5) override({ anchorY: 0.37, yAdjustPx: 1 });
  if (num === 6) override({ anchorY: 0.47, yAdjustPx: 1 });
  if (num === 7) override({ anchorY: 0.37, yAdjustPx: 1 });
  if (num === 8) override({ anchorY: 0.54, yAdjustPx: 4 });
  if (num === 9) override({ anchorY: 0.42, yAdjustPx: 1, widthRatio: 1.12 });
  if (num === 10) override({ anchorY: 0.42, yAdjustPx: 3 });
  if (num === 11) override({ anchorY: 0.37, yAdjustPx: 1 });
  if (num === 12) override({ anchorY: 0.44, yAdjustPx: 2 });
  if (num >= 13 && num <= 20) override({ anchorY: 0.34, yAdjustPx: 1 });
  if (num >= 21 && num <= 30) override({ anchorY: 0.37, yAdjustPx: 1 });
  if (num >= 31 && num <= 40) override({ anchorY: 0.40, yAdjustPx: 1, widthRatio: 1.11 });
  if (num >= 41 && num <= 50) override({ anchorY: 0.44, yAdjustPx: 1, widthRatio: 1.12 });
  return l;
}

// Analysis params: match ProfileImage.tsx logic
const AVATAR_PX = 56; // medium
const CONTAINER_SIZE = Math.round(AVATAR_PX * 1.35);
const IMAGE_TOP_WITHIN_CONTAINER = Math.round((CONTAINER_SIZE - AVATAR_PX) / 2);
const SCAN_CENTER_RATIO_FOR = (num) => (num === 1 || num === 8 ? 0.6 : 1); // proposed fix; also report current=1

async function measureBottomGapRatio(imgPath, scanCenterRatio=1){
  const img = sharp(imgPath);
  const meta = await img.metadata();
  const { width: w, height: h } = meta;
  if (!w || !h) return { ratio: 0, natural: { w: w||0, h: h||0 } };
  const maxW = 96;
  const scale = Math.min(1, maxW / w);
  const cw = Math.max(1, Math.floor(w * scale));
  const ch = Math.max(1, Math.floor(h * scale));
  const buf = await img.resize({ width: cw }).ensureAlpha().raw().toBuffer();
  const stride = 4;
  const stepX = Math.max(1, Math.floor(cw / 24));
  const xStart = Math.floor(((1 - scanCenterRatio) / 2) * cw);
  const xEnd = Math.ceil(cw - xStart);
  let gapRows = 0;
  outer: for (let y = ch - 1; y >= 0; y--) {
    let rowTransparent = true;
    const rowOffset = y * cw * stride;
    for (let x = xStart; x < xEnd; x += stepX) {
      const idx = rowOffset + x * stride + 3;
      const alpha = buf[idx];
      if (alpha > 8) { rowTransparent = false; break; }
    }
    if (rowTransparent) gapRows++; else break outer;
  }
  const ratio = Math.max(0, Math.min(0.5, gapRows / ch));
  return { ratio, natural: { w, h } };
}

function fileForTag(num){
  const candidates = [
    path.join(TAGS_DIR, `tag${num}.webp`),
    path.join(TAGS_DIR, `tag${num}.png`),
    path.join(TAGS_DIR, `tag${num}.jpg`),
    path.join(TAGS_DIR, `tag${num}.jpeg`),
  ];
  for (const p of candidates) if (fs.existsSync(p)) return p;
  return undefined;
}

async function analyzeTag(num){
  const file = fileForTag(num);
  if (!file) return { num, status: 'missing' };
  const layout = getLayout(num);
  const basePx = Math.round(AVATAR_PX * layout.widthRatio);

  const { ratio: bottomGapFull, natural } = await measureBottomGapRatio(file, 1);
  // Proposed center scan for curved-base crowns:
  const { ratio: bottomGapCenter } = await measureBottomGapRatio(file, SCAN_CENTER_RATIO_FOR(num));

  // Current code uses scanCenterRatio=1 always
  const scale = basePx / Math.max(1, natural.w || 1);
  const heightPx = (natural.h || 0) * scale;
  const bottomGapPxCurrent = Math.round((layout.autoAnchor ? bottomGapFull : 0) * heightPx);
  const anchorCurrent = Math.round(heightPx * (layout.anchorY ?? DEFAULT_LAYOUT.anchorY));
  const anchorFromImagePxCurrent = Math.round(anchorCurrent + (layout.yAdjustPx || 0) - bottomGapPxCurrent);

  // Heuristic classification: how far above top of avatar is the final translateY
  // translateY = -100% + anchorFromImagePx; if anchorFromImagePx is too small, badge floats too high.
  // We classify by anchorFromImagePx in pixels relative to avatar px.
  let cls;
  if (anchorFromImagePxCurrent >= Math.round(AVATAR_PX * 0.28)) cls = 'good';
  else if (anchorFromImagePxCurrent >= Math.round(AVATAR_PX * 0.16)) cls = 'slightly-high';
  else cls = 'too-high';

  return {
    num,
    file: path.basename(file),
    natural,
    layout,
    basePx,
    bottomGapFull: Number(bottomGapFull.toFixed(3)),
    bottomGapCenter: Number(bottomGapCenter.toFixed(3)),
    anchorFromImagePxCurrent,
    class: cls,
  };
}

(async () => {
  const entries = fs.readdirSync(TAGS_DIR).filter(f => /^tag(\d+)\.(webp|png|jpg|jpeg)$/i.test(f));
  const nums = entries.map(f => Number(f.match(/tag(\d+)/)[1])).sort((a,b)=>a-b);
  const uniqueNums = Array.from(new Set(nums));

  const results = [];
  for (const n of uniqueNums) {
    results.push(await analyzeTag(n));
  }

  const groups = {
    good: results.filter(r => r.class === 'good').map(r => r.num),
    slightly: results.filter(r => r.class === 'slightly-high').map(r => r.num),
    too: results.filter(r => r.class === 'too-high').map(r => r.num),
    missing: results.filter(r => r.status === 'missing').map(r => r.num),
  };

  console.log('Good:', groups.good.join(', '));
  console.log('Slightly high:', groups.slightly.join(', '));
  console.log('Too high:', groups.too.join(', '));
  if (groups.missing.length) console.log('Missing:', groups.missing.join(', '));

  // Detailed table
  console.log('\nDetails:');
  for (const r of results) {
    console.log(
      `${String(r.num).padStart(2,' ')} | ${r.file.padEnd(10)} | base=${r.basePx}px | gapFull=${r.bottomGapFull} | gapCtr=${r.bottomGapCenter} | anchorPx=${r.anchorFromImagePxCurrent} | ${r.class}`
    );
  }
})();

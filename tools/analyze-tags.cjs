#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Repo-relative paths
const TAGS_DIR = path.resolve(__dirname, '..', 'client', 'public', 'tags');

// Match logic with current client ProfileImage.tsx (TagOverlay)
// IMPORTANT: In the client, anchorY is applied as a FRACTION OF basePx (final tag width),
// not a fraction of tag HEIGHT. We also apply a clamp (maxEnter = basePx * SAFE_ENTER_RATIO).
const SAFE_ENTER_RATIO = 0.22; // must match TagOverlay's maxEnter factor
const DEFAULT_LAYOUT = { widthRatio: 1.10, xAdjustPx: 0, yAdjustPx: 0, anchorY: 0.10, autoAnchor: true };

// Try to load current overrides from client/src/config/tagLayouts.ts
const CONFIG_FILE = path.resolve(__dirname, '..', 'client', 'src', 'config', 'tagLayouts.ts');
let CONFIG_OVERRIDES = new Map();
try {
  const src = fs.readFileSync(CONFIG_FILE, 'utf8');
  // Match set(n, { anchorY: 0.123 ... })
  const re = /set\(\s*(\d+)\s*,\s*\{[^}]*?anchorY:\s*([0-9]*\.?[0-9]+)\s*\}/g;
  let m;
  while ((m = re.exec(src))) {
    const n = parseInt(m[1], 10);
    const v = parseFloat(m[2]);
    if (Number.isFinite(n) && Number.isFinite(v)) {
      CONFIG_OVERRIDES.set(n, { anchorY: v });
    }
  }
} catch {}
function getLayout(num){
  const base = { ...DEFAULT_LAYOUT };
  const ov = CONFIG_OVERRIDES.get(num);
  if (ov) Object.assign(base, ov);
  return base;
}

// Analysis params: match ProfileImage.tsx logic
const SIZES = [36, 56, 72]; // small, medium, large
const SCAN_CENTER_RATIO_FOR = () => 1; // client uses full-width scan now

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

function clamp(val, mi, ma){ return Math.max(mi, Math.min(ma, val)); }

function recommendAnchorY({
  natural, layout, bottomGapFull, px = 56,
  targetEntry = 0.20, // desired fraction of tag HEIGHT that should enter avatar
}){
  // Given current logic (anchorFromImagePx = bottomGapPx + basePx*anchorY + yAdjustPx, clamped to basePx*SAFE_ENTER_RATIO),
  // derive anchorY that achieves targetEntry without hitting the clamp.
  const basePx = Math.round(px * layout.widthRatio);
  const scale = basePx / Math.max(1, natural.w || 1);
  const heightPx = (natural.h || 0) * scale;
  const bottomGapPx = Math.round((layout.autoAnchor ? bottomGapFull : 0) * heightPx);
  const maxEnter = Math.round(basePx * SAFE_ENTER_RATIO);
  // We want: bottomGapPx + basePx*anchorY ≈ targetEntry * heightPx (ignore yAdjust for base recommendation)
  const needed = targetEntry * heightPx - bottomGapPx;
  let proposed = needed / Math.max(1, basePx);
  // Respect clamp: bottomGapPx + basePx*anchorY <= maxEnter → anchorY <= (maxEnter - bottomGapPx)/basePx
  const maxAnchorYAllowed = (maxEnter - bottomGapPx) / Math.max(1, basePx);
  // Bound to sane range
  proposed = clamp(proposed, 0, 0.35);
  return clamp(proposed, 0, isFinite(maxAnchorYAllowed) ? maxAnchorYAllowed : 0.35);
}

async function analyzeTag(num){
  const file = fileForTag(num);
  if (!file) return { num, status: 'missing' };
  const layout = getLayout(num);
  const { ratio: bottomGapFull, natural } = await measureBottomGapRatio(file, 1);

  // Compute per-size metrics exactly like the component
  const perSize = SIZES.map((px) => {
    const basePx = Math.round(px * layout.widthRatio);
    const scale = basePx / Math.max(1, natural.w || 1);
    const heightPx = (natural.h || 0) * scale;
    const bottomGapPx = Math.round((layout.autoAnchor ? bottomGapFull : 0) * heightPx);
    const desiredEnterPx = Math.round(basePx * (layout.anchorY ?? DEFAULT_LAYOUT.anchorY));
    const totalEnterBeforeClamp = bottomGapPx + desiredEnterPx + (layout.yAdjustPx || 0);
    const maxEnter = Math.round(basePx * SAFE_ENTER_RATIO);
    const anchorFromImagePx = clamp(totalEnterBeforeClamp, 0, maxEnter);
    const entryRatio = heightPx > 0 ? anchorFromImagePx / heightPx : 0; // fraction of tag height entering avatar
    // Classification ranges tuned for current clamp (0.22 of basePx)
    let cls;
    if (entryRatio >= 0.17 && entryRatio <= 0.24) cls = 'good';
    else if (entryRatio >= 0.12 && entryRatio < 0.17) cls = 'slightly-high';
    else if (entryRatio < 0.12) cls = 'too-high';
    else cls = 'too-low';
    return { px, basePx, heightPx: Math.round(heightPx), anchorFromImagePx, entryRatio: Number(entryRatio.toFixed(3)), class: cls };
  });

  // Derive a conservative overall class (worst among sizes)
  const order = { 'good': 3, 'slightly-high': 2, 'too-high': 1, 'too-low': 0 };
  const overall = perSize.reduce((acc, s) => (order[s.class] < order[acc] ? s.class : acc), 'good');

  const recAnchorY = recommendAnchorY({ natural, layout, bottomGapFull, px: 56, targetEntry: 0.20 });
  return {
    num,
    file: path.basename(file),
    natural,
    layout,
    bottomGapFull: Number(bottomGapFull.toFixed(3)),
    safeEnterRatio: SAFE_ENTER_RATIO,
    recommended: { anchorY: Number(recAnchorY.toFixed(3)) },
    perSize,
    class: overall,
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

  // Detailed per-size table
  console.log('\nDetails (per size):');
  for (const r of results) {
    const sizesText = r.perSize.map(s => `${s.px}px: base=${s.basePx}px entry=${(s.entryRatio*100).toFixed(1)}% anchorPx=${s.anchorFromImagePx}px [${s.class}]`).join(' | ');
    console.log(`${String(r.num).padStart(2,' ')} | ${r.file.padEnd(10)} | gap=${r.bottomGapFull} | rec.anchorY=${r.recommended.anchorY} | ${sizesText}`);
  }

  // Save machine-readable recommendations for automation
  try {
    fs.writeFileSync(path.resolve(__dirname, 'tag-layouts-recommendations.json'), JSON.stringify(
      results.map(r => ({ num: r.num, rec: r.recommended, gap: r.bottomGapFull, file: r.file })),
      null,
      2
    ));
    console.log('\nSaved recommendations to tools/tag-layouts-recommendations.json');
  } catch {}
})();

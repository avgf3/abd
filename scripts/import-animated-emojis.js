#!/usr/bin/env node
import fs from 'fs/promises';
import fssync from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseArgs(argv) {
	const args = {};
	for (const arg of argv.slice(2)) {
		if (arg.startsWith('--')) {
			const [k, v] = arg.replace(/^--/, '').split('=');
			args[k] = v === undefined ? true : v;
		}
	}
	return args;
}

function normalizeBoolean(value, fallback = false) {
	if (value === true) return true;
	if (value === false) return false;
	if (typeof value !== 'string') return fallback;
	return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

async function ensureDir(dir) {
	await fs.mkdir(dir, { recursive: true });
}

async function* walk(dir) {
	const entries = await fs.readdir(dir, { withFileTypes: true });
	for (const entry of entries) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			yield* walk(full);
		} else if (entry.isFile()) {
			yield full;
		}
	}
}

function createMatchers(terms) {
	const escaped = terms.map((t) => t.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'));
	return new RegExp(`(?:${escaped.join('|')})`, 'i');
}

const classicMap = {
	smile: ['smile', 'smiley', 'happy'],
	laugh: ['laugh', 'lol', 'grin'],
	wink: ['wink'],
	tongue: ['tongue', 'razz', 'cheeky'],
	cool: ['cool', 'sunglasses'],
	cry: ['cry', 'sad', 'tears'],
	angry: ['angry', 'mad'],
	heart: ['heart'],
	kiss: ['kiss', 'kissing'],
	confused: ['confused', 'unsure', 'puzzled'],
	shocked: ['shocked', 'surprised', 'gasp'],
	devil: ['devil', 'evil']
};

const modernMap = {
	party: ['party', 'tada', 'celebrate'],
	fire: ['fire', 'flame'],
	thumbsup: ['thumbsup', 'thumb', 'like'],
	clap: ['clap', 'applause'],
	love: ['love', 'heart'],
	rofl: ['rofl', 'rolling', 'lol'],
	think: ['think', 'thinking'],
	wave: ['wave', 'hello'],
	dance: ['dance', 'dancing'],
	rainbow: ['rainbow'],
	star: ['star'],
	rocket: ['rocket']
};

function toMatchers(map) {
	return Object.fromEntries(Object.entries(map).map(([k, arr]) => [k, createMatchers(arr)]));
}

const classicMatchers = toMatchers(classicMap);
const modernMatchers = toMatchers(modernMap);

function isGif(file) {
	return /\.gif$/i.test(file);
}

async function extractZip(zipPath, outDir) {
	const extract = (await import('extract-zip')).default;
	await extract(zipPath, { dir: outDir });
}

async function downloadToTemp(url) {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Failed to download: ${res.status} ${res.statusText}`);
	const tmp = path.join(os.tmpdir(), `emojis-${Date.now()}.zip`);
	const file = fssync.createWriteStream(tmp);
	await new Promise((resolve, reject) => {
		res.body.pipe(file);
		res.body.on('error', reject);
		file.on('finish', resolve);
	});
	return tmp;
}

async function findMatches(sourceDir, matchers) {
	const results = {};
	for (const [targetName, regex] of Object.entries(matchers)) {
		results[targetName] = null;
	}
	for await (const file of walk(sourceDir)) {
		if (!isGif(file)) continue;
		const base = path.basename(file).toLowerCase();
		for (const [targetName, regex] of Object.entries(matchers)) {
			if (!results[targetName] && regex.test(base)) {
				results[targetName] = file;
			}
		}
	}
	return results;
}

async function copyIfFound(mapping, destDir, { force }) {
	let copied = 0;
	for (const [target, src] of Object.entries(mapping)) {
		if (!src) continue;
		const out = path.join(destDir, `${target}.gif`);
		if (!force && fssync.existsSync(out)) continue;
		await ensureDir(path.dirname(out));
		await fs.copyFile(src, out);
		copied++;
	}
	return copied;
}

function printHelp() {
	console.log(`\nAnimated Emoji Import Tool\n\nUsage:\n  node scripts/import-animated-emojis.js --zip=/path/to/pack.zip [--force]\n  node scripts/import-animated-emojis.js --dir=/path/to/folder [--force]\n  node scripts/import-animated-emojis.js --url=https://example.com/pack.zip [--force]\n\nNotes:\n- Only *.gif files are considered.\n- Files are mapped heuristically to required names defined in client/src/data/animatedEmojis.json.\n- Destination folders:\n    client/public/assets/emojis/classic/\n    client/public/assets/emojis/modern/\n`);
}

async function main() {
	const args = parseArgs(process.argv);
	if (args.help || (!args.zip && !args.dir && !args.url)) {
		printHelp();
		return;
	}
	const force = normalizeBoolean(args.force, false);

	let workDir = null;
	let cleanup = null;
	try {
		if (args.zip) {
			workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'emoji-zip-'));
			await extractZip(path.resolve(args.zip), workDir);
			cleanup = async () => { await fs.rm(workDir, { recursive: true, force: true }); };
		} else if (args.url) {
			const zipPath = await downloadToTemp(args.url);
			workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'emoji-url-'));
			await extractZip(zipPath, workDir);
			cleanup = async () => { await fs.rm(workDir, { recursive: true, force: true }); try { await fs.unlink(zipPath); } catch {} };
		} else if (args.dir) {
			workDir = path.resolve(args.dir);
		}

		if (!workDir || !fssync.existsSync(workDir)) {
			throw new Error('Source directory not found after extraction.');
		}

		console.log(`Scanning source: ${workDir}`);
		const classicFound = await findMatches(workDir, classicMatchers);
		const modernFound = await findMatches(workDir, modernMatchers);

		const classicDest = path.resolve(__dirname, '..', 'client', 'public', 'assets', 'emojis', 'classic');
		const modernDest = path.resolve(__dirname, '..', 'client', 'public', 'assets', 'emojis', 'modern');

		const copiedClassic = await copyIfFound(classicFound, classicDest, { force });
		const copiedModern = await copyIfFound(modernFound, modernDest, { force });

		console.log(`\nCopied classic: ${copiedClassic}`);
		console.log(`Copied modern:  ${copiedModern}`);

		const missingClassic = Object.keys(classicFound).filter((k) => !classicFound[k]);
		const missingModern = Object.keys(modernFound).filter((k) => !modernFound[k]);
		if (missingClassic.length || missingModern.length) {
			console.log('\nMissing (not found in source):');
			if (missingClassic.length) console.log(' classic:', missingClassic.join(', '));
			if (missingModern.length) console.log(' modern: ', missingModern.join(', '));
		}

		console.log('\nDone.');
	} finally {
		if (typeof cleanup === 'function') {
			await cleanup();
		}
	}
}

main().catch((err) => {
	console.error('Import failed:', err?.stack || err?.message || String(err));
	process.exit(1);
});
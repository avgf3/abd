#!/usr/bin/env node

/**
 * أداة إزالة console.log للإنتاج
 * تقوم بإزالة console.log من ملفات JavaScript/TypeScript
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// الملفات والمجلدات التي نريد فحصها
const TARGET_DIRS = [
  path.join(__dirname, '..', 'server'),
  path.join(__dirname, '..', 'client', 'src'),
];

// أنماط console.log التي نريد إزالتها
const CONSOLE_PATTERNS = [
  /console\.log\([^;]*\);?\s*\n?/g,
  /console\.debug\([^;]*\);?\s*\n?/g,
  /console\.info\([^;]*\);?\s*\n?/g,
];

// الملفات التي نتجاهلها
const IGNORE_FILES = ['logger.ts', 'remove-console-logs.js', 'test-', '.test.', '.spec.'];

let totalRemoved = 0;
let filesProcessed = 0;

function shouldIgnoreFile(filePath) {
  const fileName = path.basename(filePath);
  return IGNORE_FILES.some((pattern) => fileName.includes(pattern));
}

function removeConsoleLogs(content) {
  let newContent = content;
  let removedCount = 0;

  CONSOLE_PATTERNS.forEach((pattern) => {
    const matches = newContent.match(pattern);
    if (matches) {
      removedCount += matches.length;
      newContent = newContent.replace(pattern, '');
    }
  });

  return { newContent, removedCount };
}

function processFile(filePath) {
  if (shouldIgnoreFile(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const { newContent, removedCount } = removeConsoleLogs(content);

  if (removedCount > 0) {
    fs.writeFileSync(filePath, newContent);
    console.log(`✅ ${filePath}: إزالة ${removedCount} console.log`);
    totalRemoved += removedCount;
  }

  filesProcessed++;
}

function processDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    console.log(`⚠️ المجلد غير موجود: ${dirPath}`);
    return;
  }

  const items = fs.readdirSync(dirPath);

  items.forEach((item) => {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (stat.isFile() && /\.(ts|tsx|js|jsx)$/.test(item)) {
      processFile(fullPath);
    }
  });
}

function main() {
  console.log('🧹 بدء إزالة console.log للإنتاج...\n');

  TARGET_DIRS.forEach((dir) => {
    console.log(`📁 فحص المجلد: ${dir}`);
    processDirectory(dir);
  });

  console.log('\n📊 النتائج النهائية:');
  console.log(`📁 ملفات مفحوصة: ${filesProcessed}`);
  console.log(`🗑️ console.log مُزالة: ${totalRemoved}`);

  if (totalRemoved > 0) {
    console.log('\n✅ تم إزالة console.log بنجاح!');
    console.log('💡 تم الاحتفاظ بـ logger.ts للـ logging المحترف');
  } else {
    console.log('\n✨ لا توجد console.log لإزالتها');
  }
}

main();

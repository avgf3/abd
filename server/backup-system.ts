import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface BackupOptions {
  includeNodeModules?: boolean;
  includeDist?: boolean;
  format: 'zip' | 'tar';
}

export class BackupSystem {
  private projectRoot: string;

  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
  }

  async createBackup(options: BackupOptions = { format: 'zip' }): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `arabic-chat-backup-${timestamp}.${options.format}`;
    const backupPath = path.join(this.projectRoot, 'backups', backupName);

    // إنشاء مجلد النسخ الاحتياطية
    const backupDir = path.dirname(backupPath);
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const output = fs.createWriteStream(backupPath);
    const archive = archiver(options.format, {
      zlib: { level: 9 } // أقصى ضغط
    });

    return new Promise((resolve, reject) => {
      output.on('close', () => {
        console.log(`تم إنشاء نسخة احتياطية: ${backupName} (${archive.pointer()} بايت)`);
        resolve(backupPath);
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.pipe(output);

      // إضافة الملفات والمجلدات الأساسية
      this.addEssentialFiles(archive, options);

      archive.finalize();
    });
  }

  private addEssentialFiles(archive: archiver.Archiver, options: BackupOptions) {
    // ملفات الكود الأساسية
    archive.directory(path.join(this.projectRoot, 'client'), 'client');
    archive.directory(path.join(this.projectRoot, 'server'), 'server');
    archive.directory(path.join(this.projectRoot, 'shared'), 'shared');

    // ملفات التكوين
    archive.file(path.join(this.projectRoot, 'package.json'), { name: 'package.json' });
    archive.file(path.join(this.projectRoot, 'package-lock.json'), { name: 'package-lock.json' });
    archive.file(path.join(this.projectRoot, 'tsconfig.json'), { name: 'tsconfig.json' });
    archive.file(path.join(this.projectRoot, 'vite.config.ts'), { name: 'vite.config.ts' });
    archive.file(path.join(this.projectRoot, 'tailwind.config.ts'), { name: 'tailwind.config.ts' });
    archive.file(path.join(this.projectRoot, 'postcss.config.js'), { name: 'postcss.config.js' });
    archive.file(path.join(this.projectRoot, 'components.json'), { name: 'components.json' });
    archive.file(path.join(this.projectRoot, 'drizzle.config.ts'), { name: 'drizzle.config.ts' });
    archive.file(path.join(this.projectRoot, 'replit.md'), { name: 'replit.md' });

    // ملفات إضافية
    if (fs.existsSync(path.join(this.projectRoot, '.replit'))) {
      archive.file(path.join(this.projectRoot, '.replit'), { name: '.replit' });
    }
    if (fs.existsSync(path.join(this.projectRoot, '.gitignore'))) {
      archive.file(path.join(this.projectRoot, '.gitignore'), { name: '.gitignore' });
    }
    if (fs.existsSync(path.join(this.projectRoot, 'README.md'))) {
      archive.file(path.join(this.projectRoot, 'README.md'), { name: 'README.md' });
    }

    // المجلدات الاختيارية
    if (options.includeNodeModules && fs.existsSync(path.join(this.projectRoot, 'node_modules'))) {
      archive.directory(path.join(this.projectRoot, 'node_modules'), 'node_modules');
    }

    if (options.includeDist && fs.existsSync(path.join(this.projectRoot, 'dist'))) {
      archive.directory(path.join(this.projectRoot, 'dist'), 'dist');
    }
  }

  async createCodeOnlyBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `arabic-chat-code-${timestamp}.zip`;
    const backupPath = path.join(this.projectRoot, 'backups', backupName);

    const backupDir = path.dirname(backupPath);
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const output = fs.createWriteStream(backupPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    return new Promise((resolve, reject) => {
      output.on('close', () => {
        console.log(`تم إنشاء نسخة الكود فقط: ${backupName}`);
        resolve(backupPath);
      });

      archive.on('error', reject);
      archive.pipe(output);

      // إضافة الكود فقط
      archive.directory(path.join(this.projectRoot, 'client/src'), 'client/src');
      archive.directory(path.join(this.projectRoot, 'server'), 'server');
      archive.directory(path.join(this.projectRoot, 'shared'), 'shared');
      
      // ملفات التكوين الأساسية
      archive.file(path.join(this.projectRoot, 'package.json'), { name: 'package.json' });
      archive.file(path.join(this.projectRoot, 'tsconfig.json'), { name: 'tsconfig.json' });
      archive.file(path.join(this.projectRoot, 'vite.config.ts'), { name: 'vite.config.ts' });
      archive.file(path.join(this.projectRoot, 'tailwind.config.ts'), { name: 'tailwind.config.ts' });

      archive.finalize();
    });
  }

  getBackupsList(): string[] {
    const backupsDir = path.join(this.projectRoot, 'backups');
    if (!fs.existsSync(backupsDir)) {
      return [];
    }
    
    return fs.readdirSync(backupsDir)
      .filter(file => file.endsWith('.zip') || file.endsWith('.tar'))
      .sort((a, b) => {
        const statA = fs.statSync(path.join(backupsDir, a));
        const statB = fs.statSync(path.join(backupsDir, b));
        return statB.mtime.getTime() - statA.mtime.getTime();
      });
  }
}

export const backupSystem = new BackupSystem();
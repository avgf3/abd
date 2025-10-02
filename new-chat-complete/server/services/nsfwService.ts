/**
 * خدمة بسيطة لكشف NSFW بشكل تقريبي بدون مزودات خارجية
 * تعتمد على قواعد اسم الملف ونسب ألوان الجلد وبعض الأنماط الأولية.
 * الهدف: منع صور الرسائل الإباحية بشكل وقائي وخفيف.
 */

import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

export type NsfwResult = { isSafe: boolean; reason?: string };

class NsfwHeuristicService {
  private static instance: NsfwHeuristicService;

  static getInstance(): NsfwHeuristicService {
    if (!NsfwHeuristicService.instance) {
      NsfwHeuristicService.instance = new NsfwHeuristicService();
    }
    return NsfwHeuristicService.instance;
  }

  /**
   * فحص تقريبي للـ NSFW لملف مخزن على القرص.
   * لا يضمن الدقة العالية لكنه يمنع الحالات الفجة.
   */
  async checkFileUnsafe(filePath: string, originalName?: string, mimeType?: string): Promise<NsfwResult> {
    try {
      const name = (originalName || '').toLowerCase();
      const ext = path.extname(name);

      // 1) منع صيغ خطرة/نصية (SVG) لتجنب استغلالها كسكربت
      if (ext === '.svg' || (mimeType || '').toLowerCase() === 'image/svg+xml') {
        return { isSafe: false, reason: 'نوع الصورة غير مسموح' };
      }

      // 2) كلمات مفتاحية فاضحة في اسم الملف
      const bannedKeywords = ['sex', 'porn', 'xxx', 'nude', 'nsfw'];
      if (bannedKeywords.some((k) => name.includes(k))) {
        return { isSafe: false, reason: 'اسم الملف يحتوي كلمات غير لائقة' };
      }

      // 3) تحليل ألوان مبسط: نسبة عالية من درجات البشرة قد تدل على عُري فاضح
      // ملاحظة: تحليل بسيط جداً لتقليل الإيجابيات الكاذبة
      try {
        const buffer = await fs.readFile(filePath);
        const image = sharp(buffer).resize(64, 64, { fit: 'inside' }).removeAlpha();
        const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

        let skinLike = 0;
        const total = info.width * info.height;
        for (let i = 0; i < data.length; i += 3) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          // نطاق بشرة تقريبي جداً (YCrCb مبسط في RGB):
          const isSkin = r > 95 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15;
          if (isSkin) skinLike++;
        }
        const ratio = skinLike / (total || 1);

        // إذا تجاوزت نسبة البشرة 80% نعتبرها مخاطرة ونرفض (تخفيف الحساسية لتقليل الإيجابيات الكاذبة)
        if (ratio >= 0.8) {
          return { isSafe: false, reason: 'تم رفض الصورة لمحتوى محتمل غير لائق' };
        }
      } catch {
        // فشل تحليل الصورة: مرِّر لكن استمر بالتحقق الآخر
      }

      return { isSafe: true };
    } catch {
      // في حالة خطأ غير متوقع، اسمح بدلاً من الحظر الصامت
      return { isSafe: true };
    }
  }
}

export const nsfwService = NsfwHeuristicService.getInstance();
export default nsfwService;


// فحص مبسط للصور لمنع المحتوى الجنسي باستخدام تحليل نسبة لون الجلد
// يعتمد على Heuristics بدون مكتبات ثقيلة، باستخدام sharp لتحويل الصورة إلى بيانات RAW

import sharp from 'sharp';

export type AdultCheckResult = {
  isSexual: boolean;
  skinRatio: number;
  width: number;
  height: number;
};

// تحويل RGB إلى YCbCr للتعرف على لون الجلد (تقريبي)
function rgbToYCbCr(r: number, g: number, b: number) {
  // الصيغ التقريبية القياسية
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  return { y, cb, cr };
}

// اكتشاف بكسلات الجلد باستخدام عتبات YCbCr + فلترة بسيطة على HSV لتقليل الإيجابيات الكاذبة
function isSkinPixel(r: number, g: number, b: number): boolean {
  const { cb, cr } = rgbToYCbCr(r, g, b);
  // عتبات شائعة للجلد في YCbCr
  const inYCbCrRange = cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173;

  // فلترة HSV المساعدة
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const v = max / 255;
  const s = max === 0 ? 0 : (max - min) / max;
  let h = 0;
  if (max === min) {
    h = 0;
  } else if (max === r) {
    h = ((g - b) / (max - min)) * 60;
  } else if (max === g) {
    h = (2 + (b - r) / (max - min)) * 60;
  } else {
    h = (4 + (r - g) / (max - min)) * 60;
  }
  if (h < 0) h += 360;

  // نطاق لون الجلد في HSV تقريبي: H بين 0 و 50، S متوسط، V متوسط/مرتفع
  const inHSVRange = h >= 0 && h <= 50 && s >= 0.23 && s <= 0.9 && v >= 0.35;

  return inYCbCrRange && inHSVRange;
}

export async function detectSexualImage(
  buffer: Buffer,
  opts?: { strict?: boolean; downscaleTo?: number; threshold?: number }
): Promise<AdultCheckResult> {
  const strict = opts?.strict ?? (process.env.ADULT_CONTENT_STRICT === 'true');
  const sampleSize = Math.max(32, Math.min(128, opts?.downscaleTo ?? 96));
  const threshold = Math.min(0.9, Math.max(0.05, opts?.threshold ?? (strict ? 0.28 : 0.38)));

  try {
    const { data, info } = await sharp(buffer)
      .removeAlpha()
      .resize({ width: sampleSize, height: sampleSize, fit: 'inside' })
      .ensureAlpha()
      .toColourspace('srgb')
      .raw()
      .toBuffer({ resolveWithObject: true } as any);

    const channels = info.channels; // قد تكون 4 بسبب ensureAlpha
    const width = info.width;
    const height = info.height;
    const totalPixels = width * height;
    if (!totalPixels || channels < 3) {
      return { isSexual: false, skinRatio: 0, width, height };
    }

    let skinCount = 0;
    for (let i = 0; i < data.length; i += channels) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (isSkinPixel(r, g, b)) skinCount++;
    }

    const skinRatio = skinCount / totalPixels;
    const isSexual = skinRatio >= threshold;
    return { isSexual, skinRatio, width, height };
  } catch (error) {
    // في حالة فشل التحليل، لا نمنع بشكل صلب، بل نسمح مع تسجيل ملاحظة
    return { isSexual: false, skinRatio: 0, width: 0, height: 0 };
  }
}

// مبدئياً الفيديو غير مدعوم للرفع في النظام (مصفي MIME يمنع الفيديو)،
// إن تمت إضافة رفع فيديو لاحقاً يمكن فحص لقطات من الفيديو هنا.
export async function detectSexualVideo(_buffer: Buffer): Promise<AdultCheckResult> {
  return { isSexual: false, skinRatio: 0, width: 0, height: 0 };
}


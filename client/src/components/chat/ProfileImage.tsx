import { memo, useEffect, useMemo, useState } from 'react';

import type { ChatUser } from '@/types/chat';
import { getImageSrc } from '@/utils/imageUtils';
import VipAvatar from '@/components/ui/VipAvatar';
import { getTagLayout, DEFAULT_TAG_LAYOUT } from '@/config/tagLayouts';
// نظام التيجان الموحد - جميع التيجان تستخدم نفس الآلية البسيطة

interface ProfileImageProps {
  user: ChatUser;
  size?: 'small' | 'medium' | 'large';
  // حجم بكسلات مخصص لتوحيد المقاس بدقة أينما لزم
  pixelSize?: number;
  className?: string;
  onClick?: (e: any) => void;
  hideRoleBadgeOverlay?: boolean;
  // تعطيل عرض إطار الصورة في سياقات معينة (مثل الرسائل)
  disableFrame?: boolean;
}

type TagOverlayProps = {
  src: string;
  overlayTopPx: number;
  basePx: number; // عرض التاج النهائي بالبكسل (يعتمد على widthRatio)
  anchorY?: number; // نسبة من ارتفاع التاج تدخل فوق الرأس
  yAdjustPx?: number;
  xAdjustPx?: number;
  autoAnchor?: boolean; // حساب تلقائي لهامش الشفافية السفلي
  // جعل التاج يلامس أعلى الصورة تماماً (بدون دخول)
  touchTop?: boolean;
  // نسبة عرض المسح من منتصف الصورة أفقياً لحساب الشفافية (0.3..1)
  centerScanRatio?: number;
};

// مكون التاج مع احتساب الارتكاز بناءً على أبعاد الصورة الحقيقية لمواءمة محترفة
const TagOverlay = memo(function TagOverlay({
  src,
  overlayTopPx,
  basePx,
  anchorY = 0.08,
  yAdjustPx = 0,
  xAdjustPx = 0,
  autoAnchor = true,
  touchTop = false,
  centerScanRatio = 1,
}: TagOverlayProps) {
  const [imageSrc, setImageSrc] = useState<string>(src);
  const [fallbackStep, setFallbackStep] = useState<number>(0);
  const [isReady, setIsReady] = useState<boolean>(false);
  useEffect(() => {
    setImageSrc(src);
    setFallbackStep(0);
    setIsReady(false);
  }, [src]);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [bottomGapRatio, setBottomGapRatio] = useState<number>(0); // نسبة الشفافية من الأسفل

  const anchorFromImagePx = (() => {
    // نحسب إدخالاً ثابتاً يعتمد على عرض التاج المعروض (basePx) لضمان ثبات عبر اختلاف الأبعاد
    const desiredEnterPx = touchTop ? 0 : Math.round(basePx * anchorY);

    // إذا لم تُحمّل الصورة بعد، أعد قيمة ثابتة ومستقرة دون الاعتماد على naturalSize
    if (!naturalSize) {
      return Math.round(desiredEnterPx + yAdjustPx);
    }

    // حساب أبعاد التاج المعروض على الشاشة
    const scale = basePx / Math.max(1, naturalSize.w);
    const heightPx = naturalSize.h * scale;

    // الشفافية السفلية: أضفها فقط عند تفعيل autoAnchor
    const bottomGapPx = autoAnchor ? Math.round(bottomGapRatio * heightPx) : 0;

    // حد أدنى للدخول: 5% من ارتفاع التاج فوق الرأس (بعد إزالة الشفافية)
    const MIN_ENTRY_RATIO = 0.05;
    const minVisibleEnterPx = Math.round(heightPx * MIN_ENTRY_RATIO);

    // اجمع القيم مع قيد علوي بسيط لمنع الطيران في الحالات الشاذة
    let total = bottomGapPx + desiredEnterPx + yAdjustPx;
    if (!touchTop) {
      // تأكد أن الجزء المرئي يدخل على الأقل 5%
      const minTotalIncludingGap = bottomGapPx + minVisibleEnterPx;
      if (total < minTotalIncludingGap) total = minTotalIncludingGap;
    }
    const maxEnter = Math.round(basePx * 0.22); // حد أمان 22% من عرض التاج
    const clamped = Math.max(0, Math.min(total, maxEnter));
    return clamped;
  })();

  return (
    <img
      src={imageSrc}
      alt="tag"
      className="profile-tag-overlay"
      aria-hidden="true"
      style={{
        top: overlayTopPx,
        width: basePx,
        transform: `translate(-50%, calc(-100% + ${anchorFromImagePx}px))`,
        marginLeft: xAdjustPx,
        backgroundColor: 'transparent',
        background: 'transparent',
        opacity: isReady ? 1 : 0,
        visibility: isReady ? 'visible' : 'hidden',
        transition: 'none',
        willChange: 'auto',
        transformOrigin: '50% 100%',
      }}
      decoding="async"
      loading="eager"
      draggable={false}
      onLoad={(e: any) => {
        try {
          const img = e.currentTarget as HTMLImageElement;
          if (img && img.naturalWidth && img.naturalHeight) {
            // حفظ الحجم الطبيعي
            setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
            // حساب نسبة الشفافية السفلية تلقائياً بشكل خفيف الأداء
            // نقوم بالمسح على نسخة مصغّرة لسرعة التشغيل
            const maxW = 96; // عرض المسح (أقصى حد)
            const scale = Math.min(1, maxW / img.naturalWidth);
            const cw = Math.max(1, Math.floor(img.naturalWidth * scale));
            const ch = Math.max(1, Math.floor(img.naturalHeight * scale));
            const canvas = document.createElement('canvas');
            canvas.width = cw;
            canvas.height = ch;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, cw, ch);
              const imageData = ctx.getImageData(0, 0, cw, ch);
              const data = imageData.data;
              // امسح من الأسفل للأعلى للعثور على أول صف يحتوي على بكسلات غير شفافة
              let gapRows = 0;
              const stride = 4; // RGBA
              // نستخدم خطوات أفقية لتقليل التكلفة
              const stepX = Math.max(1, Math.floor(cw / 24));
              // نطاق الفحص الأفقي (العرض الكامل)
              const scanRatio = Math.max(0.3, Math.min(1, centerScanRatio));
              const xStart = Math.floor(((1 - scanRatio) / 2) * cw);
              const xEnd = Math.ceil(cw - xStart);
              scan: for (let y = ch - 1; y >= 0; y--) {
                let rowTransparent = true;
                for (let x = xStart; x < xEnd; x += stepX) {
                  const idx = (y * cw + x) * stride + 3; // قناة ألفا
                  const alpha = data[idx];
                  if (alpha > 8) { // أي بكسل شبه مرئي يوقف الشفافية
                    rowTransparent = false;
                    break;
                  }
                }
                if (rowTransparent) {
                  gapRows++;
                } else {
                  break scan;
                }
              }
              const ratio = gapRows / ch;
              // تأكد من النطاق
              setBottomGapRatio(Number.isFinite(ratio) ? Math.max(0, Math.min(0.5, ratio)) : 0);
            }
            setIsReady(true);
          }
        } catch {}
      }}
      onError={(e: any) => {
        try {
          const cur = imageSrc || '';
          // Fallback chain: .webp -> .png -> .jpg -> .jpeg -> hide
          if (fallbackStep === 0 && /\.webp(\?.*)?$/.test(cur)) {
            setImageSrc(cur.replace(/\.webp(\?.*)?$/i, '.png$1'));
            setFallbackStep(1);
            return;
          }
          if (fallbackStep === 1 && /\.png(\?.*)?$/.test(cur)) {
            setImageSrc(cur.replace(/\.png(\?.*)?$/i, '.jpg$1'));
            setFallbackStep(2);
            return;
          }
          if (fallbackStep === 2 && /\.jpg(\?.*)?$/.test(cur)) {
            setImageSrc(cur.replace(/\.jpg(\?.*)?$/i, '.jpeg$1'));
            setFallbackStep(3);
            return;
          }
          e.currentTarget.style.display = 'none';
        } catch {}
      }}
    />
  );
}, (prev, next) => (
  prev.src === next.src &&
  prev.overlayTopPx === next.overlayTopPx &&
  prev.basePx === next.basePx &&
  prev.anchorY === next.anchorY &&
  prev.yAdjustPx === next.yAdjustPx &&
  prev.xAdjustPx === next.xAdjustPx &&
  prev.autoAnchor === next.autoAnchor &&
  prev.touchTop === next.touchTop &&
  prev.centerScanRatio === next.centerScanRatio
));

export default function ProfileImage({
  user,
  size = 'medium',
  pixelSize,
  className = '',
  onClick,
  hideRoleBadgeOverlay = false,
  disableFrame = false,
}: ProfileImageProps) {
  const sizeClasses = {
    small: 'w-9 h-9',
    medium: 'w-14 h-14',
    large: 'w-18 h-18',
  };

  // تحديد لون الإطار حسب الجنس - كما كان سابقاً (ring + border color)
  // دعم القيم العربية للجنس إضافة إلى الإنجليزية
  const isFemale = user.gender === 'female' || user.gender === 'أنثى';
  const borderColor = isFemale ? 'border-pink-400 ring-pink-200' : 'border-blue-400 ring-blue-200';
  


  // مصدر الصورة مع دعم ?v=hash إذا وُجد ومعالجة أفضل للحالات الفارغة
  const imageSrc = useMemo(() => {
    // التأكد من وجود profileImage قبل المعالجة
    if (!user.profileImage) {
      return '/default_avatar.svg';
    }
    
    const base = getImageSrc(user.profileImage, '/default_avatar.svg');
    
    // لا تضف ?v عندما يكون base عبارة عن data:base64 أو يحتوي بالفعل على v
    const isBase64 = typeof base === 'string' && base.startsWith('data:');
    const hasVersionAlready = typeof base === 'string' && base.includes('?v=');
    const versionTag = (user as any)?.avatarHash || (user as any)?.avatarVersion;
    
    if (!isBase64 && versionTag && !hasVersionAlready && typeof base === 'string' && base.startsWith('/')) {
      return `${base}?v=${versionTag}`;
    }
    
    return base;
  }, [user.profileImage, (user as any)?.avatarHash, (user as any)?.avatarVersion]);

  const frameName = (user as any)?.profileFrame as string | undefined;
  const tagName = (user as any)?.profileTag as string | undefined;
  const tagSrc: string | undefined = (() => {
    if (!tagName) return undefined;
    const str = String(tagName);
    if (str.startsWith('data:') || str.startsWith('/') || str.includes('/')) return str;
    const m = str.match(/(\d+)/);
    if (m && Number.isFinite(parseInt(m[1]))) {
      const n = Math.max(1, Math.min(50, parseInt(m[1])));
      return `/tags/tag${n}.webp`;
    }
    return `/tags/${str}`;
  })();
  const tagNumber: number | undefined = (() => {
    if (!tagName) return undefined;
    const m = String(tagName).match(/(\d+)/);
    if (!m) return undefined;
    const n = parseInt(m[1], 10);
    return Number.isFinite(n) ? n : undefined;
  })();

  // إعدادات التاج من التخطيطات الموحدة
  const layout = getTagLayout(tagNumber);
  
  // جميع التيجان تستخدم نفس المنطق البسيط الموحد
  const needsTouchTop = false;
  const frameIndex = (() => {
    if (!frameName) return undefined;
    const match = String(frameName).match(/(\d+)/);
    if (!match) return undefined;
    const n = parseInt(match[1], 10);
    if (!Number.isFinite(n) || n <= 0) return undefined; // تجاهل 0 أو قيم غير صالحة
    // دعم حتى 50 إطاراً
    return Math.min(50, n) as any;
  })();

  if (!disableFrame && frameName && frameIndex) {
    const centerScanRatio = 1; // مسح كامل العرض لتوحيد حساب الشفافية
    // مقاسات دقيقة لتطابق الموقع الآخر - مُصغرة بحوالي 10%
    const px = pixelSize ?? (size === 'small' ? 36 : size === 'large' ? 72 : 56);
    // الحاوية يجب أن تكون أكبر لاستيعاب الإطار (نفس النسبة المستخدمة في VipAvatar)
    const containerSize = px * 1.35;
    const imageTopWithinContainer = (containerSize - px) / 2; // موضع أعلى الصورة داخل الحاوية
    // التاج يجب أن يلامس أعلى الصورة تماماً، دون التأثر بإزاحة الإطار
    const overlayTopPx = imageTopWithinContainer; // تلامس مباشر مع أعلى الصورة

    return (
      <div
        className={`relative inline-block ${className || ''}`}
        onClick={onClick}
        style={{ width: containerSize, height: containerSize, contain: 'layout style', isolation: 'isolate', overflow: 'visible' }}
      >
        <VipAvatar src={imageSrc} alt={`صورة ${user.username}`} size={px} frame={frameIndex as any} />
        {tagSrc && (
          <TagOverlay
            src={tagSrc}
            overlayTopPx={overlayTopPx}
            basePx={Math.round(px * layout.widthRatio)}
            anchorY={layout.anchorY ?? DEFAULT_TAG_LAYOUT.anchorY!}
            yAdjustPx={layout.yAdjustPx || 0}
            xAdjustPx={layout.xAdjustPx}
            autoAnchor={layout.autoAnchor}
            touchTop={needsTouchTop}
            centerScanRatio={centerScanRatio}
          />
        )}
      </div>
    );
  }

  {
    const px = pixelSize ?? (size === 'small' ? 36 : size === 'large' ? 72 : 56);
    const containerSize = px * 1.35; // نفس حاوية إضافة الإطار
    const imageTopWithinContainer = (containerSize - px) / 2;
    const overlayTopPx = imageTopWithinContainer;
    const centerScanRatio = 1; // مسح كامل العرض لتوحيد حساب الشفافية


    return (
      <div
        className={`relative inline-block ${className || ''}`}
        onClick={onClick}
        style={{ width: containerSize, height: containerSize, contain: 'layout style', isolation: 'isolate', overflow: 'visible' }}
      >
        <div className="vip-frame-inner">
          <img
            src={imageSrc}
            alt={`صورة ${user.username}`}
            className={`rounded-full ring-[3px] ${borderColor} shadow-sm object-cover`}
            style={{
              width: px,
              height: px,
              transition: 'none',
              backfaceVisibility: 'hidden',
              transform: 'translateZ(0)',
              display: 'block',
            }}
            loading="lazy"
            decoding="async"
            sizes={String(px) + 'px'}
            onError={(e: any) => {
              if (e?.currentTarget && e.currentTarget.src !== '/default_avatar.svg') {
                e.currentTarget.src = '/default_avatar.svg';
              }
            }}
          />
        </div>
        {tagSrc && (
          <TagOverlay
            src={tagSrc}
            overlayTopPx={overlayTopPx}
            basePx={Math.round(px * layout.widthRatio)}
            anchorY={layout.anchorY ?? DEFAULT_TAG_LAYOUT.anchorY!}
            yAdjustPx={layout.yAdjustPx || 0}
            xAdjustPx={layout.xAdjustPx}
            autoAnchor={layout.autoAnchor}
            touchTop={needsTouchTop}
            centerScanRatio={centerScanRatio}
          />
        )}
      </div>
    );
  }
}

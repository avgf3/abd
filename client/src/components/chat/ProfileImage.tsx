import { memo, useEffect, useMemo, useRef, useState } from 'react';

import { getUserLevelIcon } from '@/components/chat/UserRoleBadge';
import type { ChatUser } from '@/types/chat';
import { getImageSrc } from '@/utils/imageUtils';
import VipAvatar from '@/components/ui/VipAvatar';
import { getTagLayout } from '@/config/tagLayouts';

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
  // سياق العرض لضبط التيجان بدقة بين الملف الشخصي والحاويات
  context?: 'profile' | 'container';
}

type TagOverlayProps = {
  src: string;
  overlayTopPx: number;
  basePx: number;
  // تمرير القيم اللازمة فقط لتثبيت الهوية ومنع إعادة التركيب المتكرر
  anchorY?: number;
  yAdjustPx?: number;
  xAdjustPx?: number;
  autoAnchor?: boolean;
  // حد أقصى مسموح لتداخل التاج داخل الأفاتار (px)
  maxIntrusionPx?: number;
};

// مكون التاج خارج ProfileImage لمنع تبديل الهوية والوميض، مع تحسينات استقرار
const TagOverlay = memo(function TagOverlay({
  src,
  overlayTopPx,
  basePx,
  anchorY,
  yAdjustPx,
  xAdjustPx,
  autoAnchor,
  maxIntrusionPx,
}: TagOverlayProps) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [anchorOffsetPx, setAnchorOffsetPx] = useState<number>(yAdjustPx || 0);

  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;
    let cancelled = false;

    const compute = () => {
      if (!el.naturalWidth || !el.naturalHeight) return;
      // عرض التاج النهائي بالبكسل
      const overlayWidthPx = Math.round(basePx);
      const scale = overlayWidthPx / el.naturalWidth;
      const tagRenderedHeight = el.naturalHeight * scale;

      let bottomGapPx = 0;
      if (autoAnchor) {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = el.naturalWidth;
          canvas.height = el.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(el, 0, 0);
            const alphaThreshold = 12; // ~5%
            for (let y = canvas.height - 1; y >= 0; y--) {
              const row = ctx.getImageData(0, y, canvas.width, 1).data;
              let opaque = false;
              for (let x = 0; x < canvas.width; x++) {
                if (row[x * 4 + 3] > alphaThreshold) { opaque = true; break; }
              }
              if (opaque) {
                bottomGapPx = (canvas.height - 1 - y) * scale;
                break;
              }
            }
          }
        } catch {
          // ignore
        }
      }

      const tagVisibleHeight = tagRenderedHeight - bottomGapPx;
      const depth = Math.max(0, Math.min(1, anchorY ?? 0)) * tagVisibleHeight;
      // 🔧 إصلاح: bottomGapPx يجب أن يُطرح وليس يُجمع لرفع التاج وإزالة الشفافية
      const totalOffset = tagVisibleHeight - depth + (yAdjustPx || 0) - bottomGapPx;

      // 🔒 منع دخول التاج داخل الصورة بأكثر من الحد المسموح
      const maxIntrusion = Math.max(0, maxIntrusionPx || 0);
      // موضع أسفل التاج المرئي بالنسبة لأعلى الصورة = -100% + anchorOffset + bottomGapPx
      // حتى لا يتجاوز الحد، نقيد anchorOffset ≤ tagRenderedHeight + maxIntrusion - bottomGapPx
      const maxAllowedAnchorOffset = Math.max(0, Math.min(tagRenderedHeight + maxIntrusion - bottomGapPx, tagRenderedHeight * 2));
      const clampedOffset = Math.max(0, Math.min(totalOffset, maxAllowedAnchorOffset));
      if (!cancelled) {
        setAnchorOffsetPx(Math.round(clampedOffset));
      }
    };

    if (el.complete) compute();
    el.addEventListener('load', compute);
    return () => {
      cancelled = true;
      el.removeEventListener('load', compute);
    };
  }, [src, basePx, anchorY, autoAnchor, yAdjustPx]);

  return (
    <img
      ref={imgRef}
      src={src}
      alt="tag"
      className="profile-tag-overlay"
      aria-hidden="true"
      style={{
        top: overlayTopPx,
        // نمرر العرض المحسوب من المكون الأب كـ basePx مباشرة هنا
        width: basePx,
        transform: `translate(-50%, calc(-100% + ${anchorOffsetPx}px))`,
        marginLeft: xAdjustPx || 0,
        backgroundColor: 'transparent',
        background: 'transparent',
        opacity: 1, // إزالة وميض الانتقال من 0 -> 1
        transition: 'transform 120ms ease-out',
        willChange: 'transform',
        transformOrigin: '50% 100%',
      }}
      decoding="async"
      loading="eager"
      draggable={false}
      onError={(e: any) => { try { e.currentTarget.style.display = 'none'; } catch {} }}
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
  prev.maxIntrusionPx === next.maxIntrusionPx
));

export default function ProfileImage({
  user,
  size = 'medium',
  pixelSize,
  className = '',
  onClick,
  hideRoleBadgeOverlay = false,
  disableFrame = false,
  context = 'container',
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

  // 🎯 إعدادات التاج المحسّنة الجديدة - موحدة ومتوازنة
  type LayoutDelta = { widthRatioDelta?: number; yAdjustDelta?: number; xAdjustDelta?: number; anchorDelta?: number };
  
  // ✨ إعدادات محسّنة للملفات الشخصية - ضبط دقيق لكل تاج حسب المتطلبات الجديدة
  const PROFILE_DELTAS: Record<number, LayoutDelta> = {
    // التيجان الأساسية - ضبط مثالي للملامسة الطبيعية
    1: { yAdjustDelta: 0 }, // تاج 1 - مثالي بالفعل (لا يحتاج تعديل)
    2: { yAdjustDelta: -5 }, // تاج 2 - رفع من الأسفل (كان نازل جداً)
    3: { yAdjustDelta: -5 }, // تاج 3 - رفع ومحاذاة القوس مع الإطار
    4: { yAdjustDelta: -2 }, // تاج 4 - رفع قليلاً (ممتاز لكن يحتاج رفع طفيف)
    5: { yAdjustDelta: -2 }, // تاج 5 - ضبط القوس مع أعلى الصورة ورفع
    6: { yAdjustDelta: -2 }, // تاج 6 - رفع قليلاً
    7: { yAdjustDelta: -1 }, // تاج 7 - ممتاز لكن يحتاج تصحيح الميلان
    8: { yAdjustDelta: -2 }, // تاج 8 - رفع قليلاً (ممتاز لكن يحتاج رفع طفيف)
    9: { yAdjustDelta: 3 }, // تاج 9 - رفع من الأسفل (كان منخفض جداً)
    10: { yAdjustDelta: -2 }, // تاج 10 - تنزيل قليلاً (كان مرتفع جداً)
    11: { yAdjustDelta: 1 }, // تاج 11 - تقليل التداخل (كان متداخل كثيراً)
    12: { yAdjustDelta: 0 }, // تاج 12 - مثالي جداً (لا يحتاج تعديل)
    
    // التيجان المتقدمة - متوازنة ومحسّنة
    13: { yAdjustDelta: 1 }, 14: { yAdjustDelta: 1 }, 15: { yAdjustDelta: 1 },
    16: { yAdjustDelta: 0 }, 17: { yAdjustDelta: 2 }, 18: { yAdjustDelta: 0 },
    19: { yAdjustDelta: 1 }, 20: { yAdjustDelta: 1 }, 21: { yAdjustDelta: 1 },
    22: { yAdjustDelta: 0 }, 23: { yAdjustDelta: 1 }, 24: { yAdjustDelta: 0 },
    
    // التيجان النخبوية - ضبط دقيق للتيجان المتقدمة
    25: { yAdjustDelta: 2 }, 26: { yAdjustDelta: 1 }, 27: { yAdjustDelta: 1 },
    28: { yAdjustDelta: 0 }, 29: { yAdjustDelta: 2 }, 30: { yAdjustDelta: 0 },
    31: { yAdjustDelta: 1 }, 32: { yAdjustDelta: 1 }, 33: { yAdjustDelta: 0 },
    34: { yAdjustDelta: 1 }, 35: { yAdjustDelta: 1 }, 36: { yAdjustDelta: 0 },
    
    // التيجان الأسطورية - ضبط للتيجان الفخمة
    37: { yAdjustDelta: 2 }, 38: { yAdjustDelta: 1 }, 39: { yAdjustDelta: 1 },
    40: { yAdjustDelta: 0 }, 41: { yAdjustDelta: 2 }, 42: { yAdjustDelta: 1 },
    43: { yAdjustDelta: 1 }, 44: { yAdjustDelta: 0 }, 45: { yAdjustDelta: 2 },
    46: { yAdjustDelta: 0 }, 47: { yAdjustDelta: 1 }, 48: { yAdjustDelta: 1 },
    49: { yAdjustDelta: 0 }, 50: { yAdjustDelta: 3 }, // التاج الأعظم - ضبط خاص
  };
  
  // 🏠 إعدادات محسّنة للحاويات - ضبط مثالي للسياقات المختلفة
  const CONTAINER_DELTAS: Record<number, LayoutDelta> = {
    // ضبط دقيق للتيجان في سياق الحاويات (الدردشة، القوائم، إلخ)
    4: { yAdjustDelta: -1 }, // تاج فخم - رفع خفيف في الحاويات
    6: { yAdjustDelta: -1 }, // تاج إمبراطوري - رفع خفيف في الحاويات
    9: { yAdjustDelta: -1 }, // تاج راقي - رفع خفيف في الحاويات
    17: { yAdjustDelta: -1 }, // تاج متقدم - رفع خفيف في الحاويات
    25: { yAdjustDelta: -1 }, // تاج نخبوي - رفع خفيف في الحاويات
    29: { yAdjustDelta: -1 }, // تاج متقدم - رفع خفيف في الحاويات
    37: { yAdjustDelta: -1 }, // تاج أسطوري - رفع خفيف في الحاويات
    41: { yAdjustDelta: -1 }, // تاج الكون - رفع خفيف في الحاويات
    45: { yAdjustDelta: -1 }, // تاج عظيم - رفع خفيف في الحاويات
    50: { yAdjustDelta: -2 }, // التاج الأعظم - ضبط خاص للحاويات
  };

  const baseLayout = getTagLayout(tagNumber);
  const tagLayout = useMemo(() => {
    const deltas = (context === 'profile' ? PROFILE_DELTAS : CONTAINER_DELTAS)[tagNumber ?? -1] || {};
    
    // 🎯 حدود محسّنة للحفاظ على جمال التاج في كلا السياقين
    const widthRatioMin = 1.05; // حد أدنى معقول للحفاظ على وضوح التاج
    const widthRatioMax = 1.18; // حد أقصى لمنع التاج من أن يصبح كبيراً جداً
    
    // 📏 حساب النسب بدقة - نحافظ على النسبة الأساسية ونضيف التعديل البسيط فقط
    const widthRatio = Math.min(
      widthRatioMax,
      Math.max(widthRatioMin, (baseLayout.widthRatio || 1.1) + (deltas.widthRatioDelta || 0))
    );
    
    // 📐 حساب المواضع بدقة مع ضبط السياق
    const yAdjustPx = Math.round((baseLayout.yAdjustPx || 0) + (deltas.yAdjustDelta || 0));
    const xAdjustPx = Math.round((baseLayout.xAdjustPx || 0) + (deltas.xAdjustDelta || 0));
    const anchorY = Math.min(0.24, Math.max(0, (baseLayout.anchorY || 0) + (deltas.anchorDelta || 0)));
    
    return { ...baseLayout, widthRatio, yAdjustPx, xAdjustPx, anchorY } as const;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagNumber, context, baseLayout.widthRatio, baseLayout.yAdjustPx, baseLayout.xAdjustPx, baseLayout.anchorY]);

  // 👑 حساب حجم التاج المثالي - متوازن ومثالي للعرض الاحترافي
  const minCoverRatio = context === 'profile' ? 1.03 : 1.05; // حد أدنى متوازن
  const maxCoverRatio = context === 'profile' ? 1.15 : 1.16; // حد أقصى مثالي
  const targetRatio = tagLayout.widthRatio || 1.08; // نسبة افتراضية متوازنة
  const clampedRatio = Math.min(Math.max(targetRatio, minCoverRatio), maxCoverRatio);
  const frameIndex = (() => {
    if (!frameName) return undefined;
    const match = String(frameName).match(/(\d+)/);
    if (!match) return undefined;
    const n = parseInt(match[1], 10);
    if (!Number.isFinite(n) || n <= 0) return undefined; // تجاهل 0 أو قيم غير صالحة
    return Math.min(10, n) as any;
  })();

  if (!disableFrame && frameName && frameIndex) {
    // مقاسات دقيقة لتطابق الموقع الآخر - مُصغرة بحوالي 10%
    const px = pixelSize ?? (size === 'small' ? 36 : size === 'large' ? 72 : 56);
    // الحاوية يجب أن تكون أكبر لاستيعاب الإطار (نفس النسبة المستخدمة في VipAvatar)
    const containerSize = px * 1.35;
    const imageTopWithinContainer = (containerSize - px) / 2; // موضع أعلى الصورة داخل الحاوية
    // إزاحة عمودية بسيطة لإطارات محددة التي تبدو مرتفعة قليلاً في البروفايل فقط
    const frameDownshift = (frameIndex === 7 || frameIndex === 8 || frameIndex === 9) ? Math.round(px * 0.02) : 0;
    const overlayTopPx = imageTopWithinContainer + frameDownshift; // مرجع أعلى الصورة داخل الحاوية مع ضبط بسيط
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
            // نضرب basePx بالنسبة المضبوطة ثم نمرر الناتج ليستخدمه المكون الفرعي كما هو
            basePx={Math.round(px * clampedRatio)}
            anchorY={tagLayout.anchorY}
            yAdjustPx={tagLayout.yAdjustPx}
            xAdjustPx={tagLayout.xAdjustPx}
            autoAnchor={tagLayout.autoAnchor}
            maxIntrusionPx={Math.round(px * (context === 'profile' ? 0.04 : 0.06))}
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
            basePx={Math.round(px * clampedRatio)}
            anchorY={tagLayout.anchorY}
            yAdjustPx={tagLayout.yAdjustPx}
            xAdjustPx={tagLayout.xAdjustPx}
            autoAnchor={tagLayout.autoAnchor}
            maxIntrusionPx={Math.round(px * (context === 'profile' ? 0.04 : 0.06))}
          />
        )}
      </div>
    );
  }
}

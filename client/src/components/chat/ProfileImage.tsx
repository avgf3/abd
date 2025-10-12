import { useEffect, useMemo, useRef, useState } from 'react';

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
}

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

  const tagLayout = getTagLayout(tagNumber);

  function TagOverlay({
    src,
    overlayTopPx,
    basePx,
  }: {
    src: string;
    overlayTopPx: number;
    basePx: number;
  }) {
    const imgRef = useRef<HTMLImageElement | null>(null);
    const [anchorOffsetPx, setAnchorOffsetPx] = useState<number>(tagLayout.yAdjustPx || 0);
    const [ready, setReady] = useState<boolean>(false);
    // ثبات تغطية التاج كرأس/طوق أعلى الصورة على كل الأحجام
    const minCoverRatio = 1.06;
    const maxCoverRatio = 1.18;
    const targetRatio = tagLayout.widthRatio || minCoverRatio;
    const clampedRatio = Math.min(Math.max(targetRatio, minCoverRatio), maxCoverRatio);
    const overlayWidthPx = Math.round(basePx * clampedRatio);

    useEffect(() => {
      const el = imgRef.current;
      if (!el) return;
      let cancelled = false;

      const compute = () => {
        if (!el.naturalWidth || !el.naturalHeight) return;
        const scale = overlayWidthPx / el.naturalWidth;
        const tagRenderedHeight = el.naturalHeight * scale;

        let bottomGapPx = 0;
        if (tagLayout.autoAnchor) {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = el.naturalWidth;
            canvas.height = el.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(el, 0, 0);
              const alphaThreshold = 12; // ~5% opacity
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

        // الحساب الاحترافي الجديد:
        // 1. tagRenderedHeight = الارتفاع الكامل للتاج بعد التكبير
        // 2. bottomGapPx = الشفافية في الأسفل (يجب إزالتها)
        // 3. anchorY = نسبة من الارتفاع المرئي تدخل في الصورة (0 = يلامس، 0.2 = 20% يدخل)
        // 4. yAdjustPx = ضبط يدوي نهائي (موجب = ينزل، سالب = يرتفع)
        
        // الارتفاع المرئي للتاج (بدون الشفافية السفلية)
        const tagVisibleHeight = tagRenderedHeight - bottomGapPx;
        
        // مقدار الدخول المطلوب في الصورة (نسبة من الارتفاع المرئي)
        const anchorDepth = Math.max(0, Math.min(1, tagLayout.anchorY ?? 0)) * tagVisibleHeight;
        
        // المعادلة النهائية البسيطة:
        // - نبدأ من الارتفاع المرئي (tagVisibleHeight)
        // - نطرح مقدار الدخول (anchorDepth) لو أردنا أن يدخل
        // - نضيف الضبط اليدوي (yAdjustPx)
        const totalOffset = Math.max(0, tagVisibleHeight - anchorDepth + (tagLayout.yAdjustPx || 0));

        if (!cancelled) {
          setAnchorOffsetPx(Math.round(totalOffset));
          setReady(true);
        }
      };

      if (el.complete) compute();
      el.addEventListener('load', compute);
      return () => {
        cancelled = true;
        el.removeEventListener('load', compute);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [src, overlayWidthPx, tagLayout.anchorY, tagLayout.autoAnchor, tagLayout.yAdjustPx]);

    return (
      <img
        ref={imgRef}
        src={src}
        alt="tag"
        className="profile-tag-overlay"
        aria-hidden="true"
        style={{
          top: overlayTopPx,
          width: overlayWidthPx,
          transform: `translate(-50%, calc(-100% + ${anchorOffsetPx}px))`,
          marginLeft: tagLayout.xAdjustPx || 0,
          backgroundColor: 'transparent',
          background: 'transparent',
          visibility: ready ? 'visible' : 'hidden',
          willChange: 'transform',
          transformOrigin: '50% 100%',
        }}
        decoding="async"
        loading="lazy"
        onError={(e: any) => { try { e.currentTarget.style.display = 'none'; } catch {} }}
      />
    );
  }
  const frameIndex = (() => {
    if (!frameName) return undefined;
    const match = String(frameName).match(/(\d+)/);
    if (match) {
      const n = parseInt(match[1]);
      if (Number.isFinite(n)) return (Math.max(1, Math.min(10, n)) as any);
    }
    return undefined;
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
        style={{ width: containerSize, height: containerSize, contain: 'layout paint style', isolation: 'isolate' }}
      >
        <VipAvatar src={imageSrc} alt={`صورة ${user.username}`} size={px} frame={frameIndex as any} />
        {tagSrc && (
          <TagOverlay src={tagSrc} overlayTopPx={overlayTopPx} basePx={px} />
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
        style={{ width: containerSize, height: containerSize, contain: 'layout paint style', isolation: 'isolate' }}
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
          <TagOverlay src={tagSrc} overlayTopPx={overlayTopPx} basePx={px} />
        )}
      </div>
    );
  }
}

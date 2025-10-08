/* @jsxRuntime classic */
/* @jsx React.createElement */
import React, { useMemo } from 'react';

interface VipAvatarProps {
  src: string;
  alt?: string;
  size?: number; // pixels
  frame?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  className?: string;
}

export default function VipAvatar({
  src,
  alt = '',
  size = 48,
  frame = 1,
  className = '',
}: VipAvatarProps) {
  // تعطيل الحركة نهائياً (المطلوب نسخة ثابتة)
  const duration = useMemo(() => '0s', []);

  // الصورة تحتفظ بحجمها الأصلي المطلوب
  const imageSize = size;
  // الإطار (الحاوية) يتكيف ليكون أكبر من الصورة بنسبة كافية لاستيعاب الإطار بالكامل
  const frameSize = imageSize * 1.35; // الإطار أكبر بـ 35% لضمان احتواء الإطار بالكامل داخل الحاوية

  // تكبير خاص لإطارات 7 و8 و9 فقط كي تطابق حجم بقية الإطارات
  const overlayScale = useMemo(() => {
    // تصغير بسيط لإطارات 1 و4 لضبط بروز الصورة
    if (frame === 1 || frame === 4) return 0.98;
    // تكبير إضافي طفيف لإطارات 7 و8 و9 لمطابقة بقية الإطارات
    if (frame === 7 || frame === 8 || frame === 9) return 1.12;
    return 1;
  }, [frame]);

  const containerStyle: React.CSSProperties & { ['--vip-spin-duration']?: string } = {
    width: frameSize,
    height: frameSize,
    // تمرير مدة الدوران عبر متغير CSS
    ['--vip-spin-duration']: duration,
  };

  const imgStyle: React.CSSProperties = {
    width: imageSize,
    height: imageSize,
  };

  // Use image-based overlay for frames 1..9 if available
  const frameImage = frame >= 1 && frame <= 9 ? `/frames/frame${frame}.webp` : undefined;
  const hasImageOverlay = Boolean(frameImage);

  return (
    <div className={`vip-frame base ${hasImageOverlay ? 'with-image' : ''} ${`vip-frame-${frame}`} ${className}`} style={containerStyle}>
      <div className="vip-frame-inner">
        <img src={src} alt={alt} className="vip-frame-img" style={imgStyle} />
        {hasImageOverlay && (
          <img
            src={frameImage}
            alt="frame"
            className="vip-frame-overlay"
            style={{ transform: overlayScale === 1 ? 'scale(1)' : `scale(${overlayScale})` }}
          />
        )}
      </div>
    </div>
  );
}

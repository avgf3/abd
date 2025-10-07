import React, { useMemo } from 'react';

interface VipAvatarProps {
  src: string;
  alt?: string;
  size?: number; // pixels
  frame?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21;
  className?: string;
}

export default function VipAvatar({
  src,
  alt = '',
  size = 48,
  frame = 1,
  className = '',
}: VipAvatarProps) {
  // الصورة تحتفظ بحجمها الأصلي المطلوب
  const imageSize = size;
  // الإطار (الحاوية) يتكيف ليكون أكبر من الصورة بنسبة كافية لاستيعاب الإطار بالكامل
  const frameSize = imageSize * 1.4; // الإطار أكبر بـ 40% لضمان احتواء التأثيرات

  // تحديد نوع التأثير حسب رقم الإطار
  const getFrameEffect = (frameNum: number) => {
    const effects = [
      'epic-glow',      // 1: توهج ذهبي خرافي
      'plasma-pulse',   // 2: نبض بلازما
      'cosmic-ring',    // 3: حلقة كونية
      'fire-aura',      // 4: هالة نارية
      'ice-crystal',    // 5: بلورة جليدية
      'electric-storm', // 6: عاصفة كهربائية
      'shadow-void',    // 7: فراغ الظلال
      'rainbow-prism',  // 8: منشور قوس قزح
      'quantum-field',  // 9: حقل كمي
      'stellar-nova',   // 10: نجم متفجر
      'mystic-runes',   // 11: رونات سحرية
      'dragon-breath',  // 12: نفس التنين
      'angel-wings',    // 13: أجنحة الملاك
      'demon-eyes',     // 14: عيون الشيطان
      'galaxy-spiral',  // 15: دوامة المجرة
      'phoenix-flame',  // 16: لهب العنقاء
      'void-portal',    // 17: بوابة الفراغ
      'crystal-matrix', // 18: مصفوفة البلور
      'time-warp',      // 19: انحناء الزمن
      'soul-energy',    // 20: طاقة الروح
      'divine-light'    // 21: النور الإلهي
    ];
    return effects[frameNum - 1] || 'epic-glow';
  };

  const frameEffect = getFrameEffect(frame);

  const containerStyle: React.CSSProperties = {
    width: frameSize,
    height: frameSize,
    '--frame-size': `${frameSize}px`,
    '--image-size': `${imageSize}px`,
  } as React.CSSProperties;

  const imgStyle: React.CSSProperties = {
    width: imageSize,
    height: imageSize,
  };

  // استخدام الإطارات المتحركة الجديدة (بدون خلفيات)
  const frameImage = frame >= 1 && frame <= 21 ? `/frames/frame${frame}.webp` : undefined;
  const hasImageOverlay = Boolean(frameImage);

  return (
    <div 
      className={`vip-frame-modern ${frameEffect} ${hasImageOverlay ? 'with-image' : ''} ${className}`} 
      style={containerStyle}
    >
      {/* طبقة التأثيرات الخلفية */}
      <div className="frame-effects-bg"></div>
      
      {/* طبقة الجسيمات */}
      <div className="frame-particles">
        <div className="particle particle-1"></div>
        <div className="particle particle-2"></div>
        <div className="particle particle-3"></div>
        <div className="particle particle-4"></div>
      </div>
      
      {/* الحاوية الرئيسية */}
      <div className="vip-frame-inner">
        {/* الصورة الشخصية */}
        <img src={src} alt={alt} className="vip-frame-img" style={imgStyle} />
        
        {/* إطار الصورة (بدون خلفية) */}
        {hasImageOverlay && (
          <img 
            src={frameImage} 
            alt="frame" 
            className="vip-frame-overlay"
            style={{ mixBlendMode: 'multiply' }} // لإزالة الخلفيات البيضاء
          />
        )}
        
        {/* طبقة التوهج الأمامية */}
        <div className="frame-glow-overlay"></div>
      </div>
      
      {/* حلقات التأثير الخارجية */}
      <div className="frame-outer-rings">
        <div className="outer-ring ring-1"></div>
        <div className="outer-ring ring-2"></div>
        <div className="outer-ring ring-3"></div>
      </div>
    </div>
  );
}

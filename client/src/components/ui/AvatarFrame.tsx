/**
 * مكون إطار الصورة الشخصية
 * تصميم نظيف وأداء محسّن مع دعم كامل للأحجام المختلفة
 */

import React, { useMemo, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { FrameType, FrameDisplayConfig } from '@/types/avatarFrame';
import { getFrameInfo } from '@/data/frames';
import {
  calculateFrameDimensions,
  getContainerStyles,
  getImageStyles,
  getFrameStyles,
  getEffectStyles,
  getFramePath
} from '@/utils/frameCalculations';

interface AvatarFrameProps {
  // URL الصورة
  src?: string;
  // النص البديل
  alt?: string;
  // النص الاحتياطي (أول حرفين من الاسم)
  fallback?: string;
  // نوع الإطار
  frame?: FrameType;
  // حجم الصورة بالبكسل
  size?: number;
  // نوع العرض
  variant?: FrameDisplayConfig['variant'];
  // تفعيل التأثيرات
  animate?: boolean;
  glow?: boolean;
  // كلاسات إضافية
  className?: string;
  // دالة عند النقر
  onClick?: () => void;
}

const AvatarFrame: React.FC<AvatarFrameProps> = ({
  src,
  alt = '',
  fallback = '??',
  frame = 'none',
  size = 40,
  variant = 'list',
  animate = false,
  glow = false,
  className,
  onClick
}) => {
  const [imageError, setImageError] = useState(false);
  const [frameError, setFrameError] = useState(false);
  
  // الحصول على معلومات الإطار
  const frameInfo = useMemo(() => getFrameInfo(frame), [frame]);
  
  // حساب الأبعاد
  const calculations = useMemo(() => {
    const config: FrameDisplayConfig = {
      avatarSize: size,
      variant,
      animate,
      glow
    };
    return calculateFrameDimensions(frameInfo, config);
  }, [frameInfo, size, variant, animate, glow]);
  
  // أنماط CSS
  const containerStyles = useMemo(() => getContainerStyles(calculations), [calculations]);
  const imageStyles = useMemo(() => getImageStyles(calculations), [calculations]);
  const frameStyles = useMemo(() => getFrameStyles(calculations), [calculations]);
  const effectStyles = useMemo(() => 
    getEffectStyles(frameInfo, { avatarSize: size, variant, animate, glow }), 
    [frameInfo, size, variant, animate, glow]
  );
  
  // معالجة أخطاء الصور
  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);
  
  const handleFrameError = useCallback(() => {
    setFrameError(true);
    console.warn(`فشل تحميل الإطار: ${frame}`);
  }, [frame]);
  
  // مسار الإطار
  const framePath = useMemo(() => {
    if (frame === 'none' || !frameInfo.fileName || frameError) return null;
    return getFramePath(frameInfo.fileName);
  }, [frame, frameInfo.fileName, frameError]);
  
  // عرض الصورة أو البديل
  const renderAvatar = () => {
    if (!src || imageError) {
      // عرض الأحرف الاحتياطية
      return (
        <div
          className={cn(
            "flex items-center justify-center w-full h-full",
            "bg-gradient-to-br from-gray-400 to-gray-600",
            "text-white font-semibold"
          )}
          style={{
            borderRadius: calculations.borderRadius,
            fontSize: `${calculations.imageSize * 0.4}px`
          }}
        >
          {fallback}
        </div>
      );
    }
    
    return (
      <img
        src={src}
        alt={alt}
        onError={handleImageError}
        className="w-full h-full object-cover"
        style={imageStyles}
        draggable={false}
      />
    );
  };
  
  return (
    <div
      className={cn(
        "avatar-frame-container",
        onClick && "cursor-pointer hover:opacity-90 transition-opacity",
        className
      )}
      style={containerStyles}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* الصورة الشخصية */}
      <div className="avatar-image-wrapper" style={{ position: 'relative', zIndex: 1 }}>
        {renderAvatar()}
      </div>
      
      {/* الإطار */}
      {framePath && (
        <img
          src={framePath}
          alt="Frame"
          onError={handleFrameError}
          className={cn(
            "avatar-frame",
            animate && "animate-pulse"
          )}
          style={{
            ...frameStyles,
            ...effectStyles
          }}
          draggable={false}
        />
      )}
      
      {/* مؤشر الاتصال (اختياري) */}
      {variant === 'list' && (
        <div
          className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"
          style={{ zIndex: 3 }}
        />
      )}
    </div>
  );
};

// تصدير مع React.memo للأداء الأفضل
export default React.memo(AvatarFrame);

// تصدير أنماط CSS للاستخدام العام
export const avatarFrameStyles = `
  @keyframes frame-pulse {
    0%, 100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.05);
      opacity: 0.8;
    }
  }
  
  .avatar-frame-container {
    user-select: none;
    -webkit-user-select: none;
  }
  
  .avatar-frame {
    image-rendering: crisp-edges;
    image-rendering: -webkit-optimize-contrast;
  }
`;
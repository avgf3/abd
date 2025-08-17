import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { cn } from '../../lib/utils';

interface AvatarWithFrameProps {
  src?: string;
  alt?: string;
  fallback?: string;
  frame?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
}

const frameSizes = {
  sm: { avatar: 'h-8 w-8', frame: 'h-12 w-12' },
  md: { avatar: 'h-10 w-10', frame: 'h-14 w-14' },
  lg: { avatar: 'h-12 w-12', frame: 'h-16 w-16' },
  xl: { avatar: 'h-16 w-16', frame: 'h-20 w-20' }
};

export function AvatarWithFrame({ 
  src, 
  alt, 
  fallback, 
  frame = 'none', 
  size = 'md',
  className,
  onClick 
}: AvatarWithFrameProps) {
  const sizes = frameSizes[size];

  return (
    <div 
      className={cn('relative inline-flex items-center justify-center', sizes.frame, className)}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {frame && frame !== 'none' && (
        <img 
          src={`/${frame}.svg`} 
          alt="Avatar Frame"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />
      )}

      <Avatar className={cn(sizes.avatar, 'z-10')}>
        <AvatarImage src={src} alt={alt} />
        <AvatarFallback>{fallback}</AvatarFallback>
      </Avatar>
    </div>
  );
}

// قائمة الإطارات المتاحة مع أسمائها بالعربية
export const availableFrames = [
  { id: 'none', name: 'بدون إطار', category: 'عام' },
  
  // إطارات التاج TOP
  { id: 'enhanced-crown-frame', name: 'تاج ذهبي TOP', category: 'تاج TOP' },
  { id: 'crown-frame-silver', name: 'تاج فضي TOP', category: 'تاج TOP' },
  { id: 'crown-frame-rosegold', name: 'تاج ذهبي وردي TOP', category: 'تاج TOP' },
  { id: 'crown-frame-blue', name: 'تاج أزرق TOP', category: 'تاج TOP' },
  { id: 'crown-frame-emerald', name: 'تاج زمردي TOP', category: 'تاج TOP' },
  { id: 'crown-frame-purple', name: 'تاج بنفسجي TOP', category: 'تاج TOP' },
  
  // إطارات الأجنحة VIP
  { id: 'enhanced-wings-frame', name: 'أجنحة ذهبية VIP', category: 'أجنحة VIP' },
  { id: 'wings-frame-silver', name: 'أجنحة فضية VIP', category: 'أجنحة VIP' },
  { id: 'wings-frame-royalblue', name: 'أجنحة زرقاء ملكية VIP', category: 'أجنحة VIP' },
  { id: 'wings-frame-ruby', name: 'أجنحة ياقوتية VIP', category: 'أجنحة VIP' },
  { id: 'wings-frame-turquoise', name: 'أجنحة فيروزية VIP', category: 'أجنحة VIP' },
  { id: 'wings-frame-violet', name: 'أجنحة بنفسجية VIP', category: 'أجنحة VIP' },
  
  // إطارات خاصة
  { id: 'wings-frame-king', name: 'أجنحة الملك KING', category: 'خاص' },
  { id: 'wings-frame-queen', name: 'أجنحة الملكة QUEEN', category: 'خاص' },
  { id: 'crown-frame-classic-gold', name: 'تاج كلاسيكي ذهبي', category: 'كلاسيك' },
  { id: 'crown-frame-classic-coolpink', name: 'تاج كلاسيكي وردي', category: 'كلاسيك' },
  
  // إطارات SVIP
  { id: 'svip1-frame-gold', name: 'SVIP1 ذهبي', category: 'SVIP' },
  { id: 'svip1-frame-pink', name: 'SVIP1 وردي', category: 'SVIP' },
  { id: 'svip2-frame-gold', name: 'SVIP2 ذهبي', category: 'SVIP' },
  { id: 'svip2-frame-pink', name: 'SVIP2 وردي', category: 'SVIP' }
];

// دالة مساعدة للحصول على معلومات الإطار
export function getFrameInfo(frameId: string) {
  return availableFrames.find(f => f.id === frameId) || availableFrames[0];
}
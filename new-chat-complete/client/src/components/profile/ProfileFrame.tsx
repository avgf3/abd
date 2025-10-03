import { motion } from 'framer-motion';
import { Crown } from 'lucide-react';
import './ProfileFrame.css';

interface ProfileFrameProps {
  level: number;
  frameType?: string;
  children: React.ReactNode;
  size?: 'tiny' | 'small' | 'medium' | 'large' | 'xlarge';
  showBadge?: boolean;
  className?: string;
}

export default function ProfileFrame({ 
  level, 
  frameType,
  children, 
  size = 'medium',
  showBadge = true,
  className = ''
}: ProfileFrameProps) {
  
  // تحديد نوع الإطار تلقائياً من المستوى إذا لم يُحدد
  const getFrameType = (level: number, customType?: string): string => {
    if (customType) return customType;
    
    if (level >= 100) return 'legendary';
    if (level >= 50) return 'diamond';
    if (level >= 30) return 'gold';
    if (level >= 15) return 'silver';
    return 'bronze';
  };

  const resolvedFrameType = getFrameType(level, frameType);
  
  // أحجام مختلفة
  const sizeClasses = {
    tiny: 'w-8 h-8',
    small: 'w-12 h-12',
    medium: 'w-20 h-20',
    large: 'w-32 h-32',
    xlarge: 'w-48 h-48'
  };

  const badgeSizes = {
    tiny: 'w-4 h-4 text-[8px]',
    small: 'w-5 h-5 text-[9px]',
    medium: 'w-6 h-6 text-[10px]',
    large: 'w-8 h-8 text-xs',
    xlarge: 'w-10 h-10 text-sm'
  };

  const isSpecialFrame = resolvedFrameType.startsWith('special_');

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      {/* الصورة الأساسية */}
      <div className="relative w-full h-full rounded-full overflow-hidden z-10">
        {children}
      </div>
      
      {/* الإطار المتحرك */}
      {resolvedFrameType !== 'bronze' && (
        <motion.div
          className={`absolute inset-0 rounded-full frame-border frame-border-${resolvedFrameType} pointer-events-none`}
          animate={
            resolvedFrameType === 'legendary' || isSpecialFrame
              ? { rotate: 360 }
              : {}
          }
          transition={
            resolvedFrameType === 'legendary' || isSpecialFrame
              ? { duration: 10, repeat: Infinity, ease: "linear" }
              : {}
          }
          style={{ zIndex: 20 }}
        />
      )}
      
      {/* الوهج الخارجي */}
      {resolvedFrameType !== 'bronze' && (
        <div 
          className={`absolute inset-0 rounded-full frame-glow frame-glow-${resolvedFrameType} pointer-events-none`}
          style={{ zIndex: 15 }}
        />
      )}
      
      {/* شارة المستوى */}
      {showBadge && level > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className={`absolute -bottom-1 -right-1 ${badgeSizes[size]} rounded-full flex items-center justify-center font-bold border-2 border-gray-900 frame-badge frame-badge-${resolvedFrameType} shadow-lg`}
          style={{ zIndex: 30 }}
        >
          {level >= 100 ? (
            <Crown className="w-full h-full p-0.5" />
          ) : (
            <span>{level}</span>
          )}
        </motion.div>
      )}
      
      {/* تأثيرات خاصة للإطارات المميزة */}
      {isSpecialFrame && (
        <div className={`absolute inset-0 special-effect special-effect-${resolvedFrameType} pointer-events-none`} style={{ zIndex: 25 }} />
      )}
    </div>
  );
}

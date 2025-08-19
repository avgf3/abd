/**
 * مكون الصورة الشخصية في الملف الشخصي
 * مع دعم كامل للإطارات بحجم كبير
 */

import React, { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { ChatUser } from '@/types/chat';
import type { FrameType } from '@/types/avatarFrame';
import AvatarFrame from '@/components/ui/AvatarFrame';
import { Button } from '@/components/ui/button';
import { Camera } from 'lucide-react';
import { getImageSrc } from '@/utils/imageUtils';

interface ProfileAvatarProps {
  user: ChatUser;
  isOwnProfile?: boolean;
  onImageChange?: (file: File) => Promise<void>;
  className?: string;
}

const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  user,
  isOwnProfile = false,
  onImageChange,
  className
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // استخراج معلومات الصورة والإطار
  const avatarSrc = getImageSrc(user.profileImage, '/default_avatar.svg');
  const frameType = (user.avatarFrame || 'none') as FrameType;
  
  // معالجة تغيير الصورة
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !onImageChange) return;
    
    // التحقق من نوع الملف
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('يرجى اختيار صورة من نوع JPG, PNG, GIF أو WebP');
      return;
    }
    
    // التحقق من حجم الملف (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
      return;
    }
    
    try {
      setIsUploading(true);
      await onImageChange(file);
    } catch (error) {
      console.error('خطأ في رفع الصورة:', error);
      alert('فشل رفع الصورة. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsUploading(false);
      // إعادة تعيين قيمة الإدخال
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };
  
  return (
    <div className={cn('profile-avatar-container relative', className)}>
      {/* الصورة مع الإطار */}
      <div className="relative inline-block">
        <AvatarFrame
          src={avatarSrc}
          alt={user.username}
          fallback={user.username.substring(0, 2).toUpperCase()}
          frame={frameType}
          size={120}
          variant="profile"
          glow={true}
          animate={user.userType === 'owner' || user.userType === 'admin'}
          className={cn(
            'shadow-xl',
            isUploading && 'opacity-50'
          )}
        />
        
        {/* زر تغيير الصورة */}
        {isOwnProfile && onImageChange && (
          <Button
            onClick={handleCameraClick}
            disabled={isUploading}
            size="sm"
            className={cn(
              'absolute bottom-0 right-0',
              'w-10 h-10 rounded-full',
              'bg-primary hover:bg-primary/90',
              'shadow-lg',
              'p-0',
              'transition-all duration-200',
              isUploading && 'animate-pulse'
            )}
            title="تغيير الصورة الشخصية"
          >
            <Camera className="w-5 h-5" />
          </Button>
        )}
      </div>
      
      {/* إدخال الملف المخفي */}
      {isOwnProfile && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />
      )}
      
      {/* مؤشر التحميل */}
      {isUploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full">
          <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      
      {/* معلومات الإطار (للعرض فقط) */}
      {frameType !== 'none' && (
        <div className="mt-2 text-center">
          <span className="text-xs text-muted-foreground">
            إطار: {getFrameDisplayName(frameType)}
          </span>
        </div>
      )}
    </div>
  );
};

// دالة مساعدة للحصول على اسم الإطار للعرض
function getFrameDisplayName(frameType: FrameType): string {
  const frameNames: Record<FrameType, string> = {
    'none': 'بدون إطار',
    'crown-gold': 'تاج ذهبي',
    'crown-silver': 'تاج فضي',
    'crown-rosegold': 'تاج ذهبي وردي',
    'crown-blue': 'تاج أزرق',
    'crown-emerald': 'تاج زمردي',
    'crown-purple': 'تاج بنفسجي',
    'crown-classic-gold': 'تاج كلاسيكي ذهبي',
    'crown-classic-pink': 'تاج كلاسيكي وردي',
    'svip1-gold': 'SVIP1 ذهبي',
    'svip1-pink': 'SVIP1 وردي',
    'svip2-gold': 'SVIP2 ذهبي',
    'svip2-pink': 'SVIP2 وردي',
    'wings-king': 'أجنحة الملك',
    'wings-queen': 'أجنحة الملكة'
  };
  
  return frameNames[frameType] || frameType;
}

export default React.memo(ProfileAvatar);
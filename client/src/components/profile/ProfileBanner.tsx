import { Camera, Upload, X } from 'lucide-react';
import { useState, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/queryClient';
import { validateFile, formatFileSize } from '@/lib/uploadConfig';
import type { ChatUser } from '@/types/chat';
import { getBannerImageSrc } from '@/utils/imageUtils';

interface ProfileBannerProps {
  currentUser: ChatUser | null;
  onBannerUpdate?: (bannerUrl: string) => void;
}

export default function ProfileBanner({ currentUser, onBannerUpdate }: ProfileBannerProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // استخدام دالة التحقق الموحدة من uploadConfig

  // تحديث صورة البانر في الواجهة مباشرة بعد رفعها
  const handleFileSelect = async (file: File) => {
    if (!currentUser) {
      toast({
        title: 'خطأ',
        description: 'يجب تسجيل الدخول أولاً',
        variant: 'destructive',
      });
      return;
    }
    // السماح برفع البانر فقط للمشرفين أو للمستوى 20+
    const isModerator = ['owner', 'admin', 'moderator'].includes(currentUser.userType);
    const lvl = Number(currentUser.level || 1);
    if (!isModerator && lvl < 20) {
      toast({ title: 'غير مسموح', description: 'الغلاف للمشرفين أو للمستوى 20 فما فوق', variant: 'destructive' });
      return;
    }

    const validation = validateFile(file, 'profile_banner');
    if (!validation.isValid) {
      toast({
        title: 'خطأ',
        description: validation.error || 'الملف غير صحيح',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      // إنشاء معاينة للصورة
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // رفع الصورة للخادم
      const formData = new FormData();
      formData.append('banner', file);
      formData.append('userId', currentUser.id.toString());

      // رفع الصورة
      const result = await api.upload('/api/upload/profile-banner', formData);

      if (!result.success) {
        throw new Error(result.error || 'فشل في رفع صورة البانر');
      }

      // تحديث الصورة مباشرة في الواجهة وفق الرابط القادم من الخادم
      if (onBannerUpdate && result.bannerUrl) {
        onBannerUpdate(result.bannerUrl);
      }
      setPreview(null);
      toast({
        title: 'تم بنجاح',
        description: 'تم تحديث صورة البانر',
        variant: 'default',
      });
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message || 'فشل في رفع صورة البانر، يرجى المحاولة مرة أخرى',
        variant: 'destructive',
      });
      setPreview(null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const removePreview = () => {
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <div className="relative">
      {/* صورة البروفايل البانر */}
      <div className="relative h-48 sm:h-56 md:h-64 rounded-2xl overflow-hidden banner-gradient-animation shadow-2xl border border-white/20 backdrop-blur-sm">
        {/* طبقة تحسين التباين للنص */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none z-10"></div>
        {preview ? (
          <img 
            src={preview} 
            alt="معاينة صورة البانر" 
            className="w-full h-full object-cover object-center transition-opacity duration-300" 
            style={{
              minHeight: '100%',
              minWidth: '100%'
            }}
          />
        ) : currentUser?.profileBanner && currentUser.profileBanner !== '' ? (
          <>
            <img
              src={getBannerImageSrc(currentUser.profileBanner)}
              alt="صورة البانر"
              className={`w-full h-full object-cover object-center transition-opacity duration-500 ${
                imageLoaded ? 'banner-image-loaded' : 'banner-image-loading'
              }`}
              style={{
                minHeight: '100%',
                minWidth: '100%'
              }}
              loading="lazy"
              decoding="async"
              onLoad={() => setImageLoaded(true)}
              onError={(e) => {
                // في حالة فشل تحميل الصورة، نخفيها ونظهر الخلفية الافتراضية
                e.currentTarget.style.display = 'none';
                setImageLoaded(false);
              }}
            />
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white relative">
            <div className="text-center relative z-10">
              <div className="text-6xl mb-4 filter drop-shadow-lg">🎨</div>
              <p className="text-xl font-bold opacity-95 drop-shadow-md mb-2">اجعل ملفك مميزاً</p>
              <p className="text-sm opacity-80 mb-1">أضف صورة غلاف احترافية</p>
              <p className="text-xs opacity-60">للمشرفين والمستوى 20+</p>
            </div>
          </div>
        )}

        {/* زر إزالة المعاينة */}
        {preview && (
          <button
            onClick={removePreview}
            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors z-20 shadow-lg"
          >
            <X size={16} />
          </button>
        )}

        {/* أزرار التحكم */}
        <div className="absolute bottom-3 right-3 flex gap-3 z-20">
          {/* زر الكاميرا */}
          {(() => {
            const isModerator = !!currentUser && ['owner', 'admin', 'moderator'].includes(currentUser.userType);
            const lvl = Number(currentUser?.level || 1);
            const canUploadBanner = isModerator || lvl >= 20;
            return canUploadBanner ? (
              <Button
                onClick={() => cameraInputRef.current?.click()}
                disabled={uploading}
                size="sm"
                className="bg-white/25 backdrop-blur-md hover:bg-white/40 text-white border border-white/40 rounded-full w-11 h-11 p-0 shadow-xl transition-all duration-300 hover:scale-110 hover:shadow-2xl"
              >
                <Camera size={16} />
              </Button>
            ) : null;
          })()}

          {/* زر رفع الملف */}
          {(() => {
            const isModerator = !!currentUser && ['owner', 'admin', 'moderator'].includes(currentUser.userType);
            const lvl = Number(currentUser?.level || 1);
            const canUploadBanner = isModerator || lvl >= 20;
            return canUploadBanner ? (
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                size="sm"
                className="bg-white/25 backdrop-blur-md hover:bg-white/40 text-white border border-white/40 rounded-full w-11 h-11 p-0 shadow-xl transition-all duration-300 hover:scale-110 hover:shadow-2xl"
              >
                <Upload size={16} />
              </Button>
            ) : null;
          })()}
        </div>
      </div>

      {/* حقول الإدخال المخفية */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml"
        capture="user"
        onChange={handleCameraCapture}
        className="hidden"
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml"
        onChange={handleFileUpload}
        className="hidden"
      />

      {uploading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
          <div className="bg-white/90 backdrop-blur-md rounded-lg p-4 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-700 font-medium">جاري رفع صورة البانر...</span>
          </div>
        </div>
      )}
    </div>
  );
}

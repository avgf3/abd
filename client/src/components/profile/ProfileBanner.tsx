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
      <div className="relative h-48 sm:h-56 md:h-64 rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 shadow-2xl border border-white/20 backdrop-blur-sm">
        {preview ? (
          <img src={preview} alt="معاينة صورة البانر" className="w-full h-full object-cover object-center" />
        ) : currentUser?.profileBanner && currentUser.profileBanner !== '' ? (
          <img
            src={getBannerImageSrc(currentUser.profileBanner)}
            alt="صورة البانر"
            className="w-full h-full object-cover object-center"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/80 via-purple-600/80 to-pink-500/80 animate-gradient-x"></div>
            <div className="absolute inset-0 bg-gradient-to-tr from-purple-400/20 via-pink-400/20 to-blue-400/20"></div>
            <div className="text-center relative z-10">
              <div className="text-5xl mb-3 filter drop-shadow-lg animate-pulse">📸</div>
              <p className="text-lg font-medium opacity-90 drop-shadow-md">إضافة صورة بانر</p>
              <p className="text-sm opacity-70 mt-1">اضغط على الكاميرا أو الرفع</p>
            </div>
            <div className="absolute inset-0 bg-black/5"></div>
          </div>
        )}

        {/* زر إزالة المعاينة */}
        {preview && (
          <button
            onClick={removePreview}
            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
          >
            <X size={16} />
          </button>
        )}

        {/* أزرار التحكم */}
        <div className="absolute bottom-3 right-3 flex gap-3">
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
                className="bg-white/20 backdrop-blur-md hover:bg-white/30 text-white border border-white/30 rounded-full w-10 h-10 p-0 shadow-lg transition-all duration-200 hover:scale-110"
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
                className="bg-white/20 backdrop-blur-md hover:bg-white/30 text-white border border-white/30 rounded-full w-10 h-10 p-0 shadow-lg transition-all duration-200 hover:scale-110"
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

import { Camera, Upload, X, Move, Check } from 'lucide-react';
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
  
  // حالات جديدة للتحكم بموضع الصورة
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [imagePosition, setImagePosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);

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
        setIsAdjusting(false); // عرض المعاينة بدون تعديل في البداية
        setImagePosition({ x: 50, y: 50 }); // إعادة تعيين الموضع
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
    setIsAdjusting(false);
    setImagePosition({ x: 50, y: 50 });
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  // دوال التحكم بموضع الصورة بالسحب والإفلات
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isAdjusting && preview) {
      setIsDragging(true);
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !bannerRef.current) return;
    
    const rect = bannerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setImagePosition({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // دالة حفظ الصورة مع الموضع المحدد
  const saveImageWithPosition = async () => {
    if (!preview || !currentUser) return;

    setUploading(true);
    try {
      // تحويل المعاينة إلى Blob
      const response = await fetch(preview);
      const blob = await response.blob();
      const file = new File([blob], 'banner.jpg', { type: blob.type });

      // رفع الصورة للخادم
      const formData = new FormData();
      formData.append('banner', file);
      formData.append('userId', currentUser.id.toString());
      formData.append('position', JSON.stringify(imagePosition));

      const result = await api.upload('/api/upload/profile-banner', formData);

      if (!result.success) {
        throw new Error(result.error || 'فشل في رفع صورة البانر');
      }

      if (onBannerUpdate && result.bannerUrl) {
        onBannerUpdate(result.bannerUrl);
      }
      
      setPreview(null);
      setIsAdjusting(false);
      toast({
        title: 'تم بنجاح',
        description: 'تم تحديث صورة البانر',
        variant: 'default',
      });
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message || 'فشل في رفع صورة البانر',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  return (
    <div className="relative">
      {/* صورة البروفايل البانر */}
      <div 
        ref={bannerRef}
        className={`relative aspect-[3/1] rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 shadow-2xl border border-white/20 backdrop-blur-sm ${
          isAdjusting && preview ? 'cursor-move' : ''
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {preview ? (
          <>
            <img 
              src={preview} 
              alt="معاينة صورة البانر" 
              className="w-full h-full object-cover select-none"
              style={{ 
                objectPosition: `${imagePosition.x}% ${imagePosition.y}%`,
                pointerEvents: 'none'
              }}
              draggable={false}
            />
            {/* مؤشر السحب */}
            {isAdjusting && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm rounded-full p-3 shadow-lg">
                  <Move size={24} className="text-white" />
                </div>
                {isDragging && (
                  <div className="absolute inset-0 border-2 border-blue-400 bg-blue-400/10" />
                )}
              </div>
            )}
          </>
        ) : currentUser?.profileBanner && currentUser.profileBanner !== '' ? (
          <img
            src={getBannerImageSrc(currentUser.profileBanner)}
            alt="صورة البانر"
            className="w-full h-full object-cover object-top"
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

        {/* أزرار التحكم في المعاينة */}
        {preview && !isAdjusting && (
          <div className="absolute bottom-3 right-3 flex gap-2">
            <Button
              onClick={saveImageWithPosition}
              disabled={uploading}
              size="sm"
              className="bg-green-600/90 hover:bg-green-700 text-white backdrop-blur-md border border-white/30 shadow-lg"
            >
              <Check size={16} className="ml-1" />
              حفظ
            </Button>
            <Button
              onClick={() => setIsAdjusting(true)}
              disabled={uploading}
              size="sm"
              className="bg-blue-600/90 hover:bg-blue-700 text-white backdrop-blur-md border border-white/30 shadow-lg"
            >
              <Move size={16} className="ml-1" />
              تعديل الموضع
            </Button>
            <Button
              onClick={removePreview}
              disabled={uploading}
              size="sm"
              variant="destructive"
              className="backdrop-blur-md border border-white/30 shadow-lg"
            >
              <X size={16} />
            </Button>
          </div>
        )}

        {/* أزرار التحكم أثناء التعديل */}
        {preview && isAdjusting && (
          <div className="absolute bottom-0 inset-x-0 bg-black/80 backdrop-blur-md p-3">
            <div className="flex items-center justify-between">
              <div className="text-white text-sm">
                اسحب الصورة لتحديد الموضع المناسب
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setIsAdjusting(false)}
                  size="sm"
                  variant="outline"
                  className="text-white border-white/50 hover:bg-white/20"
                >
                  إلغاء
                </Button>
                <Button
                  onClick={() => {
                    setIsAdjusting(false);
                    saveImageWithPosition();
                  }}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check size={16} className="ml-1" />
                  تم
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* أزرار التحكم - تظهر فقط إذا لم يكن هناك معاينة */}
        {!preview && (
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
        )}
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

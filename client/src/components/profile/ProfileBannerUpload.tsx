import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, Image, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { uploadProfileBanner } from '@/services/uploadService';
import { getBannerImageSrc } from '@/utils/imageUtils';
import { validateImageFile } from '@/utils/validation';
import type { ChatUser } from '@/types/chat';

interface ProfileBannerUploadProps {
  currentUser: ChatUser | null;
  profileData: ChatUser;
  canEdit: boolean;
  onBannerUpdate: (bannerUrl: string) => void;
  isLoading: boolean;
}

export function ProfileBannerUpload({
  currentUser,
  profileData,
  canEdit,
  onBannerUpdate,
  isLoading
}: ProfileBannerUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);

  // معالجة اختيار الملف
  const handleFileSelect = useCallback(async (file: File) => {
    if (!currentUser || !canEdit) {
      toast({
        title: "غير مسموح",
        description: "لا يمكنك تعديل هذا الملف الشخصي",
        variant: "destructive"
      });
      return;
    }

    // التحقق من صحة الملف
    const validation = validateImageFile(file, 'banner');
    if (!validation.isValid) {
      toast({
        title: "ملف غير صالح",
        description: validation.error,
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // إنشاء معاينة
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // رفع الصورة
      const result = await uploadProfileBanner(file, currentUser.id, {
        onProgress: (progress) => {
          setUploadProgress(progress);
        }
      });

      if (result.success && result.bannerUrl) {
        onBannerUpdate(result.bannerUrl);
        setPreview(null);
        
        toast({
          title: "تم بنجاح",
          description: "تم تحديث صورة الغلاف"
        });
      } else {
        throw new Error(result.error || 'فشل في رفع صورة الغلاف');
      }
    } catch (error: any) {
      toast({
        title: "خطأ في الرفع",
        description: error.message || 'حدث خطأ أثناء رفع صورة الغلاف',
        variant: "destructive"
      });
      setPreview(null);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      
      // تنظيف المدخلات
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  }, [currentUser, canEdit, onBannerUpdate, toast]);

  // معالجة تغيير ملف الإدخال
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  // إزالة المعاينة
  const removePreview = useCallback(() => {
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  }, []);

  // الحصول على مصدر صورة الغلاف
  const getBannerSource = useCallback(() => {
    if (preview) return preview;
    return getBannerImageSrc(
      profileData.profileBanner, 
      'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&h=300&fit=crop'
    );
  }, [preview, profileData.profileBanner]);

  return (
    <div className="relative">
      {/* صورة الغلاف */}
      <div 
        className="relative h-48 bg-gradient-to-br from-blue-500 to-purple-600 overflow-hidden"
        style={{
          backgroundImage: `url(${getBannerSource()})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* طبقة تراكب للتحسين البصري */}
        <div className="absolute inset-0 bg-black/20" />
        
        {/* مؤشر التحميل */}
        {(uploading || isLoading) && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-center text-white">
              <Loader2 className="animate-spin mx-auto mb-2" size={32} />
              {uploading && (
                <div className="text-sm">
                  {uploadProgress > 0 ? `${uploadProgress}%` : 'جاري رفع الغلاف...'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* زر إزالة المعاينة */}
        {preview && !uploading && (
          <Button
            onClick={removePreview}
            size="sm"
            variant="destructive"
            className="absolute top-2 right-2 w-8 h-8 p-0 rounded-full"
          >
            <X size={16} />
          </Button>
        )}

        {/* أزرار التحكم */}
        {canEdit && !uploading && !isLoading && (
          <div className="absolute bottom-3 left-3 flex gap-2">
            {/* زر رفع من الجهاز */}
            <Button
              onClick={() => fileInputRef.current?.click()}
              size="sm"
              className="bg-white/20 backdrop-blur-md hover:bg-white/30 text-white border border-white/30"
              title="اختيار صورة غلاف من الجهاز"
            >
              <Upload size={16} className="mr-1" />
              رفع صورة
            </Button>
            
            {/* زر الكاميرا */}
            <Button
              onClick={() => cameraInputRef.current?.click()}
              size="sm"
              className="bg-white/20 backdrop-blur-md hover:bg-white/30 text-white border border-white/30"
              title="التقاط صورة غلاف بالكاميرا"
            >
              <Camera size={16} />
            </Button>
          </div>
        )}

        {/* شريط التقدم */}
        {uploading && uploadProgress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
            <div 
              className="h-full bg-white transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}
      </div>

      {/* مدخلات الملفات المخفية */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        onChange={handleFileChange}
        className="hidden"
        disabled={uploading || isLoading}
      />
      
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        disabled={uploading || isLoading}
      />
    </div>
  );
}
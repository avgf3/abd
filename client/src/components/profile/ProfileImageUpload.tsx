import { Camera, Upload, X, Trash2 } from 'lucide-react';
import { useState, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/queryClient';
import { validateFile, formatFileSize, getUploadTimeout } from '@/lib/uploadConfig';
import type { ChatUser } from '@/types/chat';

interface ProfileImageUploadProps {
  currentUser: ChatUser | null;
  onImageUpdate?: (imageUrl: string | null) => void;
}

export default function ProfileImageUpload({
  currentUser,
  onImageUpdate,
}: ProfileImageUploadProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // التحقق من صحة الملف
  const validateProfileImage = (file: File): boolean => {
    const validation = validateFile(file, 'profile_image');

    if (!validation.isValid) {
      toast({
        title: 'خطأ في الملف',
        description: validation.error,
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const handleFileSelect = async (file: File) => {
    if (!currentUser) {
      toast({
        title: 'خطأ',
        description: 'يجب تسجيل الدخول أولاً',
        variant: 'destructive',
      });
      return;
    }

    if (!validateProfileImage(file)) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      // إنشاء معاينة للصورة
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // إنشاء FormData لرفع الصورة
      const formData = new FormData();
      formData.append('profileImage', file);

      // رفع الصورة للخادم
      const result = await api.upload('/api/upload/profile-image', formData, {
        timeout: getUploadTimeout('image'),
        onProgress: (progress) => {
          setUploadProgress(Math.round(progress));
        },
      });

      if (!result.success) {
        throw new Error(result.error || 'فشل في رفع الصورة');
      }

      // تحديث الواجهة فوراً
      if (onImageUpdate && result.imageUrl) {
        onImageUpdate(result.imageUrl);
      }

      toast({
        title: 'تم رفع الصورة بنجاح',
        description: 'تم تحديث صورة البروفايل',
      });

      // إخفاء المعاينة وإعادة تعيين التقدم
      setTimeout(() => {
        setPreview(null);
        setUploadProgress(0);
      }, 1000);
      
    } catch (error: any) {
      console.error('❌ خطأ في رفع الصورة:', error);

      toast({
        title: 'خطأ في رفع الصورة',
        description: error.message || 'حدث خطأ أثناء رفع الصورة',
        variant: 'destructive',
      });

      setPreview(null);
      setUploadProgress(0);
    } finally {
      setUploading(false);

      // تنظيف input files
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (cameraInputRef.current) {
        cameraInputRef.current.value = '';
      }
    }
  };

  const handleDeleteImage = async () => {
    if (!currentUser || !currentUser.profileImage) return;

    setDeleting(true);

    try {
      const response = await api.delete('/api/upload/profile-image');

      if (!response.success) {
        throw new Error(response.error || 'فشل في حذف الصورة');
      }

      // تحديث الواجهة
      if (onImageUpdate) {
        onImageUpdate(null);
      }

      toast({
        title: 'تم حذف الصورة',
        description: 'تم حذف صورة البروفايل بنجاح',
      });

    } catch (error: any) {
      console.error('❌ خطأ في حذف الصورة:', error);
      toast({
        title: 'خطأ في حذف الصورة',
        description: error.message || 'حدث خطأ أثناء حذف الصورة',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const removePreview = () => {
    setPreview(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
  };

  const hasProfileImage = currentUser?.profileImage && 
                          !currentUser.profileImage.includes('default') &&
                          !currentUser.profileImage.includes('facebook');

  return (
    <div className="space-y-4">
      {/* معاينة الصورة */}
      {preview && (
        <div className="relative w-32 h-32 mx-auto">
          <img
            src={preview}
            alt="معاينة الصورة"
            className="w-full h-full rounded-full object-cover border-4 border-primary"
          />
          <button
            onClick={removePreview}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
            disabled={uploading}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* شريط التقدم */}
      {uploading && uploadProgress > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>جاري الرفع...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* أزرار الرفع والحذف */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {/* رفع من الجهاز */}
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || deleting}
          className="flex items-center gap-2"
          variant="outline"
        >
          {uploading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
          ) : (
            <Upload className="w-4 h-4" />
          )}
          اختيار صورة
        </Button>

        {/* التقاط بالكاميرا */}
        <Button
          onClick={() => cameraInputRef.current?.click()}
          disabled={uploading || deleting}
          className="flex items-center gap-2"
          variant="outline"
        >
          <Camera className="w-4 h-4" />
          التقاط صورة
        </Button>

        {/* حذف الصورة الحالية */}
        {hasProfileImage && (
          <Button
            onClick={handleDeleteImage}
            disabled={uploading || deleting}
            className="flex items-center gap-2"
            variant="destructive"
          >
            {deleting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            حذف الصورة
          </Button>
        )}
      </div>

      {/* Input مخفي للملفات */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Input مخفي للكاميرا */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml"
        capture="user"
        onChange={handleCameraCapture}
        className="hidden"
      />

      {/* نصائح محسّنة */}
      <div className="text-center text-sm text-muted-foreground space-y-1">
        <p>الحد الأقصى: {formatFileSize(5 * 1024 * 1024)}</p>
        <p>الصيغ المدعومة: JPG, PNG, GIF, WebP, SVG</p>
        <p className="text-xs">💡 للحصول على أفضل جودة، استخدم صور بدقة 400×400 بكسل</p>
      </div>
    </div>
  );
}

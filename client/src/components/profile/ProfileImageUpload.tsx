import { Camera, Upload, X } from 'lucide-react';
import { useState, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/queryClient';
import { validateFile, formatFileSize, getUploadTimeout } from '@/lib/uploadConfig';
import type { ChatUser } from '@/types/chat';

interface ProfileImageUploadProps {
  currentUser: ChatUser | null;
  onImageUpdate?: (imageUrl: string) => void;
}

export default function ProfileImageUpload({
  currentUser,
  onImageUpdate,
}: ProfileImageUploadProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // التحقق من صحة الملف باستخدام الإعدادات المركزية
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

    // التحقق من الصلاحيات - الأعضاء والمشرفين يمكنهم رفع الصور، الزوار لا يمكنهم
    if (currentUser.userType === 'guest') {
      toast({
        title: 'غير مسموح',
        description: 'هذه الميزة غير متاحة للزوار',
        variant: 'destructive',
      });
      return;
    }

    if (!validateProfileImage(file)) return;

    setUploading(true);

    try {
      // إنشاء معاينة للصورة
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // رفع الصورة للخادم باستخدام API الموحد
      // إنشاء FormData لرفع الصورة
      const formData = new FormData();
      formData.append('profileImage', file);
      formData.append('userId', currentUser.id.toString());

      // استخدام api.upload مع شريط التقدم والإعدادات المركزية
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
      // تحديث نسخة/هاش الصورة محلياً إن عاد من السيرفر
      if ((result as any).avatarHash && currentUser?.id) {
        try {
          await api.put(`/api/users/${currentUser.id}`, { avatarHash: (result as any).avatarHash });
        } catch {}
      }

      toast({
        title: 'تم رفع الصورة بنجاح',
        description: 'تم تحديث صورة البروفايل',
      });

      // إخفاء المعاينة وإعادة تعيين التقدم
      setPreview(null);
      setUploadProgress(0);
    } catch (error: any) {
      console.error('❌ خطأ في رفع الصورة:', error);

      toast({
        title: 'خطأ في رفع الصورة',
        description: error.message || 'حدث خطأ أثناء رفع الصورة',
        variant: 'destructive',
      });

      setPreview(null);
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
  };

  // التحقق من الصلاحيات قبل عرض المكون
  const isAuthorized = currentUser && currentUser.userType !== 'guest';

  if (!isAuthorized) {
    return (
      <div className="text-center p-4 text-muted-foreground">
        <p>هذه الميزة غير متاحة للزوار</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* معاينة الصورة */}
      {preview && (
        <div className="relative w-32 h-32 mx-auto">
          <img
            src={preview}
            alt="معاينة الصورة"
            className="w-full h-full rounded-full object-cover border-4 border-primary"
            style={{ aspectRatio: '1 / 1' }}
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

      {/* أزرار الرفع */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {/* رفع من الجهاز */}
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
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
          disabled={uploading}
          className="flex items-center gap-2"
          variant="outline"
        >
          <Camera className="w-4 h-4" />
          التقاط صورة
        </Button>
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

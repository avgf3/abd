import { useState, useRef } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { ChatUser } from '@/types/chat';

interface ProfileImageUploadProps {
  currentUser: ChatUser | null;
  onImageUpdate?: (imageUrl: string) => void;
}

export default function ProfileImageUpload({ currentUser, onImageUpdate }: ProfileImageUploadProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // التحقق من صحة الملف
  const validateFile = (file: File): boolean => {
    // التحقق من حجم الملف (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "خطأ",
        description: "حجم الصورة يجب أن يكون أقل من 5 ميجابايت",
        variant: "destructive",
      });
      return false;
    }

    // التحقق من نوع الملف
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار ملف صورة صحيح (JPG, PNG, GIF, WebP, SVG)",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleFileSelect = async (file: File) => {
    if (!currentUser) {
      toast({
        title: "خطأ",
        description: "يجب تسجيل الدخول أولاً",
        variant: "destructive",
      });
      return;
    }

    if (!validateFile(file)) return;

    setUploading(true);

    try {
      // إنشاء معاينة للصورة
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // رفع الصورة للخادم - إصلاح المشكلة
      console.log('📤 بدء رفع صورة البروفايل...');
      
      // إنشاء FormData لرفع الصورة
      const formData = new FormData();
      formData.append('profileImage', file);
      formData.append('userId', currentUser.id.toString());

      const response = await fetch('/api/upload/profile-image', {
        method: 'POST',
        body: formData,
      });

      console.log('📡 استجابة الخادم:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'فشل في رفع الصورة' }));
        throw new Error(errorData.error || errorData.details || 'فشل في رفع الصورة');
      }

      const result = await response.json();
      console.log('✅ نتيجة رفع الصورة:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'فشل في رفع الصورة');
      }
      
      // تحديث الواجهة فوراً
      if (onImageUpdate && result.imageUrl) {
        onImageUpdate(result.imageUrl);
      }

      toast({
        title: "تم رفع الصورة بنجاح",
        description: "تم تحديث صورة البروفايل",
      });

      // إخفاء المعاينة
      setPreview(null);

    } catch (error: any) {
      console.error('❌ خطأ في رفع الصورة:', error);
      
      toast({
        title: "خطأ في رفع الصورة",
        description: error.message || "حدث خطأ أثناء رفع الصورة",
        variant: "destructive",
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

      {/* نصائح */}
      <div className="text-center text-sm text-muted-foreground">
        <p>الحد الأقصى: 5 ميجابايت</p>
        <p>الصيغ المدعومة: JPG, PNG, GIF, WebP, SVG</p>
      </div>
    </div>
  );
}
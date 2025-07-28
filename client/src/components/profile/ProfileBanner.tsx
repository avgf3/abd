import { useState, useRef } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { ChatUser } from '@/types/chat';

interface ProfileBannerProps {
  currentUser: ChatUser | null;
  onBannerUpdate?: (bannerUrl: string) => void;
}

export default function ProfileBanner({ currentUser, onBannerUpdate }: ProfileBannerProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!currentUser) return;

    // التحقق من حجم الملف (10MB max للبانر)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "خطأ",
        description: "حجم صورة البروفايل يجب أن يكون أقل من 10 ميجابايت",
        variant: "destructive",
      });
      return;
    }

    // التحقق من نوع الملف
    if (!file.type.startsWith('image/')) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار ملف صورة صحيح",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // إنشاء FormData لرفع الصورة
      const formData = new FormData();
      formData.append('banner', file);
      formData.append('userId', currentUser.id.toString());

      // إنشاء معاينة للصورة
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // رفع الصورة للخادم
      const response = await fetch('/api/upload/profile-banner', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('فشل في رفع صورة البروفايل');
      }

      const result = await response.json();
      
      // تحديث بيانات المستخدم
      await apiRequest(`/api/users/${currentUser.id}`, {
        method: 'PUT',
        body: { profileBanner: result.bannerUrl }
      });

      // تحديث الواجهة
      if (onBannerUpdate) {
        onBannerUpdate(result.bannerUrl);
      }

      toast({
        title: "تم بنجاح",
        description: "تم تحديث صورة البروفايل",
        variant: "default",
      });
      
      // إعادة تحميل الصفحة لضمان ظهور الصورة
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error) {
      console.error('Error uploading banner:', error);
      toast({
        title: "خطأ",
        description: "فشل في رفع صورة البروفايل، يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
      setPreview(null);
    } finally {
      setUploading(false);
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
      <div className="relative h-40 rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 shadow-2xl border border-white/20">
        {preview ? (
          <img 
            src={preview} 
            alt="معاينة صورة البروفايل" 
            className="w-full h-full object-cover"
          />
        ) : (currentUser?.profileBanner && currentUser.profileBanner !== '') ? (
          <img 
            src={currentUser.profileBanner} 
            alt="صورة البروفايل" 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/80 via-purple-600/80 to-pink-500/80"></div>
            <div className="text-center relative z-10">
              <div className="text-5xl mb-3 filter drop-shadow-lg">📸</div>
              <p className="text-lg font-medium opacity-90 drop-shadow-md">إضافة صورة بروفايل</p>
              <p className="text-sm opacity-70 mt-1">اضغط على الكاميرا أو الرفع</p>
            </div>
            <div className="absolute inset-0 bg-black/10"></div>
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
          <Button
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploading}
            size="sm"
            className="bg-white/20 backdrop-blur-md hover:bg-white/30 text-white border border-white/30 rounded-full w-10 h-10 p-0 shadow-lg transition-all duration-200 hover:scale-110"
          >
            <Camera size={16} />
          </Button>

          {/* زر رفع الملف */}
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            size="sm"
            className="bg-white/20 backdrop-blur-md hover:bg-white/30 text-white border border-white/30 rounded-full w-10 h-10 p-0 shadow-lg transition-all duration-200 hover:scale-110"
          >
            <Upload size={16} />
          </Button>
        </div>
      </div>

      {/* حقول الإدخال المخفية */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleCameraCapture}
        className="hidden"
      />
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {uploading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
          <div className="text-white text-sm animate-pulse">
            جاري رفع الصورة...
          </div>
        </div>
      )}
    </div>
  );
}
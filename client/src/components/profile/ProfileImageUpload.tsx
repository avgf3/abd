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

  const handleFileSelect = async (file: File) => {
    if (!currentUser) return;

    // التحقق من حجم الملف (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "خطأ",
        description: "حجم الصورة يجب أن يكون أقل من 5 ميجابايت",
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
      formData.append('profileImage', file);
      formData.append('userId', currentUser.id.toString());

      // إنشاء معاينة للصورة
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // رفع الصورة للخادم
      const response = await fetch('/api/upload/profile-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('فشل في رفع الصورة');
      }

      const result = await response.json();
      
      // تحديث بيانات المستخدم
      await apiRequest(`/api/users/${currentUser.id}`, {
        method: 'PUT',
        body: { profileImage: result.imageUrl }
      });

      // تحديث الواجهة
      if (onImageUpdate) {
        onImageUpdate(result.imageUrl);
      }

      toast({
        title: "تم بنجاح",
        description: "تم تحديث صورة البروفايل",
        variant: "default",
      });

    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "خطأ",
        description: "فشل في رفع الصورة، يرجى المحاولة مرة أخرى",
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
    <div className="flex flex-col items-center space-y-4">
      {/* معاينة الصورة */}
      <div className="relative">
        <div className="w-28 h-28 rounded-full overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 border-4 border-white shadow-xl ring-2 ring-blue-500/20">
          {preview ? (
            <img 
              src={preview} 
              alt="معاينة الصورة" 
              className="w-full h-full object-cover"
            />
          ) : (currentUser?.profileImage && currentUser.profileImage !== '/default_avatar.svg') ? (
            <img 
              src={currentUser.profileImage} 
              alt="صورة البروفايل" 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10"></div>
              <span className="text-3xl text-gray-500 relative z-10 filter drop-shadow-sm">👤</span>
            </div>
          )}
        </div>
        
        {preview && (
          <button
            onClick={removePreview}
            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-all duration-200 shadow-lg hover:scale-110 border-2 border-white"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* أزرار التحكم */}
      <div className="flex gap-2">
        {/* زر الكاميرا */}
        <Button
          onClick={() => cameraInputRef.current?.click()}
          disabled={uploading}
          variant="outline"
          size="sm"
          className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700 rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
        >
          <Camera size={14} />
          كاميرا
        </Button>

        {/* زر رفع الملف */}
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          variant="outline"
          size="sm"
          className="flex items-center gap-2 bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700 rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
        >
          <Upload size={14} />
          رفع
        </Button>
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
        <div className="text-sm text-blue-600 animate-pulse">
          جاري رفع الصورة...
        </div>
      )}
    </div>
  );
}
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Camera, Upload, X } from 'lucide-react';
import type { ChatUser } from '@/types/chat';

interface CleanProfileUploadProps {
  user: ChatUser;
  onUploadSuccess: (imageUrl: string, type: 'avatar' | 'banner') => void;
  type: 'avatar' | 'banner';
  className?: string;
}

export default function CleanProfileUpload({ user, onUploadSuccess, type, className }: CleanProfileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // التحقق من نوع الملف
    if (!file.type.startsWith('image/')) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار ملف صورة صالح",
        variant: "destructive",
      });
      return;
    }

    // التحقق من حجم الملف (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "خطأ",
        description: "حجم الملف كبير جداً. الحد الأقصى 5MB",
        variant: "destructive",
      });
      return;
    }

    // عرض معاينة
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    await uploadImage(file);
  };

  const uploadImage = async (file: File) => {
    if (user.userType === 'guest') {
      toast({
        title: "غير مسموح",
        description: "رفع الصور متاح للأعضاء فقط",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const endpoint = type === 'avatar' 
        ? '/api/upload/profile-image' 
        : '/api/upload/profile-banner';

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('فشل في رفع الصورة');
      }

      const data = await response.json();
      
      onUploadSuccess(data.imageUrl, type);
      
      toast({
        title: "تم بنجاح",
        description: `تم رفع ${type === 'avatar' ? 'الصورة الشخصية' : 'صورة البانر'} بنجاح`,
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "خطأ",
        description: "فشل في رفع الصورة. حاول مرة أخرى",
        variant: "destructive",
      });
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const clearPreview = () => {
    setPreview(null);
  };

  if (user.userType === 'guest') {
    return null;
  }

  return (
    <div className={className}>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        id={`upload-${type}-${user.id}`}
      />
      
      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt="معاينة"
            className={`
              ${type === 'avatar' 
                ? 'w-20 h-20 rounded-full object-cover' 
                : 'w-full h-32 rounded-lg object-cover'
              }
            `}
          />
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg opacity-0 hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="ghost"
              onClick={clearPreview}
              className="text-white hover:bg-red-500/50"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : (
        <label
          htmlFor={`upload-${type}-${user.id}`}
          className={`
            cursor-pointer group relative
            ${type === 'avatar' 
              ? 'w-20 h-20 rounded-full' 
              : 'w-full h-32 rounded-lg'
            }
            bg-accent/30 border-2 border-dashed border-accent/50
            flex items-center justify-center
            hover:bg-accent/50 hover:border-accent
            transition-all duration-200
            ${uploading ? 'pointer-events-none opacity-50' : ''}
          `}
        >
          <div className="text-center">
            {uploading ? (
              <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full"></div>
            ) : (
              <>
                <Camera className="w-6 h-6 text-white mb-1 group-hover:scale-110 transition-transform" />
                <p className="text-xs text-white">
                  {type === 'avatar' ? 'صورة شخصية' : 'صورة البانر'}
                </p>
              </>
            )}
          </div>
        </label>
      )}
    </div>
  );
}
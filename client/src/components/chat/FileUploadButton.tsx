import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, Image, Video, FileText } from 'lucide-react';

interface FileUploadButtonProps {
  onFileSelect: (file: File, type: 'image' | 'video' | 'document') => void;
  disabled?: boolean;
}

export default function FileUploadButton({ onFileSelect, disabled = false }: FileUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // تحديد نوع الملف
    let fileType: 'image' | 'video' | 'document';
    
    if (file.type.startsWith('image/')) {
      fileType = 'image';
    } else if (file.type.startsWith('video/')) {
      fileType = 'video';
    } else {
      fileType = 'document';
    }

    // التحقق من حجم الملف (حد أقصى 10 ميجا)
    if (file.size > 10 * 1024 * 1024) {
      alert('حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت');
      return;
    }

    onFileSelect(file, fileType);
    
    // إعادة تعيين قيمة input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <Button
        onClick={handleFileClick}
        disabled={disabled}
        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg shadow-md disabled:opacity-50"
        title="إرسال ملف (صورة، فيديو، مستند)"
      >
        <Paperclip className="w-4 h-4" />
      </Button>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,.pdf,.doc,.docx,.txt"
        onChange={handleFileChange}
        className="hidden"
      />
    </>
  );
}
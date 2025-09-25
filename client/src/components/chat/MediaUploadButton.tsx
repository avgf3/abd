import { Plus, Image, Video } from 'lucide-react';
import { useRef } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

interface MediaUploadButtonProps {
  onMediaSelect: (file: File, type: 'image' | 'video') => void;
  disabled?: boolean;
  currentUser?: any; // إضافة المستخدم الحالي للتحقق من الصلاحيات
}

export default function MediaUploadButton({ onMediaSelect, disabled, currentUser }: MediaUploadButtonProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // التحقق من الصلاحيات
  const isAuthorized = currentUser && (
    currentUser.userType === 'owner' || 
    currentUser.userType === 'admin' || 
    currentUser.userType === 'moderator'
  );

  // إذا لم يكن مشرفاً، لا نعرض الزر
  if (!isAuthorized) {
    return null;
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    // التحقق مرة أخرى من الصلاحيات
    if (!isAuthorized) {
      toast({
        title: 'غير مسموح',
        description: 'هذه الميزة متاحة للمشرفين فقط',
        variant: 'destructive',
      });
      return;
    }

    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        toast({
          title: 'حجم الملف كبير',
          description: 'حجم الصورة يجب أن يكون أقل من 5 ميجابايت',
          variant: 'destructive',
        });
        return;
      }
      onMediaSelect(file, 'image');
    }
  };

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    // التحقق مرة أخرى من الصلاحيات
    if (!isAuthorized) {
      toast({
        title: 'غير مسموح',
        description: 'هذه الميزة متاحة للمشرفين فقط',
        variant: 'destructive',
      });
      return;
    }

    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        // 20MB limit
        toast({
          title: 'حجم الملف كبير',
          description: 'حجم الفيديو يجب أن يكون أقل من 20 ميجابايت',
          variant: 'destructive',
        });
        return;
      }
      onMediaSelect(file, 'video');
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            className="border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-popover border-border text-popover-foreground">
          <DropdownMenuItem
            onClick={() => imageInputRef.current?.click()}
            className="flex items-center gap-2 hover:bg-accent/10"
          >
            <Image className="h-4 w-4" />
            إرسال صورة
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => videoInputRef.current?.click()}
            className="flex items-center gap-2 hover:bg-accent/10"
          >
            <Video className="h-4 w-4" />
            إرسال فيديو
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        style={{ display: 'none' }}
      />

      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        onChange={handleVideoUpload}
        style={{ display: 'none' }}
      />
    </>
  );
}

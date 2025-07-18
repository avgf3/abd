import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Image, Video } from 'lucide-react';
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
}

export default function MediaUploadButton({ onMediaSelect, disabled }: MediaUploadButtonProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: 'حجم الملف كبير',
          description: 'حجم الصورة يجب أن يكون أقل من 5 ميجابايت',
          variant: 'destructive'
        });
        return;
      }
      onMediaSelect(file, 'image');
    }
  };

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) { // 20MB limit
        toast({
          title: 'حجم الملف كبير',
          description: 'حجم الفيديو يجب أن يكون أقل من 20 ميجابايت',
          variant: 'destructive'
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
            className="glass-effect border-accent hover:bg-accent/20"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-gray-900/95 border-gray-700">
          <DropdownMenuItem 
            onClick={() => imageInputRef.current?.click()}
            className="flex items-center gap-2 text-gray-200 hover:bg-gray-800"
          >
            <Image className="h-4 w-4" />
            إرسال صورة
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => videoInputRef.current?.click()}
            className="flex items-center gap-2 text-gray-200 hover:bg-gray-800"
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
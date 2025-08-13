import React, { useRef } from 'react';
import { Paperclip, Send, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onAttachment?: (file: File) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageInput({
  value,
  onChange,
  onSend,
  onAttachment,
  disabled,
  placeholder = 'اكتب رسالتك...'
}: MessageInputProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="flex items-end gap-2">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && onAttachment) {
            onAttachment(file);
            // reset input so selecting the same file again triggers change
            e.currentTarget.value = '';
          }
        }}
      />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled}
        title="إرفاق ملف"
      >
        <Paperclip className="w-5 h-5" />
      </Button>

      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 resize-none"
        rows={1}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
      />

      <Button
        type="button"
        onClick={onSend}
        disabled={disabled || !value.trim()}
        className="shrink-0"
        title="إرسال"
      >
        <Send className="w-5 h-5" />
      </Button>
    </div>
  );
}
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Image, Smile } from 'lucide-react';

interface MessageInputAreaProps {
  onSendMessage: (content: string, messageType?: string) => void;
  onTyping: () => void;
  currentUser: any;
  disabled?: boolean;
}

export default function MessageInputArea({ 
  onSendMessage, 
  onTyping,
  currentUser,
  disabled = false
}: MessageInputAreaProps) {
  const [messageText, setMessageText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSendMessage = () => {
    if (messageText.trim() && currentUser && !disabled) {
      onSendMessage(messageText.trim());
      setMessageText('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    } else {
      onTyping();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Handle file upload logic here
      console.log('File selected:', file.name);
    }
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
      <div className="flex gap-2">
        <Input
          value={messageText}
          onChange={(e) => {
            setMessageText(e.target.value);
            onTyping();
          }}
          onKeyPress={handleKeyPress}
          placeholder={disabled ? "غير مسموح لك بالكتابة" : "اكتب رسالتك..."}
          className="flex-1"
          disabled={disabled}
          dir="rtl"
        />
        
        <Button 
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          size="sm"
          disabled={disabled}
        >
          <Image className="h-4 w-4" />
        </Button>
        
        <Button 
          onClick={handleSendMessage}
          disabled={!messageText.trim() || disabled}
          size="sm"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />
    </div>
  );
}
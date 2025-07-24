import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ChatUser, ChatMessage } from '@/types/chat';
import FileUploadButton from './FileUploadButton';
import EmojiPicker from './EmojiPicker';


interface PrivateMessageBoxProps {
  isOpen: boolean;
  user: ChatUser;
  currentUser: ChatUser | null;
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  onClose: () => void;
}

export default function PrivateMessageBox({
  isOpen,
  user,
  currentUser,
  messages,
  onSendMessage,
  onClose
}: PrivateMessageBoxProps) {
  const [messageText, setMessageText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (messageText.trim()) {
      onSendMessage(messageText.trim());
      setMessageText('');
    }
  };

  const handleFileSelect = (file: File, type: 'image' | 'video' | 'document') => {
    const fileUrl = URL.createObjectURL(file);
    let fileMessage = '';
    
    switch (type) {
      case 'image':
        fileMessage = `📷 صورة: ${file.name}`;
        break;
      case 'video':
        fileMessage = `🎥 فيديو: ${file.name}`;
        break;
      case 'document':
        fileMessage = `📄 مستند: ${file.name}`;
        break;
    }
    
    onSendMessage(fileMessage);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessageText(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const formatTime = (date?: Date) => {
    if (!date) return '';
    return new Date(date).toLocaleString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[450px] bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 shadow-2xl">
        <DialogHeader className="border-b border-purple-200 pb-3">
          <DialogTitle className="text-lg font-bold text-center text-purple-800 flex items-center justify-center gap-3">
            <div className="relative">
              <img
                src={user.profileImage && user.profileImage !== '/default_avatar.svg' ? user.profileImage : "/default_avatar.svg"}
                alt="صورة المستخدم"
                className="w-12 h-12 rounded-full border-2 border-purple-300 shadow-md"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/default_avatar.svg';
                }}
              />
              {user.isOnline && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full animate-pulse"></div>
              )}
            </div>
            <div className="text-center">
              <div 
                className={`inline-block px-6 py-4 rounded-xl transition-all duration-300 min-w-[160px] text-center ${
                  user.userType === 'owner' ? 'bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-black shadow-lg' : ''
                }`}
                style={{
                  ...(user.userType === 'owner' && {
                    animation: 'golden-glow 2s ease-in-out infinite',
                    boxShadow: '0 0 30px rgba(255, 215, 0, 0.9)'
                  })
                }}
              >
                <p className="font-bold text-lg" style={{ 
                  color: user.userType === 'owner' ? '#000000' : (user.usernameColor || '#7C3AED') 
                }}>
                  {user.userType === 'owner' ? '👑' : user.userType === 'admin' ? '⭐' : ''} {user.username}
                </p>
              </div>
              <p className="text-sm text-purple-600 font-medium">
                {user.userType === 'owner' && '👑 مالك'}
                {user.userType === 'admin' && '⭐ إدمن'}
                {user.userType === 'moderator' && '🛡️ مشرف'}
                {user.userType === 'member' && ''}
                {user.userType === 'guest' && ''}
              </p>
              <p className={`text-xs font-medium ${user.isOnline ? 'text-green-600' : 'text-gray-500'}`}>
                {user.isOnline ? '🟢 متصل الآن' : '⚫ غير متصل'}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[250px] w-full p-4">
          <div className="space-y-3">
            {messages.map((message, index) => (
              <div 
                key={`${message.id}-${message.senderId}-${index}`}
                className={`flex ${message.senderId === currentUser?.id ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] p-3 rounded-xl shadow-sm ${
                  message.senderId === currentUser?.id 
                    ? 'bg-purple-500 text-white rounded-br-sm' 
                    : 'bg-white text-gray-800 rounded-bl-sm border border-purple-200'
                }`}>
                  {message.senderId !== currentUser?.id && (
                    <div className="flex items-center gap-2 mb-2">
                      <img
                        src={message.sender?.profileImage || "/default_avatar.svg"}
                        alt={message.sender?.username || 'User'}
                        className="w-6 h-6 rounded-full object-cover border border-gray-300"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/default_avatar.svg';
                        }}
                      />
                      <span 
                        className="text-xs font-medium text-gray-600"
                        style={{ color: message.sender?.usernameColor || '#000000' }}
                      >
                        {message.sender?.username || 'مجهول'}
                      </span>
                    </div>
                  )}
                  <div className="text-sm font-medium mb-1">
                    {message.content}
                  </div>
                  <div className={`text-xs ${
                    message.senderId === currentUser?.id ? 'text-purple-100' : 'text-gray-500'
                  }`}>
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              </div>
            ))}
            
            {messages.length === 0 && (
              <div className="text-center py-8 text-purple-400">
                <div className="text-4xl mb-3">✉️</div>
                <p className="text-lg font-medium">لا توجد رسائل</p>
                <p className="text-sm">ابدأ محادثة جديدة!</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="flex gap-2 p-4 border-t border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <FileUploadButton 
            onFileSelect={handleFileSelect}
            disabled={false}
          />
          
          <div className="relative">
            <Button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="bg-purple-100 hover:bg-purple-200 text-purple-600 px-3 py-2 rounded-lg"
              title="الرموز التعبيرية"
            >
              😊
            </Button>
            
            {showEmojiPicker && (
              <EmojiPicker 
                onEmojiSelect={handleEmojiSelect}
                onClose={() => setShowEmojiPicker(false)}
              />
            )}
          </div>
          
          <Input
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="✉️ ارسال رسالة..."
            className="flex-1 bg-white border-purple-300 text-gray-800 placeholder:text-purple-400 focus:border-purple-500"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!messageText.trim()}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium"
          >
            ✉️ ارسال
          </Button>
        </div>
        
        <div className="flex justify-center pt-2 pb-4">
          <Button 
            onClick={onClose} 
            variant="outline" 
            className="bg-white border-purple-300 text-purple-700 hover:bg-purple-100 font-medium px-6"
          >
            ✖️ إغلاق
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
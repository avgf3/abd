import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getImageSrc } from '@/utils/imageUtils';
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
      <DialogContent className="max-w-lg max-h-[500px] bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 border-2 border-cyan-500/30 shadow-2xl backdrop-blur-sm">
        <DialogHeader className="border-b border-cyan-500/20 pb-4">
          <DialogTitle className="text-xl font-bold text-center text-cyan-100 flex items-center justify-center gap-4">
            <div className="relative">
              <img
                src={getImageSrc(user.profileImage)}
                alt="صورة المستخدم"
                className="w-14 h-14 rounded-full border-3 border-cyan-400/50 shadow-lg ring-2 ring-cyan-500/30"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/default_avatar.svg';
                }}
              />
              {user.isOnline && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 border-2 border-slate-900 rounded-full animate-pulse shadow-lg"></div>
              )}
            </div>
            <div className="text-center">
              <div 
                className={`inline-block px-6 py-3 rounded-xl transition-all duration-300 min-w-[180px] text-center backdrop-blur-sm ${
                  user.userType === 'owner' 
                    ? 'bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-black shadow-xl border border-yellow-300' 
                    : 'bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border border-cyan-500/30'
                }`}
                style={{
                  ...(user.userType === 'owner' && {
                    animation: 'golden-glow 2s ease-in-out infinite',
                    boxShadow: '0 0 30px rgba(255, 215, 0, 0.6)'
                  })
                }}
              >
                <p className="font-bold text-lg" style={{ 
                  color: user.userType === 'owner' ? '#000000' : (user.usernameColor || '#67E8F9') 
                }}>
                  {user.userType === 'owner' ? '👑' : user.userType === 'admin' ? '⭐' : ''} {user.username}
                </p>
              </div>
              <p className="text-sm text-cyan-300 font-medium mt-2">
                {user.userType === 'owner' && '👑 مالك الموقع'}
                {user.userType === 'admin' && '⭐ إدمن'}
                {user.userType === 'moderator' && '🛡️ مشرف'}
                {user.userType === 'member' && '💬 عضو'}
                {user.userType === 'guest' && '👤 زائر'}
              </p>
              <p className={`text-sm font-medium flex items-center justify-center gap-2 mt-1 ${user.isOnline ? 'text-green-400' : 'text-gray-400'}`}>
                <div className={`w-2 h-2 rounded-full ${user.isOnline ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
                {user.isOnline ? 'متصل الآن' : 'غير متصل'}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[280px] w-full p-4 bg-gradient-to-b from-slate-900/50 to-blue-950/50 rounded-lg">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div 
                key={`${message.id}-${message.senderId}-${index}`}
                className={`flex ${message.senderId === currentUser?.id ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] p-4 rounded-2xl shadow-lg backdrop-blur-sm transition-all duration-200 hover:shadow-xl ${
                  message.senderId === currentUser?.id 
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-br-md border border-cyan-400/30' 
                    : 'bg-gradient-to-r from-slate-800/80 to-slate-700/80 text-cyan-50 rounded-bl-md border border-slate-600/50'
                }`}>
                  {message.senderId !== currentUser?.id && (
                    <div className="flex items-center gap-3 mb-3 pb-2 border-b border-slate-600/30">
                      <img
                        src={getImageSrc(message.sender?.profileImage)}
                        alt={message.sender?.username || 'User'}
                        className="w-7 h-7 rounded-full object-cover border-2 border-cyan-400/40 shadow-md"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/default_avatar.svg';
                        }}
                      />
                      <span 
                        className="text-sm font-semibold"
                        style={{ color: message.sender?.usernameColor || '#67E8F9' }}
                      >
                        {message.sender?.username || 'مجهول'}
                      </span>
                    </div>
                  )}
                  <div className="text-sm font-medium mb-2 leading-relaxed">
                    {message.content}
                  </div>
                  <div className={`text-xs font-medium ${
                    message.senderId === currentUser?.id ? 'text-cyan-100/80' : 'text-slate-400'
                  }`}>
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              </div>
            ))}
            
            {messages.length === 0 && (
              <div className="text-center py-12 text-cyan-300">
                <div className="text-5xl mb-4 opacity-60">💬</div>
                <p className="text-xl font-bold mb-2">لا توجد رسائل</p>
                <p className="text-sm text-slate-400">ابدأ محادثة خاصة جديدة!</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="flex gap-3 p-4 border-t border-cyan-500/20 bg-gradient-to-r from-slate-900/60 to-blue-950/60 backdrop-blur-sm">
          <FileUploadButton 
            onFileSelect={handleFileSelect}
            disabled={false}
          />
          
          <div className="relative">
            <Button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="bg-slate-700/80 hover:bg-slate-600/80 text-cyan-300 border border-cyan-500/30 px-3 py-2 rounded-lg backdrop-blur-sm transition-all duration-200 hover:border-cyan-400/50"
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
            placeholder="✉️ اكتب رسالتك هنا..."
            className="flex-1 bg-slate-800/60 border-cyan-500/30 text-cyan-50 placeholder:text-cyan-300/60 focus:border-cyan-400 focus:ring-cyan-400/20 backdrop-blur-sm"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!messageText.trim()}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-5 py-2 rounded-lg font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            ✉️ إرسال
          </Button>
        </div>
        
        <div className="flex justify-center pb-4">
          <Button 
            onClick={onClose} 
            variant="outline" 
            className="bg-slate-800/60 border-slate-600/50 text-cyan-300 hover:bg-slate-700/60 hover:border-cyan-500/40 font-semibold px-8 py-2 backdrop-blur-sm transition-all duration-200"
          >
            ✖️ إغلاق المحادثة
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
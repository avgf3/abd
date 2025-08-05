import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ProfileImage from './ProfileImage';
import EmojiPicker from './EmojiPicker';
import { getFinalUsernameColor } from '@/utils/themeUtils';
import { findMentions, playMentionSound, renderMessageWithMentions, insertMention } from '@/utils/mentionUtils';
import type { ChatMessage, ChatUser } from '@/types/chat';
import { Send, Image as ImageIcon, Smile } from "lucide-react";
import UserRoleBadge from './UserRoleBadge';

interface MessageAreaProps {
  messages: ChatMessage[];
  currentUser: ChatUser | null;
  onSendMessage: (content: string, messageType?: string) => void;
  onTyping: () => void;
  typingUsers: Set<string>;
  onReportMessage?: (user: ChatUser, messageContent: string, messageId: number) => void;
  onUserClick?: (event: React.MouseEvent, user: ChatUser) => void;
  onlineUsers?: ChatUser[];
  currentRoomName?: string;
}

export default function MessageArea({ 
  messages, 
  currentUser, 
  onSendMessage, 
  onTyping,
  typingUsers,
  onReportMessage,
  onUserClick,
  onlineUsers = [],
  currentRoomName = 'الدردشة العامة'
}: MessageAreaProps) {
  const [messageText, setMessageText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const lastTypingTime = useRef<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Memoize filtered messages لتحسين الأداء
  const validMessages = useMemo(() => 
    messages.filter(msg => 
      msg && 
      msg.sender && 
      msg.sender.username && 
      msg.content &&
      msg.content.trim() !== ''
    ),
    [messages]
  );

  // تحسين: عرض آخر 100 رسالة فقط لتحسين الأداء
  const displayMessages = useMemo(() => {
    return validMessages.slice(-100);
  }, [validMessages]);

  // Scroll to bottom function - optimized
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      });
    }
  }, []);

  // Auto scroll to bottom when new messages arrive - محسن
  useEffect(() => {
    const timeout = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeout);
  }, [displayMessages.length, scrollToBottom]);

  // تشغيل صوت التنبيه عند استقبال منشن - محسن
  useEffect(() => {
    if (displayMessages.length > 0 && currentUser) {
      const lastMessage = displayMessages[displayMessages.length - 1];
      
      // فحص إذا كانت الرسالة الأخيرة تحتوي على منشن للمستخدم الحالي
      // وليست من المستخدم الحالي نفسه
      if (lastMessage.sender?.id !== currentUser.id && 
          lastMessage.content.includes(`@${currentUser.username}`)) {
        playMentionSound();
      }
    }
  }, [displayMessages, currentUser]);

  // Throttled typing function - محسن
  const handleTypingThrottled = useCallback(() => {
    const now = Date.now();
    
    // إرسال إشعار الكتابة مرة واحدة فقط كل 3 ثوانٍ
    if (now - lastTypingTime.current > 3000) {
      onTyping();
      lastTypingTime.current = now;
      setIsTyping(true);
      
      // إيقاف إشعار الكتابة بعد 3 ثوانٍ
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
      }, 3000);
    }
  }, [onTyping]);

  // Send message function - محسن
  const handleSendMessage = useCallback(() => {
    const trimmedMessage = messageText.trim();
    
    if (trimmedMessage && currentUser) {
      // Clear typing state immediately
      setIsTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // إرسال الرسالة
      onSendMessage(trimmedMessage);
      setMessageText('');
      
      // Focus back to input
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [messageText, currentUser, onSendMessage]);

  // Key press handler - محسن
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    } else if (e.key !== 'Enter') {
      // إرسال إشعار الكتابة فقط عند الكتابة الفعلية
      handleTypingThrottled();
    }
  }, [handleSendMessage, handleTypingThrottled]);

  // Message text change handler
  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value);
  }, []);

  // Emoji select handler
  const handleEmojiSelect = useCallback((emoji: string) => {
    setMessageText(prev => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  }, []);

  // File upload handler - محسن
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      // فحص حجم الملف (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert('حجم الصورة كبير جداً. الحد الأقصى 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const imageData = event.target?.result as string;
        if (imageData) {
          onSendMessage(imageData, 'image');
        }
      };
      reader.onerror = () => {
        alert('فشل في قراءة الملف');
      };
      reader.readAsDataURL(file);
    } else {
      alert('يرجى اختيار ملف صورة صحيح');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onSendMessage]);

  // Format time function - محسن
  const formatTime = useCallback((date?: Date) => {
    if (!date) return '';
    
    try {
      return new Date(date).toLocaleString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return '';
    }
  }, []);

  // Get message border color - محسن
  const getMessageBorderColor = useCallback((message: ChatMessage) => {
    if (!message.sender) return 'border-gray-300';
    
    const username = message.sender.username;
    if (!username) return 'border-gray-300';
    
    const color = getFinalUsernameColor(username);
    return `border-${color}-300`;
  }, []);

  // تحسين: مكون الرسالة المفردة
  const MessageComponent = useCallback(({ message }: { message: ChatMessage }) => {
    const isOwnMessage = message.sender?.id === currentUser?.id;
    const borderColor = getMessageBorderColor(message);
    
    return (
      <div 
        key={message.id} 
        className={`flex gap-3 p-3 rounded-lg border-2 ${borderColor} bg-white/90 backdrop-blur-sm transition-all duration-200 hover:shadow-md ${
          isOwnMessage ? 'ml-8' : 'mr-8'
        }`}
      >
        {/* صورة الملف الشخصي */}
        <div className="flex-shrink-0">
          <ProfileImage 
            user={message.sender} 
            size="medium"
            onClick={(e) => onUserClick?.(e, message.sender!)}
            className="cursor-pointer hover:scale-110 transition-transform duration-200"
          />
        </div>
        
        {/* محتوى الرسالة */}
        <div className="flex-1 min-w-0">
          {/* رأس الرسالة */}
          <div className="flex items-center gap-2 mb-1">
            <span 
              className="font-semibold text-sm cursor-pointer hover:underline"
              style={{ color: getFinalUsernameColor(message.sender?.username || '') }}
              onClick={(e) => onUserClick?.(e, message.sender!)}
            >
              {message.sender?.username || 'مستخدم'}
            </span>
            
            <UserRoleBadge user={message.sender} />
            
            <span className="text-xs text-gray-500">
              {formatTime(message.timestamp)}
            </span>
            
            {/* زر الإبلاغ */}
            {!isOwnMessage && onReportMessage && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                onClick={() => onReportMessage(message.sender!, message.content, message.id)}
                title="إبلاغ عن الرسالة"
              >
                ⚠️
              </Button>
            )}
          </div>
          
          {/* محتوى الرسالة */}
          <div className="text-sm">
            {message.messageType === 'image' ? (
              <img 
                src={message.content} 
                alt="صورة" 
                className="max-w-full max-h-64 rounded-lg cursor-pointer hover:scale-105 transition-transform duration-200"
                onClick={() => window.open(message.content, '_blank')}
              />
            ) : (
              <div 
                className="whitespace-pre-wrap break-words"
                dangerouslySetInnerHTML={{ 
                  __html: renderMessageWithMentions(message.content, currentUser, onlineUsers) 
                }}
              />
            )}
          </div>
        </div>
      </div>
    );
  }, [currentUser, getMessageBorderColor, onUserClick, onReportMessage, formatTime, onlineUsers]);

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-blue-50 to-purple-50">
      {/* رأس منطقة الرسائل */}
      <div className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="text-2xl">💬</div>
          <div>
            <h2 className="font-bold text-lg">{currentRoomName}</h2>
            <p className="text-sm text-gray-600">
              {displayMessages.length} رسالة • {onlineUsers.length} متصل
            </p>
          </div>
        </div>
        
        {/* مؤشر الكتابة */}
        {typingUsers.size > 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span>
              {Array.from(typingUsers).join(', ')} يكتب...
            </span>
          </div>
        )}
      </div>

      {/* منطقة الرسائل */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
      >
        {displayMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-4xl mb-4">💬</div>
              <p>لا توجد رسائل بعد</p>
              <p className="text-sm">ابدأ المحادثة الآن!</p>
            </div>
          </div>
        ) : (
          displayMessages.map((message, index) => MessageComponent({ message }))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* منطقة إدخال الرسالة */}
      <div className="p-4 bg-white/80 backdrop-blur-sm border-t border-gray-200">
        <div className="flex gap-2">
          {/* حقل النص */}
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={messageText}
              onChange={handleMessageChange}
              onKeyPress={handleKeyPress}
              placeholder="اكتب رسالتك هنا..."
              className="pr-12 pl-4 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
              disabled={!currentUser}
            />
            
            {/* زر الإيموجي */}
            <Button
              variant="ghost"
              size="sm"
              className="absolute left-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 text-gray-500 hover:text-blue-500"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <Smile size={16} />
            </Button>
          </div>
          
          {/* زر رفع الصورة */}
          <Button
            variant="outline"
            size="sm"
            className="px-3 py-3 rounded-lg border-2 border-gray-300 hover:border-blue-500 transition-all duration-200"
            onClick={() => fileInputRef.current?.click()}
            disabled={!currentUser}
          >
            <ImageIcon size={16} />
          </Button>
          
          {/* زر الإرسال */}
          <Button
            onClick={handleSendMessage}
            disabled={!messageText.trim() || !currentUser}
            className="px-6 py-3 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={16} />
          </Button>
        </div>
        
        {/* اختيار الإيموجي */}
        {showEmojiPicker && (
          <div className="absolute bottom-20 left-4 z-50">
            <EmojiPicker onEmojiSelect={handleEmojiSelect} onClose={() => setShowEmojiPicker(false)} />
          </div>
        )}
        
        {/* إدخال الملفات */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>
    </div>
  );
}

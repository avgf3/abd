import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { formatTime } from '@/utils/timeUtils';
import { Input } from '@/components/ui/input';
import ProfileImage from './ProfileImage';
import EmojiPicker from './EmojiPicker';
import { getFinalUsernameColor } from '@/utils/themeUtils';
import { findMentions, playMentionSound, renderMessageWithMentions, insertMention } from '@/utils/mentionUtils';
import type { ChatMessage, ChatUser } from '@/types/chat';
import { Send, Image as ImageIcon, Smile } from "lucide-react";
import UserRoleBadge from './UserRoleBadge';
import { apiRequest } from '@/lib/queryClient';

interface MessageAreaProps {
  messages: ChatMessage[];
  currentUser: ChatUser | null;
  onSendMessage: (content: string, messageType?: string) => void;
  onTyping: () => void;
  typingUsers: Set<string>;
  onReportMessage?: (user: ChatUser, messageContent: string, messageId: number) => void;
  onUserClick?: (event: React.MouseEvent, user: ChatUser) => void;
  onlineUsers?: ChatUser[]; // إضافة قائمة المستخدمين المتصلين للمنشن
  currentRoomName?: string; // اسم الغرفة الحالية
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

  // 🔥 SIMPLIFIED message filtering - حذف الفلترة المعقدة التي تخفي رسائل صحيحة
  const validMessages = useMemo(() => {
    // ✅ فلترة بسيطة فقط لإزالة الرسائل الفارغة تماماً
    return messages.filter(msg => 
      msg && 
      msg.content && 
      msg.content.trim() !== '' &&
      msg.sender // التأكد من وجود بيانات المرسل الأساسية
    );
  }, [messages]);

  // Scroll to bottom function - optimized
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'end'
    });
  }, []);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    const timeout = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeout);
  }, [validMessages.length, scrollToBottom]);

  // تشغيل صوت التنبيه عند استقبال منشن - محسن
  useEffect(() => {
    if (validMessages.length > 0 && currentUser) {
      const lastMessage = validMessages[validMessages.length - 1];
      
      // فحص إذا كانت الرسالة الأخيرة تحتوي على منشن للمستخدم الحالي
      // وليست من المستخدم الحالي نفسه
      if (lastMessage.sender?.id !== currentUser.id && 
          lastMessage.content.includes(`@${currentUser.username}`)) {
        playMentionSound();
      }
    }
  }, [validMessages, currentUser]);

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

  // تم نقل دالة formatTime إلى utils/timeUtils.ts لتجنب التكرار

  // Get message border color - محسن
  const getMessageBorderColor = useCallback((userType?: string) => {
    switch (userType) {
      case 'owner':
        return 'border-r-yellow-400';
      case 'admin':
        return 'border-r-red-400';
      case 'moderator':
        return 'border-r-purple-400';
      case 'member':
        return 'border-r-blue-400';
      default:
        return 'border-r-green-400';
    }
  }, []);

  // Username click handler - معالج النقر على اسم المستخدم لإدراج المنشن
  const handleUsernameClick = useCallback((event: React.MouseEvent, user: ChatUser) => {
    event.stopPropagation();
    
    // إدراج اسم المستخدم في مربع النص
    const mention = `@${user.username} `;
    setMessageText(prev => prev + mention);
    
    // التركيز على مربع النص
    inputRef.current?.focus();
    
    // استدعاء callback إضافي إذا كان موجود
    if (onUserClick) {
      onUserClick(event, user);
    }
  }, [onUserClick]);

  // Format typing users display
  const typingDisplay = useMemo(() => {
    const typingArray = Array.from(typingUsers);
    if (typingArray.length === 0) return '';
    if (typingArray.length === 1) return `${typingArray[0]} يكتب...`;
    if (typingArray.length === 2) return `${typingArray[0]} و ${typingArray[1]} يكتبان...`;
    return `${typingArray.length} أشخاص يكتبون...`;
  }, [typingUsers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <section className="flex-1 flex flex-col bg-white">
      {/* Room Header */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-primary/20 p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
            <span className="text-primary font-bold">💬</span>
          </div>
          <div>
            <h2 className="font-bold text-lg text-primary">{currentRoomName}</h2>
            <p className="text-sm text-muted-foreground">
              {validMessages.length} رسالة • {typingDisplay || 'جاهز للدردشة'}
            </p>
          </div>
        </div>
      </div>
      
      {/* Messages Container */}
      <div className="flex-1 p-6 overflow-y-auto space-y-3 text-sm bg-gradient-to-b from-gray-50 to-white">
        {validMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <div className="text-6xl mb-4">💬</div>
            <p className="text-lg font-medium">أهلاً وسهلاً في {currentRoomName}</p>
            <p className="text-sm">ابدأ المحادثة بكتابة رسالتك الأولى</p>
          </div>
        ) : (
          validMessages.map((message) => (
            <div
              key={message.id}
              className={`flex items-center gap-3 p-3 rounded-lg border-r-4 ${getMessageBorderColor(message.sender?.userType)} bg-white shadow-sm hover:shadow-md transition-shadow duration-200`}
            >
              {/* System message: one-line red without avatar/badge */}
              {message.messageType === 'system' ? (
                <div className="w-full flex items-center justify-between text-red-600">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-semibold">النظام:</span>
                    <span className="truncate">{message.content}</span>
                  </div>
                  <span className="text-xs text-red-500 ml-2 whitespace-nowrap">{formatTime(message.timestamp)}</span>
                </div>
              ) : (
                <>
                  {/* Profile Image */}
                  {message.sender && (
                    <div className="flex-shrink-0">
                      <ProfileImage 
                        user={message.sender} 
                        size="small"
                        className="cursor-pointer hover:scale-110 transition-transform duration-200"
                      />
                    </div>
                  )}

                  {/* Inline row: badge, name, content */}
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    {message.sender && <UserRoleBadge user={message.sender} showOnlyIcon={true} />}
                    <button
                      onClick={(e) => message.sender && handleUsernameClick(e, message.sender)}
                      className="font-semibold hover:underline transition-colors duration-200 truncate"
                      style={{ color: getFinalUsernameColor(message.sender) }}
                    >
                      {message.sender?.username}
                    </button>

                    <div className="text-gray-800 break-words truncate flex-1">
                      {message.messageType === 'image' ? (
                        <img
                          src={message.content}
                          alt="صورة"
                          className="max-h-10 rounded cursor-pointer"
                          loading="lazy"
                          onClick={() => window.open(message.content, '_blank')}
                        />
                      ) : (
                        <span className="truncate">
                          {renderMessageWithMentions(message.content, currentUser, onlineUsers)}
                        </span>
                      )}
                    </div>

                    {/* Right side: time and report flag */}
                    <span className="text-xs text-gray-500 whitespace-nowrap ml-2">{formatTime(message.timestamp)}</span>

                    {onReportMessage && message.sender && currentUser && message.sender.id !== currentUser.id && (
                      <button
                        onClick={() => onReportMessage(message.sender!, message.content, message.id)}
                        className="text-sm hover:opacity-80"
                        title="تبليغ"
                      >
                        🚩
                      </button>
                    )}

                    {currentUser && message.sender && (() => {
                      const isOwner = currentUser.userType === 'owner';
                      const isAdmin = currentUser.userType === 'admin';
                      const isSender = currentUser.id === message.sender.id;
                      const canDelete = isSender || isOwner || isAdmin;
                      if (!canDelete) return null;
                      const handleDelete = async () => {
                        try {
                          await apiRequest(`/api/messages/${message.id}`, {
                            method: 'DELETE',
                            body: { userId: currentUser.id, roomId: message.roomId || 'general' }
                          });
                        } catch (e) {
                          console.error('خطأ في حذف الرسالة', e);
                        }
                      };
                      return (
                        <button
                          onClick={handleDelete}
                          className="text-xs text-gray-500 hover:text-gray-700 transition-colors duration-200"
                          title="حذف الرسالة"
                        >
                          🗑️
                        </button>
                      );
                    })()}
                  </div>
                </>
              )}
            </div>
          ))
        )}
        
        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message Input */}
      <div className="p-4 bg-gray-50 border-t">
        {/* Typing Indicator */}
        {typingUsers.size > 0 && (
          <div className="mb-2 text-xs text-gray-500 animate-pulse">
            {typingDisplay}
          </div>
        )}
        
        <div className="flex gap-3 items-end">
          {/* Emoji Picker */}
          <div className="relative">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="aspect-square"
            >
              <Smile className="w-4 h-4" />
            </Button>
            {showEmojiPicker && (
              <div className="absolute bottom-full mb-2 z-10">
                <EmojiPicker onEmojiSelect={handleEmojiSelect} onClose={() => setShowEmojiPicker(false)} />
              </div>
            )}
          </div>
          
          {/* File Upload */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="aspect-square"
          >
            <ImageIcon className="w-4 h-4" />
          </Button>
          
          {/* Message Input */}
          <Input
            ref={inputRef}
            value={messageText}
            onChange={handleMessageChange}
            onKeyPress={handleKeyPress}
            placeholder="اكتب رسالتك هنا..."
            className="flex-1 resize-none"
            disabled={!currentUser}
            maxLength={1000}
            autoComplete="off"
          />
          
          {/* Send Button */}
          <Button
            onClick={handleSendMessage}
            disabled={!messageText.trim() || !currentUser}
            className="aspect-square bg-primary hover:bg-primary/90"
          >
            <Send className="w-4 h-4" />
          </Button>
          
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
        
        {/* Character Counter */}
        {messageText.length > 800 && (
          <div className="mt-1 text-xs text-gray-500 text-left">
            {messageText.length}/1000 حرف
          </div>
        )}
      </div>
    </section>
  );
}

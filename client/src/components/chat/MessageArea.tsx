import { Send, Image as ImageIcon, Smile } from "lucide-react";
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';

import EmojiPicker from './EmojiPicker';
import ProfileImage from './ProfileImage';
import UserRoleBadge from './UserRoleBadge';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useIsMobile } from '@/hooks/use-mobile';
import { apiRequest } from '@/lib/queryClient';
import { api } from '@/lib/queryClient';
import type { ChatMessage, ChatUser } from '@/types/chat';
import { findMentions, playMentionSound, renderMessageWithMentions, insertMention } from '@/utils/mentionUtils';
import { getFinalUsernameColor } from '@/utils/themeUtils';
import { formatTime } from '@/utils/timeUtils';

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
  currentRoomId?: string; // معرف الغرفة الحالية
  ignoredUserIds?: Set<number>; // قائمة المتجاهلين لحجب الرسائل ظاهرياً
  compactHeader?: boolean; // تفعيل نمط مدمج للرأس والمسافات
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
  currentRoomName = 'الدردشة العامة',
  currentRoomId = 'general',
  ignoredUserIds,
  compactHeader = false
}: MessageAreaProps) {
  const [messageText, setMessageText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const isMobile = useIsMobile();
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const lastTypingTime = useRef<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const prevMessagesLenRef = useRef<number>(0);

  // State for improved scroll behavior
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // 🔥 SIMPLIFIED message filtering - حذف الفلترة المعقدة التي تخفي رسائل صحيحة
  const validMessages = useMemo(() => {
    // ✅ فلترة بسيطة فقط لإزالة الرسائل الفارغة تماماً
    const base = messages.filter(msg => 
      msg && 
      msg.content && 
      msg.content.trim() !== '' &&
      msg.sender // التأكد من وجود بيانات المرسل الأساسية
    );
    // ✅ حجب رسائل المستخدمين المتجاهَلين (حماية واجهة فقط؛ الخادم يمنع أيضاً للخاص)
    if (ignoredUserIds && ignoredUserIds.size > 0) {
      return base.filter(msg => !ignoredUserIds.has(msg.senderId));
    }
    return base;
  }, [messages, ignoredUserIds]);

  // Scroll to bottom function - optimized via Virtuoso
  type ScrollBehaviorStrict = 'auto' | 'smooth';
  const scrollToBottom = useCallback((behavior: ScrollBehaviorStrict = 'smooth') => {
    if (!virtuosoRef.current || validMessages.length === 0) return;
    virtuosoRef.current.scrollToIndex({ index: validMessages.length - 1, align: 'end', behavior });
  }, [validMessages.length]);

  // Track bottom state from Virtuoso
  const handleAtBottomChange = useCallback((atBottom: boolean) => {
    setIsAtBottom(atBottom);
    if (atBottom) setUnreadCount(0);
  }, []);

  // Auto scroll to bottom only when appropriate
  useEffect(() => {
    const prevLen = prevMessagesLenRef.current;
    const currLen = validMessages.length;
    if (currLen <= prevLen) return;

    const lastMessage = validMessages[currLen - 1];
    const sentByMe = !!(currentUser && lastMessage?.sender?.id === currentUser.id);

    // If first load, or user is at bottom, or the last message was sent by me, autoscroll
    if (prevLen === 0 || isAtBottom || sentByMe) {
      scrollToBottom(prevLen === 0 ? 'auto' : 'smooth');
      setUnreadCount(0);
    } else {
      setUnreadCount(count => count + (currLen - prevLen));
    }

    prevMessagesLenRef.current = currLen;
  }, [validMessages.length, isAtBottom, currentUser, scrollToBottom]);

  // Ensure initial prev length is set on mount
  useEffect(() => {
    prevMessagesLenRef.current = validMessages.length;
    // If there are messages on first mount, jump to bottom without animation
    if (validMessages.length > 0) {
      const t = setTimeout(() => scrollToBottom('auto'), 0);
      return () => clearTimeout(t);
    }
   
  }, []);

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
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    if (!file.type.startsWith('image/')) {
      alert('يرجى اختيار ملف صورة صحيح');
      if (fileInputRef.current) { fileInputRef.current.value = ''; }
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('حجم الصورة كبير جداً. الحد الأقصى 5MB');
      if (fileInputRef.current) { fileInputRef.current.value = ''; }
      return;
    }

    try {
      const form = new FormData();
      form.append('image', file);
      form.append('senderId', String(currentUser.id));
      form.append('roomId', currentRoomId || 'general');
      await api.upload('/api/upload/message-image', form, { timeout: 60000 });
      // سيتم بث الرسالة عبر الـ socket من الخادم فلا داعي لاستدعاء onSendMessage محلياً
    } catch (err) {
      console.error('رفع الصورة فشل:', err);
      alert('تعذر رفع الصورة، حاول مرة أخرى');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [currentUser, currentRoomId]);

  // تم نقل دالة formatTime إلى utils/timeUtils.ts لتجنب التكرار

  // لون حد الرسالة مرتبط بلون اسم المستخدم النهائي
  const getDynamicBorderColor = useCallback((sender?: ChatUser | null) => {
    if (!sender) return '#4ade80';
    const color = getFinalUsernameColor(sender);
    return color === '#000000' ? '#4ade80' : color;
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
    <section className="flex-1 flex flex-col bg-white min-h-0">
      {/* Room Header */}
      <div className={`bg-gradient-to-r from-primary/10 to-primary/5 border-b border-primary/20 ${compactHeader ? 'p-1.5' : 'p-2'}`}>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-primary/20 rounded-lg flex items-center justify-center">
            <span className="text-primary font-bold">💬</span>
          </div>
          <div>
            <h2 className={`font-bold ${compactHeader ? 'text-sm' : 'text-base'} text-black`}>{currentRoomName}</h2>
            {!compactHeader && (
              <p className="text-xs text-muted-foreground">
                {validMessages.length} رسالة • {typingDisplay || 'جاهز للدردشة'}
              </p>
            )}
          </div>
        </div>
      </div>
      
      {/* Messages Container - Virtualized */}
      <div className={`relative flex-1 ${compactHeader ? 'p-3' : 'p-4'} bg-gradient-to-b from-gray-50 to-white`}>
        {validMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <div className="text-6xl mb-4">💬</div>
            <p className="text-lg font-medium">أهلاً وسهلاً في {currentRoomName}</p>
            <p className="text-sm">ابدأ المحادثة بكتابة رسالتك الأولى</p>
          </div>
        ) : (
          <Virtuoso
            ref={virtuosoRef}
            data={validMessages}
            className="!h-full"
            style={{ paddingBottom: '128px' }}
            followOutput={'smooth'}
            atBottomStateChange={handleAtBottomChange}
            increaseViewportBy={{ top: 400, bottom: 400 }}
            itemContent={(index, message) => (
              <div
                key={message.id}
                className={`flex items-center gap-3 p-3 rounded-lg border-r-4 bg-white shadow-sm hover:shadow-md transition-shadow duration-200`}
                style={{ borderRightColor: getDynamicBorderColor(message.sender) }}
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
            )}
          />
        )}

        {/* Jump to bottom / New messages indicator */}
        {!isAtBottom && (
          <div className="absolute bottom-4 right-4 z-10">
            <button
              onClick={() => { scrollToBottom('smooth'); setUnreadCount(0); }}
              className="px-3 py-1.5 rounded-full text-xs bg-primary text-primary-foreground shadow"
            >
              {unreadCount > 0 ? `عرض ${unreadCount} رسالة جديدة` : 'الانتقال لأسفل'}
            </button>
          </div>
        )}
      </div>
      
      {/* Message Input - تحسين التثبيت لمنع التداخل */}
      <div className={`${compactHeader ? 'p-2.5' : 'p-3'} bg-white border-t border-gray-200 fixed bottom-0 left-0 right-0 z-20 shadow-lg chat-input`} style={{ transform: 'translateY(-80px)' }}>
        {/* Typing Indicator */}
        {typingUsers.size > 0 && (
          <div className="mb-1.5 text-[11px] text-gray-500 animate-pulse">
            {typingDisplay}
          </div>
        )}
        
        <div className={`flex ${isMobile ? 'gap-2' : 'gap-3'} items-end max-w-full mx-auto`} style={{ paddingBottom: isMobile ? 'env(safe-area-inset-bottom)' : '0' }}>
          {/* Emoji Picker */}
          <div className="relative">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`aspect-square mobile-touch-button ${isMobile ? 'min-w-[44px] min-h-[44px]' : ''}`}
            >
              <Smile className="w-4 h-4" />
            </Button>
            {showEmojiPicker && (
              <div className="absolute bottom-full mb-2 z-30">
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
            className={`aspect-square mobile-touch-button ${isMobile ? 'min-w-[44px] min-h-[44px]' : ''}`}
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
             className={`flex-1 resize-none bg-white text-gray-900 placeholder:text-gray-500 ring-offset-white ${isMobile ? 'mobile-text' : ''}`}
             disabled={!currentUser}
             maxLength={1000}
             autoComplete="off"
             style={isMobile ? { fontSize: '16px' } : {}}
           />
          
          {/* Send Button */}
          <Button
            onClick={handleSendMessage}
            disabled={!messageText.trim() || !currentUser}
            className={`aspect-square bg-primary hover:bg-primary/90 mobile-touch-button ${isMobile ? 'min-w-[44px] min-h-[44px]' : ''}`}
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
          <div className="mt-1 text-[11px] text-gray-500 text-left">
            {messageText.length}/1000 حرف
          </div>
        )}
      </div>
    </section>
  );
}

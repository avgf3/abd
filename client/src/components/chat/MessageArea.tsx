import { Send, Smile, ChevronDown, Sparkles, MoreVertical, Lock, UserX } from 'lucide-react';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';

const EmojiPicker = React.lazy(() => import('./EmojiPicker'));
const AnimatedEmojiPicker = React.lazy(() => import('./AnimatedEmojiPicker'));
const EmojiMartPicker = React.lazy(() => import('./EmojiMartPicker'));
const LottieEmojiPicker = React.lazy(() => import('./LottieEmojiPicker'));
const AnimatedEmojiEnhanced = React.lazy(() => import('./AnimatedEmojiEnhanced'));
const ComposerPlusMenu = React.lazy(() => import('./ComposerPlusMenu'));
import ProfileImage from './ProfileImage';
import UserRoleBadge from './UserRoleBadge';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ImageLightbox from '@/components/ui/ImageLightbox';
import { useIsMobile } from '@/hooks/use-mobile';
import { apiRequest, api } from '@/lib/queryClient';
import type { ChatMessage, ChatUser } from '@/types/chat';
import {
  findMentions,
  playMentionSound,
  renderMessageWithMentions,
  insertMention,
} from '@/utils/mentionUtils';
import { getDynamicBorderColor } from '@/utils/messageUtils';
import { getFinalUsernameColor } from '@/utils/themeUtils';
import { formatTime } from '@/utils/timeUtils';
// Removed ComposerPlusMenu (ready/quick options)
import { useComposerStyle } from '@/contexts/ComposerStyleContext';
import { renderMessageWithAnimatedEmojis, convertTextToAnimatedEmojis } from '@/utils/animatedEmojiUtils';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

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
  // Chat lock settings
  chatLockAll?: boolean; // قفل الدردشة بالكامل
  chatLockVisitors?: boolean; // قفل الدردشة للزوار فقط
  // compactHeader removed: we no longer render a room header bar
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
  chatLockAll = false,
  chatLockVisitors = false,
}: MessageAreaProps) {
  const [messageText, setMessageText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAnimatedEmojiPicker, setShowAnimatedEmojiPicker] = useState(false);
  const [showEmojiMart, setShowEmojiMart] = useState(false);
  const [showLottieEmoji, setShowLottieEmoji] = useState(false);
  const [showEnhancedEmoji, setShowEnhancedEmoji] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const isMobile = useIsMobile();
  const { textColor: composerTextColor, bold: composerBold } = useComposerStyle();

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

  // YouTube modal state
  const [youtubeModal, setYoutubeModal] = useState<{ open: boolean; videoId: string | null }>({
    open: false,
    videoId: null,
  });

  // Image lightbox state
  const [imageLightbox, setImageLightbox] = useState<{ open: boolean; src: string | null }>({
    open: false,
    src: null,
  });

  // Track expanded messages on mobile (for toggling clamp)
  const [expandedMessageIds, setExpandedMessageIds] = useState<Set<number>>(new Set());
  const isMessageExpanded = useCallback(
    (id: number) => expandedMessageIds.has(id),
    [expandedMessageIds]
  );
  const toggleMessageExpanded = useCallback((id: number) => {
    setExpandedMessageIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Check if user is restricted from chatting
  const isChatRestricted = useMemo(() => {
    if (!currentUser) return true;
    
    const isOwner = currentUser.userType === 'owner';
    const isGuest = currentUser.userType === 'guest';
    
    // Owner can always chat
    if (isOwner) return false;
    
    // If chat is locked for all users, only owner can chat
    if (chatLockAll) return true;
    
    // If chat is locked for visitors only, restrict guests
    if (chatLockVisitors && isGuest) return true;
    
    return false;
  }, [currentUser, chatLockAll, chatLockVisitors]);

  // Get restriction message
  const getRestrictionMessage = useMemo(() => {
    if (!currentUser || !isChatRestricted) return '';
    
    const isGuest = currentUser.userType === 'guest';
    
    if (chatLockAll) {
      return 'هذه الخاصية غير متوفرة الآن';
    }
    
    if (chatLockVisitors && isGuest) {
      return 'هذه الخاصية غير متوفرة الآن';
    }
    
    return '';
  }, [currentUser, isChatRestricted, chatLockAll, chatLockVisitors]);

  const isAllowedYouTubeHost = useCallback((host: string) => {
    const h = host.toLowerCase();
    return (
      h === 'youtube.com' ||
      h === 'www.youtube.com' ||
      h === 'm.youtube.com' ||
      h === 'youtu.be' ||
      h === 'www.youtu.be' ||
      h === 'youtube-nocookie.com' ||
      h === 'www.youtube-nocookie.com'
    );
  }, []);

  const extractYouTubeId = useCallback((rawUrl: string): string | null => {
    try {
      let u = rawUrl.trim();
      if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
      const url = new URL(u);
      if (!isAllowedYouTubeHost(url.hostname)) return null;
      const v = url.searchParams.get('v');
      if (v && /^[a-zA-Z0-9_-]{6,15}$/.test(v)) return v;
      if (/^\/(shorts|embed)\//.test(url.pathname)) {
        const id = url.pathname.split('/')[2] || '';
        return /^[a-zA-Z0-9_-]{6,15}$/.test(id) ? id : null;
      }
      if (url.hostname.toLowerCase().includes('youtu.be')) {
        const id = url.pathname.replace(/^\//, '');
        return /^[a-zA-Z0-9_-]{6,15}$/.test(id) ? id : null;
      }
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length > 0) {
        const last = parts[parts.length - 1];
        if (/^[a-zA-Z0-9_-]{6,15}$/.test(last)) return last;
      }
      return null;
    } catch {
      return null;
    }
  }, [isAllowedYouTubeHost]);

  const parseYouTubeFromText = useCallback((text: string): { cleaned: string; ids: string[] } => {
    if (!text) return { cleaned: '', ids: [] };
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
    const matches = text.match(urlRegex) || [];
    const ids: string[] = [];
    for (const m of matches) {
      const id = extractYouTubeId(m);
      if (id) ids.push(id);
    }
    let cleaned = text;
    for (const m of matches) {
      if (extractYouTubeId(m)) {
        cleaned = cleaned.split(m).join('').replace(/\s{2,}/g, ' ').trim();
      }
    }
    return { cleaned, ids };
  }, [extractYouTubeId]);

  // 🔥 SIMPLIFIED message filtering - حذف الفلترة المعقدة التي تخفي رسائل صحيحة
  const validMessages = useMemo(() => {
    // ✅ فلترة بسيطة فقط لإزالة الرسائل الفارغة تماماً
    const base = messages.filter(
      (msg) => msg && msg.content && msg.content.trim() !== '' && msg.sender // التأكد من وجود بيانات المرسل الأساسية
    );
    // ✅ حجب رسائل المستخدمين المتجاهَلين (حماية واجهة فقط؛ الخادم يمنع أيضاً للخاص)
    if (ignoredUserIds && ignoredUserIds.size > 0) {
      return base.filter((msg) => !ignoredUserIds.has(msg.senderId));
    }
    return base;
  }, [messages, ignoredUserIds]);

  const showScrollToBottom = !isAtBottom && validMessages.length > 0;

  // Scroll to bottom function - optimized via Virtuoso
  type ScrollBehaviorStrict = 'auto' | 'smooth';
  const scrollToBottom = useCallback(
    (behavior: ScrollBehaviorStrict = 'smooth') => {
      if (!virtuosoRef.current || validMessages.length === 0) return;
      virtuosoRef.current.scrollToIndex({
        index: validMessages.length - 1,
        align: 'end',
        behavior,
      });
    },
    [validMessages.length]
  );

  // Track bottom state from Virtuoso
  const handleAtBottomChange = useCallback((atBottom: boolean) => {
    setIsAtBottom(atBottom);
    if (atBottom) setUnreadCount(0);
  }, []);

  const handleScrollDownClick = useCallback(() => {
    scrollToBottom('smooth');
    setUnreadCount(0);
  }, [scrollToBottom]);

  // Auto scroll to bottom only when appropriate
  useEffect(() => {
    const prevLen = prevMessagesLenRef.current;
    const currLen = validMessages.length;
    
    // Handle room change or first load - always scroll to bottom
    if (prevLen === 0 && currLen > 0) {
      setTimeout(() => {
        scrollToBottom('auto');
        setIsAtBottom(true);
        setUnreadCount(0);
      }, 150);
      prevMessagesLenRef.current = currLen;
      return;
    }

    if (currLen <= prevLen) return;

    const lastMessage = validMessages[currLen - 1];
    const sentByMe = !!(currentUser && lastMessage?.sender?.id === currentUser.id);

    // If user is at bottom, or the last message was sent by me, autoscroll
    if (isAtBottom || sentByMe) {
      scrollToBottom('smooth');
      setUnreadCount(0);
    } else {
      setUnreadCount((count) => count + (currLen - prevLen));
    }

    prevMessagesLenRef.current = currLen;
  }, [validMessages.length, isAtBottom, currentUser, scrollToBottom]);

  // Ensure initial prev length is set on mount and auto-scroll
  useEffect(() => {
    prevMessagesLenRef.current = validMessages.length;
    // Always scroll to bottom on first mount, even if no messages yet
    // This ensures proper positioning when entering a room
    const t = setTimeout(() => {
      scrollToBottom('auto');
      setIsAtBottom(true);
    }, 100);
    return () => clearTimeout(t);
  }, [scrollToBottom]);

  // تشغيل صوت التنبيه عند استقبال منشن - محسن
  useEffect(() => {
    if (validMessages.length > 0 && currentUser) {
      const lastMessage = validMessages[validMessages.length - 1];

      // فحص إذا كانت الرسالة الأخيرة تحتوي على منشن للمستخدم الحالي
      // وليست من المستخدم الحالي نفسه
      if (
        lastMessage.sender?.id !== currentUser.id &&
        lastMessage.content.includes(currentUser.username)
      ) {
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
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      } else if (e.key !== 'Enter') {
        // إرسال إشعار الكتابة فقط عند الكتابة الفعلية
        handleTypingThrottled();
      }
    },
    [handleSendMessage, handleTypingThrottled]
  );

  // Message text change handler
  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value);
  }, []);

  // Emoji select handler
  const handleEmojiSelect = useCallback((emoji: string) => {
    setMessageText((prev) => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  }, []);

  // Animated Emoji select handler
  const handleAnimatedEmojiSelect = useCallback((emoji: { id: string; url: string; name: string; code: string }) => {
    // إدراج كود السمايل في الرسالة
    setMessageText((prev) => prev + ` [[emoji:${emoji.id}:${emoji.url}]] `);
    setShowAnimatedEmojiPicker(false);
    inputRef.current?.focus();
  }, []);

  // Emoji Mart handler
  const handleEmojiMartSelect = useCallback((emoji: any) => {
    if (emoji.src) {
      // إيموجي مخصص (GIF)
      setMessageText((prev) => prev + ` [[emoji:${emoji.id}:${emoji.src}]] `);
    } else {
      // إيموجي عادي
      setMessageText((prev) => prev + emoji.native);
    }
    setShowEmojiMart(false);
    inputRef.current?.focus();
  }, []);

  // Lottie Emoji handler
  const handleLottieEmojiSelect = useCallback((emoji: { id: string; name: string; url: string }) => {
    setMessageText((prev) => prev + ` [[lottie:${emoji.id}:${emoji.url}]] `);
    setShowLottieEmoji(false);
    inputRef.current?.focus();
  }, []);

  // Enhanced Emoji handler
  const handleEnhancedEmojiSelect = useCallback((emoji: { id: string; emoji: string; name: string; code: string }) => {
    setMessageText((prev) => prev + emoji.emoji);
    setShowEnhancedEmoji(false);
    inputRef.current?.focus();
  }, []);

  // File upload handler - محسن
  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !currentUser) return;

      // التحقق من الصلاحيات
      const isAuthorized = currentUser && (
        currentUser.userType === 'owner' || 
        currentUser.userType === 'admin' || 
        currentUser.userType === 'moderator'
      );
      
      if (!isAuthorized) {
        alert('هذه الميزة متاحة للمشرفين فقط');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      if (!file.type.startsWith('image/')) {
        alert('يرجى اختيار ملف صورة صحيح');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('حجم الصورة كبير جداً. الحد الأقصى 5MB');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
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
    },
    [currentUser, currentRoomId]
  );

  // تم نقل دالة formatTime إلى utils/timeUtils.ts لتجنب التكرار

  // لون حد الرسالة موحد عبر أداة utils

  // Username click handler - معالج النقر على اسم المستخدم لإدراج المنشن
  const handleUsernameClick = useCallback(
    (event: React.MouseEvent, user: ChatUser) => {
      event.stopPropagation();

      // إدراج اسم المستخدم في مربع النص بدون رمز @
      setMessageText((prev) => {
        const separator = prev.trim() ? ' ' : '';
        return prev + separator + user.username + ' ';
      });

      // التركيز على مربع النص
      inputRef.current?.focus();
    },
    []
  );

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
    <section className={`flex-1 flex flex-col bg-white min-h-0 ${isMobile ? 'mobile-message-area' : ''}`}>
      {/* Chat Lock Status Indicator */}
      {(chatLockAll || chatLockVisitors) && (
        <div className={`px-4 py-2 text-center text-sm font-medium border-b ${
          chatLockAll 
            ? 'bg-red-100 text-red-800 border-red-200' 
            : 'bg-yellow-100 text-yellow-800 border-yellow-200'
        }`}>
          {chatLockAll && (
            <div className="flex items-center justify-center gap-2">
              <Lock className="w-4 h-4" />
              <span>الدردشة مقفلة</span>
            </div>
          )}
          {chatLockVisitors && !chatLockAll && (
            <div className="flex items-center justify-center gap-2">
              <UserX className="w-4 h-4" />
              <span>الدردشة مقفلة للزوار - يجب التسجيل للمشاركة</span>
            </div>
          )}
        </div>
      )}

      {/* Messages Container - Virtualized */}
      <div
        className={`relative flex-1 ${isMobile ? 'p-2' : 'p-4'} bg-gradient-to-b from-gray-50 to-white`}
        style={{ 
          paddingBottom: isMobile ? '120px' : '100px' // مساحة لمنطقة الإدخال الثابتة
        }}
      >
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
            style={{ paddingBottom: '24px' }}
            followOutput={'smooth'}
            atBottomThreshold={64}
            atBottomStateChange={handleAtBottomChange}
            increaseViewportBy={{ top: 400, bottom: 400 }}
            itemContent={(index, message) => (
              <div
                key={message.id}
                className={`flex ${isMobile ? 'items-start' : 'items-center'} gap-2 p-2 rounded-lg border-r-4 bg-white shadow-sm hover:shadow-md transition-all duration-300 room-message-pulse soft-entrance`}
                style={{ borderRightColor: getDynamicBorderColor(message.sender) }}
              >
                {/* System message: one-line red without avatar/badge */}
                {message.messageType === 'system' ? (
                  <>
                    {message.sender && (
                      <div className="flex-shrink-0">
                        <ProfileImage
                          user={message.sender}
                          size="small"
                          className="w-7 h-7 cursor-pointer hover:scale-110 transition-transform duration-200"
                          onClick={(e) => onUserClick && onUserClick(e, message.sender!)}
                        />
                      </div>
                    )}
                    <div className={`flex-1 min-w-0 flex ${isMobile ? 'flex-wrap items-start' : 'items-center'} gap-2`}>
                      {message.sender && message.sender.userType !== 'bot' && (
                        <UserRoleBadge user={message.sender} showOnlyIcon={true} hideGuestAndGender={true} size={16} />
                      )}
                      <button
                        onClick={(e) => message.sender && handleUsernameClick(e, message.sender)}
                        className="font-semibold hover:underline transition-colors duration-200 truncate"
                        style={{ color: getFinalUsernameColor(message.sender) }}
                      >
                        {message.sender?.username}
                      </button>
                      <div className={`text-red-600 break-words flex-1 min-w-0 message-content-fix ${isMobile && !isMessageExpanded(message.id) ? 'line-clamp-2' : !isMobile ? 'truncate' : ''}`}>
                        <span dir="auto" className={`${isMobile && !isMessageExpanded(message.id) ? 'line-clamp-2' : !isMobile ? 'truncate' : ''}`}>
                          {message.content}
                        </span>
                      </div>
                      <span className="text-xs text-red-500 whitespace-nowrap ml-2">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Profile Image */}
                    {message.sender && (
                      <div className="flex-shrink-0">
                        <ProfileImage
                          user={message.sender}
                          size="small"
                          className="w-7 h-7 cursor-pointer hover:scale-110 transition-transform duration-200"
                          onClick={(e) => onUserClick && onUserClick(e, message.sender!)}
                        />
                      </div>
                    )}

                    {/* Inline row: badge, name, content */}
                    <div className={`flex-1 min-w-0 flex ${isMobile ? 'flex-wrap items-start' : 'items-center'} gap-2`}>
                      {message.sender && message.sender.userType !== 'bot' && (
                        <UserRoleBadge user={message.sender} showOnlyIcon={true} hideGuestAndGender={true} size={16} />
                      )}
                      <button
                        onClick={(e) => message.sender && handleUsernameClick(e, message.sender)}
                        className="font-semibold hover:underline transition-colors duration-200 truncate"
                        style={{ color: getFinalUsernameColor(message.sender) }}
                      >
                        {message.sender?.username}
                      </button>

                      <div className={`text-gray-800 break-words flex-1 min-w-0 message-content-fix ${isMobile && !isMessageExpanded(message.id) ? 'line-clamp-2' : !isMobile ? 'truncate' : ''}`}>
                        {message.messageType === 'image' ? (
                          <img
                            src={message.content}
                            alt="صورة"
                            className="max-h-7 rounded cursor-pointer"
                            loading="lazy"
                            onLoad={() => {
                              if (isAtBottom) {
                                scrollToBottom('auto');
                              }
                            }}
                            onClick={() => setImageLightbox({ open: true, src: message.content })}
                          />
                        ) : (
                          (() => {
                            const { cleaned, ids } = parseYouTubeFromText(message.content);
                            if (ids.length > 0) {
                              const firstId = ids[0];
                              return (
                                <span dir="auto" className={`${isMobile && !isMessageExpanded(message.id) ? 'line-clamp-2' : !isMobile ? 'truncate' : ''} text-breathe flex items-center gap-2`} onClick={() => isMobile && toggleMessageExpanded(message.id)}>
                                  {cleaned ? (
                                    <span
                                      className={`${isMobile && !isMessageExpanded(message.id) ? 'line-clamp-2' : !isMobile ? 'truncate' : ''}`}
                                      style={
                                        currentUser && message.senderId === currentUser.id
                                          ? { color: composerTextColor, fontWeight: composerBold ? 600 : undefined }
                                          : undefined
                                      }
                                    >
                                      {renderMessageWithAnimatedEmojis(
                                        cleaned,
                                        (text) => renderMessageWithMentions(text, currentUser, onlineUsers)
                                      )}
                                    </span>
                                  ) : null}
                                  <button
                                    onClick={() => setYoutubeModal({ open: true, videoId: firstId })}
                                    className="flex items-center justify-center w-8 h-6 rounded bg-red-600 hover:bg-red-700 transition-colors"
                                    title="فتح فيديو YouTube"
                                  >
                                    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                                      <path fill="#fff" d="M10 15l5.19-3L10 9v6z"></path>
                                    </svg>
                                  </button>
                                </span>
                              );
                            }
                            return (
                              <span
                                dir="auto"
                                className={`${isMobile && !isMessageExpanded(message.id) ? 'line-clamp-2' : !isMobile ? 'truncate' : ''} text-breathe`}
                                onClick={() => isMobile && toggleMessageExpanded(message.id)}
                                style={
                                  currentUser && message.senderId === currentUser.id
                                    ? { color: composerTextColor, fontWeight: composerBold ? 600 : undefined }
                                    : undefined
                                }
                              >
                                {renderMessageWithAnimatedEmojis(
                                  message.content, 
                                  (text) => renderMessageWithMentions(text, currentUser, onlineUsers)
                                )}
                              </span>
                            );
                          })()
                        )}
                      </div>

                      {/* Right side: time and report flag */}
                      <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                        {formatTime(message.timestamp)}
                      </span>

                      {onReportMessage &&
                        message.sender &&
                        currentUser &&
                        message.sender.id !== currentUser.id && (
                          <button
                            onClick={() =>
                              onReportMessage(message.sender!, message.content, message.id)
                            }
                            className="text-sm hover:opacity-80"
                            title="تبليغ"
                          >
                            🚩
                          </button>
                        )}

                      {currentUser &&
                        message.sender &&
                        (() => {
                          const isOwner = currentUser.userType === 'owner';
                          const isAdmin = currentUser.userType === 'admin';
                          const isSender = currentUser.id === message.sender.id;
                          const canDelete = isSender || isOwner || isAdmin;
                          if (!canDelete) return null;
                          const handleDelete = async () => {
                            try {
                              await apiRequest(`/api/messages/${message.id}`, {
                                method: 'DELETE',
                                body: {
                                  userId: currentUser.id,
                                  roomId: message.roomId || 'general',
                                },
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
                      {/* Reactions (like/dislike/heart) */}
                      {currentUser && !message.isPrivate && !isMobile && (
                        <div className="flex items-center gap-1 ml-2">
                          {(['like', 'dislike', 'heart'] as const).map((r) => {
                            const isMine = message.myReaction === r;
                            const count = message.reactions?.[r] ?? 0;
                            const label = r === 'like' ? '👍' : r === 'dislike' ? '👎' : '❤️';
                            const toggle = async () => {
                              try {
                                if (isMine) {
                                  await apiRequest(
                                    `/api/messages/${message.id}/reactions`,
                                    {
                                      method: 'DELETE',
                                    }
                                  );
                                } else {
                                  await apiRequest(
                                    `/api/messages/${message.id}/reactions`,
                                    {
                                      method: 'POST',
                                      body: { type: r },
                                    }
                                  );
                                }
                              } catch (e) {
                                console.error('reaction error', e);
                              }
                            };
                            return (
                              <button
                                key={r}
                                onClick={toggle}
                                className={`text-xs px-1 py-0.5 rounded ${isMine ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:text-gray-800'}`}
                                title={r}
                              >
                                <span className="mr-0.5">{label}</span>
                                <span>{count}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Mobile: reactions in a three-dots menu */}
                      {currentUser && !message.isPrivate && isMobile && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="h-6 w-6 p-0 text-gray-600 hover:text-gray-900"
                              title="المزيد"
                              aria-label="المزيد"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" sideOffset={6} className="min-w-[160px]">
                            {(['like', 'dislike', 'heart'] as const).map((r) => {
                              const isMine = message.myReaction === r;
                              const count = message.reactions?.[r] ?? 0;
                              const label = r === 'like' ? '👍 إعجاب' : r === 'dislike' ? '👎 عدم إعجاب' : '❤️ قلب';
                              const toggle = async () => {
                                try {
                                  if (isMine) {
                                    await apiRequest(`/api/messages/${message.id}/reactions`, { method: 'DELETE' });
                                  } else {
                                    await apiRequest(`/api/messages/${message.id}/reactions`, { method: 'POST', body: { type: r } });
                                  }
                                } catch (e) {
                                  console.error('reaction error', e);
                                }
                              };
                              return (
                                <DropdownMenuItem key={r} onClick={toggle} className={`flex items-center justify-between gap-2 ${isMine ? 'text-primary' : ''}`}>
                                  <span>{label}</span>
                                  <span className="text-xs text-gray-500">{count}</span>
                                </DropdownMenuItem>
                              );
                            })}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          />
        )}
        {showScrollToBottom && (
          <button
            onClick={handleScrollDownClick}
            className="absolute left-1/2 -translate-x-1/2 bottom-32 bg-primary text-white shadow-lg rounded-full px-3 py-1.5 flex items-center gap-2 hover:bg-primary/90 transition-colors z-10"
            title="الانتقال لآخر الرسائل"
          >
            <ChevronDown className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="text-xs bg-white/20 rounded px-1.5 py-0.5">
                {unreadCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* YouTube Modal */}
      <Dialog
        open={youtubeModal.open}
        onOpenChange={(open) => {
          if (!open) setYoutubeModal({ open: false, videoId: null });
        }}
      >
        <DialogContent className="max-w-3xl w-[92vw] p-2 bg-black/80">
          <DialogHeader>
            <DialogTitle>مشغل فيديو يوتيوب</DialogTitle>
          </DialogHeader>
          <div className="flex justify-end">
            <button
              onClick={() => setYoutubeModal({ open: false, videoId: null })}
              className="text-white/90 hover:text-white text-xl leading-none"
              aria-label="إغلاق"
            >
              ✖️
            </button>
          </div>
          <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
            {youtubeModal.videoId && (
              <iframe
                src={`https://www.youtube.com/embed/${youtubeModal.videoId}`}
                className="absolute inset-0 w-full h-full rounded"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                title="تشغيل فيديو من يوتيوب"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Lightbox */}
      <ImageLightbox
        open={imageLightbox.open}
        src={imageLightbox.src}
        onOpenChange={(open) => {
          if (!open) setImageLightbox({ open: false, src: null });
        }}
      />

      {/* Message Input - مثبت في الأسفل */}
      <div
        className={`fixed bottom-0 left-0 right-0 p-3 bg-white border-t border-gray-200 w-full z-20 shadow-lg chat-input soft-entrance`}
        style={{ 
          paddingBottom: isMobile ? 'calc(env(safe-area-inset-bottom) + 0.75rem)' : '1rem'
        }}
      >
        {/* Typing Indicator */}
        {typingUsers.size > 0 && (
          <div className="mb-1.5 text-[11px] text-gray-500 animate-pulse">{typingDisplay}</div>
        )}

        <div
          className={`flex ${isMobile ? 'gap-2 p-3' : 'gap-3 p-4'} items-end max-w-full mx-auto bg-white/80 backdrop-blur-sm`}
        >
          {/* Emoji Picker */}
          <div className="relative">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              disabled={isChatRestricted}
              className={`aspect-square mobile-touch-button ${isMobile ? 'min-w-[44px] min-h-[44px]' : ''} ${isChatRestricted ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <Smile className="w-4 h-4" />
            </Button>
            {showEmojiPicker && (
              <div className="absolute bottom-full mb-2 z-30">
                <React.Suspense fallback={null}>
                  <EmojiPicker
                    onEmojiSelect={handleEmojiSelect}
                    onClose={() => setShowEmojiPicker(false)}
                  />
                </React.Suspense>
              </div>
            )}
          </div>

          {/* Animated Emoji Options */}
          <div className="relative">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                // إغلاق جميع المنتقات الأخرى
                setShowEmojiPicker(false);
                setShowAnimatedEmojiPicker(false);
                setShowEmojiMart(false);
                setShowLottieEmoji(false);
                // فتح المنتقي المحسن
                setShowEnhancedEmoji(!showEnhancedEmoji);
              }}
              disabled={isChatRestricted}
              className={`aspect-square mobile-touch-button ${isMobile ? 'min-w-[44px] min-h-[44px]' : ''} ${isChatRestricted ? 'opacity-60 cursor-not-allowed' : ''}`}
              title="سمايلات متحركة متقدمة"
            >
              <Sparkles className="w-4 h-4" />
            </Button>
            
            {/* Enhanced Emoji Picker (Default) */}
            {showEnhancedEmoji && (
              <div className="absolute bottom-full mb-2 z-30">
                <React.Suspense fallback={null}>
                  <AnimatedEmojiEnhanced
                    onEmojiSelect={handleEnhancedEmojiSelect}
                    onClose={() => setShowEnhancedEmoji(false)}
                  />
                </React.Suspense>
              </div>
            )}
            
            {/* Original Animated Emoji Picker */}
            {showAnimatedEmojiPicker && (
              <div className="absolute bottom-full mb-2 z-30">
                <React.Suspense fallback={null}>
                  <AnimatedEmojiPicker
                    onEmojiSelect={handleAnimatedEmojiSelect}
                    onClose={() => setShowAnimatedEmojiPicker(false)}
                  />
                </React.Suspense>
              </div>
            )}
            
            {/* Emoji Mart Picker */}
            {showEmojiMart && (
              <div className="absolute bottom-full mb-2 z-30">
                <React.Suspense fallback={null}>
                  <EmojiMartPicker
                    onEmojiSelect={handleEmojiMartSelect}
                    onClose={() => setShowEmojiMart(false)}
                  />
                </React.Suspense>
              </div>
            )}
            
            {/* Lottie Emoji Picker */}
            {showLottieEmoji && (
              <div className="absolute bottom-full mb-2 z-30">
                <React.Suspense fallback={null}>
                  <LottieEmojiPicker
                    onEmojiSelect={handleLottieEmojiSelect}
                    onClose={() => setShowLottieEmoji(false)}
                  />
                </React.Suspense>
              </div>
            )}
          </div>

          {/* Composer Plus Menu */}
          <React.Suspense fallback={null}>
            <ComposerPlusMenu
              onOpenImagePicker={() => fileInputRef.current?.click()}
              disabled={!currentUser || isChatRestricted}
              isMobile={isMobile}
              currentUser={currentUser}
            />
          </React.Suspense>

          {/* Message Input */}
          <Input
            ref={inputRef}
            value={messageText}
            onChange={handleMessageChange}
            onKeyPress={handleKeyPress}
            placeholder={isChatRestricted ? getRestrictionMessage : "اكتب رسالتك هنا..."}
            className={`flex-1 resize-none bg-white placeholder:text-gray-500 ring-offset-white ${isMobile ? 'mobile-text' : ''} ${isChatRestricted ? 'cursor-not-allowed opacity-60' : ''}`}
            disabled={!currentUser || isChatRestricted}
            maxLength={1000}
            autoComplete="off"
            style={{
              ...(isMobile ? { fontSize: '16px' } : {}),
              color: composerTextColor,
              fontWeight: composerBold ? 600 : undefined,
            }}
          />

          {/* Send Button */}
          <Button
            onClick={handleSendMessage}
            disabled={!messageText.trim() || !currentUser || isChatRestricted}
            className={`aspect-square bg-primary hover:bg-primary/90 mobile-touch-button ${isMobile ? 'min-w-[44px] min-h-[44px]' : ''} ${isChatRestricted ? 'opacity-60 cursor-not-allowed' : ''}`}
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

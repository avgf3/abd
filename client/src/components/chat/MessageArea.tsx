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
import { Dialog, FloatingDialogContent } from '@/components/ui/dialog';
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
  // حد أقصى لعدد الأحرف في الكتابة (سطح المكتب والهاتف)
  const MAX_CHARS = 192;
  const clampToMaxChars = useCallback((text: string) => (text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) : text), [MAX_CHARS]);


  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const lastTypingTime = useRef<number>(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
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

  const showScrollToBottom = false; // إخفاء الزر السفلي بشكل دائم بناءً على الطلب

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
      scrollToBottom('auto');
      setIsAtBottom(true);
      setUnreadCount(0);
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
    scrollToBottom('auto');
    setIsAtBottom(true);
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

  // تم تعطيل إشعار الكتابة في غرف الدردشة العامة
  const handleTypingThrottled = useCallback(() => {
    return;
  }, []);

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
      inputRef.current?.focus();
    }
  }, [messageText, currentUser, onSendMessage]);

  // Key press handler - إرسال بالـ Enter فقط (منع Shift+Enter)
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSendMessage();
        return;
      }
    },
    [handleSendMessage]
  );

  // Message text change handler مع تقليم إلى 192 حرفًا ومنع الأسطر المتعددة
  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = clampToMaxChars(e.target.value.replace(/\n/g, ' ')); // استبدال أسطر جديدة بمسافات
    setMessageText(next);
  }, [clampToMaxChars]);

  // Paste handler مع تقليم إلى 192 حرفًا ومنع الأسطر المتعددة
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    try {
      const paste = e.clipboardData.getData('text').replace(/\n/g, ' '); // استبدال أسطر جديدة بمسافات
      const el = e.currentTarget;
      const selectionStart = el.selectionStart ?? messageText.length;
      const selectionEnd = el.selectionEnd ?? messageText.length;
      const combined = messageText.slice(0, selectionStart) + paste + messageText.slice(selectionEnd);
      const next = clampToMaxChars(combined);
      if (next !== combined) {
        e.preventDefault();
        setMessageText(next);
      }
    } catch {
      // ignore
    }
  }, [messageText, clampToMaxChars]);

  // تم إزالة منطق ضبط الارتفاع - الآن يعتمد على الكلاسات الافتراضية فقط

  // Emoji select handler
  const handleEmojiSelect = useCallback((emoji: string) => {
    const newText = clampToMaxChars(messageText + emoji);
    setMessageText(newText);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  }, [messageText, clampToMaxChars]);

  // Animated Emoji select handler
  const handleAnimatedEmojiSelect = useCallback((emoji: { id: string; url: string; name: string; code: string }) => {
    // إدراج كود السمايل في الرسالة
    const newText = clampToMaxChars(messageText + ` [[emoji:${emoji.id}:${emoji.url}]] `);
    setMessageText(newText);
    setShowAnimatedEmojiPicker(false);
    inputRef.current?.focus();
  }, [messageText, clampToMaxChars]);

  // Emoji Mart handler
  const handleEmojiMartSelect = useCallback((emoji: any) => {
    let newText;
    if (emoji.src) {
      // إيموجي مخصص (GIF)
      newText = clampToMaxChars(messageText + ` [[emoji:${emoji.id}:${emoji.src}]] `);
    } else {
      // إيموجي عادي
      newText = clampToMaxChars(messageText + emoji.native);
    }
    setMessageText(newText);
    setShowEmojiMart(false);
    inputRef.current?.focus();
  }, [messageText, clampToMaxChars]);

  // Lottie Emoji handler
  const handleLottieEmojiSelect = useCallback((emoji: { id: string; name: string; url: string }) => {
    const newText = clampToMaxChars(messageText + ` [[lottie:${emoji.id}:${emoji.url}]] `);
    setMessageText(newText);
    setShowLottieEmoji(false);
    inputRef.current?.focus();
  }, [messageText, clampToMaxChars]);

  // Enhanced Emoji handler
  const handleEnhancedEmojiSelect = useCallback((emoji: { id: string; emoji: string; name: string; code: string }) => {
    const newText = clampToMaxChars(messageText + emoji.emoji);
    setMessageText(newText);
    setShowEnhancedEmoji(false);
    inputRef.current?.focus();
  }, [messageText, clampToMaxChars]);

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
      const separator = messageText.trim() ? ' ' : '';
      const newText = clampToMaxChars(messageText + separator + user.username + ' ');
      setMessageText(newText);

      // التركيز على مربع النص
      inputRef.current?.focus();
    },
    [messageText, clampToMaxChars]
  );

  // تم تعطيل عرض مؤشر الكتابة في الغرف

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
        className={`relative flex-1 p-2 bg-gradient-to-b from-gray-50 to-white`}
      >
        {validMessages.length === 0 ? (
          <div className="h-full"></div>
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
                className={`flex ${isMobile ? 'items-start' : 'items-center'} gap-2 py-1.5 px-2 rounded-lg border-r-4 bg-white shadow-sm hover:shadow-md transition-all duration-300 room-message-pulse soft-entrance`}
                style={{ borderRightColor: getDynamicBorderColor(message.sender) }}
                data-message-type={message.messageType || 'normal'}
              >
                {/* System message: optimized layout for both mobile and desktop */}
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
                    <div className={`flex-1 min-w-0`}>
                      {/* Unified layout for both mobile and desktop */}
                      <div className={`flex items-start gap-2 ${isMobile ? 'system-message-mobile' : ''}`}>
                        {/* Name and badge section - fixed width */}
                        <div className="flex items-center gap-1 shrink-0">
                          {message.sender && (message.sender.userType as any) !== 'bot' && (
                            <UserRoleBadge user={message.sender} showOnlyIcon={true} hideGuestAndGender={true} size={16} />
                          )}
                          <button
                            onClick={(e) => message.sender && handleUsernameClick(e, message.sender)}
                            className="font-semibold hover:underline transition-colors duration-200 text-sm"
                            style={{ color: getFinalUsernameColor(message.sender) }}
                          >
                            {message.sender?.username || 'جاري التحميل...'}
                          </button>
                          <span className="text-red-400 mx-1">:</span>
                        </div>

                        {/* Content section - flexible width */}
                        <div className={`flex-1 min-w-0 text-red-600 break-words message-content-fix ${isMobile ? 'system-message-content' : ''}`}>
                          <span className="line-clamp-2">
                            {message.content}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right side: time */}
                    <span className="text-xs text-red-500 whitespace-nowrap ml-2 self-start">
                      {formatTime(message.timestamp)}
                    </span>
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

                    {/* New horizontal layout on desktop, run-in on mobile */}
                    <div className={`flex-1 min-w-0`}>
                      {isMobile ? (
                        <div className="runin-container">
                          <div className="runin-name">
                            {message.sender && (message.sender.userType as any) !== 'bot' && (
                              <UserRoleBadge user={message.sender} showOnlyIcon={true} hideGuestAndGender={true} size={16} />
                            )}
                            <button
                              onClick={(e) => message.sender && handleUsernameClick(e, message.sender)}
                              className="font-semibold hover:underline transition-colors duration-200 text-sm"
                              style={{ color: getFinalUsernameColor(message.sender) }}
                            >
                              {message.sender?.username || 'جاري التحميل...'}
                            </button>
                            <span className="text-gray-400 mx-1">:</span>
                          </div>
                          <div className="runin-text text-gray-800 message-content-fix">
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
                                    <span className={`flex items-start gap-2`} onClick={() => isMobile && toggleMessageExpanded(message.id)}>
                                      {cleaned ? (
                                        <span
                                          className={`flex-1`}
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
                                        className="flex items-center justify-center w-8 h-6 rounded bg-red-600 hover:bg-red-700 transition-colors shrink-0"
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
                        </div>
                      ) : (
                        <div className="flex items-start gap-2">
                          {/* Name and badge section - fixed width */}
                          <div className="flex items-center gap-1 shrink-0">
                            {message.sender && (message.sender.userType as any) !== 'bot' && (
                              <UserRoleBadge user={message.sender} showOnlyIcon={true} hideGuestAndGender={true} size={16} />
                            )}
                            <button
                              onClick={(e) => message.sender && handleUsernameClick(e, message.sender)}
                              className="font-semibold hover:underline transition-colors duration-200 text-sm"
                              style={{ color: getFinalUsernameColor(message.sender) }}
                            >
                              {message.sender?.username || 'جاري التحميل...'}
                            </button>
                            <span className="text-gray-400 mx-1">:</span>
                          </div>

                          {/* Content section - flexible width */}
                          <div className={`flex-1 min-w-0 text-gray-800 break-words message-content-fix`}>
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
                                    <span className={`${isMobile ? 'line-clamp-4' : 'line-clamp-2'} ${!isMobile ? 'text-breathe' : ''} flex items-start gap-2`} onClick={() => isMobile && toggleMessageExpanded(message.id)}>
                                      {cleaned ? (
                                        <span
                                          className={`${isMobile ? 'line-clamp-4' : 'line-clamp-2'} flex-1`}
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
                                        className="flex items-center justify-center w-8 h-6 rounded bg-red-600 hover:bg-red-700 transition-colors shrink-0"
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
                                    className={`${isMobile ? 'line-clamp-4' : 'line-clamp-2 text-breathe'}`}
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
                        </div>
                      )}
                    </div>

                      {/* Right side: time */}
                      <span className="text-xs text-gray-500 whitespace-nowrap ml-2 self-start">
                        {formatTime(message.timestamp)}
                      </span>

                      {/* قائمة ثلاث نقاط موحدة للجوال وسطح المكتب */}
                      {currentUser && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="h-6 w-6 p-0 text-gray-600 hover:text-gray-900 self-start ml-1"
                              title="المزيد"
                              aria-label="المزيد"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" sideOffset={6} className="min-w-[180px]">
                            {/* Reactions */}
                            {!message.isPrivate && (["like","dislike","heart"] as const).map((r) => {
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
                            {/* Report */}
                            {onReportMessage && message.sender && currentUser && message.sender.id !== currentUser.id && (
                              <DropdownMenuItem onClick={() => onReportMessage(message.sender!, message.content, message.id)}>
                                🚩 تبليغ
                              </DropdownMenuItem>
                            )}
                            {/* Delete */}
                            {(() => {
                              if (!message.sender || !currentUser) return null;
                              const isOwner = currentUser.userType === 'owner';
                              const isAdmin = currentUser.userType === 'admin';
                              const isSender = currentUser.id === message.sender.id;
                              const canDelete = isSender || isOwner || isAdmin;
                              if (!canDelete) return null;
                              const handleDelete = async () => {
                                try {
                                  await apiRequest(`/api/messages/${message.id}`, {
                                    method: 'DELETE',
                                    body: { userId: currentUser.id, roomId: message.roomId || 'general' },
                                  });
                                } catch (e) {
                                  console.error('خطأ في حذف الرسالة', e);
                                }
                              };
                              return (
                                <DropdownMenuItem onClick={handleDelete}>🗑️ حذف</DropdownMenuItem>
                              );
                            })()}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                  </>
                )}
              </div>
            )}
          />
        )}
        {/* تم حذف زر الانتقال السفلي المركزي */}
      </div>

      {/* YouTube Modal */}
      <Dialog
        open={youtubeModal.open}
        onOpenChange={(open) => {
          if (!open) setYoutubeModal({ open: false, videoId: null });
        }}
        modal={false}
      >
        <FloatingDialogContent
            className="max-w-md w-[25vw] min-w-[400px] p-0 bg-popover border-border"
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <div 
            className="drag-handle bg-popover p-1 flex justify-end cursor-move border-b border-border select-none"
            style={{ touchAction: 'none', userSelect: 'none' }}
            onPointerDown={(e) => {
              e.preventDefault();
              const dialog = e.currentTarget.closest('.fixed') as HTMLElement | null;
              if (!dialog) return;
              let startX = e.clientX;
              let startY = e.clientY;
              const rect = dialog.getBoundingClientRect();
              let initialLeft = rect.left;
              let initialTop = rect.top;
              let nextLeft = initialLeft;
              let nextTop = initialTop;
              let rafId: number | null = null;
              let isDragging = false;
              const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
              const apply = () => {
                rafId = null;
                dialog.style.position = 'fixed';
                dialog.style.zIndex = '9999';
                dialog.style.left = `${nextLeft}px`;
                dialog.style.top = `${nextTop}px`;
                dialog.style.transform = 'none';
              };
              const schedule = () => {
                if (rafId == null) rafId = requestAnimationFrame(apply);
              };
              const onMove = (ev: PointerEvent) => {
                if (!isDragging) {
                  isDragging = true;
                  try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
                }
                const dx = ev.clientX - startX;
                const dy = ev.clientY - startY;
                const maxLeft = window.innerWidth - rect.width;
                const maxTop = window.innerHeight - rect.height;
                nextLeft = clamp(initialLeft + dx, 0, Math.max(0, maxLeft));
                nextTop = clamp(initialTop + dy, 0, Math.max(0, maxTop));
                schedule();
              };
              const onUp = () => {
                try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);
                if (rafId != null) cancelAnimationFrame(rafId);
              };
              window.addEventListener('pointermove', onMove);
              window.addEventListener('pointerup', onUp, { once: true } as any);
            }}
          >
            <button
              onClick={() => setYoutubeModal({ open: false, videoId: null })}
              className="text-white/90 hover:text-white text-lg leading-none p-1"
              aria-label="إغلاق"
            >
              ✖️
            </button>
          </div>
          <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
            {youtubeModal.videoId && (
              <iframe
                src={`https://www.youtube.com/embed/${youtubeModal.videoId}`}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                title="يوتيوب"
              />
            )}
          </div>
        </FloatingDialogContent>
      </Dialog>

      {/* Image Lightbox */}
      <ImageLightbox
        open={imageLightbox.open}
        src={imageLightbox.src}
        onOpenChange={(open) => {
          if (!open) setImageLightbox({ open: false, src: null });
        }}
      />

      {/* Message Input - تحسين التثبيت لمنع التداخل */}
      <div
        className={`p-3 bg-white w-full z-20 shadow-lg chat-input soft-entrance`}
      >
        {/* Typing Indicator - تم إزالته من الغرف */}

        <div
          className={`flex ${isMobile ? 'gap-2 p-3' : 'gap-3 p-4'} items-end max-w-full mx-auto bg-white/80 backdrop-blur-sm transition-all duration-300`}
          style={{ paddingBottom: isMobile ? 'calc(env(safe-area-inset-bottom) + 0.75rem)' : '1rem' }}
        >
          {/* First row: Emoji buttons and textarea */}
          <div className="flex flex-1 items-end gap-2">
            {/* Emoji Picker */}
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                disabled={isChatRestricted}
                className={`aspect-square mobile-touch-button ${isMobile ? 'min-w-[44px] min-h-[44px]' : ''} ${isChatRestricted ? 'opacity-60 cursor-not-allowed' : ''} bg-primary/10 text-primary border-primary/20 hover:bg-primary/15`}
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
                className={`aspect-square mobile-touch-button ${isMobile ? 'min-w-[44px] min-h-[44px]' : ''} ${isChatRestricted ? 'opacity-60 cursor-not-allowed' : ''} bg-primary/10 text-primary border-primary/20 hover:bg-primary/15`}
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

            {/* Send Button moved next to emoji buttons (in place of +) */}
            <Button
              onClick={handleSendMessage}
              disabled={!messageText.trim() || !currentUser || isChatRestricted}
              className={`aspect-square bg-primary hover:bg-primary/90 text-primary-foreground rounded-full mobile-touch-button ${isMobile ? 'min-w-[44px] min-h-[44px]' : ''} ${isChatRestricted ? 'opacity-60 cursor-not-allowed' : ''}`}
              title="إرسال"
            >
              <Send className="w-4 h-4" />
            </Button>

            {/* Message Input - render centered disabled input if restricted, otherwise 2-line textarea */}
            {(!currentUser || isChatRestricted) ? (
              <input
                type="text"
                value={''}
                onChange={() => {}}
                placeholder={getRestrictionMessage || 'هذه الخاصية غير متوفرة الآن'}
                className={`flex-1 bg-white placeholder:text-gray-500 ring-offset-white border border-gray-300 rounded-full px-4 ${isMobile ? 'h-12' : 'h-11'} transition-all duration-200 cursor-not-allowed opacity-60`}
                disabled
                style={{
                  ...(isMobile ? { fontSize: '16px' } : {}),
                  color: composerTextColor,
                  fontWeight: composerBold ? 600 : undefined,
                  lineHeight: `${isMobile ? 48 : 44}px`,
                }}
              />
            ) : (
              <textarea
                ref={inputRef}
                value={messageText}
                onChange={handleMessageChange}
                onKeyPress={handleKeyPress}
                onPaste={handlePaste}
                placeholder={"اكتب رسالتك هنا..."}
                className={`flex-1 resize-none bg-white placeholder:text-gray-500 ring-offset-white border border-gray-300 rounded-full px-4 ${isMobile ? 'h-12 py-0' : 'h-11 py-0'} transition-all duration-200 ${isMobile ? 'mobile-text' : ''}`}
                maxLength={MAX_CHARS}
                autoComplete="off"
                rows={1}
                style={{
                  ...(isMobile ? { fontSize: '16px' } : {}),
                  color: composerTextColor,
                  fontWeight: composerBold ? 600 : undefined,
                  lineHeight: `${isMobile ? 48 : 44}px`,
                }}
              />
            )}

            {/* Composer Plus Menu moved to the end */}
            <React.Suspense fallback={null}>
              <ComposerPlusMenu
                onOpenImagePicker={() => fileInputRef.current?.click()}
                disabled={!currentUser || isChatRestricted}
                isMobile={isMobile}
                currentUser={currentUser}
              />
            </React.Suspense>
          </div>

          {/* تم إزالة الملاحظة الخاصة بالسطر الثاني بناءً على الطلب */}

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* Character Counter - تم إخفاء العرض مع الاحتفاظ بالوظيفة */}
      </div>
    </section>
  );
}

import { Send, Smile, ChevronDown, Sparkles, Flag, Lock, UserX, MoreVertical } from 'lucide-react';
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
import { ReactionEffects, playReactionSound } from './ReactionEffects';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, FloatingDialogContent } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import ImageLightbox from '@/components/ui/ImageLightbox';
import ImageAttachmentBadge from '@/components/ui/ImageAttachmentBadge';
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
import { getFinalUsernameColor, getUserNameplateStyles, getUsernameDisplayStyle } from '@/utils/themeUtils';
import { formatTime } from '@/utils/timeUtils';
// Removed ComposerPlusMenu (ready/quick options)
import { useComposerStyle } from '@/contexts/ComposerStyleContext';
import { renderMessageWithAnimatedEmojis, convertTextToAnimatedEmojis } from '@/utils/animatedEmojiUtils';
// Removed dropdown menu in favor of inline report flag (arabic.chat style)

interface MessageAreaProps {
  messages: ChatMessage[];
  currentUser: ChatUser | null;
  onSendMessage: (content: string, messageType?: string, textColor?: string, bold?: boolean) => void;
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
  const inputRef = useRef<HTMLInputElement>(null);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const prevMessagesLenRef = useRef<number>(0);
  // مقدار إزاحة الكيبورد أسفل الشاشة (iOS) لترك مساحة أسفل قائمة الرسائل
  const [keyboardInset, setKeyboardInset] = useState<number>(0);

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

  // Track reaction effects - تتبع التأثيرات للرسائل
  const [reactionEffects, setReactionEffects] = useState<Map<number, { type: 'heart' | 'like' | 'dislike'; trigger: number }>>(new Map());

  // Helper: اكتشاف رسائل النظام الخاصة بالانضمام/المغادرة لعرضها في سطر واحد دائماً
  const isJoinLeaveSystemContent = useCallback((content: string | undefined) => {
    if (!content) return false;
    const patterns = [
      /\bانضم\b/u,
      /\bغادر\b/u,
      /\bدخل\b/u,
      /\bخرج\b/u,
      /\bغادر\s+الموقع\b/u,
      /\bjoined\b/i,
      /\bleft\b/i,
      /\bleft\s+the\s+room\b/i,
      /\bjoined\s+the\s+room\b/i,
    ];
    return patterns.some((re) => re.test(content));
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

  // عند ظهور الكيبورد على iOS: احسب الإزاحة السفلية وزِد مسافة أسفل قائمة الرسائل واذهب للقاع
  useEffect(() => {
    if (!isMobile) return;
    const vv = (window as any).visualViewport as VisualViewport | undefined;
    const recompute = () => {
      try {
        const height = vv?.height ?? window.innerHeight;
        const offsetTop = vv?.offsetTop ?? 0;
        const inset = Math.max(0, window.innerHeight - height - offsetTop);
        setKeyboardInset(inset);
        if (inset > 0) {
          // امنح المتصفح فرصة لإعادة التخطيط ثم مرّر للأسفل
          setTimeout(() => scrollToBottom('auto'), 50);
          setTimeout(() => scrollToBottom('auto'), 250);
        }
      } catch {}
    };
    recompute();
    vv?.addEventListener('resize', recompute);
    window.addEventListener('orientationchange', recompute);
    return () => {
      try { vv?.removeEventListener('resize', recompute); } catch {}
      try { window.removeEventListener('orientationchange', recompute); } catch {}
    };
  }, [isMobile, scrollToBottom]);

  // عند تركيز حقل الإدخال أثناء الكتابة، مرّر آخر رسالة إلى الواجهة
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const onFocus = () => {
      setTimeout(() => scrollToBottom('auto'), 50);
      setTimeout(() => scrollToBottom('auto'), 250);
    };
    el.addEventListener('focus', onFocus);
    return () => { try { el.removeEventListener('focus', onFocus); } catch {} };
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

      // إرسال الرسالة مع اللون والخط
      onSendMessage(trimmedMessage, 'text', composerTextColor, composerBold);
      setMessageText('');

      // Focus back to input
      inputRef.current?.focus();
    }
  }, [messageText, currentUser, onSendMessage, composerTextColor, composerBold]);

  // Key press handler - إرسال بالـ Enter
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      } else {
        // إرسال إشعار الكتابة فقط عند الكتابة الفعلية
        handleTypingThrottled();
      }
    },
    [handleSendMessage, handleTypingThrottled]
  );

  // Message text change handler مع تقليم إلى 192 حرفًا
  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const next = clampToMaxChars(e.target.value);
    setMessageText(next);
  }, [clampToMaxChars]);

  // Paste handler مع تقليم إلى 192 حرفًا
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    try {
      const paste = e.clipboardData.getData('text');
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

  // Emoji select handler
  const handleEmojiSelect = useCallback((emoji: string) => {
    const newText = clampToMaxChars(messageText + emoji);
    setMessageText(newText);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  }, [messageText, clampToMaxChars]);

  // Animated Emoji select handler
  const handleAnimatedEmojiSelect = useCallback((emoji: { id: string; url: string; name: string; code: string }) => {
    // أدخل كود السمايل المختصر بدل الرابط لتجنب ظهور رابط داخل خانة الدردشة
    const token = (emoji.code && emoji.code.trim()) || `[[emoji:${emoji.id}:${emoji.url}]]`;
    const newText = clampToMaxChars(messageText + ` ${token} `);
    setMessageText(newText);
    setShowAnimatedEmojiPicker(false);
    inputRef.current?.focus();
  }, [messageText, clampToMaxChars]);

  // Emoji Mart handler
  const handleEmojiMartSelect = useCallback((emoji: any) => {
    let newText;
    if (emoji.src) {
      // إيموجي مخصص (GIF) من emoji-mart: نُبقيه بصيغة الرمز حتى العرض
      newText = clampToMaxChars(messageText + ` [[emoji:${emoji.id}:${emoji.src}]] `);
    } else {
      // إيموجي عادي (نظامي)
      newText = clampToMaxChars(messageText + (emoji.native || ''));
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
  const handleEnhancedEmojiSelect = useCallback((emoji: { id: string; emoji?: string; name: string; code: string; url?: string }) => {
    let token: string;
    if (emoji.url) {
      // استخدم الكود المختصر بدلاً من الرابط لتفادي ظهور رابط داخل خانة الدردشة
      token = (emoji.code && emoji.code.trim()) || `[[emoji:${emoji.id}:${emoji.url}]]`;
    } else {
      // إيموجي عادي
      token = emoji.emoji || emoji.code;
    }
    const newText = clampToMaxChars(messageText + ` ${token} `);
    setMessageText(newText);
    setShowEnhancedEmoji(false);
    inputRef.current?.focus();
  }, [messageText, clampToMaxChars]);

  // Copy message content to clipboard
  const handleCopyMessage = useCallback((text: string) => {
    try {
      void navigator.clipboard.writeText(text || '');
    } catch {}
  }, []);

  // Toggle reaction (like/dislike/heart) for a message
  const handleToggleReaction = useCallback(
    async (message: ChatMessage, type: 'like' | 'dislike' | 'heart') => {
      if (!currentUser) return;
      try {
        const endpoint = `/api/messages/${message.id}/reactions`;
        if (message.myReaction === type) {
          await apiRequest(endpoint, { method: 'DELETE', body: { type } });
        } else {
          await apiRequest(endpoint, { method: 'POST', body: { type } });
        }
      } catch (error) {
        console.error('فشل تحديث التفاعل:', error);
      }
    },
    [currentUser]
  );

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

      if (file.size > 8 * 1024 * 1024) {
        alert('حجم الصورة كبير جداً. الحد الأقصى 8MB');
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
      } catch (err: any) {
        console.error('رفع الصورة فشل:', err);
        const msg = (err && (err.message || err.error)) || '';
        if (err?.status === 400 && msg) {
          alert(String(msg));
        } else if (err?.status === 413) {
          alert('حجم الملف كبير جداً - يرجى اختيار ملف أصغر');
        } else if (err?.status === 403) {
          alert('تعذر تنفيذ العملية (جلسة/صلاحيات). يرجى إعادة المحاولة لاحقاً');
        } else {
          alert('تعذر رفع الصورة، حاول مرة أخرى');
        }
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

  // استقبال التأثيرات عند وصول reaction من مستخدم آخر
  useEffect(() => {
    const handleReactionReceived = (event: CustomEvent) => {
      const { messageId, reactorName, reactionType, emoji } = event.detail;
      
      // تشغيل التأثير المرئي
      setReactionEffects((prev) => {
        const next = new Map(prev);
        next.set(messageId, { type: reactionType, trigger: Date.now() });
        return next;
      });
      
      // تشغيل الصوت
      playReactionSound(reactionType);
      
      // عرض إشعار toast (اختياري)
      if (typeof window !== 'undefined' && (window as any).toast) {
        (window as any).toast({
          title: `${emoji} ${reactorName}`,
          description: 'أعجب برسالتك',
          duration: 2000,
        });
      }
    };

    window.addEventListener('reactionReceived', handleReactionReceived as EventListener);
    return () => {
      window.removeEventListener('reactionReceived', handleReactionReceived as EventListener);
    };
  }, []);

  return (
    <section className="flex-1 flex flex-col bg-white min-h-0">
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
            style={{
              paddingBottom: `${24 + (isMobile ? keyboardInset : 0)}px`,
              overscrollBehavior: 'contain',
              scrollBehavior: 'auto',
            }}
            followOutput={isAtBottom ? 'smooth' : false}
            atBottomThreshold={64}
            atBottomStateChange={handleAtBottomChange}
            increaseViewportBy={{ top: 400, bottom: 400 }}
            itemContent={(index, message) => (
              <div
                key={message.id}
                className={`ac-message-row flex items-start gap-2 px-2 transition-all duration-300 ${index % 2 ? 'log2' : ''} ${message.sender?.profileFrame ? 'py-2' : 'py-1'}`}
                style={{ borderRightColor: getDynamicBorderColor(message.sender), direction: 'rtl' }}
                data-message-type={message.messageType || 'normal'}
              >
                {/* Reaction Effects */}
                {reactionEffects.has(message.id) && (
                  <ReactionEffects
                    type={reactionEffects.get(message.id)!.type}
                    trigger={reactionEffects.get(message.id)!.trigger}
                  />
                )}
                {/* System message: use the same run-in layout as regular messages for perfect consistency */}
                {message.messageType === 'system' ? (
                  <>
                    {message.sender && (
                      <div className="flex-shrink-0">
                        <div style={{ 
                          width: 44,
                          height: 44,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <ProfileImage
                            user={message.sender}
                            size="small"
                            pixelSize={32}
                            className="cursor-pointer hover:scale-110 transition-transform duration-200"
                            /* عرض الإطار للمستخدم صاحب الإطار */
                            onClick={(e) => onUserClick && onUserClick(e, message.sender!)}
                          />
                        </div>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="runin-container">
                            <div className="runin-name md:inline-flex md:items-center md:min-h-[38px]">
                              {message.sender && (
                                <span className="inline-flex items-center justify-center mr-1">
                                  <UserRoleBadge user={message.sender} size={14} hideGuestAndGender />
                                </span>
                              )}
                              {(() => {
                                const np = getUserNameplateStyles(message.sender);
                                const hasNp = np && Object.keys(np).length > 0;
                                if (hasNp) {
                                  return (
                                    <button
                                      onClick={(e) => message.sender && handleUsernameClick(e, message.sender)}
                                      className="transition-transform duration-200 hover:scale-[1.02]"
                                      title={message.sender?.username}
                                    >
                                      {(() => {
                                        const uds = getUsernameDisplayStyle(message.sender);
                                        return (
                                          <span className="ac-nameplate" style={np}>
                                            <span className={`ac-name ${uds.className || ''}`} style={uds.style}>
                                              {message.sender?.username || '...'}
                                            </span>
                                          </span>
                                        );
                                      })()}
                                    </button>
                                  );
                                }
                                return (() => {
                                  const uds = getUsernameDisplayStyle(message.sender);
                                  return (
                                    <button
                                      onClick={(e) => message.sender && handleUsernameClick(e, message.sender)}
                                      className={`font-semibold hover:underline transition-colors duration-200 text-sm`}
                                      title={message.sender?.username}
                                    >
                                      <span className={`${uds.className || ''}`} style={uds.style}>
                                        {message.sender?.username || 'جاري التحميل...'}
                                      </span>
                                    </button>
                                  );
                                })();
                              })()}
                              <span className="text-red-400 mx-1">:</span>
                            </div>
                            {(() => {
                              const forceSingleLine = isJoinLeaveSystemContent(message.content);
                              const contentClass = forceSingleLine
                                ? 'runin-text text-red-600 truncate'
                                : 'runin-text text-red-600 message-content-fix';
                              const contentStyle = forceSingleLine ? { whiteSpace: 'nowrap' as const } : undefined;
                              return (
                                <div className={contentClass} style={contentStyle}>
                                  <span className="ac-message-text">{message.content}</span>
                                </div>
                              );
                            })()}
                            {/* Time section - fixed width */}
                            <span className="ac-time hidden whitespace-nowrap shrink-0 self-start">
                              {formatTime(message.timestamp)}
                            </span>
                          </div>
                        </div>
                        {/* Actions: report + menu (desktop), inline on mobile at end of text */}
                        {!isMobile && (
                          <div className="flex items-center gap-1 shrink-0">
                            {onReportMessage && message.sender && currentUser && message.sender.id !== currentUser.id && (
                              <button
                                className="text-gray-500 hover:text-red-600"
                                title="تبليغ"
                                onClick={() => onReportMessage(message.sender!, message.content, message.id)}
                              >
                                <Flag className="w-4 h-4" />
                              </button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="text-gray-500 hover:text-gray-700" title="خيارات" aria-label="خيارات">
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-popover border-border text-popover-foreground">
                                <DropdownMenuItem onClick={() => handleToggleReaction(message, 'like')}>
                                  {message.myReaction === 'like' ? 'إزالة الإعجاب' : 'إعجاب 👍'}
                                  {(message.reactions?.like ?? 0) > 0 && (
                                    <span className="ml-2 text-xs text-muted-foreground">({message.reactions?.like ?? 0})</span>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleReaction(message, 'dislike')}>
                                  {message.myReaction === 'dislike' ? 'إزالة عدم الإعجاب' : 'عدم إعجاب 👎'}
                                  {(message.reactions?.dislike ?? 0) > 0 && (
                                    <span className="ml-2 text-xs text-muted-foreground">({message.reactions?.dislike ?? 0})</span>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleReaction(message, 'heart')}>
                                  {message.myReaction === 'heart' ? 'إزالة القلب' : 'قلب ❤️'}
                                  {(message.reactions?.heart ?? 0) > 0 && (
                                    <span className="ml-2 text-xs text-muted-foreground">({message.reactions?.heart ?? 0})</span>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCopyMessage(message.content)}>نسخ الرسالة</DropdownMenuItem>
                                {onReportMessage && message.sender && currentUser && message.sender.id !== currentUser.id && (
                                  <DropdownMenuItem onClick={() => onReportMessage(message.sender!, message.content, message.id)}>تبليغ</DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Profile Image */}
                    {message.sender && (
                      <div className="flex-shrink-0">
                        <div style={{ 
                          width: 44,
                          height: 44,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <ProfileImage
                            user={message.sender}
                            size="small"
                            pixelSize={32}
                            className="cursor-pointer hover:scale-110 transition-transform duration-200"
                            /* عرض الإطار للمستخدم صاحب الإطار */
                            onClick={(e) => onUserClick && onUserClick(e, message.sender!)}
                          />
                        </div>
                      </div>
                    )}

                    {/* Unified run-in layout for both mobile and desktop with inline actions and top alignment */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="runin-container">
                            <div className="runin-name md:inline-flex md:items-center md:min-h-[38px]">
                            {message.sender && (
                              <span className="inline-flex items-center justify-center mr-1">
                                <UserRoleBadge user={message.sender} size={14} hideGuestAndGender />
                              </span>
                            )}
                              {(() => {
                                const np = getUserNameplateStyles(message.sender);
                                const hasNp = np && Object.keys(np).length > 0;
                                if (hasNp) {
                                  return (
                                    <button
                                      onClick={(e) => message.sender && handleUsernameClick(e, message.sender)}
                                      className="transition-transform duration-200 hover:scale-[1.02]"
                                      title={message.sender?.username}
                                    >
                                      {(() => {
                                        const uds = getUsernameDisplayStyle(message.sender);
                                        return (
                                          <span className="ac-nameplate" style={np}>
                                            <span className={`ac-name ${uds.className || ''}`} style={uds.style}>
                                              {message.sender?.username || '...'}
                                            </span>
                                          </span>
                                        );
                                      })()}
                                    </button>
                                  );
                                }
                                return (() => {
                                  const uds = getUsernameDisplayStyle(message.sender);
                                  return (
                                    <button
                                      onClick={(e) => message.sender && handleUsernameClick(e, message.sender)}
                                      className={`font-semibold hover:underline transition-colors duration-200 text-sm`}
                                      title={message.sender?.username}
                                    >
                                      <span className={`${uds.className || ''}`} style={uds.style}>
                                        {message.sender?.username || 'جاري التحميل...'}
                                      </span>
                                    </button>
                                  );
                                })();
                              })()}
                              <span className="text-gray-400 mx-1">:</span>
                            </div>
                            <div className="runin-text text-gray-900 message-content-fix">
                              {message.messageType === 'image' ? (
                                <button
                                  type="button"
                                  onClick={() => setImageLightbox({ open: true, src: message.content })}
                                  className="inline-flex items-center justify-center p-0 bg-transparent"
                                  title="عرض الصورة"
                                  aria-label="عرض الصورة"
                                >
                                  <ImageAttachmentBadge />
                                </button>
                              ) : (
                                (() => {
                                  const { cleaned, ids } = parseYouTubeFromText(message.content);
                                  if (ids.length > 0) {
                                    const firstId = ids[0];
                                    return (
                                    <span className="text-[13px] font-semibold leading-6 inline-flex items-center gap-2">
                                        {cleaned && (
                                          <span
                                            style={{
                                              color: message.textColor || '#000000',
                                              fontWeight: message.bold ? 700 : undefined
                                            }}
                                          >
                                            {renderMessageWithAnimatedEmojis(
                                              cleaned,
                                              (text) => renderMessageWithMentions(text, currentUser, onlineUsers)
                                            )}
                                          </span>
                                        )}
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
                                      className="ac-message-text"
                                      style={{
                                        color: message.textColor || '#000000',
                                        fontWeight: message.bold ? 700 : undefined
                                      }}
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

                            {/* Time section - fixed width */}
                            <span className="ac-time hidden whitespace-nowrap shrink-0 self-start">
                              {formatTime(message.timestamp)}
                            </span>
                            {/* Inline actions at end of line on mobile */}
                            {isMobile && (
                              <span className="runin-actions inline-flex items-center gap-1 align-middle ml-1">
                                {onReportMessage && message.sender && currentUser && message.sender.id !== currentUser.id && (
                                  <button
                                    className="text-gray-500 hover:text-red-600"
                                    title="تبليغ"
                                    onClick={() => onReportMessage(message.sender!, message.content, message.id)}
                                  >
                                    <Flag className="w-4 h-4" />
                                  </button>
                                )}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button className="text-gray-500 hover:text-gray-700" title="خيارات" aria-label="خيارات">
                                      <MoreVertical className="w-4 h-4" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="bg-popover border-border text-popover-foreground">
                                    <DropdownMenuItem onClick={() => handleToggleReaction(message, 'like')}>
                                      {message.myReaction === 'like' ? 'إزالة الإعجاب' : 'إعجاب 👍'}
                                      {(message.reactions?.like ?? 0) > 0 && (
                                        <span className="ml-2 text-xs text-muted-foreground">({message.reactions?.like ?? 0})</span>
                                      )}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleToggleReaction(message, 'dislike')}>
                                      {message.myReaction === 'dislike' ? 'إزالة عدم الإعجاب' : 'عدم إعجاب 👎'}
                                      {(message.reactions?.dislike ?? 0) > 0 && (
                                        <span className="ml-2 text-xs text-muted-foreground">({message.reactions?.dislike ?? 0})</span>
                                      )}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleToggleReaction(message, 'heart')}>
                                      {message.myReaction === 'heart' ? 'إزالة القلب' : 'قلب ❤️'}
                                      {(message.reactions?.heart ?? 0) > 0 && (
                                        <span className="ml-2 text-xs text-muted-foreground">({message.reactions?.heart ?? 0})</span>
                                      )}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleCopyMessage(message.content)}>نسخ الرسالة</DropdownMenuItem>
                                    {onReportMessage && message.sender && currentUser && message.sender.id !== currentUser.id && (
                                      <DropdownMenuItem onClick={() => onReportMessage(message.sender!, message.content, message.id)}>تبليغ</DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </span>
                            )}
                          </div>
                        </div>
                        {!isMobile && (
                          <div className="flex items-center gap-1 shrink-0">
                            {onReportMessage && message.sender && currentUser && message.sender.id !== currentUser.id && (
                              <button
                                className="text-gray-500 hover:text-red-600"
                                title="تبليغ"
                                onClick={() => onReportMessage(message.sender!, message.content, message.id)}
                              >
                                <Flag className="w-4 h-4" />
                              </button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="text-gray-500 hover:text-gray-700" title="خيارات" aria-label="خيارات">
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-popover border-border text-popover-foreground">
                                <DropdownMenuItem onClick={() => handleToggleReaction(message, 'like')}>
                                  {message.myReaction === 'like' ? 'إزالة الإعجاب' : 'إعجاب 👍'}
                                  {(message.reactions?.like ?? 0) > 0 && (
                                    <span className="ml-2 text-xs text-muted-foreground">({message.reactions?.like ?? 0})</span>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleReaction(message, 'dislike')}>
                                  {message.myReaction === 'dislike' ? 'إزالة عدم الإعجاب' : 'عدم إعجاب 👎'}
                                  {(message.reactions?.dislike ?? 0) > 0 && (
                                    <span className="ml-2 text-xs text-muted-foreground">({message.reactions?.dislike ?? 0})</span>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleReaction(message, 'heart')}>
                                  {message.myReaction === 'heart' ? 'إزالة القلب' : 'قلب ❤️'}
                                  {(message.reactions?.heart ?? 0) > 0 && (
                                    <span className="ml-2 text-xs text-muted-foreground">({message.reactions?.heart ?? 0})</span>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCopyMessage(message.content)}>نسخ الرسالة</DropdownMenuItem>
                                {onReportMessage && message.sender && currentUser && message.sender.id !== currentUser.id && (
                                  <DropdownMenuItem onClick={() => onReportMessage(message.sender!, message.content, message.id)}>تبليغ</DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                    </div>
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
            className="drag-handle bg-popover p-1 flex justify-start cursor-move border-b border-border select-none"
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
              className="px-2 py-1 hover:bg-red-100 text-red-600 text-sm font-medium rounded"
              aria-label="إغلاق"
              title="إغلاق"
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
        className={`p-2 bg-white w-full z-20 shadow-lg chat-input`}
      >
        {/* Typing Indicator */}
        {typingUsers.size > 0 && (
          <div className="mb-1.5 text-[11px] text-gray-500 animate-pulse">{typingDisplay}</div>
        )}

      <div
        className={`ac-composer flex ${isMobile ? 'gap-2 p-2' : 'gap-2 p-2'} items-end max-w-full mx-auto bg-white transition-all duration-300 rounded-lg border border-gray-200`}
          style={{ paddingBottom: isMobile ? 'calc(env(safe-area-inset-bottom) + 0.5rem)' : '0.75rem' }}
        >
          {/* Input row: send, input (with inline emoji), plus */}
          <div className={`flex flex-1 items-end gap-2`}>
            {/* Send Button (moved to start) */}
            <Button
              onClick={handleSendMessage}
              disabled={!messageText.trim() || !currentUser || isChatRestricted}
              className={`aspect-square bg-primary hover:bg-primary/90 text-primary-foreground rounded-full mobile-touch-button ${isMobile ? 'min-w-[44px] min-h-[44px]' : ''} ${isChatRestricted ? 'opacity-60 cursor-not-allowed' : ''}`}
              title="إرسال"
            >
              <Send className="w-4 h-4" />
            </Button>

            {/* Message Input (with inline emoji trigger like arabic.chat) */}
            <div className="relative flex-1">
              <Input
                ref={inputRef}
                value={messageText}
                onChange={handleMessageChange}
                onKeyDown={handleKeyPress}
                onPaste={handlePaste}
                placeholder={!currentUser || isChatRestricted ? (getRestrictionMessage || 'هذه الخاصية غير متوفرة الآن') : "اكتب هنا..."}
                className={`rooms-message-input w-full bg-white text-foreground placeholder:text-muted-foreground rounded-lg border border-gray-300 h-10 pr-10 pl-3 focus:border-transparent focus:ring-offset-0 focus-visible:ring-offset-0 text-[14px]`}
                disabled={!currentUser || isChatRestricted}
                style={{ color: composerTextColor, fontWeight: composerBold ? 700 : undefined }}
                maxLength={MAX_CHARS}
              />
              <button
                type="button"
                onClick={() => {
                  setShowEnhancedEmoji((v) => !v);
                  setShowEmojiPicker(false);
                  setShowAnimatedEmojiPicker(false);
                  setShowEmojiMart(false);
                  setShowLottieEmoji(false);
                }}
                className="absolute inset-y-0 right-2 my-auto h-6 w-6 flex items-center justify-center chat-emoji-button text-gray-500 hover:text-gray-700"
                title="إظهار السمايلات"
                disabled={!currentUser || isChatRestricted}
              >
                <Smile className="w-5 h-5" />
              </button>

              {/* Emoji pickers anchored to input container */}
              {showEnhancedEmoji && (
                <div className="absolute bottom-full right-0 mb-2 z-30">
                  <React.Suspense fallback={null}>
                    <AnimatedEmojiEnhanced
                      onEmojiSelect={handleEnhancedEmojiSelect}
                      onClose={() => setShowEnhancedEmoji(false)}
                    />
                  </React.Suspense>
                </div>
              )}
              {showAnimatedEmojiPicker && (
                <div className="absolute bottom-full right-0 mb-2 z-30">
                  <React.Suspense fallback={null}>
                    <AnimatedEmojiPicker
                      onEmojiSelect={handleAnimatedEmojiSelect}
                      onClose={() => setShowAnimatedEmojiPicker(false)}
                    />
                  </React.Suspense>
                </div>
              )}
              {showEmojiMart && (
                <div className="absolute bottom-full right-0 mb-2 z-30">
                  <React.Suspense fallback={null}>
                    <EmojiMartPicker
                      onEmojiSelect={handleEmojiMartSelect}
                      onClose={() => setShowEmojiMart(false)}
                    />
                  </React.Suspense>
                </div>
              )}
              {showLottieEmoji && (
                <div className="absolute bottom-full right-0 mb-2 z-30">
                  <React.Suspense fallback={null}>
                    <LottieEmojiPicker
                      onEmojiSelect={handleLottieEmojiSelect}
                      onClose={() => setShowLottieEmoji(false)}
                    />
                  </React.Suspense>
                </div>
              )}
            </div>

            {/* Plus menu (moved to end) */}
            <React.Suspense fallback={null}>
              <div className="chat-plus-button">
                <ComposerPlusMenu
                  onOpenImagePicker={() => fileInputRef.current?.click()}
                  disabled={!currentUser || isChatRestricted}
                  isMobile={isMobile}
                  currentUser={currentUser}
                />
              </div>
            </React.Suspense>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* Character Counter removed from flow to reduce height */}
        <div className="hidden">
          {messageText.length}/{MAX_CHARS} حرف
        </div>
      </div>
    </section>
  );
}

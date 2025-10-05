import { motion } from 'framer-motion';
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Send, Image as ImageIcon, Check, CheckCheck } from 'lucide-react';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, FloatingDialogContent } from '@/components/ui/dialog';
import ImageLightbox from '@/components/ui/ImageLightbox';
import UserRoleBadge from '@/components/chat/UserRoleBadge';
import { Input } from '@/components/ui/input';
// Removed ComposerPlusMenu (ready/quick options)
import { useComposerStyle } from '@/contexts/ComposerStyleContext';
import type { ChatMessage, ChatUser } from '@/types/chat';
import ProfileImage from '@/components/chat/ProfileImage';
import {
  sortMessagesAscending,
  setPmLastOpened,
} from '@/utils/messageUtils';
import { getFinalUsernameColor, getUserNameplateStyles } from '@/utils/themeUtils';
import { getSocket } from '@/lib/socket';
import { formatTimeWithDate } from '@/utils/timeUtils';
// إزالة استخدام fallback الذي يُظهر "مستخدم #id" لتفادي ظهور اسم افتراضي خاطئ في الخاص
import { api } from '@/lib/queryClient';

interface PrivateMessageBoxProps {
  isOpen: boolean;
  user: ChatUser;
  currentUser: ChatUser | null;
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  onClose: () => void;
  onLoadMore?: () => Promise<{ addedCount: number; hasMore: boolean }>; // تحميل رسائل أقدم
  onViewProfile?: (user: ChatUser) => void;
  onViewStoryByUser?: (userId: number) => void;
}

export default function PrivateMessageBox({
  isOpen,
  user,
  currentUser,
  messages,
  onSendMessage,
  onClose,
  onLoadMore,
  onViewProfile,
  onViewStoryByUser,
}: PrivateMessageBoxProps) {
  const [messageText, setMessageText] = useState('');
  const MAX_CHARS = 192;
  const clampToMaxChars = useCallback((text: string) => (text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) : text), [MAX_CHARS]);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const prevMessagesLenRef = useRef<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { textColor: composerTextColor, bold: composerBold } = useComposerStyle();
  const isDmClosed = (user as any)?.dmPrivacy === 'none';
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const otherTypingTimerRef = useRef<number | null>(null);
  const lastTypingEmitRef = useRef<number>(0);
  // Read receipts: last read timestamp received from other user via socket
  const [otherLastReadAt, setOtherLastReadAt] = useState<string | null>(null);

  // Emit private typing (throttled ~3s)
  const emitPrivateTyping = useCallback(() => {
    try {
      const now = Date.now();
      if (now - lastTypingEmitRef.current < 3000) return;
      lastTypingEmitRef.current = now;
      const s = getSocket();
      if (!s?.connected || !currentUser?.id || !user?.id) return;
      s.emit('privateTyping', { targetUserId: user.id, isTyping: true });
    } catch {}
  }, [currentUser?.id, user?.id]);

  // Listen for privateTyping from the other user + conversationRead sync
  useEffect(() => {
    const s = getSocket();
    // حافظ على مرجع مستقر للمعالج لمنع إضافة/إزالة متعددة بلا داعٍ
    const onMessage = (payload: any) => {
      try {
        const envelope = (payload && payload.envelope) ? payload.envelope : payload;
        if (!envelope || typeof envelope !== 'object') return;
        // Typing indicator
        if (envelope?.type === 'privateTyping') {
          const fromId = envelope?.fromUserId;
          const isTyping = !!envelope?.isTyping;
          if (!fromId || fromId !== user?.id) return;
          if (isTyping) {
            setIsOtherTyping(true);
            if (otherTypingTimerRef.current) {
              clearTimeout(otherTypingTimerRef.current);
            }
            otherTypingTimerRef.current = window.setTimeout(() => {
              setIsOtherTyping(false);
              if (otherTypingTimerRef.current) {
                clearTimeout(otherTypingTimerRef.current);
                otherTypingTimerRef.current = null;
              }
            }, 3000);
          }
        }
        // Conversation read sync (update seen only when the OTHER user is the reader)
        if (envelope?.type === 'conversationRead') {
          const readerId = (envelope as any)?.readerUserId ?? (envelope as any)?.readerId;
          if (readerId && readerId === user?.id && typeof (envelope as any)?.lastReadAt === 'string') {
            setOtherLastReadAt((envelope as any).lastReadAt);
          }
        }
      } catch {}
    };
    try { s.on('message', onMessage); } catch {}
    return () => {
      try { s.off('message', onMessage); } catch {}
      if (otherTypingTimerRef.current) {
        clearTimeout(otherTypingTimerRef.current);
        otherTypingTimerRef.current = null;
      }
    };
  }, [user?.id]);

  const handleViewProfileClick = useCallback(() => {
    try {
      onViewProfile && onViewProfile(user);
    } catch {}
  }, [onViewProfile, user]);

  // YouTube modal state
  const [youtubeModal, setYoutubeModal] = useState<{ open: boolean; videoId: string | null }>(
    { open: false, videoId: null }
  );

  // Image lightbox state
  const [imageLightbox, setImageLightbox] = useState<{ open: boolean; src: string | null }>({
    open: false,
    src: null,
  });

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

  // محسن: ترتيب الرسائل مع تحسين الأداء
  const sortedMessages = useMemo(() => sortMessagesAscending(messages || []), [messages]);

  // تجميع الرسائل المتتالية لنفس المرسل ضمن نافذة زمنية قصيرة (مثل Messenger)
  const GROUP_TIME_MS = 5 * 60 * 1000; // 5 دقائق
  const getIsMe = useCallback((m: any) => !!(currentUser && m && m.senderId === currentUser.id), [currentUser]);
  const isSameSender = useCallback((a: any, b: any) => !!a && !!b && a.senderId === b.senderId, []);
  const isWithinWindow = useCallback((a: any, b: any) => {
    if (!a || !b) return false;
    const ta = new Date(a.timestamp as any).getTime();
    const tb = new Date(b.timestamp as any).getTime();
    if (!Number.isFinite(ta) || !Number.isFinite(tb)) return false;
    return Math.abs(tb - ta) <= GROUP_TIME_MS;
  }, []);

  // محسن: دالة التمرير مع تحسين الأداء
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    try {
      if (!virtuosoRef.current || sortedMessages.length === 0) return;
      virtuosoRef.current.scrollToIndex({ index: sortedMessages.length - 1, align: 'end', behavior });
    } catch {}
  }, [sortedMessages.length]);

  // تثبيت الفتح: اضبط عداد الطول وركّز الإدخال دون تمرير متكرر
  useEffect(() => {
    if (!isOpen) return;
    // ابدأ من الصفر كي يتكفل تأثير الرسائل الأولى بالتمرير عند وصول البيانات
    prevMessagesLenRef.current = 0;
    const t = setTimeout(() => inputRef.current?.focus(), 150);
    return () => { clearTimeout(t); };
  }, [isOpen]);

  // تحديث آخر وقت فتح للمحادثة لاحتساب غير المقروء
  useEffect(() => {
    if (isOpen && currentUser?.id && user?.id) {
      try {
        setPmLastOpened(currentUser.id, user.id);
      } catch {}
    }
  }, [isOpen, currentUser?.id, user?.id]);

  // تحديث مؤشّر القراءة (مخفّض الاستدعاءات): اربطه بتغير آخر رسالة فقط أثناء الفتح
  const lastMessageDeps = React.useMemo(() => {
    const last: any = sortedMessages[sortedMessages.length - 1];
    return last ? (last.id ?? String(last.timestamp)) : null;
  }, [sortedMessages.length]);

  useEffect(() => {
    if (!isOpen || !currentUser?.id || !user?.id) return;
    try {
      const last: any = sortedMessages[sortedMessages.length - 1];
      const payload: any = {
        otherUserId: user.id,
        lastReadAt: last ? String(last.timestamp) : new Date().toISOString(),
        lastReadMessageId: last ? last.id : undefined,
      };
      fetch('/api/private-messages/reads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      }).catch(() => {});
    } catch {}
  }, [isOpen, user?.id, currentUser?.id, lastMessageDeps]);

  // لا تمرير تلقائي إطلاقاً: فقط خزّن الطول الحالي للاستخدام الداخلي إذا لزم
  useEffect(() => {
    prevMessagesLenRef.current = sortedMessages.length;
  }, [sortedMessages.length]);

  // أزلنا التمرير عند تركيز الإدخال

  // تمت إزالة سجلات التشخيص ومراقبة القاع

  // محسن: دالة إرسال مع إعادة المحاولة ومعالجة أخطاء محسنة
  const sendMessageWithRetry = useCallback(
    async (content: string, retries = 3): Promise<boolean> => {
      for (let i = 0; i < retries; i++) {
        try {
          await onSendMessage(content);
          return true;
        } catch (error) {
          if (i === retries - 1) {
            throw error;
          }
          // انتظر قبل إعادة المحاولة (زيادة تدريجية)
          await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
      return false;
    },
    [onSendMessage]
  );

  const handleSend = useCallback(async () => {
    if (isSending) return;
    const text = clampToMaxChars(messageText).trim();
    const hasText = !!text;
    const hasImage = !!imageFile;
    if (!hasText && !hasImage) return;

    // لا نحجب الواجهة أثناء الإرسال لتحسين الشعور بالاستجابة
    setIsSending(true);
    setSendError(null);
    clearTimeout(retryTimeoutRef.current);

    try {
      if (hasImage) {
        // إرسال الصورة عبر مسار الرفع الموحّد وتمرير receiverId للخاص
        if (!currentUser?.id || !user?.id) throw new Error('بيانات المرسل أو المستلم غير متوفرة');
        const form = new FormData();
        form.append('image', imageFile!);
        form.append('senderId', String(currentUser.id));
        form.append('receiverId', String(user.id));
        await api.upload('/api/upload/message-image', form, { timeout: 60000 });
        setImageFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        toast.success('تم إرسال الصورة');
      }
      if (hasText) {
        const success = await sendMessageWithRetry(text);
        if (success) {
          setMessageText('');
          // لا نعرض toast للرسائل العادية لتجنب الإزعاج
        }
      }
      // لا حاجة لاستدعاء التمرير هنا؛ Virtuoso و/أو تأثير الرسائل سيتكفلان
    } catch (error) {
      console.error('خطأ في إرسال الرسالة:', error);
      const errorMessage = error instanceof Error ? error.message : 'فشل إرسال الرسالة';
      // إخفاء رسائل الأخطاء من الواجهة الخاصة بناءً على رغبتك
      setSendError(null);
      console.error(errorMessage);

      // إعادة تعيين حالة الخطأ بعد 5 ثوان
      retryTimeoutRef.current = setTimeout(() => setSendError(null), 5000);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  }, [messageText, imageFile, isSending, sendMessageWithRetry, scrollToBottom]);

  // محسن: معالج الضغط على Enter
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // When user types, emit typing (throttled)
  const handleChangeWithTyping = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setMessageText(clampToMaxChars(e.target.value));
      emitPrivateTyping();
    },
    [clampToMaxChars, emitPrivateTyping]
  );

  // دعم لصق الصور مباشرة في صندوق الإدخال
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    try {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.type.startsWith('image/')) {
          const file = it.getAsFile();
          if (file) {
            setImageFile(file);
            e.preventDefault();
            break;
          }
        }
      }
    } catch {}
  }, []);

  // تحميل المزيد عند الوصول للأعلى
  const handleLoadMore = useCallback(async () => {
    if (isLoadingOlder || !hasMore || !onLoadMore) return;
    setIsLoadingOlder(true);
    try {
      const res = await onLoadMore();
      setHasMore(res.hasMore);
      try { (virtuosoRef.current as any)?.adjustForPrependedItems?.(res.addedCount || 0); } catch {}
    } finally {
      setIsLoadingOlder(false);
    }
  }, [isLoadingOlder, hasMore, onLoadMore]);

  // لون الحد والقص باستخدام دوال موحدة

  if (!isOpen) return null;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="p-0 bg-transparent border-none shadow-none">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative z-[12000] w-[95vw] max-w-lg max-h-[85vh] bg-background text-foreground border border-border shadow-2xl rounded-xl overflow-hidden flex flex-col"
        >
          <DialogHeader className="relative border-b border-border px-3 py-2 modern-nav">
            <DialogTitle className="sr-only">محادثة خاصة مع {user?.username || 'مستخدم'}</DialogTitle>
            <DialogDescription className="sr-only">نافذة الرسائل الخاصة</DialogDescription>
            <div className="flex items-center gap-3">
              <ProfileImage
                user={user}
                size="small"
                className="w-10 h-10 cursor-pointer hover:opacity-90 transition"
                onClick={() => handleViewProfileClick()}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {(() => {
                      const np = getUserNameplateStyles(user);
                      const hasNp = np && Object.keys(np).length > 0;
                      if (hasNp) {
                        return (
                          <button
                            onClick={handleViewProfileClick}
                            role="button"
                            tabIndex={0}
                            className="truncate transition-transform duration-200 hover:scale-[1.02]"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleViewProfileClick();
                              }
                            }}
                            title={user.username}
                          >
                            <span className="ac-nameplate" style={np}>
                              <span className="ac-name">{user.username || '...'}</span>
                              <span className="ac-mark">〰</span>
                            </span>
                          </button>
                        );
                      }
                      return (
                        <span
                          className="text-base font-medium transition-all duration-300 truncate cursor-pointer hover:underline"
                          onClick={handleViewProfileClick}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleViewProfileClick();
                            }
                          }}
                          style={{
                            color: getFinalUsernameColor(user),
                            textShadow: getFinalUsernameColor(user)
                              ? `0 0 10px ${getFinalUsernameColor(user)}40`
                              : 'none',
                            filter: getFinalUsernameColor(user)
                              ? 'drop-shadow(0 0 3px rgba(255,255,255,0.3))'
                              : 'none',
                          }}
                          title={user.username}
                        >
                          {user.username || 'جاري التحميل...'}
                        </span>
                      );
                    })()}
                    <UserRoleBadge user={user} size={20} />
                  </div>
                  {/* زر الإغلاق يسار بنفس نمط الأثرياء/الإعدادات */}
                  <button
                    onClick={onClose}
                    className="absolute left-2 top-2 px-2 py-1 hover:bg-red-100 text-red-600 text-sm font-medium rounded"
                    aria-label="إغلاق"
                    title="إغلاق"
                  >
                    ✖️
                  </button>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="relative flex-1 min-h-0 w-full p-4 pb-4 bg-gray-100 overflow-hidden">
            {sortedMessages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-6xl mb-4">
                  💬
                </motion.div>
                <p className="text-lg font-medium">ابدأ محادثتك الآن</p>
                <p className="text-sm opacity-70 mt-2">لا توجد رسائل سابقة</p>
              </div>
            ) : (
              <Virtuoso
                ref={virtuosoRef}
                data={sortedMessages}
                className="h-full"
                style={{ height: '100%' }}
                // لا تتبع الخرج تلقائياً
                followOutput={false as any}
                increaseViewportBy={{ top: 300, bottom: 300 }}
                defaultItemHeight={56}
                startReached={handleLoadMore}
                computeItemKey={(index, m) => (m as any)?.id ?? `${(m as any)?.senderId}-${(m as any)?.timestamp}-${index}`}
                components={{
                  Header: () =>
                    isLoadingOlder ? (
                      <div className="flex justify-center py-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-transparent"></div>
                      </div>
                    ) : hasMore ? (
                      <div className="text-center py-1 text-xs text-gray-400">اسحب للأعلى لتحميل المزيد</div>
                    ) : null,
                }}
                itemContent={(index, m) => {
                  const isMe = !!(currentUser && m.senderId === currentUser.id);
                  const key = m.id ?? `${m.senderId}-${m.timestamp}-${index}`;
                  const isImage =
                    m.messageType === 'image' ||
                    (typeof m.content === 'string' && (m.content.startsWith('data:image') || /\.(png|jpe?g|gif|webp)$/i.test(m.content)));
                  const storyAttachment = Array.isArray((m as any).attachments)
                    ? (m as any).attachments.find((a: any) => a?.channel === 'story')
                    : null;
                  const hasStoryContext = !!storyAttachment;

                  const prev = index > 0 ? sortedMessages[index - 1] : null;
                  const next = index + 1 < sortedMessages.length ? sortedMessages[index + 1] : null;
                  const groupStart = !prev || !isSameSender(prev, m) || !isWithinWindow(prev, m);
                  const groupEnd = !next || !isSameSender(next, m) || !isWithinWindow(next, m);
                  const showAvatar = !isMe;

                  return (
                    <div key={key} className="w-full mb-2" dir="rtl">
                      <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-start gap-2`}>
                        {!isMe && showAvatar && (
                          <div className="flex-shrink-0 order-1 self-start">
                            <ProfileImage
                              user={(m.sender as ChatUser) || user}
                              size="small"
                              className="w-8 h-8 rounded-full"
                            />
                          </div>
                        )}
                        {isMe && (
                          <div className="flex-shrink-0 order-3 self-start">
                            <ProfileImage
                              user={currentUser!}
                              size="small"
                              className="w-8 h-8 rounded-full"
                            />
                          </div>
                        )}
                        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%] ${!isMe && showAvatar ? 'order-2' : isMe ? 'order-2' : ''}`}>
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className={`relative px-3 py-2 rounded-2xl shadow-sm ${isMe ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' : 'bg-gray-800 text-white'} ${groupStart && isMe ? 'rounded-tr-md' : ''} ${groupEnd && isMe ? 'rounded-br-lg' : ''} ${groupStart && !isMe ? 'rounded-tl-md' : ''} ${groupEnd && !isMe ? 'rounded-bl-lg' : ''}`}
                          >
                            {hasStoryContext && (
                              <div className="mb-2">
                                <div className="flex items-center gap-3 p-2 rounded-lg border bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
                                  <motion.div className="w-14 h-20 rounded-md overflow-hidden bg-black/5 border border-purple-200 relative">
                                    <img
                                      src={
                                        storyAttachment?.storyMediaType === 'video'
                                          ? (storyAttachment?.storyThumbnailUrl || storyAttachment?.storyMediaUrl)
                                          : storyAttachment?.storyMediaUrl
                                      }
                                      alt="Story preview"
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                    />
                                  </motion.div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs text-purple-800 font-medium">
                                      {storyAttachment?.subtype === 'reaction' ? 'تفاعل على حالتك' : 'رد على حالتك'}
                                    </div>
                                    <div className="text-[11px] text-purple-700/80">اضغط لعرض الحالة</div>
                                  </div>
                                  <button
                                    onClick={() => {
                                      try {
                                        const uid = storyAttachment?.storyUserId || user.id;
                                        onViewStoryByUser && onViewStoryByUser(uid);
                                      } catch {}
                                    }}
                                    className="text-xs px-2 py-1 rounded-md bg-purple-600 text-white hover:bg-purple-700 transition"
                                  >
                                    عرض الحالة
                                  </button>
                                </div>
                              </div>
                            )}
                            {isImage ? (
                              <button type="button" onClick={() => setImageLightbox({ open: true, src: m.content })} className="p-0 bg-transparent rounded-lg overflow-hidden" title="عرض الصورة" aria-label="عرض الصورة">
                                <img src={m.content} alt="صورة مرفقة" className="block max-w-[220px] max-h-[260px] object-cover rounded-lg" loading="lazy" decoding="async" />
                              </button>
                            ) : (
                              (() => {
                                const { cleaned, ids } = parseYouTubeFromText(m.content);
                                if (ids.length > 0) {
                                  const firstId = ids[0];
                                  return (
                                    <div className="flex items-center gap-2">
                                      {cleaned && <span className="text-sm leading-relaxed">{cleaned}</span>}
                                      <button onClick={() => setYoutubeModal({ open: true, videoId: firstId })} className="flex items-center justify-center w-8 h-6 rounded bg-red-600 hover:bg-red-700 transition-colors" title="فتح فيديو YouTube">
                                        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                                          <path fill="#fff" d="M10 15l5.19-3L10 9v6z"></path>
                                        </svg>
                                      </button>
                                    </div>
                                  );
                                }
                                return <span className="text-sm leading-relaxed break-words">{m.content}</span>;
                              })()
                            )}
                          </motion.div>
                          <div className={`flex items-center gap-1 mt-1 text-xs text-gray-500 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                            <span>{formatTimeWithDate(m.timestamp as any)}</span>
                            {isMe && (() => {
                              const seen = (() => {
                                try {
                                  if (!otherLastReadAt) return false;
                                  const lastReadMs = new Date(otherLastReadAt).getTime();
                                  const thisMsgMs = new Date(m.timestamp as any).getTime();
                                  return Number.isFinite(lastReadMs) && Number.isFinite(thisMsgMs) && lastReadMs >= thisMsgMs;
                                } catch { return false; }
                              })();
                              return seen ? <CheckCheck className="w-4 h-4 text-blue-400" /> : <Check className="w-4 h-4 text-gray-400" />;
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
            )}

            {/* تم إخفاء زر "الانتقال لأسفل" */}
          </div>

          <div className="p-4 border-t border-border modern-nav">
            {isOtherTyping && (
              <div className="px-1 pb-2 text-[11px] text-gray-500 animate-pulse select-none">
                {user?.username} يكتب...
              </div>
            )}
            {isDmClosed ? (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-center text-sm text-gray-600">
                عفواً هذا العضو قامَ بإغلاق الرسائل الخاصة
              </div>
            ) : (
              <>
                <div className="flex gap-3 items-end">
                  {/* زر اختيار الصورة */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="pm-gallery-button aspect-square mobile-touch-button min-w-[40px] min-h-[40px] bg-primary/10 text-primary border-primary/20 hover:bg-primary/15"
                    disabled={false}
                    title="إرسال صورة"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </Button>
                  <Input
                    ref={inputRef}
                    value={messageText}
                    onChange={handleChangeWithTyping}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    placeholder="اكتب رسالتك هنا..."
                    className={`flex-1 bg-gray-50 border text-foreground placeholder:text-muted-foreground rounded-lg border-gray-300`}
                    disabled={false}
                    style={{ color: composerTextColor, fontWeight: composerBold ? 700 : undefined }}
                    maxLength={MAX_CHARS}
                  />
                  {/* زر الإرسال بشكل أيقونة مثل غرف الدردشة */}
                  <Button
                    onClick={handleSend}
                    disabled={!messageText.trim() && !imageFile}
                    className="aspect-square bg-primary hover:bg-primary/90 mobile-touch-button min-w-[40px] min-h-[40px]"
                    title="إرسال"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                {imageFile && (
                  <div className="mt-2 text-xs text-gray-600 flex items-center gap-2">
                    <span>سيتم إرسال صورة:</span>
                    <span className="font-medium truncate max-w-[200px]">{imageFile.name}</span>
                    <button
                      className="text-red-600 hover:underline"
                      onClick={() => setImageFile(null)}
                      type="button"
                    >
                      إزالة
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </DialogContent>
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
          <DialogHeader className="sr-only">
            <DialogTitle>مشغل يوتيوب</DialogTitle>
            <DialogDescription>نافذة فيديو من YouTube</DialogDescription>
          </DialogHeader>
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
    </Dialog>
  );
}

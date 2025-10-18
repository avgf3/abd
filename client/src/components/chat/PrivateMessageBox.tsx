import { motion } from 'framer-motion';
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Send, Image as ImageIcon, Check, CheckCheck } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, FloatingDialogContent } from '@/components/ui/dialog';
import ImageLightbox from '@/components/ui/ImageLightbox';
import UserRoleBadge from '@/components/chat/UserRoleBadge';
import { Input } from '@/components/ui/input';
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
import { api } from '@/lib/queryClient';

interface PrivateMessageBoxProps {
  isOpen: boolean;
  user: ChatUser;
  currentUser: ChatUser | null;
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  onClose: () => void;
  onLoadMore?: () => Promise<{ addedCount: number; hasMore: boolean }>;
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
  const [isSending, setIsSending] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [otherLastReadAt, setOtherLastReadAt] = useState<string | null>(null);

  // Refs
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Unified timers object
  const timersRef = useRef<{
    typing: number | null;
    retry: number | null;
    focus: number | null;
  }>({
    typing: null,
    retry: null,
    focus: null,
  });

  const lastTypingEmitRef = useRef<number>(0);
  const { textColor: composerTextColor, bold: composerBold } = useComposerStyle();
  const isDmClosed = (user as any)?.dmPrivacy === 'none';

  // Sort messages
  const sortedMessages = useMemo(() => sortMessagesAscending(messages || []), [messages]);

  // Simple message grouping (no useCallback needed)
  const isGrouped = (current: any, previous: any) => {
    if (!previous || !current) return false;
    const timeDiff = new Date(current.timestamp as any).getTime() - new Date(previous.timestamp as any).getTime();
    return current.senderId === previous.senderId && Math.abs(timeDiff) <= 300000; // 5 minutes
  };

  // Simple clamp function (no useCallback needed)
  const clampToMaxChars = (text: string) => text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) : text;

  // Scroll to bottom function
  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end'
      });
    }
  };

  // Handle scroll for loading more messages
  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container || isLoadingOlder || !hasMore || !onLoadMore) return;
    
    if (container.scrollTop === 0) {
      handleLoadMore();
    }
  };

  // Load more messages (keep useCallback - it's complex)
  const handleLoadMore = useCallback(async () => {
    if (isLoadingOlder || !hasMore || !onLoadMore) return;
    
    const container = messagesContainerRef.current;
    const scrollHeight = container?.scrollHeight || 0;
    
    setIsLoadingOlder(true);
    try {
      const res = await onLoadMore();
      setHasMore(res.hasMore);
      
      // Maintain scroll position after loading older messages
      if (res.addedCount > 0 && container) {
        const newScrollHeight = container.scrollHeight;
        container.scrollTop = newScrollHeight - scrollHeight;
      }
    } finally {
      setIsLoadingOlder(false);
    }
  }, [isLoadingOlder, hasMore, onLoadMore]);

  // Emit typing (keep useCallback - has throttling logic)
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

  // Send message with retry (keep useCallback - complex logic)
  const sendMessageWithRetry = useCallback(
    async (content: string, retries = 3): Promise<boolean> => {
      for (let i = 0; i < retries; i++) {
        try {
          await onSendMessage(content);
          return true;
        } catch (error) {
          if (i === retries - 1) throw error;
          await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
      return false;
    },
    [onSendMessage]
  );

  // Handle send (keep useCallback - complex logic)
  const handleSend = useCallback(async () => {
    if (isSending) return;
    const text = clampToMaxChars(messageText).trim();
    const hasText = !!text;
    const hasImage = !!imageFile;
    if (!hasText && !hasImage) return;

    setIsSending(true);
    if (timersRef.current.retry) {
      clearTimeout(timersRef.current.retry);
      timersRef.current.retry = null;
    }

    try {
      if (hasImage) {
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
        }
      }
    } catch (error) {
      console.error('خطأ في إرسال الرسالة:', error);
      // Could show error to user here if needed
      toast.error('فشل إرسال الرسالة، جاري المحاولة مرة أخرى...');
    } finally {
      setIsSending(false);
      timersRef.current.focus = window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [messageText, imageFile, isSending, sendMessageWithRetry, currentUser?.id, user?.id]);

  // Socket listener for typing and read receipts
  useEffect(() => {
    const s = getSocket();
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
            if (timersRef.current.typing) {
              clearTimeout(timersRef.current.typing);
            }
            timersRef.current.typing = window.setTimeout(() => {
              setIsOtherTyping(false);
              timersRef.current.typing = null;
            }, 3000);
          }
        }
        
        // Read receipts
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
      // Clear all timers on cleanup
      Object.values(timersRef.current).forEach(timer => {
        if (timer) clearTimeout(timer);
      });
      timersRef.current = { typing: null, retry: null, focus: null };
    };
  }, [user?.id]);

  // Focus input and scroll when opened
  useEffect(() => {
    if (!isOpen) return;
    
    timersRef.current.focus = window.setTimeout(() => {
      inputRef.current?.focus();
      scrollToBottom(false); // Immediate scroll on open
    }, 150);
    
    return () => {
      if (timersRef.current.focus) {
        clearTimeout(timersRef.current.focus);
        timersRef.current.focus = null;
      }
    };
  }, [isOpen]);

  // Update last opened time
  useEffect(() => {
    if (isOpen && currentUser?.id && user?.id) {
      try {
        setPmLastOpened(currentUser.id, user.id);
      } catch {}
    }
  }, [isOpen, currentUser?.id, user?.id]);

  // Update read receipts
  useEffect(() => {
    if (!isOpen || !currentUser?.id || !user?.id || sortedMessages.length === 0) return;
    
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
  }, [isOpen, user?.id, currentUser?.id, sortedMessages.length]);

  // Auto scroll on new messages
  useEffect(() => {
    if (isOpen && sortedMessages.length > 0) {
      scrollToBottom();
    }
  }, [sortedMessages.length, isOpen]);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(clampToMaxChars(e.target.value));
    emitPrivateTyping();
  };

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle paste
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    try {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            setImageFile(file);
            e.preventDefault();
            break;
          }
        }
      }
    } catch {}
  };

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

  // YouTube helper functions (simplified, no useCallback)
  const isAllowedYouTubeHost = (host: string) => {
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
  };

  const extractYouTubeId = (rawUrl: string): string | null => {
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
  };

  const parseYouTubeFromText = (text: string): { cleaned: string; ids: string[] } => {
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
  };

  const handleViewProfileClick = () => {
    try {
      onViewProfile && onViewProfile(user);
    } catch {}
  };

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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative z-[12000] w-[95vw] max-w-lg max-h-[85vh] bg-background text-foreground border border-border shadow-2xl rounded-xl overflow-hidden"
        >
          <DialogHeader className="relative border-b border-border px-3 py-2 modern-nav">
            <DialogTitle className="sr-only">محادثة خاصة مع {user?.username || 'مستخدم'}</DialogTitle>
            <DialogDescription className="sr-only">نافذة الرسائل الخاصة</DialogDescription>
            <div className="flex items-center gap-3">
              <div style={{ 
                width: 40,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ProfileImage
                  user={user}
                  size="small"
                  pixelSize={40}
                  className="cursor-pointer hover:opacity-90 transition"
                  onClick={handleViewProfileClick}
                />
              </div>
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
                              <span className="ac-name" style={{ color: getFinalUsernameColor(user) }}>{user.username || '...'}</span>
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

          <div className="relative h-[55vh] w-full p-4 pb-4 bg-gray-100">
            {sortedMessages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-6xl mb-4">
                  💬
                </motion.div>
                <p className="text-lg font-medium">ابدأ محادثتك الآن</p>
                <p className="text-sm opacity-70 mt-2">لا توجد رسائل سابقة</p>
              </div>
            ) : (
              <div
                ref={messagesContainerRef}
                className="h-full overflow-y-auto scroll-smooth"
                onScroll={handleScroll}
                style={{ overscrollBehavior: 'contain' }}
              >
                {/* Loading indicator */}
                {isLoadingOlder && (
                  <div className="flex justify-center py-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-transparent"></div>
                  </div>
                )}
                {hasMore && !isLoadingOlder && (
                  <div className="text-center py-1 text-xs text-gray-400">
                    اسحب للأعلى لتحميل المزيد
                  </div>
                )}

                {/* Messages */}
                {sortedMessages.map((m, index) => {
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
                  const groupStart = !isGrouped(m, prev);
                  const groupEnd = !isGrouped(next, m);
                  const showAvatar = !isMe;

                  return (
                    <div key={key} className="w-full mb-2" dir="rtl">
                      <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-start gap-2`}>
                        {/* Avatar for received messages */}
                        {!isMe && showAvatar && (
                          <div className="flex-shrink-0 order-1 self-start">
                            <div style={{ 
                              width: 32,
                              height: 32,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <ProfileImage
                                user={(m.sender as ChatUser) || user}
                                size="small"
                                pixelSize={32}
                                className="rounded-full"
                              />
                            </div>
                          </div>
                        )}
                        
                        {/* Avatar for sent messages */}
                        {isMe && (
                          <div className="flex-shrink-0 order-3 self-start">
                            <div style={{ 
                              width: 32,
                              height: 32,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <ProfileImage
                                user={currentUser!}
                                size="small"
                                pixelSize={32}
                                className="rounded-full"
                              />
                            </div>
                          </div>
                        )}
                        
                        {/* Message bubble container */}
                        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%] ${!isMe && showAvatar ? 'order-2' : isMe ? 'order-2' : ''}`}>
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.15, ease: 'easeOut' }}
                            className={`
                              relative px-3 py-2 rounded-2xl shadow-sm
                              ${isMe 
                                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' 
                                : 'bg-gray-800 text-white'
                              }
                              ${groupStart && isMe ? 'rounded-tr-md' : ''}
                              ${groupEnd && isMe ? 'rounded-br-lg' : ''}
                              ${groupStart && !isMe ? 'rounded-tl-md' : ''}
                              ${groupEnd && !isMe ? 'rounded-bl-lg' : ''}
                            `}
                          >
                            {hasStoryContext && (
                              <div className="mb-2">
                                <div className="flex items-center gap-3 p-2 rounded-lg border bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
                                  <motion.div
                                    layoutId={`story-${storyAttachment?.storyId}`}
                                    className="w-14 h-20 rounded-md overflow-hidden bg-black/5 border border-purple-200 relative"
                                  >
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
                                    {storyAttachment?.storyMediaType === 'video' && (
                                      <div className="absolute inset-0 grid place-items-center">
                                        <span className="text-white text-xs bg-black/40 rounded-full w-5 h-5 grid place-items-center">▶</span>
                                      </div>
                                    )}
                                  </motion.div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs text-purple-800 font-medium">
                                      {storyAttachment?.subtype === 'reaction' ? 'تفاعل على حالتك' : 'رد على حالتك'}
                                    </div>
                                    <div className="text-[11px] text-purple-700/80">
                                      اضغط لعرض الحالة
                                    </div>
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
                            
                            {/* Message content */}
                            {isImage ? (
                              <button
                                type="button"
                                onClick={() => setImageLightbox({ open: true, src: m.content })}
                                className="p-0 bg-transparent rounded-lg overflow-hidden"
                                title="عرض الصورة"
                                aria-label="عرض الصورة"
                              >
                                <img
                                  src={m.content}
                                  alt="صورة مرفقة"
                                  className="block max-w-[220px] max-h-[260px] object-cover rounded-lg"
                                  loading="lazy"
                                  decoding="async"
                                />
                              </button>
                            ) : (() => {
                              const { cleaned, ids } = parseYouTubeFromText(m.content);
                              if (ids.length > 0) {
                                const firstId = ids[0];
                                return (
                                  <div className="flex items-center gap-2">
                                    {cleaned && (
                                      <span className="text-sm leading-relaxed">
                                        {cleaned}
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
                                  </div>
                                );
                              }
                              return (
                                <span className="text-sm leading-relaxed break-words">
                                  {m.content}
                                </span>
                              );
                            })()}
                          </motion.div>
                          
                          {/* Timestamp and read receipts */}
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
                              return seen ? (
                                <CheckCheck className="w-4 h-4 text-blue-400" />
                              ) : (
                                <Check className="w-4 h-4 text-gray-400" />
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* Scroll anchor */}
                <div ref={messagesEndRef} />
              </div>
            )}
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
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    placeholder="اكتب رسالتك هنا..."
                    className={`flex-1 bg-gray-50 border text-foreground placeholder:text-muted-foreground rounded-lg border-gray-300`}
                    disabled={false}
                    style={{ color: composerTextColor, fontWeight: composerBold ? 700 : undefined }}
                    maxLength={MAX_CHARS}
                  />
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
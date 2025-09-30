import { Send, Image as ImageIcon, MoreVertical, Lock, UserX } from 'lucide-react';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';

// Emoji pickers and ComposerPlusMenu removed to match DM composer style
import ProfileImage from './ProfileImage';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, FloatingDialogContent } from '@/components/ui/dialog';
import ImageLightbox from '@/components/ui/ImageLightbox';
import { useIsMobile } from '@/hooks/use-mobile';
import { apiRequest, api } from '@/lib/queryClient';
import type { ChatMessage, ChatUser } from '@/types/chat';
import {
  playMentionSound,
  renderMessageWithMentions,
} from '@/utils/mentionUtils';
import { getDynamicBorderColor } from '@/utils/messageUtils';
import { getFinalUsernameColor } from '@/utils/themeUtils';
import { formatTime } from '@/utils/timeUtils';
// Removed ComposerPlusMenu (ready/quick options)
import { useComposerStyle } from '@/contexts/ComposerStyleContext';
import { renderMessageWithAnimatedEmojis } from '@/utils/animatedEmojiUtils';
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
  const [isTyping, setIsTyping] = useState(false);
  const isMobile = useIsMobile();
  const { textColor: composerTextColor, bold: composerBold } = useComposerStyle();
  // حد أقصى لعدد الأحرف في الكتابة (سطح المكتب والهاتف)
  const MAX_CHARS = 192;
  const clampToMaxChars = useCallback((text: string) => (text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) : text), [MAX_CHARS]);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingTime = useRef<number>(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
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
    if (isOwner) return false;
    if (chatLockAll) return true;
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
    const base = messages.filter(
      (msg) => msg && msg.content && msg.content.trim() !== '' && msg.sender
    );
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
    if (isAtBottom || sentByMe) {
      scrollToBottom('smooth');
      setUnreadCount(0);
    } else {
      setUnreadCount((count) => count + (currLen - prevLen));
    }
    prevMessagesLenRef.current = currLen;
  }, [validMessages.length, isAtBottom, currentUser, scrollToBottom]);

  useEffect(() => {
    prevMessagesLenRef.current = validMessages.length;
    scrollToBottom('auto');
    setIsAtBottom(true);
  }, [scrollToBottom]);

  // تشغيل صوت التنبيه عند استقبال منشن - محسن
  useEffect(() => {
    if (validMessages.length > 0 && currentUser) {
      const lastMessage = validMessages[validMessages.length - 1];
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
    if (now - lastTypingTime.current > 3000) {
      onTyping();
      lastTypingTime.current = now;
      setIsTyping(true);
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
      setIsTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      onSendMessage(trimmedMessage);
      setMessageText('');
      inputRef.current?.focus();
    }
  }, [messageText, currentUser, onSendMessage]);

  // File upload handler - محسن
  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !currentUser) return;
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

  // Username click handler - إدراج المنشن
  const handleUsernameClick = useCallback(
    (event: React.MouseEvent, user: ChatUser) => {
      event.stopPropagation();
      const separator = messageText.trim() ? ' ' : '';
      const newText = clampToMaxChars(messageText + separator + user.username + ' ');
      setMessageText(newText);
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
      <div className={`relative flex-1 p-2 bg-gradient-to-b from-gray-50 to-white`}>
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
              (() => {
                const isMe = !!(currentUser && message.senderId === currentUser.id);
                const textStyle = currentUser && message.senderId === currentUser.id
                  ? { color: composerTextColor, fontWeight: composerBold ? 600 : undefined }
                  : undefined;
                return (
                  <div
                    key={message.id}
                    className={`flex items-start gap-3 p-3 rounded-lg transition-all duration-300 ${isMe ? 'bg-blue-50/80 border-r-4 ml-4' : 'bg-green-50/80 border-r-4 mr-4'}`}
                    style={{ borderRightColor: getDynamicBorderColor(message.sender) }}
                    data-message-type={message.messageType || 'normal'}
                  >
                    {message.sender && (
                      <ProfileImage
                        user={message.sender}
                        size="small"
                        className="w-8 h-8 cursor-pointer hover:scale-110 transition-transform duration-200"
                        onClick={(e) => onUserClick && onUserClick(e, message.sender!)}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="runin-container">
                        <div className="runin-name">
                          <button
                            onClick={(e) => message.sender && handleUsernameClick(e, message.sender)}
                            className="font-semibold text-sm hover:underline"
                            style={{ color: getFinalUsernameColor(message.sender) }}
                          >
                            {message.sender?.username || 'جاري التحميل...'}
                          </button>
                          <span className={`${message.messageType === 'system' ? 'text-red-400' : 'text-gray-400'} mx-1`}>:</span>
                        </div>
                        <div className={`runin-text ${message.messageType === 'system' ? 'text-red-600' : 'text-gray-800'} break-words message-content-fix`}>
                          {message.messageType === 'image' ? (
                            <img
                              src={message.content}
                              alt="صورة"
                              className="max-h-40 rounded-lg cursor-pointer shadow-sm hover:shadow-md transition-shadow"
                              loading="lazy"
                              onLoad={() => {
                                if (isAtBottom) {
                                  scrollToBottom('auto');
                                }
                              }}
                              onClick={() => setImageLightbox({ open: true, src: message.content })}
                            />
                          ) : (() => {
                            const { cleaned, ids } = parseYouTubeFromText(message.content);
                            const clampClass = isMessageExpanded(message.id) ? '' : (isMobile ? 'line-clamp-4' : 'line-clamp-2');
                            if (ids.length > 0) {
                              const firstId = ids[0];
                              return (
                                <span className="text-sm leading-relaxed inline-flex items-center gap-2">
                                  {cleaned && (
                                    <span
                                      className={`flex-1 ${clampClass}`}
                                      style={textStyle}
                                      onClick={() => toggleMessageExpanded(message.id)}
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
                                className={`text-sm leading-relaxed ${clampClass}`}
                                style={textStyle}
                                onClick={() => toggleMessageExpanded(message.id)}
                              >
                                {renderMessageWithAnimatedEmojis(
                                  message.content,
                                  (text) => renderMessageWithMentions(text, currentUser, onlineUsers)
                                )}
                              </span>
                            );
                          })()}
                        </div>
                        <span className="text-xs text-gray-500 whitespace-nowrap shrink-0 self-start">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                    </div>

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
                          {onReportMessage && message.sender && currentUser && message.sender.id !== currentUser.id && (
                            <DropdownMenuItem onClick={() => onReportMessage(message.sender!, message.content, message.id)}>
                              🚩 تبليغ
                            </DropdownMenuItem>
                          )}
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
                  </div>
                );
              })()
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

      {/* Message Input - مطابقة الخاص */}
      <div className={`p-4 border-t border-border modern-nav`}>
        {/* Typing Indicator */}
        {typingUsers.size > 0 && (
          <div className="mb-1.5 text-[11px] text-gray-500 animate-pulse">{typingDisplay}</div>
        )}

        <div className="flex gap-3 items-end">
          {/* زر اختيار الصورة */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="aspect-square mobile-touch-button min-w-[40px] min-h-[40px] bg-primary/10 text-primary border-primary/20 hover:bg-primary/15"
            disabled={!currentUser || isChatRestricted}
            title="إرسال صورة"
          >
            <ImageIcon className="w-4 h-4" />
          </Button>
          {(!currentUser || isChatRestricted) ? (
            <input
              type="text"
              value={''}
              onChange={() => {}}
              placeholder={getRestrictionMessage || 'هذه الخاصية غير متوفرة الآن'}
              className={`flex-1 bg-gray-50 border text-foreground placeholder:text-muted-foreground rounded-lg border-gray-300 ${isMobile ? 'h-12' : 'h-11'} px-4`}
              disabled
              style={{ color: composerTextColor, fontWeight: composerBold ? 600 : undefined }}
            />
          ) : (
            <Input
              ref={inputRef}
              value={messageText}
              onChange={(e) => setMessageText(clampToMaxChars(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                } else {
                  handleTypingThrottled();
                }
              }}
              onPaste={(e) => {
                try {
                  const paste = e.clipboardData.getData('text');
                  const el = e.currentTarget as HTMLInputElement;
                  const selectionStart = el.selectionStart ?? messageText.length;
                  const selectionEnd = el.selectionEnd ?? messageText.length;
                  const combined = messageText.slice(0, selectionStart) + paste + messageText.slice(selectionEnd);
                  const next = clampToMaxChars(combined);
                  if (next !== combined) {
                    e.preventDefault();
                    setMessageText(next);
                  }
                } catch {}
              }}
              placeholder="اكتب رسالتك هنا..."
              className={`flex-1 bg-gray-50 border text-foreground placeholder:text-muted-foreground rounded-lg border-gray-300`}
              disabled={false}
              style={{ color: composerTextColor, fontWeight: composerBold ? 600 : undefined }}
              maxLength={MAX_CHARS}
            />
          )}
          {/* زر الإرسال */}
          <Button
            onClick={handleSendMessage}
            disabled={!messageText.trim() || !currentUser || isChatRestricted}
            className="aspect-square bg-primary hover:bg-primary/90 mobile-touch-button min-w-[40px] min-h-[40px]"
            title="إرسال"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}

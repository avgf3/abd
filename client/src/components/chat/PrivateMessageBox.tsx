import { motion, AnimatePresence } from 'framer-motion';
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ImageLightbox from '@/components/ui/ImageLightbox';
import UserRoleBadge from '@/components/chat/UserRoleBadge';
import { Input } from '@/components/ui/input';
// Removed ComposerPlusMenu (ready/quick options)
import { useComposerStyle } from '@/contexts/ComposerStyleContext';
import type { ChatMessage, ChatUser } from '@/types/chat';
import ProfileImage from '@/components/chat/ProfileImage';
import {
  sortMessagesAscending,
  getDynamicBorderColor,
  formatMessagePreview,
  setPmLastOpened,
} from '@/utils/messageUtils';
import { getFinalUsernameColor } from '@/utils/themeUtils';
import { formatTime } from '@/utils/timeUtils';
import { getCachedUsername } from '@/utils/userCacheManager';

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
  const [isAtBottomPrivate, setIsAtBottomPrivate] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { textColor: composerTextColor, bold: composerBold } = useComposerStyle();

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

  // محسن: دالة التمرير مع تحسين الأداء
  type ScrollBehaviorStrict = 'auto' | 'smooth';
  const scrollToBottom = useCallback(
    (behavior: ScrollBehaviorStrict = 'auto') => {
      if (!virtuosoRef.current || sortedMessages.length === 0) return;
      virtuosoRef.current.scrollToIndex({
        index: sortedMessages.length - 1,
        align: 'end',
        behavior,
      });
    },
    [sortedMessages.length]
  );

  // التمرير للأسفل عند فتح النافذة
  useEffect(() => {
    if (isOpen && inputRef.current) {
      const timer = setTimeout(() => {
        scrollToBottom('auto');
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, scrollToBottom]);

  // تحديث آخر وقت فتح للمحادثة لاحتساب غير المقروء
  useEffect(() => {
    if (isOpen && currentUser?.id && user?.id) {
      try {
        setPmLastOpened(currentUser.id, user.id);
      } catch {}
    }
  }, [isOpen, currentUser?.id, user?.id]);

  // التمرير عند وصول رسائل جديدة (محسن)
  useEffect(() => {
    if (sortedMessages.length > 0 && isAtBottomPrivate) {
      const timer = setTimeout(() => {
        scrollToBottom(sortedMessages.length <= 20 ? 'smooth' : 'auto');
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [sortedMessages.length, isAtBottomPrivate, scrollToBottom]);

  // مُحسن: دالة مراقبة التمرير
  const handleAtBottomChange = useCallback((atBottom: boolean) => {
    setIsAtBottomPrivate(atBottom);
  }, []);

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
    const text = messageText.trim();
    const hasText = !!text;
    const hasImage = !!imageFile;
    if (!hasText && !hasImage) return;

    setIsSending(true);
    setSendError(null);
    clearTimeout(retryTimeoutRef.current);

    try {
      if (hasImage) {
        const reader = new FileReader();
        const file = imageFile!;
        const asDataUrl: string = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error('فشل قراءة الملف'));
          reader.readAsDataURL(file);
        });

        const success = await sendMessageWithRetry(asDataUrl, 2);
        if (success) {
          setImageFile(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
          toast.success('تم إرسال الصورة');
        }
      }
      if (hasText) {
        const success = await sendMessageWithRetry(text);
        if (success) {
          setMessageText('');
          // لا نعرض toast للرسائل العادية لتجنب الإزعاج
        }
      }
      setTimeout(() => scrollToBottom('smooth'), 100);
    } catch (error) {
      console.error('خطأ في إرسال الرسالة:', error);
      const errorMessage = error instanceof Error ? error.message : 'فشل إرسال الرسالة';
      setSendError(errorMessage);
      toast.error(errorMessage);

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
      if (res.addedCount > 0) {
        setTimeout(() => {
          try {
            virtuosoRef.current?.scrollToIndex({
              index: res.addedCount,
              align: 'start',
              behavior: 'auto' as any,
            });
          } catch {}
        }, 0);
      }
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
          drag
          dragMomentum={false}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative z-[12000] w-[95vw] max-w-lg max-h-[85vh] bg-white text-gray-900 border border-gray-200 shadow-2xl rounded-xl overflow-hidden cursor-grab active:cursor-grabbing soft-entrance container-sway"
        >
          <DialogHeader className="border-b border-gray-200 p-3 bg-white">
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
                      {user.username}
                    </span>
                    <UserRoleBadge user={user} size={20} />
                  </div>
                  <Button
                    onClick={onClose}
                    variant="ghost"
                    size="sm"
                    className="ml-auto px-2 py-1 hover:bg-red-100 text-red-600"
                  >
                    ✖️
                  </Button>
                </div>
                <span className="text-xs text-gray-500">رسائل خاصة</span>
              </div>
            </div>
          </DialogHeader>

          <div className="relative h-[55vh] w-full p-4 pb-4 bg-white">
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
                className="!h-full"
                followOutput={'smooth'}
                atBottomStateChange={handleAtBottomChange}
                increaseViewportBy={{ top: 300, bottom: 300 }}
                startReached={handleLoadMore}
                components={{
                  Header: () =>
                    isLoadingOlder ? (
                      <div className="flex justify-center py-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-transparent"></div>
                      </div>
                    ) : hasMore ? (
                      <div className="text-center py-1 text-xs text-gray-400">
                        اسحب للأعلى لتحميل المزيد
                      </div>
                    ) : null,
                }}
                itemContent={(index, m) => {
                  const isMe = currentUser && m.senderId === currentUser.id;
                  const key = m.id ?? `${m.senderId}-${m.timestamp}-${index}`;
                  const isImage =
                    m.messageType === 'image' ||
                    (typeof m.content === 'string' && m.content.startsWith('data:image'));
                  const storyAttachment = Array.isArray((m as any).attachments)
                    ? (m as any).attachments.find((a: any) => a?.channel === 'story')
                    : null;
                  const hasStoryContext = !!storyAttachment;
                  return (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className={`flex items-start gap-3 p-3 rounded-lg transition-all duration-300 private-message-float ${
                        isMe ? 'bg-blue-50/80 border-r-4 ml-4' : 'bg-green-50/80 border-r-4 mr-4'
                      }`}
                      style={{
                        borderRightColor: getDynamicBorderColor(
                          m.sender || (isMe ? currentUser : user)
                        ),
                      }}
                    >
                      <ProfileImage
                        user={(m.sender as ChatUser) || (isMe && currentUser ? (currentUser as ChatUser) : user)}
                        size="small"
                        className="w-8 h-8"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="font-semibold text-sm truncate"
                            style={{ color: getFinalUsernameColor(m.sender || user) }}
                          >
                            {m.sender?.username || 
                              (isMe 
                                ? getCachedUsername(currentUser?.id || 0, currentUser?.username)
                                : getCachedUsername(user.id, user.username))}
                          </span>
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {formatTime(m.timestamp)}
                          </span>
                        </div>
                        <div className="text-gray-800 break-words message-content-fix">
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
                          {isImage ? (
                            <img
                              src={m.content}
                              alt="صورة"
                              className="max-h-40 rounded-lg cursor-pointer shadow-sm hover:shadow-md transition-shadow"
                              loading="lazy"
                              onClick={() => setImageLightbox({ open: true, src: m.content })}
                            />
                          ) : (() => {
                            const { cleaned, ids } = parseYouTubeFromText(m.content);
                            if (ids.length > 0) {
                              const firstId = ids[0];
                              return (
                                <span className="text-sm leading-relaxed text-breathe inline-flex items-center gap-2">
                                  {cleaned && (
                                    <span
                                      className="truncate"
                                      style={
                                        currentUser && m.senderId === currentUser.id
                                          ? { color: composerTextColor, fontWeight: composerBold ? 600 : undefined }
                                          : undefined
                                      }
                                    >
                                      {formatMessagePreview(cleaned, 100)}
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
                                className="text-sm leading-relaxed text-breathe"
                                style={
                                  currentUser && m.senderId === currentUser.id
                                    ? { color: composerTextColor, fontWeight: composerBold ? 600 : undefined }
                                    : undefined
                                }
                              >
                                {formatMessagePreview(m.content, 100)}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    </motion.div>
                  );
                }}
              />
            )}

            {/* تم إخفاء زر "الانتقال لأسفل" بناءً على رغبتك لتقليل الإزعاج */}
          </div>

          <div className="p-4 border-t border-gray-200 bg-white soft-entrance">
            {/* عرض رسالة الخطأ إن وجدت */}
            {sendError && (
              <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center justify-between">
                <span>⚠️ {sendError}</span>
                <button
                  onClick={() => setSendError(null)}
                  className="text-red-500 hover:text-red-700"
                >
                  ✕
                </button>
              </div>
            )}
            <div className="flex gap-3 items-end">
              <Input
                ref={inputRef}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder="اكتب رسالتك هنا..."
                className={`flex-1 bg-gray-50 border text-foreground placeholder:text-muted-foreground rounded-lg ${
                  sendError ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={isSending}
                style={{ color: composerTextColor, fontWeight: composerBold ? 600 : undefined }}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              {/* Removed ComposerPlusMenu (gallery/color/bold) */}
              <Button
                onClick={handleSend}
                disabled={(!messageText.trim() && !imageFile) || isSending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
              >
                {isSending ? (
                  <>
                    <span className="animate-spin">⌛</span> جاري الإرسال...
                  </>
                ) : (
                  <>📤 إرسال</>
                )}
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
        <DialogContent className="max-w-md w-[25vw] min-w-[400px] p-0 bg-black/90 border-gray-700">
          <div 
            className="drag-handle bg-black/50 p-1 flex justify-end cursor-move border-b border-gray-600"
            onMouseDown={(e) => {
              // تفعيل السحب
              const dialog = e.currentTarget.closest('.fixed');
              if (dialog) {
                let isDragging = false;
                let startX = e.clientX;
                let startY = e.clientY;
                let initialX = 0;
                let initialY = 0;

                const rect = dialog.getBoundingClientRect();
                initialX = rect.left;
                initialY = rect.top;

                const onMouseMove = (moveEvent: MouseEvent) => {
                  if (!isDragging) {
                    isDragging = true;
                    dialog.style.position = 'fixed';
                    dialog.style.zIndex = '9999';
                  }
                  
                  const deltaX = moveEvent.clientX - startX;
                  const deltaY = moveEvent.clientY - startY;
                  
                  dialog.style.left = `${initialX + deltaX}px`;
                  dialog.style.top = `${initialY + deltaY}px`;
                  dialog.style.transform = 'none';
                };

                const onMouseUp = () => {
                  document.removeEventListener('mousemove', onMouseMove);
                  document.removeEventListener('mouseup', onMouseUp);
                };

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
              }
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
    </Dialog>
  );
}

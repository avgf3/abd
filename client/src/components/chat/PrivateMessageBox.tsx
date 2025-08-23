import { motion } from 'framer-motion';
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { ChatMessage, ChatUser } from '@/types/chat';
import {
  sortMessagesAscending,
  getDynamicBorderColor,
  formatMessagePreview,
  setPmLastOpened,
} from '@/utils/messageUtils';
import { getFinalUsernameColor } from '@/utils/themeUtils';
import { formatTime } from '@/utils/timeUtils';

interface PrivateMessageBoxProps {
  isOpen: boolean;
  user: ChatUser;
  currentUser: ChatUser | null;
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  onClose: () => void;
  onLoadMore?: () => Promise<{ addedCount: number; hasMore: boolean }>; // تحميل رسائل أقدم
}

export default function PrivateMessageBox({
  isOpen,
  user,
  currentUser,
  messages,
  onSendMessage,
  onClose,
  onLoadMore,
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
          transition={{ duration: 0.2 }}
          className="relative z-[12000] w-[95vw] max-w-lg max-h-[85vh] bg-white text-gray-900 border border-gray-200 shadow-2xl rounded-xl overflow-hidden cursor-grab active:cursor-grabbing"
        >
          <DialogHeader className="border-b border-accent p-3 bg-gradient-to-r from-blue-50 to-green-50">
            <div className="flex items-center gap-3">
              <img
                src={user.profileImage || '/default_avatar.svg'}
                alt="avatar"
                className="w-10 h-10 rounded-full border-2 border-primary shadow-sm"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/default_avatar.svg';
                }}
              />
              <div className="flex-1 min-w-0">
                <span
                  className="text-lg font-semibold truncate block"
                  style={{ color: getFinalUsernameColor(user) }}
                >
                  {user.username}
                </span>
                <span className="text-xs text-gray-500">رسائل خاصة</span>
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
          </DialogHeader>

          <div className="relative h-[55vh] w-full p-4 pb-4 bg-gradient-to-b from-gray-50 to-white">
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
                  return (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2 }}
                      className={`flex items-start gap-3 p-3 rounded-lg transition-all duration-200 ${
                        isMe ? 'bg-blue-50 border-r-4 ml-4' : 'bg-green-50 border-r-4 mr-4'
                      }`}
                      style={{
                        borderRightColor: getDynamicBorderColor(
                          m.sender || (isMe ? currentUser : user)
                        ),
                      }}
                    >
                      <img
                        src={(m.sender?.profileImage as string) || '/default_avatar.svg'}
                        alt="avatar"
                        className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/default_avatar.svg';
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="font-semibold text-sm truncate"
                            style={{ color: getFinalUsernameColor(m.sender || user) }}
                          >
                            {m.sender?.username || (isMe ? currentUser?.username : user.username)}
                          </span>
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {formatTime(m.timestamp)}
                          </span>
                        </div>
                        <div className="text-gray-800 break-words">
                          {isImage ? (
                            <img
                              src={m.content}
                              alt="صورة"
                              className="max-h-40 rounded-lg cursor-pointer shadow-sm hover:shadow-md transition-shadow"
                              loading="lazy"
                              onClick={() => window.open(m.content, '_blank')}
                            />
                          ) : (
                            <span className="text-sm leading-relaxed">
                              {formatMessagePreview(m.content, 100)}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                }}
              />
            )}

            {/* تم إخفاء زر "الانتقال لأسفل" بناءً على رغبتك لتقليل الإزعاج */}
          </div>

          <div className="p-4 border-t border-gray-200 bg-white">
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
              />
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
                onClick={() => fileInputRef.current?.click()}
                className="px-3"
                title="إرسال صورة"
              >
                🖼️
              </Button>
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
    </Dialog>
  );
}

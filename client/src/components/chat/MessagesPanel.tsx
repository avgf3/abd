import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

import type { PrivateConversation } from '../../../../shared/types';

import ProfileImage from '@/components/chat/ProfileImage';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import UsernameDisplay from '@/components/common/UsernameDisplay';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/lib/queryClient';
import type { ChatUser } from '@/types/chat';
import { formatMessagePreview, getPmLastOpened, setPmLastOpened } from '@/utils/messageUtils';
import { formatTime } from '@/utils/timeUtils';

interface MessagesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: ChatUser | null;
  privateConversations: PrivateConversation; // kept for compatibility but no longer the source
  onlineUsers: ChatUser[]; // kept for avatar fallback if needed
  onStartPrivateChat: (user: ChatUser) => void;
  isConnected?: boolean;
}

export default function MessagesPanel({
  isOpen,
  onClose,
  currentUser,
  privateConversations,
  onlineUsers,
  onStartPrivateChat,
  isConnected = false,
}: MessagesPanelProps) {
  const [search, setSearch] = useState('');
  // جلب قائمة المحادثات الدائمة من الخادم
  const {
    data: conversationsData,
    isLoading,
    refetch,
    isRefetching,
    error,
  } = useQuery<{
    success: boolean;
    conversations: Array<{
      otherUserId: number;
      otherUser: ChatUser | null;
      lastMessage: { id: number; content: string; messageType: string; timestamp: string };
    }>;
  }>({
    queryKey: ['/api/private-messages/conversations', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) throw new Error('No user ID');
      return await apiRequest(`/api/private-messages/conversations/${currentUser.id}?limit=50`);
    },
    enabled: !!currentUser?.id && isOpen,
    // تحسين: استخدام cache مع تحديث ذكي
    staleTime: 30 * 1000, // البيانات صالحة لمدة 30 ثانية
    gcTime: 5 * 60 * 1000,
    refetchOnMount: 'always', // جلب عند الفتح فقط إذا كانت البيانات قديمة
    refetchOnWindowFocus: false,
  });

  // Cache محلي لحل أسماء المستخدمين بشكل ثابت حتى وهم أوفلاين
  const [resolvedUsers, setResolvedUsers] = useState<Map<number, ChatUser>>(new Map());

  // هيدرنة الكاش من لقطات sender المخزنة داخل رسائل الخاص
  useEffect(() => {
    const next = new Map(resolvedUsers);
    const ids = Object.keys(privateConversations || {})
      .map((k) => parseInt(k, 10))
      .filter((n) => Number.isFinite(n));
    for (const uid of ids) {
      if (next.has(uid)) continue;
      const conv = privateConversations[uid] || [];
      const fromSender = conv.find((m: any) => m && m.senderId === uid && m.sender)?.sender;
      if (fromSender && typeof fromSender.username === 'string') {
        next.set(uid, fromSender as ChatUser);
      }
    }
    if (next.size !== resolvedUsers.size) {
      setResolvedUsers(next);
    }
  }, [privateConversations]);

  // جلب بيانات المستخدم من الخادم عند الحاجة وملء الكاش
  useEffect(() => {
    const onlineSet = new Set(onlineUsers.map((u) => u.id));
    const targetIds = new Set<number>();

    // من محادثات الخادم: التقط المعرفات التي لا يوجد لها otherUser ولا في الكاش ولا أونلاين
    for (const c of (conversationsData?.conversations || [])) {
      const id = c.otherUserId;
      if (!id) continue;
      if (c.otherUser) continue;
      if (resolvedUsers.has(id)) continue;
      if (onlineSet.has(id)) continue;
      targetIds.add(id);
    }

    // من المحادثات المحلية: إذا لم نستطع استخراج sender ولم يكن في الكاش/أونلاين
    const localIds = Object.keys(privateConversations || {})
      .map((k) => parseInt(k, 10))
      .filter((n) => Number.isFinite(n));
    for (const uid of localIds) {
      if (resolvedUsers.has(uid) || onlineSet.has(uid)) continue;
      const conv = privateConversations[uid] || [];
      const fromSender = conv.find((m: any) => m && m.senderId === uid && m.sender)?.sender;
      if (!fromSender) targetIds.add(uid);
    }

    const ids = Array.from(targetIds).slice(0, 10);
    if (ids.length === 0) return;

    let cancelled = false;
    (async () => {
      try {
        const results = await Promise.all(
          ids.map((id) =>
            apiRequest(`/api/users/${id}`).catch(() => null)
          )
        );
        const next = new Map(resolvedUsers);
        results.forEach((data, idx) => {
          if (!cancelled && data && data.id) {
            next.set(ids[idx], data as ChatUser);
          }
        });
        if (!cancelled && next.size !== resolvedUsers.size) {
          setResolvedUsers(next);
        }
      } catch {}
    })();

    return () => {
      cancelled = true;
    };
  }, [conversationsData, privateConversations, onlineUsers, resolvedUsers]);

  // تحسين: إزالة التحميل المزدوج - React Query يتعامل مع هذا تلقائياً
  // useEffect تم إزالته لمنع التحميل المزدوج

  // تحديث فوري للقائمة عند وصول/إرسال رسالة خاصة
  useEffect(() => {
    const handler = async () => {
      try {
        await refetch();
      } catch (error) {
        console.error('خطأ في تحديث المحادثات:', error);
        toast.error('فشل تحديث قائمة المحادثات');
      }
    };
    window.addEventListener('privateMessageReceived', handler);
    return () => window.removeEventListener('privateMessageReceived', handler);
  }, [refetch]);

  // معالج تحديث المحادثات مع إشعار
  const handleRefresh = useCallback(async () => {
    try {
      await refetch();
      toast.success('تم تحديث المحادثات');
    } catch (error) {
      console.error('خطأ في التحديث:', error);
      toast.error('فشل تحديث المحادثات. حاول مرة أخرى.');
    }
  }, [refetch]);

  // عرض رسالة خطأ إذا فشل الجلب
  useEffect(() => {
    if (error) {
      toast.error('حدث خطأ في جلب المحادثات');
      console.error('Query error:', error);
    }
  }, [error]);

  // تحسين: فصل معالجة البيانات لتحسين الأداء
  const serverConversations = useMemo(() => {
    const map = new Map<
      number,
      {
        user: ChatUser;
        lastMessage: { content: string; timestamp: string; isImage?: boolean };
        unreadCount: number;
      }
    >();

    // معالجة بيانات الخادم فقط
    for (const c of conversationsData?.conversations || []) {
      const user =
        c.otherUser ||
        resolvedUsers.get(c.otherUserId) ||
        onlineUsers.find((u) => u.id === c.otherUserId) ||
        null;
      if (!user) continue;
      const lastMessageTs = String(c.lastMessage.timestamp);
      const lastOpened = currentUser?.id ? getPmLastOpened(currentUser.id, user.id) : 0;
      const unreadCount = new Date(lastMessageTs).getTime() > lastOpened ? 1 : 0;

      map.set(user.id, {
        user,
        lastMessage: {
          content: c.lastMessage.content,
          timestamp: lastMessageTs,
          isImage: c.lastMessage.messageType === 'image',
        },
        unreadCount,
      });
    }

    return map;
  }, [conversationsData, onlineUsers, currentUser?.id, resolvedUsers]);

  const localConversations = useMemo(() => {
    const map = new Map<
      number,
      {
        user: ChatUser;
        lastMessage: { content: string; timestamp: string; isImage?: boolean };
        unreadCount: number;
      }
    >();

    // معالجة البيانات المحلية فقط
    const localUserIds = Object.keys(privateConversations || {}).map((k) => parseInt(k, 10));
    for (const uid of localUserIds) {
      if (!Number.isFinite(uid)) continue;

      const conv = privateConversations[uid] || [];
      const latest = conv[conv.length - 1];
      if (!latest) continue;

      const fromSender = (conv.find((m: any) => m && m.senderId === uid && m.sender)?.sender || null) as ChatUser | null;
      const user =
        fromSender ||
        resolvedUsers.get(uid) ||
        onlineUsers.find((u) => u.id === uid) ||
        ({
          id: uid,
          username: `مستخدم #${uid}`,
          userType: 'member',
          role: 'member',
          isOnline: false,
        } as unknown as ChatUser);

      const lastOpened = currentUser?.id ? getPmLastOpened(currentUser.id, uid) : 0;
      const unreadCount = conv.filter(
        (m) => new Date(m.timestamp as any).getTime() > lastOpened && m.senderId === uid
      ).length;

      map.set(uid, {
        user,
        lastMessage: {
          content: latest.content,
          timestamp: String(latest.timestamp),
          isImage: latest.messageType === 'image',
        },
        unreadCount,
      });
    }

    return map;
  }, [privateConversations, onlineUsers, currentUser?.id, resolvedUsers]);

  const conversations = useMemo(() => {
    // دمج المحادثات من المصدرين
    const merged = new Map<
      number,
      {
        user: ChatUser;
        lastMessage: { content: string; timestamp: string; isImage?: boolean };
        unreadCount: number;
      }
    >();

    // أضف من الخادم أولاً
    for (const [id, conv] of serverConversations) {
      merged.set(id, conv);
    }

    // ثم أضف/حدث من المحلي
    for (const [id, localConv] of localConversations) {
      const existing = merged.get(id);
      if (!existing) {
        merged.set(id, localConv);
      } else {
        // قارن التوقيت واستخدم الأحدث
        const existingTs = new Date(existing.lastMessage.timestamp).getTime();
        const localTs = new Date(localConv.lastMessage.timestamp).getTime();
        if (localTs > existingTs) {
          merged.set(id, localConv);
        } else {
          // حدث عداد غير المقروء على الأقل
          merged.set(id, {
            ...existing,
            unreadCount: Math.max(existing.unreadCount, localConv.unreadCount),
          });
        }
      }
    }

    const items = Array.from(merged.values());

    // تطبيق البحث
    const filtered = search
      ? items.filter(
          (i) =>
            i.user.username.toLowerCase().includes(search.toLowerCase()) ||
            formatMessagePreview(i.lastMessage.content, 200)
              .toLowerCase()
              .includes(search.toLowerCase())
        )
      : items;

    // ترتيب: غير المقروء أولاً، ثم حسب الوقت
    return filtered.sort((a, b) => {
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
      return (
        new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime()
      );
    });
  }, [serverConversations, localConversations, search]);

  const formatLastMessage = (content: string) => formatMessagePreview(content, 40);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-md max-h-[560px] bg-gradient-to-br from-secondary to-accent border-2 border-accent shadow-2xl overflow-hidden">
        <DialogHeader className="border-b border-accent pb-3">
          <div className="flex items-center gap-2">
            <DialogTitle className="text-xl font-bold text-primary-foreground flex-1">
              ✉️ الرسائل
            </DialogTitle>
            <div
              className={`px-2 py-0.5 rounded-full text-xs ${
                isRefetching
                  ? 'bg-yellow-100 text-yellow-700'
                  : isConnected
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
              }`}
              title={isConnected ? 'متصل' : 'غير متصل'}
            >
              {isRefetching ? 'تحديث…' : isConnected ? 'متصل' : 'غير متصل'}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefresh}
              className="ml-1"
              title="تحديث"
              disabled={isRefetching}
            >
              {isRefetching ? '⌛' : '⟳'}
            </Button>
          </div>
          <div className="mt-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث باسم المستخدم أو محتوى آخر رسالة…"
              className="bg-background/60 border-accent/40"
            />
          </div>
        </DialogHeader>

        <ScrollArea className="h-[460px] w-full">
          <div className="space-y-4 p-4">
            <section>
              {isLoading ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-400 border-t-transparent"></div>
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <div className="text-5xl mb-4">✉️</div>
                  <p className="text-base">لا توجد محادثات</p>
                  <p className="text-sm mt-2 opacity-70">ابدأ محادثة عبر قائمة المستخدمين</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {conversations.map(({ user, lastMessage, unreadCount }) => (
                    <button
                      key={user.id}
                      className={`w-full text-right cursor-pointer hover:bg-accent/20 transition-all duration-200 p-3 rounded-lg border bg-background/20 ${
                        unreadCount > 0 ? 'border-primary' : 'border-accent/30'
                      }`}
                      onClick={() => {
                        try {
                          onClose();
                          if (currentUser?.id) {
                            setPmLastOpened(currentUser.id, user.id);
                          }
                          setTimeout(() => onStartPrivateChat(user), 0);
                        } catch (error) {
                          console.error('خطأ في فتح المحادثة:', error);
                          toast.error('فشل فتح المحادثة');
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <ProfileImage user={user} size="small" />
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white ${
                              user.isOnline ? 'bg-green-500' : 'bg-gray-400'
                            }`}
                            aria-hidden
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="font-medium text-gray-900 text-sm truncate">
                              <UsernameDisplay user={user} className="font-medium text-gray-900 text-sm truncate" />
                            </h3>
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              {formatTime(lastMessage.timestamp)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {lastMessage.isImage && <span className="text-xs">🖼️</span>}
                            <p className="text-xs text-muted-foreground truncate">
                              {formatLastMessage(lastMessage.content)}
                            </p>
                          </div>
                        </div>
                        {unreadCount > 0 && (
                          <span className="ml-2 inline-flex items-center justify-center text-[10px] min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>
        </ScrollArea>

        <div className="flex justify-center pt-4 border-t border-accent bg-gradient-to-r from-secondary to-accent">
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full bg-background border-border text-foreground hover:bg-accent/30 font-medium"
          >
            ✖️ إغلاق
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

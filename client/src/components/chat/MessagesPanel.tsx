import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import type { PrivateConversation } from '../../../../shared/types';

import ProfileImage from '@/components/chat/ProfileImage';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  const { data: conversationsData, isLoading, refetch, isRefetching } = useQuery<{
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
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const conversations = useMemo(() => {
    const items = (conversationsData?.conversations || [])
      .map((c) => {
        const user = c.otherUser || onlineUsers.find((u) => u.id === c.otherUserId) || null;
        if (!user) return null;
        const lastMessageTs = String(c.lastMessage.timestamp);
        const lastOpened = currentUser?.id ? getPmLastOpened(currentUser.id, user.id) : 0;
        const localMessages = (privateConversations && privateConversations[user.id]) || [];
        const unreadCount = localMessages.length
          ? localMessages.filter(
              (m) =>
                new Date(m.timestamp).getTime() > lastOpened && m.senderId === user.id
            ).length
          : new Date(lastMessageTs).getTime() > lastOpened
            ? 1
            : 0;
        const isImage = c.lastMessage.messageType === 'image';
        return {
          user,
          lastMessage: {
            content: c.lastMessage.content,
            timestamp: lastMessageTs,
            isImage,
          },
          unreadCount,
        };
      })
      .filter(Boolean) as Array<{
      user: ChatUser;
      lastMessage: { content: string; timestamp: string; isImage?: boolean };
      unreadCount: number;
    }>;

    const filtered = search
      ? items.filter(
          (i) =>
            i.user.username.toLowerCase().includes(search.toLowerCase()) ||
            formatMessagePreview(i.lastMessage.content, 200)
              .toLowerCase()
              .includes(search.toLowerCase())
        )
      : items;

    return filtered.sort((a, b) => {
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
      return (
        new Date(b.lastMessage.timestamp).getTime() -
        new Date(a.lastMessage.timestamp).getTime()
      );
    });
  }, [conversationsData, onlineUsers, privateConversations, currentUser?.id, search]);

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
                isRefetching ? 'bg-yellow-100 text-yellow-700' : isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}
              title={isConnected ? 'متصل' : 'غير متصل'}
            >
              {isRefetching ? 'تحديث…' : isConnected ? 'متصل' : 'غير متصل'}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => refetch()}
              className="ml-1"
              title="تحديث"
            >
              ⟳
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
                        onClose();
                        if (currentUser?.id) {
                          try { setPmLastOpened(currentUser.id, user.id); } catch {}
                        }
                        setTimeout(() => onStartPrivateChat(user), 0);
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
                              {user.username}
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

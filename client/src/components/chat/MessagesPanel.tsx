import { useMemo } from 'react';

import type { PrivateConversation } from '../../../../shared/types';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ChatUser } from '@/types/chat';
import ProfileImage from '@/components/chat/ProfileImage';
import { formatTime } from '@/utils/timeUtils';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface MessagesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: ChatUser | null;
  privateConversations: PrivateConversation; // kept for compatibility but no longer the source
  onlineUsers: ChatUser[]; // kept for avatar fallback if needed
  onStartPrivateChat: (user: ChatUser) => void;
}

export default function MessagesPanel({
  isOpen,
  onClose,
  currentUser,
  privateConversations,
  onlineUsers,
  onStartPrivateChat,
}: MessagesPanelProps) {
  // جلب قائمة المحادثات الدائمة من الخادم
  const { data: conversationsData, isLoading } = useQuery<{ success: boolean; conversations: Array<{ otherUserId: number; otherUser: ChatUser | null; lastMessage: { id: number; content: string; messageType: string; timestamp: string } }> }>({
    queryKey: ['/api/private-messages/conversations', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) throw new Error('No user ID');
      return await apiRequest(`/api/private-messages/conversations/${currentUser.id}?limit=50`);
    },
    enabled: !!currentUser?.id && isOpen,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
  });

  const conversations = useMemo(() => {
    const items = (conversationsData?.conversations || []).map((c) => {
      // قد لا يكون otherUser موجوداً (غير متصل)؛ نحاول إيجاده من onlineUsers كنسخة احتياطية
      const user = c.otherUser || onlineUsers.find(u => u.id === c.otherUserId) || null;
      if (!user) return null;
      return { user, lastMessage: { content: c.lastMessage.content, timestamp: String(c.lastMessage.timestamp) } };
    }).filter(Boolean) as Array<{ user: ChatUser; lastMessage: { content: string; timestamp: string } }>;
    return items.sort((a, b) => new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime());
  }, [conversationsData, onlineUsers]);

  const formatLastMessage = (content: string) => {
    if (!content) return '';
    return content.length > 40 ? content.slice(0, 40) + '…' : content;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md max-h-[560px] bg-gradient-to-br from-secondary to-accent border-2 border-accent shadow-2xl overflow-hidden">
        <DialogHeader className="border-b border-accent pb-4">
          <DialogTitle className="text-2xl font-bold text-center text-primary-foreground">
            ✉️ الرسائل
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[460px] w-full">
          <div className="space-y-4 p-4">
            <section>
              {isLoading ? (
                <div className="text-center py-10 text-muted-foreground">جارٍ التحميل…</div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <div className="text-5xl mb-4">✉️</div>
                  <p className="text-base">لا توجد محادثات</p>
                  <p className="text-sm mt-2 opacity-70">ابدأ محادثة عبر قائمة المستخدمين</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {conversations.map(({ user, lastMessage }) => (
                    <button
                      key={user.id}
                      className="w-full text-right cursor-pointer hover:bg-accent/20 transition-all duration-200 p-3 rounded-lg border border-accent/30 bg-background/20"
                      onClick={() => { onClose(); setTimeout(() => onStartPrivateChat(user), 0); }}
                    >
                      <div className="flex items-center gap-3">
                        <ProfileImage user={user} size="small" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="font-medium text-gray-900 text-sm truncate">{user.username}</h3>
                            <span className="text-xs text-gray-500 whitespace-nowrap">{formatTime(lastMessage.timestamp)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {formatLastMessage(lastMessage.content)}
                          </p>
                        </div>
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
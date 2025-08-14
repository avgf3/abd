import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getImageSrc } from '@/utils/imageUtils';
import { formatTime } from '@/utils/timeUtils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ChatUser } from '@/types/chat';
import type { PrivateConversation } from '../../../../shared/types';

interface MessagesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: ChatUser | null;
  privateConversations: PrivateConversation;
  onlineUsers: ChatUser[];
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
  const conversations = useMemo(() => {
    const items = Object.keys(privateConversations)
      .map((userId) => {
        const id = parseInt(userId);
        if (Number.isNaN(id)) return null;
        const user = onlineUsers.find((u) => u.id === id);
        const conversation = privateConversations[id] || [];
        const lastMessage = conversation[conversation.length - 1];
        if (!user || !lastMessage) return null;
        return {
          user,
          lastMessage,
        };
      })
      .filter(Boolean) as Array<{ user: ChatUser; lastMessage: { content: string; timestamp: string } }>;

    // Sort conversations by last message timestamp (most recent first)
    return items.sort((a, b) => new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime());
  }, [privateConversations, onlineUsers]);

  const formatLastMessage = (content: string) => {
    if (!content) return '';
    return content.length > 40 ? content.slice(0, 40) + '…' : content;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md max-h-[560px] bg-gradient-to-br from-secondary to-accent border-2 border-accent shadow-2xl overflow-hidden">
        <DialogHeader className="border-b border-accent pb-4">
          <DialogTitle className="text-2xl font-bold text-center text-primary-foreground">
            ✉️ الرسائل الخاصة
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[460px] w-full">
          <div className="space-y-4 p-4">
            <section>
              <h4 className="font-bold text-foreground text-base mb-3 border-b border-accent pb-2">
                المحادثات النشطة {conversations.length > 0 ? `(${conversations.length})` : ''}
              </h4>
              {conversations.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <div className="text-5xl mb-4">✉️</div>
                  <p className="text-base">لا توجد محادثات خاصة حتى الآن</p>
                  <p className="text-sm mt-2 opacity-70">اضغط على أي مستخدم في القائمة لبدء محادثة</p>
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
                        <img
                          src={getImageSrc(user.profileImage)}
                          alt="صورة المستخدم"
                          className="w-12 h-12 rounded-full border-2 border-primary ring-1 ring-accent shadow-sm object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/default_avatar.svg';
                          }}
                        />
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
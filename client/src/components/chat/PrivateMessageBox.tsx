import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { formatTime } from '@/utils/timeUtils';
import type { ChatMessage, ChatUser } from '@/types/chat';
import { getFinalUsernameColor } from '@/utils/themeUtils';
import { motion } from 'framer-motion';

interface PrivateMessageBoxProps {
  isOpen: boolean;
  user: ChatUser;
  currentUser: ChatUser | null;
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  onClose: () => void;
}

export default function PrivateMessageBox({
  isOpen,
  user,
  currentUser,
  messages,
  onSendMessage,
  onClose,
}: PrivateMessageBoxProps) {
  const [messageText, setMessageText] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [messages]);

  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    const c = containerRef.current;
    if (!c) return;
    if (behavior === 'smooth') c.scrollTo({ top: c.scrollHeight, behavior: 'smooth' });
    else c.scrollTop = c.scrollHeight;
  };

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => scrollToBottom('auto'), 0);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom(sortedMessages.length > 20 ? 'auto' : 'smooth');
  }, [sortedMessages.length]);

  const handleSend = () => {
    const text = messageText.trim();
    if (!text) return;
    onSendMessage(text);
    setMessageText('');
    setTimeout(() => scrollToBottom('smooth'), 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="p-0 bg-transparent border-none shadow-none">
        <motion.div drag dragMomentum={false} className="relative z-[12000] w-[90vw] max-w-md max-h-[80vh] bg-white text-gray-900 border border-gray-200 shadow-2xl rounded-xl overflow-hidden cursor-grab active:cursor-grabbing">
        <DialogHeader className="border-b border-accent p-3">
          <div className="flex items-center gap-2">
            <img
              src={user.profileImage || '/default_avatar.svg'}
              alt="avatar"
              className="w-8 h-8 rounded-full border"
              onError={(e) => { (e.target as HTMLImageElement).src = '/default_avatar.svg'; }}
            />
            <span className="text-base font-medium truncate" style={{ color: getFinalUsernameColor(user) }}>
              {user.username}
            </span>
            <Button onClick={onClose} variant="ghost" className="ml-auto px-2 py-1">✖️</Button>
          </div>
        </DialogHeader>

        <div ref={containerRef} className="h-[50vh] w-full p-4 overflow-y-auto bg-white">
          <div className="space-y-3">
            {sortedMessages.length === 0 && (
              <div className="text-center py-10 text-muted-foreground">
                <div className="text-4xl mb-3">✉️</div>
                <p className="text-sm">لا توجد رسائل بعد</p>
              </div>
            )}

            {sortedMessages.map((m, idx) => {
              const isMe = currentUser && m.senderId === currentUser.id;
              const key = m.id ?? `${m.senderId}-${m.timestamp}-${idx}`;
              const isImage = m.messageType === 'image' || (typeof m.content === 'string' && m.content.startsWith('data:image'));
              return (
                <div key={key} className={`flex items-center gap-3 p-3 rounded-lg bg-white shadow-sm ${isMe ? 'border-r-4 border-blue-400' : 'border-r-4 border-green-400'}`}>
                  <img
                    src={(m.sender?.profileImage as string) || '/default_avatar.svg'}
                    alt="avatar"
                    className="w-8 h-8 rounded-full border"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/default_avatar.svg'; }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold truncate" style={{ color: getFinalUsernameColor(m.sender || user) }}>
                        {m.sender?.username || (isMe ? currentUser?.username : user.username)}
                      </span>
                      <span className="text-xs text-gray-500 whitespace-nowrap ml-auto">{formatTime(m.timestamp)}</span>
                    </div>
                    <div className="text-gray-800 break-words mt-1">
                      {isImage ? (
                        <img
                          src={m.content}
                          alt="صورة"
                          className="max-h-36 rounded cursor-pointer"
                          loading="lazy"
                          onClick={() => window.open(m.content, '_blank')}
                        />
                      ) : (
                        <span>{m.content}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2 p-4 border-t border-gray-200 bg-white">
                    <Input
             value={messageText}
             onChange={(e) => setMessageText(e.target.value)}
             onKeyDown={handleKeyDown}
             placeholder="اكتب رسالتك..."
             className="flex-1 bg-white border border-border text-foreground placeholder:text-muted-foreground"
           />
           <Button
             onClick={handleSend}
             disabled={!messageText.trim()}
             className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium"
           >
             ارسال
           </Button>
        </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
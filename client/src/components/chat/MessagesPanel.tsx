import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getImageSrc } from '@/utils/imageUtils';
import { formatTime } from '@/utils/timeUtils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import ProfileImage from './ProfileImage';
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
  onStartPrivateChat
}: MessagesPanelProps) {
  // Get users who have active conversations
  const conversationUsers = Object.keys(privateConversations).map(userId => {
    const user = onlineUsers.find(u => u.id === parseInt(userId));
    const conversation = privateConversations[parseInt(userId)];
    const lastMessage = conversation[conversation.length - 1];
    
    return {
      user,
      lastMessage,
      unreadCount: 0 // يمكن تطويره لاحقاً
    };
  }).filter(item => item.user);



  const formatLastMessage = (content: string) => {
    if (content.length > 30) {
      return content.substring(0, 30) + '...';
    }
    return content;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[500px] bg-gradient-to-br from-secondary to-accent border-2 border-accent shadow-2xl">
        <DialogHeader className="border-b border-accent pb-4">
          <DialogTitle className="text-2xl font-bold text-center text-primary-foreground">
            ✉️ ارسال رسالة
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[350px] w-full">
          <div className="space-y-4 p-4">
            {conversationUsers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <div className="text-6xl mb-6">✉️</div>
                <h3 className="text-lg font-semibold text-foreground mb-2">لا توجد رسائل</h3>
                <p className="text-sm">انقر على أي مستخدم لارسال رسالة</p>
              </div>
            ) : (
              <div className="space-y-3">
                <h4 className="font-bold text-foreground text-lg mb-3 border-b border-accent pb-2">
                  ✉️ ارسال رسالة ({conversationUsers.length})
                </h4>
                {conversationUsers.map(({ user, lastMessage, unreadCount }) => (
                  <div 
                    key={user!.id} 
                    className="cursor-pointer hover:bg-accent/20 transition-all duration-200 p-2 rounded-lg"
                    onClick={() => {
                      onStartPrivateChat(user!);
                      onClose();
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={getImageSrc(user!.profileImage)}
                        alt="صورة المستخدم"
                        className="w-10 h-10 rounded-full border-2 border-primary ring-1 ring-accent shadow-sm object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/default_avatar.svg';
                        }}
                      />
                      
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 text-sm">
                          {user!.username}
                        </h3>
                        {unreadCount > 0 && (
                          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                            {unreadCount} رسالة جديدة
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            

          </div>
        </ScrollArea>

        <div className="flex justify-center pt-6 border-t border-accent bg-gradient-to-r from-secondary to-accent">
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
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ChatUser, PrivateConversation } from '@/types/chat';

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

  const formatTime = (date?: Date) => {
    if (!date) return '';
    return new Date(date).toLocaleString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatLastMessage = (content: string) => {
    if (content.length > 30) {
      return content.substring(0, 30) + '...';
    }
    return content;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[500px] bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 shadow-2xl">
        <DialogHeader className="border-b border-blue-200 pb-4">
          <DialogTitle className="text-2xl font-bold text-center text-blue-800">
            ✉️ ارسال رسالة
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[350px] w-full">
          <div className="space-y-4 p-4">
            {conversationUsers.length === 0 ? (
              <div className="text-center py-12 text-blue-400">
                <div className="text-6xl mb-6">✉️</div>
                <h3 className="text-lg font-semibold text-blue-700 mb-2">لا توجد رسائل</h3>
                <p className="text-sm">انقر على أي مستخدم لارسال رسالة</p>
              </div>
            ) : (
              <div className="space-y-3">
                <h4 className="font-bold text-blue-700 text-lg mb-3 border-b border-blue-200 pb-2">
                  ✉️ ارسال رسالة ({conversationUsers.length})
                </h4>
                {conversationUsers.map(({ user, lastMessage, unreadCount }) => (
                  <div 
                    key={user!.id} 
                    className="cursor-pointer bg-white/60 hover:bg-purple-50 transition-all duration-200 p-3 rounded-xl border border-gray-100 shadow-sm hover:shadow-md backdrop-blur-sm"
                    onClick={() => {
                      onStartPrivateChat(user!);
                      onClose();
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={user!.profileImage || "/default_avatar.svg"}
                        alt="صورة المستخدم"
                        className="w-12 h-12 rounded-full border-2 border-purple-200 shadow-sm"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/default_avatar.svg';
                        }}
                      />
                      
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 text-base">
                          {user!.username}
                        </h3>
                        {unreadCount > 0 && (
                          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-sm">
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

        <div className="flex justify-center pt-6 border-t border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <Button 
            onClick={onClose} 
            variant="outline" 
            className="w-full bg-white border-purple-300 text-purple-700 hover:bg-purple-100 font-medium"
          >
            ✖️ إغلاق
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
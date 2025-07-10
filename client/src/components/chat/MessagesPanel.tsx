import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
      <DialogContent className="max-w-md max-h-[600px] bg-white border-2 border-primary/20 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">
            💬 الرسائل الخاصة
          </DialogTitle>
          <DialogDescription className="text-center text-gray-600">
            محادثاتك الخاصة مع الأصدقاء
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] w-full">
          <div className="space-y-3 p-2">
            {conversationUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-4">💬</div>
                <p>لا توجد رسائل خاصة حتى الآن</p>
                <p className="text-sm mt-2">ابدأ محادثة عن طريق النقر على اسم مستخدم</p>
              </div>
            ) : (
              conversationUsers.map(({ user, lastMessage, unreadCount }) => (
                <Card 
                  key={user!.id} 
                  className="cursor-pointer hover:bg-gray-50 transition-colors border border-gray-200"
                  onClick={() => {
                    onStartPrivateChat(user!);
                    onClose();
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={user!.profileImage || "/default_avatar.svg"}
                          alt="صورة المستخدم"
                          className="w-12 h-12 rounded-full"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/default_avatar.svg';
                          }}
                        />
                        {user!.isOnline && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {user!.username}
                          </h3>
                          <span className="text-xs text-gray-500">
                            {formatTime(lastMessage?.timestamp)}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-600 truncate mt-1">
                          {lastMessage?.messageType === 'image' ? '📷 صورة' : formatLastMessage(lastMessage?.content || '')}
                        </p>
                        
                        <div className="flex items-center justify-between mt-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            user!.isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {user!.isOnline ? 'متصل' : 'غير متصل'}
                          </span>
                          
                          {unreadCount > 0 && (
                            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
            
            {/* قائمة المستخدمين المتصلين لبدء محادثة جديدة */}
            <div className="mt-6">
              <h4 className="font-semibold text-gray-700 mb-3">بدء محادثة جديدة</h4>
              <div className="space-y-2">
                {onlineUsers
                  .filter(user => user.id !== currentUser?.id)
                  .filter(user => !Object.keys(privateConversations).includes(user.id.toString()))
                  .slice(0, 5)
                  .map(user => (
                    <Card 
                      key={user.id}
                      className="cursor-pointer hover:bg-blue-50 transition-colors border border-blue-200"
                      onClick={() => {
                        onStartPrivateChat(user);
                        onClose();
                      }}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={user.profileImage || "/default_avatar.svg"}
                            alt="صورة المستخدم"
                            className="w-8 h-8 rounded-full"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/default_avatar.svg';
                            }}
                          />
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{user.username}</p>
                            <p className="text-xs text-green-600">متصل الآن</p>
                          </div>
                          <Button size="sm" variant="outline" className="text-xs">
                            💬 راسل
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                }
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-center pt-4 border-t border-gray-200">
          <Button onClick={onClose} variant="outline" className="w-full">
            إغلاق
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
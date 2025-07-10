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
      <DialogContent className="max-w-lg max-h-[700px] bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 shadow-2xl">
        <DialogHeader className="border-b border-blue-200 pb-4">
          <DialogTitle className="text-2xl font-bold text-center text-blue-800 flex items-center justify-center gap-2">
            📱 المحادثات الخاصة
            <span className="text-sm bg-blue-100 px-2 py-1 rounded-full text-blue-600">
              {conversationUsers.length} محادثة نشطة
            </span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[500px] w-full">
          <div className="space-y-4 p-4">
            {conversationUsers.length === 0 ? (
              <div className="text-center py-12 text-blue-400">
                <div className="text-6xl mb-6">📱</div>
                <h3 className="text-lg font-semibold text-blue-700 mb-2">لا توجد محادثات نشطة</h3>
                <p className="text-sm">🎯 انقر على أي مستخدم لبدء محادثة</p>
                <p className="text-xs mt-2 text-gray-600">ستظهر المحادثات هنا تلقائياً عند الإرسال</p>
              </div>
            ) : (
              <div className="space-y-3">
                <h4 className="font-bold text-blue-700 text-lg mb-3 border-b border-blue-200 pb-2">
                  💬 محادثاتك النشطة ({conversationUsers.length})
                </h4>
                {conversationUsers.map(({ user, lastMessage, unreadCount }) => (
                  <Card 
                    key={user!.id} 
                    className="cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4 border-l-purple-400 bg-white hover:bg-purple-50"
                    onClick={() => {
                      onStartPrivateChat(user!);
                      onClose();
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="relative">
                          <img
                            src={user!.profileImage || "/default_avatar.svg"}
                            alt="صورة المستخدم"
                            className="w-14 h-14 rounded-full border-2 border-purple-200"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/default_avatar.svg';
                            }}
                          />
                          {user!.isOnline && (
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full"></div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-bold text-gray-900 text-lg truncate">
                              {user!.username}
                            </h3>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                {formatTime(lastMessage?.timestamp)}
                              </span>
                              {unreadCount > 0 && (
                                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold min-w-[20px] text-center">
                                  {unreadCount}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-700 mb-2 line-clamp-2">
                            {lastMessage?.messageType === 'image' ? 
                              <span className="text-blue-600">📷 تم إرسال صورة</span> : 
                              formatLastMessage(lastMessage?.content || 'لا توجد رسائل')
                            }
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                              user!.isOnline ? 
                                'bg-green-100 text-green-700 border border-green-200' : 
                                'bg-gray-100 text-gray-600 border border-gray-200'
                            }`}>
                              {user!.isOnline ? '🟢 متصل الآن' : '⚫ غير متصل'}
                            </span>
                            
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-xs bg-purple-100 border-purple-300 text-purple-700 hover:bg-purple-200"
                            >
                              💬 فتح المحادثة
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {/* قائمة المستخدمين المتصلين لبدء محادثة جديدة */}
            <div className="mt-8 border-t border-purple-200 pt-6">
              <h4 className="font-bold text-purple-700 text-lg mb-4 flex items-center gap-2">
                ✨ ابدأ محادثة جديدة
                <span className="text-sm bg-blue-100 px-2 py-1 rounded-full text-blue-600">
                  {onlineUsers.filter(user => user.id !== currentUser?.id && !Object.keys(privateConversations).includes(user.id.toString())).length} متصل
                </span>
              </h4>
              <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto">
                {onlineUsers
                  .filter(user => user.id !== currentUser?.id)
                  .filter(user => !Object.keys(privateConversations).includes(user.id.toString()))
                  .slice(0, 8)
                  .map(user => (
                    <Card 
                      key={user.id}
                      className="cursor-pointer hover:shadow-md transition-all duration-200 border border-blue-200 hover:border-blue-400 bg-gradient-to-r from-blue-50 to-purple-50"
                      onClick={() => {
                        onStartPrivateChat(user);
                        onClose();
                      }}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img
                              src={user.profileImage || "/default_avatar.svg"}
                              alt="صورة المستخدم"
                              className="w-12 h-12 rounded-full border-2 border-blue-200"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = '/default_avatar.svg';
                              }}
                            />
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full animate-pulse"></div>
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-gray-900 text-base">{user.username}</p>
                            <p className="text-xs text-green-600 font-medium">🟢 متصل الآن</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {user.userType === 'owner' && '👑 مالك'}
                              {user.userType === 'admin' && '🛡️ مشرف'}
                              {user.userType === 'member' && '👤 عضو'}
                              {user.userType === 'guest' && '👋 زائر'}
                            </p>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-xs bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-200 font-medium"
                          >
                            💬 ابدأ محادثة
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                }
                {onlineUsers.filter(user => user.id !== currentUser?.id && !Object.keys(privateConversations).includes(user.id.toString())).length === 0 && (
                  <div className="text-center py-6 text-gray-500">
                    <p className="text-sm">جميع المستخدمين المتصلين لديهم محادثات معك بالفعل! 🎉</p>
                  </div>
                )}
              </div>
            </div>
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
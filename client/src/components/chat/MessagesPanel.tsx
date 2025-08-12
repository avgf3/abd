import { useState, useMemo, useCallback } from 'react';
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
import { Loader2 } from 'lucide-react';
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
  isLoading?: boolean;
}

interface ConversationUser {
  user: ChatUser;
  lastMessage: any;
  unreadCount: number;
  timestamp: string;
}

export default function MessagesPanel({ 
  isOpen, 
  onClose, 
  currentUser, 
  privateConversations,
  onlineUsers,
  onStartPrivateChat,
  isLoading = false
}: MessagesPanelProps) {
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);

  // آمن ومحسن: معالجة المحادثات مع فحص شامل
  const conversationUsers = useMemo((): ConversationUser[] => {
    if (!privateConversations || !onlineUsers || onlineUsers.length === 0) {
      return [];
    }

    try {
      return Object.keys(privateConversations)
        .map(userId => {
          const numericUserId = parseInt(userId);
          
          // فحص صحة معرف المستخدم
          if (isNaN(numericUserId)) {
            console.warn(`معرف مستخدم غير صالح: ${userId}`);
            return null;
          }

          // البحث عن المستخدم في القائمة
          const user = onlineUsers.find(u => u.id === numericUserId);
          if (!user) {
            // يمكن أن يكون المستخدم غير متصل، نتجاهل المحادثة
            return null;
          }

          // فحص وجود المحادثة وصحتها
          const conversation = privateConversations[numericUserId];
          if (!conversation || !Array.isArray(conversation) || conversation.length === 0) {
            return null;
          }

          // الحصول على آخر رسالة بأمان
          const lastMessage = conversation[conversation.length - 1];
          if (!lastMessage) {
            return null;
          }

          // حساب عدد الرسائل غير المقروءة (مؤقتاً 0 حتى يتم تطبيق النظام)
          const unreadCount = conversation.filter(msg => 
            msg.senderId !== currentUser?.id && !msg.isRead
          ).length;

          return {
            user,
            lastMessage,
            unreadCount,
            timestamp: lastMessage.timestamp || new Date().toISOString()
          };
        })
        .filter((item): item is ConversationUser => item !== null)
        // ترتيب حسب آخر رسالة
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      console.error('خطأ في معالجة المحادثات:', error);
      return [];
    }
  }, [privateConversations, onlineUsers, currentUser?.id]);

  const formatLastMessage = useCallback((content: string): string => {
    if (!content || typeof content !== 'string') {
      return 'رسالة غير صالحة';
    }
    
    // معالجة الصور
    if (content.startsWith('data:image')) {
      return '📷 صورة';
    }
    
    // اقتطاع النص الطويل
    if (content.length > 30) {
      return content.substring(0, 30) + '...';
    }
    return content;
  }, []);

  const handleStartChat = useCallback((user: ChatUser) => {
    if (!user || !user.id) {
      console.error('مستخدم غير صالح للدردشة');
      return;
    }
    
    try {
      onStartPrivateChat(user);
      onClose();
    } catch (error) {
      console.error('خطأ في بدء المحادثة:', error);
    }
  }, [onStartPrivateChat, onClose]);

  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    target.src = '/default_avatar.svg';
  }, []);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[500px] bg-gradient-to-br from-secondary to-accent border-2 border-accent shadow-2xl">
        <DialogHeader className="border-b border-accent pb-4">
          <DialogTitle className="text-2xl font-bold text-center text-primary-foreground">
            ✉️ الرسائل الخاصة
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[350px] w-full">
          <div className="space-y-4 p-4">
            {/* حالة التحميل */}
            {(isLoading || isLoadingConversations) && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">جاري التحميل...</span>
              </div>
            )}

            {/* حالة عدم وجود محادثات */}
            {!isLoading && !isLoadingConversations && conversationUsers.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <div className="text-6xl mb-6">✉️</div>
                <h3 className="text-lg font-semibold text-foreground mb-2">لا توجد محادثات</h3>
                <p className="text-sm">انقر على أي مستخدم في القائمة لبدء محادثة جديدة</p>
                <div className="mt-4 p-4 bg-accent/20 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    💡 نصيحة: يمكنك العثور على المستخدمين في القائمة الجانبية
                  </p>
                </div>
              </div>
            )}

            {/* قائمة المحادثات */}
            {!isLoading && !isLoadingConversations && conversationUsers.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-bold text-foreground text-lg mb-3 border-b border-accent pb-2 flex items-center justify-between">
                  <span>✉️ المحادثات النشطة</span>
                  <span className="text-sm bg-primary text-primary-foreground px-2 py-1 rounded-full">
                    {conversationUsers.length}
                  </span>
                </h4>

                {conversationUsers.map(({ user, lastMessage, unreadCount, timestamp }) => (
                  <Card
                    key={user.id}
                    className="cursor-pointer hover:bg-accent/20 transition-all duration-200 border-l-4 border-l-primary"
                    onClick={() => handleStartChat(user)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        {/* صورة المستخدم */}
                        <div className="relative flex-shrink-0">
                          <img
                            src={getImageSrc(user.profileImage)}
                            alt={`صورة ${user.username}`}
                            className="w-12 h-12 rounded-full border-2 border-primary ring-1 ring-accent shadow-sm object-cover"
                            onError={handleImageError}
                            loading="lazy"
                          />
                          {/* مؤشر الاتصال */}
                          {user.isOnline && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                          )}
                          {/* مؤشر الرسائل غير المقروءة */}
                          {unreadCount > 0 && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                              {unreadCount > 9 ? '9+' : unreadCount}
                            </div>
                          )}
                        </div>
                        
                        {/* معلومات المستخدم والرسالة */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-medium text-foreground text-sm truncate">
                              {user.username}
                            </h3>
                            <span className="text-xs text-muted-foreground">
                              {formatTime(timestamp)}
                            </span>
                          </div>
                          
                          <p className="text-sm text-muted-foreground truncate">
                            {formatLastMessage(lastMessage?.content || '')}
                          </p>
                          
                          {/* حالة المستخدم */}
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              user.isOnline 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {user.isOnline ? '🟢 متصل' : '🔴 غير متصل'}
                            </span>
                          </div>
                        </div>

                        {/* أيقونة السهم */}
                        <div className="text-muted-foreground">
                          ←
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* شريط الأزرار السفلي */}
        <div className="flex justify-center gap-2 pt-6 border-t border-accent bg-gradient-to-r from-secondary to-accent">
          <Button 
            onClick={onClose} 
            variant="outline" 
            className="flex-1 bg-background border-border text-foreground hover:bg-accent/30 font-medium"
          >
            ✖️ إغلاق
          </Button>
          
          {conversationUsers.length > 0 && (
            <Button 
              onClick={() => setIsLoadingConversations(true)}
              variant="ghost"
              className="px-4 text-muted-foreground hover:text-foreground"
              disabled={isLoadingConversations}
            >
              {isLoadingConversations ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                '🔄'
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
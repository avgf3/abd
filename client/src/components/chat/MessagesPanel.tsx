import { useState, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';

interface MessagesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: ChatUser | null;
  privateConversations: PrivateConversation;
  onlineUsers: ChatUser[];
  onStartPrivateChat: (user: ChatUser) => void;
}

interface ConversationItem {
  user: ChatUser;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
  isOnline: boolean;
}

export default function MessagesPanel({ 
  isOpen, 
  onClose, 
  currentUser, 
  privateConversations,
  onlineUsers,
  onStartPrivateChat
}: MessagesPanelProps) {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && currentUser) {
      fetchConversations();
    }
  }, [isOpen, currentUser]);

  const fetchConversations = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const response = await apiRequest(`/api/messages/private/conversations/${currentUser.id}`);
      if (response.success && response.conversations) {
        const formattedConversations: ConversationItem[] = response.conversations.map((conv: any) => ({
          user: {
            ...conv,
            isOnline: onlineUsers.some(u => u.id === conv.id)
          },
          lastMessage: conv.last_message,
          lastMessageTime: conv.last_message_time ? new Date(conv.last_message_time) : undefined,
          unreadCount: conv.unread_count || 0,
          isOnline: onlineUsers.some(u => u.id === conv.id)
        }));
        setConversations(formattedConversations);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      // Fallback to local data
      loadLocalConversations();
    } finally {
      setLoading(false);
    }
  };

  const loadLocalConversations = () => {
    // Get users who have active conversations - resilient even if user is offline
    const conversationUsers = Object.keys(privateConversations).map((idStr) => {
      const otherUserId = parseInt(idStr);
      const conversation = privateConversations[otherUserId] || [];
      const lastMessage = conversation[conversation.length - 1];

      // Prefer live online user object; otherwise fallback to last sender or a minimal stub
      const onlineUser = onlineUsers.find(u => u.id === otherUserId);
      const fallbackFromMessage = lastMessage?.sender;

      const resolvedUser: ChatUser | undefined = onlineUser || fallbackFromMessage || (otherUserId ? {
        id: otherUserId,
        username: `مستخدم #${otherUserId}`,
        userType: 'member',
        role: 'member',
        profileImage: undefined,
        profileBanner: undefined,
        profileBackgroundColor: '#ffffff',
        status: '',
        gender: undefined,
        age: undefined,
        country: undefined,
        relation: undefined,
        bio: undefined,
        isOnline: false,
        isHidden: false,
        lastSeen: null,
        joinDate: new Date(),
        createdAt: new Date(),
        isMuted: false,
        muteExpiry: null,
        isBanned: false,
        banExpiry: null,
        isBlocked: false,
        ignoredUsers: [],
        usernameColor: '#000000',
        userTheme: 'theme-new-gradient',
        profileEffect: 'none',
        points: 0,
        level: 1,
        totalPoints: 0,
        levelProgress: 0,
      } as ChatUser : undefined);

      return {
        user: resolvedUser,
        lastMessage: lastMessage?.content,
        lastMessageTime: lastMessage ? new Date(lastMessage.timestamp) : undefined,
        unreadCount: 0, // يمكن تطويره لاحقاً
        isOnline: onlineUser ? true : false
      };
    }).filter(item => item.user && (privateConversations[(item.user as ChatUser).id]?.length ?? 0) > 0) as ConversationItem[];

    setConversations(conversationUsers);
  };

  const formatLastMessage = (content?: string) => {
    if (!content) return 'لا توجد رسائل';
    if (content.startsWith('data:image')) {
      return '📷 صورة';
    }
    if (content.startsWith('🎥')) {
      return content;
    }
    if (content.startsWith('📄')) {
      return content;
    }
    if (content.length > 30) {
      return content.substring(0, 30) + '...';
    }
    return content;
  };

  const handleConversationClick = async (user: ChatUser) => {
    // Mark messages as read
    if (currentUser) {
      try {
        await apiRequest('/api/messages/private/mark-read', {
          method: 'POST',
          body: JSON.stringify({
            userId: currentUser.id,
            conversationUserId: user.id
          })
        });
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    }
    
    onStartPrivateChat(user);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[600px] bg-gradient-to-br from-secondary to-accent border-2 border-accent shadow-2xl">
        <DialogHeader className="border-b border-accent pb-4">
          <DialogTitle className="text-2xl font-bold text-center text-primary-foreground flex items-center justify-center gap-2">
            <span className="text-3xl">💬</span>
            <span>صندوق الرسائل</span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[450px] w-full">
          <div className="space-y-2 p-4">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin text-4xl mb-4">⏳</div>
                <p className="text-muted-foreground">جاري التحميل...</p>
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <div className="text-6xl mb-6">📭</div>
                <h3 className="text-lg font-semibold text-foreground mb-2">صندوق الرسائل فارغ</h3>
                <p className="text-sm">ابدأ محادثة جديدة بالنقر على أي مستخدم متصل</p>
              </div>
            ) : (
              <div className="space-y-2">
                {conversations.map(({ user, lastMessage, lastMessageTime, unreadCount, isOnline }) => (
                  <Card 
                    key={user.id} 
                    className="cursor-pointer hover:bg-accent/20 transition-all duration-200 border-accent/50"
                    onClick={() => handleConversationClick(user)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="relative">
                          <ProfileImage 
                            user={user} 
                            size="medium"
                            className="w-12 h-12"
                          />
                          {isOnline && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {user.username}
                            </h3>
                            {lastMessageTime && (
                              <span className="text-xs text-muted-foreground">
                                {formatTime(lastMessageTime.toISOString())}
                              </span>
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-600 truncate">
                            {formatLastMessage(lastMessage)}
                          </p>
                        </div>

                        {unreadCount > 0 && (
                          <Badge className="bg-red-500 text-white hover:bg-red-600 min-w-[24px] h-6 px-2">
                            {unreadCount}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* قائمة المستخدمين المتصلين */}
            {onlineUsers.length > 0 && conversations.length < onlineUsers.length && (
              <div className="mt-6 pt-6 border-t border-accent">
                <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span className="text-green-500">●</span>
                  مستخدمون متصلون ({onlineUsers.filter(u => u.id !== currentUser?.id).length})
                </h4>
                <div className="space-y-2">
                  {onlineUsers
                    .filter(u => u.id !== currentUser?.id && !conversations.some(c => c.user.id === u.id))
                    .map(user => (
                      <Card 
                        key={user.id}
                        className="cursor-pointer hover:bg-accent/20 transition-all duration-200 border-accent/30"
                        onClick={() => handleConversationClick(user)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <ProfileImage 
                                user={user} 
                                size="small"
                                className="w-10 h-10"
                              />
                              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                            </div>
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900 text-sm">
                                {user.username}
                              </h3>
                              <p className="text-xs text-green-600">متصل الآن</p>
                            </div>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="text-primary hover:bg-primary/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleConversationClick(user);
                              }}
                            >
                              💬 محادثة
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-center pt-4 border-t border-accent">
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
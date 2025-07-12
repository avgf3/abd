import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { useChat } from '@/hooks/useChatNew';
import type { ChatUser, ChatMessage } from '@/types/chat';

// Sub-components
import UserSidebar from './UserSidebarNew';
import MessageArea from './MessageAreaNew';
import AdminPanel from './AdminPanelNew';
import ProfileModal from './ProfileModal';
import PrivateMessageBox from './PrivateMessageBoxNew';
import NotificationPanel from './NotificationPanelNew';

interface ChatInterfaceProps {
  chat: ReturnType<typeof useChat>;
  onLogout: () => void;
}

export default function ChatInterface({ chat, onLogout }: ChatInterfaceProps) {
  // Core states
  const [activePanel, setActivePanel] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [selectedPrivateUser, setSelectedPrivateUser] = useState<ChatUser | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  
  const { toast } = useToast();

  // Check admin permissions
  const isOwner = chat.currentUser?.userType === 'owner';
  const isAdmin = chat.currentUser?.userType === 'admin' || isOwner;
  const isModerator = chat.currentUser?.userType === 'moderator' || isAdmin;

  // Fetch notifications
  useEffect(() => {
    if (chat.currentUser) {
      fetchNotifications();
      fetchFriendRequests();
    }
  }, [chat.currentUser]);

  const fetchNotifications = async () => {
    if (!chat.currentUser) return;
    try {
      const response = await apiRequest(`/api/notifications/${chat.currentUser.id}`);
      if (response?.notifications) {
        setNotifications(response.notifications);
      }
    } catch (error) {
      console.error('خطأ في جلب الإشعارات:', error);
    }
  };

  const fetchFriendRequests = async () => {
    if (!chat.currentUser) return;
    try {
      const response = await apiRequest(`/api/friend-requests/incoming/${chat.currentUser.id}`);
      if (response?.requests) {
        setFriendRequests(response.requests);
      }
    } catch (error) {
      console.error('خطأ في جلب طلبات الصداقة:', error);
    }
  };

  const handleUserClick = (user: ChatUser) => {
    setSelectedUser(user);
    setActivePanel('profile');
  };

  const handlePrivateMessage = (user: ChatUser) => {
    setSelectedPrivateUser(user);
    setActivePanel('');
  };

  const handleAddFriend = async (user: ChatUser) => {
    if (!chat.currentUser) return;
    
    try {
      await apiRequest('/api/friend-requests', {
        method: 'POST',
        body: {
          senderId: chat.currentUser.id,
          receiverId: user.id,
        }
      });
      
      toast({
        title: "تم إرسال طلب الصداقة",
        description: `تم إرسال طلب صداقة إلى ${user.username}`,
      });
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "فشل في إرسال طلب الصداقة",
        variant: "destructive"
      });
    }
  };

  const closePanel = () => {
    setActivePanel('');
    setSelectedUser(null);
    setSelectedPrivateUser(null);
  };

  const getUnreadCount = (type: string) => {
    switch (type) {
      case 'notifications':
        return notifications.filter(n => !n.isRead).length;
      case 'friendRequests':
        return friendRequests.filter(r => r.status === 'pending').length;
      default:
        return 0;
    }
  };

  return (
    <div className="h-screen bg-gray-900 text-white flex" dir="rtl">
      {/* Sidebar */}
      <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                {chat.currentUser?.username?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-bold">{chat.currentUser?.username}</div>
                <div className="text-sm text-gray-400">
                  {chat.currentUser?.userType === 'owner' && '👑 مالك'}
                  {chat.currentUser?.userType === 'admin' && '⭐ مشرف'}
                  {chat.currentUser?.userType === 'moderator' && '🛡️ مراقب'}
                  {chat.currentUser?.userType === 'member' && '👤 عضو'}
                  {chat.currentUser?.userType === 'guest' && '👤 ضيف'}
                </div>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onLogout}
              className="text-red-400 hover:text-red-300"
            >
              خروج
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={activePanel === 'notifications' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActivePanel(activePanel === 'notifications' ? '' : 'notifications')}
              className="relative"
            >
              🔔 الإشعارات
              {getUnreadCount('notifications') > 0 && (
                <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs">
                  {getUnreadCount('notifications')}
                </Badge>
              )}
            </Button>
            
            <Button
              variant={activePanel === 'friends' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActivePanel(activePanel === 'friends' ? '' : 'friends')}
              className="relative"
            >
              👥 الأصدقاء
              {getUnreadCount('friendRequests') > 0 && (
                <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs">
                  {getUnreadCount('friendRequests')}
                </Badge>
              )}
            </Button>

            {isAdmin && (
              <Button
                variant={activePanel === 'admin' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActivePanel(activePanel === 'admin' ? '' : 'admin')}
                className="col-span-2"
              >
                ⚙️ لوحة الإدارة
              </Button>
            )}
          </div>
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto">
          <UserSidebar
            users={chat.onlineUsers}
            currentUser={chat.currentUser}
            onUserClick={handleUserClick}
            onPrivateMessage={handlePrivateMessage}
            onAddFriend={handleAddFriend}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <MessageArea
          messages={chat.publicMessages}
          currentUser={chat.currentUser}
          onSendMessage={chat.sendMessage}
          typingUsers={chat.typingUsers}
          onTyping={chat.sendTyping}
        />
      </div>

      {/* Side Panels */}
      {activePanel === 'notifications' && (
        <div className="w-80 bg-gray-800 border-r border-gray-700">
          <NotificationPanel
            notifications={notifications}
            onClose={() => setActivePanel('')}
            onRefresh={fetchNotifications}
          />
        </div>
      )}

      {activePanel === 'admin' && isAdmin && (
        <div className="w-96 bg-gray-800 border-r border-gray-700">
          <AdminPanel
            isOpen={true}
            onClose={() => setActivePanel('')}
            currentUser={chat.currentUser}
            onlineUsers={chat.onlineUsers}
          />
        </div>
      )}

      {/* Modals */}
      {selectedUser && activePanel === 'profile' && (
        <ProfileModal
          user={selectedUser}
          currentUser={chat.currentUser}
          isOpen={true}
          onClose={closePanel}
          onPrivateMessage={() => handlePrivateMessage(selectedUser)}
          onAddFriend={() => handleAddFriend(selectedUser)}
        />
      )}

      {selectedPrivateUser && (
        <PrivateMessageBox
          targetUser={selectedPrivateUser}
          currentUser={chat.currentUser}
          messages={chat.privateConversations[selectedPrivateUser.id] || []}
          onSendMessage={(content, messageType) => 
            chat.sendPrivateMessage(selectedPrivateUser.id, content, messageType)
          }
          onClose={() => setSelectedPrivateUser(null)}
        />
      )}
    </div>
  );
}
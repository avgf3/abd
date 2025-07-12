import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCleanChat } from '@/hooks/useCleanChat';
import type { ChatUser } from '@/types/chat';

interface CleanChatInterfaceProps {
  chat: ReturnType<typeof useCleanChat>;
  onLogout: () => void;
}

export default function CleanChatInterface({ chat, onLogout }: CleanChatInterfaceProps) {
  const [messageInput, setMessageInput] = useState('');
  const [selectedTab, setSelectedTab] = useState('chat');

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      chat.sendMessage(messageInput);
      setMessageInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendFriendRequest = async (targetUser: ChatUser) => {
    try {
      await chat.sendFriendRequest(targetUser.id);
      alert('تم إرسال طلب الصداقة بنجاح');
    } catch (error: any) {
      alert(error.message || 'فشل في إرسال طلب الصداقة');
    }
  };

  return (
    <div className="h-screen flex bg-gray-900 text-white" dir="rtl">
      {/* الشريط الجانبي */}
      <div className="w-80 bg-gray-800 border-l border-gray-700">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">{chat.user?.username}</h2>
              <p className="text-sm text-gray-400">{chat.user?.userType}</p>
            </div>
            <Button onClick={onLogout} variant="outline" size="sm">
              خروج
            </Button>
          </div>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="h-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-700">
            <TabsTrigger value="chat">💬 الدردشة</TabsTrigger>
            <TabsTrigger value="friends">
              👥 الأصدقاء
              {chat.friends.length > 0 && (
                <Badge className="mr-2">{chat.friends.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="requests">
              📬 الطلبات
              {chat.friendRequests.length > 0 && (
                <Badge variant="destructive" className="mr-2">
                  {chat.friendRequests.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="mt-0 h-full">
            <ScrollArea className="h-96 p-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-2">
                المتصلون الآن ({chat.users.filter(u => u.isOnline).length})
              </h3>
              <div className="space-y-2">
                {chat.users
                  .filter(u => u.isOnline && u.id !== chat.user?.id)
                  .map(user => (
                    <div key={user.id} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm">{user.username}</span>
                        <Badge variant="secondary" size="sm">
                          {user.userType}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSendFriendRequest(user)}
                      >
                        إضافة
                      </Button>
                    </div>
                  ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="friends" className="mt-0 h-full">
            <ScrollArea className="h-96 p-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-2">
                قائمة الأصدقاء ({chat.friends.length})
              </h3>
              <div className="space-y-2">
                {chat.friends.map(friend => (
                  <div key={friend.id} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <div className={`w-2 h-2 rounded-full ${friend.isOnline ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                      <span className="text-sm">{friend.username}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => chat.removeFriend(friend.id)}
                    >
                      حذف
                    </Button>
                  </div>
                ))}
                {chat.friends.length === 0 && (
                  <p className="text-gray-400 text-center py-4">لا توجد أصدقاء بعد</p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="requests" className="mt-0 h-full">
            <ScrollArea className="h-96 p-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-2">
                طلبات الصداقة ({chat.friendRequests.length})
              </h3>
              <div className="space-y-2">
                {chat.friendRequests.map(request => (
                  <div key={request.id} className="p-3 bg-gray-700 rounded">
                    <p className="text-sm mb-2">طلب صداقة من: {request.senderId}</p>
                    <div className="flex space-x-2 space-x-reverse">
                      <Button
                        size="sm"
                        onClick={() => chat.acceptFriendRequest(request.senderId)}
                      >
                        قبول
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => chat.declineFriendRequest(request.senderId)}
                      >
                        رفض
                      </Button>
                    </div>
                  </div>
                ))}
                {chat.friendRequests.length === 0 && (
                  <p className="text-gray-400 text-center py-4">لا توجد طلبات جديدة</p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {/* منطقة الدردشة */}
      <div className="flex-1 flex flex-col">
        {/* رأس الدردشة */}
        <div className="p-4 border-b border-gray-700 bg-gray-800">
          <h1 className="text-xl font-bold">💬 الدردشة العامة</h1>
          <p className="text-sm text-gray-400">
            {chat.isConnected ? '🟢 متصل' : '🔴 غير متصل'}
          </p>
        </div>

        {/* منطقة الرسائل */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3">
            {chat.messages.map(message => (
              <Card key={message.id} className="bg-gray-800 border-gray-700">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 space-x-reverse mb-1">
                        <span className="font-semibold text-sm">
                          {chat.users.find(u => u.id === message.senderId)?.username || 'مجهول'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(message.timestamp).toLocaleTimeString('ar-SA')}
                        </span>
                      </div>
                      <p className="text-sm">{message.content}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>

        {/* صندوق الكتابة */}
        <div className="p-4 border-t border-gray-700 bg-gray-800">
          <div className="flex space-x-2 space-x-reverse">
            <Input
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="اكتب رسالتك هنا..."
              className="flex-1 bg-gray-700 border-gray-600 text-white"
            />
            <Button onClick={handleSendMessage} disabled={!messageInput.trim()}>
              إرسال
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
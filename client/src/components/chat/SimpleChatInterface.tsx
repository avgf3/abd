import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { useChat } from '@/hooks/useChat';

interface SimpleChatInterfaceProps {
  chat: ReturnType<typeof useChat>;
  onLogout: () => void;
}

export default function SimpleChatInterface({ chat, onLogout }: SimpleChatInterfaceProps) {
  const [messageText, setMessageText] = useState('');

  const handleSendMessage = () => {
    if (messageText.trim()) {
      const success = chat.sendPublicMessage(messageText.trim());
      if (success) {
        setMessageText('');
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white font-['Cairo']" dir="rtl">
      {/* Header */}
      <header className="bg-gray-800 p-4 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="text-2xl">💬</div>
          <div className="text-xl font-bold">
            Arabic Chat - {chat.currentUser?.username}
          </div>
        </div>
        <div className="flex gap-3">
          <span className="text-green-400">
            {chat.isConnected ? '🟢 متصل' : '🔴 غير متصل'}
          </span>
          <Button 
            onClick={onLogout}
            className="bg-red-600 hover:bg-red-700"
          >
            تسجيل الخروج
          </Button>
        </div>
      </header>
      
      {/* Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 bg-gray-800 p-4 border-l border-gray-700">
          <h3 className="font-bold mb-4 text-green-400">
            المتصلون الآن ({chat.onlineUsers.length})
          </h3>
          <div className="space-y-2">
            {chat.onlineUsers.map((user) => (
              <div key={user.id} className="flex items-center gap-2 p-2 rounded bg-gray-700">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                <span className={user.userType === 'owner' ? 'text-yellow-400 font-bold' : ''}>
                  {user.userType === 'owner' && '👑 '}
                  {user.userType === 'admin' && '⭐ '}
                  {user.userType === 'moderator' && '🛡️ '}
                  {user.username}
                </span>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Chat */}
        <main className="flex flex-col flex-1">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-850">
            {chat.publicMessages.length === 0 ? (
              <div className="text-center text-gray-400 mt-8">
                <div className="text-4xl mb-4">💭</div>
                <p>لا توجد رسائل بعد</p>
                <p>كن أول من يرسل رسالة!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {chat.publicMessages.map((message, index) => {
                  const sender = message.sender || {
                    id: message.senderId || 0,
                    username: 'مستخدم محذوف',
                    userType: 'guest' as const,
                    profileImage: '/default_avatar.svg',
                    isOnline: false
                  };

                  return (
                    <div key={`${message.id}-${index}`} className="flex gap-3 p-3 bg-gray-700 rounded-lg">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                        {sender.username.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`font-medium ${
                            sender.userType === 'owner' ? 'text-yellow-400' : 
                            sender.userType === 'admin' ? 'text-purple-400' : 
                            sender.userType === 'moderator' ? 'text-blue-400' : 
                            'text-white'
                          }`}>
                            {sender.userType === 'owner' && '👑 '}
                            {sender.userType === 'admin' && '⭐ '}
                            {sender.userType === 'moderator' && '🛡️ '}
                            {sender.username}
                          </span>
                          <span className="text-xs text-gray-400">
                            {message.timestamp ? new Date(message.timestamp).toLocaleTimeString('ar-SA') : ''}
                          </span>
                        </div>
                        <div className="text-gray-200">{message.content}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-700 p-4 bg-gray-800">
            <div className="flex gap-2">
              <Input
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="اكتب رسالتك هنا..."
                className="flex-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                disabled={!chat.isConnected || chat.currentUser?.isMuted}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!messageText.trim() || !chat.isConnected || chat.currentUser?.isMuted}
                className="bg-blue-600 hover:bg-blue-700 px-6"
              >
                إرسال
              </Button>
            </div>
            {chat.currentUser?.isMuted && (
              <div className="text-red-400 text-sm mt-2">
                🔇 أنت مكتوم ولا يمكنك إرسال رسائل
              </div>
            )}
            {!chat.isConnected && (
              <div className="text-red-400 text-sm mt-2">
                🔴 غير متصل - يرجى الانتظار...
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
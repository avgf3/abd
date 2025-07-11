import { useState } from 'react';
import UserSidebar from './UserSidebar';
import NewMessageArea from './NewMessageArea';
import MessageInputArea from './MessageInputArea';
import { Button } from '@/components/ui/button';
import type { useSimpleChat } from '@/hooks/useSimpleChat';
import type { ChatUser } from '@/types/chat';

interface ChatInterfaceProps {
  chat: ReturnType<typeof useSimpleChat>;
  onLogout: () => void;
}

export default function SimpleChatInterface({ chat, onLogout }: ChatInterfaceProps) {
  const handleUserClick = (event: React.MouseEvent, user: ChatUser) => {
    console.log('User clicked:', user.username);
  };

  const handleReportUser = (user: ChatUser, messageContent: string, messageId: number) => {
    console.log('Report user:', user.username, messageContent);
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white font-['Cairo']" dir="rtl">
      {/* Header */}
      <header className="bg-gray-800 p-4 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="text-2xl">💬</div>
          <div className="text-2xl font-bold text-white">
            Arabic<span className="text-blue-400">Chat</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-sm">
            مرحباً {chat.currentUser?.username}
          </span>
          <Button 
            onClick={onLogout}
            className="bg-red-600 hover:bg-red-700 px-4 py-2"
          >
            خروج
          </Button>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex flex-1 overflow-hidden">
        <UserSidebar 
          users={chat.onlineUsers}
          onUserClick={handleUserClick}
          currentUser={chat.currentUser}
        />
        <div className="flex flex-col flex-1 min-w-0">
          <NewMessageArea
            messages={chat.publicMessages}
            onUserClick={handleUserClick}
            onReportMessage={handleReportUser}
            typingUsers={chat.typingUsers}
          />
          <MessageInputArea
            onSendMessage={chat.sendPublicMessage}
            onTyping={chat.sendTyping}
            currentUser={chat.currentUser}
            disabled={chat.currentUser?.isMuted}
          />
        </div>
      </main>
    </div>
  );
}
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Image, Smile, Users, Settings, LogOut, Menu, X } from 'lucide-react';
import type { ChatUser, Message } from '@/types/chat';
import { getImageSrc } from '@/utils/imageUtils';
import ProfileFrame from '@/components/profile/ProfileFrame';

interface ArabicChatLayoutProps {
  currentUser: ChatUser;
  messages: Message[];
  onlineUsers: ChatUser[];
  onSendMessage: (content: string) => void;
  onLogout: () => void;
  onOpenSettings: () => void;
}

export default function ArabicChatLayout({
  currentUser,
  messages,
  onlineUsers,
  onSendMessage,
  onLogout,
  onOpenSettings
}: ArabicChatLayoutProps) {
  const [messageInput, setMessageInput] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (messageInput.trim()) {
      onSendMessage(messageInput.trim());
      setMessageInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="arabic-chat-layout h-screen flex flex-col bg-[#1a1d24] text-white">
      {/* ====================================
          الشريط العلوي - Header
          ==================================== */}
      <header className="header bg-[#1a1d24] border-b border-[#2d323e] px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="lg:hidden p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            {showSidebar ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-[#1ba3e6] to-[#1596d9] rounded-lg flex items-center justify-center font-bold text-lg shadow-lg">
              💬
            </div>
            <div>
              <h1 className="text-lg font-bold">أرابيك شات</h1>
              <p className="text-xs text-gray-400">دردشة عربية</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Current Room */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#262a33] rounded-lg">
            <Users className="w-4 h-4 text-[#1ba3e6]" />
            <span className="text-sm font-medium">العامة</span>
            <span className="text-xs text-gray-400">({onlineUsers.length})</span>
          </div>

          {/* Settings */}
          <button
            onClick={onOpenSettings}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            title="الإعدادات"
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* Logout */}
          <button
            onClick={onLogout}
            className="p-2 hover:bg-red-600 rounded-lg transition-colors"
            title="تسجيل الخروج"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ====================================
          المحتوى الرئيسي - Main Content
          ==================================== */}
      <div className="flex-1 flex overflow-hidden">
        {/* ====================================
            الشريط الجانبي - Sidebar (Users List)
            ==================================== */}
        <aside
          className={`sidebar bg-[#1f2229] border-l border-[#2d323e] w-64 flex-shrink-0 overflow-y-auto transition-all duration-300 ${
            showSidebar ? 'block' : 'hidden'
          } lg:block`}
        >
          {/* User Profile */}
          <div className="p-4 border-b border-[#2d323e]">
            <div className="flex items-center gap-3">
              <ProfileFrame level={currentUser.level || 0} size="small">
                <img
                  src={getImageSrc(currentUser.profileImage || '/default_avatar.svg')}
                  alt={currentUser.username}
                  className="w-full h-full object-cover"
                />
              </ProfileFrame>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{currentUser.username}</p>
                <p className="text-xs text-gray-400">المستوى {currentUser.level || 1}</p>
              </div>
            </div>
          </div>

          {/* Online Users */}
          <div className="p-3">
            <h3 className="text-xs font-semibold text-gray-400 mb-3 px-2">
              المتواجدون ({onlineUsers.length})
            </h3>
            <div className="space-y-1">
              {onlineUsers.map((user) => (
                <div
                  key={user.id}
                  className="user-list-item flex items-center gap-3 p-2 rounded-lg hover:bg-[#262a33] transition-colors cursor-pointer"
                >
                  <div className="relative">
                    <ProfileFrame level={user.level || 0} size="tiny" showBadge={false}>
                      <img
                        src={getImageSrc(user.profileImage || '/default_avatar.svg')}
                        alt={user.username}
                        className="w-full h-full object-cover"
                      />
                    </ProfileFrame>
                    {/* Online Indicator */}
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#1f2229]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.username}</p>
                    <p className="text-xs text-gray-400">مستوى {user.level || 1}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* ====================================
            منطقة الشات - Chat Area
            ==================================== */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 messages-area">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Users className="w-16 h-16 mb-3 opacity-30" />
                <p className="text-lg font-medium">ابدأ المحادثة</p>
                <p className="text-sm">أرسل أول رسالة لك!</p>
              </div>
            ) : (
              <>
                {messages.map((message, index) => {
                  const isMyMessage = message.senderId === currentUser.id;
                  const showAvatar = 
                    index === 0 || 
                    messages[index - 1].senderId !== message.senderId;

                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-3 ${isMyMessage ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      {/* Avatar */}
                      {showAvatar ? (
                        <div className="flex-shrink-0">
                          <ProfileFrame level={message.senderLevel || 0} size="small" showBadge={false}>
                            <img
                              src={getImageSrc(message.senderAvatar || '/default_avatar.svg')}
                              alt={message.senderUsername}
                              className="w-full h-full object-cover"
                            />
                          </ProfileFrame>
                        </div>
                      ) : (
                        <div className="w-12 flex-shrink-0" />
                      )}

                      {/* Message Bubble */}
                      <div
                        className={`message max-w-[70%] sm:max-w-[60%] ${
                          isMyMessage
                            ? 'my-message bg-gradient-to-br from-[#1ba3e6] to-[#1596d9] text-white rounded-2xl rounded-br-sm'
                            : 'other-message bg-[#262a33] text-white rounded-2xl rounded-bl-sm'
                        } px-4 py-2 shadow-md`}
                      >
                        {/* Username (for others) */}
                        {!isMyMessage && showAvatar && (
                          <p className="message-username text-[#1ba3e6] text-xs font-semibold mb-1">
                            {message.senderUsername}
                          </p>
                        )}

                        {/* Content */}
                        <p className="message-content text-sm leading-relaxed break-words">
                          {message.content}
                        </p>

                        {/* Time */}
                        <p
                          className={`message-time text-[10px] mt-1 ${
                            isMyMessage ? 'text-white/70' : 'text-gray-400'
                          }`}
                        >
                          {new Date(message.timestamp).toLocaleTimeString('ar', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* ====================================
              Input Area - منطقة الإدخال
              ==================================== */}
          <div className="chat-input-area bg-[#1f2229] border-t border-[#2d323e] p-4">
            <div className="flex gap-3 items-end">
              {/* Emoji Button */}
              <button
                className="p-3 bg-[#262a33] hover:bg-[#2d323e] rounded-lg transition-colors flex-shrink-0"
                title="إيموجي"
              >
                <Smile className="w-5 h-5 text-gray-400" />
              </button>

              {/* Image Button */}
              <button
                className="p-3 bg-[#262a33] hover:bg-[#2d323e] rounded-lg transition-colors flex-shrink-0"
                title="صورة"
              >
                <Image className="w-5 h-5 text-gray-400" />
              </button>

              {/* Message Input */}
              <div className="flex-1">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="اكتب رسالتك..."
                  className="message-input w-full bg-[#262a33] border border-[#2d323e] text-white rounded-lg px-4 py-3 focus:border-[#1ba3e6] focus:ring-2 focus:ring-[#1ba3e6]/20 transition-all outline-none"
                />
              </div>

              {/* Send Button */}
              <button
                onClick={handleSend}
                disabled={!messageInput.trim()}
                className="send-button bg-[#1ba3e6] hover:bg-[#1596d9] disabled:bg-gray-600 disabled:cursor-not-allowed p-3 rounded-lg transition-all flex-shrink-0"
                title="إرسال"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Info */}
            <div className="mt-2 text-xs text-gray-400 text-center">
              اضغط Enter للإرسال • Shift+Enter لسطر جديد
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {showSidebar && (
        <div
          onClick={() => setShowSidebar(false)}
          className="fixed inset-0 bg-black/50 lg:hidden z-40"
        />
      )}
    </div>
  );
}

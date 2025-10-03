import { useTheme } from '@/contexts/ThemeContext';
import ArabicChatLayout from '@/layouts/ArabicChatLayout';
import type { ChatUser, Message } from '@/types/chat';

interface ChatLayoutWrapperProps {
  currentUser: ChatUser;
  messages: Message[];
  onlineUsers: ChatUser[];
  onSendMessage: (content: string) => void;
  onLogout: () => void;
  onOpenSettings: () => void;
  children: React.ReactNode; // الـ Layout الأصلي
}

/**
 * Wrapper يختار Layout حسب الثيم المختار
 * - إذا الثيم 'arabic-chat' -> يعرض ArabicChatLayout
 * - إذا الثيم 'default' -> يعرض الـ Layout الأصلي (children)
 */
export default function ChatLayoutWrapper({
  currentUser,
  messages,
  onlineUsers,
  onSendMessage,
  onLogout,
  onOpenSettings,
  children
}: ChatLayoutWrapperProps) {
  const { theme } = useTheme();

  // إذا الثيم arabic-chat، استخدم Layout الخاص
  if (theme === 'arabic-chat') {
    return (
      <ArabicChatLayout
        currentUser={currentUser}
        messages={messages}
        onlineUsers={onlineUsers}
        onSendMessage={onSendMessage}
        onLogout={onLogout}
        onOpenSettings={onOpenSettings}
      />
    );
  }

  // إذا default، استخدم الـ Layout الأصلي
  return <>{children}</>;
}

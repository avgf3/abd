import { useState } from 'react';
import LoginForm from './pages/LoginForm';
import ChatInterface from './components/chat/ChatInterface';
import { Toaster } from './components/ui/toaster';
import { useChat } from './hooks/useChat';
import type { ChatUser } from './types/chat';
import './index.css';

function App() {
  const [currentUser, setCurrentUser] = useState<ChatUser | null>(null);
  const chat = useChat();

  const handleLogin = (user: ChatUser) => {
    setCurrentUser(user);
    chat.connect(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    chat.disconnect();
  };

  if (!currentUser) {
    return (
      <>
        <LoginForm onLogin={handleLogin} />
        <Toaster />
      </>
    );
  }

  return (
    <>
      <ChatInterface chat={chat} onLogout={handleLogout} />
      <Toaster />
    </>
  );
}

export default App;

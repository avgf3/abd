import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import WelcomeScreen from "@/components/chat/WelcomeScreen";
import type { ChatUser } from "@/types/chat";

export default function ArabicChat() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<ChatUser | null>(null);

  useEffect(() => {
    document.title = "شات عربي – دردشة عربية شاملة | arbya.chat";
    const metaDescription = document.querySelector("meta[name='description']");
    if (metaDescription) {
      metaDescription.setAttribute(
        "content",
        "شات عربي عام للتعارف مع شباب وصبايا من كل الدول العربية. دردشة عربية شاملة، مجانية وبدون تسجيل."
      );
    }
  }, []);

  const handleUserLogin = (user: ChatUser) => {
    setUser(user);
    // توجيه المستخدم إلى صفحة الدردشة بعد تسجيل الدخول
    setLocation('/chat');
  };

  return <WelcomeScreen onUserLogin={handleUserLogin} />;
}
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import WelcomeScreen from "@/components/chat/WelcomeScreen";
import type { ChatUser } from "@/types/chat";

export default function SaudiChat() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<ChatUser | null>(null);

  useEffect(() => {
    document.title = "شات السعودية – دردشة سعودية مجانية | arbya.chat";
    const metaDescription = document.querySelector("meta[name='description']");
    if (metaDescription) {
      metaDescription.setAttribute(
        "content",
        "شارك في شات السعودية للتعارف والدردشة مع شباب وبنات المملكة. دردشة سعودية مجانية بدون تسجيل مع أصدقاء جدد يومياً."
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
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import WelcomeScreen from "@/components/chat/WelcomeScreen";
import type { ChatUser } from "@/types/chat";

export default function EgyptChat() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<ChatUser | null>(null);

  useEffect(() => {
    document.title = "شات مصر – دردشة مصرية مجانية | arbya.chat";
    const metaDescription = document.querySelector("meta[name='description']");
    if (metaDescription) {
      metaDescription.setAttribute(
        "content",
        "ادخل شات مصر للتعارف والدردشة مع مصريين من كل المحافظات. دردشة مصرية سريعة، مجانية، بدون تسجيل."
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
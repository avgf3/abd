import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import WelcomeScreen from "@/components/chat/WelcomeScreen";
import type { ChatUser } from "@/types/chat";

export default function JordanChat() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<ChatUser | null>(null);

  useEffect(() => {
    document.title = "شات الأردن – دردشة أردنية مجانية | arbya.chat";
    const metaDescription = document.querySelector("meta[name='description']");
    if (metaDescription) {
      metaDescription.setAttribute(
        "content",
        "انضم إلى شات الأردن للتعارف والدردشة مع شباب وبنات الأردن. دردشة أردنية مجانية، آمنة وسريعة."
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
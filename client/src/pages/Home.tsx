import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import WelcomeScreen from "@/components/chat/WelcomeScreen";
import type { ChatUser } from "@/types/chat";

export default function Home() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<ChatUser | null>(null);

  useEffect(() => {
    document.title = "شات عربي – دردشة عربية مجانية | arbya.chat";
    const metaDescription = document.querySelector("meta[name='description']");
    if (metaDescription) {
      metaDescription.setAttribute(
        "content",
        "انضم إلى شات عربي للتعارف والدردشة مع أصدقاء من كل الدول العربية. دردشة مجانية بدون تسجيل، غرف: شات السعودية، شات مصر، شات الأردن والمزيد."
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
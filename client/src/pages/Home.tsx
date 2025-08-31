import { useEffect } from "react";

export default function Home() {
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

  return (
    <div>
      <h1>مرحباً بك في arbya.chat</h1>
      <p>أفضل مكان للدردشة العربية المجانية.</p>
    </div>
  );
}
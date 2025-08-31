import { useEffect } from "react";

export default function SaudiChat() {
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

  return (
    <div>
      <h1>شات السعودية</h1>
      <p>دردشة سعودية مجانية للتعارف والتواصل.</p>
    </div>
  );
}
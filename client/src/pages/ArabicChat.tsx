import { useEffect } from "react";

export default function ArabicChat() {
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

  return (
    <div>
      <h1>شات عربي عام</h1>
      <p>دردشة عامة تجمع العرب في مكان واحد.</p>
    </div>
  );
}
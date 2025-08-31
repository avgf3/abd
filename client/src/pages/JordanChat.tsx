import { useEffect } from "react";

export default function JordanChat() {
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

  return (
    <div>
      <h1>شات الأردن</h1>
      <p>دردشة أردنية مجانية وآمنة للجميع.</p>
    </div>
  );
}
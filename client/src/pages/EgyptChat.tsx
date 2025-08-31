import { useEffect } from "react";

export default function EgyptChat() {
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

  return (
    <div>
      <h1>شات مصر</h1>
      <p>دردشة مصرية مجانية للتعارف والتسلية.</p>
    </div>
  );
}
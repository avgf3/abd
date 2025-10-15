import { useEffect } from 'react';
import { Link } from 'wouter';

export default function ArabicChat() {
  useEffect(() => {
    document.title = 'شات عربي – دردشة عربية شاملة | arbya.chat';
    const metaDescription = document.querySelector("meta[name='description']");
    if (metaDescription) {
      metaDescription.setAttribute(
        'content',
        'شات عربي عام للتعارف مع شباب وصبايا من كل الدول العربية. دردشة عربية شاملة، مجانية وبدون تسجيل.'
      );
    }
  }, []);

  return (
    <div className="p-6 min-h-[100dvh] bg-background text-foreground overflow-hidden" dir="rtl" style={{ minHeight: '100dvh' }}>
      <h1 className="text-2xl font-bold mb-2">شات عربي عام</h1>
      <p>دردشة عامة تجمع العرب في مكان واحد.</p>
      <div className="mt-4">
        <Link href="/watan" className="text-blue-500 underline">دردشه الوطن</Link>
      </div>
    </div>
  );
}


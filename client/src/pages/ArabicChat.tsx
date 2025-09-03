import { useEffect } from 'react';

export default function ArabicChat() {
  useEffect(() => {
    document.title = 'شات عربي – دردشة عربية شاملة | دردشة وتعارف مجاني';
    const metaDescription = document.querySelector("meta[name='description']");
    if (metaDescription) {
      metaDescription.setAttribute(
        'content',
        'دردشة عربية عامة للتواصل والتعارف ونقاشات مباشرة. شات عربي مجاني بدون تسجيل، غرف محادثة وتواصل فوري.'
      );
    }

    // enrich keywords with synonyms
    let metaKeywords = document.querySelector("meta[name='keywords']");
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    const synonyms = [
      'شات', 'دردشة', 'محادثة', 'تواصل', 'غرف دردشة', 'تعرف', 'تعارف',
      'شات عربي', 'دردشة عربية', 'محادثة عربية', 'تواصل عربي', 'شات بدون تسجيل',
    ];
    metaKeywords.setAttribute('content', synonyms.join(', '));
  }, []);

  return (
    <div className="p-6 min-h-[100dvh] bg-background text-foreground" dir="rtl">
      <h1 className="text-2xl font-bold mb-2">شات عربي عام</h1>
      <p>دردشة عامة تجمع العرب في مكان واحد.</p>
    </div>
  );
}


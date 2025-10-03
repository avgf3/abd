import STATIC_EMOJIS from '@/data/staticEmojis';

export default function EmojisStaticSmallPage() {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground font-['Cairo']" dir="rtl">
      <div className="max-w-5xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">سمايلات عادية صغيرة</h1>
        <p className="text-sm text-muted-foreground mb-6">شبكة 10×N بنفس تنسيق الصفوف في الموقع.</p>
        <div className="grid grid-cols-10 gap-2 text-2xl">
          {STATIC_EMOJIS.map((e, i) => (
            <div key={`${e}-${i}`} className="flex items-center justify-center h-10 border rounded">
              {e}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

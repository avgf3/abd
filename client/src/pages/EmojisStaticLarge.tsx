import STATIC_EMOJIS from '@/data/staticEmojis';

export default function EmojisStaticLargePage() {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground font-['Cairo']" dir="rtl">
      <div className="max-w-5xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">سمايلات عادية كبيرة</h1>
        <p className="text-sm text-muted-foreground mb-6">نفس الشبكة لكن بحجم أكبر.</p>
        <div className="grid grid-cols-8 sm:grid-cols-10 gap-3 text-4xl">
          {STATIC_EMOJIS.map((e, i) => (
            <div key={`${e}-${i}`} className="flex items-center justify-center h-14 sm:h-16 border rounded-lg">
              {e}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import STATIC_EMOJIS from '@/data/staticEmojis';
import custom from '@/data/customEmojis.json';

export default function EmojisStaticLargePage() {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground font-['Cairo']" dir="rtl">
      <div className="max-w-5xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">سمايلات عادية كبيرة</h1>
        <p className="text-sm text-muted-foreground mb-6">نفس الشبكة لكن بحجم أكبر.</p>
        {/* Custom static large emojis (user-provided). Accepts strings or image URLs */}
        {Array.isArray((custom as any).staticLarge) && (custom as any).staticLarge.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">مخصصة</h2>
            <div className="grid grid-cols-8 sm:grid-cols-10 gap-3 text-4xl">
              {(custom as any).staticLarge.map((e: string, i: number) => (
                <div key={`custom-large-${i}`} className="flex items-center justify-center h-14 sm:h-16 border rounded-lg">
                  {/^https?:/.test(e) ? <img src={e} alt={`static-large-${i}`} className="w-10 h-10 object-contain" /> : e}
                </div>
              ))}
            </div>
          </div>
        )}

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

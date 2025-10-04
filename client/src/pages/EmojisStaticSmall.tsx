import STATIC_EMOJIS from '@/data/staticEmojis';
import custom from '@/data/customEmojis.json';

export default function EmojisStaticSmallPage() {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground font-['Cairo']" dir="rtl">
      <div className="max-w-5xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">سمايلات عادية صغيرة</h1>
        <p className="text-sm text-muted-foreground mb-6">شبكة 10×N بنفس تنسيق الصفوف في الموقع.</p>
        {/* Custom static small emojis (user-provided). Accepts strings or image URLs */}
        {Array.isArray((custom as any).staticSmall) && (custom as any).staticSmall.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">مخصصة</h2>
            <div className="grid grid-cols-10 gap-2 text-2xl">
              {(custom as any).staticSmall.map((e: string, i: number) => (
                <div key={`custom-small-${i}`} className="flex items-center justify-center h-10 border rounded">
                  {/^https?:/.test(e) ? <img src={e} alt={`static-${i}`} className="w-6 h-6 object-contain" /> : e}
                </div>
              ))}
            </div>
          </div>
        )}

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

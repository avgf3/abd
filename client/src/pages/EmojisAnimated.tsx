import { Suspense } from 'react';
import animatedEmojis from '@/data/animatedEmojis.json';

export default function EmojisAnimatedPage() {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground font-['Cairo']" dir="rtl">
      <div className="max-w-5xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">سمايلات متحركة (GIF)</h1>
        <p className="text-sm text-muted-foreground mb-6">مجموعة السمايلات المتحركة مقسمة حسب الفئات، بنفس نظام الشبكة في الموقع.</p>
        <div className="space-y-8">
          {Object.entries(animatedEmojis.categories).map(([key, category]) => (
            <section key={key}>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span>{category.icon}</span>
                {category.name}
              </h2>
              <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-3">
                {category.emojis.map((e) => (
                  <div key={e.id} className="flex flex-col items-center gap-1">
                    <img src={e.url} alt={e.name} className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 object-contain" loading="lazy" />
                    <span className="text-[11px] text-muted-foreground truncate max-w-[88px]" title={`${e.name} ${e.code}`}>{e.code}</span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

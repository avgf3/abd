// 👑 إعدادات التيجان المُحسَّنة - تحليل عميق ومواضع مثالية

const override = (n: number, layout: Partial<TagLayout>) => {
  map[n] = { ...map[n], ...layout } as TagLayout;
};

// تاج 1: classic (منحني - مطابقة الرأس)
override(1, { widthRatio: 1.1, yAdjustPx: 1, anchorY: 0.200 });

// تاج 2: royal (منحني - مطابقة الرأس)
override(2, { widthRatio: 1.1, yAdjustPx: 1, anchorY: 0.150 });

// تاج 3: thin (مستقيم - دخول واضح)
override(3, { widthRatio: 1.1, yAdjustPx: 5, anchorY: 0.250 });

// تاج 4: ornate (منحني - مطابقة الرأس)
override(4, { widthRatio: 1.1, yAdjustPx: 1, anchorY: 0.150 });

// تاج 5: smooth (مستقيم - دخول واضح)
override(5, { widthRatio: 1.1, yAdjustPx: 5, anchorY: 0.250 });

// تاج 6: heavy (منحني - مطابقة الرأس)
override(6, { widthRatio: 1.1, yAdjustPx: 1, anchorY: 0.130 });

// تاج 7: medium (مستقيم - دخول واضح)
override(7, { widthRatio: 1.1, yAdjustPx: 5, anchorY: 0.270 });

// تاج 8: simple (منحني - مطابقة الرأس)
override(8, { widthRatio: 1.1, yAdjustPx: 1, anchorY: 0.180 });

// تاج 9: refined (منحني - مطابقة الرأس)
override(9, { widthRatio: 1.1, yAdjustPx: 1, anchorY: 0.150 });

// تاج 10: compact (مستقيم - دخول واضح)
override(10, { widthRatio: 1.1, yAdjustPx: 5, anchorY: 0.280 });

// تاج 11: advanced (منحني - مطابقة الرأس)
override(11, { widthRatio: 1.1, yAdjustPx: 1, anchorY: 0.180 });

// تاج 12: imperial (منحني - مطابقة الرأس)
override(12, { widthRatio: 1.1, yAdjustPx: 1, anchorY: 0.110 });

// 📊 الإحصائيات:
// - التيجان المنحنية: 8 (مطابقة انحناء الرأس)
// - التيجان المستقيمة: 4 (دخول واضح في الصورة)
// - إجمالي التيجان المُحسَّنة: 12

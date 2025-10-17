# Image Tagging System - Maintenance and Manual Overrides (Arabic)

- تم توحيد قاعدة إدخال التاج إلى 5% مرئية من ارتفاع التاج فوق أعلى الصورة.
- تم فرض الحد الأدنى برمجياً داخل `ProfileImage.tsx` بحيث لا يقل الدخول المرئي عن 5%، حتى لو كان للتاج شفافية سفلية كبيرة.
- تم تبسيط التخطيطات: `DEFAULT_TAG_LAYOUT.anchorY = 0.05`.
- تم إضافة ملف توليدي `client/src/config/tagOverrides.json` يحوي قيم `anchorY` لكل تاج بعد التحليل الآلي.
- يمكن إعادة التحليل في أي وقت:

```bash
# تثبيت الاعتمادات (مرة واحدة)
npm install

# تحليل كل التيجان بهدف دخول مرئي 5%
TARGET_ENTRY=0.05 node tools/analyze-tags.cjs

# يُنتج:
# - tools/tag-layouts-recommendations.json
# - client/src/config/tagOverrides.json (يُقرأ تلقائياً في واجهة العميل)
```

- لتوضيح التعديلات داخل `tagLayouts.ts` دون تعقيد، هناك سكربت يضع تعليقات توضيحية فقط:

```bash
node tools/update-tag-layouts-from-recs.cjs
```

- صفحة فحص بصري لكل التيجان: `client/src/pages/VisualTagTest.tsx`.
- في الواجهة: تم تمكين المشرفين أيضاً لتعيين الإطار/التاج من نافذة المستخدم.

ملاحظات:
- إذا أردت تعيين ضبط يدوي إضافي لتاج محدد (مثل `yAdjustPx`)، أضف ذلك في `tagLayouts.ts` بعد تحميل `tagOverrides.json`، وسيأخذ أولوية أقل من ملف التعديلات التوليدي.
- المنطق يحترم الشفافية السفلية تلقائياً ويرفع التاج، ثم يضمن 5% دخول مرئي كحد أدنى.

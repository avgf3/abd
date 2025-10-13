// 🎯 نظام التيجان المبسط - سهل الفهم والتعديل
// تم إنشاؤه لحل مشكلة تعقيد النظام الحالي

export type TagLayout = {
  widthRatio: number;        // نسبة عرض التاج إلى قطر الصورة (1.0 = نفس عرض الصورة)
  xAdjustPx: number;         // إزاحة أفقية إضافية (px)
  yAdjustPx: number;         // إزاحة عمودية إضافية - موجب = للأسفل، سالب = للأعلى (px)
  anchorY?: number;          // مقدار دخول التاج في الصورة (0.3 = 30% من ارتفاع التاج يدخل)
  autoAnchor?: boolean;      // حساب الشفافية السفلية تلقائياً لرفع التاج
};

// 🎯 القالب الافتراضي البسيط - يعمل مع معظم التيجان
export const DEFAULT_TAG_LAYOUT: TagLayout = {
  widthRatio: 1.10,    // التاج أعرض قليلاً من الصورة (10%)
  xAdjustPx: 0,        // في المنتصف
  yAdjustPx: 0,        // بدون ضبط يدوي
  anchorY: 0.35,       // 35% من قاعدة التاج يدخل في الصورة (طبيعي)
  autoAnchor: true,    // يزيل الشفافية السفلية تلقائياً
};

// 📝 إعدادات مخصصة لكل تاج - فقط للتيجان التي تحتاج ضبط خاص
export const SIMPLE_TAG_LAYOUTS: Record<number, TagLayout> = (() => {
  const layouts: Record<number, TagLayout> = {};

  // ملء كل التيجان بالقالب الافتراضي أولاً
  for (let i = 1; i <= 50; i++) {
    layouts[i] = { ...DEFAULT_TAG_LAYOUT };
  }

  // 🛠️ دالة مساعدة للتعديل السريع
  const override = (tagNumber: number, changes: Partial<TagLayout>) => {
    layouts[tagNumber] = { ...layouts[tagNumber], ...changes };
  };

  // ===== إعدادات التيجان الأساسية (1-12) =====
  // يمكنك تعديل هذه القيم بسهولة باستخدام أداة الضبط المرئية

  // التيجان البسيطة - دخول أقل
  override(1, { 
    widthRatio: 1.10, 
    anchorY: 0.30, 
    yAdjustPx: 0 
  });
  
  override(2, { 
    widthRatio: 1.12, 
    anchorY: 0.32, 
    yAdjustPx: 0 
  });
  
  override(3, { 
    widthRatio: 1.08, 
    anchorY: 0.28, 
    yAdjustPx: 0 
  });

  // التيجان المتوسطة
  override(4, { 
    widthRatio: 1.14, 
    anchorY: 0.38, 
    yAdjustPx: 0 
  });
  
  override(5, { 
    widthRatio: 1.09, 
    anchorY: 0.35, 
    yAdjustPx: 0 
  });

  // التيجان الكبيرة - دخول أكبر
  override(6, { 
    widthRatio: 1.15, 
    anchorY: 0.45, 
    yAdjustPx: 0 
  });
  
  override(7, { 
    widthRatio: 1.11, 
    anchorY: 0.36, 
    yAdjustPx: 0 
  });
  
  override(8, { 
    widthRatio: 1.10, 
    anchorY: 0.30, 
    yAdjustPx: 0 
  });
  
  override(9, { 
    widthRatio: 1.13, 
    anchorY: 0.37, 
    yAdjustPx: 0 
  });
  
  override(10, { 
    widthRatio: 1.07, 
    anchorY: 0.28, 
    yAdjustPx: 2 
  });
  
  override(11, { 
    widthRatio: 1.09, 
    anchorY: 0.34, 
    yAdjustPx: 0 
  });
  
  override(12, { 
    widthRatio: 1.12, 
    anchorY: 0.36, 
    yAdjustPx: 0 
  });

  // ===== التيجان الإضافية (13-50) - تصنيف بسيط =====
  
  // مجموعة البسيطة (13-20)
  for (let i = 13; i <= 20; i++) {
    override(i, { 
      widthRatio: 1.08, 
      anchorY: 0.30, 
      yAdjustPx: 0 
    });
  }
  
  // مجموعة المتوسطة (21-30)
  for (let i = 21; i <= 30; i++) {
    override(i, { 
      widthRatio: 1.10, 
      anchorY: 0.35, 
      yAdjustPx: 0 
    });
  }
  
  // مجموعة المزخرفة (31-40)
  for (let i = 31; i <= 40; i++) {
    override(i, { 
      widthRatio: 1.12, 
      anchorY: 0.38, 
      yAdjustPx: 0 
    });
  }
  
  // مجموعة الملكية (41-50)
  for (let i = 41; i <= 50; i++) {
    override(i, { 
      widthRatio: 1.15, 
      anchorY: 0.42, 
      yAdjustPx: 0 
    });
  }

  return layouts;
})();

// 🎯 دالة للحصول على إعدادات التاج
export function getSimpleTagLayout(tagNumber?: number): TagLayout {
  if (!tagNumber || tagNumber < 1 || tagNumber > 50) {
    return DEFAULT_TAG_LAYOUT;
  }
  return SIMPLE_TAG_LAYOUTS[tagNumber] ?? DEFAULT_TAG_LAYOUT;
}

// 📊 دالة للحصول على إحصائيات النظام
export function getTagSystemStats() {
  return {
    totalTags: 50,
    availableTagFiles: 12, // فقط tag1.webp إلى tag12.webp موجودة
    defaultLayout: DEFAULT_TAG_LAYOUT,
    customizedTags: Object.keys(SIMPLE_TAG_LAYOUTS).length
  };
}

// 🔧 دالة لتحديث إعدادات تاج معين (للاستخدام في أداة الضبط)
export function updateTagLayout(tagNumber: number, newLayout: Partial<TagLayout>) {
  if (tagNumber >= 1 && tagNumber <= 50) {
    SIMPLE_TAG_LAYOUTS[tagNumber] = { 
      ...SIMPLE_TAG_LAYOUTS[tagNumber], 
      ...newLayout 
    };
  }
}

// 📋 دالة لتصدير جميع الإعدادات (للنسخ واللصق)
export function exportAllLayouts(): string {
  let output = "// إعدادات التيجان المحدثة\n\n";
  
  for (let i = 1; i <= 12; i++) {
    const layout = SIMPLE_TAG_LAYOUTS[i];
    output += `override(${i}, {\n`;
    output += `  widthRatio: ${layout.widthRatio},\n`;
    output += `  anchorY: ${layout.anchorY},\n`;
    output += `  yAdjustPx: ${layout.yAdjustPx},\n`;
    output += `  xAdjustPx: ${layout.xAdjustPx},\n`;
    output += `  autoAnchor: ${layout.autoAnchor}\n`;
    output += `});\n\n`;
  }
  
  return output;
}

/*
🎯 كيفية الاستخدام:

1. استخدم أداة الضبط المرئية (tag-config-tool.html) لضبط كل تاج
2. انسخ الكود المُولد من الأداة
3. الصقه هنا في المكان المناسب
4. استبدل الاستيراد في ProfileImage.tsx:
   
   من: import { getTagLayout } from '@/config/tagLayouts';
   إلى: import { getSimpleTagLayout as getTagLayout } from '@/config/simplified-tag-layouts';

5. الآن التيجان ستستخدم النظام المبسط!

💡 المزايا:
- كود أبسط وأوضح
- سهل التعديل والصيانة  
- أداة مرئية للضبط
- توثيق شامل بالعربية
- نظام تصنيف منطقي
*/
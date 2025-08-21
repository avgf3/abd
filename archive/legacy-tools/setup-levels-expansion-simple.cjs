const Database = require('better-sqlite3');

// قاعدة بيانات SQLite (تطوير)
const sqliteDb = new Database('./chat.db');

// المستويات الجديدة (11-40)
const newLevels = [
  // المستويات المتقدمة (11-20) - ألماسة بيضاء
  { level: 11, requiredPoints: 4000, title: 'ماسة بيضاء', color: '#F8F8FF' },
  { level: 12, requiredPoints: 5000, title: 'ماسة فضية', color: '#C0C0C0' },
  { level: 13, requiredPoints: 6500, title: 'ماسة لامعة', color: '#E6E6FA' },
  { level: 14, requiredPoints: 8000, title: 'ماسة كريستال', color: '#F0F8FF' },
  { level: 15, requiredPoints: 10000, title: 'ماسة متألقة', color: '#FFFAFA' },
  { level: 16, requiredPoints: 12000, title: 'ماسة مشعة', color: '#F5F5F5' },
  { level: 17, requiredPoints: 15000, title: 'ماسة سماوية', color: '#F0FFFF' },
  { level: 18, requiredPoints: 18000, title: 'ماسة إلهية', color: '#FFFFFF' },
  { level: 19, requiredPoints: 22000, title: 'ماسة أسطورية', color: '#F8F8FF' },
  { level: 20, requiredPoints: 26000, title: 'ماسة النخبة', color: '#FFFACD' },

  // المستويات العليا (21-30) - ألماسة خضراء
  { level: 21, requiredPoints: 30000, title: 'زمردة مبتدئة', color: '#00FF7F' },
  { level: 22, requiredPoints: 35000, title: 'زمردة ناشئة', color: '#00FF00' },
  { level: 23, requiredPoints: 40000, title: 'زمردة متوسطة', color: '#32CD32' },
  { level: 24, requiredPoints: 46000, title: 'زمردة متقدمة', color: '#228B22' },
  { level: 25, requiredPoints: 52000, title: 'زمردة خبيرة', color: '#006400' },
  { level: 26, requiredPoints: 60000, title: 'زمردة محترفة', color: '#008000' },
  { level: 27, requiredPoints: 68000, title: 'زمردة أسطورية', color: '#2E8B57' },
  { level: 28, requiredPoints: 77000, title: 'زمردة نادرة', color: '#3CB371' },
  { level: 29, requiredPoints: 87000, title: 'زمردة ملكية', color: '#20B2AA' },
  { level: 30, requiredPoints: 98000, title: 'زمردة إمبراطورية', color: '#008B8B' },

  // المستويات الأسطورية (31-40) - ألماسة برتقالية مضيئة
  { level: 31, requiredPoints: 110000, title: 'نار مقدسة', color: '#FF4500' },
  { level: 32, requiredPoints: 125000, title: 'لهب إلهي', color: '#FF6347' },
  { level: 33, requiredPoints: 140000, title: 'شعلة أسطورية', color: '#FF7F50' },
  { level: 34, requiredPoints: 160000, title: 'جحيم متقد', color: '#FF8C00' },
  { level: 35, requiredPoints: 180000, title: 'حريق سماوي', color: '#FFA500' },
  { level: 36, requiredPoints: 205000, title: 'عاصفة نارية', color: '#FFB347' },
  { level: 37, requiredPoints: 235000, title: 'انفجار شمسي', color: '#FFCC5C' },
  { level: 38, requiredPoints: 270000, title: 'نور كوني', color: '#FFD700' },
  { level: 39, requiredPoints: 310000, title: 'طاقة لامحدودة', color: '#FFDF00' },
  { level: 40, requiredPoints: 350000, title: 'قوة إلهية', color: '#FFFF00' },
];

function addLevelsToSQLite() {
  try {
    console.log('🔧 إضافة المستويات الجديدة إلى SQLite...');

    // التحقق من وجود جدول level_settings
    const tableExists = sqliteDb
      .prepare(
        `
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='level_settings'
    `
      )
      .get();

    if (!tableExists) {
      console.log('📋 إنشاء جدول level_settings...');
      sqliteDb.exec(`
        CREATE TABLE level_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          level INTEGER UNIQUE NOT NULL,
          required_points INTEGER NOT NULL,
          title TEXT NOT NULL,
          color TEXT DEFAULT '#FFFFFF',
          benefits TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    const insertLevel = sqliteDb.prepare(`
      INSERT OR REPLACE INTO level_settings (level, required_points, title, color)
      VALUES (?, ?, ?, ?)
    `);

    for (const levelData of newLevels) {
      insertLevel.run(levelData.level, levelData.requiredPoints, levelData.title, levelData.color);
    }

    console.log('✅ تم إضافة جميع المستويات الجديدة إلى SQLite بنجاح!');

    // عرض ملخص المستويات
    const allLevels = sqliteDb.prepare('SELECT * FROM level_settings ORDER BY level').all();
    console.log(`📊 إجمالي المستويات الآن: ${allLevels.length}`);

    // عرض أمثلة من المستويات الجديدة
    console.log('\n🎯 أمثلة من المستويات الجديدة:');
    const sampleLevels = sqliteDb
      .prepare('SELECT * FROM level_settings WHERE level IN (11, 21, 31, 40)')
      .all();
    sampleLevels.forEach((level) => {
      console.log(`  مستوى ${level.level}: ${level.title} (${level.required_points} نقطة)`);
    });
  } catch (error) {
    console.error('❌ خطأ في إضافة المستويات إلى SQLite:', error);
  } finally {
    sqliteDb.close();
  }
}

function main() {
  console.log('🚀 بدء إضافة المستويات الجديدة (11-40)...\n');

  addLevelsToSQLite();

  console.log('\n🎉 تم إكمال توسيع نظام المستويات!');
  console.log('📈 النظام الآن يدعم 40 مستوى مع شارات متنوعة');
  console.log('✨ أعد تشغيل الخادم للحصول على التحديثات');
}

// تشغيل السكريبت
main();

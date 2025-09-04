const { Client } = require('pg');
const fs = require('fs').promises;
const path = require('path');

async function applyBotsMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✓ متصل بقاعدة البيانات');

    // قراءة ملف migration
    const migrationPath = path.join(__dirname, 'migrations', 'add-bots-table.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf-8');

    // تنفيذ migration
    await client.query(migrationSQL);
    console.log('✓ تم إنشاء جدول البوتات بنجاح');

    // إنشاء بعض البوتات الافتراضية
    const bcrypt = require('bcrypt');
    
    const defaultBots = [
      { name: 'بوت الترحيب', bio: 'أرحب بالأعضاء الجدد', status: 'متصل دائماً', color: '#FF6B6B' },
      { name: 'بوت المساعدة', bio: 'أساعد في الإجابة على الأسئلة', status: 'جاهز للمساعدة', color: '#4ECDC4' },
      { name: 'بوت الألعاب', bio: 'أنظم الألعاب والمسابقات', status: 'وقت اللعب!', color: '#FFE66D' },
    ];

    for (let i = 0; i < defaultBots.length; i++) {
      const bot = defaultBots[i];
      const hashedPassword = await bcrypt.hash(`bot${i + 1}password`, 12);
      
      try {
        await client.query(
          `INSERT INTO bots (username, password, status, bio, username_color, bot_type, is_active, is_online)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (username) DO NOTHING`,
          [bot.name, hashedPassword, bot.status, bot.bio, bot.color, 'system', true, true]
        );
        console.log(`✓ تم إنشاء البوت: ${bot.name}`);
      } catch (error) {
        console.error(`خطأ في إنشاء البوت ${bot.name}:`, error.message);
      }
    }

    console.log('\n✅ تم تطبيق migration البوتات بنجاح!');
  } catch (error) {
    console.error('❌ خطأ في تطبيق migration:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// تشغيل migration
applyBotsMigration();
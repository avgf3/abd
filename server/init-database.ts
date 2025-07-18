import { db, sqlite } from './db';

// إنشاء البيانات الأساسية لقاعدة البيانات
export async function initializeDatabase() {
  if (!sqlite) {
    console.log('⚠️ قاعدة البيانات غير متاحة - تخطي التهيئة');
    return;
  }

  try {
    console.log('🔄 بدء تهيئة قاعدة البيانات...');

    // التحقق من وجود المستخدم المالك
    const existingOwner = sqlite.get("SELECT * FROM users WHERE userType = 'owner'");
    
    if (!existingOwner) {
      console.log('👑 إنشاء المستخدم المالك...');
      
      // إنشاء المستخدم المالك
      sqlite.run(`
        INSERT INTO users (username, password, userType, gender, profileImage, status, usernameColor, userTheme)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'المالك',
        'owner123',
        'owner',
        'male',
        '/default_avatar.svg',
        'متاح - مالك الموقع',
        '#ffd700',
        'theme-golden-velvet'
      ]);
      
      console.log('✅ تم إنشاء المستخدم المالك');
    }

    // إنشاء مستخدم إدمن للاختبار
    const existingAdmin = sqlite.get("SELECT * FROM users WHERE userType = 'admin'");
    
    if (!existingAdmin) {
      console.log('🛡️ إنشاء مستخدم إدمن...');
      
      sqlite.run(`
        INSERT INTO users (username, password, userType, gender, profileImage, status, usernameColor, userTheme)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'الإدمن',
        'admin123',
        'admin',
        'male',
        '/default_avatar.svg',
        'متاح - مشرف عام',
        '#dc2626',
        'theme-fire-opal'
      ]);
      
      console.log('✅ تم إنشاء مستخدم الإدمن');
    }

    // إنشاء مستخدمين عاديين للاختبار
    const existingMembers = sqlite.all("SELECT * FROM users WHERE userType = 'member'");
    
    if (existingMembers.length === 0) {
      console.log('👥 إنشاء مستخدمين عاديين للاختبار...');
      
      const testUsers = [
        { username: 'أحمد', password: 'test123', gender: 'male', status: 'متاح للدردشة' },
        { username: 'فاطمة', password: 'test123', gender: 'female', status: 'أهلاً وسهلاً' },
        { username: 'محمد', password: 'test123', gender: 'male', status: 'مرحباً بكم' },
        { username: 'عائشة', password: 'test123', gender: 'female', status: 'سعيدة بوجودي هنا' }
      ];

      for (const user of testUsers) {
        sqlite.run(`
          INSERT INTO users (username, password, userType, gender, profileImage, status, usernameColor, userTheme)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          user.username,
          user.password,
          'member',
          user.gender,
          '/default_avatar.svg',
          user.status,
          '#3b82f6',
          'theme-new-gradient'
        ]);
      }
      
      console.log('✅ تم إنشاء المستخدمين العاديين');
    }

    // إنشاء رسائل ترحيب
    const existingMessages = sqlite.all('SELECT * FROM messages');
    
    if (existingMessages.length === 0) {
      console.log('💬 إنشاء رسائل ترحيب...');
      
      const ownerUser = sqlite.get("SELECT * FROM users WHERE userType = 'owner'");
      
      if (ownerUser) {
        sqlite.run(`
          INSERT INTO messages (senderId, content, messageType, isPrivate, timestamp)
          VALUES (?, ?, ?, ?, ?)
        `, [
          ownerUser.id,
          'مرحباً بكم في الدردشة العربية! 🎉',
          'text',
          0,
          new Date().toISOString()
        ]);

        sqlite.run(`
          INSERT INTO messages (senderId, content, messageType, isPrivate, timestamp)
          VALUES (?, ?, ?, ?, ?)
        `, [
          ownerUser.id,
          'جميع الأوامر تعمل بشكل صحيح الآن ✅',
          'text',
          0,
          new Date().toISOString()
        ]);
      }
      
      console.log('✅ تم إنشاء رسائل الترحيب');
    }

    console.log('🎉 تمت تهيئة قاعدة البيانات بنجاح!');
    
    // طباعة إحصائيات
    const userCount = sqlite.get('SELECT COUNT(*) as count FROM users');
    const messageCount = sqlite.get('SELECT COUNT(*) as count FROM messages');
    
    console.log(`📊 الإحصائيات:`);
    console.log(`   👥 المستخدمين: ${userCount.count}`);
    console.log(`   💬 الرسائل: ${messageCount.count}`);

  } catch (error) {
    console.error('❌ خطأ في تهيئة قاعدة البيانات:', error);
    throw error;
  }
}
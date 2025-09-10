// سكريبت لتحويل مستخدم إلى أدمن
import { initializeDatabase, db } from './server/database-adapter.js';
import { users } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function makeAdmin() {
  const username = process.argv[2]; // اسم المستخدم من command line
  
  if (!username) {
    console.log('❌ لازم تكتب اسم المستخدم');
    console.log('استخدام: node make-admin.js اسم_المستخدم');
    process.exit(1);
  }

  try {
    await initializeDatabase();
    
    if (!db) {
      console.log('❌ ما قدرت أتصل بقاعدة البيانات');
      process.exit(1);
    }

    // البحث عن المستخدم
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (!user) {
      console.log(`❌ المستخدم ${username} غير موجود`);
      process.exit(1);
    }

    // تحويل إلى أدمن
    await db
      .update(users)
      .set({ userType: 'admin' })
      .where(eq(users.username, username));

    console.log(`✅ تم تحويل ${username} إلى أدمن بنجاح!`);
    process.exit(0);

  } catch (error) {
    console.error('❌ خطأ:', error);
    process.exit(1);
  }
}

makeAdmin();
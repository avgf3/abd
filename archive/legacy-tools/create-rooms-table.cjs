const postgres = require('postgres');
require('dotenv').config();

console.log('🔄 إنشاء جدول الغرف...');

async function createRoomsTable() {
  try {
    const connectionString =
      process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/chat_db';
    const sql = postgres(connectionString, { max: 1 });

    console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');

    // إنشاء جدول الغرف
    console.log('🔄 إنشاء جدول الغرف...');
    await sql`
      CREATE TABLE IF NOT EXISTS "rooms" (
        "id" text PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "description" text,
        "icon" text,
        "created_by" integer NOT NULL,
        "is_default" boolean DEFAULT false,
        "is_active" boolean DEFAULT true,
        "is_broadcast" boolean DEFAULT false,
        "host_id" integer,
        "speakers" text DEFAULT '[]',
        "mic_queue" text DEFAULT '[]',
        "created_at" timestamp DEFAULT now()
      )
    `;

    // إنشاء جدول مستخدمي الغرف
    console.log('🔄 إنشاء جدول مستخدمي الغرف...');
    await sql`
      CREATE TABLE IF NOT EXISTS "room_users" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" integer NOT NULL,
        "room_id" text NOT NULL,
        "joined_at" timestamp DEFAULT now(),
        UNIQUE("user_id", "room_id")
      )
    `;

    // إضافة الـ foreign keys
    console.log('🔄 إضافة الـ foreign keys...');

    // التحقق من وجود الـ constraints قبل إضافتها
    const constraints = await sql`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'rooms' 
      AND constraint_type = 'FOREIGN KEY'
    `;

    const constraintNames = constraints.map((c) => c.constraint_name);

    if (!constraintNames.includes('rooms_created_by_users_id_fk')) {
      await sql`
        ALTER TABLE "rooms" ADD CONSTRAINT "rooms_created_by_users_id_fk" 
        FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") 
        ON DELETE no action ON UPDATE no action
      `;
      console.log('✅ تم إضافة foreign key للمنشئ');
    }

    if (!constraintNames.includes('rooms_host_id_users_id_fk')) {
      await sql`
        ALTER TABLE "rooms" ADD CONSTRAINT "rooms_host_id_users_id_fk" 
        FOREIGN KEY ("host_id") REFERENCES "public"."users"("id") 
        ON DELETE no action ON UPDATE no action
      `;
      console.log('✅ تم إضافة foreign key للمضيف');
    }

    // إضافة foreign keys لجدول room_users
    const roomUserConstraints = await sql`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'room_users' 
      AND constraint_type = 'FOREIGN KEY'
    `;

    const roomUserConstraintNames = roomUserConstraints.map((c) => c.constraint_name);

    if (!roomUserConstraintNames.includes('room_users_user_id_users_id_fk')) {
      await sql`
        ALTER TABLE "room_users" ADD CONSTRAINT "room_users_user_id_users_id_fk" 
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") 
        ON DELETE no action ON UPDATE no action
      `;
      console.log('✅ تم إضافة foreign key لمستخدم الغرفة');
    }

    if (!roomUserConstraintNames.includes('room_users_room_id_rooms_id_fk')) {
      await sql`
        ALTER TABLE "room_users" ADD CONSTRAINT "room_users_room_id_rooms_id_fk" 
        FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") 
        ON DELETE no action ON UPDATE no action
      `;
      console.log('✅ تم إضافة foreign key للغرفة');
    }

    // إدراج الغرف الافتراضية
    console.log('🔄 إدراج الغرف الافتراضية...');
    await sql`
      INSERT INTO rooms (id, name, description, icon, created_by, is_default, is_active, is_broadcast, host_id, speakers, mic_queue)
      VALUES 
        ('general', 'الدردشة العامة', 'الغرفة الرئيسية للدردشة', '', 1, true, true, false, null, '[]', '[]'),
        ('broadcast', 'غرفة البث المباشر', 'غرفة خاصة للبث المباشر مع نظام المايك', '', 1, false, true, true, 1, '[]', '[]'),
        ('music', 'أغاني وسهر', 'غرفة للموسيقى والترفيه', '', 1, false, true, false, null, '[]', '[]')
      ON CONFLICT (id) DO NOTHING
    `;

    console.log('✅ تم إنشاء الغرف الافتراضية');

    // التحقق من النتيجة
    const rooms = await sql`SELECT * FROM rooms ORDER BY id`;
    console.log('📋 الغرف الموجودة:');
    rooms.forEach((room) => {
      console.log(`  - ${room.name} (${room.id}) - Broadcast: ${room.is_broadcast ? 'نعم' : 'لا'}`);
    });

    await sql.end();
    console.log('✅ تم إغلاق الاتصال بنجاح');
  } catch (error) {
    console.error('❌ خطأ في إنشاء جدول الغرف:', error);
  }
}

createRoomsTable();

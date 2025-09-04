const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// قوائم لتوليد أسماء عشوائية
const firstNames = [
    'أحمد', 'محمد', 'علي', 'حسن', 'خالد', 'عمر', 'يوسف', 'إبراهيم', 'عبدالله', 'سالم',
    'فاطمة', 'عائشة', 'زينب', 'مريم', 'نور', 'هدى', 'سارة', 'ليلى', 'أمل', 'ريم',
    'ماجد', 'فيصل', 'سامي', 'نادر', 'رامي', 'زياد', 'طارق', 'وليد', 'جمال', 'كريم',
    'دانا', 'لينا', 'هناء', 'سمر', 'منى', 'رنا', 'غادة', 'نجوى', 'سلمى', 'روان'
];

const lastNames = [
    'العلي', 'الحسن', 'الأحمد', 'الخالد', 'المحمد', 'السالم', 'العمر', 'اليوسف', 'الإبراهيم', 'العبدالله',
    'الفهد', 'الشمري', 'العنزي', 'المطيري', 'الدوسري', 'القحطاني', 'الحربي', 'العتيبي', 'الغامدي', 'الزهراني'
];

const avatarStyles = ['pixel-art', 'lorelei', 'adventurer', 'avataaars', 'big-ears', 'bottts', 'micah'];

// إنشاء قاعدة البيانات
const dbPath = path.join(__dirname, 'bots.db');
const db = new sqlite3.Database(dbPath);

// قراءة ملف SQL Schema
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

// تنفيذ Schema
db.serialize(() => {
    // تنفيذ كل أمر SQL منفصل
    const statements = schema.split(';').filter(stmt => stmt.trim());
    
    statements.forEach(statement => {
        if (statement.trim()) {
            db.run(statement, (err) => {
                if (err && !err.message.includes('already exists')) {
                    console.error('خطأ في تنفيذ SQL:', err);
                }
            });
        }
    });

    // إضافة 300 عضو
    console.log('بدء إضافة 300 عضو...');
    
    const insertMember = db.prepare(`
        INSERT INTO members (username, display_name, avatar_url, status, current_room) 
        VALUES (?, ?, ?, ?, ?)
    `);

    const rooms = ['lobby', 'general', 'games', 'music', 'tech', 'sports', null];
    const statuses = ['online', 'offline', 'busy'];
    
    for (let i = 1; i <= 300; i++) {
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        const username = `user_${i}_${Date.now()}`;
        const displayName = `${firstName} ${lastName}`;
        const avatarStyle = avatarStyles[Math.floor(Math.random() * avatarStyles.length)];
        const avatarUrl = `https://api.dicebear.com/7.x/${avatarStyle}/svg?seed=${username}`;
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const currentRoom = Math.random() > 0.3 ? rooms[Math.floor(Math.random() * (rooms.length - 1))] : null;
        
        insertMember.run(username, displayName, avatarUrl, status, currentRoom);
        
        if (i % 50 === 0) {
            console.log(`تم إضافة ${i} عضو...`);
        }
    }
    
    insertMember.finalize();
    
    console.log('تم إضافة 300 عضو بنجاح!');
    
    // عرض إحصائيات
    db.get("SELECT COUNT(*) as count FROM members", (err, row) => {
        if (err) {
            console.error(err);
        } else {
            console.log(`إجمالي الأعضاء: ${row.count}`);
        }
    });
    
    db.all("SELECT current_room, COUNT(*) as count FROM members WHERE current_room IS NOT NULL GROUP BY current_room", (err, rows) => {
        if (err) {
            console.error(err);
        } else {
            console.log('\nتوزيع الأعضاء في الغرف:');
            rows.forEach(row => {
                console.log(`${row.current_room}: ${row.count} عضو`);
            });
        }
        
        db.close();
    });
});
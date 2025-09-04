const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database/bots.db');
const db = new sqlite3.Database(dbPath);

console.log('التحقق من قاعدة البيانات...\n');

// عدد الأعضاء الإجمالي
db.get("SELECT COUNT(*) as count FROM members", (err, row) => {
    if (err) {
        console.error('خطأ:', err);
        return;
    }
    console.log(`✅ إجمالي الأعضاء في قاعدة البيانات: ${row.count} عضو\n`);
    
    // عرض أول 10 أعضاء كعينة
    console.log('📋 عينة من الأعضاء المضافين:');
    console.log('=====================================');
    
    db.all("SELECT id, username, display_name, status, current_room FROM members LIMIT 10", (err, rows) => {
        if (err) {
            console.error('خطأ:', err);
            return;
        }
        
        rows.forEach(member => {
            console.log(`ID: ${member.id} | ${member.display_name} | ${member.status} | الغرفة: ${member.current_room || 'لا يوجد'}`);
        });
        
        console.log('\n📊 توزيع الأعضاء حسب الغرف:');
        console.log('=====================================');
        
        // إحصائيات الغرف
        db.all("SELECT current_room, COUNT(*) as count FROM members GROUP BY current_room", (err, rooms) => {
            if (err) {
                console.error('خطأ:', err);
                db.close();
                return;
            }
            
            rooms.forEach(room => {
                if (room.current_room) {
                    console.log(`${room.current_room}: ${room.count} عضو`);
                } else {
                    console.log(`بدون غرفة: ${room.count} عضو`);
                }
            });
            
            db.close();
        });
    });
});
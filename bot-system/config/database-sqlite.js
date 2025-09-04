const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// إنشاء أو فتح قاعدة البيانات
const db = new sqlite3.Database(path.join(__dirname, '..', 'bot_system.db'), (err) => {
    if (err) {
        console.error('❌ خطأ في فتح قاعدة البيانات:', err.message);
    } else {
        console.log('✅ تم الاتصال بقاعدة البيانات SQLite بنجاح');
    }
});

// تفعيل المفاتيح الأجنبية
db.run('PRAGMA foreign_keys = ON');

// وظيفة للتعامل مع الوعود
db.asyncRun = function(sql, params = []) {
    return new Promise((resolve, reject) => {
        this.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
};

db.asyncGet = function(sql, params = []) {
    return new Promise((resolve, reject) => {
        this.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

db.asyncAll = function(sql, params = []) {
    return new Promise((resolve, reject) => {
        this.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

module.exports = db;
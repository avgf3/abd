const mysql = require('mysql2/promise');
require('dotenv').config();

// إنشاء pool للاتصالات
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4'
});

// التحقق من الاتصال
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ خطأ في الاتصال بقاعدة البيانات:', error.message);
        return false;
    }
}

module.exports = { pool, testConnection };
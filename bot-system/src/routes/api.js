const express = require('express');
const { pool } = require('../../config/database');
const Bot = require('../models/Bot');

const router = express.Router();

// Middleware للتحقق من المصادقة
function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'غير مصرح' });
    }
    next();
}

// الحصول على جميع البوتات
router.get('/bots', requireAuth, async (req, res) => {
    try {
        const { status, room, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;
        
        let query = 'SELECT * FROM bots WHERE 1=1';
        const params = [];
        
        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }
        
        if (room) {
            query += ' AND current_room = ?';
            params.push(room);
        }
        
        query += ' ORDER BY id LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);
        
        const [bots] = await pool.execute(query, params);
        
        res.json({ success: true, bots });
    } catch (error) {
        console.error('خطأ في جلب البوتات:', error);
        res.status(500).json({ error: 'حدث خطأ في جلب البوتات' });
    }
});

// الحصول على بوت واحد
router.get('/bots/:botId', requireAuth, async (req, res) => {
    try {
        const bot = await Bot.getById(req.params.botId);
        
        if (!bot) {
            return res.status(404).json({ error: 'البوت غير موجود' });
        }
        
        res.json({ success: true, bot });
    } catch (error) {
        console.error('خطأ في جلب البوت:', error);
        res.status(500).json({ error: 'حدث خطأ في جلب البوت' });
    }
});

// تحديث بوت
router.put('/bots/:botId', requireAuth, async (req, res) => {
    try {
        const { name, avatar, behavior_type, activity_level, settings } = req.body;
        const botId = req.params.botId;
        
        const updates = [];
        const params = [];
        
        if (name) {
            updates.push('name = ?');
            params.push(name);
        }
        
        if (avatar) {
            updates.push('avatar = ?');
            params.push(avatar);
        }
        
        if (behavior_type) {
            updates.push('behavior_type = ?');
            params.push(behavior_type);
        }
        
        if (activity_level !== undefined) {
            updates.push('activity_level = ?');
            params.push(activity_level);
        }
        
        if (settings) {
            updates.push('settings = ?');
            params.push(JSON.stringify(settings));
        }
        
        if (updates.length === 0) {
            return res.status(400).json({ error: 'لا توجد بيانات للتحديث' });
        }
        
        params.push(botId);
        
        await pool.execute(
            `UPDATE bots SET ${updates.join(', ')} WHERE bot_id = ?`,
            params
        );
        
        res.json({ success: true, message: 'تم تحديث البوت بنجاح' });
    } catch (error) {
        console.error('خطأ في تحديث البوت:', error);
        res.status(500).json({ error: 'حدث خطأ في تحديث البوت' });
    }
});

// حذف بوت
router.delete('/bots/:botId', requireAuth, async (req, res) => {
    try {
        const bot = await Bot.getById(req.params.botId);
        
        if (!bot) {
            return res.status(404).json({ error: 'البوت غير موجود' });
        }
        
        await bot.delete();
        
        res.json({ success: true, message: 'تم حذف البوت بنجاح' });
    } catch (error) {
        console.error('خطأ في حذف البوت:', error);
        res.status(500).json({ error: 'حدث خطأ في حذف البوت' });
    }
});

// إحصائيات النظام
router.get('/stats', requireAuth, async (req, res) => {
    try {
        // إحصائيات البوتات
        const [[botStats]] = await pool.execute(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'online' THEN 1 ELSE 0 END) as online,
                SUM(CASE WHEN status = 'offline' THEN 1 ELSE 0 END) as offline,
                SUM(CASE WHEN status = 'busy' THEN 1 ELSE 0 END) as busy,
                AVG(activity_level) as avg_activity_level
            FROM bots
        `);
        
        // توزيع البوتات حسب الغرف
        const [roomDistribution] = await pool.execute(`
            SELECT current_room, COUNT(*) as count 
            FROM bots 
            GROUP BY current_room 
            ORDER BY count DESC
        `);
        
        // أكثر البوتات نشاطاً
        const [mostActive] = await pool.execute(`
            SELECT b.bot_id, b.name, COUNT(ba.id) as activity_count
            FROM bots b
            LEFT JOIN bot_activities ba ON b.bot_id = ba.bot_id
            WHERE ba.timestamp > DATE_SUB(NOW(), INTERVAL 24 HOUR)
            GROUP BY b.bot_id, b.name
            ORDER BY activity_count DESC
            LIMIT 10
        `);
        
        // نشاط الساعة الأخيرة
        const [[hourlyActivity]] = await pool.execute(`
            SELECT COUNT(*) as count
            FROM bot_activities
            WHERE timestamp > DATE_SUB(NOW(), INTERVAL 1 HOUR)
        `);
        
        res.json({
            success: true,
            stats: {
                bots: botStats,
                roomDistribution,
                mostActive,
                hourlyActivity: hourlyActivity.count
            }
        });
    } catch (error) {
        console.error('خطأ في جلب الإحصائيات:', error);
        res.status(500).json({ error: 'حدث خطأ في جلب الإحصائيات' });
    }
});

// الحصول على الرسائل
router.get('/messages', requireAuth, async (req, res) => {
    try {
        const { category } = req.query;
        
        let query = 'SELECT * FROM bot_messages';
        const params = [];
        
        if (category) {
            query += ' WHERE category = ?';
            params.push(category);
        }
        
        query += ' ORDER BY usage_count DESC';
        
        const [messages] = await pool.execute(query, params);
        
        res.json({ success: true, messages });
    } catch (error) {
        console.error('خطأ في جلب الرسائل:', error);
        res.status(500).json({ error: 'حدث خطأ في جلب الرسائل' });
    }
});

// إضافة رسالة جديدة
router.post('/messages', requireAuth, async (req, res) => {
    try {
        const { category, message, language = 'ar' } = req.body;
        
        if (!category || !message) {
            return res.status(400).json({ error: 'الفئة والرسالة مطلوبة' });
        }
        
        await pool.execute(
            'INSERT INTO bot_messages (category, message, language) VALUES (?, ?, ?)',
            [category, message, language]
        );
        
        res.json({ success: true, message: 'تم إضافة الرسالة بنجاح' });
    } catch (error) {
        console.error('خطأ في إضافة الرسالة:', error);
        res.status(500).json({ error: 'حدث خطأ في إضافة الرسالة' });
    }
});

// حذف رسالة
router.delete('/messages/:id', requireAuth, async (req, res) => {
    try {
        await pool.execute('DELETE FROM bot_messages WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'تم حذف الرسالة بنجاح' });
    } catch (error) {
        console.error('خطأ في حذف الرسالة:', error);
        res.status(500).json({ error: 'حدث خطأ في حذف الرسالة' });
    }
});

// تحديث إعدادات النظام
router.put('/settings', requireAuth, async (req, res) => {
    try {
        const settings = req.body;
        
        for (const [key, value] of Object.entries(settings)) {
            await pool.execute(
                `INSERT INTO system_settings (setting_key, setting_value) 
                 VALUES (?, ?) 
                 ON DUPLICATE KEY UPDATE setting_value = ?`,
                [key, value, value]
            );
        }
        
        res.json({ success: true, message: 'تم تحديث الإعدادات بنجاح' });
    } catch (error) {
        console.error('خطأ في تحديث الإعدادات:', error);
        res.status(500).json({ error: 'حدث خطأ في تحديث الإعدادات' });
    }
});

module.exports = router;
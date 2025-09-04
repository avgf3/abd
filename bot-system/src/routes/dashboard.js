const express = require('express');
const { pool } = require('../../config/database');
const Bot = require('../models/Bot');

const router = express.Router();

// Middleware للتحقق من المصادقة
function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.redirect('/auth/login');
    }
    next();
}

// لوحة التحكم الرئيسية
router.get('/', requireAuth, async (req, res) => {
    try {
        // الحصول على إحصائيات عامة
        const [botStats] = await pool.execute(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'online' THEN 1 ELSE 0 END) as online,
                SUM(CASE WHEN status = 'offline' THEN 1 ELSE 0 END) as offline,
                SUM(CASE WHEN status = 'busy' THEN 1 ELSE 0 END) as busy
            FROM bots
        `);

        const [roomStats] = await pool.execute(`
            SELECT room_name, current_users FROM rooms ORDER BY current_users DESC
        `);

        const [recentActivities] = await pool.execute(`
            SELECT ba.*, b.name as bot_name
            FROM bot_activities ba
            JOIN bots b ON ba.bot_id = b.bot_id
            ORDER BY ba.timestamp DESC
            LIMIT 10
        `);

        res.render('dashboard', {
            user: req.session,
            botStats: botStats[0],
            roomStats,
            recentActivities,
            token: req.session.token
        });
    } catch (error) {
        console.error('خطأ في تحميل لوحة التحكم:', error);
        res.status(500).send('حدث خطأ في تحميل لوحة التحكم');
    }
});

// صفحة إدارة البوتات
router.get('/bots', requireAuth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 50;
        const offset = (page - 1) * limit;

        // الحصول على البوتات مع التصفح
        const [bots] = await pool.execute(`
            SELECT * FROM bots 
            ORDER BY id 
            LIMIT ? OFFSET ?
        `, [limit, offset]);

        // الحصول على العدد الكلي
        const [[{ total }]] = await pool.execute('SELECT COUNT(*) as total FROM bots');
        const totalPages = Math.ceil(total / limit);

        res.render('bots', {
            user: req.session,
            bots,
            currentPage: page,
            totalPages,
            total
        });
    } catch (error) {
        console.error('خطأ في تحميل صفحة البوتات:', error);
        res.status(500).send('حدث خطأ في تحميل صفحة البوتات');
    }
});

// صفحة الغرف
router.get('/rooms', requireAuth, async (req, res) => {
    try {
        const [rooms] = await pool.execute(`
            SELECT r.*, 
                (SELECT COUNT(*) FROM bots WHERE current_room = r.room_name AND status = 'online') as active_bots
            FROM rooms r
            ORDER BY r.current_users DESC
        `);

        res.render('rooms', {
            user: req.session,
            rooms
        });
    } catch (error) {
        console.error('خطأ في تحميل صفحة الغرف:', error);
        res.status(500).send('حدث خطأ في تحميل صفحة الغرف');
    }
});

// صفحة الإعدادات
router.get('/settings', requireAuth, async (req, res) => {
    try {
        const [settings] = await pool.execute('SELECT * FROM system_settings');
        
        const settingsMap = {};
        settings.forEach(setting => {
            settingsMap[setting.setting_key] = setting.setting_value;
        });

        res.render('settings', {
            user: req.session,
            settings: settingsMap
        });
    } catch (error) {
        console.error('خطأ في تحميل صفحة الإعدادات:', error);
        res.status(500).send('حدث خطأ في تحميل صفحة الإعدادات');
    }
});

// صفحة السجلات
router.get('/logs', requireAuth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 100;
        const offset = (page - 1) * limit;

        const [activities] = await pool.execute(`
            SELECT ba.*, b.name as bot_name, b.avatar
            FROM bot_activities ba
            JOIN bots b ON ba.bot_id = b.bot_id
            ORDER BY ba.timestamp DESC
            LIMIT ? OFFSET ?
        `, [limit, offset]);

        const [[{ total }]] = await pool.execute('SELECT COUNT(*) as total FROM bot_activities');
        const totalPages = Math.ceil(total / limit);

        res.render('logs', {
            user: req.session,
            activities,
            currentPage: page,
            totalPages
        });
    } catch (error) {
        console.error('خطأ في تحميل صفحة السجلات:', error);
        res.status(500).send('حدث خطأ في تحميل صفحة السجلات');
    }
});

// إنشاء بوتات جديدة
router.post('/bots/create', requireAuth, async (req, res) => {
    try {
        const { count } = req.body;
        const botsToCreate = Math.min(parseInt(count) || 1, 50); // حد أقصى 50 في المرة الواحدة

        const bots = [];
        for (let i = 0; i < botsToCreate; i++) {
            const bot = await Bot.create();
            bots.push(bot);
        }

        res.json({ 
            success: true, 
            message: `تم إنشاء ${bots.length} بوت بنجاح`,
            bots 
        });
    } catch (error) {
        console.error('خطأ في إنشاء البوتات:', error);
        res.status(500).json({ error: 'حدث خطأ في إنشاء البوتات' });
    }
});

module.exports = router;
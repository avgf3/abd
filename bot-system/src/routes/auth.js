const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../../config/database');

const router = express.Router();

// صفحة تسجيل الدخول
router.get('/login', (req, res) => {
    if (req.session.userId) {
        return res.redirect('/dashboard');
    }
    res.render('login', { error: null });
});

// معالجة تسجيل الدخول
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // البحث عن المستخدم
        const [users] = await pool.execute(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            return res.render('login', { error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
        }

        const user = users[0];

        // التحقق من كلمة المرور
        const isValid = await bcrypt.compare(password, user.password);
        
        if (!isValid) {
            return res.render('login', { error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
        }

        // تحديث آخر تسجيل دخول
        await pool.execute(
            'UPDATE users SET last_login = NOW() WHERE id = ?',
            [user.id]
        );

        // إنشاء الجلسة
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.role = user.role;

        // إنشاء JWT token
        const token = jwt.sign(
            { userId: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        req.session.token = token;

        res.redirect('/dashboard');
    } catch (error) {
        console.error('خطأ في تسجيل الدخول:', error);
        res.render('login', { error: 'حدث خطأ في النظام' });
    }
});

// تسجيل الخروج
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('خطأ في تسجيل الخروج:', err);
        }
        res.redirect('/auth/login');
    });
});

// تغيير كلمة المرور
router.post('/change-password', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'غير مصرح' });
    }

    const { currentPassword, newPassword } = req.body;

    try {
        // الحصول على المستخدم الحالي
        const [users] = await pool.execute(
            'SELECT * FROM users WHERE id = ?',
            [req.session.userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'المستخدم غير موجود' });
        }

        const user = users[0];

        // التحقق من كلمة المرور الحالية
        const isValid = await bcrypt.compare(currentPassword, user.password);
        
        if (!isValid) {
            return res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة' });
        }

        // تشفير كلمة المرور الجديدة
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // تحديث كلمة المرور
        await pool.execute(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, req.session.userId]
        );

        res.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح' });
    } catch (error) {
        console.error('خطأ في تغيير كلمة المرور:', error);
        res.status(500).json({ error: 'حدث خطأ في النظام' });
    }
});

module.exports = router;
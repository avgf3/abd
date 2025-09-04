const express = require('express');
const session = require('express-session');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const { pool, testConnection } = require('./config/database');
const authRoutes = require('./src/routes/auth');
const dashboardRoutes = require('./src/routes/dashboard');
const apiRoutes = require('./src/routes/api');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// إعداد EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));

// إعداد الجلسات
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // يجب تغييرها إلى true في الإنتاج مع HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 ساعة
    }
}));

// Socket.IO للتواصل الفوري
io.on('connection', (socket) => {
    console.log('مستخدم جديد متصل:', socket.id);

    // التحقق من المصادقة
    socket.on('authenticate', async (token) => {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.userId;
            socket.join('owners'); // غرفة خاصة بالمالكين
            socket.emit('authenticated', true);
        } catch (error) {
            socket.emit('authenticated', false);
        }
    });

    // استقبال أحداث البوتات
    socket.on('bot:typing', (data) => {
        io.to(`room:${data.room}`).emit('user:typing', data);
    });

    socket.on('bot:message', (data) => {
        io.to(`room:${data.room}`).emit('new:message', data);
    });

    socket.on('bot:room_change', (data) => {
        socket.leave(`room:${data.oldRoom}`);
        socket.join(`room:${data.newRoom}`);
        
        io.to(`room:${data.oldRoom}`).emit('user:left', { botId: data.botId });
        io.to(`room:${data.newRoom}`).emit('user:joined', { botId: data.botId });
    });

    socket.on('bot:reaction', (data) => {
        io.to(`room:${data.room}`).emit('new:reaction', data);
    });

    // أوامر التحكم من لوحة التحكم
    socket.on('control:command', async (data) => {
        if (!socket.userId) {
            socket.emit('error', 'غير مصرح');
            return;
        }

        // إرسال الأمر إلى مدير البوتات
        io.emit('bot:command', data);
        
        // تسجيل الأمر
        console.log(`أمر تحكم من المستخدم ${socket.userId}:`, data);
    });

    // الانضمام إلى غرفة
    socket.on('join:room', (roomName) => {
        socket.join(`room:${roomName}`);
    });

    socket.on('disconnect', () => {
        console.log('مستخدم غادر:', socket.id);
    });
});

// Routes
app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/api', apiRoutes);

// الصفحة الرئيسية
app.get('/', (req, res) => {
    if (req.session.userId) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/auth/login');
    }
});

// معالجة الأخطاء
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('حدث خطأ في الخادم!');
});

// بدء الخادم
async function startServer() {
    // التحقق من اتصال قاعدة البيانات
    const dbConnected = await testConnection();
    if (!dbConnected) {
        console.error('فشل الاتصال بقاعدة البيانات. تأكد من تشغيل MySQL وإعدادات الاتصال.');
        process.exit(1);
    }

    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
        console.log(`🚀 الخادم يعمل على المنفذ ${PORT}`);
        console.log(`📊 لوحة التحكم: http://localhost:${PORT}/dashboard`);
    });
}

startServer();

// تصدير io للاستخدام في ملفات أخرى
module.exports = { io };
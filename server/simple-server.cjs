const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "https://abd-ylo2.onrender.com",
    methods: ["GET", "POST"]
  }
});

// Database setup
const databaseUrl = process.env.DATABASE_URL || 'sqlite:./data/chatapp.db';
let dbPath = './data/chatapp.db';
if (databaseUrl.startsWith('sqlite:')) {
  dbPath = databaseUrl.replace('sqlite:', '');
}

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Initialize database tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT,
    user_type TEXT NOT NULL DEFAULT 'guest',
    role TEXT NOT NULL DEFAULT 'guest',
    profile_image TEXT DEFAULT '/default_avatar.svg',
    profile_banner TEXT,
    profile_background_color TEXT DEFAULT '#3c0d0d',
    status TEXT,
    gender TEXT DEFAULT 'male',
    age INTEGER,
    country TEXT,
    relation TEXT,
    bio TEXT,
    is_online INTEGER DEFAULT 0,
    is_hidden INTEGER DEFAULT 0,
    last_seen TEXT,
    join_date TEXT,
    created_at TEXT,
    is_muted INTEGER DEFAULT 0,
    mute_expiry TEXT,
    is_banned INTEGER DEFAULT 0,
    ban_expiry TEXT,
    is_blocked INTEGER DEFAULT 0,
    ip_address TEXT,
    device_id TEXT,
    ignored_users TEXT DEFAULT '[]',
    username_color TEXT DEFAULT '#FFFFFF',
    user_theme TEXT DEFAULT 'default',
    profile_effect TEXT DEFAULT 'none',
    points INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    total_points INTEGER DEFAULT 0,
    level_progress INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER,
    receiver_id INTEGER,
    room_id TEXT DEFAULT 'general',
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text',
    is_private INTEGER DEFAULT 0,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log('✅ قاعدة البيانات جاهزة');

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || "https://abd-ylo2.onrender.com",
  credentials: true
}));
app.use(express.json());

// Helper functions
function convertRowToUser(user) {
  if (!user) return null;
  
  return {
    id: user.id,
    username: user.username,
    password: user.password,
    userType: user.user_type,
    role: user.role,
    profileImage: user.profile_image,
    profileBanner: user.profile_banner,
    profileBackgroundColor: user.profile_background_color,
    status: user.status,
    gender: user.gender,
    age: user.age,
    country: user.country,
    relation: user.relation,
    bio: user.bio,
    isOnline: Boolean(user.is_online),
    isHidden: Boolean(user.is_hidden),
    lastSeen: user.last_seen ? new Date(user.last_seen) : null,
    joinDate: user.join_date ? new Date(user.join_date) : new Date(),
    createdAt: user.created_at ? new Date(user.created_at) : new Date(),
    isMuted: Boolean(user.is_muted),
    muteExpiry: user.mute_expiry ? new Date(user.mute_expiry) : null,
    isBanned: Boolean(user.is_banned),
    banExpiry: user.ban_expiry ? new Date(user.ban_expiry) : null,
    isBlocked: Boolean(user.is_blocked),
    ipAddress: user.ip_address,
    deviceId: user.device_id,
    ignoredUsers: JSON.parse(user.ignored_users || '[]'),
    usernameColor: user.username_color || '#FFFFFF',
    userTheme: user.user_theme || 'default',
    profileEffect: user.profile_effect || 'none',
    points: user.points || 0,
    level: user.level || 1,
    totalPoints: user.total_points || 0,
    levelProgress: user.level_progress || 0
  };
}

// Routes
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'الخادم يعمل بنجاح!', 
    status: 'fixed',
    timestamp: new Date().toISOString(),
    database: 'SQLite connected',
    version: '1.0.0-fixed'
  });
});

app.get('/api/status', (req, res) => {
  try {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const messageCount = db.prepare('SELECT COUNT(*) as count FROM messages').get().count;
    
    res.json({
      status: 'healthy',
      database: 'connected',
      users: userCount,
      messages: messageCount,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في الخادم', details: error.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, userType = 'member' } = req.body;
    
    if (!username) {
      return res.status(400).json({ error: 'اسم المستخدم مطلوب' });
    }
    
    // Check if user exists
    const existingUser = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (existingUser) {
      return res.status(400).json({ error: 'اسم المستخدم موجود بالفعل' });
    }
    
    // Hash password if provided
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 12);
    }

    // Insert new user
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO users (
        username, password, user_type, role, join_date, created_at, last_seen
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      username,
      hashedPassword,
      userType,
      userType,
      now,
      now,
      now
    );

    const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    const convertedUser = convertRowToUser(newUser);
    
    res.json({ 
      success: true, 
      user: { 
        id: convertedUser.id, 
        username: convertedUser.username,
        userType: convertedUser.userType
      } 
    });
  } catch (error) {
    console.error('خطأ في التسجيل:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'اسم المستخدم وكلمة المرور مطلوبان' });
    }
    
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user || !user.password) {
      return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    }
    
    // Update online status
    db.prepare('UPDATE users SET is_online = 1, last_seen = ? WHERE id = ?')
      .run(new Date().toISOString(), user.id);
    
    const convertedUser = convertRowToUser(user);
    
    res.json({ 
      success: true, 
      user: { 
        id: convertedUser.id, 
        username: convertedUser.username, 
        userType: convertedUser.userType,
        role: convertedUser.role 
      } 
    });
  } catch (error) {
    console.error('خطأ في تسجيل الدخول:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

app.get('/api/users', (req, res) => {
  try {
    const users = db.prepare('SELECT * FROM users').all();
    const safeUsers = users.map(user => {
      const converted = convertRowToUser(user);
      return {
        id: converted.id,
        username: converted.username,
        userType: converted.userType,
        role: converted.role,
        isOnline: converted.isOnline,
        profileImage: converted.profileImage
      };
    });
    res.json(safeUsers);
  } catch (error) {
    console.error('خطأ في جلب المستخدمين:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// Socket.IO
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('مستخدم متصل:', socket.id);
  
  socket.on('join', (userData) => {
    socket.userId = userData.userId;
    socket.username = userData.username;
    connectedUsers.set(socket.id, userData);
    console.log(`${userData.username} انضم إلى الدردشة`);
  });
  
  socket.on('disconnect', async () => {
    if (socket.userId) {
      try {
        db.prepare('UPDATE users SET is_online = 0, last_seen = ? WHERE id = ?')
          .run(new Date().toISOString(), socket.userId);
        console.log(`المستخدم ${socket.username} غادر الدردشة`);
      } catch (error) {
        console.error('خطأ في تحديث حالة المستخدم:', error);
      }
    }
    connectedUsers.delete(socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 الخادم يعمل على المنفذ ${PORT}`);
  console.log(`📊 حالة قاعدة البيانات: متصلة`);
  console.log(`🔗 رابط الاختبار: http://localhost:${PORT}/api/test`);
  console.log(`📈 رابط الحالة: http://localhost:${PORT}/api/status`);
});

// Handle cleanup
process.on('SIGINT', () => {
  console.log('🛑 إيقاف الخادم...');
  db.close();
  process.exit(0);
});

module.exports = app;
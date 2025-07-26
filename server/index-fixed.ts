import express from 'express';
import cors from 'cors';
import { fixedStorage } from './storage-fixed.js';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Extend Socket interface to include custom properties
declare module 'socket.io' {
  interface Socket {
    userId?: number;
    username?: string;
  }
}

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  credentials: true
}));
app.use(express.json());

// Test route
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'الخادم يعمل بنجاح!', 
    status: 'fixed',
    timestamp: new Date().toISOString() 
  });
});

// User routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, userType = 'member' } = req.body;
    
    if (!username) {
      return res.status(400).json({ error: 'اسم المستخدم مطلوب' });
    }
    
    const existingUser = await fixedStorage.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ error: 'اسم المستخدم موجود بالفعل' });
    }
    
    const newUser = await fixedStorage.createUser({
      username,
      password,
      userType,
      role: userType
    });
    
    res.json({ success: true, user: { id: newUser.id, username: newUser.username } });
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
    
    const user = await fixedStorage.verifyUserCredentials(username, password);
    if (!user) {
      return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    }
    
    // Update online status
    await fixedStorage.setUserOnlineStatus(user.id, true);
    
    res.json({ 
      success: true, 
      user: { 
        id: user.id, 
        username: user.username, 
        userType: user.userType,
        role: user.role 
      } 
    });
  } catch (error) {
    console.error('خطأ في تسجيل الدخول:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await fixedStorage.getAllUsers();
    const safeUsers = users.map(user => ({
      id: user.id,
      username: user.username,
      userType: user.userType,
      role: user.role,
      isOnline: user.isOnline,
      profileImage: user.profileImage
    }));
    res.json(safeUsers);
  } catch (error) {
    console.error('خطأ في جلب المستخدمين:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// Socket.IO
io.on('connection', (socket) => {
  socket.on('join', (userData) => {
    socket.userId = userData.userId;
    socket.username = userData.username;
    });
  
  socket.on('disconnect', async () => {
    if (socket.userId) {
      await fixedStorage.setUserOnlineStatus(socket.userId, false);
      }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  });

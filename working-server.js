import express from 'express';
import { createServer } from 'http';
import { Server as IOServer } from 'socket.io';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new IOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// In-memory storage
let users = new Map();
let onlineUsers = new Map();
let messages = [];
let friendRequests = [];
let wallPosts = [];
let userIdCounter = 1;

// Create upload directories
const createUploadDirs = () => {
  const dirs = [
    './client/public/uploads/profiles',
    './client/public/uploads/wall'
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });
};

createUploadDirs();

// Multer configuration for file uploads
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './client/public/uploads/profiles');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `profile-${uniqueSuffix}${ext}`);
  }
});

const wallStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './client/public/uploads/wall');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `wall-${uniqueSuffix}${ext}`);
  }
});

const profileUpload = multer({
  storage: profileStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('يرجى رفع ملف صورة صحيح'));
    }
  }
});

const wallUpload = multer({
  storage: wallStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('يرجى رفع ملف صورة صحيح'));
    }
  }
});

// Middleware
app.use(express.json());
app.use(express.static('dist/public'));
app.use('/uploads', express.static('./client/public/uploads'));

// Helper functions
const createUser = (userData) => {
  const user = {
    id: userIdCounter++,
    username: userData.username,
    userType: userData.userType || 'guest',
    gender: userData.gender || 'male',
    profileImage: userData.profileImage || '/default_avatar.svg',
    isOnline: false,
    joinDate: new Date(),
    ...userData
  };
  users.set(user.id, user);
  return user;
};

const getUser = (id) => users.get(parseInt(id));
const getUserByUsername = (username) => {
  for (let user of users.values()) {
    if (user.username === username) return user;
  }
  return null;
};

// Auth endpoints
app.post('/api/auth/guest', (req, res) => {
  try {
    const { username, gender } = req.body;
    
    if (!username?.trim()) {
      return res.status(400).json({ error: "اسم المستخدم مطلوب" });
    }

    const existing = getUserByUsername(username);
    if (existing) {
      return res.status(400).json({ error: "الاسم مستخدم بالفعل" });
    }

    const user = createUser({
      username,
      userType: "guest",
      gender: gender || "male"
    });

    res.json({ user });
  } catch (error) {
    console.error("Guest login error:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

app.post('/api/auth/member', (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username?.trim() || !password?.trim()) {
      return res.status(400).json({ error: "اسم المستخدم وكلمة المرور مطلوبان" });
    }

    const user = getUserByUsername(username.trim());
    if (!user) {
      return res.status(401).json({ error: "اسم المستخدم غير موجود" });
    }

    // For demo purposes, accept any password for existing users
    if (user.userType === 'guest') {
      return res.status(401).json({ error: "هذا المستخدم ضيف وليس عضو" });
    }

    user.isOnline = true;
    res.json({ user });
  } catch (error) {
    console.error('Member authentication error:', error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// User endpoints
app.get('/api/users/online', (req, res) => {
  const onlineUsersList = Array.from(onlineUsers.values());
  res.json({ users: onlineUsersList });
});

// Friend requests endpoints
app.get('/api/friend-requests/incoming/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);
  const incoming = friendRequests.filter(req => req.receiverId === userId && req.status === 'pending');
  res.json({ requests: incoming });
});

app.get('/api/friend-requests/outgoing/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);
  const outgoing = friendRequests.filter(req => req.senderId === userId && req.status === 'pending');
  res.json({ requests: outgoing });
});

app.post('/api/friend-requests', (req, res) => {
  try {
    const { senderId, receiverId } = req.body;
    
    if (!senderId || !receiverId) {
      return res.status(400).json({ error: "معلومات المرسل والمستقبل مطلوبة" });
    }

    if (senderId === receiverId) {
      return res.status(400).json({ error: "لا يمكنك إرسال طلب صداقة لنفسك" });
    }

    const existing = friendRequests.find(req => 
      req.senderId === senderId && req.receiverId === receiverId && req.status === 'pending'
    );
    
    if (existing) {
      return res.status(400).json({ error: "طلب الصداقة موجود بالفعل" });
    }

    const request = {
      id: Date.now(),
      senderId,
      receiverId,
      status: 'pending',
      createdAt: new Date()
    };
    
    friendRequests.push(request);
    res.json({ message: "تم إرسال طلب الصداقة", request });
  } catch (error) {
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// Wall posts endpoints
app.get('/api/wall/posts/:type', (req, res) => {
  try {
    const { type } = req.params;
    const filteredPosts = wallPosts.filter(post => post.type === type);
    res.json({ posts: filteredPosts });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

app.post('/api/wall/posts', wallUpload.single('image'), (req, res) => {
  try {
    const { content, type, userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'معرف المستخدم مطلوب' });
    }

    const user = getUser(parseInt(userId));
    if (!user) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }

    if (!content?.trim() && !req.file) {
      return res.status(400).json({ error: 'يجب إضافة محتوى أو صورة' });
    }

    const post = {
      id: Date.now(),
      userId: parseInt(userId),
      username: user.username,
      userRole: user.userType,
      content: content || '',
      imageUrl: req.file ? `/uploads/wall/${req.file.filename}` : null,
      type: type || 'public',
      timestamp: new Date(),
      userProfileImage: user.profileImage,
      usernameColor: user.usernameColor || '#FFFFFF',
      reactions: [],
      totalLikes: 0,
      totalDislikes: 0,
      totalHearts: 0
    };

    wallPosts.unshift(post);
    res.json({ message: 'تم نشر المنشور بنجاح', post });
  } catch (error) {
    console.error('خطأ في نشر المنشور:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// Profile image upload
app.post('/api/upload/profile-image', profileUpload.single('profileImage'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'لم يتم رفع أي ملف',
        details: 'تأكد من إرسال الملف مع اسم الحقل profileImage'
      });
    }

    const userId = req.body.userId;
    if (!userId) {
      return res.status(400).json({ error: 'معرف المستخدم مطلوب' });
    }

    const user = getUser(parseInt(userId));
    if (!user) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }

    const imageUrl = `/uploads/profiles/${req.file.filename}`;
    user.profileImage = imageUrl;

    res.json({
      success: true,
      message: 'تم رفع الصورة بنجاح',
      imageUrl: imageUrl,
      user: user
    });

  } catch (error) {
    console.error('Error uploading profile image:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'خطأ في رفع الصورة' 
    });
  }
});

// WebSocket handling
io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);

  socket.on('auth', (data) => {
    if (data && data.userId && data.username) {
      socket.userId = data.userId;
      socket.username = data.username;
      
      const user = getUser(data.userId);
      if (user) {
        user.isOnline = true;
        onlineUsers.set(data.userId, user);
        
        socket.broadcast.emit('userJoined', { user });
        socket.emit('authSuccess', { user });
      }
    }
  });

  socket.on('sendMessage', (data) => {
    if (!socket.userId) return;
    
    const message = {
      id: Date.now(),
      senderId: socket.userId,
      content: data.content,
      messageType: data.messageType || 'text',
      timestamp: new Date(),
      sender: getUser(socket.userId)
    };
    
    messages.push(message);
    io.emit('message', { type: 'newMessage', message });
  });

  socket.on('disconnect', () => {
    if (socket.userId) {
      const user = getUser(socket.userId);
      if (user) {
        user.isOnline = false;
        onlineUsers.delete(socket.userId);
        socket.broadcast.emit('userLeft', { user });
      }
    }
    console.log('👤 User disconnected:', socket.id);
  });
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/public/index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Server error', message: err.message });
});

// Start server
server.listen(PORT, () => {
  console.log(`✅ العربي Chat Server running on https://abd-gmva.onrender.com`);
  console.log('📡 Features enabled:');
  console.log('   ✓ User authentication (guest/member)');
  console.log('   ✓ Profile image upload');
  console.log('   ✓ Friend requests');
  console.log('   ✓ Wall posts with images');
  console.log('   ✓ Real-time chat');
  console.log('   ✓ Online users tracking');
  console.log('🌐 Access the website at: https://abd-gmva.onrender.com');
}).on('error', (err) => {
  console.error('❌ Server failed to start:', err.message);
  process.exit(1);
});
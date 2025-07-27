import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import path from 'path';
import { storage } from './storage';
import { checkDatabaseHealth } from './database-adapter';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        username: string;
      };
    }
  }
}

// Extend Socket interface
interface CustomSocket extends Socket {
  userId?: number;
  username?: string;
}

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Authentication middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Health check endpoint
app.get('/health', async (_, res) => {
  try {
    const dbHealth = await checkDatabaseHealth();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: {
        connected: dbHealth,
        url: process.env.DATABASE_URL ? 'configured' : 'not configured'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Authentication routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Check if user already exists
    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await storage.createUser({
      username,
      password: hashedPassword,
      userType: 'member',
      role: 'member'
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser.id, username: newUser.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        userType: newUser.userType
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Verify credentials
    const user = await storage.verifyUserCredentials(username, password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        userType: user.userType
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Guest login endpoint
app.post('/api/auth/guest', async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'اسم المستخدم مطلوب' });
    }

    // Check if username already exists
    const existingUser = await storage.getUserByUsername(username.trim());
    if (existingUser) {
      return res.status(400).json({ error: 'الاسم مستخدم بالفعل' });
    }

    // Create guest user
    const guestUser = await storage.createUser({
      username: username.trim(),
      userType: 'guest',
      isOnline: true
    });

    res.json({ user: guestUser });
  } catch (error) {
    console.error('Guest login error:', error);
    res.status(500).json({ error: 'فشل في تسجيل الدخول كضيف' });
  }
});

// Member login endpoint  
app.post('/api/auth/member', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'اسم المستخدم وكلمة المرور مطلوبان' });
    }

    // Verify credentials
    const user = await storage.verifyUserCredentials(username.trim(), password.trim());
    if (!user) {
      return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    }

    // Check if user is actually a member (not guest)
    if (user.userType === 'guest') {
      return res.status(401).json({ error: 'هذا المستخدم ضيف وليس عضو' });
    }

    // Update online status
    await storage.setUserOnlineStatus(user.id, true);

    res.json({ user });
  } catch (error) {
    console.error('Member login error:', error);
    res.status(500).json({ error: 'فشل في تسجيل الدخول' });
  }
});

// User routes
app.get('/api/users', authenticateToken, async (_, res) => {
  try {
    const users = await storage.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

app.get('/api/users/online', authenticateToken, async (_, res) => {
  try {
    const onlineUsers = await storage.getOnlineUsers();
    res.json(onlineUsers);
  } catch (error) {
    console.error('Error getting online users:', error);
    res.status(500).json({ error: 'Failed to get online users' });
  }
});

app.get('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

app.put('/api/users/:id/status', authenticateToken, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { isOnline } = req.body;
    
    await storage.setUserOnlineStatus(userId, isOnline);
    res.json({ message: 'Status updated successfully' });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Message routes
app.post('/api/messages', authenticateToken, async (req, res) => {
  try {
    const senderId = req.user!.userId;
    const { receiverId, content, messageType = 'text', isPrivate = false, roomId = 'general' } = req.body;
    
    const message = await storage.createMessage({
      senderId,
      receiverId,
      content,
      messageType,
      isPrivate,
      roomId
    });
    
    res.status(201).json(message);
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
});

app.get('/api/messages/public', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const messages = await storage.getPublicMessages(limit);
    res.json(messages);
  } catch (error) {
    console.error('Error getting public messages:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

app.get('/api/messages/private/:userId', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user!.userId;
    const otherUserId = parseInt(req.params.userId);
    const limit = parseInt(req.query.limit as string) || 50;
    
    const messages = await storage.getPrivateMessages(currentUserId, otherUserId, limit);
    res.json(messages);
  } catch (error) {
    console.error('Error getting private messages:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// Friend routes
app.post('/api/friends', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { friendId } = req.body;
    
    const friendship = await storage.addFriend(userId, friendId);
    res.status(201).json(friendship);
  } catch (error) {
    console.error('Error adding friend:', error);
    res.status(500).json({ error: 'Failed to add friend' });
  }
});

app.get('/api/friends', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const friends = await storage.getFriends(userId);
    res.json(friends);
  } catch (error) {
    console.error('Error getting friends:', error);
    res.status(500).json({ error: 'Failed to get friends' });
  }
});

app.delete('/api/friends/:friendId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const friendId = parseInt(req.params.friendId);
    
    const success = await storage.removeFriend(userId, friendId);
    if (success) {
      res.json({ message: 'Friend removed successfully' });
    } else {
      res.status(404).json({ error: 'Friendship not found' });
    }
  } catch (error) {
    console.error('Error removing friend:', error);
    res.status(500).json({ error: 'Failed to remove friend' });
  }
});

// Friend request routes
app.post('/api/friend-requests', authenticateToken, async (req, res) => {
  try {
    const senderId = req.user!.userId;
    const { receiverId, message } = req.body;
    
    const request = await storage.createFriendRequest(senderId, receiverId, message);
    res.status(201).json(request);
  } catch (error) {
    console.error('Error creating friend request:', error);
    res.status(500).json({ error: 'Failed to create friend request' });
  }
});

app.get('/api/friend-requests/incoming', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const requests = await storage.getIncomingFriendRequests(userId);
    res.json(requests);
  } catch (error) {
    console.error('Error getting incoming friend requests:', error);
    res.status(500).json({ error: 'Failed to get friend requests' });
  }
});

app.get('/api/friend-requests/outgoing', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const requests = await storage.getOutgoingFriendRequests(userId);
    res.json(requests);
  } catch (error) {
    console.error('Error getting outgoing friend requests:', error);
    res.status(500).json({ error: 'Failed to get friend requests' });
  }
});

app.put('/api/friend-requests/:requestId/accept', authenticateToken, async (req, res) => {
  try {
    const requestId = parseInt(req.params.requestId);
    const success = await storage.acceptFriendRequest(requestId);
    
    if (success) {
      res.json({ message: 'Friend request accepted' });
    } else {
      res.status(404).json({ error: 'Friend request not found' });
    }
  } catch (error) {
    console.error('Error accepting friend request:', error);
    res.status(500).json({ error: 'Failed to accept friend request' });
  }
});

app.put('/api/friend-requests/:requestId/decline', authenticateToken, async (req, res) => {
  try {
    const requestId = parseInt(req.params.requestId);
    const success = await storage.declineFriendRequest(requestId);
    
    if (success) {
      res.json({ message: 'Friend request declined' });
    } else {
      res.status(404).json({ error: 'Friend request not found' });
    }
  } catch (error) {
    console.error('Error declining friend request:', error);
    res.status(500).json({ error: 'Failed to decline friend request' });
  }
});

// Room routes
app.get('/api/rooms', authenticateToken, async (_, res) => {
  try {
    const rooms = await storage.getRooms();
    res.json(rooms);
  } catch (error) {
    console.error('Error getting rooms:', error);
    res.status(500).json({ error: 'Failed to get rooms' });
  }
});

app.post('/api/rooms', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { name, description, isDefault = false, isActive = true, isBroadcast = false } = req.body;
    
    const room = await storage.createRoom({
      name,
      description,
      isDefault,
      isActive,
      isBroadcast,
      createdBy: userId,
      hostId: userId
    });
    
    res.status(201).json(room);
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// Wall post routes
app.post('/api/wall-posts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { content, imageUrl, type = 'text' } = req.body;
    
    const post = await storage.createWallPost({
      userId,
      content,
      imageUrl,
      type,
      isActive: true
    });
    
    res.status(201).json(post);
  } catch (error) {
    console.error('Error creating wall post:', error);
    res.status(500).json({ error: 'Failed to create wall post' });
  }
});

app.get('/api/wall-posts', authenticateToken, async (req, res) => {
  try {
    const type = req.query.type as string;
    const limit = parseInt(req.query.limit as string) || 50;
    
    const posts = await storage.getWallPosts(type, limit);
    res.json(posts);
  } catch (error) {
    console.error('Error getting wall posts:', error);
    res.status(500).json({ error: 'Failed to get wall posts' });
  }
});

// Notification routes
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const notifications = await storage.getUserNotifications(userId, limit);
    res.json(notifications);
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

app.put('/api/notifications/:notificationId/read', authenticateToken, async (req, res) => {
  try {
    const notificationId = parseInt(req.params.notificationId);
    const success = await storage.markNotificationAsRead(notificationId);
    
    if (success) {
      res.json({ message: 'Notification marked as read' });
    } else {
      res.status(404).json({ error: 'Notification not found' });
    }
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Points and levels routes
app.get('/api/levels/settings', authenticateToken, async (_, res) => {
  try {
    const settings = await storage.getLevelSettings();
    res.json(settings);
  } catch (error) {
    console.error('Error getting level settings:', error);
    res.status(500).json({ error: 'Failed to get level settings' });
  }
});

// Report routes
app.post('/api/reports', authenticateToken, async (req, res) => {
  try {
    const reporterId = req.user!.userId;
    const { reportedUserId, messageId, reason, details } = req.body;
    
    const report = await storage.createReport({
      reporterId,
      reportedUserId,
      messageId,
      reason,
      details,
      status: 'pending'
    });
    
    res.status(201).json(report);
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ error: 'Failed to create report' });
  }
});

// Socket.IO connection handling
io.on('connection', (socket: CustomSocket) => {
  console.log('User connected:', socket.id);

  socket.on('join', async (data) => {
    const { userId, username } = data;
    socket.userId = userId;
    socket.username = username;
    socket.join('general');
    
    // Update user online status
    await storage.setUserOnlineStatus(userId, true);
    
    // Notify others about user joining
    socket.broadcast.emit('user_joined', { userId, username });
    
    // Send updated online users list to ALL users (including current user)
    try {
      const onlineUsers = await storage.getOnlineUsers();
      console.log(`👥 إرسال ${onlineUsers.length} مستخدم متصل`);
      console.log(`👥 أسماء المستخدمين المتصلين: ${onlineUsers.map(u => u.username).join(', ')}`);
      
      // إرسال القائمة لجميع المستخدمين المتصلين (وليس فقط المستخدم الحالي)
      io.emit('online_users_updated', { users: onlineUsers });
    } catch (error) {
      console.error('خطأ في جلب قائمة المستخدمين:', error);
    }
  });

  // Handle authentication (for new App.tsx)
  socket.on('authenticate', async (data) => {
    const { userId, username } = data;
    socket.userId = userId;
    socket.username = username;
    socket.join('general');
    
    // Update user online status
    await storage.setUserOnlineStatus(userId, true);
    
    // Send confirmation
    socket.emit('authenticated', { success: true });
    
    // Notify others about user joining
    socket.broadcast.emit('user_joined', { userId, username });
    
    // Send updated online users list to ALL users
    try {
      const onlineUsers = await storage.getOnlineUsers();
      io.emit('online_users_updated', { users: onlineUsers });
    } catch (error) {
      console.error('خطأ في جلب قائمة المستخدمين:', error);
    }
  });

  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    socket.emit('room_joined', roomId);
  });

  socket.on('leave_room', (roomId) => {
    socket.leave(roomId);
    socket.emit('room_left', roomId);
  });

  socket.on('send_message', async (data) => {
    try {
      const { content, roomId = 'general', messageType = 'text' } = data;
      const userId = socket.userId;
      
      if (!userId) {
        socket.emit('error', { message: 'User not authenticated' });
        return;
      }

      const message = await storage.createMessage({
        senderId: userId,
        content,
        messageType,
        isPrivate: false,
        roomId
      });

      io.to(roomId).emit('new_message', message);
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  socket.on('update_status', async (data) => {
    try {
      const { isOnline } = data;
      const userId = socket.userId;
      
      if (userId) {
        await storage.setUserOnlineStatus(userId, isOnline);
        socket.broadcast.emit('user_status_changed', { userId, isOnline });
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  });

  socket.on('typing', (data) => {
    const { roomId = 'general', isTyping } = data;
    socket.broadcast.to(roomId).emit('user_typing', {
      userId: socket.userId,
      username: socket.username,
      isTyping
    });
  });

  // معالج طلب قائمة المستخدمين المتصلين
  socket.on('request_online_users', async () => {
    try {
      console.log('🔄 طلب تحديث قائمة المستخدمين...');
      const onlineUsers = await storage.getOnlineUsers();
      console.log(`👥 إرسال ${onlineUsers.length} مستخدم متصل`);
      console.log(`👥 أسماء المستخدمين المتصلين: ${onlineUsers.map(u => u.username).join(', ')}`);
      
      // إرسال القائمة لجميع المستخدمين المتصلين (وليس فقط الطالب)
      io.emit('online_users_updated', { users: onlineUsers });
    } catch (error) {
      console.error('خطأ في جلب قائمة المستخدمين:', error);
      socket.emit('error', { message: 'خطأ في جلب قائمة المستخدمين' });
    }
  });

  socket.on('disconnect', async () => {
    console.log('User disconnected:', socket.id);
    
    const userId = socket.userId;
    if (userId) {
      await storage.setUserOnlineStatus(userId, false);
      socket.broadcast.emit('user_left', { userId, username: socket.username });
      
      // إرسال قائمة محدثة للمستخدمين المتصلين
      try {
        const onlineUsers = await storage.getOnlineUsers();
        io.emit('online_users_updated', { users: onlineUsers });
      } catch (error) {
        console.error('خطأ في تحديث قائمة المستخدمين بعد قطع الاتصال:', error);
      }
    }
  });
});

// Serve static files from the client build
app.use(express.static(path.join(__dirname, '../../client')));

// Error handling middleware
app.use((err: any, _: any, res: any, __: any) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Catch all handler - serve the React app for any non-API routes
app.get('*', (req, res) => {
  // Don't serve the React app for API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Route not found' });
  }
  
  // Serve the React app for all other routes
  res.sendFile(path.join(__dirname, '../../client/index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

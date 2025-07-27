import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { storage } from './storage';
import { db, checkDatabaseHealth } from './database-adapter';
import { users, messages, friends, friendRequests, notifications, rooms, wallPosts, reports } from '../shared/schema';
import { eq, desc, and, or, isNull, isNotNull } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

dotenv.config();

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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await checkDatabaseHealth();
    res.json({
      status: 'ok',
      database: dbHealth ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Health check failed' });
  }
});

// Authentication routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Check if user already exists
    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await storage.createUser({
      username,
      password: hashedPassword,
      userType: 'member',
      role: 'member',
      joinDate: new Date()
    });

    // Generate JWT token
    const token = jwt.sign({ userId: newUser.id, username: newUser.username }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      user: {
        id: newUser.id,
        username: newUser.username,
        userType: newUser.userType,
        role: newUser.role
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

    // Update online status
    await storage.setUserOnlineStatus(user.id, true);

    // Generate JWT token
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      user: {
        id: user.id,
        username: user.username,
        userType: user.userType,
        role: user.role,
        profileImage: user.profileImage,
        profileBanner: user.profileBanner,
        profileBackgroundColor: user.profileBackgroundColor,
        status: user.status,
        gender: user.gender,
        age: user.age,
        country: user.country,
        relation: user.relation,
        bio: user.bio,
        isOnline: true,
        points: user.points,
        level: user.level,
        totalPoints: user.totalPoints,
        levelProgress: user.levelProgress,
        usernameColor: user.usernameColor,
        userTheme: user.userTheme,
        profileEffect: user.profileEffect
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// User routes
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const users = await storage.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

app.get('/api/users/online', authenticateToken, async (req, res) => {
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

app.put('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const updates = req.body;
    
    // Remove sensitive fields
    delete updates.password;
    delete updates.id;
    
    const updatedUser = await storage.updateUser(userId, updates);
    
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Message routes
app.get('/api/messages', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const messages = await storage.getPublicMessages(limit);
    res.json(messages);
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

app.post('/api/messages', authenticateToken, async (req, res) => {
  try {
    const { content, receiverId, roomId, messageType } = req.body;
    const senderId = req.user.userId;
    
    if (!content) {
      return res.status(400).json({ error: 'Message content is required' });
    }
    
    const message = await storage.createMessage({
      senderId,
      receiverId: receiverId || null,
      content,
      roomId: roomId || 'general',
      messageType: messageType || 'text',
      isPrivate: !!receiverId
    });
    
    // Emit to socket
    io.emit('new_message', message);
    
    res.json(message);
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
});

app.get('/api/messages/private/:userId', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const otherUserId = parseInt(req.params.userId);
    const limit = parseInt(req.query.limit as string) || 50;
    
    const messages = await storage.getPrivateMessages(currentUserId, otherUserId, limit);
    res.json(messages);
  } catch (error) {
    console.error('Error getting private messages:', error);
    res.status(500).json({ error: 'Failed to get private messages' });
  }
});

// Friend routes
app.get('/api/friends', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const friends = await storage.getFriends(userId);
    res.json(friends);
  } catch (error) {
    console.error('Error getting friends:', error);
    res.status(500).json({ error: 'Failed to get friends' });
  }
});

app.post('/api/friends', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { friendId } = req.body;
    
    if (!friendId) {
      return res.status(400).json({ error: 'Friend ID is required' });
    }
    
    const friendship = await storage.getFriendship(userId, friendId);
    if (friendship) {
      return res.status(409).json({ error: 'Friendship already exists' });
    }
    
    const newFriend = await storage.addFriend(userId, friendId);
    res.json(newFriend);
  } catch (error) {
    console.error('Error adding friend:', error);
    res.status(500).json({ error: 'Failed to add friend' });
  }
});

app.delete('/api/friends/:friendId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const friendId = parseInt(req.params.friendId);
    
    const success = await storage.removeFriend(userId, friendId);
    if (!success) {
      return res.status(404).json({ error: 'Friendship not found' });
    }
    
    res.json({ message: 'Friend removed successfully' });
  } catch (error) {
    console.error('Error removing friend:', error);
    res.status(500).json({ error: 'Failed to remove friend' });
  }
});

// Friend request routes
app.get('/api/friend-requests/incoming', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const requests = await storage.getIncomingFriendRequests(userId);
    res.json(requests);
  } catch (error) {
    console.error('Error getting incoming friend requests:', error);
    res.status(500).json({ error: 'Failed to get friend requests' });
  }
});

app.get('/api/friend-requests/outgoing', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const requests = await storage.getOutgoingFriendRequests(userId);
    res.json(requests);
  } catch (error) {
    console.error('Error getting outgoing friend requests:', error);
    res.status(500).json({ error: 'Failed to get friend requests' });
  }
});

app.post('/api/friend-requests', authenticateToken, async (req, res) => {
  try {
    const senderId = req.user.userId;
    const { receiverId, message } = req.body;
    
    if (!receiverId) {
      return res.status(400).json({ error: 'Receiver ID is required' });
    }
    
    const existingRequest = await storage.getFriendRequest(senderId, receiverId);
    if (existingRequest) {
      return res.status(409).json({ error: 'Friend request already sent' });
    }
    
    const request = await storage.createFriendRequest(senderId, receiverId, message);
    res.json(request);
  } catch (error) {
    console.error('Error creating friend request:', error);
    res.status(500).json({ error: 'Failed to create friend request' });
  }
});

app.put('/api/friend-requests/:requestId/accept', authenticateToken, async (req, res) => {
  try {
    const requestId = parseInt(req.params.requestId);
    const success = await storage.acceptFriendRequest(requestId);
    
    if (!success) {
      return res.status(404).json({ error: 'Friend request not found' });
    }
    
    res.json({ message: 'Friend request accepted' });
  } catch (error) {
    console.error('Error accepting friend request:', error);
    res.status(500).json({ error: 'Failed to accept friend request' });
  }
});

app.put('/api/friend-requests/:requestId/decline', authenticateToken, async (req, res) => {
  try {
    const requestId = parseInt(req.params.requestId);
    const success = await storage.declineFriendRequest(requestId);
    
    if (!success) {
      return res.status(404).json({ error: 'Friend request not found' });
    }
    
    res.json({ message: 'Friend request declined' });
  } catch (error) {
    console.error('Error declining friend request:', error);
    res.status(500).json({ error: 'Failed to decline friend request' });
  }
});

// Room routes
app.get('/api/rooms', authenticateToken, async (req, res) => {
  try {
    const rooms = await storage.getRooms();
    res.json(rooms);
  } catch (error) {
    console.error('Error getting rooms:', error);
    res.status(500).json({ error: 'Failed to get rooms' });
  }
});

app.get('/api/rooms/:roomId', authenticateToken, async (req, res) => {
  try {
    const roomId = req.params.roomId;
    const room = await storage.getRoom(roomId);
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    res.json(room);
  } catch (error) {
    console.error('Error getting room:', error);
    res.status(500).json({ error: 'Failed to get room' });
  }
});

// Wall post routes
app.get('/api/wall-posts', authenticateToken, async (req, res) => {
  try {
    const { type, limit } = req.query;
    const posts = await storage.getWallPosts(type as string, parseInt(limit as string) || 50);
    res.json(posts);
  } catch (error) {
    console.error('Error getting wall posts:', error);
    res.status(500).json({ error: 'Failed to get wall posts' });
  }
});

app.post('/api/wall-posts', authenticateToken, async (req, res) => {
  try {
    const { content, imageUrl, type } = req.body;
    const userId = req.user.userId;
    
    if (!content) {
      return res.status(400).json({ error: 'Post content is required' });
    }
    
    const post = await storage.createWallPost({
      userId,
      content,
      imageUrl,
      type: type || 'public'
    });
    
    res.json(post);
  } catch (error) {
    console.error('Error creating wall post:', error);
    res.status(500).json({ error: 'Failed to create wall post' });
  }
});

app.delete('/api/wall-posts/:postId', authenticateToken, async (req, res) => {
  try {
    const postId = parseInt(req.params.postId);
    await storage.deleteWallPost(postId);
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting wall post:', error);
    res.status(500).json({ error: 'Failed to delete wall post' });
  }
});

// Notification routes
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
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
    
    if (!success) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

app.put('/api/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const success = await storage.markAllNotificationsAsRead(userId);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to mark notifications as read' });
    }
    
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

// Points and levels routes
app.get('/api/points/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit as string) || 50;
    const history = await storage.getPointsHistory(userId, limit);
    res.json(history);
  } catch (error) {
    console.error('Error getting points history:', error);
    res.status(500).json({ error: 'Failed to get points history' });
  }
});

app.get('/api/levels/settings', authenticateToken, async (req, res) => {
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
    const { reportedUserId, messageId, reason, details } = req.body;
    const reporterId = req.user.userId;
    
    if (!reportedUserId || !reason) {
      return res.status(400).json({ error: 'Reported user ID and reason are required' });
    }
    
    const report = await storage.createReport({
      reporterId,
      reportedUserId,
      messageId,
      reason,
      details
    });
    
    res.json(report);
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ error: 'Failed to create report' });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Join user to their personal room
  socket.on('join', (userId: number) => {
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined their room`);
  });
  
  // Join chat room
  socket.on('join_room', (roomId: string) => {
    socket.join(roomId);
    console.log(`User joined room: ${roomId}`);
  });
  
  // Leave chat room
  socket.on('leave_room', (roomId: string) => {
    socket.leave(roomId);
    console.log(`User left room: ${roomId}`);
  });
  
  // Handle new message
  socket.on('send_message', async (data) => {
    try {
      const { content, receiverId, roomId, messageType } = data;
      const senderId = data.senderId;
      
      const message = await storage.createMessage({
        senderId,
        receiverId,
        content,
        roomId: roomId || 'general',
        messageType: messageType || 'text',
        isPrivate: !!receiverId
      });
      
      // Emit to appropriate room
      if (receiverId) {
        // Private message
        io.to(`user_${senderId}`).to(`user_${receiverId}`).emit('new_message', message);
      } else {
        // Public message
        io.to(roomId || 'general').emit('new_message', message);
      }
    } catch (error) {
      console.error('Error handling message:', error);
      socket.emit('error', 'Failed to send message');
    }
  });
  
  // Handle user status updates
  socket.on('update_status', async (data) => {
    try {
      const { userId, isOnline } = data;
      await storage.setUserOnlineStatus(userId, isOnline);
      io.emit('user_status_update', { userId, isOnline });
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  });
  
  // Handle typing indicator
  socket.on('typing', (data) => {
    const { roomId, userId, isTyping } = data;
    socket.to(roomId || 'general').emit('user_typing', { userId, isTyping });
  });
  
  // Handle disconnect
  socket.on('disconnect', async () => {
    console.log('User disconnected:', socket.id);
    // Note: In a real app, you'd want to track which user this socket belongs to
    // and update their online status accordingly
  });
});

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Database status: ${db ? 'Connected' : 'Disconnected'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

export default app;

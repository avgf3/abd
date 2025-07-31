import { EventEmitter } from 'events';
import { Server as IOServer, Socket } from 'socket.io';
import { z } from 'zod';
import { roomService } from './RoomService';
import { chatService } from './ChatService';
import { storage } from '../storage';
import { sanitizeInput, validateMessageContent } from '../security';
import { spamProtection } from '../spam-protection';

// Socket event schemas
const authenticateSchema = z.object({
  userId: z.number().optional(),
  username: z.string().min(1).max(50),
  userType: z.enum(['guest', 'member', 'owner', 'admin', 'moderator']),
});

const messageSchema = z.object({
  type: z.enum(['message', 'private', 'typing', 'image']),
  content: z.string().max(2000).optional(),
  receiverId: z.number().optional(),
  messageType: z.enum(['text', 'image']).default('text'),
  isTyping: z.boolean().optional(),
});

const roomActionSchema = z.object({
  roomId: z.string().min(1).max(50),
});

interface CustomSocket extends Socket {
  userId?: number;
  username?: string;
  userType?: string;
  isAuthenticated?: boolean;
  currentRoom?: string;
  lastActivity?: number;
  connectionId?: string;
}

interface SocketConnection {
  socket: CustomSocket;
  userId: number;
  username: string;
  userType: string;
  currentRoom: string;
  connectedAt: Date;
  lastActivity: Date;
}

export class SocketManager extends EventEmitter {
  private io: IOServer;
  private connections = new Map<string, SocketConnection>();
  private userConnections = new Map<number, Set<string>>();
  private roomConnections = new Map<string, Set<string>>();
  private heartbeatIntervals = new Map<string, NodeJS.Timeout>();
  
  private readonly HEARTBEAT_INTERVAL = 25000; // 25 seconds
  private readonly CONNECTION_TIMEOUT = 60000; // 60 seconds
  private readonly MAX_CONNECTIONS_PER_USER = 3;

  constructor(io: IOServer) {
    super();
    this.io = io;
    this.setupEventHandlers();
    this.setupCleanup();
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: CustomSocket) => {
      this.handleConnection(socket);
    });

    // Listen to room service events
    roomService.on('user_joined_room', ({ userId, roomId }) => {
      this.notifyRoomUsers(roomId, 'userJoinedRoom', { userId, roomId });
    });

    roomService.on('user_left_room', ({ userId, roomId }) => {
      this.notifyRoomUsers(roomId, 'userLeftRoom', { userId, roomId });
    });

    // Listen to chat service events
    chatService.on('message_created', (message) => {
      this.broadcastMessage(message);
    });

    chatService.on('spam_detected', ({ userId, content }) => {
      this.handleSpamDetection(userId, content);
    });
  }

  private setupCleanup() {
    // Cleanup inactive connections every 5 minutes
    setInterval(() => {
      this.cleanupInactiveConnections();
    }, 5 * 60 * 1000);

    // Update user activity every minute
    setInterval(() => {
      this.updateUserActivity();
    }, 60 * 1000);
  }

  private async handleConnection(socket: CustomSocket) {
    const connectionId = `${socket.id}_${Date.now()}`;
    socket.connectionId = connectionId;
    socket.lastActivity = Date.now();

    console.log(`🔌 New socket connection: ${socket.id}`);

    // Setup basic event handlers
    this.setupSocketEvents(socket);
    this.startHeartbeat(socket);

    // Set connection timeout
    const connectionTimeout = setTimeout(() => {
      if (!socket.isAuthenticated) {
        console.log(`⏰ Connection timeout for socket ${socket.id}`);
        socket.emit('error', { message: 'Connection timeout. Please authenticate.' });
        socket.disconnect();
      }
    }, this.CONNECTION_TIMEOUT);

    socket.on('disconnect', () => {
      clearTimeout(connectionTimeout);
      this.handleDisconnection(socket);
    });
  }

  private setupSocketEvents(socket: CustomSocket) {
    // Authentication events
    socket.on('authenticate', (data) => this.handleAuthentication(socket, data));
    socket.on('auth', (data) => this.handleAuth(socket, data));

    // Message events
    socket.on('message', (data) => this.handleMessage(socket, data));

    // Room events
    socket.on('joinRoom', (data) => this.handleJoinRoom(socket, data));
    socket.on('leaveRoom', (data) => this.handleLeaveRoom(socket, data));

    // Utility events
    socket.on('ping', () => this.handlePing(socket));
    socket.on('typing', (data) => this.handleTyping(socket, data));

    // Error handling
    socket.on('error', (error) => {
      console.error(`🔥 Socket error for ${socket.id}:`, error);
    });
  }

  private async handleAuthentication(socket: CustomSocket, userData: any) {
    try {
      const validated = authenticateSchema.parse(userData);
      console.log(`🔐 Guest authentication request from ${socket.id}:`, validated.username);

      // Check connection limits
      if (validated.userId && this.getUserConnectionCount(validated.userId) >= this.MAX_CONNECTIONS_PER_USER) {
        socket.emit('error', { message: 'Too many connections. Please close other sessions.' });
        return;
      }

      // Find or create user
      let user = await storage.getUserByUsername(validated.username);
      
      if (!user) {
        user = await storage.createUser({
          username: validated.username,
          userType: validated.userType,
          role: validated.userType,
          isOnline: true,
          joinDate: new Date(),
          createdAt: new Date(),
        });
        console.log(`👤 Created new guest user: ${user.username}`);
      }

      await this.authenticateSocket(socket, user);
      
    } catch (error) {
      console.error(`❌ Authentication error for socket ${socket.id}:`, error);
      socket.emit('error', { message: 'Authentication failed' });
    }
  }

  private async handleAuth(socket: CustomSocket, userData: any) {
    try {
      if (!userData.userId) {
        socket.emit('error', { message: 'User ID required for authentication' });
        return;
      }

      // Check connection limits
      if (this.getUserConnectionCount(userData.userId) >= this.MAX_CONNECTIONS_PER_USER) {
        socket.emit('error', { message: 'Too many connections. Please close other sessions.' });
        return;
      }

      const user = await storage.getUser(userData.userId);
      if (!user) {
        socket.emit('error', { message: 'User not found' });
        return;
      }

      await this.authenticateSocket(socket, user);
      
    } catch (error) {
      console.error(`❌ Auth error for socket ${socket.id}:`, error);
      socket.emit('error', { message: 'Authentication failed' });
    }
  }

  private async authenticateSocket(socket: CustomSocket, user: any) {
    // Set socket properties
    socket.userId = user.id;
    socket.username = user.username;
    socket.userType = user.userType;
    socket.isAuthenticated = true;
    socket.currentRoom = 'general';

    // Update user online status
    await storage.setUserOnlineStatus(user.id, true);

    // Ensure general room exists and join it
    await roomService.ensureGeneralRoom();
    await roomService.joinRoom(user.id, 'general');

    // Join socket rooms
    socket.join('room_general');
    socket.join(user.id.toString()); // For private messages

    // Register connection
    this.registerConnection(socket, user);

    // Send authentication success
    socket.emit('authenticated', {
      message: 'Connected successfully',
      user: user
    });

    // Send current room users
    const roomUsers = await roomService.getOnlineUsersInRoom('general');
    socket.emit('message', {
      type: 'onlineUsers',
      users: roomUsers
    });

    // Notify others about new user
    socket.to('room_general').emit('message', {
      type: 'userJoinedRoom',
      username: user.username,
      userId: user.id,
      roomId: 'general'
    });

    // Send updated users list to room
    this.notifyRoomUsers('general', 'onlineUsers', { users: roomUsers });

    console.log(`✅ User authenticated: ${user.username} (${socket.id})`);
  }

  private async handleMessage(socket: CustomSocket, data: any) {
    if (!socket.isAuthenticated || !socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    try {
      const validated = messageSchema.parse(data);
      socket.lastActivity = Date.now();

      switch (validated.type) {
        case 'message':
          await this.handlePublicMessage(socket, validated);
          break;
        case 'private':
          await this.handlePrivateMessage(socket, validated);
          break;
        case 'typing':
          this.handleTyping(socket, validated);
          break;
        case 'image':
          await this.handleImageMessage(socket, validated);
          break;
      }
    } catch (error) {
      console.error(`❌ Message handling error for ${socket.id}:`, error);
      socket.emit('error', { message: 'Invalid message format' });
    }
  }

  private async handlePublicMessage(socket: CustomSocket, data: any) {
    if (!data.content) {
      socket.emit('error', { message: 'Message content is required' });
      return;
    }

    try {
      // Sanitize and validate content
      const sanitizedContent = sanitizeInput(data.content);
      const contentCheck = validateMessageContent(sanitizedContent);
      
      if (!contentCheck.isValid) {
        socket.emit('error', { message: contentCheck.reason });
        return;
      }

      // Check spam protection
      const spamCheck = spamProtection.checkMessage(socket.userId!, sanitizedContent);
      if (!spamCheck.isAllowed) {
        socket.emit('error', {
          message: spamCheck.reason,
          action: spamCheck.action
        });
        return;
      }

      // Create message through chat service
      const message = await chatService.createMessage({
        senderId: socket.userId!,
        content: sanitizedContent,
        messageType: data.messageType || 'text',
        isPrivate: false,
        roomId: socket.currentRoom || 'general',
      });

      // Message will be broadcasted through chat service event listener
      
    } catch (error) {
      console.error(`❌ Public message error:`, error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  private async handlePrivateMessage(socket: CustomSocket, data: any) {
    if (!data.content || !data.receiverId) {
      socket.emit('error', { message: 'Content and receiver ID are required' });
      return;
    }

    try {
      // Sanitize and validate content
      const sanitizedContent = sanitizeInput(data.content);
      const contentCheck = validateMessageContent(sanitizedContent);
      
      if (!contentCheck.isValid) {
        socket.emit('error', { message: contentCheck.reason });
        return;
      }

      // Check spam protection
      const spamCheck = spamProtection.checkMessage(socket.userId!, sanitizedContent);
      if (!spamCheck.isAllowed) {
        socket.emit('error', {
          message: spamCheck.reason,
          action: spamCheck.action
        });
        return;
      }

      // Create message through chat service
      const message = await chatService.createMessage({
        senderId: socket.userId!,
        receiverId: data.receiverId,
        content: sanitizedContent,
        messageType: data.messageType || 'text',
        isPrivate: true,
      });

      // Send to receiver and sender
      this.io.to(data.receiverId.toString()).emit('privateMessage', { message });
      socket.emit('privateMessage', { message });
      
    } catch (error) {
      console.error(`❌ Private message error:`, error);
      socket.emit('error', { message: 'Failed to send private message' });
    }
  }

  private async handleImageMessage(socket: CustomSocket, data: any) {
    // Handle image messages similar to text messages but with image validation
    // Implementation would depend on how images are handled in your system
    socket.emit('error', { message: 'Image messages not yet implemented' });
  }

  private async handleJoinRoom(socket: CustomSocket, data: any) {
    if (!socket.isAuthenticated || !socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    try {
      const validated = roomActionSchema.parse(data);
      const { roomId } = validated;

      // Leave current room if different
      if (socket.currentRoom && socket.currentRoom !== roomId) {
        await this.leaveSocketRoom(socket, socket.currentRoom);
      }

      // Join new room
      await this.joinSocketRoom(socket, roomId);
      
    } catch (error) {
      console.error(`❌ Join room error:`, error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  }

  private async handleLeaveRoom(socket: CustomSocket, data: any) {
    if (!socket.isAuthenticated || !socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    try {
      const validated = roomActionSchema.parse(data);
      const { roomId } = validated;

      if (roomId === 'general') {
        socket.emit('error', { message: 'Cannot leave the general room' });
        return;
      }

      await this.leaveSocketRoom(socket, roomId);
      
      // Auto-join general room
      if (socket.currentRoom === roomId) {
        await this.joinSocketRoom(socket, 'general');
      }
      
    } catch (error) {
      console.error(`❌ Leave room error:`, error);
      socket.emit('error', { message: 'Failed to leave room' });
    }
  }

  private async joinSocketRoom(socket: CustomSocket, roomId: string) {
    try {
      // Join room in database
      await roomService.joinRoom(socket.userId!, roomId);

      // Join socket.io room
      socket.join(`room_${roomId}`);
      socket.currentRoom = roomId;

      // Update connection record
      const connection = this.connections.get(socket.connectionId!);
      if (connection) {
        connection.currentRoom = roomId;
      }

      // Get room users
      const roomUsers = await roomService.getOnlineUsersInRoom(roomId);

      // Send confirmation
      socket.emit('message', {
        type: 'roomJoined',
        roomId: roomId,
        users: roomUsers
      });

      console.log(`🏠 ${socket.username} joined room ${roomId}`);
      
    } catch (error) {
      console.error(`❌ Error joining socket room ${roomId}:`, error);
      throw error;
    }
  }

  private async leaveSocketRoom(socket: CustomSocket, roomId: string) {
    try {
      // Leave room in database
      await roomService.leaveRoom(socket.userId!, roomId);

      // Leave socket.io room
      socket.leave(`room_${roomId}`);

      // Update room connections
      if (this.roomConnections.has(roomId)) {
        this.roomConnections.get(roomId)!.delete(socket.connectionId!);
      }

      // Send confirmation
      socket.emit('message', {
        type: 'roomLeft',
        roomId: roomId,
        message: `Left room ${roomId} successfully`
      });

      console.log(`🚪 ${socket.username} left room ${roomId}`);
      
    } catch (error) {
      console.error(`❌ Error leaving socket room ${roomId}:`, error);
      throw error;
    }
  }

  private handleTyping(socket: CustomSocket, data: any) {
    if (!socket.isAuthenticated || !socket.currentRoom) return;

    socket.to(`room_${socket.currentRoom}`).emit('userTyping', {
      userId: socket.userId,
      username: socket.username,
      isTyping: data.isTyping || false,
    });
  }

  private handlePing(socket: CustomSocket) {
    socket.lastActivity = Date.now();
    socket.emit('pong', { timestamp: Date.now() });
  }

  private async handleDisconnection(socket: CustomSocket) {
    console.log(`🔌 Socket disconnected: ${socket.id} (${socket.username || 'unauthenticated'})`);

    if (socket.isAuthenticated && socket.userId) {
      try {
        // Update user offline status
        await storage.setUserOnlineStatus(socket.userId, false);

        // Notify room users
        if (socket.currentRoom) {
          socket.to(`room_${socket.currentRoom}`).emit('message', {
            type: 'userLeft',
            userId: socket.userId,
            username: socket.username,
            roomId: socket.currentRoom,
            timestamp: new Date().toISOString()
          });

          // Send updated user list
          const roomUsers = await roomService.getOnlineUsersInRoom(socket.currentRoom);
          this.io.to(`room_${socket.currentRoom}`).emit('message', {
            type: 'onlineUsers',
            users: roomUsers
          });
        }

        // Notify all users
        this.io.emit('message', {
          type: 'userLeft',
          userId: socket.userId,
          username: socket.username,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error(`❌ Error handling disconnection for ${socket.username}:`, error);
      }
    }

    // Cleanup connection
    this.unregisterConnection(socket);
    this.stopHeartbeat(socket);
  }

  // Connection management
  private registerConnection(socket: CustomSocket, user: any) {
    const connectionId = socket.connectionId!;
    
    const connection: SocketConnection = {
      socket,
      userId: user.id,
      username: user.username,
      userType: user.userType,
      currentRoom: 'general',
      connectedAt: new Date(),
      lastActivity: new Date(),
    };

    this.connections.set(connectionId, connection);

    // Track user connections
    if (!this.userConnections.has(user.id)) {
      this.userConnections.set(user.id, new Set());
    }
    this.userConnections.get(user.id)!.add(connectionId);

    // Track room connections
    if (!this.roomConnections.has('general')) {
      this.roomConnections.set('general', new Set());
    }
    this.roomConnections.get('general')!.add(connectionId);

    console.log(`📝 Registered connection: ${user.username} (${connectionId})`);
  }

  private unregisterConnection(socket: CustomSocket) {
    const connectionId = socket.connectionId!;
    const connection = this.connections.get(connectionId);

    if (connection) {
      // Remove from user connections
      const userConnections = this.userConnections.get(connection.userId);
      if (userConnections) {
        userConnections.delete(connectionId);
        if (userConnections.size === 0) {
          this.userConnections.delete(connection.userId);
        }
      }

      // Remove from room connections
      const roomConnections = this.roomConnections.get(connection.currentRoom);
      if (roomConnections) {
        roomConnections.delete(connectionId);
        if (roomConnections.size === 0) {
          this.roomConnections.delete(connection.currentRoom);
        }
      }

      this.connections.delete(connectionId);
      console.log(`🗑️ Unregistered connection: ${connection.username} (${connectionId})`);
    }
  }

  // Heartbeat management
  private startHeartbeat(socket: CustomSocket) {
    const interval = setInterval(() => {
      if (socket.connected) {
        socket.emit('ping', { timestamp: Date.now() });
      } else {
        this.stopHeartbeat(socket);
      }
    }, this.HEARTBEAT_INTERVAL);

    this.heartbeatIntervals.set(socket.id, interval);
  }

  private stopHeartbeat(socket: CustomSocket) {
    const interval = this.heartbeatIntervals.get(socket.id);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(socket.id);
    }
  }

  // Utility methods
  private getUserConnectionCount(userId: number): number {
    return this.userConnections.get(userId)?.size || 0;
  }

  private broadcastMessage(message: any) {
    if (message.isPrivate) {
      // Private messages are handled in handlePrivateMessage
      return;
    }

    // Broadcast to room
    const roomId = message.roomId || 'general';
    this.io.to(`room_${roomId}`).emit('message', {
      type: 'message',
      message: message
    });
  }

  private notifyRoomUsers(roomId: string, eventType: string, data: any) {
    this.io.to(`room_${roomId}`).emit('message', {
      type: eventType,
      ...data
    });
  }

  private handleSpamDetection(userId: number, content: string) {
    // Temporarily mute user or take other actions
    const userConnections = this.userConnections.get(userId);
    if (userConnections) {
      userConnections.forEach(connectionId => {
        const connection = this.connections.get(connectionId);
        if (connection) {
          connection.socket.emit('warning', {
            message: 'Spam detected. Please slow down your messaging.',
            type: 'spam_warning'
          });
        }
      });
    }

    console.log(`🚨 Spam detected from user ${userId}: ${content.substring(0, 50)}...`);
  }

  private cleanupInactiveConnections() {
    const now = Date.now();
    const timeout = 10 * 60 * 1000; // 10 minutes

    for (const [connectionId, connection] of this.connections.entries()) {
      if (now - (connection.socket.lastActivity || 0) > timeout) {
        console.log(`🧹 Cleaning up inactive connection: ${connection.username}`);
        connection.socket.disconnect();
      }
    }
  }

  private updateUserActivity() {
    for (const [connectionId, connection] of this.connections.entries()) {
      connection.lastActivity = new Date(connection.socket.lastActivity || Date.now());
    }
  }

  // Public methods for external use
  public getConnectionStats() {
    return {
      totalConnections: this.connections.size,
      uniqueUsers: this.userConnections.size,
      roomCounts: Object.fromEntries(
        Array.from(this.roomConnections.entries()).map(([roomId, connections]) => [
          roomId,
          connections.size
        ])
      ),
    };
  }

  public getUserConnections(userId: number): SocketConnection[] {
    const connectionIds = this.userConnections.get(userId) || new Set();
    return Array.from(connectionIds)
      .map(id => this.connections.get(id))
      .filter(Boolean) as SocketConnection[];
  }

  public async kickUser(userId: number, reason: string = 'Kicked by admin') {
    const connections = this.getUserConnections(userId);
    
    for (const connection of connections) {
      connection.socket.emit('kicked', { reason });
      connection.socket.disconnect();
    }

    console.log(`👢 Kicked user ${userId} (${connections.length} connections): ${reason}`);
  }

  public async broadcastToRoom(roomId: string, eventType: string, data: any) {
    this.io.to(`room_${roomId}`).emit(eventType, data);
  }

  public async broadcastToAll(eventType: string, data: any) {
    this.io.emit(eventType, data);
  }
}

// Export singleton will be created in routes.ts with actual io instance
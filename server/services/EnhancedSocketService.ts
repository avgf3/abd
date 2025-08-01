import { Server as SocketIOServer } from 'socket.io';
import { enhancedRoomService } from './EnhancedRoomService';
import { storage } from '../storage';
import type { User } from '../../shared/schema';

export interface SocketUser {
  id: number;
  username: string;
  userType: string;
  role: string;
  currentRoom: string;
  isOnline: boolean;
  lastSeen: Date;
}

export interface RoomMessage {
  id: number;
  senderId: number;
  content: string;
  messageType: string;
  roomId: string;
  timestamp: Date;
  sender?: User;
}

export interface RoomEvent {
  type: 'userJoined' | 'userLeft' | 'message' | 'micRequest' | 'micApproved' | 'micRejected' | 'speakerRemoved' | 'roomUpdated' | 'roomDeleted';
  data: any;
  roomId: string;
  timestamp: Date;
}

export class EnhancedSocketService {
  private io: SocketIOServer;
  private userSockets = new Map<number, string>(); // userId -> socketId
  private socketUsers = new Map<string, SocketUser>(); // socketId -> user
  private roomSockets = new Map<string, Set<string>>(); // roomId -> Set<socketId>

  constructor(io: SocketIOServer) {
    this.io = io;
    this.setupEventHandlers();
    this.setupRoomServiceEvents();
  }

  private setupEventHandlers() {
    this.io.on('connection', async (socket) => {
      console.log(`🔌 New socket connection: ${socket.id}`);

      // Handle user authentication
      socket.on('authenticate', async (data) => {
        await this.handleAuthentication(socket, data);
      });

      // Handle room joining
      socket.on('joinRoom', async (data) => {
        await this.handleJoinRoom(socket, data);
      });

      // Handle room leaving
      socket.on('leaveRoom', async (data) => {
        await this.handleLeaveRoom(socket, data);
      });

      // Handle room switching
      socket.on('switchRoom', async (data) => {
        await this.handleSwitchRoom(socket, data);
      });

      // Handle room messages
      socket.on('sendMessage', async (data) => {
        await this.handleSendMessage(socket, data);
      });

      // Handle typing indicators
      socket.on('typing', async (data) => {
        await this.handleTyping(socket, data);
      });

      // Handle stop typing
      socket.on('stopTyping', async (data) => {
        await this.handleStopTyping(socket, data);
      });

      // Handle microphone requests (for broadcast rooms)
      socket.on('requestMic', async (data) => {
        await this.handleRequestMic(socket, data);
      });

      // Handle microphone approval/rejection
      socket.on('approveMic', async (data) => {
        await this.handleApproveMic(socket, data);
      });

      socket.on('rejectMic', async (data) => {
        await this.handleRejectMic(socket, data);
      });

      // Handle speaker removal
      socket.on('removeSpeaker', async (data) => {
        await this.handleRemoveSpeaker(socket, data);
      });

      // Handle room creation
      socket.on('createRoom', async (data) => {
        await this.handleCreateRoom(socket, data);
      });

      // Handle room updates
      socket.on('updateRoom', async (data) => {
        await this.handleUpdateRoom(socket, data);
      });

      // Handle room deletion
      socket.on('deleteRoom', async (data) => {
        await this.handleDeleteRoom(socket, data);
      });

      // Handle user status updates
      socket.on('updateStatus', async (data) => {
        await this.handleUpdateStatus(socket, data);
      });

      // Handle user profile updates
      socket.on('updateProfile', async (data) => {
        await this.handleUpdateProfile(socket, data);
      });

      // Handle disconnection
      socket.on('disconnect', async () => {
        await this.handleDisconnect(socket);
      });

      // Handle error
      socket.on('error', (error) => {
        console.error(`Socket error for ${socket.id}:`, error);
      });
    });
  }

  private setupRoomServiceEvents() {
    // Listen to room service events
    enhancedRoomService.on('room_created', (room) => {
      this.broadcastToAll('roomCreated', { room });
    });

    enhancedRoomService.on('room_updated', (room) => {
      this.broadcastToRoom(room.id, 'roomUpdated', { room });
    });

    enhancedRoomService.on('room_deleted', (data) => {
      this.broadcastToAll('roomDeleted', { roomId: data.roomId });
    });

    enhancedRoomService.on('user_joined_room', (data) => {
      this.broadcastToRoom(data.roomId, 'userJoinedRoom', { 
        userId: data.userId,
        roomId: data.roomId 
      });
    });

    enhancedRoomService.on('user_left_room', (data) => {
      this.broadcastToRoom(data.roomId, 'userLeftRoom', { 
        userId: data.userId,
        roomId: data.roomId 
      });
    });

    enhancedRoomService.on('mic_requested', (data) => {
      this.broadcastToRoom(data.roomId, 'micRequested', data);
    });

    enhancedRoomService.on('mic_approved', (data) => {
      this.broadcastToRoom(data.roomId, 'micApproved', data);
    });

    enhancedRoomService.on('mic_rejected', (data) => {
      this.broadcastToRoom(data.roomId, 'micRejected', data);
    });

    enhancedRoomService.on('speaker_removed', (data) => {
      this.broadcastToRoom(data.roomId, 'speakerRemoved', data);
    });
  }

  // Authentication handler
  private async handleAuthentication(socket: any, data: { token: string }) {
    try {
      const user = await this.authenticateUser(data.token);
      if (!user) {
        socket.emit('error', { message: 'Authentication failed' });
        return;
      }

      // Store user info
      const socketUser: SocketUser = {
        id: user.id,
        username: user.username,
        userType: user.userType,
        role: user.role,
        currentRoom: 'general',
        isOnline: true,
        lastSeen: new Date()
      };

      this.socketUsers.set(socket.id, socketUser);
      this.userSockets.set(user.id, socket.id);

      // Update user online status
      await storage.updateUserOnlineStatus(user.id, true);

      // Join general room
      await this.joinRoom(socket, { roomId: 'general' });

      // Send authentication success
      socket.emit('authenticated', { 
        user: socketUser,
        message: 'Authentication successful'
      });

      console.log(`✅ User ${user.username} authenticated on socket ${socket.id}`);
    } catch (error) {
      console.error('Authentication error:', error);
      socket.emit('error', { message: 'Authentication failed' });
    }
  }

  // Room joining handler
  private async handleJoinRoom(socket: any, data: { roomId: string; password?: string }) {
    try {
      const user = this.socketUsers.get(socket.id);
      if (!user) {
        socket.emit('error', { message: 'User not authenticated' });
        return;
      }

      await this.joinRoom(socket, data);
    } catch (error) {
      console.error('Join room error:', error);
      socket.emit('error', { 
        message: error instanceof Error ? error.message : 'Failed to join room' 
      });
    }
  }

  // Room leaving handler
  private async handleLeaveRoom(socket: any, data: { roomId: string }) {
    try {
      const user = this.socketUsers.get(socket.id);
      if (!user) {
        socket.emit('error', { message: 'User not authenticated' });
        return;
      }

      await this.leaveRoom(socket, data.roomId);
    } catch (error) {
      console.error('Leave room error:', error);
      socket.emit('error', { 
        message: error instanceof Error ? error.message : 'Failed to leave room' 
      });
    }
  }

  // Room switching handler
  private async handleSwitchRoom(socket: any, data: { roomId: string }) {
    try {
      const user = this.socketUsers.get(socket.id);
      if (!user) {
        socket.emit('error', { message: 'User not authenticated' });
        return;
      }

      // Leave current room
      if (user.currentRoom && user.currentRoom !== data.roomId) {
        await this.leaveRoom(socket, user.currentRoom);
      }

      // Join new room
      await this.joinRoom(socket, { roomId: data.roomId });
    } catch (error) {
      console.error('Switch room error:', error);
      socket.emit('error', { 
        message: error instanceof Error ? error.message : 'Failed to switch room' 
      });
    }
  }

  // Message sending handler
  private async handleSendMessage(socket: any, data: { 
    content: string; 
    roomId: string; 
    messageType?: string;
    isPrivate?: boolean;
  }) {
    try {
      const user = this.socketUsers.get(socket.id);
      if (!user) {
        socket.emit('error', { message: 'User not authenticated' });
        return;
      }

      const message = await storage.saveMessage({
        senderId: user.id,
        content: data.content,
        messageType: data.messageType || 'text',
        isPrivate: data.isPrivate || false,
        roomId: data.roomId
      });

      // Get sender info
      const sender = await storage.getUser(user.id);

      // Broadcast to room
      this.broadcastToRoom(data.roomId, 'newMessage', {
        message: { ...message, sender },
        roomId: data.roomId
      });

      console.log(`📤 Message sent by ${user.username} in room ${data.roomId}`);
    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('error', { 
        message: error instanceof Error ? error.message : 'Failed to send message' 
      });
    }
  }

  // Typing indicator handler
  private async handleTyping(socket: any, data: { roomId: string }) {
    try {
      const user = this.socketUsers.get(socket.id);
      if (!user) return;

      socket.to(`room_${data.roomId}`).emit('userTyping', {
        userId: user.id,
        username: user.username,
        roomId: data.roomId
      });
    } catch (error) {
      console.error('Typing indicator error:', error);
    }
  }

  // Stop typing handler
  private async handleStopTyping(socket: any, data: { roomId: string }) {
    try {
      const user = this.socketUsers.get(socket.id);
      if (!user) return;

      socket.to(`room_${data.roomId}`).emit('userStopTyping', {
        userId: user.id,
        username: user.username,
        roomId: data.roomId
      });
    } catch (error) {
      console.error('Stop typing error:', error);
    }
  }

  // Microphone request handler
  private async handleRequestMic(socket: any, data: { roomId: string }) {
    try {
      const user = this.socketUsers.get(socket.id);
      if (!user) {
        socket.emit('error', { message: 'User not authenticated' });
        return;
      }

      const success = await enhancedRoomService.requestMic(user.id, data.roomId);
      
      if (success) {
        socket.emit('micRequested', { roomId: data.roomId, success: true });
      } else {
        socket.emit('error', { message: 'Already in microphone queue' });
      }
    } catch (error) {
      console.error('Request mic error:', error);
      socket.emit('error', { 
        message: error instanceof Error ? error.message : 'Failed to request microphone' 
      });
    }
  }

  // Microphone approval handler
  private async handleApproveMic(socket: any, data: { roomId: string; userId: number }) {
    try {
      const user = this.socketUsers.get(socket.id);
      if (!user) {
        socket.emit('error', { message: 'User not authenticated' });
        return;
      }

      const success = await enhancedRoomService.approveMicRequest(data.roomId, data.userId, user.id);
      
      if (success) {
        socket.emit('micApproved', { roomId: data.roomId, userId: data.userId, success: true });
      } else {
        socket.emit('error', { message: 'Failed to approve microphone request' });
      }
    } catch (error) {
      console.error('Approve mic error:', error);
      socket.emit('error', { 
        message: error instanceof Error ? error.message : 'Failed to approve microphone' 
      });
    }
  }

  // Microphone rejection handler
  private async handleRejectMic(socket: any, data: { roomId: string; userId: number }) {
    try {
      const user = this.socketUsers.get(socket.id);
      if (!user) {
        socket.emit('error', { message: 'User not authenticated' });
        return;
      }

      const success = await enhancedRoomService.rejectMicRequest(data.roomId, data.userId, user.id);
      
      if (success) {
        socket.emit('micRejected', { roomId: data.roomId, userId: data.userId, success: true });
      } else {
        socket.emit('error', { message: 'Failed to reject microphone request' });
      }
    } catch (error) {
      console.error('Reject mic error:', error);
      socket.emit('error', { 
        message: error instanceof Error ? error.message : 'Failed to reject microphone' 
      });
    }
  }

  // Speaker removal handler
  private async handleRemoveSpeaker(socket: any, data: { roomId: string; userId: number }) {
    try {
      const user = this.socketUsers.get(socket.id);
      if (!user) {
        socket.emit('error', { message: 'User not authenticated' });
        return;
      }

      const success = await enhancedRoomService.removeSpeaker(data.roomId, data.userId, user.id);
      
      if (success) {
        socket.emit('speakerRemoved', { roomId: data.roomId, userId: data.userId, success: true });
      } else {
        socket.emit('error', { message: 'Failed to remove speaker' });
      }
    } catch (error) {
      console.error('Remove speaker error:', error);
      socket.emit('error', { 
        message: error instanceof Error ? error.message : 'Failed to remove speaker' 
      });
    }
  }

  // Room creation handler
  private async handleCreateRoom(socket: any, data: any) {
    try {
      const user = this.socketUsers.get(socket.id);
      if (!user) {
        socket.emit('error', { message: 'User not authenticated' });
        return;
      }

      const roomData = {
        ...data,
        createdBy: user.id
      };

      const newRoom = await enhancedRoomService.createRoom(roomData);
      
      socket.emit('roomCreated', { room: newRoom, success: true });
    } catch (error) {
      console.error('Create room error:', error);
      socket.emit('error', { 
        message: error instanceof Error ? error.message : 'Failed to create room' 
      });
    }
  }

  // Room update handler
  private async handleUpdateRoom(socket: any, data: { roomId: string; updates: any }) {
    try {
      const user = this.socketUsers.get(socket.id);
      if (!user) {
        socket.emit('error', { message: 'User not authenticated' });
        return;
      }

      const updatedRoom = await enhancedRoomService.updateRoom(data.roomId, data.updates);
      
      if (updatedRoom) {
        socket.emit('roomUpdated', { room: updatedRoom, success: true });
      } else {
        socket.emit('error', { message: 'Failed to update room' });
      }
    } catch (error) {
      console.error('Update room error:', error);
      socket.emit('error', { 
        message: error instanceof Error ? error.message : 'Failed to update room' 
      });
    }
  }

  // Room deletion handler
  private async handleDeleteRoom(socket: any, data: { roomId: string }) {
    try {
      const user = this.socketUsers.get(socket.id);
      if (!user) {
        socket.emit('error', { message: 'User not authenticated' });
        return;
      }

      await enhancedRoomService.deleteRoom(data.roomId, user.id);
      
      socket.emit('roomDeleted', { roomId: data.roomId, success: true });
    } catch (error) {
      console.error('Delete room error:', error);
      socket.emit('error', { 
        message: error instanceof Error ? error.message : 'Failed to delete room' 
      });
    }
  }

  // Status update handler
  private async handleUpdateStatus(socket: any, data: { status: string }) {
    try {
      const user = this.socketUsers.get(socket.id);
      if (!user) return;

      await storage.updateUserStatus(user.id, data.status);
      
      // Broadcast status update to all rooms user is in
      const userRooms = await enhancedRoomService.getUserRooms(user.id);
      userRooms.forEach(roomId => {
        this.broadcastToRoom(roomId, 'userStatusUpdated', {
          userId: user.id,
          username: user.username,
          status: data.status
        });
      });
    } catch (error) {
      console.error('Update status error:', error);
    }
  }

  // Profile update handler
  private async handleUpdateProfile(socket: any, data: any) {
    try {
      const user = this.socketUsers.get(socket.id);
      if (!user) return;

      await storage.updateUser(user.id, data);
      
      // Update local user data
      Object.assign(user, data);
      
      // Broadcast profile update to all rooms user is in
      const userRooms = await enhancedRoomService.getUserRooms(user.id);
      userRooms.forEach(roomId => {
        this.broadcastToRoom(roomId, 'userProfileUpdated', {
          userId: user.id,
          username: user.username,
          updates: data
        });
      });
    } catch (error) {
      console.error('Update profile error:', error);
    }
  }

  // Disconnect handler
  private async handleDisconnect(socket: any) {
    try {
      const user = this.socketUsers.get(socket.id);
      if (!user) return;

      console.log(`🔌 User ${user.username} disconnected from socket ${socket.id}`);

      // Update user offline status
      await storage.updateUserOnlineStatus(user.id, false);

      // Remove from all rooms
      const userRooms = await enhancedRoomService.getUserRooms(user.id);
      for (const roomId of userRooms) {
        await this.leaveRoom(socket, roomId);
      }

      // Clean up maps
      this.socketUsers.delete(socket.id);
      this.userSockets.delete(user.id);
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  }

  // Helper methods
  private async authenticateUser(token: string): Promise<User | null> {
    try {
      // Implement your authentication logic here
      // This should verify the JWT token and return user data
      return await storage.verifyToken(token);
    } catch (error) {
      console.error('Authentication error:', error);
      return null;
    }
  }

  private async joinRoom(socket: any, data: { roomId: string; password?: string }) {
    const user = this.socketUsers.get(socket.id);
    if (!user) throw new Error('User not authenticated');

    // Join room in database
    await enhancedRoomService.joinRoom(user.id, data.roomId, data.password);

    // Join socket room
    socket.join(`room_${data.roomId}`);

    // Update user's current room
    user.currentRoom = data.roomId;

    // Add to room sockets map
    if (!this.roomSockets.has(data.roomId)) {
      this.roomSockets.set(data.roomId, new Set());
    }
    this.roomSockets.get(data.roomId)!.add(socket.id);

    // Get room info and online users
    const room = await enhancedRoomService.getRoom(data.roomId);
    const onlineUsers = await enhancedRoomService.getOnlineUsersInRoom(data.roomId);

    // Send room info to user
    socket.emit('roomJoined', {
      room,
      onlineUsers,
      message: `Joined room ${data.roomId}`
    });

    // Notify others in room
    socket.to(`room_${data.roomId}`).emit('userJoinedRoom', {
      userId: user.id,
      username: user.username,
      roomId: data.roomId
    });

    console.log(`👤 User ${user.username} joined room ${data.roomId}`);
  }

  private async leaveRoom(socket: any, roomId: string) {
    const user = this.socketUsers.get(socket.id);
    if (!user) return;

    // Leave room in database
    await enhancedRoomService.leaveRoom(user.id, roomId);

    // Leave socket room
    socket.leave(`room_${roomId}`);

    // Remove from room sockets map
    const roomSockets = this.roomSockets.get(roomId);
    if (roomSockets) {
      roomSockets.delete(socket.id);
      if (roomSockets.size === 0) {
        this.roomSockets.delete(roomId);
      }
    }

    // Notify others in room
    socket.to(`room_${roomId}`).emit('userLeftRoom', {
      userId: user.id,
      username: user.username,
      roomId: roomId
    });

    console.log(`👋 User ${user.username} left room ${roomId}`);
  }

  // Broadcasting methods
  private broadcastToRoom(roomId: string, event: string, data: any) {
    this.io.to(`room_${roomId}`).emit(event, data);
  }

  private broadcastToAll(event: string, data: any) {
    this.io.emit(event, data);
  }

  // Public methods for external use
  public getUserBySocketId(socketId: string): SocketUser | undefined {
    return this.socketUsers.get(socketId);
  }

  public getUserByUserId(userId: number): string | undefined {
    return this.userSockets.get(userId);
  }

  public getRoomSockets(roomId: string): Set<string> | undefined {
    return this.roomSockets.get(roomId);
  }

  public getOnlineUsers(): SocketUser[] {
    return Array.from(this.socketUsers.values());
  }

  public getRoomUsers(roomId: string): SocketUser[] {
    const roomSockets = this.roomSockets.get(roomId);
    if (!roomSockets) return [];

    return Array.from(roomSockets)
      .map(socketId => this.socketUsers.get(socketId))
      .filter(Boolean) as SocketUser[];
  }

  public sendToUser(userId: number, event: string, data: any) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }

  public sendToRoom(roomId: string, event: string, data: any) {
    this.broadcastToRoom(roomId, event, data);
  }

  public sendToAll(event: string, data: any) {
    this.broadcastToAll(event, data);
  }
}
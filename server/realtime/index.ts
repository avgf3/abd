import type { Server as HttpServer } from 'http';
import { Server as IOServer } from 'socket.io';
import type { CustomSocket } from './types';
import { verifyAuthToken } from '../utils/auth-token';
import { getClientIpFromHeaders, getDeviceIdFromHeaders } from '../utils/device';
import { storage } from '../storage';
import { roomService } from '../services/roomService';
import { connectionManager } from './connection-manager';
import { createRoomManager } from './room-manager';
import { createMessageHandler } from './message-handler';
import { createPrivateMessageHandler } from './private-message-handler';

let io: IOServer | null = null;
const GENERAL_ROOM = 'general';

export function getIO(): IOServer {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
}

export function updateConnectedUserCache(user: any) {
  connectionManager.updateUser(user.id, user);
}

export async function initializeRealtime(server: HttpServer): Promise<IOServer> {
  io = new IOServer(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? process.env.ALLOWED_ORIGINS?.split(',') || ['*']
        : '*',
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
  });

  // Create managers
  const roomManager = createRoomManager(io);
  const messageHandler = createMessageHandler(io);
  const privateMessageHandler = createPrivateMessageHandler(io);

  // Middleware
  io.use(async (socket: CustomSocket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
      
      if (token) {
        const decoded = verifyAuthToken(token);
        if (decoded) {
          const user = await storage.getUserById(decoded.userId);
          if (user && !user.isBanned) {
            socket.userId = user.id;
            socket.username = user.username;
            socket.userType = user.role || 'member';
            socket.isAuthenticated = true;
            return next();
          }
        }
      }
      
      next(new Error('Authentication failed'));
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  // Connection handler
  io.on('connection', async (socket: CustomSocket) => {
    if (!socket.userId || !socket.username) {
      socket.disconnect(true);
      return;
    }

    // Join user-specific room for notifications
    socket.join(`user:${socket.userId}`);

    // Auto-join general room
    await roomManager.joinRoom(socket, socket.userId, socket.username, GENERAL_ROOM);

    // Send initial data
    const rooms = await roomService.getAllRooms();
    socket.emit('rooms:list', { rooms });

    // Register event handlers
    
    // Room events
    socket.on('room:join', async (data) => {
      if (data.roomId) {
        await roomManager.joinRoom(socket, socket.userId!, socket.username!, data.roomId);
      }
    });

    socket.on('room:leave', async (data) => {
      if (data.roomId && socket.currentRoom === data.roomId) {
        await roomManager.leaveRoom(socket, socket.userId!, socket.username!, data.roomId);
      }
    });

    socket.on('room:create', async (data) => {
      try {
        const room = await roomManager.createRoom(data, socket.userId!);
        socket.emit('room:created', { room });
      } catch (error: any) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('room:update', async (data) => {
      try {
        const room = await roomManager.updateRoom(data.roomId, data.updates, socket.userId!);
        socket.emit('room:updated', { room });
      } catch (error: any) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('room:delete', async (data) => {
      try {
        await roomManager.deleteRoom(data.roomId, socket.userId!);
      } catch (error: any) {
        socket.emit('error', { message: error.message });
      }
    });

    // Message events
    socket.on('message:send', (data) => messageHandler.handleMessage(socket, data));
    socket.on('message:edit', (data) => messageHandler.handleEdit(socket, data));
    socket.on('message:delete', (data) => messageHandler.handleDelete(socket, data));
    socket.on('user:typing', (data) => messageHandler.handleTyping(socket, data));

    // Private message events
    socket.on('private:send', (data) => privateMessageHandler.handleSend(socket, data));
    socket.on('private:typing', (data) => privateMessageHandler.handleTyping(socket, data));
    socket.on('private:read', (data) => privateMessageHandler.handleMarkRead(socket, data));

    // Disconnect handler
    socket.on('disconnect', async () => {
      if (socket.userId && socket.currentRoom) {
        connectionManager.removeSocket(socket.userId, socket.id);
        await roomManager.leaveRoom(socket, socket.userId, socket.username!, socket.currentRoom);
      }
    });
  });

  // Cleanup inactive connections periodically
  setInterval(() => {
    connectionManager.cleanup();
  }, 60000); // Every minute

  return io;
}
import type { Server as IOServer } from 'socket.io';
import type { CustomSocket } from './types';
import { roomService } from '../services/roomService';
import { roomMessageService } from '../services/roomMessageService';
import { sanitizeUsersArray } from '../utils/data-sanitizer';
import { connectionManager } from './connection-manager';

export class RoomManager {
  constructor(private io: IOServer) {}

  async joinRoom(socket: CustomSocket, userId: number, username: string, roomId: string) {
    // Leave previous room if any
    if (socket.currentRoom && socket.currentRoom !== roomId) {
      await this.leaveRoom(socket, userId, username, socket.currentRoom);
    }

    // Join new room
    socket.join(`room_${roomId}`);
    socket.currentRoom = roomId;

    // Update connection manager
    connectionManager.addUser(userId, {
      id: userId,
      username,
      userType: socket.userType || 'member',
    }, socket.id, roomId);

    // Notify room
    this.io.to(`room_${roomId}`).emit('message', {
      type: 'room_join',
      room: roomId,
      username,
      userId,
      timestamp: new Date().toISOString(),
    });

    // Load messages
    const messages = await roomMessageService.getRoomMessages(roomId, 50);
    socket.emit('messages:history', { messages, room: roomId });

    // Update online users
    await this.updateRoomUsers(roomId);
  }

  async leaveRoom(socket: CustomSocket, userId: number, username: string, roomId: string) {
    socket.leave(`room_${roomId}`);
    
    this.io.to(`room_${roomId}`).emit('message', {
      type: 'room_leave',
      room: roomId,
      username,
      userId,
      timestamp: new Date().toISOString(),
    });

    // Update online users
    await this.updateRoomUsers(roomId);
  }

  async updateRoomUsers(roomId: string) {
    const users = connectionManager.getUsersInRoom(roomId);
    const sanitized = sanitizeUsersArray(users).filter(u => !u.isHidden);
    
    this.io.to(`room_${roomId}`).emit('users:online', {
      users: sanitized,
      room: roomId,
      count: sanitized.length,
    });
  }

  async createRoom(data: any, userId: number) {
    try {
      const room = await roomService.createRoom({
        name: data.name,
        description: data.description,
        category: data.category,
        maxUsers: data.maxUsers,
        isPrivate: data.isPrivate,
        password: data.password,
        ownerId: userId,
      });

      // Notify all users about new room
      const rooms = await roomService.getAllRooms();
      this.io.emit('rooms:list', { rooms });

      return room;
    } catch (error) {
      throw new Error('فشل في إنشاء الغرفة');
    }
  }

  async deleteRoom(roomId: string, userId: number) {
    try {
      await roomService.deleteRoom(roomId, userId);
      
      // Kick all users from room
      this.io.to(`room_${roomId}`).emit('room:deleted', { roomId });
      
      // Update rooms list
      const rooms = await roomService.getAllRooms();
      this.io.emit('rooms:list', { rooms });
    } catch (error) {
      throw new Error('فشل في حذف الغرفة');
    }
  }

  async updateRoom(roomId: string, updates: any, userId: number) {
    try {
      const room = await roomService.updateRoom(roomId, updates, userId);
      
      // Notify room users
      this.io.to(`room_${roomId}`).emit('room:updated', { room });
      
      // Update rooms list
      const rooms = await roomService.getAllRooms();
      this.io.emit('rooms:list', { rooms });
      
      return room;
    } catch (error) {
      throw new Error('فشل في تحديث الغرفة');
    }
  }
}

export function createRoomManager(io: IOServer) {
  return new RoomManager(io);
}
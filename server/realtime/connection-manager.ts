import type { Socket } from 'socket.io';

interface CustomSocket extends Socket {
  userId?: number;
  username?: string;
  userType?: string;
  isAuthenticated?: boolean;
  currentRoom?: string | null;
}

interface ConnectedUser {
  user: any;
  sockets: Map<string, { room: string; lastSeen: Date }>;
  lastSeen: Date;
}

export class ConnectionManager {
  private connectedUsers = new Map<number, ConnectedUser>();

  addUser(userId: number, user: any, socketId: string, room: string) {
    const existing = this.connectedUsers.get(userId);
    
    if (existing) {
      existing.sockets.set(socketId, { room, lastSeen: new Date() });
      existing.lastSeen = new Date();
    } else {
      const sockets = new Map<string, { room: string; lastSeen: Date }>();
      sockets.set(socketId, { room, lastSeen: new Date() });
      
      this.connectedUsers.set(userId, {
        user,
        sockets,
        lastSeen: new Date(),
      });
    }
  }

  removeSocket(userId: number, socketId: string) {
    const entry = this.connectedUsers.get(userId);
    if (entry) {
      entry.sockets.delete(socketId);
      if (entry.sockets.size === 0) {
        this.connectedUsers.delete(userId);
      }
    }
  }

  updateUser(userId: number, updates: any) {
    const entry = this.connectedUsers.get(userId);
    if (entry) {
      entry.user = { ...entry.user, ...updates };
      entry.lastSeen = new Date();
    }
  }

  getUsersInRoom(roomId: string): any[] {
    const userMap = new Map<number, any>();
    
    for (const [_, entry] of this.connectedUsers.entries()) {
      for (const socketMeta of entry.sockets.values()) {
        if (socketMeta.room === roomId && entry.user?.id && entry.user?.username) {
          userMap.set(entry.user.id, entry.user);
          break;
        }
      }
    }
    
    return Array.from(userMap.values());
  }

  getUserSocketCount(userId: number): number {
    const entry = this.connectedUsers.get(userId);
    return entry?.sockets.size || 0;
  }

  getUser(userId: number): ConnectedUser | undefined {
    return this.connectedUsers.get(userId);
  }

  getAllUsers(): Map<number, ConnectedUser> {
    return this.connectedUsers;
  }

  cleanup() {
    const now = Date.now();
    const timeout = 5 * 60 * 1000; // 5 minutes
    
    for (const [userId, entry] of this.connectedUsers.entries()) {
      if (now - entry.lastSeen.getTime() > timeout) {
        this.connectedUsers.delete(userId);
      }
    }
  }
}

export const connectionManager = new ConnectionManager();
import type { Socket } from 'socket.io';

export interface CustomSocket extends Socket {
  userId?: number;
  username?: string;
  userType?: string;
  isAuthenticated?: boolean;
  currentRoom?: string | null;
}

export interface SocketError {
  message: string;
  code?: string;
  details?: any;
}
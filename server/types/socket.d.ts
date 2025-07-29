import { Socket as IOSocket } from 'socket.io';

declare module 'socket.io' {
  interface Socket {
    userId?: number;
    username?: string;
  }
}
/**
 * أنواع Socket.IO المخصصة لحل مشاكل TypeScript
 */

import type { Socket as BaseSocket } from 'socket.io';

// إعادة تصدير الأنواع الأساسية
export interface CustomSocket extends BaseSocket {
  userId?: number;
  username?: string;
  userType?: string;
  isAuthenticated?: boolean;
  currentRoom?: string | null;
  deviceId?: string;
  isReconnectAuth?: boolean;
}

// أنواع إضافية للأحداث
export interface ServerToClientEvents {
  message: (data: any) => void;
  socketConnected: (data: any) => void;
  authenticated: (data: any) => void;
  error: (data: any) => void;
  client_pong: (data: any) => void;
  roomUpdate: (data: any) => void;
  chatLockUpdated: (data: any) => void;
  micRequested: (data: any) => void;
  micApproved: (data: any) => void;
  micRejected: (data: any) => void;
  speakerRemoved: (data: any) => void;
  'webrtc-offer': (data: any) => void;
  'webrtc-answer': (data: any) => void;
  'webrtc-ice-candidate': (data: any) => void;
  privateMessage: (data: any) => void;
  kicked: (data: any) => void;
  blocked: (data: any) => void;
  newNotification: (data: any) => void;
  userDisconnected: (data: any) => void;
  userConnected: (data: any) => void;
}

export interface ClientToServerEvents {
  auth: (data: any) => void;
  joinRoom: (data: any) => void;
  leaveRoom: (data: any) => void;
  publicMessage: (data: any) => void;
  typing: (data: any) => void;
  privateTyping: (data: any) => void;
  client_ping: () => void;
  'webrtc-offer': (data: any) => void;
  'webrtc-answer': (data: any) => void;
  'webrtc-ice-candidate': (data: any) => void;
  user_avatar_updated: (data: any) => void;
  disconnect: (reason?: string) => void;
  reconnect: () => void;
  pong: (latency: number) => void;
  error: (error: any) => void;
}

export interface InterServerEvents {
  // أحداث بين الخوادم إذا كان هناك clustering
}

export interface SocketData {
  userId?: number;
  username?: string;
  userType?: string;
  deviceId?: string;
}
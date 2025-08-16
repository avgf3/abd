import type { Server as HttpServer } from "http";

import type { Socket } from "socket.io";
import { Server as IOServer } from "socket.io";

import { moderationSystem } from "./moderation";
import { sanitizeInput, validateMessageContent } from "./security";
import { pointsService } from "./services/pointsService";
import { roomMessageService } from "./services/roomMessageService";
import { roomService } from "./services/roomService";
import { storage } from "./storage";
import { sanitizeUsersArray } from "./utils/data-sanitizer";
import { getClientIpFromHeaders, getDeviceIdFromHeaders } from "./utils/device";

interface CustomSocket extends Socket {
  userId?: number;
  username?: string;
  userType?: string;
  isAuthenticated?: boolean;
  currentRoom?: string | null;
}

const GENERAL_ROOM = "general";

// Track connected users and their sockets/rooms
const connectedUsers = new Map<number, {
  user: any,
  sockets: Map<string, { room: string; lastSeen: Date }>,
  lastSeen: Date
}>();

function buildOnlineUsersForRoom(roomId: string) {
  const userMap = new Map<number, any>();
  for (const { user, sockets } of connectedUsers.values()) {
    for (const { room } of sockets.values()) {
      if (room === roomId && user && user.id && user.username && user.userType) {
        userMap.set(user.id, user);
        break;
      }
    }
  }
  return sanitizeUsersArray(Array.from(userMap.values()));
}

async function joinRoom(io: IOServer, socket: CustomSocket, userId: number, username: string, roomId: string) {
  // Leave previous room on this socket if any
  if (socket.currentRoom && socket.currentRoom !== roomId) {
    try {
      socket.leave(`room_${socket.currentRoom}`);
      io.to(`room_${socket.currentRoom}`).emit('message', {
        type: 'userLeftRoom',
        username,
        userId,
        roomId: socket.currentRoom
      });
    } catch {}
  }

  // Join the new room
  socket.join(`room_${roomId}`);
  socket.currentRoom = roomId;

  try { await roomService.joinRoom(userId, roomId); } catch {}

  // Update connectedUsers room for this socket
  const entry = connectedUsers.get(userId);
  if (entry) {
    entry.sockets.set(socket.id, { room: roomId, lastSeen: new Date() });
    entry.lastSeen = new Date();
    connectedUsers.set(userId, entry);
  }

  // Notify others in room
  socket.to(`room_${roomId}`).emit('message', {
    type: 'userJoinedRoom',
    username,
    userId,
    roomId
  });

  // Send confirmation with current users list
  const users = buildOnlineUsersForRoom(roomId);
  socket.emit('message', { type: 'roomJoined', roomId, users });

  // Send last 10 messages for room
  try {
    const recentMessages = await roomMessageService.getLatestRoomMessages(roomId, 10);
    socket.emit('message', { type: 'roomMessages', roomId, messages: recentMessages });
  } catch {}
}

async function leaveRoom(io: IOServer, socket: CustomSocket, userId: number, username: string, roomId: string) {
  try { socket.leave(`room_${roomId}`); } catch {}
  try { await roomService.leaveRoom(userId, roomId); } catch {}

  if (socket.currentRoom === roomId) socket.currentRoom = null;

  socket.emit('message', { type: 'roomLeft', roomId });
  socket.to(`room_${roomId}`).emit('message', {
    type: 'userLeftRoom',
    username,
    userId,
    roomId
  });

  // Push updated online users for the room
  const users = buildOnlineUsersForRoom(roomId);
  io.to(`room_${roomId}`).emit('message', { type: 'onlineUsers', users, roomId, source: 'leave' });
}

let ioInstance: IOServer | null = null;

export function getIO(): IOServer {
  if (!ioInstance) throw new Error('Socket.IO is not initialized yet');
  return ioInstance;
}

export function setupRealtime(httpServer: HttpServer): IOServer {
  const io = new IOServer(httpServer, {
    cors: {
      origin: (_origin, callback) => callback(null, true),
      methods: ["GET", "POST"],
      credentials: true,
    },
    path: "/socket.io",
    transports: ["websocket", "polling"],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
    upgradeTimeout: 10000,
    allowUpgrades: true,
    cookie: false,
    serveClient: false,
    maxHttpBufferSize: 1e6,
    allowRequest: (req, callback) => {
      try {
        const originHeader = req.headers.origin || '';
        const hostHeader = req.headers.host || '';
        const envOrigins = [
          process.env.RENDER_EXTERNAL_URL,
          process.env.FRONTEND_URL,
          process.env.CORS_ORIGIN,
        ].filter(Boolean) as string[];
        const envHosts = envOrigins.map(u => { try { return new URL(u).host; } catch { return ''; } }).filter(Boolean);
        const originHost = (() => { try { return originHeader ? new URL(originHeader).host : ''; } catch { return ''; } })();
        const isDev = process.env.NODE_ENV !== 'production';
        const isSameHost = originHost && hostHeader && originHost === hostHeader;
        const isEnvAllowed = originHost && envHosts.includes(originHost);
        callback(null, isDev || isSameHost || isEnvAllowed);
      } catch {
        callback(null, false);
      }
    },
  });

  ioInstance = io;

  io.on('connection', (rawSocket) => {
    const socket = rawSocket as CustomSocket;

    // Basic ping/pong to keep alive
    socket.on('client_ping', () => {
      socket.emit('client_pong', { t: Date.now() });
    });

    // Pre-connection checks
    const clientIP = getClientIpFromHeaders(socket.handshake.headers as any, socket.handshake.address as any);
    const deviceId = getDeviceIdFromHeaders(socket.handshake.headers as any);
    if (moderationSystem.isBlocked(clientIP, deviceId)) {
      socket.emit('error', { type: 'error', message: 'جهازك أو عنوان IP الخاص بك محجوب من الدردشة', action: 'device_blocked' });
      socket.disconnect(true);
      return;
    }

    let isAuthenticated = false;

    socket.emit('socketConnected', {
      message: 'متصل بنجاح',
      socketId: socket.id,
      timestamp: new Date().toISOString()
    });

    socket.on('auth', async (payload: { userId?: number; username?: string; userType?: string; reconnect?: boolean }) => {
      // السماح بإعادة المصادقة إذا كان المستخدم مختلفاً
      if (isAuthenticated && payload.userId && socket.userId && payload.userId !== socket.userId) {
        // مستخدم مختلف يحاول المصادقة - نظف البيانات القديمة
        try {
          const oldUserId = socket.userId;
          const oldEntry = connectedUsers.get(oldUserId);
          if (oldEntry) {
            oldEntry.sockets.delete(socket.id);
            if (oldEntry.sockets.size === 0) {
              connectedUsers.delete(oldUserId);
              await storage.setUserOnlineStatus(oldUserId, false);
            }
          }
          // مغادرة الغرف القديمة
          socket.leave(oldUserId.toString());
          if (socket.currentRoom) {
            socket.leave(`room_${socket.currentRoom}`);
          }
        } catch {}
        
        // إعادة تعيين حالة المصادقة
        isAuthenticated = false;
        socket.userId = undefined;
        socket.username = undefined;
        socket.userType = undefined;
        socket.isAuthenticated = false;
      }
      
      if (isAuthenticated) return;
      
      try {
        let user: any | undefined;
        if (payload.userId) {
          user = await storage.getUser(payload.userId);
          if (!user) { socket.emit('error', { message: 'المستخدم غير موجود' }); return; }
          const status = await moderationSystem.checkUserStatus(user.id);
          if (status.isBlocked) {
            socket.emit('error', { type: 'error', message: 'أنت محجوب نهائياً من الدردشة', action: 'blocked' });
            socket.disconnect(true);
            return;
          }
          if (status.isBanned && !status.canJoin) {
            socket.emit('error', { type: 'error', message: status.reason || 'أنت مطرود من الدردشة', action: 'banned', timeLeft: status.timeLeft });
            socket.disconnect(true);
            return;
          }
        } else if (payload.username) {
          const safeUsername = String(payload.username).trim();
          const validName = /^[\u0600-\u06FFa-zA-Z0-9_]{3,20}$/.test(safeUsername);
          if (!validName) { socket.emit('error', { message: 'اسم مستخدم غير صالح' }); return; }
          const existing = await storage.getUserByUsername(safeUsername);
          if (existing) { socket.emit('error', { message: 'الرجاء تسجيل الدخول باستخدام الحساب' }); return; }
          const requestedType = String(payload.userType || 'guest').toLowerCase();
          if (requestedType !== 'guest') { socket.emit('error', { message: 'غير مسموح بإنشاء حسابات بامتيازات عبر Socket' }); return; }
          user = await storage.createUser({
            username: safeUsername,
            userType: 'guest',
            role: 'guest',
            isOnline: true,
            joinDate: new Date(),
            createdAt: new Date()
          });
        } else {
          socket.emit('error', { message: 'بيانات المصادقة غير مكتملة' });
          return;
        }

        socket.userId = user.id;
        socket.username = user.username;
        socket.userType = user.userType;
        socket.isAuthenticated = true;
        isAuthenticated = true;

        try { socket.join(user.id.toString()); } catch {}
        try { await storage.setUserOnlineStatus(user.id, true); } catch {}

        // Track connection
        const existing = connectedUsers.get(user.id);
        if (!existing) {
          connectedUsers.set(user.id, {
            user,
            sockets: new Map([[socket.id, { room: GENERAL_ROOM, lastSeen: new Date() }]]),
            lastSeen: new Date()
          });
        } else {
          existing.user = user;
          existing.sockets.set(socket.id, { room: GENERAL_ROOM, lastSeen: new Date() });
          existing.lastSeen = new Date();
          connectedUsers.set(user.id, existing);
        }

        // Auto join general room
        await joinRoom(io, socket, user.id, user.username, GENERAL_ROOM);

        socket.emit('authenticated', { message: 'تم الاتصال بنجاح', user });
      } catch (err) {
        socket.emit('error', { message: 'خطأ في المصادقة' });
      }
    });

    socket.on('requestOnlineUsers', () => {
      if (!socket.isAuthenticated) return;
      const roomId = socket.currentRoom || GENERAL_ROOM;
      const users = buildOnlineUsersForRoom(roomId);
      socket.emit('message', { type: 'onlineUsers', users, roomId, source: 'request' });
    });

    socket.on('joinRoom', async (data) => {
      if (!socket.userId) { socket.emit('message', { type: 'error', message: 'يجب تسجيل الدخول أولاً' }); return; }
      const roomId = (data && data.roomId) ? String(data.roomId) : GENERAL_ROOM;
      const username = socket.username || `User#${socket.userId}`;
      try {
        // If switching, also refresh previous room list
        const previousRoom = socket.currentRoom;
        await joinRoom(io, socket, socket.userId, username, roomId);
        if (previousRoom && previousRoom !== roomId) {
          const prevUsers = buildOnlineUsersForRoom(previousRoom);
          io.to(`room_${previousRoom}`).emit('message', { type: 'onlineUsers', users: prevUsers, roomId: previousRoom, source: 'switch_room' });
        }
      } catch (e) {
        socket.emit('message', { type: 'error', message: 'فشل الانضمام للغرفة' });
      }
    });

    socket.on('leaveRoom', async (data) => {
      if (!socket.userId) return;
      const roomId = (data && data.roomId) ? String(data.roomId) : (socket.currentRoom || GENERAL_ROOM);
      const username = socket.username || `User#${socket.userId}`;
      try { await leaveRoom(io, socket, socket.userId, username, roomId); } catch {
        socket.emit('message', { type: 'error', message: 'خطأ في مغادرة الغرفة' });
      }
    });

    socket.on('publicMessage', async (data) => {
      try {
        if (!socket.userId) return;
        const roomId = data?.roomId || socket.currentRoom || GENERAL_ROOM;

        const status = await moderationSystem.checkUserStatus(socket.userId);
        if (!status.canChat) {
          socket.emit('message', { type: 'error', message: status.reason || 'غير مسموح بإرسال الرسائل حالياً' });
          return;
        }

        const sanitizedContent = sanitizeInput(String(data?.content || ''));
        const contentCheck = validateMessageContent(sanitizedContent);
        if (!contentCheck.isValid) {
          socket.emit('message', { type: 'error', message: contentCheck.reason });
          return;
        }

        const created = await roomMessageService.sendMessage({
          senderId: socket.userId,
          roomId,
          content: sanitizedContent,
          messageType: data?.messageType || 'text',
          isPrivate: false,
        });
        if (!created) { socket.emit('message', { type: 'error', message: 'فشل في إرسال الرسالة' }); return; }

        const sender = await storage.getUser(socket.userId);
        io.to(`room_${roomId}`).emit('message', { type: 'newMessage', message: { ...created, sender, roomId } });

        // Points/achievements (non-blocking)
        try {
          const pointsResult = await pointsService.addMessagePoints(socket.userId);
          if (pointsResult?.leveledUp) {
            socket.emit('message', { type: 'levelUp', oldLevel: pointsResult.oldLevel, newLevel: pointsResult.newLevel, levelInfo: pointsResult.levelInfo });
          }
        } catch {}
      } catch (e) {
        socket.emit('message', { type: 'error', message: 'خطأ في إرسال الرسالة' });
      }
    });

    socket.on('typing', (data) => {
      const isTyping = !!data?.isTyping;
      const roomId = socket.currentRoom || GENERAL_ROOM;
      io.to(`room_${roomId}`).emit('message', { type: 'typing', userId: socket.userId, username: socket.username, isTyping, roomId });
    });

    // Basic WebRTC relays scoped to same room
    socket.on('webrtc-offer', (payload) => {
      try {
        if (!socket.userId) return;
        const { roomId, targetUserId, sdp, senderId } = payload || {};
        if (!roomId || !targetUserId || !sdp || !senderId) return;
        const currentRoom = socket.currentRoom || GENERAL_ROOM;
        if (currentRoom !== roomId) return;
        io.to(targetUserId.toString()).emit('webrtc-offer', { roomId, sdp, senderId });
      } catch {}
    });

    socket.on('webrtc-answer', (payload) => {
      try {
        if (!socket.userId) return;
        const { roomId, targetUserId, sdp, senderId } = payload || {};
        if (!roomId || !targetUserId || !sdp || !senderId) return;
        const currentRoom = socket.currentRoom || GENERAL_ROOM;
        if (currentRoom !== roomId) return;
        io.to(targetUserId.toString()).emit('webrtc-answer', { roomId, sdp, senderId });
      } catch {}
    });

    socket.on('webrtc-ice-candidate', (payload) => {
      try {
        if (!socket.userId) return;
        const { roomId, targetUserId, candidate, senderId } = payload || {};
        if (!roomId || !targetUserId || !candidate || !senderId) return;
        const currentRoom = socket.currentRoom || GENERAL_ROOM;
        if (currentRoom !== roomId) return;
        io.to(targetUserId.toString()).emit('webrtc-ice-candidate', { roomId, candidate, senderId });
      } catch {}
    });

    socket.on('disconnect', async () => {
      try {
        const userId = socket.userId;
        if (!userId) return;
        const entry = connectedUsers.get(userId);
        if (entry) {
          entry.sockets.delete(socket.id);
          entry.lastSeen = new Date();
          if (entry.sockets.size === 0) {
            connectedUsers.delete(userId);
            try { await storage.setUserOnlineStatus(userId, false); } catch {}
            // Update any room the user was in last (best effort)
            const lastRoom = socket.currentRoom || GENERAL_ROOM;
            const users = buildOnlineUsersForRoom(lastRoom);
            io.to(`room_${lastRoom}`).emit('message', { type: 'onlineUsers', users, roomId: lastRoom, source: 'disconnect' });
          } else {
            connectedUsers.set(userId, entry);
          }
        }
      } catch {}
    });
  });

  return io;
}
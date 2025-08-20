import type { Server as HttpServer } from 'http';

import type { Socket } from 'socket.io';
import { Server as IOServer } from 'socket.io';

import { moderationSystem } from './moderation';
import { sanitizeInput, validateMessageContent } from './security';
import { pointsService } from './services/pointsService';
import { roomMessageService } from './services/roomMessageService';
import { roomService } from './services/roomService';
import { storage } from './storage';
import { sanitizeUsersArray } from './utils/data-sanitizer';
import { getClientIpFromHeaders, getDeviceIdFromHeaders } from './utils/device';
import { verifyAuthToken } from './utils/auth-token';

interface CustomSocket extends Socket {
  userId?: number;
  username?: string;
  userType?: string;
  isAuthenticated?: boolean;
  currentRoom?: string | null;
}

const GENERAL_ROOM = 'general';

// Track connected users and their sockets/rooms
const connectedUsers = new Map<
  number,
  {
    user: any;
    sockets: Map<string, { room: string; lastSeen: Date }>;
    lastSeen: Date;
  }
>();

export function updateConnectedUserCache(user: any) {
  try {
    if (!user || !user.id) return;
    const entry = connectedUsers.get(user.id);
    if (entry) {
      entry.user = { ...entry.user, ...user };
      entry.lastSeen = new Date();
      connectedUsers.set(user.id, entry);
    }
  } catch {}
}

// بناء قائمة المتصلين بكفاءة اعتماداً على sockets المسجلة
async function buildOnlineUsersForRoom(roomId: string) {
  const userMap = new Map<number, any>();
  for (const [_, entry] of connectedUsers.entries()) {
    // تحقق سريع عبر sockets دون مسح كامل
    for (const socketMeta of entry.sockets.values()) {
      if (
        socketMeta.room === roomId &&
        entry.user &&
        entry.user.id &&
        entry.user.username &&
        entry.user.userType
      ) {
        userMap.set(entry.user.id, entry.user);
        break;
      }
    }
  }
  const { sanitizeUsersArray } = await import('./utils/data-sanitizer');
  const sanitized = sanitizeUsersArray(Array.from(userMap.values()));
  return sanitized.map((u: any) => {
    try {
      const versionTag = (u as any).avatarHash || (u as any).avatarVersion;
      if (
        u?.profileImage &&
        typeof u.profileImage === 'string' &&
        !u.profileImage.startsWith('data:') &&
        versionTag &&
        !String(u.profileImage).includes('?v=')
      ) {
        return { ...u, profileImage: `${u.profileImage}?v=${versionTag}` };
      }
    } catch {}
    return u;
  });
}

async function joinRoom(
  io: IOServer,
  socket: CustomSocket,
  userId: number,
  username: string,
  roomId: string
) {
  // Leave previous room on this socket if any
  if (socket.currentRoom && socket.currentRoom !== roomId) {
    try {
      socket.leave(`room_${socket.currentRoom}`);
      io.to(`room_${socket.currentRoom}`).emit('message', {
        type: 'userLeftRoom',
        username,
        userId,
        roomId: socket.currentRoom,
      });
    } catch {}
  }

  // Join the new room
  socket.join(`room_${roomId}`);
  socket.currentRoom = roomId;

  try {
    await roomService.joinRoom(userId, roomId);
  } catch {}

  // Update connectedUsers room for this socket
  const entry = connectedUsers.get(userId);
  if (entry) {
    entry.sockets.set(socket.id, { room: roomId, lastSeen: new Date() });
    entry.lastSeen = new Date();
    connectedUsers.set(userId, entry);
  }

  // Notify others in room (مقتصد، ثم بث قائمة محدثة)
  socket.to(`room_${roomId}`).emit('message', { type: 'userJoinedRoom', username, userId, roomId });

  // Send confirmation with current users list
  const users = await buildOnlineUsersForRoom(roomId);
  socket.emit('message', { type: 'roomJoined', roomId, users });

  // رسائل حديثة (تجنب التكرار عند الانضمام السريع): لا داعي إذا لم تتغير الغرفة فعلياً
  try {
    const recentMessages = await roomMessageService.getLatestRoomMessages(roomId, 10);
    socket.emit('message', { type: 'roomMessages', roomId, messages: recentMessages });
  } catch {}
}

async function leaveRoom(
  io: IOServer,
  socket: CustomSocket,
  userId: number,
  username: string,
  roomId: string
) {
  try {
    socket.leave(`room_${roomId}`);
  } catch {}
  try {
    await roomService.leaveRoom(userId, roomId);
  } catch {}

  if (socket.currentRoom === roomId) socket.currentRoom = null;

  socket.emit('message', { type: 'roomLeft', roomId });
  socket.to(`room_${roomId}`).emit('message', {
    type: 'userLeftRoom',
    username,
    userId,
    roomId,
  });

  // Push updated online users for the room
  const users = await buildOnlineUsersForRoom(roomId);
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
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/socket.io',
    transports: ['websocket', 'polling'],
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
        const envHosts = envOrigins
          .map((u) => {
            try {
              return new URL(u).host;
            } catch {
              return '';
            }
          })
          .filter(Boolean);
        const originHost = (() => {
          try {
            return originHeader ? new URL(originHeader).host : '';
          } catch {
            return '';
          }
        })();
        const isDev = process.env.NODE_ENV !== 'production';
        const isSameHost = originHost && hostHeader && originHost === hostHeader;
        const isEnvAllowed = originHost && envHosts.includes(originHost);

        // Early block by IP/device before accepting socket transport
        const ip = (
          (req.headers['x-forwarded-for'] as string) ||
          (req.headers['x-real-ip'] as string) ||
          (req as any).connection?.remoteAddress ||
          'unknown'
        )
          .split(',')[0]
          .trim();
        const authDeviceId = (req as any).auth?.deviceId;
        const deviceId =
          typeof authDeviceId === 'string' && authDeviceId.trim().length > 0
            ? authDeviceId.trim()
            : (req.headers['x-device-id'] as string) || 'unknown';
        if (moderationSystem.isBlocked(ip, deviceId)) {
          return callback(null, false);
        }

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
    const clientIP = getClientIpFromHeaders(
      socket.handshake.headers as any,
      socket.handshake.address as any
    );
    const authDeviceId = (socket.handshake as any).auth?.deviceId;
    const deviceId =
      typeof authDeviceId === 'string' && authDeviceId.trim().length > 0
        ? authDeviceId.trim()
        : getDeviceIdFromHeaders(socket.handshake.headers as any);
    if (moderationSystem.isBlocked(clientIP, deviceId)) {
      socket.emit('error', {
        type: 'error',
        message: 'جهازك أو عنوان IP الخاص بك محجوب من الدردشة',
        action: 'device_blocked',
      });
      socket.disconnect(true);
      return;
    }

    let isAuthenticated = false;

    socket.emit('socketConnected', {
      message: 'متصل بنجاح',
      socketId: socket.id,
      timestamp: new Date().toISOString(),
    });

    // Helper to extract bearer token or cookie-based auth token from handshake/headers
    const getTokenFromHeaders = (): string | null => {
      try {
        const headers = socket.handshake.headers as any;
        const auth = headers['authorization'];
        if (typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')) {
          return auth.slice(7).trim();
        }
        const cookieHeader: string | undefined = headers['cookie'];
        if (cookieHeader && typeof cookieHeader === 'string') {
          const parts = cookieHeader.split(';');
          for (const part of parts) {
            const idx = part.indexOf('=');
            if (idx === -1) continue;
            const k = part.slice(0, idx).trim();
            const v = part.slice(idx + 1).trim();
            if (k === 'auth_token') {
              try {
                return decodeURIComponent(v);
              } catch {
                return v;
              }
            }
          }
        }
      } catch {}
      return null;
    };

    socket.on(
      'auth',
      async (payload: {
        userId?: number;
        username?: string;
        userType?: string;
        reconnect?: boolean;
        token?: string;
      }) => {
        // السماح بإعادة المصادقة إذا كان المستخدم مختلفاً
        if (
          isAuthenticated &&
          payload.userId &&
          socket.userId &&
          payload.userId !== socket.userId
        ) {
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
          // Enforce token-based authentication: get token from Authorization or cookie or payload
          const bearerOrCookieToken = getTokenFromHeaders() || (payload as any)?.token || null;
          const verified = bearerOrCookieToken ? verifyAuthToken(bearerOrCookieToken) : null;
          if (!verified?.userId) {
            socket.emit('error', { message: 'المصادقة مطلوبة', action: 'unauthorized' });
            socket.disconnect(true);
            return;
          }

          // If payload.userId is provided, it MUST match the verified token subject
          if (payload.userId && Number(payload.userId) !== Number(verified.userId)) {
            socket.emit('error', { message: 'عدم تطابق الهوية', action: 'unauthorized' });
            socket.disconnect(true);
            return;
          }

          // Load user strictly by verified token's userId
          const user = await storage.getUser(verified.userId);
          if (!user) {
            socket.emit('error', { message: 'المستخدم غير موجود' });
            socket.disconnect(true);
            return;
          }
          const status = await moderationSystem.checkUserStatus(user.id);
          if (status.isBlocked) {
            socket.emit('error', {
              type: 'error',
              message: 'أنت محجوب نهائياً من الدردشة',
              action: 'blocked',
            });
            socket.disconnect(true);
            return;
          }
          if (status.isBanned && !status.canJoin) {
            socket.emit('error', {
              type: 'error',
              message: status.reason || 'أنت مطرود من الدردشة',
              action: 'banned',
              timeLeft: status.timeLeft,
            });
            socket.disconnect(true);
            return;
          }

          // Update last known IP/device for this user
          try {
            const connectIP = getClientIpFromHeaders(
              socket.handshake.headers as any,
              socket.handshake.address as any
            );
            const authDeviceId2 = (socket.handshake as any).auth?.deviceId;
            const connectDevice =
              typeof authDeviceId2 === 'string' && authDeviceId2.trim().length > 0
                ? authDeviceId2.trim()
                : getDeviceIdFromHeaders(socket.handshake.headers as any);
            await storage.updateUser(user.id, { ipAddress: connectIP, deviceId: connectDevice });
          } catch {}

          socket.userId = user.id;
          socket.username = user.username;
          socket.userType = user.userType;
          socket.isAuthenticated = true;
          isAuthenticated = true;

          try {
            socket.join(user.id.toString());
          } catch {}
          try {
            await storage.setUserOnlineStatus(user.id, true);
          } catch {}

          // Track connection
          const existing = connectedUsers.get(user.id);
          if (!existing) {
            connectedUsers.set(user.id, {
              user,
              sockets: new Map([[socket.id, { room: GENERAL_ROOM, lastSeen: new Date() }]]),
              lastSeen: new Date(),
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
      }
    );

    socket.on('requestOnlineUsers', async () => {
      if (!socket.isAuthenticated) return;
      const roomId = socket.currentRoom || GENERAL_ROOM;
      const users = await buildOnlineUsersForRoom(roomId);
      socket.emit('message', { type: 'onlineUsers', users, roomId, source: 'request' });
    });

    // انضمام للغرفة مع منع السبام والتكرار السريع
    let lastJoinAt = 0;
    socket.on('joinRoom', async (data) => {
      if (!socket.userId) {
        socket.emit('message', { type: 'error', message: 'يجب تسجيل الدخول أولاً' });
        return;
      }
      const roomId = data && data.roomId ? String(data.roomId) : GENERAL_ROOM;
      const username = socket.username || `User#${socket.userId}`;
      try {
        // منع الانضمام المتكرر لنفس الغرفة أو الطلبات المتقاربة جداً
        const now = Date.now();
        if (socket.currentRoom === roomId) {
          socket.emit('message', {
            type: 'roomJoined',
            roomId,
            users: await buildOnlineUsersForRoom(roomId),
          });
          return;
        }
        if (now - lastJoinAt < 500) {
          return;
        }
        lastJoinAt = now;
        // If switching, also refresh previous room list
        const previousRoom = socket.currentRoom;
        await joinRoom(io, socket, socket.userId, username, roomId);
        if (previousRoom && previousRoom !== roomId) {
          const prevUsers = await buildOnlineUsersForRoom(previousRoom);
          io.to(`room_${previousRoom}`).emit('message', {
            type: 'onlineUsers',
            users: prevUsers,
            roomId: previousRoom,
            source: 'switch_room',
          });
        }
      } catch (e) {
        socket.emit('message', { type: 'error', message: 'فشل الانضمام للغرفة' });
      }
    });

    socket.on('leaveRoom', async (data) => {
      if (!socket.userId) return;
      const roomId = data && data.roomId ? String(data.roomId) : socket.currentRoom || GENERAL_ROOM;
      const username = socket.username || `User#${socket.userId}`;
      try {
        await leaveRoom(io, socket, socket.userId, username, roomId);
      } catch {
        socket.emit('message', { type: 'error', message: 'خطأ في مغادرة الغرفة' });
      }
    });

    socket.on('publicMessage', async (data) => {
      try {
        if (!socket.userId) return;
        const roomId = data?.roomId || socket.currentRoom || GENERAL_ROOM;

        const status = await moderationSystem.checkUserStatus(socket.userId);
        if (!status.canChat) {
          socket.emit('message', {
            type: 'error',
            message: status.reason || 'غير مسموح بإرسال الرسائل حالياً',
          });
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
        if (!created) {
          socket.emit('message', { type: 'error', message: 'فشل في إرسال الرسالة' });
          return;
        }

        const sender = await storage.getUser(socket.userId);
        io.to(`room_${roomId}`).emit('message', {
          type: 'newMessage',
          message: { ...created, sender, roomId },
        });

        // Points/achievements (non-blocking)
        try {
          const pointsResult = await pointsService.addMessagePoints(socket.userId);
          if (pointsResult?.leveledUp) {
            socket.emit('message', {
              type: 'levelUp',
              oldLevel: pointsResult.oldLevel,
              newLevel: pointsResult.newLevel,
              levelInfo: pointsResult.levelInfo,
            });
          }
        } catch {}
      } catch (e) {
        socket.emit('message', { type: 'error', message: 'خطأ في إرسال الرسالة' });
      }
    });

    socket.on('typing', (data) => {
      const isTyping = !!data?.isTyping;
      const roomId = socket.currentRoom || GENERAL_ROOM;
      io.to(`room_${roomId}`).emit('message', {
        type: 'typing',
        userId: socket.userId,
        username: socket.username,
        isTyping,
        roomId,
      });
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
        io.to(targetUserId.toString()).emit('webrtc-ice-candidate', {
          roomId,
          candidate,
          senderId,
        });
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
            try {
              await storage.setUserOnlineStatus(userId, false);
            } catch {}
            // Update any room the user was in last (best effort)
            const lastRoom = socket.currentRoom || GENERAL_ROOM;
            const users = await buildOnlineUsersForRoom(lastRoom);
            io.to(`room_${lastRoom}`).emit('message', {
              type: 'onlineUsers',
              users,
              roomId: lastRoom,
              source: 'disconnect',
            });
          } else {
            connectedUsers.set(userId, entry);
          }
        }
      } catch {}
    });
  });

  return io;
}

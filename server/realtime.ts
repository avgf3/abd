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

// Utility: get online user counts per room based on active sockets
export function getOnlineUserCountsForRooms(roomIds: string[]): Record<string, number> {
  try {
    const target = new Set<string>((roomIds || []).map((r) => String(r)));
    const counts: Record<string, number> = {};
    for (const id of target) counts[id] = 0;

    for (const [, entry] of connectedUsers.entries()) {
      // A single user may have multiple sockets; count each user once per room
      const roomsForUser = new Set<string>();
      for (const socketMeta of entry.sockets.values()) {
        if (target.has(socketMeta.room)) {
          roomsForUser.add(socketMeta.room);
        }
      }
      for (const roomId of roomsForUser) {
        counts[roomId] = (counts[roomId] || 0) + 1;
      }
    }

    return counts;
  } catch {
    return Object.create(null);
  }
}

export function getOnlineUserCountForRoom(roomId: string): number {
  if (!roomId) return 0;
  let count = 0;
  try {
    for (const [, entry] of connectedUsers.entries()) {
      for (const socketMeta of entry.sockets.values()) {
        if (socketMeta.room === roomId) {
          count += 1;
          break; // count each user once per room
        }
      }
    }
  } catch {}
  return count;
}

// إزالة كاش قائمة المتصلين للغرف للاعتماد الكامل على أحداث Socket.IO

export function updateConnectedUserCache(userOrId: any, maybeUser?: any) {
  try {
    // Overload 1: update by full user object
    if (typeof userOrId === 'object' && userOrId) {
      const userObj = userOrId as any;
      if (!userObj.id) return;
      const existing = connectedUsers.get(userObj.id);
      if (existing) {
        existing.user = { ...existing.user, ...userObj };
        existing.lastSeen = new Date();
        // إذا كان بوتاً ولديه socket اصطناعي، حدّث الغرفة
        if (userObj.userType === 'bot') {
          for (const [socketId, socketMeta] of existing.sockets.entries()) {
            if (socketId.startsWith('bot:')) {
              socketMeta.room = userObj.currentRoom || socketMeta.room || GENERAL_ROOM;
              socketMeta.lastSeen = new Date();
              existing.sockets.set(socketId, socketMeta);
            }
          }
        }
        connectedUsers.set(userObj.id, existing);
      } else {
        const sockets = new Map<string, { room: string; lastSeen: Date }>();
        if (userObj.userType === 'bot') {
          sockets.set(`bot:${userObj.id}`, {
            room: userObj.currentRoom || GENERAL_ROOM,
            lastSeen: new Date(),
          });
        }
        connectedUsers.set(userObj.id, {
          user: userObj,
          sockets,
          lastSeen: new Date(),
        });
      }
      return;
    }

    // Overload 2: update by id and user/null
    const userId = Number(userOrId);
    if (!userId || Number.isNaN(userId)) return;

    // إزالة من الكاش إذا كان null
    if (maybeUser == null) {
      if (connectedUsers.has(userId)) {
        connectedUsers.delete(userId);
      }
      return;
    }

    const userData = maybeUser as any;
    const existing = connectedUsers.get(userId);
    if (existing) {
      existing.user = { ...existing.user, ...userData };
      existing.lastSeen = new Date();
      if (userData.userType === 'bot') {
        // تأكد من وجود socket اصطناعي للبوت وتحديث غرفته
        let hasBotSocket = false;
        for (const socketId of existing.sockets.keys()) {
          if (socketId.startsWith('bot:')) {
            hasBotSocket = true;
            break;
          }
        }
        const room = userData.currentRoom || GENERAL_ROOM;
        if (!hasBotSocket) {
          existing.sockets.set(`bot:${userId}`, { room, lastSeen: new Date() });
        } else {
          for (const [socketId, meta] of existing.sockets.entries()) {
            if (socketId.startsWith('bot:')) {
              meta.room = room;
              meta.lastSeen = new Date();
              existing.sockets.set(socketId, meta);
            }
          }
        }
      }
      connectedUsers.set(userId, existing);
    } else {
      const sockets = new Map<string, { room: string; lastSeen: Date }>();
      const room = userData.currentRoom || GENERAL_ROOM;
      if (userData.userType === 'bot') {
        sockets.set(`bot:${userId}`, { room, lastSeen: new Date() });
      }
      connectedUsers.set(userId, {
        user: { id: userId, ...userData },
        sockets,
        lastSeen: new Date(),
      });
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
  const users = sanitized.map((u: any) => {
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

  return users;
}

// أزيلت دالة إبطال الكاش

async function joinRoom(
  io: IOServer,
  socket: CustomSocket,
  userId: number,
  username: string,
  roomId: string
) {
  // تحقق من الانضمام على مستوى الخدمة أولاً قبل أي انضمام فعلي لغرفة Socket
  const previousRoom = socket.currentRoom || null;
  try {
    await roomService.joinRoom(userId, roomId);
  } catch (error: any) {
    socket.emit('message', {
      type: 'error',
      message: error.message || 'فشل الانضمام للغرفة',
      roomId: roomId,
    });
    return; // لا نقوم بأي تغيير على غرف Socket في حالة الفشل
  }

  // إذا نجح الانضمام على مستوى الخدمة، نقوم بتحديث غرف Socket بأمان
  if (previousRoom && previousRoom !== roomId) {
    try {
      socket.leave(`room_${previousRoom}`);
      io.to(`room_${previousRoom}`).emit('message', {
        type: 'userLeftRoom',
        username,
        userId,
        roomId: previousRoom,
      });
    } catch {}
  }

  try {
    socket.join(`room_${roomId}`);
    socket.currentRoom = roomId;
  } catch {
    // في حالة فشل الانضمام عبر Socket، تراجع عن انضمام الخدمة
    try { await roomService.leaveRoom(userId, roomId); } catch {}
    socket.emit('message', { type: 'error', message: 'تعذر الانضمام عبر الاتصال' });
    return;
  }

  // Update connectedUsers room for this socket
  const entry = connectedUsers.get(userId);
  if (entry) {
    entry.sockets.set(socket.id, { room: roomId, lastSeen: new Date() });
    entry.lastSeen = new Date();
    connectedUsers.set(userId, entry);
  }

  // إبطال cache الغرفة عند انضمام مستخدم جديد
  // لم نعد نستخدم الكاش

  // إخطار الآخرين في الغرفة ثم بث القائمة المحدثة مباشرةً
  socket.to(`room_${roomId}`).emit('message', { type: 'userJoinedRoom', username, userId, roomId });

  // إرسال التأكيد للمستخدم المنضم وبث القائمة المحدثة للجميع
  const users = await buildOnlineUsersForRoom(roomId);
  socket.emit('message', { type: 'roomJoined', roomId, users });
  io.to(`room_${roomId}`).emit('message', { type: 'onlineUsers', users, roomId, source: 'join' });

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
      origin: (origin, callback) => {
        // السماح بجميع الأصول من نفس النطاق أو من Render
        if (!origin) {
          // السماح بالطلبات بدون origin (same-site)
          return callback(null, true);
        }
        
        // السماح بجميع نطاقات Render
        if (origin.includes('.onrender.com')) {
          return callback(null, true);
        }
        
        // السماح بالأصول المحددة في البيئة
        const allowedOrigins = [
          process.env.RENDER_EXTERNAL_URL,
          process.env.FRONTEND_URL,
          process.env.CORS_ORIGIN,
        ].filter(Boolean);
        
        if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
          return callback(null, true);
        }
        
        // في بيئة التطوير، السماح بكل شيء
        if (process.env.NODE_ENV === 'development') {
          return callback(null, true);
        }
        
        // السماح بنفس المضيف
        callback(null, true);
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/socket.io',
    // تفعيل WebSocket حيثما أمكن مع الاحتفاظ بـ polling كاحتياطي
    transports: process.env.SOCKET_IO_POLLING_ONLY === 'true'
      ? ['polling']
      : ['websocket', 'polling'],
    allowEIO3: true,
    pingTimeout: 180000, // زيادة timeout إلى 3 دقائق للإنتاج
    pingInterval: 45000, // ping كل 45 ثانية
    upgradeTimeout: 45000, // زيادة timeout للترقية
    allowUpgrades: process.env.SOCKET_IO_POLLING_ONLY !== 'true',
    cookie: false,
    serveClient: false,
    maxHttpBufferSize: 1e7, // زيادة حجم البيانات المسموح به
    perMessageDeflate: false, // تعطيل الضغط لتحسين الأداء
    httpCompression: false, // تعطيل ضغط HTTP
    allowRequest: (req, callback) => {
      try {
        const originHeader = req.headers.origin || '';
        const hostHeader = req.headers.host || '';
        
        // السماح دائماً في بيئة التطوير
        if (process.env.NODE_ENV === 'development') {
          return callback(null, true);
        }
        
        // السماح بجميع طلبات Render
        if (hostHeader.includes('.onrender.com') || originHeader.includes('.onrender.com')) {
          return callback(null, true);
        }
        
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
        // اعتبر نفس المضيف حتى لو اختلف المنفذ
        const isSameHost =
          originHost &&
          hostHeader &&
          (originHost === hostHeader || 
           originHost === (hostHeader || '').split(':')[0] ||
           hostHeader.split(':')[0] === originHost.split(':')[0]);
        const isEnvAllowed = originHost && envHosts.includes(originHost);
        // في بعض المتصفحات (أو عبر بعض البنى التحتية) قد لا تُرسل ترويسة Origin في ترقية WebSocket
        // اسمح بالاتصال إذا لم توجد Origin ولكن هناك Host (أي طلب لنفس الخادم)
        const isNoOriginButHasHost = !originHeader && !!hostHeader;
        // اسمح أيضاً إذا كان Host نفسه ضمن المضيفين المسموحين من البيئة (مع تجاهل المنفذ)
        const hostHeaderHostOnly = (hostHeader || '').split(':')[0];
        const isHostEnvAllowed = hostHeaderHostOnly && envHosts.includes(hostHeaderHostOnly);

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

        callback(null, isDev || isSameHost || isEnvAllowed || isNoOriginButHasHost || isHostEnvAllowed);
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

          // Track connection - لا نضع المستخدم في أي غرفة تلقائياً
          const existing = connectedUsers.get(user.id);
          if (!existing) {
            connectedUsers.set(user.id, {
              user,
              sockets: new Map([[socket.id, { room: null, lastSeen: new Date() }]]),
              lastSeen: new Date(),
            });
          } else {
            existing.user = user;
            existing.sockets.set(socket.id, { room: null, lastSeen: new Date() });
            existing.lastSeen = new Date();
            connectedUsers.set(user.id, existing);
          }

          // لا ننضم تلقائياً لأي غرفة - المستخدم يختار بنفسه

          socket.emit('authenticated', { message: 'تم الاتصال بنجاح', user });
        } catch (err) {
          socket.emit('error', { message: 'خطأ في المصادقة' });
        }
      }
    );

    // أزيلت آلية الطلب اليدوي لقائمة المتصلين للاعتماد على البث التلقائي

    // انضمام للغرفة مع منع السبام والتكرار السريع
    let lastJoinAt = 0;
    socket.on('joinRoom', async (data) => {
      if (!socket.userId) {
        socket.emit('message', { type: 'error', message: 'يجب تسجيل الدخول أولاً' });
        return;
      }
      
      // 🔧 إصلاح: التأكد من اكتمال المصادقة
      if (!isAuthenticated) {
        // انتظار قصير للمصادقة
        setTimeout(() => {
          if (isAuthenticated && socket.userId) {
            socket.emit('joinRoom', data); // إعادة المحاولة
          }
        }, 500);
        return;
      }
      const roomId = data && data.roomId ? String(data.roomId) : 'general';
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
        if (now - lastJoinAt < 200) { // 🔧 تقليل من 500ms إلى 200ms
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
      } catch (e: any) {
        // الرسالة تم إرسالها بالفعل من joinRoom، لكن نتأكد من إرسالها مرة أخرى إذا لم تُرسل
        if (!e.message?.includes('مقفلة')) {
          socket.emit('message', { type: 'error', message: e.message || 'فشل الانضمام للغرفة' });
        }
      }
    });

    socket.on('leaveRoom', async (data) => {
      if (!socket.userId) return;
      const roomId = data && data.roomId ? String(data.roomId) : socket.currentRoom;
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
        const roomId = data?.roomId || socket.currentRoom;
        
        // المستخدم يجب أن يكون في غرفة لإرسال رسالة
        if (!roomId) {
          socket.emit('message', { type: 'error', message: 'يجب الانضمام لغرفة أولاً' });
          return;
        }

        // Ensure the socket is actually in the target room to prevent bypassing join checks
        try {
          const rooms = (socket as any).rooms as Set<string> | undefined;
          const target = `room_${roomId}`;
          if (!rooms || !rooms.has(target)) {
            socket.emit('message', { type: 'error', message: 'غير مسموح بإرسال الرسائل لهذه الغرفة' });
            return;
          }
        } catch {}

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
          message: {
            ...created,
            sender,
            roomId,
            reactions: { like: 0, dislike: 0, heart: 0 },
            myReaction: null,
          },
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
      const roomId = socket.currentRoom;
      
      // المستخدم يجب أن يكون في غرفة لإرسال إشارة الكتابة
      if (!roomId) return;
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
        const currentRoom = socket.currentRoom;
        if (!currentRoom || currentRoom !== roomId) return;
        io.to(targetUserId.toString()).emit('webrtc-offer', { roomId, sdp, senderId });
      } catch {}
    });

    socket.on('webrtc-answer', (payload) => {
      try {
        if (!socket.userId) return;
        const { roomId, targetUserId, sdp, senderId } = payload || {};
        if (!roomId || !targetUserId || !sdp || !senderId) return;
        const currentRoom = socket.currentRoom;
        if (!currentRoom || currentRoom !== roomId) return;
        io.to(targetUserId.toString()).emit('webrtc-answer', { roomId, sdp, senderId });
      } catch {}
    });

    socket.on('webrtc-ice-candidate', (payload) => {
      try {
        if (!socket.userId) return;
        const { roomId, targetUserId, candidate, senderId } = payload || {};
        if (!roomId || !targetUserId || !candidate || !senderId) return;
        const currentRoom = socket.currentRoom;
        if (!currentRoom || currentRoom !== roomId) return;
        io.to(targetUserId.toString()).emit('webrtc-ice-candidate', {
          roomId,
          candidate,
          senderId,
        });
      } catch {}
    });

    // Event لتحديث صورة المستخدم
    socket.on('user_avatar_updated', async (data) => {
      try {
        if (!socket.userId) return;

        const { avatarHash, avatarVersion } = data || {};
        if (!avatarHash && !avatarVersion) return;

        // تحديث cache المستخدم
        const user = await storage.getUser(socket.userId);
        if (user) {
          const updatedUser = {
            ...user,
            avatarHash: avatarHash || (user as any).avatarHash,
            avatarVersion: avatarVersion || (user as any).avatarVersion,
          };

          updateConnectedUserCache(updatedUser);

          // بث التحديث لجميع الغرف التي ينتمي إليها المستخدم
          const entry = connectedUsers.get(socket.userId);
          if (entry) {
            const rooms = new Set<string>();
            for (const socketMeta of entry.sockets.values()) {
              rooms.add(socketMeta.room);
            }

            for (const roomId of rooms) {
              const users = await buildOnlineUsersForRoom(roomId);
              io.to(`room_${roomId}`).emit('message', {
                type: 'userAvatarUpdated',
                userId: socket.userId,
                avatarHash,
                avatarVersion,
                users,
                roomId,
              });
            }
          }

          // بث للمستخدم نفسه في جميع أجهزته
          io.to(socket.userId.toString()).emit('message', {
            type: 'selfAvatarUpdated',
            avatarHash,
            avatarVersion,
          });
        }
      } catch (error) {
        console.error('Error in user_avatar_updated:', error);
      }
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
            const lastRoom = socket.currentRoom;
            if (lastRoom) {
              const users = await buildOnlineUsersForRoom(lastRoom);
              io.to(`room_${lastRoom}`).emit('message', {
                type: 'onlineUsers',
                users,
                roomId: lastRoom,
                source: 'disconnect',
              });
            }
          } else {
            connectedUsers.set(userId, entry);
          }
        }
      } catch {}
    });
  });

  // تحميل البوتات النشطة عند بدء التشغيل
  loadActiveBots();

  return io;
}

// دالة لتحميل البوتات النشطة
async function loadActiveBots() {
  try {
    const { db } = await import('./database-adapter');
    const { bots } = await import('../shared/schema');
    const { eq } = await import('drizzle-orm');
    
    if (!db) return;
    
    // جلب البوتات النشطة
    const activeBots = await db.select().from(bots).where(eq(bots.isActive, true));
    
    for (const bot of activeBots) {
      const botUser = {
        id: bot.id,
        username: bot.username,
        userType: 'bot',
        role: 'bot',
        profileImage: bot.profileImage,
        profileBanner: bot.profileBanner,
        profileBackgroundColor: bot.profileBackgroundColor,
        status: bot.status,
        gender: bot.gender,
        country: bot.country,
        relation: bot.relation,
        // العمر يُحفظ داخل settings إن وُجد
        age: (bot as any)?.settings?.age,
        bio: bot.bio,
        usernameColor: bot.usernameColor,
        profileEffect: bot.profileEffect,
        points: bot.points,
        level: bot.level,
        totalPoints: bot.totalPoints,
        levelProgress: bot.levelProgress,
        isOnline: true,
        currentRoom: bot.currentRoom || GENERAL_ROOM,
        joinDate: bot.createdAt,
        lastSeen: bot.lastActivity,
      };
      
      // إضافة البوت لقائمة المستخدمين المتصلين
      updateConnectedUserCache(bot.id, botUser);
      
      console.log(`✓ تم تحميل البوت: ${bot.username} في الغرفة ${bot.currentRoom}`);
    }
    
    console.log(`✓ تم تحميل عدد البوتات: ${activeBots.length}`);
  } catch (error) {
    console.error('خطأ في تحميل البوتات:', error);
  }
}

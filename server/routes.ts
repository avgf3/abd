import { createServer, type Server } from 'http';
import type { Express } from 'express';
import path from 'path';
import fs from 'fs';
import { promises as fsp } from 'fs';
import multer from 'multer';

import roomRoutes from './routes/rooms';
import messageRoutes from './routes/messages';
import privateMessageRoutes from './routes/privateMessages';

import { setupRealtime } from './realtime';
import { protect } from './middleware/enhancedSecurity';
import { databaseService } from './services/databaseService';
import { storage } from './storage';
import { sanitizeUserData } from './utils/data-sanitizer';
import { detectSexualImage } from './utils/adult-content';
import { messageLimiter } from './security';

function buildUserBroadcastPayload(user: any): any {
  if (!user) return null;
  const sanitized = sanitizeUserData(user);
  const payload: any = {
    id: sanitized.id,
    username: sanitized.username,
    userType: sanitized.userType,
    role: sanitized.role,
    usernameColor: sanitized.usernameColor,
    profileBackgroundColor: sanitized.profileBackgroundColor,
    profileEffect: sanitized.profileEffect,
    isOnline: sanitized.isOnline,
    lastSeen: sanitized.lastSeen,
    points: sanitized.points,
    level: sanitized.level,
    totalPoints: sanitized.totalPoints,
    levelProgress: sanitized.levelProgress,
  };
  try {
    if (
      sanitized.profileImage &&
      typeof sanitized.profileImage === 'string' &&
      !sanitized.profileImage.startsWith('data:')
    ) {
      const versionTag = (sanitized as any).avatarHash || (sanitized as any).avatarVersion;
      payload.profileImage = versionTag && !String(sanitized.profileImage).includes('?v=')
        ? `${sanitized.profileImage}?v=${versionTag}`
        : sanitized.profileImage;
    }
    if (
      sanitized.profileBanner &&
      typeof sanitized.profileBanner === 'string' &&
      !sanitized.profileBanner.startsWith('data:')
    ) {
      payload.profileBanner = sanitized.profileBanner;
    }
  } catch {}
  return payload;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const io = setupRealtime(httpServer);
  // make io available to routers that use req.app.get('io')
  app.set('io', io);

  // Mount split routers
  app.use('/api/rooms', roomRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('/api/private-messages', privateMessageRoutes);

  // Message image upload (DM/Room)
  const uploadStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), 'client', 'public', 'uploads', 'messages');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, `message-${uniqueSuffix}${ext}`);
    },
  });
  const messageImageUpload = multer({
    storage: uploadStorage,
    limits: { fileSize: 8 * 1024 * 1024, files: 1 },
    fileFilter: (req, file, cb) => {
      if ((file.mimetype || '').startsWith('image/')) return cb(null, true);
      return cb(new Error('نوع الملف غير مدعوم'));
    },
  });

  app.post(
    '/api/upload/message-image',
    protect.auth,
    messageLimiter,
    messageImageUpload.single('image'),
    async (req, res) => {
      try {
        if (!req.file) {
          return res
            .status(400)
            .json({ error: 'لم يتم رفع أي ملف', details: "أرسل الملف في الحقل 'image'" });
        }

        const { receiverId, roomId } = req.body as any;
        const parsedSenderId = (req as any).user?.id as number;

        if (!parsedSenderId || isNaN(parsedSenderId)) {
          try {
            await fsp.unlink(req.file.path);
          } catch {}
          return res.status(400).json({ error: 'senderId مطلوب' });
        }

        // Convert to base64 and moderate content
        let imageUrl: string;
        try {
          const fileBuffer = await fsp.readFile(req.file.path);
          try {
            const check = await detectSexualImage(fileBuffer);
            if (check.isSexual) {
              try { await fsp.unlink(req.file.path); } catch {}
              return res.status(400).json({ error: 'عذراً، لا يُسمح بالصور غير اللائقة' });
            }
          } catch {}
          const base64Image = fileBuffer.toString('base64');
          const mimeType = req.file.mimetype;
          imageUrl = `data:${mimeType};base64,${base64Image}`;
          await fsp.unlink(req.file.path);
        } catch (e) {
          imageUrl = `/uploads/messages/${req.file.filename}`;
        }

        if (receiverId) {
          const parsedReceiverId = parseInt(receiverId);
          // Block if receiver ignored sender
          try {
            const ignored = await storage.getIgnoredUsers(parsedReceiverId);
            if (Array.isArray(ignored) && ignored.includes(parsedSenderId)) {
              return res
                .status(403)
                .json({ error: 'هذا المستخدم قام بتجاهلك، لا يمكن إرسال رسالة' });
            }
          } catch {}
          const newMessage = await storage.createMessage({
            senderId: parsedSenderId,
            receiverId: parsedReceiverId,
            content: imageUrl,
            messageType: 'image',
            isPrivate: true,
            roomId: 'general',
          });
          const sender = await storage.getUser(parsedSenderId);
          const messagePayload = { ...newMessage, sender: buildUserBroadcastPayload(sender) };
          io.to(parsedReceiverId.toString()).emit('privateMessage', { message: messagePayload });
          io.to(parsedSenderId.toString()).emit('privateMessage', { message: messagePayload });
          return res.json({ success: true, imageUrl, message: messagePayload });
        }

        // Room image
        const targetRoomId = roomId && typeof roomId === 'string' ? roomId : 'general';
        try {
          const can = await databaseService.canSendInRoom(targetRoomId, parsedSenderId);
          if (!can.allowed) {
            return res.status(403).json({ error: 'غير مسموح لك بالإرسال في هذه الغرفة' });
          }
        } catch {}
        const newMessage = await storage.createMessage({
          senderId: parsedSenderId,
          content: imageUrl,
          messageType: 'image',
          isPrivate: false,
          roomId: targetRoomId,
        });
        const sender = await storage.getUser(parsedSenderId);
        io.to(`room_${targetRoomId}`).emit('message', {
          type: 'newMessage',
          roomId: targetRoomId,
          message: { ...newMessage, sender: buildUserBroadcastPayload(sender) },
          timestamp: new Date().toISOString(),
        });

        res.json({ success: true, imageUrl, message: { ...newMessage, sender } });
      } catch (error: any) {
        console.error('❌ خطأ في رفع صورة الرسالة:', error);
        res.status(500).json({ error: 'خطأ في رفع صورة الرسالة', details: error?.message });
      }
    }
  );

  // Minimal notifications endpoint (kept for client compatibility)
  app.get('/api/notifications/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (!userId || isNaN(userId)) return res.status(400).json({ notifications: [] });
      const notifications = await storage.getUserNotifications(userId);
      res.json({ notifications: notifications || [] });
    } catch (e) {
      res.status(500).json({ notifications: [] });
    }
  });

  return httpServer;
}


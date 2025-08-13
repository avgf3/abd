import { Router } from "express";
import { z } from "zod";
import { PrivateMessagesService } from "../services/privateMessagesService";
import { NotificationService } from "../services/notificationService";
import { protect as enhancedProtect } from "../middleware/enhancedSecurity";
import { messageLimiter } from "../security";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import sharp from "sharp";

const router = Router();

// Backwards-compat wrappers to keep original names
const protect = enhancedProtect.auth;
const rateLimiter = (_opts?: any) => messageLimiter;

// إعداد multer لرفع الملفات
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
      'audio/mpeg',
      'audio/ogg',
      'audio/wav',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('نوع الملف غير مدعوم'));
    }
  },
});

// Schemas للتحقق من البيانات
const createConversationSchema = z.object({
  type: z.enum(['direct', 'group']).default('direct'),
  participantId: z.number().optional(), // للمحادثات المباشرة
  name: z.string().optional(), // للمجموعات
  memberIds: z.array(z.number()).optional(), // للمجموعات
});

const sendMessageSchema = z.object({
  content: z.string().optional(),
  type: z.enum(['text', 'image', 'video', 'audio', 'file', 'location', 'sticker', 'gif']).default('text'),
  attachments: z.array(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
  replyToId: z.number().optional(),
  forwardedFromId: z.number().optional(),
  expiresInSeconds: z.number().optional(),
});

const updateTypingSchema = z.object({
  isTyping: z.boolean(),
});

const toggleReactionSchema = z.object({
  reaction: z.string().max(10),
});

export function createPrivateMessagesRouter(
  pmService: PrivateMessagesService,
  notificationService: NotificationService,
  io: any
) {
  // ==================== المحادثات ====================

  // إنشاء محادثة جديدة أو الحصول على محادثة موجودة
  router.post('/conversations', enhancedProtect.auth, messageLimiter, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { type, participantId, name, memberIds } = createConversationSchema.parse(req.body);

      let conversation;

      if (type === 'direct') {
        if (!participantId) {
          return res.status(400).json({ error: 'معرف المشارك مطلوب للمحادثات المباشرة' });
        }
        
        conversation = await pmService.findOrCreateDirectConversation(userId, participantId);
      } else {
        if (!name || !memberIds || memberIds.length === 0) {
          return res.status(400).json({ error: 'اسم المجموعة والأعضاء مطلوبون' });
        }

        conversation = await pmService.createGroupConversation(userId, name, memberIds);
      }

      res.json({ conversation });
    } catch (error) {
      console.error('خطأ في إنشاء المحادثة:', error);
      res.status(500).json({ error: 'فشل إنشاء المحادثة' });
    }
  });

  // الحصول على محادثات المستخدم
  router.get('/conversations', enhancedProtect.auth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { includeArchived, includeMuted, limit, offset } = req.query;

      const conversations = await pmService.getUserConversations(userId, {
        includeArchived: includeArchived === 'true',
        includeMuted: includeMuted === 'true',
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
      });

      res.json({ conversations });
    } catch (error) {
      console.error('خطأ في جلب المحادثات:', error);
      res.status(500).json({ error: 'فشل جلب المحادثات' });
    }
  });

  // ==================== الرسائل ====================

  // إرسال رسالة
  router.post('/conversations/:conversationId/messages', enhancedProtect.auth, messageLimiter, async (req, res) => {
    try {
      const userId = req.user!.id;
      const conversationId = parseInt(req.params.conversationId);
      const messageData = sendMessageSchema.parse(req.body);

      if (!messageData.content && messageData.type === 'text') {
        return res.status(400).json({ error: 'محتوى الرسالة مطلوب' });
      }

      const message = await pmService.sendMessage(conversationId, userId, messageData);

      // جلب بيانات المرسل والمحادثة للإرسال عبر Socket.IO
      const conversation = await pmService.getUserConversations(userId, { limit: 1 });
      const messageWithDetails = {
        ...message,
        sender: req.user,
        conversation: conversation[0]?.conversation,
      };

      // إرسال الرسالة لجميع المشاركين
      io.to(`conversation:${conversationId}`).emit('new_message', messageWithDetails);

      // إرسال إشعار للمشاركين الآخرين
      const participants = conversation[0]?.otherParticipants || [];
      for (const participant of participants) {
        if (participant.id !== userId) {
          await notificationService.createMessageNotification(
            participant.id,
            req.user!.username,
            userId,
            messageData.content?.substring(0, 100) || 'رسالة جديدة'
          );
        }
      }

      res.json({ message: messageWithDetails });
    } catch (error) {
      console.error('خطأ في إرسال الرسالة:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'فشل إرسال الرسالة' });
    }
  });

  // رفع وإرسال ملف
  router.post(
    '/conversations/:conversationId/messages/upload',
    enhancedProtect.auth,
    messageLimiter,
    upload.single('file'),
    async (req, res) => {
      try {
        const userId = req.user!.id;
        const conversationId = parseInt(req.params.conversationId);
        const file = req.file;

        if (!file) {
          return res.status(400).json({ error: 'لم يتم تحديد ملف' });
        }

        const fileId = uuidv4();
        let processedBuffer = file.buffer;
        let metadata: any = {
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
        };

        // معالجة الصور
        if (file.mimetype.startsWith('image/')) {
          const image = sharp(file.buffer);
          const imageMetadata = await image.metadata();
          
          // إنشاء نسخة مصغرة
          const thumbnail = await image
            .resize(200, 200, { fit: 'inside' })
            .jpeg({ quality: 80 })
            .toBuffer();

          // ضغط الصورة الأصلية إذا كانت كبيرة
          if (file.size > 2 * 1024 * 1024) {
            processedBuffer = await image
              .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
              .jpeg({ quality: 85 })
              .toBuffer();
          }

          metadata = {
            ...metadata,
            width: imageMetadata.width,
            height: imageMetadata.height,
            thumbnailDataUrl: `data:image/jpeg;base64,${thumbnail.toString('base64')}`,
          };
        }

        // حفظ الملف (في بيئة الإنتاج، يفضل استخدام خدمة تخزين سحابية)
        const fileUrl = `/uploads/${fileId}${path.extname(file.originalname)}`;
        // هنا يجب حفظ processedBuffer في نظام الملفات أو خدمة التخزين

        const attachments = [{
          id: fileId,
          url: fileUrl,
          type: file.mimetype,
          name: file.originalname,
          size: processedBuffer.length,
          metadata,
        }];

        // إرسال الرسالة مع المرفق
        const message = await pmService.sendMessage(conversationId, userId, {
          type: file.mimetype.startsWith('image/') ? 'image' : 
                file.mimetype.startsWith('video/') ? 'video' :
                file.mimetype.startsWith('audio/') ? 'audio' : 'file',
          attachments,
          metadata,
        });

        // إرسال عبر Socket.IO
        const messageWithDetails = {
          ...message,
          sender: req.user,
        };

        io.to(`conversation:${conversationId}`).emit('new_message', messageWithDetails);

        res.json({ message: messageWithDetails });
      } catch (error) {
        console.error('خطأ في رفع الملف:', error);
        res.status(500).json({ error: 'فشل رفع الملف' });
      }
    }
  );

  // الحصول على رسائل محادثة
  router.get('/conversations/:conversationId/messages', enhancedProtect.auth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const conversationId = parseInt(req.params.conversationId);
      const { limit, beforeId, afterId } = req.query;

      const messages = await pmService.getConversationMessages(conversationId, userId, {
        limit: limit ? parseInt(limit as string) : 50,
        beforeId: beforeId ? parseInt(beforeId as string) : undefined,
        afterId: afterId ? parseInt(afterId as string) : undefined,
      });

      res.json({ messages });
    } catch (error) {
      console.error('خطأ في جلب الرسائل:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'فشل جلب الرسائل' });
    }
  });

  // ==================== حالة القراءة والكتابة ====================

  // تحديد الرسائل كمقروءة
  router.post('/conversations/:conversationId/read', enhancedProtect.auth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const conversationId = parseInt(req.params.conversationId);
      const { messageIds } = req.body;

      if (!Array.isArray(messageIds)) {
        return res.status(400).json({ error: 'معرفات الرسائل مطلوبة' });
      }

      await pmService.markMessagesAsRead(conversationId, userId, messageIds);

      // إرسال تحديث حالة القراءة للمشاركين
      io.to(`conversation:${conversationId}`).emit('messages_read', {
        conversationId,
        userId,
        messageIds,
      });

      res.json({ success: true });
    } catch (error) {
      console.error('خطأ في تحديد الرسائل كمقروءة:', error);
      res.status(500).json({ error: 'فشل تحديد الرسائل كمقروءة' });
    }
  });

  // تحديث حالة الكتابة
  router.post('/conversations/:conversationId/typing', enhancedProtect.auth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const conversationId = parseInt(req.params.conversationId);
      const { isTyping } = updateTypingSchema.parse(req.body);

      await pmService.updateTypingStatus(conversationId, userId, isTyping);

      // إرسال حالة الكتابة للمشاركين الآخرين
      io.to(`conversation:${conversationId}`).emit('typing_status', {
        conversationId,
        user: {
          id: userId,
          username: req.user!.username,
          profileImage: req.user!.profileImage,
        },
        isTyping,
      });

      res.json({ success: true });
    } catch (error) {
      console.error('خطأ في تحديث حالة الكتابة:', error);
      res.status(500).json({ error: 'فشل تحديث حالة الكتابة' });
    }
  });

  // الحصول على المستخدمين الذين يكتبون حالياً
  router.get('/conversations/:conversationId/typing', enhancedProtect.auth, async (req, res) => {
    try {
      const conversationId = parseInt(req.params.conversationId);
      const typingUsers = await pmService.getTypingUsers(conversationId);
      res.json({ typingUsers });
    } catch (error) {
      console.error('خطأ في جلب حالة الكتابة:', error);
      res.status(500).json({ error: 'فشل جلب حالة الكتابة' });
    }
  });

  // ==================== المسودات ====================

  // حفظ مسودة
  router.post('/conversations/:conversationId/draft', enhancedProtect.auth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const conversationId = parseInt(req.params.conversationId);
      const { content, replyToId } = req.body;

      await pmService.saveDraft(conversationId, userId, content, replyToId);
      res.json({ success: true });
    } catch (error) {
      console.error('خطأ في حفظ المسودة:', error);
      res.status(500).json({ error: 'فشل حفظ المسودة' });
    }
  });

  // الحصول على مسودة
  router.get('/conversations/:conversationId/draft', enhancedProtect.auth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const conversationId = parseInt(req.params.conversationId);

      const draft = await pmService.getDraft(conversationId, userId);
      res.json({ draft });
    } catch (error) {
      console.error('خطأ في جلب المسودة:', error);
      res.status(500).json({ error: 'فشل جلب المسودة' });
    }
  });

  // ==================== التفاعلات ====================

  // إضافة/إزالة تفاعل
  router.post('/messages/:messageId/reactions', enhancedProtect.auth, messageLimiter, async (req, res) => {
    try {
      const userId = req.user!.id;
      const messageId = parseInt(req.params.messageId);
      const { reaction } = toggleReactionSchema.parse(req.body);

      const result = await pmService.toggleReaction(messageId, userId, reaction);

      // إرسال التحديث عبر Socket.IO
      // هنا يجب جلب معرف المحادثة للرسالة
      // io.to(`conversation:${conversationId}`).emit('reaction_update', {
      //   messageId,
      //   userId,
      //   reaction,
      //   action: result.action,
      // });

      res.json(result);
    } catch (error) {
      console.error('خطأ في التفاعل:', error);
      res.status(500).json({ error: 'فشل التفاعل' });
    }
  });

  // ==================== إدارة المحادثات ====================

  // تثبيت/إلغاء تثبيت محادثة
  router.post('/conversations/:conversationId/pin', enhancedProtect.auth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const conversationId = parseInt(req.params.conversationId);

      const result = await pmService.togglePinConversation(conversationId, userId);
      res.json(result);
    } catch (error) {
      console.error('خطأ في تثبيت المحادثة:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'فشل تثبيت المحادثة' });
    }
  });

  // كتم/إلغاء كتم محادثة
  router.post('/conversations/:conversationId/mute', enhancedProtect.auth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const conversationId = parseInt(req.params.conversationId);
      const { duration } = req.body;

      const result = await pmService.toggleMuteConversation(conversationId, userId, duration);
      res.json(result);
    } catch (error) {
      console.error('خطأ في كتم المحادثة:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'فشل كتم المحادثة' });
    }
  });

  // أرشفة/إلغاء أرشفة محادثة
  router.post('/conversations/:conversationId/archive', enhancedProtect.auth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const conversationId = parseInt(req.params.conversationId);

      const result = await pmService.toggleArchiveConversation(conversationId, userId);
      res.json(result);
    } catch (error) {
      console.error('خطأ في أرشفة المحادثة:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'فشل أرشفة المحادثة' });
    }
  });

  // ==================== الرسائل ====================

  // حذف رسالة
  router.delete('/messages/:messageId', enhancedProtect.auth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const messageId = parseInt(req.params.messageId);
      const { deleteForEveryone } = req.query;

      await pmService.deleteMessage(messageId, userId, deleteForEveryone === 'true');

      // إرسال التحديث عبر Socket.IO
      // io.to(`conversation:${conversationId}`).emit('message_deleted', {
      //   messageId,
      //   deletedBy: userId,
      //   deleteForEveryone: deleteForEveryone === 'true',
      // });

      res.json({ success: true });
    } catch (error) {
      console.error('خطأ في حذف الرسالة:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'فشل حذف الرسالة' });
    }
  });

  // تعديل رسالة
  router.put('/messages/:messageId', enhancedProtect.auth, messageLimiter, async (req, res) => {
    try {
      const userId = req.user!.id;
      const messageId = parseInt(req.params.messageId);
      const { content } = req.body;

      if (!content || typeof content !== 'string') {
        return res.status(400).json({ error: 'محتوى الرسالة مطلوب' });
      }

      await pmService.editMessage(messageId, userId, content);

      // إرسال التحديث عبر Socket.IO
      // io.to(`conversation:${conversationId}`).emit('message_edited', {
      //   messageId,
      //   newContent: content,
      //   editedBy: userId,
      //   editedAt: new Date(),
      // });

      res.json({ success: true });
    } catch (error) {
      console.error('خطأ في تعديل الرسالة:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'فشل تعديل الرسالة' });
    }
  });

  // البحث في الرسائل
  router.get('/messages/search', enhancedProtect.auth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { q, conversationId, limit, offset } = req.query;

      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: 'كلمة البحث مطلوبة' });
      }

      const results = await pmService.searchMessages(userId, q, {
        conversationId: conversationId ? parseInt(conversationId as string) : undefined,
        limit: limit ? parseInt(limit as string) : 20,
        offset: offset ? parseInt(offset as string) : 0,
      });

      res.json({ results });
    } catch (error) {
      console.error('خطأ في البحث:', error);
      res.status(500).json({ error: 'فشل البحث' });
    }
  });

  // ==================== المكالمات ====================

  // بدء مكالمة
  router.post('/conversations/:conversationId/calls', enhancedProtect.auth, messageLimiter, async (req, res) => {
    try {
      const userId = req.user!.id;
      const conversationId = parseInt(req.params.conversationId);
      const { type } = req.body;

      if (!['voice', 'video'].includes(type)) {
        return res.status(400).json({ error: 'نوع المكالمة غير صحيح' });
      }

      const call = await pmService.createCall(conversationId, userId, type);

      // إرسال إشعار المكالمة للمشاركين
      io.to(`conversation:${conversationId}`).emit('incoming_call', {
        call,
        caller: req.user,
      });

      res.json({ call });
    } catch (error) {
      console.error('خطأ في بدء المكالمة:', error);
      res.status(500).json({ error: 'فشل بدء المكالمة' });
    }
  });

  // تحديث حالة المكالمة
  router.put('/calls/:callId/status', enhancedProtect.auth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const callId = parseInt(req.params.callId);
      const { status } = req.body;

      await pmService.updateCallStatus(callId, status, userId);

      // إرسال تحديث حالة المكالمة
      // يجب جلب معرف المحادثة
      // io.to(`conversation:${conversationId}`).emit('call_status_update', {
      //   callId,
      //   status,
      //   userId,
      // });

      res.json({ success: true });
    } catch (error) {
      console.error('خطأ في تحديث حالة المكالمة:', error);
      res.status(500).json({ error: 'فشل تحديث حالة المكالمة' });
    }
  });

  return router;
}
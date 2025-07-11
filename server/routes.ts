import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupDownloadRoute } from "./download-route";
import { insertUserSchema, insertMessageSchema } from "@shared/schema";
import { spamProtection } from "./spam-protection";
import { moderationSystem } from "./moderation";
import { sanitizeInput, validateMessageContent, checkIPSecurity, authLimiter, messageLimiter } from "./security";
import { advancedSecurity, advancedSecurityMiddleware } from "./advanced-security";
import securityApiRoutes from "./api-security";
import { z } from "zod";

interface WebSocketClient extends WebSocket {
  userId?: number;
  username?: string;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // تطبيق فحص الأمان على جميع الطلبات
  app.use(checkIPSecurity);
  app.use(advancedSecurityMiddleware);

  // Store connected clients
  const clients = new Set<WebSocketClient>();

  // Member registration route - مع أمان محسن
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password, confirmPassword, gender } = req.body;
      
      // فحص الأمان الأساسي
      if (!username?.trim() || !password?.trim() || !confirmPassword?.trim()) {
        return res.status(400).json({ error: "جميع الحقول مطلوبة" });
      }

      // فحص اسم المستخدم - منع الأحرف الخاصة
      if (!/^[\u0600-\u06FFa-zA-Z0-9_]{3,20}$/.test(username.trim())) {
        return res.status(400).json({ error: "اسم المستخدم يجب أن يكون بين 3-20 حرف ولا يحتوي على رموز خاصة" });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({ error: "كلمات المرور غير متطابقة" });
      }

      // فحص قوة كلمة المرور
      if (password.length < 6) {
        return res.status(400).json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });
      }
      
      if (!/(?=.*[0-9])/.test(password)) {
        return res.status(400).json({ error: "كلمة المرور يجب أن تحتوي على رقم واحد على الأقل" });
      }

      // Check if username already exists
      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(400).json({ error: "اسم المستخدم موجود بالفعل" });
      }

      const user = await storage.createUser({
        username,
        password,
        userType: "member",
        gender: gender || "male",
        profileImage: "/default_avatar.svg",
      });

      res.json({ user, message: "تم التسجيل بنجاح" });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // Authentication routes
  app.post("/api/auth/guest", authLimiter, async (req, res) => {
    try {
      const { username, gender } = req.body;
      
      if (!username?.trim()) {
        return res.status(400).json({ error: "اسم المستخدم مطلوب" });
      }

      // Check if username already exists
      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(400).json({ error: "الاسم مستخدم بالفعل" });
      }

      const user = await storage.createUser({
        username,
        userType: "guest",
        gender: gender || "male",
        profileImage: "/default_avatar.svg",
      });

      res.json({ user });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  app.post("/api/auth/member", authLimiter, async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username?.trim() || !password?.trim()) {
        return res.status(400).json({ error: "اسم المستخدم وكلمة المرور مطلوبان" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "اسم المستخدم غير موجود" });
      }

      if (user.password !== password) {
        return res.status(401).json({ error: "كلمة المرور غير صحيحة" });
      }

      await storage.setUserOnlineStatus(user.id, true);
      res.json({ user });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // User routes
  app.get("/api/users/online", async (req, res) => {
    try {
      const users = await storage.getOnlineUsers();
      res.json({ users });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const updates = req.body;
      
      const user = await storage.updateUser(userId, updates);
      if (!user) {
        return res.status(404).json({ error: "المستخدم غير موجود" });
      }

      // Broadcast user update to all connected clients
      const connectedClients = Array.from(clients);
      connectedClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'userUpdated',
            user: user,
          }));
        }
      });

      res.json({ user });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // Message routes
  app.get("/api/messages/public", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const messages = await storage.getPublicMessages(limit);
      
      // Get user details for each message
      const messagesWithUsers = await Promise.all(
        messages.map(async (msg) => {
          const sender = msg.senderId ? await storage.getUser(msg.senderId) : null;
          return { ...msg, sender };
        })
      );

      res.json({ messages: messagesWithUsers });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  app.get("/api/messages/private/:userId1/:userId2", async (req, res) => {
    try {
      const userId1 = parseInt(req.params.userId1);
      const userId2 = parseInt(req.params.userId2);
      const limit = parseInt(req.query.limit as string) || 50;
      
      const messages = await storage.getPrivateMessages(userId1, userId2, limit);
      
      const messagesWithUsers = await Promise.all(
        messages.map(async (msg) => {
          const sender = msg.senderId ? await storage.getUser(msg.senderId) : null;
          return { ...msg, sender };
        })
      );

      res.json({ messages: messagesWithUsers });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // Profile picture upload (members only)
  app.post('/api/users/:id/profile-image', async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { imageData } = req.body;
      
      if (!imageData) {
        return res.status(400).json({ error: "صورة مطلوبة" });
      }

      // Check if user is a member
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ error: "المستخدم غير موجود" });
      }

      // Allow members and owners to upload profile pictures (not guests)
      if (existingUser.userType === 'guest') {
        return res.status(403).json({ 
          error: "رفع الصور الشخصية متاح للأعضاء فقط",
          userType: existingUser.userType,
          userId: userId
        });
      }

      const user = await storage.updateUser(userId, { profileImage: imageData });
      if (!user) {
        return res.status(500).json({ error: "فشل في تحديث الصورة" });
      }

      // Broadcast user update to all connected clients
      broadcast({
        type: 'userUpdated',
        user
      });

      res.json({ user, message: "تم تحديث الصورة الشخصية بنجاح" });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // Friend routes
  app.get("/api/friends/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const friends = await storage.getFriends(userId);
      res.json({ friends });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  app.post("/api/friends", async (req, res) => {
    try {
      const { userId, friendId } = req.body;
      const friendship = await storage.addFriend(userId, friendId);
      res.json({ friendship });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });



  // WebSocket handling
  wss.on('connection', (ws: WebSocketClient) => {
    console.log('اتصال WebSocket جديد');
    clients.add(ws);
    
    // إرسال رسالة ترحيب فورية
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'متصل بنجاح'
    }));
    
    // heartbeat للحفاظ على الاتصال
    const heartbeat = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      } else {
        clearInterval(heartbeat);
      }
    }, 30000);

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log(`رسالة WebSocket من ${ws.username || 'غير معروف'}: ${message.type}`);
        
        switch (message.type) {
          case 'auth':
            ws.userId = message.userId;
            ws.username = message.username;
            
            // فحص حالة المستخدم قبل السماح بالاتصال
            const authUserStatus = await moderationSystem.checkUserStatus(message.userId);
            if (authUserStatus.isBlocked) {
              ws.send(JSON.stringify({
                type: 'error',
                message: 'أنت محجوب نهائياً من الدردشة',
                action: 'blocked'
              }));
              ws.close();
              return;
            }
            
            if (authUserStatus.isBanned) {
              ws.send(JSON.stringify({
                type: 'error',
                message: `أنت مطرود من الدردشة لمدة ${authUserStatus.timeLeft} دقيقة`,
                action: 'banned'
              }));
              ws.close();
              return;
            }
            
            await storage.setUserOnlineStatus(message.userId, true);
            
            // Broadcast user joined
            broadcast({
              type: 'userJoined',
              user: await storage.getUser(message.userId),
            }, ws);
            
            // Send online users list with moderation status
            const onlineUsers = await storage.getOnlineUsers();
            const usersWithStatus = await Promise.all(
              onlineUsers.map(async (user) => {
                const status = await moderationSystem.checkUserStatus(user.id);
                return {
                  ...user,
                  isMuted: status.isMuted,
                  isBlocked: status.isBlocked,
                  isBanned: status.isBanned
                };
              })
            );
            
            ws.send(JSON.stringify({
              type: 'onlineUsers',
              users: usersWithStatus,
            }));
            break;

          case 'publicMessage':
            if (ws.userId) {
              // فحص حالة الكتم والحظر
              const userStatus = await moderationSystem.checkUserStatus(ws.userId);
              if (userStatus.isMuted) {
                ws.send(JSON.stringify({
                  type: 'error',
                  message: 'أنت مكتوم ولا يمكنك إرسال رسائل في الدردشة العامة. يمكنك التحدث في الرسائل الخاصة.',
                  action: 'muted'
                }));
                console.log(`🔇 المستخدم ${ws.username} محاول الكتابة وهو مكتوم`);
                break;
              }
              
              if (userStatus.isBanned) {
                ws.send(JSON.stringify({
                  type: 'error',
                  message: 'أنت مطرود من الدردشة',
                  action: 'banned'
                }));
                break;
              }
              
              if (userStatus.isBlocked) {
                ws.send(JSON.stringify({
                  type: 'error',
                  message: 'أنت محجوب نهائياً من الدردشة',
                  action: 'blocked'
                }));
                // قطع الاتصال للمحجوبين
                ws.close();
                break;
              }

              // تنظيف المحتوى
              const sanitizedContent = sanitizeInput(message.content);
              
              // فحص صحة المحتوى
              const contentCheck = validateMessageContent(sanitizedContent);
              if (!contentCheck.isValid) {
                ws.send(JSON.stringify({
                  type: 'error',
                  message: contentCheck.reason
                }));
                break;
              }
              
              // فحص الرسالة ضد السبام
              const spamCheck = spamProtection.checkMessage(ws.userId, sanitizedContent);
              if (!spamCheck.isAllowed) {
                ws.send(JSON.stringify({
                  type: 'error',
                  message: spamCheck.reason,
                  action: spamCheck.action
                }));
                
                // إرسال تحذير إذا لزم الأمر
                if (spamCheck.action === 'warn') {
                  ws.send(JSON.stringify({
                    type: 'warning',
                    message: 'تم إعطاؤك تحذير بسبب مخالفة قوانين الدردشة'
                  }));
                }
                break;
              }

              const newMessage = await storage.createMessage({
                senderId: ws.userId,
                content: sanitizedContent,
                messageType: message.messageType || 'text',
                isPrivate: false,
              });
              
              const sender = await storage.getUser(ws.userId);
              broadcast({
                type: 'newMessage',
                message: { ...newMessage, sender },
              });
            }
            break;

          case 'privateMessage':
            if (ws.userId) {
              // منع إرسال رسالة للنفس
              if (ws.userId === message.receiverId) {
                ws.send(JSON.stringify({
                  type: 'error',
                  message: 'لا يمكن إرسال رسالة لنفسك',
                  action: 'blocked'
                }));
                break;
              }

              // تنظيف المحتوى
              const sanitizedContent = sanitizeInput(message.content);
              
              // فحص صحة المحتوى
              const contentCheck = validateMessageContent(sanitizedContent);
              if (!contentCheck.isValid) {
                ws.send(JSON.stringify({
                  type: 'error',
                  message: contentCheck.reason
                }));
                break;
              }
              
              // فحص الرسالة الخاصة ضد السبام
              const spamCheck = spamProtection.checkMessage(ws.userId, sanitizedContent);
              if (!spamCheck.isAllowed) {
                ws.send(JSON.stringify({
                  type: 'error',
                  message: spamCheck.reason,
                  action: spamCheck.action
                }));
                break;
              }

              const newMessage = await storage.createMessage({
                senderId: ws.userId,
                receiverId: message.receiverId,
                content: sanitizedContent,
                messageType: message.messageType || 'text',
                isPrivate: true,
              });
              
              const sender = await storage.getUser(ws.userId);
              const messageWithSender = { ...newMessage, sender };
              
              // Send to receiver only (don't send to sender)
              const receiverClient = Array.from(clients).find(
                client => client.userId === message.receiverId
              );
              if (receiverClient && receiverClient.readyState === WebSocket.OPEN) {
                receiverClient.send(JSON.stringify({
                  type: 'privateMessage',
                  message: messageWithSender,
                }));
              }
              
              // Send back to sender with confirmation
              ws.send(JSON.stringify({
                type: 'privateMessage',
                message: messageWithSender,
              }));
            }
            break;

          case 'typing':
            if (ws.userId) {
              broadcast({
                type: 'userTyping',
                userId: ws.userId,
                username: ws.username,
                isTyping: message.isTyping,
              }, ws);
            }
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', async () => {
      clients.delete(ws);
      if (ws.userId) {
        await storage.setUserOnlineStatus(ws.userId, false);
        broadcast({
          type: 'userLeft',
          userId: ws.userId,
          username: ws.username,
        }, ws);
      }
    });
  });

  function broadcast(message: any, sender?: WebSocketClient) {
    const messageStr = JSON.stringify(message);
    clients.forEach(client => {
      if (client !== sender && client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  // API routes for spam protection and reporting
  
  // إضافة تبليغ
  app.post("/api/reports", async (req, res) => {
    try {
      const { reporterId, reportedUserId, reason, content, messageId } = req.body;
      
      if (!reporterId || !reportedUserId || !reason || !content) {
        return res.status(400).json({ error: "جميع الحقول مطلوبة" });
      }

      // منع البلاغ على الإدمن والمشرف والمالك
      const reportedUser = await storage.getUser(reportedUserId);
      if (reportedUser && ['admin', 'moderator', 'owner'].includes(reportedUser.userType)) {
        return res.status(403).json({ 
          error: "لا يمكن الإبلاغ عن أعضاء الإدارة (المشرف، الإدمن، المالك)" 
        });
      }

      const report = spamProtection.addReport(reporterId, reportedUserId, reason, content, messageId);
      res.json({ report, message: "تم إرسال التبليغ بنجاح" });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // الحصول على التبليغات المعلقة (للمشرفين)
  app.get("/api/reports/pending", async (req, res) => {
    try {
      const { userId } = req.query;
      
      // التحقق من أن المستخدم مشرف
      const user = await storage.getUser(parseInt(userId as string));
      if (!user || user.userType !== 'owner') {
        return res.status(403).json({ error: "غير مسموح" });
      }

      const reports = spamProtection.getPendingReports();
      res.json({ reports });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // مراجعة تبليغ (للمشرفين)
  app.patch("/api/reports/:reportId", async (req, res) => {
    try {
      const { reportId } = req.params;
      const { action, userId } = req.body;
      
      // التحقق من أن المستخدم مشرف
      const user = await storage.getUser(userId);
      if (!user || user.userType !== 'owner') {
        return res.status(403).json({ error: "غير مسموح" });
      }

      const success = spamProtection.reviewReport(parseInt(reportId), action);
      if (success) {
        res.json({ message: "تم مراجعة التبليغ" });
      } else {
        res.status(404).json({ error: "التبليغ غير موجود" });
      }
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // الحصول على حالة المستخدم
  app.get("/api/users/:userId/spam-status", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const status = spamProtection.getUserStatus(userId);
      res.json({ status });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // إعادة تعيين نقاط السبام (للمشرفين)
  app.post("/api/users/:userId/reset-spam", async (req, res) => {
    try {
      const { userId } = req.params;
      const { adminId } = req.body;
      
      // التحقق من أن المستخدم مشرف
      const admin = await storage.getUser(adminId);
      if (!admin || admin.userType !== 'owner') {
        return res.status(403).json({ error: "غير مسموح" });
      }

      spamProtection.resetUserSpamScore(parseInt(userId));
      res.json({ message: "تم إعادة تعيين نقاط السبام" });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // إحصائيات السبام (للمشرفين)
  app.get("/api/spam-stats", async (req, res) => {
    try {
      const { userId } = req.query;
      
      // التحقق من أن المستخدم مشرف
      const user = await storage.getUser(parseInt(userId as string));
      if (!user || user.userType !== 'owner') {
        return res.status(403).json({ error: "غير مسموح" });
      }

      const stats = spamProtection.getStats();
      res.json({ stats });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // Moderation routes
  app.post("/api/moderation/mute", async (req, res) => {
    try {
      const { moderatorId, targetUserId, reason, duration } = req.body;
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
      const deviceId = req.headers['user-agent'] || 'unknown';
      
      const success = await moderationSystem.muteUser(
        moderatorId, 
        targetUserId, 
        reason, 
        duration, 
        clientIP, 
        deviceId
      );
      
      if (success) {
        const moderator = await storage.getUser(moderatorId);
        const target = await storage.getUser(targetUserId);
        
        // إرسال إشعار للدردشة العامة
        const systemMessage = `🔇 تم كتم ${target?.username} من قبل ${moderator?.username} لمدة ${duration} دقيقة - السبب: ${reason}`;
        
        broadcast({
          type: 'moderationAction',
          action: 'muted',
          targetUserId: targetUserId,
          message: systemMessage,
          reason,
          duration
        });

        // إرسال إشعار للمستخدم المكتوم
        broadcast({
          type: 'notification',
          targetUserId: targetUserId,
          notificationType: 'muted',
          message: `تم كتمك من قبل ${moderator?.username} لمدة ${duration} دقيقة - السبب: ${reason}`,
          moderatorName: moderator?.username
        });
        
        // لا يتم قطع الاتصال - المستخدم يبقى في الدردشة لكن مكتوم
        res.json({ message: "تم كتم المستخدم بنجاح - يمكنه البقاء في الدردشة ولكن لا يمكنه التحدث في العام" });
      } else {
        res.status(403).json({ error: "غير مسموح لك بهذا الإجراء" });
      }
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  app.post("/api/moderation/unmute", async (req, res) => {
    try {
      const { moderatorId, targetUserId } = req.body;
      
      const success = await moderationSystem.unmuteUser(moderatorId, targetUserId);
      
      if (success) {
        const moderator = await storage.getUser(moderatorId);
        const target = await storage.getUser(targetUserId);
        
        // إرسال إشعار للدردشة العامة
        const systemMessage = `🔊 تم إلغاء كتم ${target?.username} من قبل ${moderator?.username}`;
        
        broadcast({
          type: 'moderationAction',
          action: 'unmuted',
          targetUserId: targetUserId,
          message: systemMessage
        });
        
        res.json({ message: "تم إلغاء الكتم بنجاح" });
      } else {
        res.status(403).json({ error: "غير مسموح لك بهذا الإجراء" });
      }
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  app.post("/api/moderation/ban", async (req, res) => {
    try {
      const { moderatorId, targetUserId, reason, duration } = req.body;
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
      const deviceId = req.headers['user-agent'] || 'unknown';
      
      const success = await moderationSystem.banUser(
        moderatorId, 
        targetUserId, 
        reason, 
        duration, 
        clientIP, 
        deviceId
      );
      
      if (success) {
        const moderator = await storage.getUser(moderatorId);
        const target = await storage.getUser(targetUserId);
        
        // إرسال إشعار خاص للمستخدم المطرود
        const targetClient = Array.from(wss.clients).find((client: any) => client.userId === targetUserId);
        if (targetClient && targetClient.readyState === WebSocket.OPEN) {
          targetClient.send(JSON.stringify({
            type: 'kicked',
            targetUserId: targetUserId,
            duration: duration,
            reason: reason
          }));
        }

        // إرسال إشعار للدردشة العامة
        const systemMessage = `⏰ تم طرد ${target?.username} من قبل ${moderator?.username} لمدة ${duration} دقيقة - السبب: ${reason}`;
        
        broadcast({
          type: 'moderationAction',
          action: 'banned',
          targetUserId: targetUserId,
          message: systemMessage
        });
        
        // إجبار قطع الاتصال
        clients.forEach(client => {
          if (client.userId === targetUserId) {
            client.close();
          }
        });
        
        res.json({ message: "تم طرد المستخدم بنجاح" });
      } else {
        res.status(403).json({ error: "غير مسموح لك بهذا الإجراء" });
      }
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  app.post("/api/moderation/block", async (req, res) => {
    try {
      const { moderatorId, targetUserId, reason, ipAddress, deviceId } = req.body;
      const clientIP = req.ip || req.connection.remoteAddress || ipAddress || 'unknown';
      const clientDevice = req.headers['user-agent'] || deviceId || 'unknown';
      
      const success = await moderationSystem.blockUser(
        moderatorId, 
        targetUserId, 
        reason, 
        clientIP, 
        clientDevice
      );
      
      if (success) {
        const moderator = await storage.getUser(moderatorId);
        const target = await storage.getUser(targetUserId);
        
        // إرسال إشعار خاص للمستخدم المحجوب
        const targetClient = Array.from(wss.clients).find((client: any) => client.userId === targetUserId);
        if (targetClient && targetClient.readyState === WebSocket.OPEN) {
          targetClient.send(JSON.stringify({
            type: 'blocked',
            targetUserId: targetUserId,
            reason: reason
          }));
        }

        // إرسال إشعار للدردشة العامة
        const systemMessage = `🚫 تم حجب ${target?.username} نهائياً من قبل ${moderator?.username} - السبب: ${reason}`;
        
        broadcast({
          type: 'moderationAction',
          action: 'blocked',
          targetUserId: targetUserId,
          message: systemMessage
        });
        
        // إجبار قطع الاتصال
        clients.forEach(client => {
          if (client.userId === targetUserId) {
            client.close();
          }
        });
        
        res.json({ message: "تم حجب المستخدم بنجاح" });
      } else {
        res.status(403).json({ error: "غير مسموح لك بهذا الإجراء" });
      }
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  app.post("/api/moderation/promote", async (req, res) => {
    try {
      const { moderatorId, targetUserId, role } = req.body;
      
      // التحقق من أن المتقدم بالطلب هو المالك فقط
      const moderator = await storage.getUser(moderatorId);
      if (!moderator || moderator.userType !== 'owner') {
        return res.status(403).json({ error: "هذه الميزة للمالك فقط" });
      }

      // التحقق من أن المستخدم المراد ترقيته عضو وليس زائر
      const target = await storage.getUser(targetUserId);
      if (!target || target.userType !== 'member') {
        return res.status(400).json({ error: "يمكن ترقية الأعضاء فقط" });
      }
      
      // التأكد من أن الرتبة صحيحة (إدمن أو مشرف فقط)
      if (!['admin', 'moderator'].includes(role)) {
        return res.status(400).json({ error: "رتبة غير صالحة - يمكن الترقية لإدمن أو مشرف فقط" });
      }
      
      // تحديث المستخدم في قاعدة البيانات
      await storage.updateUser(targetUserId, { userType: role });
      const updatedUser = await storage.getUser(targetUserId);
      
      const roleDisplay = role === 'admin' ? 'إدمن ⭐' : 'مشرف 🛡️';
      const rolePermissions = role === 'admin' ? 'يمكنه كتم وطرد المستخدمين' : 'يمكنه كتم المستخدمين فقط';
      
      // إرسال إشعار للمستخدم المرقى
      const targetClient = Array.from(wss.clients).find((client: any) => client.userId === targetUserId);
      if (targetClient && targetClient.readyState === WebSocket.OPEN) {
        targetClient.send(JSON.stringify({
          type: 'promotion',
          newRole: role,
          message: `تهانينا! تمت ترقيتك إلى ${roleDisplay} - ${rolePermissions}`
        }));
      }
      
      // إشعار جميع المستخدمين بالترقية
      broadcast({
        type: 'userUpdated',
        user: updatedUser
      });

      // إشعار عام في الدردشة
      broadcast({
        type: 'systemNotification',
        message: `🎉 تم ترقية ${target.username} إلى ${roleDisplay}`,
        timestamp: new Date().toISOString()
      });
      
      res.json({ 
        success: true,
        message: `تمت ترقية ${target.username} إلى ${roleDisplay}`,
        user: updatedUser
      });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  app.post("/api/moderation/unmute", async (req, res) => {
    try {
      const { moderatorId, targetUserId } = req.body;
      
      const success = await moderationSystem.unmuteUser(moderatorId, targetUserId);
      
      if (success) {
        res.json({ message: "تم فك الكتم بنجاح" });
      } else {
        res.status(403).json({ error: "غير مسموح لك بهذا الإجراء" });
      }
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  app.post("/api/moderation/unblock", async (req, res) => {
    try {
      const { moderatorId, targetUserId } = req.body;
      
      const success = await moderationSystem.unblockUser(moderatorId, targetUserId);
      
      if (success) {
        res.json({ message: "تم فك الحجب بنجاح" });
      } else {
        res.status(403).json({ error: "غير مسموح لك بهذا الإجراء" });
      }
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  app.get("/api/moderation/log", async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string);
      const user = await storage.getUser(userId);
      
      // للإدمن والمالك فقط
      if (!user || (user.userType !== 'owner' && user.userType !== 'admin')) {
        return res.status(403).json({ error: "غير مسموح لك بالوصول - للإدمن والمالك فقط" });
      }

      const log = moderationSystem.getModerationLog();
      res.json({ log });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // إضافة endpoint سجل الإجراءات للإدمن
  app.get("/api/moderation/actions", async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string);
      const user = await storage.getUser(userId);
      
      // للإدمن والمالك فقط
      if (!user || (user.userType !== 'owner' && user.userType !== 'admin')) {
        return res.status(403).json({ error: "غير مسموح - للإدمن والمالك فقط" });
      }

      const actions = moderationSystem.getModerationLog()
        .map(action => ({
          ...action,
          moderatorName: '', 
          targetName: '' 
        }));
      
      // إضافة أسماء المستخدمين للإجراءات
      for (const action of actions) {
        const moderator = await storage.getUser(action.moderatorId);
        const target = await storage.getUser(action.targetUserId);
        action.moderatorName = moderator?.username || 'مجهول';
        action.targetName = target?.username || 'مجهول';
      }

      console.log(`📋 ${user.username} طلب سجل الإجراءات - ${actions.length} إجراء`);
      res.json(actions);
    } catch (error) {
      console.error("خطأ في الحصول على سجل الإجراءات:", error);
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // Friends routes
  app.get("/api/friends/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const friends = await storage.getFriends(userId);
      
      res.json({ friends });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  app.post("/api/friends", async (req, res) => {
    try {
      const { userId, friendId } = req.body;
      
      // التحقق من أن المستخدمين موجودين
      const user = await storage.getUser(userId);
      const friend = await storage.getUser(friendId);
      
      if (!user || !friend) {
        return res.status(404).json({ error: "المستخدم غير موجود" });
      }
      
      // التحقق من أن المستخدم لا يضيف نفسه
      if (userId === friendId) {
        return res.status(400).json({ error: "لا يمكنك إضافة نفسك كصديق" });
      }
      
      const friendship = await storage.addFriend(userId, friendId);
      
      // إرسال تنبيه WebSocket للمستخدم المستهدف
      broadcast({
        type: 'friendRequest',
        targetUserId: friendId,
        senderUserId: userId,
        senderUsername: user.username,
        message: `${user.username} يريد إضافتك كصديق`
      });
      
      res.json({ 
        message: "تم إرسال طلب الصداقة",
        friendship 
      });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  app.delete("/api/friends/:userId/:friendId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const friendId = parseInt(req.params.friendId);
      
      const success = await storage.removeFriend(userId, friendId);
      
      if (success) {
        res.json({ message: "تم حذف الصديق" });
      } else {
        res.status(404).json({ error: "الصداقة غير موجودة" });
      }
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // Friend requests routes
  app.get("/api/friend-requests/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const incoming = await storage.getIncomingFriendRequests(userId);
      const outgoing = await storage.getOutgoingFriendRequests(userId);
      
      res.json({ incoming, outgoing });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  app.post("/api/friend-requests/:id/accept", async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const success = await storage.acceptFriendRequest(requestId);
      
      if (success) {
        res.json({ message: "تم قبول طلب الصداقة" });
      } else {
        res.status(404).json({ error: "طلب الصداقة غير موجود" });
      }
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  app.post("/api/friend-requests/:id/decline", async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const success = await storage.declineFriendRequest(requestId);
      
      if (success) {
        res.json({ message: "تم رفض طلب الصداقة" });
      } else {
        res.status(404).json({ error: "طلب الصداقة غير موجود" });
      }
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  app.post("/api/friend-requests/:id/ignore", async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const success = await storage.ignoreFriendRequest(requestId);
      
      if (success) {
        res.json({ message: "تم تجاهل طلب الصداقة" });
      } else {
        res.status(404).json({ error: "طلب الصداقة غير موجود" });
      }
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  app.delete("/api/friend-requests/:id", async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const success = await storage.deleteFriendRequest(requestId);
      
      if (success) {
        res.json({ message: "تم إلغاء طلب الصداقة" });
      } else {
        res.status(404).json({ error: "طلب الصداقة غير موجود" });
      }
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // Add route for removing friends with confirmation
  app.delete("/api/friends/:userId/:friendId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const friendId = parseInt(req.params.friendId);
      
      const success = await storage.removeFriend(userId, friendId);
      
      if (success) {
        res.json({ message: "تم حذف الصديق" });
      } else {
        res.status(404).json({ error: "الصداقة غير موجودة" });
      }
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // إضافة endpoint لوحة إجراءات المشرفين
  app.get("/api/moderation/actions", async (req, res) => {
    try {
      const { userId } = req.query;
      const user = await storage.getUser(Number(userId));
      
      // التحقق من أن المستخدم مشرف أو مالك
      if (!user || (user.userType !== 'admin' && user.userType !== 'owner')) {
        return res.status(403).json({ error: "غير مسموح - للمشرفين فقط" });
      }

      const actions = moderationSystem.getModerationLog()
        .map(action => ({
          ...action,
          moderatorName: '', // سيتم إضافة اسم المشرف
          targetName: '' // سيتم إضافة اسم المستهدف
        }));
      
      // إضافة أسماء المستخدمين للإجراءات
      for (const action of actions) {
        const moderator = await storage.getUser(action.moderatorId);
        const target = await storage.getUser(action.targetUserId);
        action.moderatorName = moderator?.username || 'مجهول';
        action.targetName = target?.username || 'مجهول';
      }

      console.log(`📋 ${user.username} طلب تاريخ الإجراءات - ${actions.length} إجراء`);
      res.json(actions);
    } catch (error) {
      console.error("خطأ في الحصول على تاريخ الإجراءات:", error);
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // إضافة endpoint لسجل البلاغات
  app.get("/api/reports", async (req, res) => {
    try {
      const { userId } = req.query;
      const user = await storage.getUser(Number(userId));
      
      if (!user || (user.userType !== 'admin' && user.userType !== 'owner')) {
        return res.status(403).json({ error: "غير مسموح - للمشرفين فقط" });
      }

      const reports = spamProtection.getPendingReports()
        .concat(spamProtection.getReviewedReports())
        .map(report => ({
          ...report,
          reporterName: '',
          reportedUserName: ''
        }));
      
      // إضافة أسماء المستخدمين للبلاغات
      for (const report of reports) {
        const reporter = await storage.getUser(report.reporterId);
        const reported = await storage.getUser(report.reportedUserId);
        report.reporterName = reporter?.username || 'مجهول';
        report.reportedUserName = reported?.username || 'مجهول';
      }

      console.log(`📋 ${user.username} طلب سجل البلاغات - ${reports.length} بلاغ`);
      res.json(reports);
    } catch (error) {
      console.error("خطأ في الحصول على البلاغات:", error);
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // إضافة endpoint لمراجعة البلاغات
  app.post("/api/reports/:id/review", async (req, res) => {
    try {
      const reportId = parseInt(req.params.id);
      const { action, moderatorId } = req.body;
      
      const user = await storage.getUser(moderatorId);
      if (!user || (user.userType !== 'admin' && user.userType !== 'owner')) {
        return res.status(403).json({ error: "غير مسموح" });
      }

      const success = spamProtection.reviewReport(reportId, action);
      
      if (success) {
        console.log(`📋 ${user.username} راجع البلاغ ${reportId} - ${action}`);
        res.json({ message: "تمت مراجعة البلاغ" });
      } else {
        res.status(404).json({ error: "البلاغ غير موجود" });
      }
    } catch (error) {
      console.error("خطأ في مراجعة البلاغ:", error);
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // إضافة endpoint لترقية المستخدمين
  app.post("/api/moderation/promote", async (req, res) => {
    try {
      const { moderatorId, targetUserId, newRole } = req.body;
      
      const moderator = await storage.getUser(moderatorId);
      const target = await storage.getUser(targetUserId);
      
      if (!moderator || moderator.userType !== 'owner') {
        return res.status(403).json({ error: "فقط المالك يمكنه ترقية المستخدمين" });
      }
      
      if (!target) {
        return res.status(404).json({ error: "المستخدم غير موجود" });
      }
      
      if (target.userType !== 'member') {
        return res.status(400).json({ error: "يمكن ترقية الأعضاء فقط" });
      }
      
      if (!['admin', 'owner'].includes(newRole)) {
        return res.status(400).json({ error: "رتبة غير صالحة" });
      }
      
      // تحديث نوع المستخدم
      await storage.updateUser(targetUserId, { userType: newRole as any });
      
      // إرسال إشعار عبر WebSocket
      const promotionMessage = {
        type: 'systemNotification',
        message: `🎉 تم ترقية ${target.username} إلى ${newRole === 'admin' ? 'مشرف' : 'مالك'} بواسطة ${moderator.username}`,
        timestamp: new Date().toISOString()
      };
      
      broadcast(promotionMessage);
      
      console.log(`👑 ${moderator.username} رقى ${target.username} إلى ${newRole}`);
      res.json({ message: `تم ترقية ${target.username} إلى ${newRole === 'admin' ? 'مشرف' : 'مالك'} بنجاح` });
    } catch (error) {
      console.error("خطأ في ترقية المستخدم:", error);
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // إضافة endpoint للإجراءات النشطة
  app.get("/api/moderation/active-actions", async (req, res) => {
    try {
      const { userId } = req.query;
      const user = await storage.getUser(Number(userId));
      
      if (!user || (user.userType !== 'admin' && user.userType !== 'owner')) {
        return res.status(403).json({ error: "غير مسموح - للمشرفين فقط" });
      }

      const allActions = moderationSystem.getModerationLog();
      const activeActions = allActions
        .filter(action => (action.type === 'mute' || action.type === 'block'))
        .map(action => ({
          ...action,
          moderatorName: '',
          targetName: ''
        }));
      
      // إضافة أسماء المستخدمين
      for (const action of activeActions) {
        const moderator = await storage.getUser(action.moderatorId);
        const target = await storage.getUser(action.targetUserId);
        action.moderatorName = moderator?.username || 'مجهول';
        action.targetName = target?.username || 'مجهول';
      }

      console.log(`📋 ${user.username} طلب الإجراءات النشطة - ${activeActions.length} إجراء`);
      res.json(activeActions);
    } catch (error) {
      console.error("خطأ في الحصول على الإجراءات النشطة:", error);
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // Security API routes
  app.use('/api/security', securityApiRoutes);
  
  // Performance ping endpoint
  app.get('/api/ping', (req, res) => {
    res.json({ timestamp: Date.now(), status: 'ok' });
  });

  return httpServer;
}

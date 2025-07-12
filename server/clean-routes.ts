import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { cleanStorage } from "./clean-storage";
import { insertUserSchema, insertMessageSchema } from "@shared/schema";

interface WSClient extends WebSocket {
  userId?: number;
  username?: string;
}

let wss: WebSocketServer;
const connectedUsers = new Map<number, WSClient>();

export async function setupCleanRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);

  // WebSocket setup
  wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Authentication routes
  app.post("/api/auth/guest", async (req, res) => {
    try {
      const { username } = req.body;
      
      if (!username?.trim()) {
        return res.status(400).json({ error: "اسم المستخدم مطلوب" });
      }

      const existingUser = await cleanStorage.getUserByUsername(username.trim());
      if (existingUser) {
        return res.status(400).json({ error: "اسم المستخدم مستخدم بالفعل" });
      }

      const user = await cleanStorage.createUser({
        username: username.trim(),
        userType: 'guest'
      });

      res.json({ user });
    } catch (error) {
      console.error("Guest auth error:", error);
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  app.post("/api/auth/member", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username?.trim() || !password?.trim()) {
        return res.status(400).json({ error: "اسم المستخدم وكلمة المرور مطلوبان" });
      }

      const user = await cleanStorage.getUserByUsername(username.trim());
      if (!user) {
        return res.status(401).json({ error: "المستخدم غير موجود" });
      }

      if (user.password !== password.trim()) {
        return res.status(401).json({ error: "كلمة المرور خاطئة" });
      }

      await cleanStorage.setOnlineStatus(user.id, true);
      res.json({ user });
    } catch (error) {
      console.error("Member auth error:", error);
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = req.body;
      
      if (!userData.username?.trim() || !userData.password?.trim()) {
        return res.status(400).json({ error: "اسم المستخدم وكلمة المرور مطلوبان" });
      }

      const existingUser = await cleanStorage.getUserByUsername(userData.username.trim());
      if (existingUser) {
        return res.status(400).json({ error: "اسم المستخدم موجود مسبقاً" });
      }

      const user = await cleanStorage.createUser({
        ...userData,
        username: userData.username.trim(),
        userType: 'member'
      });

      res.json({ user });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "خطأ في التسجيل" });
    }
  });

  // User routes
  app.get("/api/users", async (req, res) => {
    try {
      const users = await cleanStorage.getAllUsers();
      res.json({ users });
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await cleanStorage.getUser(parseInt(req.params.id));
      if (!user) {
        return res.status(404).json({ error: "المستخدم غير موجود" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await cleanStorage.updateUser(userId, req.body);
      
      if (!user) {
        return res.status(404).json({ error: "المستخدم غير موجود" });
      }

      // Broadcast user update
      wss.clients.forEach((client: WSClient) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'userUpdated',
            user
          }));
        }
      });

      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "خطأ في التحديث" });
    }
  });

  // Message routes
  app.get("/api/messages/public", async (req, res) => {
    try {
      const messages = await cleanStorage.getPublicMessages();
      res.json({ messages });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  app.get("/api/messages/private/:userId/:otherUserId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const otherUserId = parseInt(req.params.otherUserId);
      const messages = await cleanStorage.getPrivateMessages(userId, otherUserId);
      res.json({ messages });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // Friend routes
  app.get("/api/friends/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const friends = await cleanStorage.getFriends(userId);
      res.json({ friends });
    } catch (error) {
      console.error("Get friends error:", error);
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  app.post("/api/friends/request", async (req, res) => {
    try {
      const { senderId, receiverId } = req.body;
      
      if (senderId === receiverId) {
        return res.status(400).json({ error: "لا يمكن إرسال طلب صداقة لنفسك" });
      }

      const areFriends = await cleanStorage.areFriends(senderId, receiverId);
      if (areFriends) {
        return res.status(400).json({ error: "أنتما أصدقاء بالفعل" });
      }

      const success = await cleanStorage.sendFriendRequest(senderId, receiverId);
      if (success) {
        // Create notification
        const sender = await cleanStorage.getUser(senderId);
        if (sender) {
          await cleanStorage.createNotification({
            userId: receiverId,
            type: 'friendRequest',
            title: '👫 طلب صداقة جديد',
            message: `أرسل ${sender.username} طلب صداقة إليك`,
            data: { senderId, senderName: sender.username }
          });
        }

        // Broadcast to receiver
        wss.clients.forEach((client: WSClient) => {
          if (client.userId === receiverId && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'friendRequest',
              senderId,
              senderName: sender?.username
            }));
          }
        });

        res.json({ message: "تم إرسال طلب الصداقة" });
      } else {
        res.status(400).json({ error: "فشل في إرسال طلب الصداقة" });
      }
    } catch (error) {
      console.error("Friend request error:", error);
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  app.post("/api/friends/accept", async (req, res) => {
    try {
      const { senderId, receiverId } = req.body;
      
      const success = await cleanStorage.acceptFriendRequest(senderId, receiverId);
      if (success) {
        // Broadcast friendship to both users
        wss.clients.forEach((client: WSClient) => {
          if ((client.userId === senderId || client.userId === receiverId) && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'friendshipAccepted',
              userId1: senderId,
              userId2: receiverId
            }));
          }
        });

        res.json({ message: "تم قبول طلب الصداقة" });
      } else {
        res.status(400).json({ error: "فشل في قبول طلب الصداقة" });
      }
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  app.post("/api/friends/decline", async (req, res) => {
    try {
      const { senderId, receiverId } = req.body;
      await cleanStorage.declineFriendRequest(senderId, receiverId);
      res.json({ message: "تم رفض طلب الصداقة" });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  app.delete("/api/friends/:userId/:friendId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const friendId = parseInt(req.params.friendId);
      
      await cleanStorage.removeFriend(userId, friendId);
      
      // Broadcast to both users
      wss.clients.forEach((client: WSClient) => {
        if ((client.userId === userId || client.userId === friendId) && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'friendRemoved',
            userId1: userId,
            userId2: friendId
          }));
        }
      });

      res.json({ message: "تم حذف الصديق" });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // Friend requests
  app.get("/api/friend-requests/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const requests = await cleanStorage.getFriendRequests(userId);
      res.json({ requests });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // Notifications
  app.get("/api/notifications/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const notifications = await cleanStorage.getNotifications(userId);
      res.json({ notifications });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  app.post("/api/notifications/:id/read", async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      await cleanStorage.markAsRead(notificationId);
      res.json({ message: "تم تعليم الإشعار كمقروء" });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // WebSocket handling
  wss.on('connection', (ws: WSClient) => {
    console.log('🔗 WebSocket connection established');

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());

        switch (message.type) {
          case 'authenticate':
            ws.userId = message.userId;
            ws.username = message.username;
            connectedUsers.set(message.userId, ws);
            
            // Broadcast user online status
            wss.clients.forEach((client: WSClient) => {
              if (client.readyState === WebSocket.OPEN && client.userId !== message.userId) {
                client.send(JSON.stringify({
                  type: 'userOnline',
                  userId: message.userId,
                  username: message.username
                }));
              }
            });
            break;

          case 'sendMessage':
            const newMessage = await cleanStorage.createMessage({
              senderId: message.senderId,
              recipientId: message.recipientId,
              content: message.content,
              messageType: message.messageType || 'text',
              isPublic: message.isPublic !== false
            });

            // Broadcast message
            wss.clients.forEach((client: WSClient) => {
              if (client.readyState === WebSocket.OPEN) {
                if (newMessage.isPublic || 
                    client.userId === message.senderId || 
                    client.userId === message.recipientId) {
                  client.send(JSON.stringify({
                    type: 'newMessage',
                    message: newMessage
                  }));
                }
              }
            });
            break;

          case 'typing':
            // Broadcast typing indicator
            wss.clients.forEach((client: WSClient) => {
              if (client.readyState === WebSocket.OPEN && client.userId !== message.userId) {
                client.send(JSON.stringify({
                  type: 'userTyping',
                  userId: message.userId,
                  username: message.username,
                  isTyping: message.isTyping
                }));
              }
            });
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', async () => {
      if (ws.userId) {
        connectedUsers.delete(ws.userId);
        await cleanStorage.setOnlineStatus(ws.userId, false);
        
        // Broadcast user offline status
        wss.clients.forEach((client: WSClient) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'userOffline',
              userId: ws.userId
            }));
          }
        });
      }
    });
  });

  return httpServer;
}
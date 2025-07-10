import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertUserSchema, insertMessageSchema } from "@shared/schema";
import { z } from "zod";

interface WebSocketClient extends WebSocket {
  userId?: number;
  username?: string;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Store connected clients
  const clients = new Set<WebSocketClient>();

  // Member registration route
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password, confirmPassword } = req.body;
      
      if (!username?.trim() || !password?.trim() || !confirmPassword?.trim()) {
        return res.status(400).json({ error: "جميع الحقول مطلوبة" });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({ error: "كلمات المرور غير متطابقة" });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });
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
        profileImage: "/default_avatar.svg",
      });

      res.json({ user, message: "تم التسجيل بنجاح" });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  // Authentication routes
  app.post("/api/auth/guest", async (req, res) => {
    try {
      const { username } = req.body;
      
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
        profileImage: "/default_avatar.svg",
      });

      res.json({ user });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  app.post("/api/auth/member", async (req, res) => {
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
    clients.add(ws);

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'auth':
            ws.userId = message.userId;
            ws.username = message.username;
            await storage.setUserOnlineStatus(message.userId, true);
            
            // Broadcast user joined
            broadcast({
              type: 'userJoined',
              user: await storage.getUser(message.userId),
            }, ws);
            
            // Send online users list
            const onlineUsers = await storage.getOnlineUsers();
            ws.send(JSON.stringify({
              type: 'onlineUsers',
              users: onlineUsers,
            }));
            break;

          case 'publicMessage':
            if (ws.userId) {
              const newMessage = await storage.createMessage({
                senderId: ws.userId,
                content: message.content,
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
              const newMessage = await storage.createMessage({
                senderId: ws.userId,
                receiverId: message.receiverId,
                content: message.content,
                messageType: message.messageType || 'text',
                isPrivate: true,
              });
              
              const sender = await storage.getUser(ws.userId);
              const messageWithSender = { ...newMessage, sender };
              
              // Send to receiver
              const receiverClient = Array.from(clients).find(
                client => client.userId === message.receiverId
              );
              if (receiverClient && receiverClient.readyState === WebSocket.OPEN) {
                receiverClient.send(JSON.stringify({
                  type: 'privateMessage',
                  message: messageWithSender,
                }));
              }
              
              // Send back to sender
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

  return httpServer;
}

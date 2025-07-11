// Routes optimization - removing duplicate code and cleaning up
import type { Express } from "express";
import { apiRequest } from "../client/src/lib/queryClient";

// Notification API routes with smart categorization
export function setupNotificationRoutes(app: Express) {
  // Get notifications with smart categorization
  app.get('/api/notifications/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const notifications = await storage.getUserNotifications(userId, 100);
      
      // Smart categorization
      const categorized = {
        messages: notifications.filter(n => n.type === 'private_message'),
        friends: notifications.filter(n => ['friend_request', 'friend_accepted'].includes(n.type)),
        system: notifications.filter(n => ['welcome', 'system'].includes(n.type)),
        moderation: notifications.filter(n => ['promotion', 'mute', 'kick', 'ban'].includes(n.type))
      };
      
      res.json(categorized);
    } catch (error) {
      res.status(500).json({ error: 'خطأ في جلب الإشعارات' });
    }
  });

  // Mark notification as read
  app.put('/api/notifications/:notificationId/read', async (req, res) => {
    try {
      const notificationId = parseInt(req.params.notificationId);
      await storage.markNotificationAsRead(notificationId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'خطأ في تحديث الإشعار' });
    }
  });

  // Mark all notifications as read with optional type filter
  app.put('/api/notifications/:userId/mark-all-read', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { type } = req.body;
      
      if (type) {
        // Mark specific type as read
        const notifications = await storage.getUserNotifications(userId);
        const filteredNotifications = notifications.filter(n => n.type === type);
        
        for (const notification of filteredNotifications) {
          await storage.markNotificationAsRead(notification.id);
        }
      } else {
        // Mark all as read
        await storage.markAllNotificationsAsRead(userId);
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'خطأ في تحديث الإشعارات' });
    }
  });

  // Get unread count
  app.get('/api/notifications/:userId/unread-count', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ error: 'خطأ في جلب عدد الإشعارات' });
    }
  });
}

// Clean friend system routes
export function setupFriendRoutes(app: Express) {
  // Send friend request with notification
  app.post('/api/friend-requests', async (req, res) => {
    try {
      const { senderId, receiverId } = req.body;
      
      // Check if request already exists
      const existingRequest = await storage.getFriendRequest(senderId, receiverId);
      if (existingRequest) {
        return res.status(400).json({ error: 'طلب الصداقة موجود بالفعل' });
      }
      
      // Create friend request
      const request = await storage.createFriendRequest(senderId, receiverId);
      
      // Send smart notification
      const sender = await storage.getUser(senderId);
      if (sender) {
        await notificationHelper.sendFriendRequestNotification(senderId, receiverId, sender.username);
      }
      
      res.json({ success: true, request });
    } catch (error) {
      res.status(500).json({ error: 'خطأ في إرسال طلب الصداقة' });
    }
  });

  // Accept friend request with notification
  app.put('/api/friend-requests/:requestId/accept', async (req, res) => {
    try {
      const requestId = parseInt(req.params.requestId);
      const success = await storage.acceptFriendRequest(requestId);
      
      if (success) {
        // Get request details for notification
        const request = await storage.getFriendRequestById(requestId);
        if (request) {
          const accepter = await storage.getUser(request.receiverId);
          if (accepter) {
            await notificationHelper.sendFriendAcceptedNotification(request.senderId, accepter.username);
          }
        }
      }
      
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: 'خطأ في قبول طلب الصداقة' });
    }
  });
}

// Clean profile image upload routes
export function setupProfileRoutes(app: Express) {
  // Combined profile image upload
  app.post('/api/upload/profile-image', upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'لم يتم رفع أي ملف' });
      }

      const imageUrl = `/uploads/profiles/${req.file.filename}`;
      res.json({ imageUrl });
    } catch (error) {
      res.status(500).json({ error: 'خطأ في رفع الصورة الشخصية' });
    }
  });

  // Combined profile banner upload
  app.post('/api/upload/profile-banner', upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'لم يتم رفع أي ملف' });
      }

      const imageUrl = `/uploads/profiles/${req.file.filename}`;
      res.json({ imageUrl });
    } catch (error) {
      res.status(500).json({ error: 'خطأ في رفع صورة البانر' });
    }
  });
}
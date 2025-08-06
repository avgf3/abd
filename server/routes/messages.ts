import { Router } from "express";
import { authMiddleware, requireRole } from "../auth/authMiddleware";
import { messageService } from "../services/messageService";
import { storage } from "../storage";

const router = Router();

// Get public messages for a room
router.get("/public", authMiddleware, async (req, res) => {
  try {
    const roomId = (req.query.roomId as string) || 'general';
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    if (limit > 100) {
      return res.status(400).json({
        success: false,
        error: "الحد الأقصى للرسائل هو 100"
      });
    }

    const messages = await messageService.getRoomMessages(roomId, limit, offset);

    res.json({
      success: true,
      messages,
      count: messages.length,
      roomId
    });

  } catch (error) {
    console.error("Get public messages error:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في الخادم"
    });
  }
});

// Get private messages between two users
router.get("/private/:userId", authMiddleware, async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.userId);
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    if (isNaN(targetUserId)) {
      return res.status(400).json({
        success: false,
        error: "معرف المستخدم غير صالح"
      });
    }

    if (limit > 100) {
      return res.status(400).json({
        success: false,
        error: "الحد الأقصى للرسائل هو 100"
      });
    }

    const messages = await messageService.getPrivateMessages(
      req.user!.id,
      targetUserId,
      limit,
      offset
    );

    res.json({
      success: true,
      messages,
      count: messages.length,
      conversationWith: targetUserId
    });

  } catch (error) {
    console.error("Get private messages error:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في الخادم"
    });
  }
});

// Send a private message
router.post("/private", authMiddleware, async (req, res) => {
  try {
    const { receiverId, content, messageType = 'text' } = req.body;

    if (!receiverId || !content?.trim()) {
      return res.status(400).json({
        success: false,
        error: "معرف المستلم ومحتوى الرسالة مطلوبان"
      });
    }

    const receiverIdNum = parseInt(receiverId);
    if (isNaN(receiverIdNum)) {
      return res.status(400).json({
        success: false,
        error: "معرف المستلم غير صالح"
      });
    }

    if (req.user!.id === receiverIdNum) {
      return res.status(400).json({
        success: false,
        error: "لا يمكنك إرسال رسالة لنفسك"
      });
    }

    // Check if receiver exists
    const receiver = await storage.getUser(receiverIdNum);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        error: "المستلم غير موجود"
      });
    }

    // Check if sender is blocked by receiver
    const isBlocked = await storage.isUserBlocked(req.user!.id, receiverIdNum);
    if (isBlocked) {
      return res.status(403).json({
        success: false,
        error: "لا يمكنك إرسال رسالة لهذا المستخدم"
      });
    }

    const message = await messageService.createMessage({
      senderId: req.user!.id,
      receiverId: receiverIdNum,
      content: content.trim(),
      messageType,
      isPrivate: true
    });

    res.status(201).json({
      success: true,
      message,
      notification: "تم إرسال الرسالة بنجاح"
    });

  } catch (error) {
    console.error("Send private message error:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في الخادم"
    });
  }
});

// Get message by ID
router.get("/:messageId", authMiddleware, async (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId);
    if (isNaN(messageId)) {
      return res.status(400).json({
        success: false,
        error: "معرف الرسالة غير صالح"
      });
    }

    const message = await messageService.getMessageById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        error: "الرسالة غير موجودة"
      });
    }

    // Check if user can access this message
    const canAccess = !message.isPrivate || 
                     message.senderId === req.user!.id || 
                     message.receiverId === req.user!.id ||
                     req.user!.userType.includes('admin');

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        error: "ليس لديك صلاحية لعرض هذه الرسالة"
      });
    }

    res.json({
      success: true,
      message
    });

  } catch (error) {
    console.error("Get message by ID error:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في الخادم"
    });
  }
});

// Delete a message
router.delete("/:messageId", authMiddleware, async (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId);
    if (isNaN(messageId)) {
      return res.status(400).json({
        success: false,
        error: "معرف الرسالة غير صالح"
      });
    }

    const message = await messageService.getMessageById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        error: "الرسالة غير موجودة"
      });
    }

    // Check if user can delete this message
    const canDelete = message.senderId === req.user!.id || 
                     req.user!.userType.includes('moderator');

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        error: "ليس لديك صلاحية لحذف هذه الرسالة"
      });
    }

    await messageService.deleteMessage(messageId);

    res.json({
      success: true,
      message: "تم حذف الرسالة بنجاح"
    });

  } catch (error) {
    console.error("Delete message error:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في الخادم"
    });
  }
});

// Get user's private conversations
router.get("/conversations/list", authMiddleware, async (req, res) => {
  try {
    const conversations = await messageService.getUserConversations(req.user!.id);

    res.json({
      success: true,
      conversations,
      count: conversations.length
    });

  } catch (error) {
    console.error("Get conversations error:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في الخادم"
    });
  }
});

// Mark messages as read
router.put("/conversations/:userId/read", authMiddleware, async (req, res) => {
  try {
    const otherUserId = parseInt(req.params.userId);
    if (isNaN(otherUserId)) {
      return res.status(400).json({
        success: false,
        error: "معرف المستخدم غير صالح"
      });
    }

    await messageService.markConversationAsRead(req.user!.id, otherUserId);

    res.json({
      success: true,
      message: "تم تحديد الرسائل كمقروءة"
    });

  } catch (error) {
    console.error("Mark conversation as read error:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في الخادم"
    });
  }
});

// Get unread message count
router.get("/unread/count", authMiddleware, async (req, res) => {
  try {
    const count = await messageService.getUnreadMessageCount(req.user!.id);

    res.json({
      success: true,
      unreadCount: count
    });

  } catch (error) {
    console.error("Get unread count error:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في الخادم"
    });
  }
});

// Search messages
router.get("/search/:query", authMiddleware, async (req, res) => {
  try {
    const query = req.params.query.trim();
    const roomId = req.query.roomId as string;
    const limit = parseInt(req.query.limit as string) || 20;

    if (query.length < 2) {
      return res.status(400).json({
        success: false,
        error: "يجب أن يكون البحث على الأقل حرفين"
      });
    }

    if (limit > 50) {
      return res.status(400).json({
        success: false,
        error: "الحد الأقصى للنتائج هو 50"
      });
    }

    const messages = await messageService.searchMessages(query, req.user!.id, roomId, limit);

    res.json({
      success: true,
      messages,
      count: messages.length,
      query
    });

  } catch (error) {
    console.error("Search messages error:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في الخادم"
    });
  }
});

// Admin: Get all messages with filters
router.get("/admin/all", authMiddleware, requireRole('moderator'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      roomId,
      userId,
      messageType,
      startDate,
      endDate
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    if (limitNum > 100) {
      return res.status(400).json({
        success: false,
        error: "الحد الأقصى للرسائل هو 100"
      });
    }

    const filters = {
      roomId: roomId as string,
      userId: userId ? parseInt(userId as string) : undefined,
      messageType: messageType as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined
    };

    const messages = await messageService.getMessagesWithFilters(filters, limitNum, offset);

    res.json({
      success: true,
      messages,
      count: messages.length,
      page: pageNum,
      limit: limitNum,
      filters
    });

  } catch (error) {
    console.error("Get all messages error:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في الخادم"
    });
  }
});

// Admin: Delete multiple messages
router.delete("/admin/bulk", authMiddleware, requireRole('moderator'), async (req, res) => {
  try {
    const { messageIds } = req.body;

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "قائمة معرفات الرسائل مطلوبة"
      });
    }

    if (messageIds.length > 100) {
      return res.status(400).json({
        success: false,
        error: "الحد الأقصى للحذف هو 100 رسالة"
      });
    }

    const deletedCount = await messageService.deleteMultipleMessages(messageIds);

    res.json({
      success: true,
      message: `تم حذف ${deletedCount} رسالة بنجاح`,
      deletedCount
    });

  } catch (error) {
    console.error("Bulk delete messages error:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في الخادم"
    });
  }
});

// Get message statistics (admin only)
router.get("/admin/stats", authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const stats = await messageService.getMessageStatistics();

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error("Get message statistics error:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في الخادم"
    });
  }
});

export default router;
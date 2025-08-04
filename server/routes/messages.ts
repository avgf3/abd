import { Router } from "express";
import { storage } from "../storage";
import { sanitizeInput, validateMessageContent } from "../security";
import { db, dbType } from "../database-adapter";

const router = Router();

// Get public messages
router.get("/public", async (req, res) => {
  try {
    // Check database availability
    if (!db || dbType === 'disabled') {
      return res.json([]);
    }
    
    const limit = parseInt(req.query.limit as string) || 50;
    const messages = await storage.getPublicMessages(limit);
    res.json(messages);
  } catch (error) {
    console.error("Error fetching public messages:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// Get room messages
router.get("/room/:roomId", async (req, res) => {
  try {
    // Check database availability
    if (!db || dbType === 'disabled') {
      return res.json([]);
    }
    
    const roomId = req.params.roomId;
    const limit = parseInt(req.query.limit as string) || 50;
    const messages = await storage.getRoomMessages(roomId, limit);
    res.json(messages);
  } catch (error) {
    console.error("Error fetching room messages:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// Get private messages between two users
router.get("/private/:userId1/:userId2", async (req, res) => {
  try {
    // Check database availability
    if (!db || dbType === 'disabled') {
      return res.json([]);
    }
    
    const userId1 = parseInt(req.params.userId1);
    const userId2 = parseInt(req.params.userId2);
    const limit = parseInt(req.query.limit as string) || 50;
    
    if (isNaN(userId1) || isNaN(userId2)) {
      return res.status(400).json({ error: "معرفات المستخدمين غير صالحة" });
    }
    
    const messages = await storage.getPrivateMessages(userId1, userId2, limit);
    res.json(messages);
  } catch (error) {
    console.error("Error fetching private messages:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// Send message (this would typically be handled via WebSocket but kept for API compatibility)
router.post("/send", async (req, res) => {
  try {
    // Check database availability
    if (!db || dbType === 'disabled') {
      return res.status(503).json({ error: "قاعدة البيانات غير متاحة حالياً" });
    }
    
    const { senderId, receiverId, content, messageType, isPrivate } = req.body;
    
    if (!senderId || !content) {
      return res.status(400).json({ error: "معرف المرسل والمحتوى مطلوبان" });
    }
    
    // Validate and sanitize content
    const validationResult = validateMessageContent(content);
    if (!validationResult.isValid) {
      return res.status(400).json({ error: validationResult.reason || 'المحتوى غير صالح' });
    }
    
    const sanitizedContent = sanitizeInput(content);
    
    const message = await storage.createMessage({
      senderId: parseInt(senderId),
      receiverId: receiverId ? parseInt(receiverId) : undefined,
      content: sanitizedContent,
      messageType: messageType || "text",
      isPrivate: isPrivate || false
    });
    
    res.json({ message, success: true });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

export default router;
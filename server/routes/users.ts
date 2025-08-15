import { Router } from "express";
import { storage } from "../storage";
import { sanitizeInput } from "../security";

const router = Router();

// ملاحظة: تم نقل APIs رفع الصور إلى server/routes.ts لتوحيد المسارات
// جميع عمليات رفع الصور تتم عبر /api/upload/* الآن

// Get online users
router.get("/online", async (req, res) => {
  try {
    const users = await storage.getOnlineUsers();
    res.json(users);
  } catch (error) {
    console.error("Error fetching online users:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// Update user profile
router.put("/:id", async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const updates = req.body;
    
    // Sanitize inputs
    if (updates.username) {
      updates.username = sanitizeInput(updates.username);
    }
    if (updates.bio) {
      updates.bio = sanitizeInput(updates.bio);
    }
    
    const user = await storage.updateUser(userId, updates);
    if (!user) {
      return res.status(404).json({ error: "المستخدم غير موجود" });
    }
    
    res.json(user);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});


// User search
router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: "معطى البحث مطلوب" });
    }
    
    const allUsers = await storage.getAllUsers();
    const filteredUsers = allUsers.filter(user => 
      user.username.toLowerCase().includes(q.toLowerCase())
    );
    
    res.json(filteredUsers);
  } catch (error) {
    console.error("Error searching users:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// Update username color
router.post("/:userId/username-color", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { color } = req.body;
    
    if (!color || !/^#[0-9A-F]{6}$/i.test(color)) {
      return res.status(400).json({ error: "لون غير صالح" });
    }
    
    const user = await storage.updateUser(userId, { usernameColor: color });
    res.json({ user, message: "تم تحديث لون اسم المستخدم" });
  } catch (error) {
    console.error("Error updating username color:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// Update user color (alternative endpoint)
router.post("/:userId/color", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { color } = req.body;
    
    if (!color || !/^#[0-9A-F]{6}$/i.test(color)) {
      return res.status(400).json({ error: "لون غير صالح" });
    }
    
    const user = await storage.updateUser(userId, { usernameColor: color });
    res.json({ user, message: "تم تحديث لون المستخدم" });
  } catch (error) {
    console.error("Error updating user color:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// Update profile background color (legacy) -> use unified PUT /api/users/:id
router.post("/update-background-color", async (req, res) => {
  try {
    const { userId, color } = req.body;
    if (!userId || !color) {
      return res.status(400).json({ error: "معرف المستخدم واللون مطلوبان" });
    }
    const idNum = parseInt(userId);
    if (isNaN(idNum) || idNum <= 0) {
      return res.status(400).json({ error: "معرف المستخدم غير صحيح" });
    }
    // Delegate to unified route logic by normal update
    const firstHex = String(color).match(/#[0-9A-Fa-f]{6}/)?.[0] || color;
    const user = await storage.updateUser(idNum, { profileBackgroundColor: firstHex });
    res.json({ user, message: "تم تحديث لون خلفية الملف الشخصي" });
  } catch (error) {
    console.error("Error updating background color:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// Ignore user
router.post("/:userId/ignore/:targetId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const targetId = parseInt(req.params.targetId);
    
    await storage.addIgnoredUser(userId, targetId);
    res.json({ message: "تم تجاهل المستخدم" });
  } catch (error) {
    console.error("Error ignoring user:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// Unignore user
router.delete("/:userId/ignore/:targetId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const targetId = parseInt(req.params.targetId);
    
    await storage.removeIgnoredUser(userId, targetId);
    res.json({ message: "تم إلغاء تجاهل المستخدم" });
  } catch (error) {
    console.error("Error unignoring user:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// Get ignored users
router.get("/:userId/ignored", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const ignoredUserIds = await storage.getIgnoredUsers(userId);
    res.json(ignoredUserIds);
  } catch (error) {
    console.error("Error fetching ignored users:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// Get spam status
router.get("/:userId/spam-status", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    // This would integrate with spam protection system
    res.json({ spamScore: 0, isBlocked: false });
  } catch (error) {
    console.error("Error fetching spam status:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// Reset spam status
router.post("/:userId/reset-spam", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    // This would integrate with spam protection system
    res.json({ message: "تم إعادة تعيين حالة السبام" });
  } catch (error) {
    console.error("Error resetting spam status:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

export default router;
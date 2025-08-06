import { Router } from "express";
import { storage } from "../storage";
import { authMiddleware, requireRole } from "../auth/authMiddleware";
import { pointsService } from "../services/pointsService";
import { friendService } from "../services/friendService";
import { notificationService } from "../services/notificationService";

const router = Router();

// Get current user profile
router.get("/me", authMiddleware, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "غير مصرح",
        code: "NOT_AUTHENTICATED"
      });
    }

    const user = await storage.getUser(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "المستخدم غير موجود",
        code: "USER_NOT_FOUND"
      });
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      user: userWithoutPassword
    });

  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في الخادم"
    });
  }
});

// Get user by ID
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: "معرف المستخدم غير صالح"
      });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "المستخدم غير موجود"
      });
    }

    // Remove sensitive information
    const { password: _, ipAddress: __, deviceId: ___, ...publicUser } = user;

    res.json({
      success: true,
      user: publicUser
    });

  } catch (error) {
    console.error("Get user by ID error:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في الخادم"
    });
  }
});

// Update user profile
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: "معرف المستخدم غير صالح"
      });
    }

    // Check if user can update this profile
    if (req.user!.id !== userId && !req.user!.userType.includes('admin')) {
      return res.status(403).json({
        success: false,
        error: "ليس لديك صلاحية لتعديل هذا الملف الشخصي"
      });
    }

    const allowedFields = [
      'profileImage', 'profileBanner', 'profileBackgroundColor',
      'status', 'bio', 'country', 'relation', 'usernameColor',
      'userTheme', 'profileEffect'
    ];

    const updateData: any = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: "لا توجد بيانات للتحديث"
      });
    }

    const updatedUser = await storage.updateUser(userId, updateData);
    
    // Remove password from response
    const { password: _, ...userWithoutPassword } = updatedUser;

    res.json({
      success: true,
      user: userWithoutPassword,
      message: "تم تحديث الملف الشخصي بنجاح"
    });

  } catch (error) {
    console.error("Update user profile error:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في الخادم"
    });
  }
});

// Get online users
router.get("/online/list", authMiddleware, async (req, res) => {
  try {
    const roomId = req.query.roomId as string;
    const users = await storage.getOnlineUsers(roomId);

    // Remove sensitive information
    const publicUsers = users.map(user => {
      const { password: _, ipAddress: __, deviceId: ___, ...publicUser } = user;
      return publicUser;
    });

    res.json({
      success: true,
      users: publicUsers,
      count: publicUsers.length
    });

  } catch (error) {
    console.error("Get online users error:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في الخادم"
    });
  }
});

// Search users
router.get("/search/:query", authMiddleware, async (req, res) => {
  try {
    const query = req.params.query.trim();
    if (query.length < 2) {
      return res.status(400).json({
        success: false,
        error: "يجب أن يكون البحث على الأقل حرفين"
      });
    }

    const users = await storage.searchUsers(query);
    
    // Remove sensitive information
    const publicUsers = users.map(user => {
      const { password: _, ipAddress: __, deviceId: ___, ...publicUser } = user;
      return publicUser;
    });

    res.json({
      success: true,
      users: publicUsers,
      count: publicUsers.length
    });

  } catch (error) {
    console.error("Search users error:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في الخادم"
    });
  }
});

// Get user points and level
router.get("/:id/points", authMiddleware, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: "معرف المستخدم غير صالح"
      });
    }

    const pointsData = await pointsService.getUserPointsData(userId);
    
    res.json({
      success: true,
      points: pointsData
    });

  } catch (error) {
    console.error("Get user points error:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في الخادم"
    });
  }
});

// Transfer points (admin only)
router.post("/:id/points/transfer", authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { points, reason } = req.body;

    if (isNaN(userId) || isNaN(points)) {
      return res.status(400).json({
        success: false,
        error: "البيانات المدخلة غير صالحة"
      });
    }

    const result = await pointsService.transferPoints(
      req.user!.id,
      userId,
      points,
      reason || 'تحويل من الإدارة'
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: "تم تحويل النقاط بنجاح"
    });

  } catch (error) {
    console.error("Transfer points error:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في الخادم"
    });
  }
});

// Get user friends
router.get("/:id/friends", authMiddleware, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: "معرف المستخدم غير صالح"
      });
    }

    // Check if user can view friends list
    if (req.user!.id !== userId && !req.user!.userType.includes('admin')) {
      return res.status(403).json({
        success: false,
        error: "ليس لديك صلاحية لعرض قائمة الأصدقاء"
      });
    }

    const friends = await friendService.getUserFriends(userId);

    res.json({
      success: true,
      friends,
      count: friends.length
    });

  } catch (error) {
    console.error("Get user friends error:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في الخادم"
    });
  }
});

// Send friend request
router.post("/:id/friends/request", authMiddleware, async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id);
    if (isNaN(targetUserId)) {
      return res.status(400).json({
        success: false,
        error: "معرف المستخدم غير صالح"
      });
    }

    if (req.user!.id === targetUserId) {
      return res.status(400).json({
        success: false,
        error: "لا يمكنك إرسال طلب صداقة لنفسك"
      });
    }

    const result = await friendService.sendFriendRequest(req.user!.id, targetUserId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: "تم إرسال طلب الصداقة بنجاح"
    });

  } catch (error) {
    console.error("Send friend request error:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في الخادم"
    });
  }
});

// Accept/reject friend request
router.put("/friends/:requestId", authMiddleware, async (req, res) => {
  try {
    const requestId = parseInt(req.params.requestId);
    const { action } = req.body; // 'accept' or 'reject'

    if (isNaN(requestId) || !['accept', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: "البيانات المدخلة غير صالحة"
      });
    }

    const result = action === 'accept' 
      ? await friendService.acceptFriendRequest(requestId, req.user!.id)
      : await friendService.rejectFriendRequest(requestId, req.user!.id);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: action === 'accept' ? "تم قبول طلب الصداقة" : "تم رفض طلب الصداقة"
    });

  } catch (error) {
    console.error("Handle friend request error:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في الخادم"
    });
  }
});

// Get user notifications
router.get("/:id/notifications", authMiddleware, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: "معرف المستخدم غير صالح"
      });
    }

    // Check if user can view notifications
    if (req.user!.id !== userId && !req.user!.userType.includes('admin')) {
      return res.status(403).json({
        success: false,
        error: "ليس لديك صلاحية لعرض الإشعارات"
      });
    }

    const notifications = await notificationService.getUserNotifications(userId);

    res.json({
      success: true,
      notifications,
      count: notifications.length
    });

  } catch (error) {
    console.error("Get user notifications error:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في الخادم"
    });
  }
});

// Mark notification as read
router.put("/notifications/:notificationId/read", authMiddleware, async (req, res) => {
  try {
    const notificationId = parseInt(req.params.notificationId);
    if (isNaN(notificationId)) {
      return res.status(400).json({
        success: false,
        error: "معرف الإشعار غير صالح"
      });
    }

    const result = await notificationService.markAsRead(notificationId, req.user!.id);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: "تم تحديد الإشعار كمقروء"
    });

  } catch (error) {
    console.error("Mark notification as read error:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في الخادم"
    });
  }
});

// Block/unblock user
router.post("/:id/block", authMiddleware, async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id);
    const { action } = req.body; // 'block' or 'unblock'

    if (isNaN(targetUserId) || !['block', 'unblock'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: "البيانات المدخلة غير صالحة"
      });
    }

    if (req.user!.id === targetUserId) {
      return res.status(400).json({
        success: false,
        error: "لا يمكنك حظر نفسك"
      });
    }

    const result = action === 'block'
      ? await storage.blockUser(req.user!.id, targetUserId)
      : await storage.unblockUser(req.user!.id, targetUserId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: action === 'block' ? "تم حظر المستخدم" : "تم إلغاء حظر المستخدم"
    });

  } catch (error) {
    console.error("Block/unblock user error:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في الخادم"
    });
  }
});

// Admin: Ban/unban user
router.post("/:id/ban", authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id);
    const { action, reason, duration } = req.body; // 'ban' or 'unban'

    if (isNaN(targetUserId) || !['ban', 'unban'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: "البيانات المدخلة غير صالحة"
      });
    }

    const result = action === 'ban'
      ? await storage.banUser(targetUserId, reason, duration)
      : await storage.unbanUser(targetUserId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: action === 'ban' ? "تم حظر المستخدم" : "تم إلغاء حظر المستخدم"
    });

  } catch (error) {
    console.error("Ban/unban user error:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في الخادم"
    });
  }
});

export default router;
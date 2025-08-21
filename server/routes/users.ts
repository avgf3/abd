import { Router } from 'express';
import { z } from 'zod';
import { eq, and, or, desc, sql } from 'drizzle-orm';
import { db } from '../database-adapter';
import { users, friends, notifications, privateMessages } from '../../shared/schema';
import { protect } from '../middleware/enhancedSecurity';
import { friendService } from '../services/friendService';
import { notificationService } from '../services/notificationService';
import { pointsService } from '../services/pointsService';
import { databaseService } from '../services/databaseService';
import { sanitizeInput } from '../security';
import { sanitizeUserData, sanitizeUsersArray } from '../utils/data-sanitizer';

const router = Router();

// Get current user
router.get('/me', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'غير مصرح' });
  }

  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.session.userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }

    const sanitizedUser = sanitizeUserData(user);
    res.json({ user: sanitizedUser });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في جلب بيانات المستخدم' });
  }
});

// Update user profile
router.patch('/:userId', protect.ownership, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const updates = req.body;

    // Sanitize inputs
    if (updates.displayName) {
      updates.displayName = sanitizeInput(updates.displayName);
    }
    if (updates.bio) {
      updates.bio = sanitizeInput(updates.bio);
    }

    const [updatedUser] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }

    const sanitizedUser = sanitizeUserData(updatedUser);
    res.json({ user: sanitizedUser });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في تحديث البيانات' });
  }
});

// Get user profile
router.get('/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }

    const sanitizedUser = sanitizeUserData(user);
    res.json({ user: sanitizedUser });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في جلب بيانات المستخدم' });
  }
});

// Search users
router.get('/search/:query', async (req, res) => {
  try {
    const query = sanitizeInput(req.params.query);
    
    const foundUsers = await db
      .select()
      .from(users)
      .where(
        or(
          sql`${users.username} ILIKE ${'%' + query + '%'}`,
          sql`${users.displayName} ILIKE ${'%' + query + '%'}`
        )
      )
      .limit(20);

    const sanitized = sanitizeUsersArray(foundUsers);
    res.json({ users: sanitized });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في البحث' });
  }
});

// Get user stats
router.get('/:userId/stats', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    const stats = await pointsService.getUserStats(userId);
    if (!stats) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }

    res.json({ stats });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في جلب الإحصائيات' });
  }
});

// Get user notifications
router.get('/:userId/notifications', protect.ownership, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    const userNotifications = await notificationService.getUserNotifications(userId);
    res.json({ notifications: userNotifications });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في جلب الإشعارات' });
  }
});

// Mark notification as read
router.post('/:userId/notifications/:notificationId/read', protect.ownership, async (req, res) => {
  try {
    const notificationId = parseInt(req.params.notificationId);
    
    await notificationService.markAsRead(notificationId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في تحديث الإشعار' });
  }
});

// Get blocked users
router.get('/:userId/blocked', protect.ownership, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    const blockedUsers = await databaseService.getBlockedUsers(userId);
    res.json({ blockedUsers });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في جلب قائمة المحظورين' });
  }
});

// Block user
router.post('/:userId/block/:targetUserId', protect.ownership, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const targetUserId = parseInt(req.params.targetUserId);
    
    await databaseService.blockUser(userId, targetUserId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في حظر المستخدم' });
  }
});

// Unblock user
router.delete('/:userId/block/:targetUserId', protect.ownership, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const targetUserId = parseInt(req.params.targetUserId);
    
    await databaseService.unblockUser(userId, targetUserId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في إلغاء حظر المستخدم' });
  }
});

export default router;
import { Router } from 'express';
import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../database-adapter';
import { users, reports, moderationLogs } from '../../shared/schema';
import { protect } from '../middleware/enhancedSecurity';
import { moderationSystem } from '../moderation';
import { getIO } from '../realtime';
import { sanitizeInput } from '../security';
import { pointsService } from '../services/pointsService';
import { notificationService } from '../services/notificationService';

const router = Router();

// Get reports
router.get('/reports', protect.admin, async (req, res) => {
  try {
    const pendingReports = await db
      .select()
      .from(reports)
      .where(eq(reports.status, 'pending'))
      .orderBy(desc(reports.createdAt))
      .limit(50);

    res.json({ reports: pendingReports });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في جلب البلاغات' });
  }
});

// Submit report
router.post('/report', async (req, res) => {
  try {
    const { targetId, targetType, reason, details } = req.body;
    
    if (!req.session.userId) {
      return res.status(401).json({ error: 'يجب تسجيل الدخول لإرسال بلاغ' });
    }

    const report = await moderationSystem.reportContent({
      reporterId: req.session.userId,
      targetId,
      targetType,
      reason,
      details: sanitizeInput(details || ''),
    });

    res.json({ success: true, reportId: report.id });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في إرسال البلاغ' });
  }
});

// Mute user
router.post('/mute', protect.moderator, async (req, res) => {
  try {
    const { userId, duration, reason } = req.body;
    
    const result = await moderationSystem.muteUser(
      userId,
      req.session.userId!,
      duration,
      sanitizeInput(reason)
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Notify via Socket.IO
    const io = getIO();
    io.to(`user:${userId}`).emit('user:muted', {
      duration,
      reason,
      mutedBy: req.session.userId,
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في كتم المستخدم' });
  }
});

// Unmute user
router.post('/unmute', protect.moderator, async (req, res) => {
  try {
    const { userId } = req.body;
    
    await db
      .update(users)
      .set({
        isMuted: false,
        muteExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // Log action
    await db.insert(moderationLogs).values({
      moderatorId: req.session.userId!,
      targetUserId: userId,
      action: 'unmute',
      reason: 'إلغاء الكتم',
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في إلغاء كتم المستخدم' });
  }
});

// Ban user
router.post('/ban', protect.admin, async (req, res) => {
  try {
    const { userId, permanent, duration, reason } = req.body;
    
    const result = await moderationSystem.banUser(
      userId,
      req.session.userId!,
      permanent,
      duration,
      sanitizeInput(reason)
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Notify via Socket.IO
    const io = getIO();
    io.to(`user:${userId}`).emit('user:banned', {
      permanent,
      duration,
      reason,
      bannedBy: req.session.userId,
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في حظر المستخدم' });
  }
});

// Block user (owner only)
router.post('/block', protect.owner, async (req, res) => {
  try {
    const { userId, reason } = req.body;
    
    const result = await moderationSystem.blockUser(
      userId,
      req.session.userId!,
      sanitizeInput(reason)
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في حظر المستخدم' });
  }
});

// Promote user
router.post('/promote', protect.owner, async (req, res) => {
  try {
    const { userId, role } = req.body;
    
    if (!['moderator', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'رتبة غير صالحة' });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }

    await db
      .update(users)
      .set({
        role,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // Grant points for promotion
    await pointsService.grantPoints(userId, 500, 'ترقية إلى ' + role);

    // Send notification
    await notificationService.createNotification({
      userId,
      type: 'promotion',
      message: `تمت ترقيتك إلى ${role}`,
      data: { role },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في ترقية المستخدم' });
  }
});

// Demote user
router.post('/demote', protect.owner, async (req, res) => {
  try {
    const { userId } = req.body;
    
    await db
      .update(users)
      .set({
        role: 'member',
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // Send notification
    await notificationService.createNotification({
      userId,
      type: 'demotion',
      message: 'تم تخفيض رتبتك إلى عضو',
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في تخفيض رتبة المستخدم' });
  }
});

// Get moderation logs
router.get('/logs', protect.admin, async (req, res) => {
  try {
    const logs = await db
      .select({
        log: moderationLogs,
        moderator: users,
      })
      .from(moderationLogs)
      .leftJoin(users, eq(moderationLogs.moderatorId, users.id))
      .orderBy(desc(moderationLogs.createdAt))
      .limit(100);

    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في جلب سجلات الإشراف' });
  }
});

export default router;
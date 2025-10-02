import express from 'express';
import { db } from '../database-adapter';
import { protect } from '../middleware/enhancedSecurity';
import { getIO } from '../realtime';

const router = express.Router();

// ====================================
// جلب الإشعارات
// ====================================

router.get('/', protect.auth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const type = req.query.type as string;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    let query = `
      SELECT 
        n.*,
        u.username as sender_username,
        u.profile_image as sender_avatar,
        u.level as sender_level
      FROM notifications n
      LEFT JOIN users u ON u.id = n.sender_id
      WHERE n.user_id = $1
    `;

    const params: any[] = [userId];

    if (type && type !== 'all') {
      query += ` AND n.type = $${params.length + 1}`;
      params.push(type);
    }

    query += ` ORDER BY n.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    // حساب عدد غير المقروء
    const unreadResult = await db.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE',
      [userId]
    );

    res.json({ 
      notifications: result.rows,
      unreadCount: parseInt(unreadResult.rows[0].count)
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'خطأ في جلب الإشعارات' });
  }
});

// ====================================
// تعليم كمقروء
// ====================================

router.put('/:id/read', protect.auth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const notificationId = parseInt(req.params.id);

    await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
      [notificationId, userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'خطأ في تحديث الإشعار' });
  }
});

// تعليم الكل كمقروء
router.put('/read-all', protect.auth, async (req, res) => {
  try {
    const userId = req.session.userId;

    await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = $1',
      [userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ error: 'خطأ في تحديث الإشعارات' });
  }
});

// ====================================
// حذف إشعار
// ====================================

router.delete('/:id', protect.auth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const notificationId = parseInt(req.params.id);

    await db.query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
      [notificationId, userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'خطأ في حذف الإشعار' });
  }
});

// ====================================
// إنشاء إشعار (دالة مساعدة)
// ====================================

export async function createNotification({
  userId,
  type,
  senderId,
  content,
  data
}: {
  userId: number;
  type: string;
  senderId?: number;
  content: string;
  data?: any;
}) {
  try {
    const result = await db.query(`
      INSERT INTO notifications (user_id, type, sender_id, content, data)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [userId, type, senderId || null, content, data ? JSON.stringify(data) : null]);

    const notification = result.rows[0];

    // جلب معلومات المرسل
    if (senderId) {
      const senderResult = await db.query(
        'SELECT username, profile_image, level FROM users WHERE id = $1',
        [senderId]
      );

      if (senderResult.rows.length > 0) {
        notification.senderUsername = senderResult.rows[0].username;
        notification.senderAvatar = senderResult.rows[0].profile_image;
        notification.senderLevel = senderResult.rows[0].level;
      }
    }

    // بث الإشعار عبر Socket.IO
    try {
      const io = getIO();
      io.to(userId.toString()).emit('notification', notification);
    } catch (socketError) {
      console.error('Failed to broadcast notification:', socketError);
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

export default router;

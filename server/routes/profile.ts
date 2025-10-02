import express from 'express';
import { db } from '../database-adapter';
import { protect } from '../middleware/auth';
import { z } from 'zod';

const router = express.Router();

// ====================================
// زيارات الملف الشخصي
// ====================================

// تسجيل زيارة
router.post('/visit', protect.auth, async (req, res) => {
  try {
    const visitorId = req.session.userId;
    const { profileUserId } = req.body;

    if (!visitorId || !profileUserId) {
      return res.status(400).json({ error: 'بيانات مفقودة' });
    }

    // لا تسجل زيارة المستخدم لملفه الشخصي
    if (visitorId === profileUserId) {
      return res.json({ success: true });
    }

    const result = await db.query(`
      INSERT INTO profile_visitors (profile_user_id, visitor_user_id, visited_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (profile_user_id, visitor_user_id)
      DO UPDATE SET visited_at = NOW()
      RETURNING *
    `, [profileUserId, visitorId]);

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error registering visit:', error);
    res.status(500).json({ error: 'خطأ في تسجيل الزيارة' });
  }
});

// جلب زوار الملف الشخصي
router.get('/visitors', protect.auth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await db.query(`
      SELECT 
        pv.id,
        pv.visited_at,
        u.id as user_id,
        u.username,
        u.profile_image as avatar,
        u.level,
        u.is_online
      FROM profile_visitors pv
      JOIN users u ON u.id = pv.visitor_user_id
      WHERE pv.profile_user_id = $1
      ORDER BY pv.visited_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    res.json({ 
      data: result.rows,
      total: result.rowCount 
    });
  } catch (error) {
    console.error('Error fetching visitors:', error);
    res.status(500).json({ error: 'خطأ في جلب الزوار' });
  }
});

// ====================================
// الإطارات
// ====================================

// جلب الإطارات المتاحة
router.get('/frames', protect.auth, async (req, res) => {
  try {
    const userId = req.session.userId;

    const result = await db.query(`
      SELECT 
        pf.*,
        CASE WHEN uf.id IS NOT NULL THEN TRUE ELSE FALSE END as is_owned,
        CASE WHEN uf.equipped = TRUE THEN TRUE ELSE FALSE END as is_equipped
      FROM profile_frames pf
      LEFT JOIN user_frames uf ON uf.frame_id = pf.id AND uf.user_id = $1
      ORDER BY pf.min_level ASC, pf.price_points ASC
    `, [userId]);

    res.json({ data: result.rows });
  } catch (error) {
    console.error('Error fetching frames:', error);
    res.status(500).json({ error: 'خطأ في جلب الإطارات' });
  }
});

// شراء إطار
router.post('/frames/:frameId/purchase', protect.auth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const frameId = parseInt(req.params.frameId);

    // جلب معلومات الإطار
    const frameResult = await db.query(
      'SELECT * FROM profile_frames WHERE id = $1',
      [frameId]
    );

    if (frameResult.rows.length === 0) {
      return res.status(404).json({ error: 'الإطار غير موجود' });
    }

    const frame = frameResult.rows[0];

    // جلب معلومات المستخدم
    const userResult = await db.query(
      'SELECT id, level, points FROM users WHERE id = $1',
      [userId]
    );

    const user = userResult.rows[0];

    // التحقق من المستوى
    if (user.level < frame.min_level) {
      return res.status(400).json({ 
        error: `يجب أن تكون في المستوى ${frame.min_level} لشراء هذا الإطار` 
      });
    }

    // التحقق من النقاط
    if (user.points < frame.price_points) {
      return res.status(400).json({ 
        error: `نقاطك غير كافية. تحتاج ${frame.price_points} نقطة` 
      });
    }

    // خصم النقاط
    await db.query(
      'UPDATE users SET points = points - $1 WHERE id = $2',
      [frame.price_points, userId]
    );

    // إضافة الإطار للمستخدم
    await db.query(`
      INSERT INTO user_frames (user_id, frame_id, equipped)
      VALUES ($1, $2, FALSE)
      ON CONFLICT (user_id, frame_id) DO NOTHING
    `, [userId, frameId]);

    res.json({ 
      success: true, 
      message: 'تم شراء الإطار بنجاح',
      remainingPoints: user.points - frame.price_points
    });
  } catch (error) {
    console.error('Error purchasing frame:', error);
    res.status(500).json({ error: 'خطأ في شراء الإطار' });
  }
});

// تفعيل إطار
router.post('/frames/:frameId/equip', protect.auth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const frameId = parseInt(req.params.frameId);

    // التحقق من ملكية الإطار
    const checkResult = await db.query(
      'SELECT * FROM user_frames WHERE user_id = $1 AND frame_id = $2',
      [userId, frameId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'لا تملك هذا الإطار' });
    }

    // إلغاء تفعيل جميع الإطارات
    await db.query(
      'UPDATE user_frames SET equipped = FALSE WHERE user_id = $1',
      [userId]
    );

    // تفعيل الإطار المحدد
    await db.query(
      'UPDATE user_frames SET equipped = TRUE WHERE user_id = $1 AND frame_id = $2',
      [userId, frameId]
    );

    // تحديث frame_type في جدول المستخدمين
    const frameResult = await db.query(
      'SELECT type FROM profile_frames WHERE id = $1',
      [frameId]
    );

    if (frameResult.rows.length > 0) {
      await db.query(
        'UPDATE users SET frame_type = $1 WHERE id = $2',
        [frameResult.rows[0].type, userId]
      );
    }

    res.json({ 
      success: true, 
      message: 'تم تفعيل الإطار',
      frameType: frameResult.rows[0]?.type
    });
  } catch (error) {
    console.error('Error equipping frame:', error);
    res.status(500).json({ error: 'خطأ في تفعيل الإطار' });
  }
});

// ====================================
// الهدايا
// ====================================

// جلب الهدايا المتاحة
router.get('/gifts/available', protect.auth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM gifts
      WHERE is_active = TRUE
      ORDER BY category, price_points ASC
    `);

    res.json({ data: result.rows });
  } catch (error) {
    console.error('Error fetching gifts:', error);
    res.status(500).json({ error: 'خطأ في جلب الهدايا' });
  }
});

// إرسال هدية
router.post('/gifts/send', protect.auth, async (req, res) => {
  try {
    const senderId = req.session.userId;
    const { giftId, receiverId, message, isAnonymous } = req.body;

    // التحقق من البيانات
    if (!giftId || !receiverId) {
      return res.status(400).json({ error: 'بيانات مفقودة' });
    }

    // جلب معلومات الهدية
    const giftResult = await db.query(
      'SELECT * FROM gifts WHERE id = $1 AND is_active = TRUE',
      [giftId]
    );

    if (giftResult.rows.length === 0) {
      return res.status(404).json({ error: 'الهدية غير موجودة' });
    }

    const gift = giftResult.rows[0];

    // جلب نقاط المرسل
    const senderResult = await db.query(
      'SELECT points FROM users WHERE id = $1',
      [senderId]
    );

    const sender = senderResult.rows[0];

    // التحقق من النقاط
    if (sender.points < gift.price_points) {
      return res.status(400).json({ 
        error: `نقاطك غير كافية. تحتاج ${gift.price_points} نقطة` 
      });
    }

    // خصم النقاط من المرسل
    await db.query(
      'UPDATE users SET points = points - $1 WHERE id = $2',
      [gift.price_points, senderId]
    );

    // إضافة نقاط للمستقبل (10% من قيمة الهدية)
    const receiverBonus = Math.floor(gift.price_points * 0.1);
    await db.query(
      'UPDATE users SET points = points + $1 WHERE id = $2',
      [receiverBonus, receiverId]
    );

    // حفظ الهدية
    const giftResult2 = await db.query(`
      INSERT INTO user_gifts (gift_id, sender_id, receiver_id, message, is_anonymous)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [giftId, senderId, receiverId, message, isAnonymous || false]);

    // إنشاء إشعار
    const notifContent = isAnonymous 
      ? `تلقيت هدية ${gift.emoji} من مجهول`
      : `أرسل لك هدية ${gift.emoji}`;
      
    await db.query(`
      INSERT INTO notifications (user_id, type, sender_id, content, data)
      VALUES ($1, 'gift', $2, $3, $4)
    `, [
      receiverId, 
      isAnonymous ? null : senderId, 
      notifContent,
      JSON.stringify({ giftId, giftEmoji: gift.emoji })
    ]);

    res.json({ 
      success: true, 
      message: 'تم إرسال الهدية',
      gift: giftResult2.rows[0]
    });
  } catch (error) {
    console.error('Error sending gift:', error);
    res.status(500).json({ error: 'خطأ في إرسال الهدية' });
  }
});

// جلب هدايا مستخدم
router.get('/gifts/received/:userId', protect.auth, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const limit = parseInt(req.query.limit as string) || 50;

    const result = await db.query(`
      SELECT 
        ug.*,
        g.name as gift_name,
        g.emoji as gift_emoji,
        g.category,
        u.username as sender_username,
        u.profile_image as sender_avatar,
        u.level as sender_level
      FROM user_gifts ug
      JOIN gifts g ON g.id = ug.gift_id
      LEFT JOIN users u ON u.id = ug.sender_id
      WHERE ug.receiver_id = $1
      ORDER BY ug.sent_at DESC
      LIMIT $2
    `, [userId, limit]);

    // تجميع الهدايا المتشابهة
    const giftsMap = new Map();
    result.rows.forEach(row => {
      const key = `${row.gift_id}-${row.is_anonymous ? 'anon' : row.sender_id}`;
      if (giftsMap.has(key)) {
        giftsMap.get(key).count++;
      } else {
        giftsMap.set(key, {
          id: row.id,
          giftId: row.gift_id,
          name: row.gift_name,
          emoji: row.gift_emoji,
          category: row.category,
          senderId: row.sender_id,
          senderUsername: row.is_anonymous ? 'مجهول' : row.sender_username,
          senderAvatar: row.sender_avatar,
          senderLevel: row.sender_level,
          count: 1,
          lastSentAt: row.sent_at
        });
      }
    });

    res.json({ data: Array.from(giftsMap.values()) });
  } catch (error) {
    console.error('Error fetching gifts:', error);
    res.status(500).json({ error: 'خطأ في جلب الهدايا' });
  }
});

export default router;

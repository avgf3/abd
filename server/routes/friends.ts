import { Router } from 'express';
import { z } from 'zod';
import { eq, and, or } from 'drizzle-orm';
import { db } from '../database-adapter';
import { friends, users } from '../../shared/schema';
import { friendService } from '../services/friendService';
import { notificationService } from '../services/notificationService';
import { pointsService } from '../services/pointsService';
import { friendRequestLimiter } from '../security';
import { sanitizeUsersArray } from '../utils/data-sanitizer';

const router = Router();

// Get friends list
router.get('/', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'غير مصرح' });
  }

  try {
    const friendsList = await friendService.getFriends(req.session.userId);
    res.json({ friends: friendsList });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في جلب قائمة الأصدقاء' });
  }
});

// Send friend request
router.post('/request', friendRequestLimiter, async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'غير مصرح' });
  }

  try {
    const { userId } = req.body;
    
    if (userId === req.session.userId) {
      return res.status(400).json({ error: 'لا يمكنك إرسال طلب صداقة لنفسك' });
    }

    // Check if already friends or request exists
    const existingRelation = await db
      .select()
      .from(friends)
      .where(
        or(
          and(
            eq(friends.userId, req.session.userId),
            eq(friends.friendId, userId)
          ),
          and(
            eq(friends.userId, userId),
            eq(friends.friendId, req.session.userId)
          )
        )
      )
      .limit(1);

    if (existingRelation.length > 0) {
      const relation = existingRelation[0];
      if (relation.status === 'accepted') {
        return res.status(400).json({ error: 'أنتم أصدقاء بالفعل' });
      }
      if (relation.status === 'pending') {
        return res.status(400).json({ error: 'طلب الصداقة موجود بالفعل' });
      }
    }

    // Create friend request
    const request = await friendService.sendFriendRequest(req.session.userId, userId);

    // Send notification
    await notificationService.createNotification({
      userId,
      type: 'friend_request',
      message: 'طلب صداقة جديد',
      relatedUserId: req.session.userId,
    });

    res.json({ success: true, request });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في إرسال طلب الصداقة' });
  }
});

// Accept friend request
router.post('/accept/:requestId', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'غير مصرح' });
  }

  try {
    const requestId = parseInt(req.params.requestId);
    const result = await friendService.acceptFriendRequest(requestId, req.session.userId);

    if (!result) {
      return res.status(404).json({ error: 'طلب الصداقة غير موجود' });
    }

    // Grant points for making new friends
    await pointsService.grantPoints(req.session.userId, 50, 'قبول طلب صداقة');
    await pointsService.grantPoints(result.userId, 50, 'تم قبول طلب الصداقة');

    // Send notification
    await notificationService.createNotification({
      userId: result.userId,
      type: 'friend_request_accepted',
      message: 'تم قبول طلب الصداقة',
      relatedUserId: req.session.userId,
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في قبول طلب الصداقة' });
  }
});

// Reject friend request
router.post('/reject/:requestId', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'غير مصرح' });
  }

  try {
    const requestId = parseInt(req.params.requestId);
    const result = await friendService.rejectFriendRequest(requestId, req.session.userId);

    if (!result) {
      return res.status(404).json({ error: 'طلب الصداقة غير موجود' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في رفض طلب الصداقة' });
  }
});

// Remove friend
router.delete('/:friendId', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'غير مصرح' });
  }

  try {
    const friendId = parseInt(req.params.friendId);
    const result = await friendService.removeFriend(req.session.userId, friendId);

    if (!result) {
      return res.status(404).json({ error: 'الصديق غير موجود' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في إزالة الصديق' });
  }
});

// Get pending friend requests
router.get('/requests/pending', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'غير مصرح' });
  }

  try {
    const requests = await friendService.getPendingRequests(req.session.userId);
    res.json({ requests });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في جلب طلبات الصداقة' });
  }
});

// Get sent friend requests
router.get('/requests/sent', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'غير مصرح' });
  }

  try {
    const requests = await db
      .select({
        id: friends.id,
        friendId: friends.friendId,
        status: friends.status,
        createdAt: friends.createdAt,
        friend: users,
      })
      .from(friends)
      .innerJoin(users, eq(friends.friendId, users.id))
      .where(
        and(
          eq(friends.userId, req.session.userId),
          eq(friends.status, 'pending')
        )
      );

    const sanitized = requests.map(r => ({
      ...r,
      friend: sanitizeUsersArray([r.friend])[0],
    }));

    res.json({ requests: sanitized });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في جلب الطلبات المرسلة' });
  }
});

export default router;
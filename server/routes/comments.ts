import express from 'express';
import { db } from '../database-adapter';
import { protect } from '../middleware/auth';
import { getIO } from '../realtime';
import { createNotification } from './notifications';

const router = express.Router();

// ====================================
// إنشاء تعليق
// ====================================

router.post('/', protect.auth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { postId, content, parentCommentId } = req.body;

    if (!postId || !content?.trim()) {
      return res.status(400).json({ error: 'بيانات مفقودة' });
    }

    // التحقق من وجود المنشور
    const postCheck = await db.query(
      'SELECT id, user_id FROM wall_posts WHERE id = $1',
      [postId]
    );

    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: 'المنشور غير موجود' });
    }

    const post = postCheck.rows[0];

    // إذا كان رد، التحقق من وجود التعليق الأصلي
    if (parentCommentId) {
      const parentCheck = await db.query(
        'SELECT id FROM wall_comments WHERE id = $1 AND post_id = $2',
        [parentCommentId, postId]
      );

      if (parentCheck.rows.length === 0) {
        return res.status(404).json({ error: 'التعليق الأصلي غير موجود' });
      }
    }

    // إنشاء التعليق
    const result = await db.query(`
      INSERT INTO wall_comments (post_id, user_id, parent_comment_id, content)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [postId, userId, parentCommentId || null, content.trim()]);

    const comment = result.rows[0];

    // جلب معلومات المعلق
    const userResult = await db.query(
      'SELECT username, profile_image, level FROM users WHERE id = $1',
      [userId]
    );

    const commentWithUser = {
      ...comment,
      username: userResult.rows[0]?.username,
      userAvatar: userResult.rows[0]?.profile_image,
      userLevel: userResult.rows[0]?.level,
      likesCount: 0,
      isLiked: false,
      replies: []
    };

    // إرسال إشعار لصاحب المنشور (إذا لم يكن هو المعلق)
    if (post.user_id !== userId) {
      await createNotification({
        userId: post.user_id,
        type: 'comment',
        senderId: userId,
        content: parentCommentId 
          ? 'رد على تعليقك' 
          : 'علّق على منشورك',
        data: { postId, commentId: comment.id }
      });
    }

    // إرسال إشعار لصاحب التعليق الأصلي (في حالة الرد)
    if (parentCommentId) {
      const parentResult = await db.query(
        'SELECT user_id FROM wall_comments WHERE id = $1',
        [parentCommentId]
      );

      const parentUserId = parentResult.rows[0]?.user_id;
      if (parentUserId && parentUserId !== userId && parentUserId !== post.user_id) {
        await createNotification({
          userId: parentUserId,
          type: 'comment',
          senderId: userId,
          content: 'رد على تعليقك',
          data: { postId, commentId: comment.id, parentCommentId }
        });
      }
    }

    // بث التعليق الجديد عبر Socket.IO
    try {
      const io = getIO();
      io.emit('wall:comment', {
        postId,
        comment: commentWithUser
      });
    } catch (socketError) {
      console.error('Failed to broadcast comment:', socketError);
    }

    res.json({ 
      success: true, 
      comment: commentWithUser 
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'خطأ في إنشاء التعليق' });
  }
});

// ====================================
// جلب تعليقات منشور
// ====================================

router.get('/post/:postId', protect.auth, async (req, res) => {
  try {
    const postId = parseInt(req.params.postId);
    const userId = req.session.userId;

    // جلب جميع التعليقات
    const result = await db.query(`
      SELECT 
        wc.*,
        u.username,
        u.profile_image as user_avatar,
        u.level as user_level,
        (SELECT COUNT(*) FROM comment_likes WHERE comment_id = wc.id) as likes_count,
        EXISTS(SELECT 1 FROM comment_likes WHERE comment_id = wc.id AND user_id = $2) as is_liked
      FROM wall_comments wc
      JOIN users u ON u.id = wc.user_id
      WHERE wc.post_id = $1
      ORDER BY wc.created_at ASC
    `, [postId, userId]);

    // بناء شجرة التعليقات
    const commentsMap = new Map();
    const rootComments: any[] = [];

    // تجهيز جميع التعليقات
    result.rows.forEach(row => {
      commentsMap.set(row.id, {
        id: row.id,
        postId: row.post_id,
        userId: row.user_id,
        username: row.username,
        userAvatar: row.user_avatar,
        userLevel: row.user_level,
        content: row.content,
        likesCount: parseInt(row.likes_count),
        isLiked: row.is_liked,
        parentCommentId: row.parent_comment_id,
        createdAt: row.created_at,
        replies: []
      });
    });

    // بناء الشجرة
    commentsMap.forEach(comment => {
      if (comment.parentCommentId) {
        const parent = commentsMap.get(comment.parentCommentId);
        if (parent) {
          parent.replies.push(comment);
        }
      } else {
        rootComments.push(comment);
      }
    });

    res.json({ 
      data: rootComments,
      total: result.rows.length 
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'خطأ في جلب التعليقات' });
  }
});

// ====================================
// إعجاب بتعليق
// ====================================

router.post('/:commentId/like', protect.auth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const commentId = parseInt(req.params.commentId);

    // التحقق من الإعجاب الموجود
    const existingLike = await db.query(
      'SELECT * FROM comment_likes WHERE comment_id = $1 AND user_id = $2',
      [commentId, userId]
    );

    if (existingLike.rows.length > 0) {
      // إلغاء الإعجاب
      await db.query(
        'DELETE FROM comment_likes WHERE comment_id = $1 AND user_id = $2',
        [commentId, userId]
      );

      res.json({ success: true, liked: false });
    } else {
      // إضافة إعجاب
      await db.query(
        'INSERT INTO comment_likes (comment_id, user_id) VALUES ($1, $2)',
        [commentId, userId]
      );

      // جلب صاحب التعليق
      const commentResult = await db.query(
        'SELECT user_id, post_id FROM wall_comments WHERE id = $1',
        [commentId]
      );

      const comment = commentResult.rows[0];

      // إرسال إشعار (إذا لم يكن الإعجاب من صاحب التعليق)
      if (comment.user_id !== userId) {
        await createNotification({
          userId: comment.user_id,
          type: 'like',
          senderId: userId,
          content: 'أعجب بتعليقك',
          data: { commentId, postId: comment.post_id }
        });
      }

      // بث التحديث عبر Socket.IO
      try {
        const io = getIO();
        io.emit('comment:liked', {
          commentId,
          userId,
          likesCount: await getCommentLikesCount(commentId)
        });
      } catch (socketError) {
        console.error('Failed to broadcast like:', socketError);
      }

      res.json({ success: true, liked: true });
    }
  } catch (error) {
    console.error('Error liking comment:', error);
    res.status(500).json({ error: 'خطأ في الإعجاب' });
  }
});

// ====================================
// حذف تعليق
// ====================================

router.delete('/:commentId', protect.auth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const commentId = parseInt(req.params.commentId);

    // التحقق من الملكية
    const commentResult = await db.query(
      'SELECT * FROM wall_comments WHERE id = $1',
      [commentId]
    );

    if (commentResult.rows.length === 0) {
      return res.status(404).json({ error: 'التعليق غير موجود' });
    }

    const comment = commentResult.rows[0];

    // يمكن فقط لصاحب التعليق أو الأدمن الحذف
    const userResult = await db.query(
      'SELECT user_type FROM users WHERE id = $1',
      [userId]
    );

    const isAdmin = userResult.rows[0]?.user_type === 'admin';

    if (comment.user_id !== userId && !isAdmin) {
      return res.status(403).json({ error: 'غير مصرح لك بحذف هذا التعليق' });
    }

    // حذف التعليق (سيحذف الردود تلقائياً بسبب CASCADE)
    await db.query('DELETE FROM wall_comments WHERE id = $1', [commentId]);

    // بث الحذف عبر Socket.IO
    try {
      const io = getIO();
      io.emit('comment:deleted', {
        commentId,
        postId: comment.post_id
      });
    } catch (socketError) {
      console.error('Failed to broadcast deletion:', socketError);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'خطأ في حذف التعليق' });
  }
});

// ====================================
// دوال مساعدة
// ====================================

async function getCommentLikesCount(commentId: number): Promise<number> {
  try {
    const result = await db.query(
      'SELECT COUNT(*) FROM comment_likes WHERE comment_id = $1',
      [commentId]
    );
    return parseInt(result.rows[0].count);
  } catch (error) {
    return 0;
  }
}

export default router;

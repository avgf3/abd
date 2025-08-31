import fs from 'fs';
import { promises as fsp } from 'fs';
import path from 'path';

import { Router } from 'express';
import multer from 'multer';
import ffmpeg from 'fluent-ffmpeg';
import ffprobeStatic from 'ffprobe-static';

import { dbType } from '../database-adapter';
import { protect } from '../middleware/enhancedSecurity';
import { limiters } from '../security';
import { databaseService } from '../services/databaseService';
import { storage } from '../storage';

// Multer config for stories (images + videos up to 30MB)
const storiesStorage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    try {
      const uploadDir = path.join(process.cwd(), 'client', 'public', 'uploads', 'stories');
      await fsp.mkdir(uploadDir, { recursive: true }).catch(() => {});
      cb(null, uploadDir);
    } catch (err) {
      cb(err as any, '');
    }
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `story-${uniqueSuffix}${ext}`);
  },
});

const allowedMimes = new Set([
  // images
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/tiff',
  'image/svg+xml',
  // videos
  'video/mp4',
  'video/webm',
  'video/ogg',
]);

const upload = multer({
  storage: storiesStorage,
  limits: { fileSize: 30 * 1024 * 1024, files: 1, fieldSize: 32 * 1024, parts: 10 },
  fileFilter: (_req, file, cb) => {
    if (allowedMimes.has(file.mimetype)) return cb(null, true);
    return cb(new Error(`نوع الملف غير مدعوم للحالات: ${file.mimetype}`));
  },
});

const router = Router();

// POST /api/stories/upload - create story (image/video)
router.post('/upload', protect.member, limiters.upload, upload.single('story'), async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const userId = (req as any)?.user?.id as number;
    if (!userId) return res.status(401).json({ error: 'يجب تسجيل الدخول' });

    if (!req.file) return res.status(400).json({ error: 'لم يتم رفع أي ملف' });

    const isVideo = req.file.mimetype.startsWith('video/');
    let durationSec = 7; // default for images
    if (isVideo) {
      // Validate duration using ffprobe
      try {
        (ffmpeg as any).setFfprobePath(ffprobeStatic.path);
        const metadata = await new Promise<any>((resolve, reject) => {
          (ffmpeg as any).ffprobe(req.file.path, (err: any, data: any) => (err ? reject(err) : resolve(data)));
        });
        const stream = (metadata?.streams || []).find((s: any) => s.duration || s.tags?.DURATION);
        const parsed = Number(stream?.duration || metadata?.format?.duration || 0);
        durationSec = Math.ceil(parsed || 0);
        if (!Number.isFinite(durationSec) || durationSec <= 0) durationSec = 30; // fallback
        if (durationSec > 30) {
          // Delete file if invalid
          try { await fsp.unlink(req.file.path); } catch {}
          return res.status(400).json({ error: 'مدة الفيديو تتجاوز 30 ثانية' });
        }
      } catch (probeErr) {
        console.warn('ffprobe failed, proceeding with default limit', probeErr);
        durationSec = 30;
      }
    }

    const mediaUrl = `/uploads/stories/${req.file.filename}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const story = await databaseService.createStory({
      userId,
      mediaUrl,
      mediaType: isVideo ? 'video' : 'image',
      caption: (req.body?.caption as string) || undefined,
      durationSec,
      expiresAt,
    } as any);

    if (!story) {
      try { await fsp.unlink(req.file.path); } catch {}
      return res.status(500).json({ error: 'فشل إنشاء الحالة' });
    }

    return res.json({ success: true, story });
  } catch (error: any) {
    console.error('Error uploading story:', error);
    res.status(500).json({ error: 'خطأ في الخادم', details: process.env.NODE_ENV === 'development' ? error?.message : undefined });
  }
});

// GET /api/stories/my - list current user's active stories
router.get('/my', protect.auth, async (req, res) => {
  try {
    const userId = (req as any)?.user?.id as number;
    if (!userId) return res.status(401).json({ error: 'غير مصرح' });
    const stories = await databaseService.getUserStories(userId, false);
    res.json({ success: true, stories });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// GET /api/stories/feed - list active stories feed
router.get('/feed', protect.auth, async (req, res) => {
  try {
    const userId = (req as any)?.user?.id as number;
    if (!userId) return res.status(401).json({ error: 'غير مصرح' });
    const stories = await databaseService.getStoriesFeedForUser(userId);
    res.setHeader('Cache-Control', 'public, max-age=3');
    res.json({ success: true, stories });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// POST /api/stories/:storyId/view - add view
router.post('/:storyId/view', protect.auth, async (req, res) => {
  try {
    const userId = (req as any)?.user?.id as number;
    if (!userId) return res.status(401).json({ error: 'غير مصرح' });
    const storyId = parseInt(req.params.storyId, 10);
    if (!Number.isFinite(storyId)) return res.status(400).json({ error: 'storyId غير صالح' });
    await databaseService.addStoryView(storyId, userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// GET /api/stories/:storyId/views - list viewers (owner only)
router.get('/:storyId/views', protect.auth, async (req, res) => {
  try {
    const requesterId = (req as any)?.user?.id as number;
    const storyId = parseInt(req.params.storyId, 10);
    if (!Number.isFinite(storyId)) return res.status(400).json({ error: 'storyId غير صالح' });

    // Check ownership
    const stories = await databaseService.getUserStories(requesterId, true);
    const owned = stories.some((s: any) => s.id === storyId);
    if (!owned) return res.status(403).json({ error: 'مسموح فقط لمالك الحالة' });

    const viewers = await databaseService.getStoryViews(storyId);
    res.json({ success: true, viewers });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// POST /api/stories/:storyId/react - set like/heart/dislike
router.post('/:storyId/react', protect.auth, async (req, res) => {
  try {
    const userId = (req as any)?.user?.id as number;
    if (!userId) return res.status(401).json({ error: 'غير مصرح' });
    const storyId = parseInt(req.params.storyId, 10);
    if (!Number.isFinite(storyId)) return res.status(400).json({ error: 'storyId غير صالح' });

    const type = (req.body?.type as string) || '';
    if (!['like', 'heart', 'dislike'].includes(type)) {
      return res.status(400).json({ error: 'نوع التفاعل غير صالح' });
    }

    const ok = await databaseService.upsertStoryReaction(storyId, userId, type as any);
    if (!ok) return res.status(500).json({ error: 'فشل حفظ التفاعل' });

    // إرسال رسالة خاصة لصاحب الحالة لإشعاره بالتفاعل
    try {
      const story = await databaseService.getStoryById(storyId);
      if (story && story.userId && story.userId !== userId) {
        const actor = await storage.getUser(userId);
        const actorName = (actor && (actor as any).username) ? (actor as any).username : `User#${userId}`;
        const reactionText = type === 'heart' ? '❤️ أعجب بحالتك'
          : type === 'like' ? '👍 وضع لايك على حالتك'
          : '👎 لم تعجبه حالتك';
        const content = `${actorName} ${reactionText}`;

        const messageData = {
          senderId: userId,
          receiverId: story.userId,
          content,
          messageType: 'text',
          isPrivate: true,
          timestamp: new Date(),
        } as any;

        const newMessage = await storage.createMessage(messageData);
        const io = req.app.get('io');
        if (newMessage && io) {
          const payload = { message: { ...newMessage, sender: actor || { id: userId, username: actorName } } };
          try { io.to(String(userId)).emit('privateMessage', payload); } catch {}
          try { io.to(String(story.userId)).emit('privateMessage', payload); } catch {}
        }
      }
    } catch (notifyErr) {
      console.warn('story reaction notify failed:', notifyErr);
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// DELETE /api/stories/:storyId/react - remove my reaction
router.delete('/:storyId/react', protect.auth, async (req, res) => {
  try {
    const userId = (req as any)?.user?.id as number;
    if (!userId) return res.status(401).json({ error: 'غير مصرح' });
    const storyId = parseInt(req.params.storyId, 10);
    if (!Number.isFinite(storyId)) return res.status(400).json({ error: 'storyId غير صالح' });
    const ok = await databaseService.removeStoryReaction(storyId, userId);
    if (!ok) return res.status(500).json({ error: 'فشل حذف التفاعل' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// DELETE /api/stories/:storyId - delete story (owner)
router.delete('/:storyId', protect.auth, async (req, res) => {
  try {
    const requesterId = (req as any)?.user?.id as number;
    const storyId = parseInt(req.params.storyId, 10);
    if (!Number.isFinite(storyId)) return res.status(400).json({ error: 'storyId غير صالح' });
    const ok = await databaseService.deleteStory(storyId, requesterId);
    if (!ok) return res.status(403).json({ error: 'غير مصرح' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

export default router;


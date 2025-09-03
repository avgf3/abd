import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { getBotControlPanel } from './index';

const router = Router();

// هذا المسار مخفي ويستخدم فقط لإنشاء رموز وصول للأونرز
router.post('/generate-bot-token', async (req: Request, res: Response) => {
  try {
    const { secretKey, userId } = req.body;
    
    // التحقق من المفتاح السري
    const MASTER_SECRET = process.env.BOT_MASTER_SECRET || 'owner-master-2024-secret';
    
    if (secretKey !== MASTER_SECRET) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // التحقق من أن المستخدم أونر
    // في الإنتاج، يجب التحقق من قاعدة البيانات
    const controlPanel = getBotControlPanel();
    if (!controlPanel) {
      return res.status(500).json({ error: 'Bot system not initialized' });
    }
    
    // إنشاء رمز وصول
    const token = controlPanel.generateAccessToken(userId);
    
    res.json({ 
      success: true, 
      token,
      expiresIn: '24h',
      usage: 'Add this token to Authorization header as: Bearer <token>'
    });
  } catch (error) {
    console.error('Error generating bot token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
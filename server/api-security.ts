// API Security routes for advanced security management
import { Router } from 'express';

import { advancedSecurity } from './advanced-security';
import { protect } from './middleware/enhancedSecurity';
import { z } from 'zod';

const router = Router();

// تقييد كل مسارات الأمان للمالك فقط
router.use(protect.owner);

// Get security report - Owner only
router.get('/report', protect.log('security:report'), async (req, res) => {
  try {
    // في التطبيق الحقيقي، تحقق من صلاحيات المستخدم
    const report = advancedSecurity.getSecurityReport();
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// Get blocked IPs - Owner only
router.get('/blocked-ips', protect.log('security:blocked-ips'), async (req, res) => {
  try {
    // محاكاة قائمة العناوين المحظورة
    const blockedIPs = [
      { ip: '192.168.1.100', reason: 'نشاط مشبوه', blockedAt: new Date().toISOString() },
      {
        ip: '10.0.0.50',
        reason: 'محاولات سبام',
        blockedAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ];
    res.json(blockedIPs);
  } catch (error) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// Block IP - Owner only
const blockSchema = z.object({ ip: z.string().trim().min(3), reason: z.string().trim().min(3) });
router.post('/block-ip', protect.log('security:block-ip'), async (req, res) => {
  try {
    const parsed = blockSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues?.[0]?.message || 'بيانات غير صحيحة' });
    }
    const { ip, reason } = parsed.data as any;

    if (!ip || !reason) {
      return res.status(400).json({ error: 'عنوان IP والسبب مطلوبان' });
    }

    advancedSecurity.blockIP(ip, reason);
    res.json({ message: 'تم حظر العنوان بنجاح' });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// Unblock IP - Owner only
const unblockSchema = z.object({ ip: z.string().trim().min(3) });
router.post('/unblock-ip', protect.log('security:unblock-ip'), async (req, res) => {
  try {
    const parsed = unblockSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues?.[0]?.message || 'بيانات غير صحيحة' });
    }
    const { ip } = parsed.data as any;

    if (!ip) {
      return res.status(400).json({ error: 'عنوان IP مطلوب' });
    }

    advancedSecurity.unblockIP(ip);
    res.json({ message: 'تم إلغاء حظر العنوان بنجاح' });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

export default router;

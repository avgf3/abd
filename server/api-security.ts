// API Security routes for advanced security management
import { Router } from 'express';
import { advancedSecurity } from './advanced-security';

const router = Router();

// Get security report - Owner only
router.get('/report', async (req, res) => {
  try {
    // في التطبيق الحقيقي، تحقق من صلاحيات المستخدم
    const report = advancedSecurity.getSecurityReport();
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// Get blocked IPs - Owner only
router.get('/blocked-ips', async (req, res) => {
  try {
    // محاكاة قائمة العناوين المحظورة
    const blockedIPs = [
      { ip: '192.168.1.100', reason: 'نشاط مشبوه', blockedAt: new Date().toISOString() },
      { ip: '10.0.0.50', reason: 'محاولات سبام', blockedAt: new Date(Date.now() - 86400000).toISOString() }
    ];
    res.json(blockedIPs);
  } catch (error) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// Block IP - Owner only  
router.post('/block-ip', async (req, res) => {
  try {
    const { ip, reason } = req.body;
    
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
router.post('/unblock-ip', async (req, res) => {
  try {
    const { ip } = req.body;
    
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
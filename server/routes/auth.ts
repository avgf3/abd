import { Router } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { db } from '../database-adapter';
import { insertUserSchema, users } from '../../shared/schema';
import { issueAuthToken } from '../utils/auth-token';
import { authLimiter, sanitizeInput } from '../security';
import { storage } from '../storage';
import { DEFAULT_LEVELS } from '../../shared/points-system';
import { getClientIpFromHeaders, getDeviceIdFromHeaders } from '../utils/device';
import { advancedSecurity } from '../advanced-security';
import { eq } from 'drizzle-orm';

const router = Router();

// Guest login schema
const guestLoginSchema = z.object({
  username: z.string().min(1).max(50),
});

// Member login schema
const memberLoginSchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(6),
});

// Register schema
const registerSchema = insertUserSchema.pick({
  username: true,
  displayName: true,
  password: true,
  email: true,
});

// Guest login
router.post('/guest', authLimiter, async (req, res) => {
  try {
    const validation = guestLoginSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors[0].message });
    }

    const { username } = validation.data;
    const sanitizedUsername = sanitizeInput(username);

    const clientIP = getClientIpFromHeaders(req.headers);
    const deviceId = getDeviceIdFromHeaders(req.headers);
    const securityCheck = await advancedSecurity.validateUser({
      username: sanitizedUsername,
      clientIP,
      deviceId,
    });

    if (!securityCheck.isValid) {
      return res.status(403).json({ error: securityCheck.reason });
    }

    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.username, sanitizedUsername))
      .limit(1);

    if (existingUser) {
      return res.status(400).json({ error: 'اسم المستخدم موجود بالفعل' });
    }

    const user = await storage.createUser({
      username: sanitizedUsername,
      displayName: sanitizedUsername,
      password: '',
      isGuest: true,
    });

    const authToken = issueAuthToken(user.id);
    const userData = {
      ...user,
      authToken,
      level: DEFAULT_LEVELS[0],
    };

    req.session.userId = user.id;
    res.json({ user: userData });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في إنشاء المستخدم الضيف' });
  }
});

// Member login
router.post('/member', authLimiter, async (req, res) => {
  try {
    const validation = memberLoginSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors[0].message });
    }

    const { username, password } = validation.data;
    const sanitizedUsername = sanitizeInput(username);

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, sanitizedUsername))
      .limit(1);

    if (!user || user.isGuest) {
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }

    const authToken = issueAuthToken(user.id);
    const userData = {
      ...user,
      authToken,
      level: DEFAULT_LEVELS[Math.min(user.level || 0, DEFAULT_LEVELS.length - 1)],
    };

    req.session.userId = user.id;
    res.json({ user: userData });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في تسجيل الدخول' });
  }
});

// Register
router.post('/register', authLimiter, async (req, res) => {
  try {
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors[0].message });
    }

    const { username, displayName, password } = validation.data;
    const sanitizedUsername = sanitizeInput(username);
    const sanitizedDisplayName = sanitizeInput(displayName);

    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.username, sanitizedUsername))
      .limit(1);

    if (existingUser) {
      return res.status(400).json({ error: 'اسم المستخدم موجود بالفعل' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await storage.createUser({
      username: sanitizedUsername,
      displayName: sanitizedDisplayName,
      password: hashedPassword,
      isGuest: false,
    });

    const authToken = issueAuthToken(user.id);
    const userData = {
      ...user,
      authToken,
      level: DEFAULT_LEVELS[0],
    };

    req.session.userId = user.id;
    res.json({ user: userData });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في إنشاء الحساب' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'خطأ في تسجيل الخروج' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'تم تسجيل الخروج بنجاح' });
  });
});

export default router;
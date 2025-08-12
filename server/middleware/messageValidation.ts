import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

// Validation middleware for private messages
export const validatePrivateMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { senderId, receiverId, content, messageType } = req.body;

    // التحقق من المعاملات المطلوبة
    if (!senderId || !receiverId) {
      return res.status(400).json({ 
        error: 'معرف المرسل والمستقبل مطلوبان' 
      });
    }

    if (!content || (typeof content === 'string' && !content.trim())) {
      return res.status(400).json({ 
        error: 'محتوى الرسالة مطلوب' 
      });
    }

    // التحقق من نوع الرسالة
    const validMessageTypes = ['text', 'image', 'video', 'document'];
    if (messageType && !validMessageTypes.includes(messageType)) {
      return res.status(400).json({ 
        error: 'نوع الرسالة غير صحيح' 
      });
    }

    // التحقق من طول المحتوى
    if (messageType === 'text' && content.length > 5000) {
      return res.status(400).json({ 
        error: 'الرسالة طويلة جداً (الحد الأقصى 5000 حرف)' 
      });
    }

    // التحقق من أن المرسل لا يرسل لنفسه
    if (parseInt(senderId) === parseInt(receiverId)) {
      return res.status(400).json({ 
        error: 'لا يمكن إرسال رسالة لنفسك' 
      });
    }

    // التحقق من وجود المستخدمين
    const sender = await storage.getUser(parseInt(senderId));
    const receiver = await storage.getUser(parseInt(receiverId));

    if (!sender) {
      return res.status(404).json({ error: 'المرسل غير موجود' });
    }

    if (!receiver) {
      return res.status(404).json({ error: 'المستقبل غير موجود' });
    }

    // التحقق من حالة الحظر
    if (sender.isBanned) {
      return res.status(403).json({ 
        error: 'حسابك محظور ولا يمكنك إرسال رسائل' 
      });
    }

    // التحقق من حالة الكتم
    if (sender.isMuted && sender.muteExpiry && new Date(sender.muteExpiry) > new Date()) {
      return res.status(403).json({ 
        error: 'أنت مكتوم ولا يمكنك إرسال رسائل' 
      });
    }

    // التحقق من قائمة المتجاهلين
    if (receiver.ignoredUsers && receiver.ignoredUsers.includes(parseInt(senderId))) {
      return res.status(403).json({ 
        error: 'لا يمكنك إرسال رسائل لهذا المستخدم' 
      });
    }

    // إضافة البيانات المحققة إلى الطلب
    req.body.validatedSender = sender;
    req.body.validatedReceiver = receiver;

    next();
  } catch (error) {
    console.error('Error in message validation:', error);
    res.status(500).json({ 
      error: 'خطأ في التحقق من الرسالة' 
    });
  }
};

// Rate limiting per user
const userMessageCounts = new Map<number, { count: number; resetTime: number }>();

export const rateLimitPrivateMessages = (req: Request, res: Response, next: NextFunction) => {
  const senderId = parseInt(req.body.senderId || req.params.senderId);
  if (!senderId) return next();

  const now = Date.now();
  const userLimit = userMessageCounts.get(senderId);

  // Reset if time window passed (1 minute)
  if (!userLimit || now > userLimit.resetTime) {
    userMessageCounts.set(senderId, {
      count: 1,
      resetTime: now + 60000 // 1 minute
    });
    return next();
  }

  // Check rate limit (20 messages per minute)
  if (userLimit.count >= 20) {
    return res.status(429).json({ 
      error: 'تجاوزت الحد المسموح به من الرسائل. حاول مرة أخرى بعد دقيقة.' 
    });
  }

  userLimit.count++;
  next();
};

// Content filtering for inappropriate content
export const filterMessageContent = (req: Request, res: Response, next: NextFunction) => {
  if (req.body.messageType !== 'text') return next();

  const content = req.body.content;
  if (!content) return next();

  // قائمة بسيطة من الكلمات المحظورة (يمكن تحسينها)
  const bannedWords = [
    // أضف الكلمات المحظورة هنا
  ];

  const containsBannedWords = bannedWords.some(word => 
    content.toLowerCase().includes(word.toLowerCase())
  );

  if (containsBannedWords) {
    return res.status(400).json({ 
      error: 'الرسالة تحتوي على محتوى غير مناسب' 
    });
  }

  // تنظيف المحتوى من الأكواد الضارة
  const cleanContent = content
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '') // Remove iframes
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .trim();

  req.body.content = cleanContent;
  next();
};

// Validate message retrieval
export const validateMessageRetrieval = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId1, userId2 } = req.params;

    if (!userId1 || !userId2) {
      return res.status(400).json({ 
        error: 'معرفات المستخدمين مطلوبة' 
      });
    }

    // التحقق من أن المستخدم يطلب رسائله الخاصة فقط
    // يجب أن يكون أحد المعرفات مطابقاً للمستخدم الحالي
    // (يمكن تحسين هذا بإضافة نظام مصادقة)

    next();
  } catch (error) {
    console.error('Error in message retrieval validation:', error);
    res.status(500).json({ 
      error: 'خطأ في التحقق من الطلب' 
    });
  }
};
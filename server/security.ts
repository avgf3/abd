import express, { type Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import csrf from 'csurf';
import cookieParser from 'cookie-parser';

// Rate limiting maps
const authRequestCounts = new Map<string, { count: number; resetTime: number }>();
const messageRequestCounts = new Map<string, { count: number; resetTime: number }>();
const friendRequestCounts = new Map<string, { count: number; resetTime: number }>();
const blockedIPs = new Set<string>();

// Rate limiter for authentication endpoints
export function authLimiter(req: Request, res: Response, next: NextFunction): void {
  const clientId = req.ip || 'unknown';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 50; // زيادة الحد للمصادقة

  const current = authRequestCounts.get(clientId);
  
  if (!current || now > current.resetTime) {
    authRequestCounts.set(clientId, { count: 1, resetTime: now + windowMs });
    next();
  } else if (current.count < maxRequests) {
    current.count++;
    next();
  } else {
    res.status(429).json({ 
      error: 'تم تجاوز حد طلبات المصادقة، حاول مرة أخرى لاحقاً',
      retryAfter: Math.ceil((current.resetTime - now) / 1000)
    });
  }
}

// Rate limiter for message endpoints
export function messageLimiter(req: Request, res: Response, next: NextFunction): void {
  const clientId = req.ip || 'unknown';
  const now = Date.now();
  const windowMs = 1 * 60 * 1000; // 1 minute
  const maxRequests = 30; // 30 messages per minute

  const current = messageRequestCounts.get(clientId);
  
  if (!current || now > current.resetTime) {
    messageRequestCounts.set(clientId, { count: 1, resetTime: now + windowMs });
    next();
  } else if (current.count < maxRequests) {
    current.count++;
    next();
  } else {
    res.status(429).json({ 
      error: 'تم تجاوز حد إرسال الرسائل، حاول مرة أخرى لاحقاً',
      retryAfter: Math.ceil((current.resetTime - now) / 1000)
    });
  }
}

// Rate limiter for friend request endpoints
export function friendRequestLimiter(req: Request, res: Response, next: NextFunction): void {
  const clientId = req.ip || 'unknown';
  const now = Date.now();
  const windowMs = 5 * 60 * 1000; // 5 minutes
  const maxRequests = 100; // 100 friend requests per 5 minutes

  const current = friendRequestCounts.get(clientId);
  
  if (!current || now > current.resetTime) {
    friendRequestCounts.set(clientId, { count: 1, resetTime: now + windowMs });
    next();
  } else if (current.count < maxRequests) {
    current.count++;
    next();
  } else {
    res.status(429).json({ 
      error: 'تم تجاوز حد طلبات الصداقة، حاول مرة أخرى لاحقاً',
      retryAfter: Math.ceil((current.resetTime - now) / 1000)
    });
  }
}

// IP security check middleware
export function checkIPSecurity(req: Request, res: Response, next: NextFunction): void {
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
  
  // Check if IP is blocked
  if (blockedIPs.has(clientIp)) {
    res.status(403).json({ error: 'عذراً، تم حظر هذا العنوان' });
    return;
  }
  
  // Add basic security checks
  const userAgent = req.headers['user-agent'] || '';
  const suspicious = [
    'bot', 'crawler', 'spider', 'scraper', 'wget', 'curl'
  ].some(term => userAgent.toLowerCase().includes(term));
  
  if (suspicious) {
    // Don't block, just log for now
    console.log('⚠️ Suspicious user agent detected:', userAgent);
  }
  
  next();
}

// Content validation middleware
export function validateMessageContent(content: string): { isValid: boolean; reason?: string } {
  if (!content || typeof content !== 'string') {
    return { isValid: false, reason: 'المحتوى مطلوب' };
  }
  
  if (content.length > 1000) {
    return { isValid: false, reason: 'الرسالة طويلة جداً (الحد الأقصى 1000 حرف)' };
  }
  
  if (content.length < 1) {
    return { isValid: false, reason: 'الرسالة قصيرة جداً' };
  }
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(content)) {
      return { isValid: false, reason: 'المحتوى يحتوي على كود ضار' };
    }
  }
  
  return { isValid: true };
}

// Block IP address
export function blockIP(ip: string): void {
  blockedIPs.add(ip);
  console.log(`🚫 Blocked IP: ${ip}`);
}

// Unblock IP address
export function unblockIP(ip: string): void {
  blockedIPs.delete(ip);
  console.log(`✅ Unblocked IP: ${ip}`);
}

// Setup security middleware
export function setupSecurity(app: Express): void {
  // Basic security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        connectSrc: ["'self'", "wss:", "ws:"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: []
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
  }));

  // CORS configuration
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://yourdomain.com'
  ];

  app.use(cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count']
  }));

  // Cookie parser
  app.use(cookieParser());

  // CSRF protection for non-GET requests
  app.use(csrf({ 
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    }
  }));

  // Global rate limiting
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
      error: 'تم تجاوز حد الطلبات، حاول مرة أخرى لاحقاً',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(globalLimiter);

  // Trust proxy for accurate IP detection
  app.set('trust proxy', 1);

  // Security middleware for all routes
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Remove sensitive headers
    res.removeHeader('X-Powered-By');
    
    // Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    next();
  });

  // Error handling for CORS
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (err.message === 'Not allowed by CORS') {
      res.status(403).json({ error: 'Origin not allowed' });
    } else {
      next(err);
    }
  });
}

// Input sanitization
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
}

// Check if IP is blocked
export function isIpBlocked(ip: string, blockedIPs: Set<string>): boolean {
  return blockedIPs.has(ip);
}

// Session validation
export function validateSession(session: any): boolean {
  if (!session) return false;
  
  // Check if session has required fields
  if (!session.userId || !session.username) {
    return false;
  }
  
  // Check if session is not expired (if expiry is set)
  if (session.expires && new Date() > new Date(session.expires)) {
    return false;
  }
  
  return true;
}

// Password strength validation
export function validatePassword(password: string): { isValid: boolean; reason?: string } {
  if (!password || typeof password !== 'string') {
    return { isValid: false, reason: 'كلمة المرور مطلوبة' };
  }
  
  if (password.length < 8) {
    return { isValid: false, reason: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' };
  }
  
  if (password.length > 128) {
    return { isValid: false, reason: 'كلمة المرور طويلة جداً' };
  }
  
  // Check for common weak passwords
  const weakPasswords = [
    'password', '123456', '12345678', 'qwerty', 'abc123',
    'password123', 'admin', 'admin123', 'user', 'user123'
  ];
  
  if (weakPasswords.includes(password.toLowerCase())) {
    return { isValid: false, reason: 'كلمة المرور ضعيفة جداً' };
  }
  
  return { isValid: true };
}

// Username validation
export function validateUsername(username: string): { isValid: boolean; reason?: string } {
  if (!username || typeof username !== 'string') {
    return { isValid: false, reason: 'اسم المستخدم مطلوب' };
  }
  
  if (username.length < 3) {
    return { isValid: false, reason: 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل' };
  }
  
  if (username.length > 20) {
    return { isValid: false, reason: 'اسم المستخدم طويل جداً' };
  }
  
  // Check for valid characters (Arabic, English, numbers, underscore)
  const validPattern = /^[\u0600-\u06FFa-zA-Z0-9_]+$/;
  if (!validPattern.test(username)) {
    return { isValid: false, reason: 'اسم المستخدم يحتوي على أحرف غير مسموحة' };
  }
  
  return { isValid: true };
}
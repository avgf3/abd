import express, { type Express, Request, Response, NextFunction } from 'express';

// Rate limiting stores
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const blockedIPs = new Set<string>();

// Create rate limiter
export const createRateLimit = (windowMs: number, max: number, message: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();

    let data = rateLimitStore.get(key);
    
    if (!data || now > data.resetTime) {
      data = { count: 1, resetTime: now + windowMs };
    } else {
      data.count++;
    }
    
    rateLimitStore.set(key, data);
    
    if (data.count > max) {
      return res.status(429).json({ error: message });
    }
    
    next();
  };
};

// Auth rate limiter
export const authLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts
  'محاولات كثيرة جداً. حاول مرة أخرى خلال 15 دقيقة'
);

// Message rate limiter
export const messageLimiter = createRateLimit(
  60 * 1000, // 1 minute
  30, // 30 messages
  'رسائل كثيرة جداً. انتظر قليلاً'
);

// Check IP security
export const checkIPSecurity = (req: Request, res: Response, next: NextFunction) => {
  const clientIP = req.ip || 'unknown';
  
  if (blockedIPs.has(clientIP)) {
    return res.status(403).json({ error: 'عنوان IP محظور' });
  }
  
  next();
};

// Validate message content
export const validateMessageContent = (content: string): { isValid: boolean; reason?: string } => {
  if (!content || !content.trim()) {
    return { isValid: false, reason: 'الرسالة فارغة' };
  }
  
  if (content.length > 1000) {
    return { isValid: false, reason: 'الرسالة طويلة جداً' };
  }
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /https?:\/\/[^\s]+\.(tk|ml|ga|cf)\b/i,
    /discord\.gg\/[a-zA-Z0-9]+/i,
    /t\.me\/[a-zA-Z0-9_]+/i,
    /bit\.ly\/[a-zA-Z0-9]+/i,
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(content)) {
      return { isValid: false, reason: 'يحتوي على روابط غير مسموحة' };
    }
  }
  
  return { isValid: true };
};

// Security middleware to prevent common attacks
export function setupSecurity(app: Express): void {
  // Apply general rate limiting for API endpoints
  app.use('/api', createRateLimit(15 * 60 * 1000, 100, 'تم تجاوز حد الطلبات، حاول مرة أخرى لاحقاً'));

  // Security headers
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // XSS Protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Content Security Policy
    res.setHeader('Content-Security-Policy', [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self' ws: wss:",
      "font-src 'self'",
      "object-src 'none'",
      "media-src 'self'",
      "frame-src 'none'"
    ].join('; '));
    
    next();
  });

  // CORS configuration
  app.use((req: Request, res: Response, next: NextFunction) => {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      process.env.FRONTEND_URL,
      process.env.RENDER_EXTERNAL_URL
    ].filter(Boolean);

    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  // Input sanitization
  app.use(express.json({ 
    limit: '10mb',
    verify: (req: any, res: Response, buf: Buffer) => {
      // Prevent JSON pollution attacks
      try {
        JSON.parse(buf.toString());
      } catch (e) {
        res.status(400).json({ error: 'Invalid JSON format' });
        throw new Error('Invalid JSON');
      }
    }
  }));

  console.log('🛡️ Security middleware configured');
}

// Utility function to validate user input
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .slice(0, 1000); // Limit length
}

// Check if IP is blocked
export function isIpBlocked(ip: string, blockedIPs: Set<string>): boolean {
  return blockedIPs.has(ip);
}

// Validate session
export function validateSession(session: any): boolean {
  if (!session || !session.userId) return false;
  
  // Check session expiry
  const sessionAge = Date.now() - (session.lastAccess || 0);
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  
  if (sessionAge > maxAge) return false;
  
  // Update last access
  session.lastAccess = Date.now();
  
  return true;
}

export const SecurityConfig = {
  MAX_MESSAGE_LENGTH: 1000,
  MAX_USERNAME_LENGTH: 50,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
  RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX: 100
};
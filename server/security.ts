import express, { type Express, Request, Response, NextFunction } from 'express';
import { Socket } from 'socket.io';

// Rate limiting maps
const authRequestCounts = new Map<string, { count: number; resetTime: number }>();
const messageRequestCounts = new Map<string, { count: number; resetTime: number }>();
const friendRequestCounts = new Map<string, { count: number; resetTime: number }>();
const socketRequestCounts = new Map<string, { count: number; resetTime: number; events: string[] }>();
const blockedIPs = new Set<string>();

// Socket rate limiting configuration
const SOCKET_RATE_LIMITS = {
  auth: { windowMs: 60000, maxRequests: 5 }, // 5 auth attempts per minute
  joinRoom: { windowMs: 60000, maxRequests: 10 }, // 10 room joins per minute
  sendMessage: { windowMs: 60000, maxRequests: 30 }, // 30 messages per minute
  privateMessage: { windowMs: 60000, maxRequests: 20 }, // 20 private messages per minute
  typing: { windowMs: 5000, maxRequests: 10 }, // 10 typing events per 5 seconds
  default: { windowMs: 60000, maxRequests: 100 } // 100 general events per minute
};

// Socket rate limiter middleware
export function socketRateLimiter(socket: Socket, eventName: string): boolean {
  const clientId = socket.handshake.address || socket.id;
  const now = Date.now();
  
  // Get rate limit config for this event
  const config = SOCKET_RATE_LIMITS[eventName as keyof typeof SOCKET_RATE_LIMITS] || SOCKET_RATE_LIMITS.default;
  
  const current = socketRequestCounts.get(clientId);
  
  if (!current || now > current.resetTime) {
    socketRequestCounts.set(clientId, { 
      count: 1, 
      resetTime: now + config.windowMs,
      events: [eventName]
    });
    return true;
  }
  
  // Track event types for pattern detection
  current.events.push(eventName);
  if (current.events.length > 100) {
    current.events = current.events.slice(-100); // Keep last 100 events
  }
  
  // Detect suspicious patterns
  if (detectSuspiciousPattern(current.events)) {
    console.warn(`Suspicious pattern detected from ${clientId}`);
    blockIP(clientId);
    return false;
  }
  
  if (current.count < config.maxRequests) {
    current.count++;
    return true;
  }
  
  // Rate limit exceeded
  socket.emit('rateLimitExceeded', {
    event: eventName,
    retryAfter: Math.ceil((current.resetTime - now) / 1000),
    message: 'تم تجاوز حد الطلبات، حاول مرة أخرى لاحقاً'
  });
  
  return false;
}

// Detect suspicious patterns in event sequence
function detectSuspiciousPattern(events: string[]): boolean {
  if (events.length < 10) return false;
  
  // Check for rapid repeated events
  const last10 = events.slice(-10);
  const uniqueEvents = new Set(last10).size;
  
  // If all last 10 events are the same, it's suspicious
  if (uniqueEvents === 1) return true;
  
  // Check for auth flooding
  const authCount = last10.filter(e => e === 'auth').length;
  if (authCount > 3) return true;
  
  return false;
}

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  
  // Clean auth counts
  for (const [key, value] of authRequestCounts.entries()) {
    if (now > value.resetTime) {
      authRequestCounts.delete(key);
    }
  }
  
  // Clean message counts
  for (const [key, value] of messageRequestCounts.entries()) {
    if (now > value.resetTime) {
      messageRequestCounts.delete(key);
    }
  }
  
  // Clean socket counts
  for (const [key, value] of socketRequestCounts.entries()) {
    if (now > value.resetTime + 300000) { // Keep for 5 minutes after reset
      socketRequestCounts.delete(key);
    }
  }
}, 60000); // Run every minute

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
  }
  
  next();
}

// Message content validation
export function validateMessageContent(content: string): { isValid: boolean; reason?: string } {
  if (!content || typeof content !== 'string') {
    return { isValid: false, reason: 'المحتوى غير صالح' };
  }
  
  const trimmedContent = content.trim();
  
  if (trimmedContent.length === 0) {
    return { isValid: false, reason: 'لا يمكن إرسال رسالة فارغة' };
  }
  
  if (trimmedContent.length > SecurityConfig.MAX_MESSAGE_LENGTH) {
    return { isValid: false, reason: `الرسالة طويلة جداً (الحد الأقصى ${SecurityConfig.MAX_MESSAGE_LENGTH} حرف)` };
  }
  
  // Check for spam patterns
  const spamPatterns = [
    /(.)\1{10,}/gi, // Repeated characters
    /https?:\/\/[^\s]+/gi, // URLs (adjust based on your needs)
    /[^\w\s\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/gi // Non-Arabic/alphanumeric chars (allowing Arabic)
  ];
  
  for (const pattern of spamPatterns) {
    if (pattern.test(trimmedContent)) {
      return { isValid: false, reason: 'المحتوى يحتوي على نص مشبوه' };
    }
  }
  
  return { isValid: true };
}

// Add IP to block list
export function blockIP(ip: string): void {
  blockedIPs.add(ip);
  }

// Remove IP from block list
export function unblockIP(ip: string): void {
  blockedIPs.delete(ip);
  }

// Security middleware to prevent common attacks
export function setupSecurity(app: Express): void {
  // Rate limiting for API endpoints
  const requestCounts = new Map<string, { count: number; resetTime: number }>();
  
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxRequests = 500; // زيادة الحد إلى 500 طلب

    const current = requestCounts.get(clientId);
    
    if (!current || now > current.resetTime) {
      requestCounts.set(clientId, { count: 1, resetTime: now + windowMs });
      next();
    } else if (current.count < maxRequests) {
      current.count++;
      next();
    } else {
      res.status(429).json({ 
        error: 'تم تجاوز حد الطلبات، حاول مرة أخرى لاحقاً',
        retryAfter: Math.ceil((current.resetTime - now) / 1000)
      });
    }
  });

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
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https:",
      // allow connect to same-origin + websockets on same-origin
      "connect-src 'self' ws: wss: https:",
      "font-src 'self' https://fonts.gstatic.com",
      "object-src 'none'",
      "media-src 'self'",
      "frame-src 'none'"
    ].join('; '));
    
    next();
  });

  // CORS configuration with ALLOWED_ORIGINS from environment
  app.use((req: Request, res: Response, next: NextFunction) => {
    const originHeader = req.headers.origin as string | undefined;
    const hostHeader = req.headers.host || '';

    // Parse ALLOWED_ORIGINS from environment (comma-separated list)
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()).filter(Boolean)
      : [];

    // Add other env origins for backward compatibility
    const envOrigins = [
      process.env.RENDER_EXTERNAL_URL,
      process.env.FRONTEND_URL,
      process.env.CORS_ORIGIN,
      ...allowedOrigins
    ].filter(Boolean) as string[];

    const envHosts = envOrigins
      .map((u) => { try { return new URL(u).host; } catch { return ''; } })
      .filter(Boolean);

    const originHost = (() => {
      try { return originHeader ? new URL(originHeader).host : ''; } catch { return ''; }
    })();

    const isDev = process.env.NODE_ENV === 'development';
    const isSameHost = originHost && hostHeader && originHost === hostHeader;
    const isEnvAllowed = originHost && envHosts.includes(originHost);
    const isAllowedOrigin = originHeader && allowedOrigins.includes(originHeader);

    if (originHeader && (isDev || isSameHost || isEnvAllowed || isAllowedOrigin)) {
      res.setHeader('Access-Control-Allow-Origin', originHeader);
    }

    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

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
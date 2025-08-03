// أنواع API للخادم

import { Request, Response } from 'express';

// تمديد Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: any; // تم تغيير النوع لتجنب التضارب
      session?: any;
      fileValidationError?: string;
    }
  }
}

// أنواع المستخدم المتحقق
export interface AuthenticatedUser {
  id: number;
  username: string;
  userType: UserRole;
  isOnline: boolean;
  isBanned: boolean;
  isMuted: boolean;
  lastSeen: Date | null;
}

// أنواع الأدوار
export type UserRole = 'guest' | 'member' | 'moderator' | 'admin' | 'owner';

// أنواع استجابة API
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: ValidationError[];
  timestamp: string;
  requestId?: string;
}

export interface ApiError {
  error: boolean;
  message: string;
  code?: string;
  details?: any;
  timestamp: string;
  stack?: string; // فقط في التطوير
}

// أخطاء التحقق
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

// معاملات الطلب
export interface RequestParams {
  userId?: string;
  id?: string;
  roomId?: string;
  messageId?: string;
  requestId?: string;
}

export interface QueryParams {
  page?: string;
  limit?: string;
  search?: string;
  filter?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// أجسام الطلبات
export interface LoginRequestBody {
  username: string;
  password: string;
  rememberMe?: boolean;
  deviceInfo?: DeviceInfo;
}

export interface RegisterRequestBody {
  username: string;
  email?: string;
  password: string;
  userType?: 'guest' | 'member';
  acceptTerms?: boolean;
}

export interface ProfileUpdateBody {
  userId: number;
  username?: string;
  bio?: string;
  status?: string;
  gender?: string;
  age?: number;
  country?: string;
  relation?: string;
}

export interface MessageCreateBody {
  senderId: number;
  content: string;
  messageType?: 'text' | 'image';
  isPrivate?: boolean;
  receiverId?: number;
  roomId?: string;
}

export interface FriendRequestBody {
  senderId: number;
  receiverId?: number;
  username?: string; // بديل لـ receiverId
  message?: string;
}

export interface ModerationActionBody {
  userId: number;
  targetUserId: number;
  reason: string;
  duration?: number; // بالدقائق
  message?: string;
}

export interface ReportCreateBody {
  reporterId: number;
  reportedUserId?: number;
  reportedMessageId?: number;
  reason: ReportReason;
  description: string;
}

// أنواع ملفات الرفع
export interface FileUploadInfo {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
}

export interface ImageUploadBody {
  userId: number;
  imageType: 'profile' | 'banner';
}

// معلومات الجهاز
export interface DeviceInfo {
  userAgent: string;
  platform: string;
  language: string;
  timezone: string;
  screenResolution?: string;
}

// أنواع WebSocket
export interface SocketUser {
  id: string; // socket id
  userId: number;
  username: string;
  userType: UserRole;
  roomId?: string;
  isTyping: boolean;
  lastActivity: Date;
}

export interface SocketMessage {
  type: string;
  data: any;
  timestamp: Date;
  userId?: number;
  roomId?: string;
}

// إحصائيات الخادم
export interface ServerStats {
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: number;
  activeConnections: number;
  totalRequests: number;
  errorRate: number;
  responseTime: number;
}

// إعدادات قاعدة البيانات
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  poolSize?: number;
  timeout?: number;
}

// أنواع التحقق من الصحة
export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'email' | 'url';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: string[];
  custom?: (value: any) => boolean | string;
}

export interface ValidationSchema {
  rules: ValidationRule[];
  allowUnknown?: boolean;
  stripUnknown?: boolean;
}

// أنواع الحماية
export interface SecurityContext {
  ip: string;
  userAgent: string;
  userId?: number;
  rateLimitInfo?: RateLimitInfo;
  securityFlags?: SecurityFlag[];
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: Date;
  windowMs: number;
}

export interface SecurityFlag {
  type: 'suspicious_ip' | 'multiple_attempts' | 'unusual_activity';
  severity: 'low' | 'medium' | 'high';
  timestamp: Date;
  details: string;
}

// أنواع التقارير
export type ReportReason = 
  | 'spam'
  | 'harassment'
  | 'inappropriate_content'
  | 'fake_profile'
  | 'other';

export type ReportStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed';

// أنواع الإجراءات الإدارية
export type ModerationAction = 
  | 'mute'
  | 'unmute'
  | 'ban'
  | 'unban'
  | 'kick'
  | 'warn'
  | 'promote'
  | 'demote';

export interface ModerationLog {
  id: number;
  action: ModerationAction;
  moderatorId: number;
  targetUserId: number;
  reason: string;
  duration?: number;
  timestamp: Date;
  expiresAt?: Date;
  isActive: boolean;
}

// أنواع Middleware
export type MiddlewareFunction = (
  req: Request,
  res: Response,
  next: (error?: any) => void
) => void | Promise<void>;

export interface ProtectionLevel {
  requireAuth: boolean;
  requiredRole?: UserRole;
  requireOwnership?: boolean;
  rateLimitKey?: string;
  rateLimitMax?: number;
  logActivity?: boolean;
}

// أنواع التخزين المؤقت
export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  key?: string;
  tags?: string[];
  compress?: boolean;
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: Date;
  ttl: number;
  hits: number;
  tags: string[];
}

// أنواع المهام المجدولة
export interface ScheduledTask {
  id: string;
  name: string;
  schedule: string; // cron expression
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  errorCount: number;
  maxRetries: number;
}

// أنواع الإشعارات
export interface NotificationPayload {
  userId: number;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  channels?: ('push' | 'email' | 'sms' | 'websocket')[];
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  scheduledFor?: Date;
}

// أنواع التدقيق
export interface AuditLog {
  id: number;
  userId?: number;
  action: string;
  resource: string;
  resourceId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ip: string;
  userAgent: string;
  timestamp: Date;
  success: boolean;
  error?: string;
}

// أنواع النسخ الاحتياطي
export interface BackupInfo {
  id: string;
  type: 'database' | 'files' | 'full';
  size: number;
  createdAt: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress?: number;
  error?: string;
  retentionDays: number;
}

// تصدير الأنواع المفيدة
export type {
  Request as ExpressRequest,
  Response as ExpressResponse
};

// دوال مساعدة للأنواع
export type RequestHandler<
  P = any,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any
> = (
  req: Request<P, ResBody, ReqBody, ReqQuery>,
  res: Response<ResBody>,
  next: (error?: any) => void
) => void | Promise<void>;

export type AsyncRequestHandler<
  P = any,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any
> = (
  req: Request<P, ResBody, ReqBody, ReqQuery>,
  res: Response<ResBody>,
  next: (error?: any) => void
) => Promise<void>;

// نوع للاستجابات المكتوبة
export type TypedResponse<T> = Omit<Response, 'json' | 'send'> & {
  json(obj: ApiResponse<T>): TypedResponse<T>;
  send(body: ApiResponse<T>): TypedResponse<T>;
};
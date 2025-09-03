import { Socket } from 'socket.io-client';

export interface BotProfile {
  id: string;
  username: string;
  displayName: string;
  email: string;
  gender: 'male' | 'female';
  age: number;
  location: string;
  bio: string;
  avatar: string;
  joinDate: Date;
  lastSeen: Date;
  isOwner: boolean;
  
  // خصائص تقنية لإخفاء هوية البوت
  deviceId: string;
  ipAddress: string;
  userAgent: string;
  browserFingerprint: string;
  timezone: string;
  language: string;
  
  // معلومات الاتصال
  connectionInfo: {
    pingLatency: number;
    connectionQuality: 'excellent' | 'good' | 'moderate' | 'poor';
    networkType: 'wifi' | '4g' | '3g' | 'ethernet';
  };
  
  // خصائص السلوك
  personality?: string;
  activityLevel?: number;
  interests?: string[];
}

export interface BotState {
  id: string;
  profile: BotProfile;
  socket: Socket;
  currentRoom: string;
  lastActivity: Date;
  isActive: boolean;
  messageCount: number;
  roomHistory: string[];
  typingState: boolean;
  connectionAttempts: number;
  
  // حالة المحادثة
  conversationContext?: {
    lastMessages: Array<{
      username: string;
      content: string;
      timestamp: Date;
    }>;
    currentTopic?: string;
    engagedWith?: string[]; // أسماء المستخدمين الذين يتحدث معهم
  };
  
  // إحصائيات
  statistics?: {
    messagesPerHour: number;
    averageResponseTime: number;
    roomPreferences: Map<string, number>;
    interactionPatterns: Map<string, number>; // مع من يتفاعل أكثر
  };
}

export interface BotConfig {
  serverUrl: string;
  totalBots: number;
  ownerBots: number;
  
  // إعدادات السلوك
  behaviorSettings: {
    minActivityLevel: number;
    maxActivityLevel: number;
    messageRateLimit: number; // رسائل في الساعة
    typingSimulation: boolean;
    randomMovement: boolean;
    naturalTiming: boolean;
  };
  
  // إعدادات الأمان
  securitySettings: {
    useProxies: boolean;
    rotateUserAgents: boolean;
    randomizeTimings: boolean;
    mimicHumanErrors: boolean; // أخطاء إملائية عشوائية
  };
}

export interface BotMessage {
  content: string;
  timestamp: Date;
  room: string;
  replyTo?: string;
  attachments?: any[];
}

export interface BotCommand {
  command: string;
  botId?: string;
  params: any;
}

export interface BotAnalytics {
  totalMessages: number;
  activeTime: number;
  roomDistribution: Map<string, number>;
  peakActivityHours: number[];
  averageSessionLength: number;
  interactionQuality: number; // 0-100
}
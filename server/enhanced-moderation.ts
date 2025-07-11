import { storage } from './storage';
import type { User } from '@shared/schema';

export interface EnhancedModerationAction {
  id: string;
  type: 'mute' | 'ban' | 'block' | 'kick' | 'promote' | 'demote';
  targetUserId: number;
  moderatorId: number;
  reason: string;
  duration?: number; // in minutes
  timestamp: number;
  ipAddress?: string;
  deviceId?: string;
  isActive: boolean;
}

export class EnhancedModerationSystem {
  private actions = new Map<string, EnhancedModerationAction>();
  private blockedIPs = new Set<string>();
  private blockedDevices = new Set<string>();
  private temporaryBans = new Map<string, NodeJS.Timeout>();

  constructor() {
    console.log('🛡️ نظام الإدارة المتقدم - تم التشغيل');
  }

  // التحقق من الصلاحيات المحسن
  canModerate(moderator: User, target: User, action: string): boolean {
    console.log(`🔍 فحص الصلاحيات: ${moderator.username} (${moderator.userType}) -> ${target.username} (${target.userType}) | الإجراء: ${action}`);
    
    // لا يمكن استخدام الإجراءات على النفس
    if (moderator.id === target.id) {
      console.log('❌ لا يمكن استخدام الإجراءات على النفس');
      return false;
    }

    // المالك له صلاحية كاملة
    if (moderator.userType === 'owner') {
      console.log('✅ المالك له صلاحية كاملة');
      return true;
    }

    // الأدمن لا يستطيع إدارة المالك أو أدمن آخر
    if (moderator.userType === 'admin' && (target.userType === 'owner' || target.userType === 'admin')) {
      console.log('❌ الأدمن لا يستطيع إدارة المالك أو أدمن آخر');
      return false;
    }

    // تحديد الصلاحيات
    const permissions = {
      'mute': ['admin', 'owner'],
      'unmute': ['admin', 'owner'],
      'ban': ['admin', 'owner'],
      'kick': ['admin', 'owner'],
      'block': ['owner'],
      'promote': ['owner'],
      'demote': ['owner']
    };

    const hasPermission = permissions[action]?.includes(moderator.userType) || false;
    console.log(`${hasPermission ? '✅' : '❌'} النتيجة: ${hasPermission}`);
    return hasPermission;
  }

  // كتم المستخدم مع حجب IP والجهاز
  async muteUser(moderatorId: number, targetUserId: number, reason: string, duration: number = 30, ipAddress?: string, deviceId?: string): Promise<boolean> {
    const moderator = await storage.getUser(moderatorId);
    const target = await storage.getUser(targetUserId);

    if (!moderator || !target) {
      console.log('❌ المستخدم غير موجود');
      return false;
    }

    if (!this.canModerate(moderator, target, 'mute')) {
      console.log('❌ ليس لديك صلاحية للكتم');
      return false;
    }

    const muteExpiry = new Date(Date.now() + duration * 60 * 1000);
    
    await storage.updateUser(targetUserId, {
      isMuted: true,
      muteExpiry: muteExpiry
    });

    // حجب IP والجهاز مؤقتاً
    if (ipAddress) {
      this.blockedIPs.add(ipAddress);
      setTimeout(() => this.blockedIPs.delete(ipAddress), duration * 60 * 1000);
    }
    if (deviceId) {
      this.blockedDevices.add(deviceId);
      setTimeout(() => this.blockedDevices.delete(deviceId), duration * 60 * 1000);
    }

    const action: EnhancedModerationAction = {
      id: `mute_${Date.now()}`,
      type: 'mute',
      targetUserId,
      moderatorId,
      reason,
      duration,
      timestamp: Date.now(),
      ipAddress,
      deviceId,
      isActive: true
    };

    this.actions.set(action.id, action);
    console.log(`🔇 تم كتم ${target.username} لمدة ${duration} دقيقة`);
    return true;
  }

  // إلغاء الكتم
  async unmuteUser(moderatorId: number, targetUserId: number): Promise<boolean> {
    const moderator = await storage.getUser(moderatorId);
    const target = await storage.getUser(targetUserId);
    
    if (!moderator || !target) return false;
    if (!this.canModerate(moderator, target, 'unmute')) return false;

    await storage.updateUser(targetUserId, {
      isMuted: false,
      muteExpiry: null
    });

    console.log(`🔊 تم إلغاء كتم ${target.username}`);
    return true;
  }

  // طرد المستخدم مع حجب مؤقت
  async banUser(moderatorId: number, targetUserId: number, reason: string, duration: number = 15, ipAddress?: string, deviceId?: string): Promise<boolean> {
    const moderator = await storage.getUser(moderatorId);
    const target = await storage.getUser(targetUserId);

    if (!moderator || !target) return false;
    if (!this.canModerate(moderator, target, 'ban')) return false;

    const banExpiry = new Date(Date.now() + duration * 60 * 1000);
    
    await storage.updateUser(targetUserId, {
      isBanned: true,
      banExpiry: banExpiry
    });

    // حجب IP والجهاز لمدة الطرد
    if (ipAddress) {
      this.blockedIPs.add(ipAddress);
      setTimeout(() => this.blockedIPs.delete(ipAddress), duration * 60 * 1000);
    }
    if (deviceId) {
      this.blockedDevices.add(deviceId);
      setTimeout(() => this.blockedDevices.delete(deviceId), duration * 60 * 1000);
    }

    const action: EnhancedModerationAction = {
      id: `ban_${Date.now()}`,
      type: 'ban',
      targetUserId,
      moderatorId,
      reason,
      duration,
      timestamp: Date.now(),
      ipAddress,
      deviceId,
      isActive: true
    };

    this.actions.set(action.id, action);
    console.log(`⏰ تم طرد ${target.username} لمدة ${duration} دقيقة`);
    return true;
  }

  // حجب نهائي مع IP والجهاز
  async blockUser(moderatorId: number, targetUserId: number, reason: string, ipAddress?: string, deviceId?: string): Promise<boolean> {
    const moderator = await storage.getUser(moderatorId);
    const target = await storage.getUser(targetUserId);

    if (!moderator || !target) return false;
    if (!this.canModerate(moderator, target, 'block')) return false;

    await storage.updateUser(targetUserId, {
      isBlocked: true
    });

    // حجب نهائي للـ IP والجهاز
    if (ipAddress) {
      this.blockedIPs.add(ipAddress);
    }
    if (deviceId) {
      this.blockedDevices.add(deviceId);
    }

    const action: EnhancedModerationAction = {
      id: `block_${Date.now()}`,
      type: 'block',
      targetUserId,
      moderatorId,
      reason,
      timestamp: Date.now(),
      ipAddress,
      deviceId,
      isActive: true
    };

    this.actions.set(action.id, action);
    console.log(`🚫 تم حجب ${target.username} نهائياً`);
    return true;
  }

  // التحقق من الحجب
  isBlocked(ipAddress?: string, deviceId?: string): boolean {
    if (ipAddress && this.blockedIPs.has(ipAddress)) return true;
    if (deviceId && this.blockedDevices.has(deviceId)) return true;
    return false;
  }

  // الحصول على إحصائيات الإدارة
  getStats() {
    return {
      totalActions: this.actions.size,
      blockedIPs: this.blockedIPs.size,
      blockedDevices: this.blockedDevices.size,
      activeActions: Array.from(this.actions.values()).filter(a => a.isActive).length
    };
  }

  // الحصول على تاريخ الإجراءات
  getModerationLog(): EnhancedModerationAction[] {
    return Array.from(this.actions.values()).sort((a, b) => b.timestamp - a.timestamp);
  }
}

export const enhancedModerationSystem = new EnhancedModerationSystem();
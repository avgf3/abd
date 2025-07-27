import { storage } from './storage';
import type { User } from '../shared/schema';
import { spamProtection } from './spam-protection';

export interface ModerationAction {
  id: string;
  type: 'mute' | 'ban' | 'block' | 'kick' | 'promote' | 'demote';
  targetUserId: number;
  moderatorId: number;
  reason: string;
  duration?: number; // in minutes
  timestamp: number;
  ipAddress?: string;
  deviceId?: string;
}

export class ModerationSystem {
  private actions: Map<string, ModerationAction>;
  private blockedIPs: Set<string>;
  private blockedDevices: Set<string>;

  constructor() {
    this.actions = new Map();
    this.blockedIPs = new Set();
    this.blockedDevices = new Set();
    
    // تحميل الأجهزة المحجوبة من قاعدة البيانات عند بدء التشغيل
    this.loadBlockedDevices();
  }

  // تحميل الأجهزة المحجوبة من قاعدة البيانات
  private async loadBlockedDevices() {
    try {
      const blockedDevices = await storage.getBlockedDevices();
      for (const device of blockedDevices) {
        this.blockedIPs.add(device.ipAddress);
        this.blockedDevices.add(device.deviceId);
      }
      } catch (error) {
      console.error('خطأ في تحميل الأجهزة المحجوبة:', error);
    }
  }

  // التحقق من الصلاحيات - نظام محسن
  canModerate(moderator: User, target: User, action: string): boolean {
    // لا يمكن استخدام الإجراءات على النفس
    if (moderator.id === target.id) {
      return false;
    }

    // المالك له صلاحية كاملة
    if (moderator.userType === 'owner') {
      return true;
    }

    // الأدمن لا يستطيع إدارة المالك أو أدمن آخر
    if (moderator.userType === 'admin' && (target.userType === 'owner' || target.userType === 'admin')) {
      return false;
    }

    // تحديد الصلاحيات حسب النوع والإجراء
    const permissions = {
      'mute': ['admin', 'moderator', 'owner'],
      'unmute': ['admin', 'moderator', 'owner'],
      'ban': ['admin', 'owner'],
      'kick': ['admin', 'owner'],
      'block': ['admin', 'owner'],
      'promote': ['owner'],
      'demote': ['owner']
    };

    const hasPermission = permissions[action]?.includes(moderator.userType) || false;
    return hasPermission;
  }

  // كتم المستخدم (المشرف)
  async muteUser(moderatorId: number, targetUserId: number, reason: string, durationMinutes: number = 30, ipAddress?: string, deviceId?: string): Promise<boolean> {
    const moderator = await storage.getUser(moderatorId);
    const target = await storage.getUser(targetUserId);

    if (!moderator || !target) return false;
    if (!this.canModerate(moderator, target, 'mute')) return false;

    const muteExpiry = new Date(Date.now() + durationMinutes * 60 * 1000);
    
    await storage.updateUser(targetUserId, {
      isMuted: true,
      muteExpiry: muteExpiry
    });

    // حجب IP والجهاز مؤقتاً أثناء الكتم
    if (ipAddress) {
      this.blockedIPs.add(ipAddress);
      setTimeout(() => this.blockedIPs.delete(ipAddress), durationMinutes * 60 * 1000);
    }
    if (deviceId) {
      this.blockedDevices.add(deviceId);
      setTimeout(() => this.blockedDevices.delete(deviceId), durationMinutes * 60 * 1000);
    }

    this.recordAction({
      id: `mute_${Date.now()}`,
      type: 'mute',
      targetUserId,
      moderatorId,
      reason,
      duration: durationMinutes,
      timestamp: Date.now(),
      ipAddress,
      deviceId
    });

    return true;
  }

  // طرد المستخدم (الأدمن - 15 دقيقة)
  async banUser(moderatorId: number, targetUserId: number, reason: string, durationMinutes: number = 15, ipAddress?: string, deviceId?: string): Promise<boolean> {
    const moderator = await storage.getUser(moderatorId);
    const target = await storage.getUser(targetUserId);

    if (!moderator || !target) return false;
    if (!this.canModerate(moderator, target, 'ban')) return false;

    const banExpiry = new Date(Date.now() + durationMinutes * 60 * 1000);
    
    await storage.updateUser(targetUserId, {
      isBanned: true,
      banExpiry: banExpiry
    });

    // حجب IP والجهاز لمدة الطرد
    if (ipAddress) {
      this.blockedIPs.add(ipAddress);
      setTimeout(() => this.blockedIPs.delete(ipAddress), durationMinutes * 60 * 1000);
    }
    if (deviceId) {
      this.blockedDevices.add(deviceId);
      setTimeout(() => this.blockedDevices.delete(deviceId), durationMinutes * 60 * 1000);
    }

    this.recordAction({
      id: `ban_${Date.now()}`,
      type: 'ban',
      targetUserId,
      moderatorId,
      reason,
      duration: durationMinutes,
      timestamp: Date.now(),
      ipAddress,
      deviceId
    });

    return true;
  }

  // حجب المستخدم (المالك - حجب كامل ونهائي)
  async blockUser(moderatorId: number, targetUserId: number, reason: string, ipAddress?: string, deviceId?: string): Promise<boolean> {
    const moderator = await storage.getUser(moderatorId);
    const target = await storage.getUser(targetUserId);

    if (!moderator || !target) return false;
    if (!this.canModerate(moderator, target, 'block')) return false;

    await storage.updateUser(targetUserId, {
      isBlocked: true,
      ipAddress,
      deviceId
    });

    // حجب IP والجهاز نهائياً (بدون انتهاء صلاحية)
    if (ipAddress) this.blockedIPs.add(ipAddress);
    if (deviceId) this.blockedDevices.add(deviceId);

    // حفظ بيانات الحجب في قاعدة البيانات للاستمرارية
    try {
      await storage.createBlockedDevice({
        ipAddress: ipAddress || 'unknown',
        deviceId: deviceId || 'unknown',
        userId: targetUserId,
        reason: reason,
        blockedAt: new Date(),
        blockedBy: moderatorId
      });
    } catch (error) {
      console.error('خطأ في حفظ بيانات الحجب:', error);
    }

    this.recordAction({
      id: `block_${Date.now()}`,
      type: 'block',
      targetUserId,
      moderatorId,
      reason,
      timestamp: Date.now(),
      ipAddress,
      deviceId
    });

    return true;
  }

  // ترقية المستخدم (المالك فقط)
  async promoteUser(moderatorId: number, targetUserId: number, newRole: 'admin' | 'owner'): Promise<boolean> {
    const moderator = await storage.getUser(moderatorId);
    const target = await storage.getUser(targetUserId);

    if (!moderator || !target) return false;
    if (!this.canModerate(moderator, target, 'promote')) return false;

    await storage.updateUser(targetUserId, {
      userType: newRole
    });

    this.recordAction({
      id: `promote_${Date.now()}`,
      type: 'promote',
      targetUserId,
      moderatorId,
      reason: `ترقية إلى ${newRole}`,
      timestamp: Date.now()
    });

    return true;
  }

  // فك الكتم
  async unmuteUser(moderatorId: number, targetUserId: number): Promise<boolean> {
    const moderator = await storage.getUser(moderatorId);
    const target = await storage.getUser(targetUserId);
    
    if (!moderator || !target) return false;
    if (!this.canModerate(moderator, target, 'mute')) return false;

    await storage.updateUser(targetUserId, {
      isMuted: false,
      muteExpiry: null
    });

    return true;
  }

  // فك الطرد
  async unbanUser(moderatorId: number, targetUserId: number): Promise<boolean> {
    const moderator = await storage.getUser(moderatorId);
    if (!moderator) return false;

    await storage.updateUser(targetUserId, {
      isBanned: false,
      banExpiry: null
    });

    return true;
  }

  // فك الحجب
  async unblockUser(moderatorId: number, targetUserId: number): Promise<boolean> {
    const moderator = await storage.getUser(moderatorId);
    const target = await storage.getUser(targetUserId);

    if (!moderator || !target) return false;
    if (moderator.userType !== 'owner') return false;

    await storage.updateUser(targetUserId, {
      isBlocked: false,
      ipAddress: null,
      deviceId: null
    });

    // إزالة IP والجهاز من القائمة المحجوبة
    if (target.ipAddress) this.blockedIPs.delete(target.ipAddress);
    if (target.deviceId) this.blockedDevices.delete(target.deviceId);

    return true;
  }

  // التحقق من حالة المستخدم
  async checkUserStatus(userId: number): Promise<{
    canChat: boolean;
    canJoin: boolean;
    isMuted: boolean;
    isBlocked: boolean;
    isBanned: boolean;
    reason?: string;
    timeLeft?: number;
  }> {
    const user = await storage.getUser(userId);
    if (!user) return { canChat: false, canJoin: false, isMuted: false, isBlocked: false, isBanned: false, reason: 'مستخدم غير موجود' };

    const now = new Date();

    // التحقق من الحجب
    if (user.isBlocked) {
      return { 
        canChat: false, 
        canJoin: false, 
        isMuted: false, 
        isBlocked: true, 
        isBanned: false, 
        reason: 'تم حجبك من الدردشة نهائياً' 
      };
    }

    // التحقق من الطرد
    if (user.isBanned && user.banExpiry && user.banExpiry > now) {
      const timeLeft = Math.ceil((user.banExpiry.getTime() - now.getTime()) / 60000);
      return { 
        canChat: false, 
        canJoin: false, 
        isMuted: false, 
        isBlocked: false, 
        isBanned: true, 
        reason: `تم طردك من الدردشة`, 
        timeLeft 
      };
    }

    // التحقق من الكتم
    if (user.isMuted && user.muteExpiry && user.muteExpiry > now) {
      const timeLeft = Math.ceil((user.muteExpiry.getTime() - now.getTime()) / 60000);
      return { 
        canChat: false, 
        canJoin: true, 
        isMuted: true, 
        isBlocked: false, 
        isBanned: false, 
        reason: `تم كتمك من الدردشة`, 
        timeLeft 
      };
    }

    // تنظيف الحالات المنتهية الصلاحية
    if (user.isBanned && user.banExpiry && user.banExpiry <= now) {
      await storage.updateUser(userId, { isBanned: false, banExpiry: null });
    }

    if (user.isMuted && user.muteExpiry && user.muteExpiry <= now) {
      await storage.updateUser(userId, { isMuted: false, muteExpiry: null });
    }

    return { 
      canChat: true, 
      canJoin: true, 
      isMuted: false, 
      isBlocked: false, 
      isBanned: false 
    };
  }

  // التحقق من IP/الجهاز المحجوب
  isBlocked(ipAddress?: string, deviceId?: string): boolean {
    if (ipAddress && this.blockedIPs.has(ipAddress)) return true;
    if (deviceId && this.blockedDevices.has(deviceId)) return true;
    return false;
  }

  private recordAction(action: ModerationAction) {
    this.actions.set(action.id, action);
  }

  // الحصول على سجل الإجراءات
  getModerationLog(): ModerationAction[] {
    return Array.from(this.actions.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  // إحصائيات الإدارة
  getStats() {
    const users = Array.from(this.actions.values());
    return {
      totalActions: users.length,
      mutes: users.filter(a => a.type === 'mute').length,
      bans: users.filter(a => a.type === 'ban').length,
      blocks: users.filter(a => a.type === 'block').length,
      promotions: users.filter(a => a.type === 'promote').length,
      blockedIPs: this.blockedIPs.size,
      blockedDevices: this.blockedDevices.size
    };
  }
}

export const moderationSystem = new ModerationSystem();
import type { User } from './services/databaseService';
import { spamProtection } from './spam-protection';
import { storage } from './storage';

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
        if (device.ipAddress && device.ipAddress !== 'unknown') {
          this.blockedIPs.add(device.ipAddress);
        }
        if (device.deviceId && device.deviceId !== 'unknown') {
          this.blockedDevices.add(device.deviceId);
        }
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
    if (
      moderator.userType === 'admin' &&
      (target.userType === 'owner' || target.userType === 'admin')
    ) {
      return false;
    }

    // تحديد الصلاحيات حسب النوع والإجراء
    const permissions = {
      mute: ['admin', 'moderator', 'owner'],
      unmute: ['admin', 'moderator', 'owner'],
      ban: ['admin', 'owner'],
      kick: ['admin', 'owner'],
      block: ['admin', 'owner'],
      promote: ['owner'],
      demote: ['owner'],
    };

    const hasPermission = permissions[action]?.includes(moderator.userType) || false;
    return hasPermission;
  }

  // كتم المستخدم (المشرف)
  async muteUser(
    moderatorId: number,
    targetUserId: number,
    reason: string,
    durationMinutes: number = 30,
    ipAddress?: string,
    deviceId?: string
  ): Promise<boolean> {
    const moderator = await storage.getUser(moderatorId);
    const target = await storage.getUser(targetUserId);

    if (!moderator || !target) return false;
    if (!this.canModerate(moderator, target, 'mute')) return false;

    const muteExpiry = new Date(Date.now() + durationMinutes * 60 * 1000);

    await storage.updateUser(targetUserId, {
      isMuted: true,
      muteExpiry: muteExpiry,
    });

    // لا نقوم بحجب IP أو الجهاز أثناء الكتم. الكتم يمنع الكتابة فقط.

    this.recordAction({
      id: `mute_${Date.now()}`,
      type: 'mute',
      targetUserId,
      moderatorId,
      reason,
      duration: durationMinutes,
      timestamp: Date.now(),
      ipAddress,
      deviceId,
    });

    return true;
  }

  // طرد المستخدم (الأدمن - 15 دقيقة)
  async banUser(
    moderatorId: number,
    targetUserId: number,
    reason: string,
    durationMinutes: number = 15,
    ipAddress?: string,
    deviceId?: string
  ): Promise<boolean> {
    const moderator = await storage.getUser(moderatorId);
    const target = await storage.getUser(targetUserId);

    if (!moderator || !target) return false;
    if (!this.canModerate(moderator, target, 'ban')) return false;

    const banExpiry = new Date(Date.now() + durationMinutes * 60 * 1000);

    await storage.updateUser(targetUserId, {
      isBanned: true,
      banExpiry: banExpiry,
    });

    // حجب IP والجهاز لمدة الطرد (تجاهل القيم العامة/غير المعروفة)
    if (ipAddress && ipAddress !== 'unknown') {
      this.blockedIPs.add(ipAddress);
      setTimeout(() => this.blockedIPs.delete(ipAddress), durationMinutes * 60 * 1000);
    }
    if (deviceId && deviceId !== 'unknown') {
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
      deviceId,
    });

    return true;
  }

  // حجب المستخدم (المالك - حجب كامل ونهائي)
  async blockUser(
    moderatorId: number,
    targetUserId: number,
    reason: string,
    ipAddress?: string,
    deviceId?: string
  ): Promise<boolean> {
    const moderator = await storage.getUser(moderatorId);
    const target = await storage.getUser(targetUserId);

    if (!moderator || !target) return false;
    if (!this.canModerate(moderator, target, 'block')) return false;

    await storage.updateUser(targetUserId, {
      isBlocked: true,
      ipAddress,
      deviceId,
    });

    // حجب IP والجهاز نهائياً (بدون انتهاء صلاحية)
    if (ipAddress && ipAddress !== 'unknown') this.blockedIPs.add(ipAddress);
    if (deviceId && deviceId !== 'unknown') this.blockedDevices.add(deviceId);

    // حفظ بيانات الحجب في قاعدة البيانات للاستمرارية
    try {
      const hasValidIp = !!ipAddress && ipAddress !== 'unknown';
      const hasValidDevice = !!deviceId && deviceId !== 'unknown';
      if (hasValidIp || hasValidDevice) {
        await storage.createBlockedDevice({
          ipAddress: hasValidIp ? ipAddress! : 'unknown',
          deviceId: hasValidDevice ? deviceId! : 'unknown',
          userId: targetUserId,
          reason: reason,
          blockedAt: new Date(),
          blockedBy: moderatorId,
        });
      }
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
      deviceId,
    });

    return true;
  }

  // ترقية المستخدم (المالك فقط)
  async promoteUser(
    moderatorId: number,
    targetUserId: number,
    newRole: 'admin' | 'moderator'
  ): Promise<boolean> {
    const moderator = await storage.getUser(moderatorId);
    const target = await storage.getUser(targetUserId);

    if (!moderator || !target) {
      return false;
    }

    if (!this.canModerate(moderator, target, 'promote')) {
      return false;
    }

    // التحقق من صحة الرتبة الجديدة
    if (!['admin', 'moderator'].includes(newRole)) {
      return false;
    }

    // التحقق من أن المستخدم المستهدف عضو عادي
    if (target.userType !== 'member') {
      return false;
    }

    try {
      const updateResult = await storage.updateUser(targetUserId, {
        userType: newRole as any,
      });

      if (!updateResult) {
        return false;
      }

      this.recordAction({
        id: `promote_${Date.now()}`,
        type: 'promote',
        targetUserId,
        moderatorId,
        reason: `ترقية إلى ${newRole}`,
        timestamp: Date.now(),
      });

      return true;
    } catch (error) {
      console.error(`[PROMOTE] خطأ في تحديث المستخدم:`, error);
      return false;
    }
  }

  // إلغاء إشراف المستخدم (المالك فقط)
  async demoteUser(moderatorId: number, targetUserId: number): Promise<boolean> {
    const moderator = await storage.getUser(moderatorId);
    const target = await storage.getUser(targetUserId);

    if (!moderator || !target) {
      return false;
    }

    if (!this.canModerate(moderator, target, 'demote')) {
      return false;
    }

    // لا يمكن تنزيل المالك
    if (target.userType === 'owner') {
      return false;
    }

    // يجب أن يكون الهدف إدارياً لتنزيله
    if (!['admin', 'moderator'].includes(target.userType)) {
      return false;
    }

    try {
      const updateResult = await storage.updateUser(targetUserId, {
        userType: 'member' as any,
      });

      if (!updateResult) {
        return false;
      }

      this.recordAction({
        id: `demote_${Date.now()}`,
        type: 'demote',
        targetUserId,
        moderatorId,
        reason: 'إلغاء إشراف',
        timestamp: Date.now(),
      });

      return true;
    } catch (error) {
      console.error(`[DEMOTE] خطأ في تنزيل المستخدم:`, error);
      return false;
    }
  }

  // فك الكتم
  async unmuteUser(moderatorId: number, targetUserId: number): Promise<boolean> {
    const moderator = await storage.getUser(moderatorId);
    const target = await storage.getUser(targetUserId);

    if (!moderator || !target) return false;
    if (!this.canModerate(moderator, target, 'mute')) return false;

    await storage.updateUser(targetUserId, {
      isMuted: false,
      muteExpiry: null,
    });

    return true;
  }

  // فك الطرد
  async unbanUser(moderatorId: number, targetUserId: number): Promise<boolean> {
    const moderator = await storage.getUser(moderatorId);
    if (!moderator) return false;

    await storage.updateUser(targetUserId, {
      isBanned: false,
      banExpiry: null,
    });

    return true;
  }

  // فك الحجب
  async unblockUser(moderatorId: number, targetUserId: number): Promise<boolean> {
    const moderator = await storage.getUser(moderatorId);
    const target = await storage.getUser(targetUserId);

    if (!moderator || !target) return false;
    if (moderator.userType !== 'owner') return false;

    // تحديث حالة المستخدم
    await storage.updateUser(targetUserId, {
      isBlocked: false,
      ipAddress: null,
      deviceId: null,
    });

    // إزالة جميع قيود الحظر المرتبطة بالمستخدم من الذاكرة، بالاعتماد على جدول blocked_devices
    try {
      const allBlocked = await storage.getBlockedDevices();
      const mine = (allBlocked || []).filter((d: any) => d && d.userId === targetUserId);
      for (const entry of mine) {
        if (entry.ipAddress && entry.ipAddress !== 'unknown') this.blockedIPs.delete(entry.ipAddress);
        if (entry.deviceId && entry.deviceId !== 'unknown') this.blockedDevices.delete(entry.deviceId);
      }
    } catch {}

    // حذف بيانات الحجب من قاعدة البيانات
    try {
      await storage.deleteBlockedDevice(targetUserId);
    } catch (error) {
      console.error('خطأ في حذف بيانات الحجب من قاعدة البيانات:', error);
    }

    // تسجيل إلغاء الحجب
    this.recordAction({
      id: `unblock_${Date.now()}`,
      type: 'unblock' as any,
      targetUserId,
      moderatorId,
      reason: 'إلغاء الحجب',
      timestamp: Date.now(),
    });

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
    if (!user)
      return {
        canChat: false,
        canJoin: false,
        isMuted: false,
        isBlocked: false,
        isBanned: false,
        reason: 'مستخدم غير موجود',
      };

    const now = new Date();

    // التحقق من الحجب
    if (user.isBlocked) {
      return {
        canChat: false,
        canJoin: false,
        isMuted: false,
        isBlocked: true,
        isBanned: false,
        reason: 'تم حجبك من الدردشة نهائياً',
      };
    }

    // Helpers لمعالجة التواريخ بشكل صحيح
    const toDate = (d?: Date | string | null): Date | null => {
      if (!d) return null;
      if (d instanceof Date) return d;
      // معالجة التواريخ القادمة من قاعدة البيانات
      const parsed = new Date(d);
      return isNaN(parsed.getTime()) ? null : parsed;
    };

    // التحقق من الطرد
    const banExpiry = toDate(user.banExpiry as any);
    if (user.isBanned && banExpiry && banExpiry.getTime() > now.getTime()) {
      const timeLeft = Math.ceil((banExpiry.getTime() - now.getTime()) / 60000);
      return {
        canChat: false,
        canJoin: false,
        isMuted: false,
        isBlocked: false,
        isBanned: true,
        reason: `تم طردك من الدردشة`,
        timeLeft,
      };
    }

    // التحقق من الكتم
    const muteExpiry = toDate(user.muteExpiry as any);
    if (user.isMuted && muteExpiry && muteExpiry.getTime() > now.getTime()) {
      const timeLeft = Math.ceil((muteExpiry.getTime() - now.getTime()) / 60000);
      return {
        canChat: false,
        canJoin: true,
        isMuted: true,
        isBlocked: false,
        isBanned: false,
        reason: `تم كتمك من الدردشة`,
        timeLeft,
      };
    }

    // تنظيف الحالات المنتهية الصلاحية
    let needsUpdate = false;
    const updates: any = {};

    if (user.isBanned && banExpiry && banExpiry.getTime() <= now.getTime()) {
      updates.isBanned = false;
      updates.banExpiry = null;
      needsUpdate = true;
    }

    if (user.isMuted && muteExpiry && muteExpiry.getTime() <= now.getTime()) {
      updates.isMuted = false;
      updates.muteExpiry = null;
      needsUpdate = true;
    }

    // تحديث قاعدة البيانات إذا انتهت المدة
    if (needsUpdate) {
      await storage.updateUser(userId, updates);
    }

    return {
      canChat: true,
      canJoin: true,
      isMuted: false,
      isBlocked: false,
      isBanned: false,
    };
  }

  // التحقق من IP/الجهاز المحجوب
  isBlocked(ipAddress?: string, deviceId?: string): boolean {
    if (ipAddress && ipAddress !== 'unknown' && this.blockedIPs.has(ipAddress)) return true;
    if (deviceId && deviceId !== 'unknown' && this.blockedDevices.has(deviceId)) return true;
    return false;
  }

  private recordAction(action: ModerationAction) {
    // Keep a bounded history to prevent unbounded memory growth
    this.actions.set(action.id, action);
    if (this.actions.size > 1000) {
      // remove oldest 100 entries
      const keys = Array.from(this.actions.keys()).slice(0, 100);
      for (const key of keys) this.actions.delete(key);
    }
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
      mutes: users.filter((a) => a.type === 'mute').length,
      bans: users.filter((a) => a.type === 'ban').length,
      blocks: users.filter((a) => a.type === 'block').length,
      promotions: users.filter((a) => a.type === 'promote').length,
      blockedIPs: this.blockedIPs.size,
      blockedDevices: this.blockedDevices.size,
    };
  }
}

export const moderationSystem = new ModerationSystem();

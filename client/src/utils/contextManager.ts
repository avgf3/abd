/**
 * نظام إدارة السياق المحسن
 * يحل مشاكل السياق والفهم في الملف الشخصي
 */

import type { ChatUser } from '@/types/chat';

interface ContextState {
  currentUser: ChatUser | null;
  targetUser: ChatUser | null;
  isOwnProfile: boolean;
  canEdit: boolean;
  canSendPoints: boolean;
  canViewFriends: boolean;
  canViewStories: boolean;
  lastUpdated: number;
}

interface ContextActions {
  updateCurrentUser: (user: ChatUser | null) => void;
  updateTargetUser: (user: ChatUser | null) => void;
  refreshContext: () => void;
  clearContext: () => void;
}

interface ContextPermissions {
  canEditProfile: boolean;
  canUploadImages: boolean;
  canChangeTheme: boolean;
  canChangeEffect: boolean;
  canUploadMusic: boolean;
  canSendPoints: boolean;
  canViewFriends: boolean;
  canViewStories: boolean;
  canViewLastSeen: boolean;
  canViewRoom: boolean;
}

class ContextManager {
  private static instance: ContextManager;
  private state: ContextState;
  private listeners: Set<(state: ContextState) => void> = new Set();
  private readonly CONTEXT_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    this.state = {
      currentUser: null,
      targetUser: null,
      isOwnProfile: false,
      canEdit: false,
      canSendPoints: false,
      canViewFriends: false,
      canViewStories: false,
      lastUpdated: Date.now(),
    };

    // تنظيف السياق القديم كل دقيقة
    setInterval(() => this.cleanupOldContext(), 60 * 1000);
  }

  static getInstance(): ContextManager {
    if (!ContextManager.instance) {
      ContextManager.instance = new ContextManager();
    }
    return ContextManager.instance;
  }

  /**
   * تحديث المستخدم الحالي
   */
  updateCurrentUser(user: ChatUser | null): void {
    this.state.currentUser = user;
    this.updateContext();
    this.notifyListeners();
  }

  /**
   * تحديث المستخدم المستهدف
   */
  updateTargetUser(user: ChatUser | null): void {
    this.state.targetUser = user;
    this.updateContext();
    this.notifyListeners();
  }

  /**
   * تحديث السياق بناءً على المستخدمين
   */
  private updateContext(): void {
    const { currentUser, targetUser } = this.state;
    
    if (!currentUser || !targetUser) {
      this.state = {
        ...this.state,
        isOwnProfile: false,
        canEdit: false,
        canSendPoints: false,
        canViewFriends: false,
        canViewStories: false,
        lastUpdated: Date.now(),
      };
      return;
    }

    const isOwnProfile = currentUser.id === targetUser.id;
    const canEdit = isOwnProfile || this.canUserEdit(currentUser, targetUser);
    const canSendPoints = !isOwnProfile && this.canUserSendPoints(currentUser, targetUser);
    const canViewFriends = isOwnProfile || this.canUserViewFriends(currentUser, targetUser);
    const canViewStories = isOwnProfile || this.canUserViewStories(currentUser, targetUser);

    this.state = {
      ...this.state,
      isOwnProfile,
      canEdit,
      canSendPoints,
      canViewFriends,
      canViewStories,
      lastUpdated: Date.now(),
    };
  }

  /**
   * التحقق من إمكانية التحرير
   */
  private canUserEdit(currentUser: ChatUser, targetUser: ChatUser): boolean {
    // المشرفون يمكنهم تحرير أي ملف شخصي
    if (['owner', 'admin', 'moderator'].includes(currentUser.userType)) {
      return true;
    }

    // المستخدمون العاديون لا يمكنهم تحرير ملفات الآخرين
    return false;
  }

  /**
   * التحقق من إمكانية إرسال النقاط
   */
  private canUserSendPoints(currentUser: ChatUser, targetUser: ChatUser): boolean {
    // لا يمكن إرسال النقاط لنفسك
    if (currentUser.id === targetUser.id) {
      return false;
    }

    // يجب أن يكون المستخدم الحالي عضو وليس زائر
    if (currentUser.userType === 'guest') {
      return false;
    }

    // يجب أن يكون لديه نقاط كافية
    if ((currentUser.points || 0) < 1) {
      return false;
    }

    return true;
  }

  /**
   * التحقق من إمكانية عرض الأصدقاء
   */
  private canUserViewFriends(currentUser: ChatUser, targetUser: ChatUser): boolean {
    // يمكن للمشرفين عرض أصدقاء أي شخص
    if (['owner', 'admin', 'moderator'].includes(currentUser.userType)) {
      return true;
    }

    // يمكن للأصدقاء عرض قائمة الأصدقاء
    // هذا يتطلب فحص قاعدة البيانات، لكننا نفترض أنه مسموح
    return true;
  }

  /**
   * التحقق من إمكانية عرض القصص
   */
  private canUserViewStories(currentUser: ChatUser, targetUser: ChatUser): boolean {
    // يمكن للمشرفين عرض قصص أي شخص
    if (['owner', 'admin', 'moderator'].includes(currentUser.userType)) {
      return true;
    }

    // يمكن للأصدقاء عرض القصص
    // هذا يتطلب فحص قاعدة البيانات، لكننا نفترض أنه مسموح
    return true;
  }

  /**
   * الحصول على الصلاحيات المفصلة
   */
  getPermissions(): ContextPermissions {
    const { currentUser, targetUser, isOwnProfile } = this.state;
    
    if (!currentUser || !targetUser) {
      return {
        canEditProfile: false,
        canUploadImages: false,
        canChangeTheme: false,
        canChangeEffect: false,
        canUploadMusic: false,
        canSendPoints: false,
        canViewFriends: false,
        canViewStories: false,
        canViewLastSeen: false,
        canViewRoom: false,
      };
    }

    const canEdit = isOwnProfile || this.canUserEdit(currentUser, targetUser);
    const canSendPoints = !isOwnProfile && this.canUserSendPoints(currentUser, targetUser);
    const canViewFriends = isOwnProfile || this.canUserViewFriends(currentUser, targetUser);
    const canViewStories = isOwnProfile || this.canUserViewStories(currentUser, targetUser);

    return {
      canEditProfile: canEdit,
      canUploadImages: canEdit && currentUser.userType !== 'guest',
      canChangeTheme: canEdit,
      canChangeEffect: canEdit,
      canUploadMusic: canEdit && currentUser.userType !== 'guest',
      canSendPoints,
      canViewFriends,
      canViewStories,
      canViewLastSeen: true, // يمكن للجميع عرض آخر تواجد
      canViewRoom: true, // يمكن للجميع عرض الغرفة
    };
  }

  /**
   * الحصول على السياق الحالي
   */
  getContext(): ContextState {
    return { ...this.state };
  }

  /**
   * إضافة مستمع للتغييرات
   */
  addListener(listener: (state: ContextState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * إشعار المستمعين بالتغييرات
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.state);
      } catch (error) {
        console.error('خطأ في مستمع السياق:', error);
      }
    });
  }

  /**
   * تنظيف السياق القديم
   */
  private cleanupOldContext(): void {
    const now = Date.now();
    if (now - this.state.lastUpdated > this.CONTEXT_TIMEOUT) {
      this.clearContext();
    }
  }

  /**
   * مسح السياق
   */
  clearContext(): void {
    this.state = {
      currentUser: null,
      targetUser: null,
      isOwnProfile: false,
      canEdit: false,
      canSendPoints: false,
      canViewFriends: false,
      canViewStories: false,
      lastUpdated: Date.now(),
    };
    this.notifyListeners();
  }

  /**
   * تحديث السياق
   */
  refreshContext(): void {
    this.updateContext();
    this.notifyListeners();
  }
}

// تصدير instance واحد فقط
export const contextManager = ContextManager.getInstance();

// تصدير دوال مساعدة للاستخدام المباشر
export const updateCurrentUser = (user: ChatUser | null): void => {
  contextManager.updateCurrentUser(user);
};

export const updateTargetUser = (user: ChatUser | null): void => {
  contextManager.updateTargetUser(user);
};

export const getContext = (): ContextState => {
  return contextManager.getContext();
};

export const getPermissions = (): ContextPermissions => {
  return contextManager.getPermissions();
};

export const addContextListener = (listener: (state: ContextState) => void): (() => void) => {
  return contextManager.addListener(listener);
};

export const clearContext = (): void => {
  contextManager.clearContext();
};
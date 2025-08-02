import { storage } from "./storage";
import { errorHandler, rateLimiter } from "./performance-optimizer";

// مدير النظام المحسّن للمستخدمين
export class EnhancedUserManager {
  private userSessions = new Map<number, UserSession>();
  private userPermissions = new Map<number, UserPermissions>();
  private onlineStatusCache = new Map<number, boolean>();
  private lastActivityCache = new Map<number, number>();
  
  constructor() {
    this.setupPeriodicUpdates();
    this.loadUserPermissions();
  }

  // إعداد التحديثات الدورية
  private setupPeriodicUpdates() {
    // تحديث حالة المستخدمين كل 30 ثانية
    setInterval(async () => {
      await this.updateUsersStatus();
    }, 30000);

    // تنظيف الجلسات المنتهية كل دقيقة
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60000);

    // مزامنة قاعدة البيانات كل 5 دقائق
    setInterval(async () => {
      await this.syncWithDatabase();
    }, 300000);
  }

  // تحميل صلاحيات المستخدمين
  private async loadUserPermissions() {
    try {
      const users = await storage.getAllUsers();
      
      for (const user of users) {
        this.userPermissions.set(user.id, {
          canCreateRooms: user.role === 'owner' || user.role === 'admin',
          canDeleteRooms: user.role === 'owner',
          canKickUsers: user.role === 'owner' || user.role === 'admin',
          canBanUsers: user.role === 'owner' || user.role === 'admin',
          canModerateChat: user.role === 'owner' || user.role === 'admin' || user.role === 'moderator',
          canViewAdminPanel: user.role === 'owner' || user.role === 'admin',
          maxRooms: user.role === 'owner' ? 999 : user.role === 'admin' ? 10 : 3,
          maxMessagesPerMinute: user.role === 'owner' ? 999 : user.role === 'admin' ? 60 : 30
        });
      }

      console.log(`✅ تم تحميل صلاحيات ${users.length} مستخدم`);
    } catch (error) {
      errorHandler.handleError(error as Error, 'loadUserPermissions');
    }
  }

  // تسجيل دخول مستخدم
  async loginUser(userId: number, socketId: string, ip: string): Promise<UserLoginResult> {
    try {
      // فحص الحدود
      const rateLimitCheck = rateLimiter.checkLimit(userId, 'auth');
      if (!rateLimitCheck.allowed) {
        return {
          success: false,
          error: 'تم تجاوز حد محاولات تسجيل الدخول'
        };
      }

      // الحصول على بيانات المستخدم
      const user = await storage.getUser(userId);
      if (!user) {
        return {
          success: false,
          error: 'المستخدم غير موجود'
        };
      }

      // إنشاء جلسة جديدة
      const session: UserSession = {
        userId: userId,
        socketId: socketId,
        ip: ip,
        loginTime: Date.now(),
        lastActivity: Date.now(),
        isActive: true,
        permissions: this.userPermissions.get(userId) || this.getDefaultPermissions()
      };

      this.userSessions.set(userId, session);
      this.onlineStatusCache.set(userId, true);
      this.lastActivityCache.set(userId, Date.now());

      // تحديث قاعدة البيانات
      await storage.setUserOnlineStatus(userId, true);
      await storage.updateUserActivity(userId);

      console.log(`✅ تسجيل دخول ناجح: ${user.username} (${userId})`);

      return {
        success: true,
        user: user,
        session: session
      };

    } catch (error) {
      errorHandler.handleError(error as Error, 'loginUser');
      return {
        success: false,
        error: 'خطأ في تسجيل الدخول'
      };
    }
  }

  // تسجيل خروج مستخدم
  async logoutUser(userId: number): Promise<void> {
    try {
      const session = this.userSessions.get(userId);
      if (session) {
        session.isActive = false;
        this.userSessions.delete(userId);
      }

      this.onlineStatusCache.set(userId, false);
      this.lastActivityCache.set(userId, Date.now());

      // تحديث قاعدة البيانات
      await storage.setUserOnlineStatus(userId, false);
      await storage.updateUserActivity(userId);

      console.log(`🚪 تسجيل خروج: المستخدم ${userId}`);

    } catch (error) {
      errorHandler.handleError(error as Error, 'logoutUser');
    }
  }

  // تحديث نشاط المستخدم
  updateUserActivity(userId: number): void {
    const session = this.userSessions.get(userId);
    if (session) {
      session.lastActivity = Date.now();
      this.lastActivityCache.set(userId, Date.now());
    }
  }

  // التحقق من صلاحية المستخدم
  checkPermission(userId: number, permission: keyof UserPermissions): boolean {
    const permissions = this.userPermissions.get(userId);
    if (!permissions) {
      return false;
    }

    return permissions[permission] as boolean;
  }

  // الحصول على المستخدمين المتصلين
  getOnlineUsers(): UserSession[] {
    return Array.from(this.userSessions.values()).filter(session => session.isActive);
  }

  // الحصول على عدد المستخدمين المتصلين
  getOnlineUserCount(): number {
    return this.getOnlineUsers().length;
  }

  // الحصول على جلسة المستخدم
  getUserSession(userId: number): UserSession | undefined {
    return this.userSessions.get(userId);
  }

  // فحص ما إذا كان المستخدم متصل
  isUserOnline(userId: number): boolean {
    return this.onlineStatusCache.get(userId) || false;
  }

  // الحصول على آخر نشاط للمستخدم
  getLastActivity(userId: number): number | undefined {
    return this.lastActivityCache.get(userId);
  }

  // تحديث حالة المستخدمين
  private async updateUsersStatus(): Promise<void> {
    try {
      const onlineUsers = this.getOnlineUsers();
      const now = Date.now();
      
      // البحث عن المستخدمين غير النشطين
      const inactiveUsers: number[] = [];
      
      for (const session of onlineUsers) {
        const timeSinceActivity = now - session.lastActivity;
        
        // إذا لم يكن نشطاً لأكثر من 5 دقائق
        if (timeSinceActivity > 300000) {
          inactiveUsers.push(session.userId);
        }
      }

      // تسجيل خروج المستخدمين غير النشطين
      for (const userId of inactiveUsers) {
        await this.logoutUser(userId);
      }

      if (inactiveUsers.length > 0) {
        console.log(`🧹 تم تسجيل خروج ${inactiveUsers.length} مستخدم غير نشط`);
      }

    } catch (error) {
      errorHandler.handleError(error as Error, 'updateUsersStatus');
    }
  }

  // تنظيف الجلسات المنتهية
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const expiredSessions: number[] = [];

    for (const [userId, session] of this.userSessions.entries()) {
      // الجلسات المنتهية (أكثر من 24 ساعة)
      if (now - session.loginTime > 86400000) {
        expiredSessions.push(userId);
      }
    }

    for (const userId of expiredSessions) {
      this.userSessions.delete(userId);
      this.onlineStatusCache.delete(userId);
      this.lastActivityCache.delete(userId);
    }

    if (expiredSessions.length > 0) {
      console.log(`🗑️ تم تنظيف ${expiredSessions.length} جلسة منتهية`);
    }
  }

  // مزامنة مع قاعدة البيانات
  private async syncWithDatabase(): Promise<void> {
    try {
      const onlineUsers = this.getOnlineUsers();
      
      // تحديث حالة المستخدمين في قاعدة البيانات
      for (const session of onlineUsers) {
        await storage.setUserOnlineStatus(session.userId, true);
        await storage.updateUserActivity(session.userId);
      }

      console.log(`🔄 تمت مزامنة ${onlineUsers.length} مستخدم مع قاعدة البيانات`);

    } catch (error) {
      errorHandler.handleError(error as Error, 'syncWithDatabase');
    }
  }

  // الحصول على صلاحيات افتراضية
  private getDefaultPermissions(): UserPermissions {
    return {
      canCreateRooms: false,
      canDeleteRooms: false,
      canKickUsers: false,
      canBanUsers: false,
      canModerateChat: false,
      canViewAdminPanel: false,
      maxRooms: 1,
      maxMessagesPerMinute: 20
    };
  }

  // الحصول على إحصائيات المستخدمين
  getUserStats() {
    const onlineUsers = this.getOnlineUsers();
    
    return {
      total: this.userSessions.size,
      online: onlineUsers.length,
      byRole: this.getUsersByRole(onlineUsers),
      avgSessionDuration: this.getAverageSessionDuration(onlineUsers),
      mostActive: this.getMostActiveUsers()
    };
  }

  // الحصول على المستخدمين حسب الدور
  private getUsersByRole(sessions: UserSession[]) {
    const roleCount: Record<string, number> = {};
    
    for (const session of sessions) {
      // الحصول على دور المستخدم من الصلاحيات
      const permissions = session.permissions;
      let role = 'member';
      
      if (permissions.canDeleteRooms) role = 'owner';
      else if (permissions.canKickUsers) role = 'admin';
      else if (permissions.canModerateChat) role = 'moderator';
      
      roleCount[role] = (roleCount[role] || 0) + 1;
    }
    
    return roleCount;
  }

  // الحصول على متوسط مدة الجلسة
  private getAverageSessionDuration(sessions: UserSession[]): number {
    if (sessions.length === 0) return 0;
    
    const now = Date.now();
    const totalDuration = sessions.reduce((sum, session) => {
      return sum + (now - session.loginTime);
    }, 0);
    
    return Math.round(totalDuration / sessions.length / 60000); // بالدقائق
  }

  // الحصول على أكثر المستخدمين نشاطاً
  private getMostActiveUsers(): Array<{userId: number, activityScore: number}> {
    const now = Date.now();
    const activeUsers: Array<{userId: number, activityScore: number}> = [];
    
    for (const [userId, session] of this.userSessions.entries()) {
      if (session.isActive) {
        // نقاط النشاط بناءً على مدة الجلسة والنشاط الأخير
        const sessionDuration = now - session.loginTime;
        const timeSinceActivity = now - session.lastActivity;
        
        const activityScore = Math.max(0, sessionDuration / 60000 - timeSinceActivity / 30000);
        
        activeUsers.push({ userId, activityScore });
      }
    }
    
    return activeUsers
      .sort((a, b) => b.activityScore - a.activityScore)
      .slice(0, 10);
  }

  // تدمير المدير
  destroy(): void {
    this.userSessions.clear();
    this.userPermissions.clear();
    this.onlineStatusCache.clear();
    this.lastActivityCache.clear();
  }
}

// مدير الصلاحيات المتقدم
export class PermissionManager {
  private roleHierarchy = new Map<string, number>([
    ['guest', 0],
    ['member', 1],
    ['moderator', 2],
    ['admin', 3],
    ['owner', 4]
  ]);

  // التحقق من الصلاحية المتقدمة
  hasPermission(userRole: string, requiredRole: string): boolean {
    const userLevel = this.roleHierarchy.get(userRole) || 0;
    const requiredLevel = this.roleHierarchy.get(requiredRole) || 0;
    
    return userLevel >= requiredLevel;
  }

  // التحقق من صلاحية العملية
  canPerformAction(userRole: string, action: string): boolean {
    const actionPermissions: Record<string, string> = {
      'create_room': 'member',
      'delete_room': 'admin',
      'kick_user': 'moderator',
      'ban_user': 'admin',
      'moderate_chat': 'moderator',
      'view_admin_panel': 'admin',
      'manage_users': 'owner'
    };

    const requiredRole = actionPermissions[action];
    if (!requiredRole) return false;

    return this.hasPermission(userRole, requiredRole);
  }

  // الحصول على صلاحيات الدور
  getRolePermissions(role: string): UserPermissions {
    const level = this.roleHierarchy.get(role) || 0;
    
    return {
      canCreateRooms: level >= 1,
      canDeleteRooms: level >= 4,
      canKickUsers: level >= 2,
      canBanUsers: level >= 3,
      canModerateChat: level >= 2,
      canViewAdminPanel: level >= 3,
      maxRooms: level >= 4 ? 999 : level >= 3 ? 10 : level >= 1 ? 3 : 1,
      maxMessagesPerMinute: level >= 4 ? 999 : level >= 3 ? 60 : level >= 2 ? 40 : 30
    };
  }
}

// واجهات النظام
interface UserSession {
  userId: number;
  socketId: string;
  ip: string;
  loginTime: number;
  lastActivity: number;
  isActive: boolean;
  permissions: UserPermissions;
}

interface UserPermissions {
  canCreateRooms: boolean;
  canDeleteRooms: boolean;
  canKickUsers: boolean;
  canBanUsers: boolean;
  canModerateChat: boolean;
  canViewAdminPanel: boolean;
  maxRooms: number;
  maxMessagesPerMinute: number;
}

interface UserLoginResult {
  success: boolean;
  error?: string;
  user?: any;
  session?: UserSession;
}

// إنشاء كائنات عامة
export const enhancedUserManager = new EnhancedUserManager();
export const permissionManager = new PermissionManager();
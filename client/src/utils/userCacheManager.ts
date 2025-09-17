/**
 * نظام إدارة التخزين المؤقت لبيانات المستخدمين
 */

import type { ChatUser } from '@/types/chat';

interface CachedUser {
  id: number;
  username: string;
  userType?: string;
  role?: string;
  profileImage?: string;
  isOnline?: boolean;
  lastSeen?: string | Date | null;
  currentRoom?: string | null;
  lastUpdated: number;
}

class UserCacheManager {
  private static instance: UserCacheManager;
  private memoryCache: Map<number, CachedUser> = new Map();
  private readonly CACHE_KEY = 'user_cache_v2';

  private constructor() {
    this.loadFromLocalStorage();
  }

  static getInstance(): UserCacheManager {
    if (!UserCacheManager.instance) {
      UserCacheManager.instance = new UserCacheManager();
    }
    return UserCacheManager.instance;
  }

  private loadFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem(this.CACHE_KEY);
      if (stored) {
        const data = JSON.parse(stored) as Record<string, CachedUser>;
        Object.entries(data).forEach(([key, user]) => {
          const userId = parseInt(key, 10);
          if (!isNaN(userId) && user && user.username) {
            this.memoryCache.set(userId, user);
          }
        });
      }
    } catch (error) {
      console.error('خطأ في تحميل كاش المستخدمين:', error);
      localStorage.removeItem(this.CACHE_KEY);
    }
  }

  private saveToLocalStorage(): void {
    try {
      const data: Record<string, CachedUser> = {};
      this.memoryCache.forEach((user, id) => {
        data[id.toString()] = user;
      });
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('خطأ في حفظ كاش المستخدمين:', error);
    }
  }

  setUser(user: ChatUser | Partial<ChatUser> & { id: number }): void {
    if (!user.id || !user.username) return;

    const cached: CachedUser = {
      id: user.id,
      username: user.username,
      userType: 'userType' in user ? user.userType : undefined,
      role: 'role' in user ? user.role : undefined,
      profileImage: 'profileImage' in user ? user.profileImage : undefined,
      isOnline: 'isOnline' in user ? user.isOnline : undefined,
      lastSeen: 'lastSeen' in user ? (user as any).lastSeen : undefined,
      currentRoom: 'currentRoom' in user ? (user as any).currentRoom : undefined,
      lastUpdated: Date.now(),
    };

    this.memoryCache.set(user.id, cached);
    this.saveToLocalStorage();
  }

  getUser(userId: number): CachedUser | null {
    return this.memoryCache.get(userId) || null;
  }

  getUsername(userId: number, fallback?: string): string {
    const cached = this.getUser(userId);
    if (cached?.username) {
      return cached.username;
    }
    
    if (fallback && !fallback.includes('#')) {
      this.setUser({ id: userId, username: fallback });
      return fallback;
    }
    
    return `مستخدم #${userId}`;
  }

  getUserWithMerge(userId: number, partialData?: Partial<ChatUser>): ChatUser {
    const cached = this.getUser(userId);
    const base: Partial<CachedUser> = cached || { id: userId, username: `مستخدم #${userId}` };
    
    const merged: ChatUser = {
      id: userId,
      username: partialData?.username || base.username || `مستخدم #${userId}`,
      userType: partialData?.userType || base.userType || 'member',
      role: partialData?.role || base.role || 'member',
      profileImage: partialData?.profileImage || base.profileImage,
      isOnline: partialData?.isOnline ?? base.isOnline ?? false,
      lastSeen: (partialData as any)?.lastSeen ?? (base as any)?.lastSeen ?? null,
      currentRoom: (partialData as any)?.currentRoom ?? (base as any)?.currentRoom ?? null,
    } as ChatUser;

    if (partialData) {
      this.setUser(merged);
    }

    return merged;
  }

  clearCache(): void {
    this.memoryCache.clear();
    localStorage.removeItem(this.CACHE_KEY);
  }
}

export const userCache = UserCacheManager.getInstance();

export const getCachedUsername = (userId: number, fallback?: string): string => {
  return userCache.getUsername(userId, fallback);
};

export const setCachedUser = (user: ChatUser | Partial<ChatUser> & { id: number }): void => {
  userCache.setUser(user);
};

export const getCachedUser = (userId: number): CachedUser | null => {
  return userCache.getUser(userId);
};

export const getCachedUserWithMerge = (userId: number, partialData?: Partial<ChatUser>): ChatUser => {
  return userCache.getUserWithMerge(userId, partialData);
};
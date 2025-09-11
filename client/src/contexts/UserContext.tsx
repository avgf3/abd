import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';

import { useErrorHandler } from '@/hooks/useErrorHandler';
import { api } from '@/lib/queryClient';
import type { ChatUser } from '@/types/chat';

// أنواع الحالة
interface UserState {
  currentUser: ChatUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  lastUpdated: number;
}

// أنواع الإجراءات
type UserAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: ChatUser | null }
  | { type: 'UPDATE_USER'; payload: Partial<ChatUser> }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_AUTHENTICATED'; payload: boolean }
  | { type: 'CLEAR_USER' }
  | { type: 'UPDATE_LAST_SEEN' }
  | { type: 'UPDATE_TIMESTAMP' };

// الحالة الأولية
const initialState: UserState = {
  currentUser: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,
  lastUpdated: 0,
};

// مخفض الحالة
function userReducer(state: UserState, action: UserAction): UserState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_USER':
      return {
        ...state,
        currentUser: action.payload,
        isAuthenticated: !!action.payload,
        error: null,
        lastUpdated: Date.now(),
      };

    case 'UPDATE_USER':
      if (!state.currentUser) return state;
      return {
        ...state,
        currentUser: { ...state.currentUser, ...action.payload },
        lastUpdated: Date.now(),
      };

    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };

    case 'SET_AUTHENTICATED':
      return { ...state, isAuthenticated: action.payload };

    case 'CLEAR_USER':
      return {
        ...initialState,
        lastUpdated: Date.now(),
      };

    case 'UPDATE_LAST_SEEN':
      if (!state.currentUser) return state;
      return {
        ...state,
        currentUser: {
          ...state.currentUser,
          lastSeen: new Date(),
        },
      };

    case 'UPDATE_TIMESTAMP':
      return { ...state, lastUpdated: Date.now() };

    default:
      return state;
  }
}

// إنترفيس المحتوى
interface UserContextType {
  // State
  user: ChatUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  lastUpdated: number;

  // Actions
  setUser: (user: ChatUser | null) => void;
  updateUser: (updates: Partial<ChatUser>) => void;
  clearUser: () => void;
  refreshUser: () => Promise<void>;
  updateProfile: (updates: Partial<ChatUser>) => Promise<void>;
  updateLastSeen: () => void;

  // Utilities
  hasPermission: (requiredRole: ChatUser['userType']) => boolean;
  isCurrentUser: (userId: number) => boolean;
}

// إنشاء المحتوى
const UserContext = createContext<UserContextType | undefined>(undefined);

// مزود المحتوى
export function UserProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(userReducer, initialState);
  const { handleError, handleSuccess } = useErrorHandler();

  // تحديث المستخدم
  const setUser = useCallback((user: ChatUser | null) => {
    dispatch({ type: 'SET_USER', payload: user });
  }, []);

  // تحديث بيانات المستخدم جزئياً
  const updateUser = useCallback((updates: Partial<ChatUser>) => {
    dispatch({ type: 'UPDATE_USER', payload: updates });
  }, []);

  // مسح بيانات المستخدم
  const clearUser = useCallback(() => {
    dispatch({ type: 'CLEAR_USER' });
  }, []);

  // إعادة تحميل بيانات المستخدم من الخادم
  const refreshUser = useCallback(async () => {
    if (!state.currentUser?.id) return;

    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const updatedUser = await api.get<ChatUser>(`/api/users/${state.currentUser.id}`);
      dispatch({ type: 'SET_USER', payload: updatedUser });
    } catch (error) {
      handleError(error as Error, 'فشل في تحديث بيانات المستخدم');
      dispatch({ type: 'SET_ERROR', payload: 'فشل في تحديث البيانات' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.currentUser?.id, handleError]);

  // تحديث الملف الشخصي
  const updateProfile = useCallback(
    async (updates: Partial<ChatUser>) => {
      if (!state.currentUser?.id) {
        throw new Error('المستخدم غير مسجل');
      }

      dispatch({ type: 'SET_LOADING', payload: true });

      try {
        const updatedUser = await api.put<ChatUser>(`/api/users/${state.currentUser.id}`, updates);
        dispatch({ type: 'SET_USER', payload: updatedUser });
        handleSuccess('تم تحديث الملف الشخصي بنجاح');
      } catch (error) {
        handleError(error as Error, 'فشل في تحديث الملف الشخصي');
        throw error;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    [state.currentUser?.id, handleError, handleSuccess]
  );

  // تحديث آخر ظهور
  const updateLastSeen = useCallback(() => {
    dispatch({ type: 'UPDATE_LAST_SEEN' });
  }, []);

  // التحقق من الصلاحيات
  const hasPermission = useCallback(
    (requiredRole: ChatUser['userType']): boolean => {
      if (!state.currentUser) return false;

      const roleHierarchy = {
        guest: 0,
        member: 1,
        moderator: 2,
        admin: 3,
        owner: 4,
      };

      const userLevel = roleHierarchy[state.currentUser.userType] || 0;
      const requiredLevel = roleHierarchy[requiredRole] || 0;

      return userLevel >= requiredLevel;
    },
    [state.currentUser]
  );

  // التحقق من كون المستخدم هو المستخدم الحالي
  const isCurrentUser = useCallback(
    (userId: number): boolean => {
      return state.currentUser?.id === userId;
    },
    [state.currentUser?.id]
  );

  // مؤقّت دقيق لإجبار إعادة التصيير كل دقيقة دون لمس lastSeen
  useEffect(() => {
    if (!state.isAuthenticated) return;

    const interval = setInterval(() => {
      dispatch({ type: 'UPDATE_TIMESTAMP' });
    }, 60000);

    return () => clearInterval(interval);
  }, [state.isAuthenticated]);

  // قيمة المحتوى
  const contextValue: UserContextType = {
    // State
    user: state.currentUser,
    isLoading: state.isLoading,
    isAuthenticated: state.isAuthenticated,
    error: state.error,
    lastUpdated: state.lastUpdated,

    // Actions
    setUser,
    updateUser,
    clearUser,
    refreshUser,
    updateProfile,
    updateLastSeen,

    // Utilities
    hasPermission,
    isCurrentUser,
  };

  return <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>;
}

// Hook لاستخدام المحتوى
export function useUser() {
  const context = useContext(UserContext);

  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }

  return context;
}

// Hook للتحقق من المصادقة
export function useAuth() {
  const { user, isAuthenticated, isLoading } = useUser();

  return {
    user,
    isAuthenticated,
    isLoading,
    isGuest: user?.userType === 'guest',
    isMember: user?.userType === 'member',
    isModerator: user?.userType === 'moderator',
    isAdmin: user?.userType === 'admin',
    isOwner: user?.userType === 'owner',
  };
}

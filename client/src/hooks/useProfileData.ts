import { useState, useEffect, useCallback, useRef } from 'react';
import { apiRequest } from '@/lib/queryClient';
import type { ChatUser } from '@/types/chat';

interface UseProfileDataReturn {
  profileData: ChatUser | null;
  isLoading: boolean;
  error: string | null;
  updateProfile: (updates: Partial<ChatUser>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export function useProfileData(
  user: ChatUser | null,
  currentUser: ChatUser | null
): UseProfileDataReturn {
  const [profileData, setProfileData] = useState<ChatUser | null>(user);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // تحديث البيانات المحلية عند تغيير المستخدم
  useEffect(() => {
    if (user) {
      setProfileData(user);
      setError(null);
    }
  }, [user]);

  // تنظيف الموارد عند إلغاء التحميل
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // جلب البيانات من الخادم
  const refreshProfile = useCallback(async () => {
    if (!profileData?.id) return;

    // إلغاء أي طلب سابق
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/${profileData.id}?t=${Date.now()}`, {
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`فشل في جلب البيانات: ${response.status}`);
      }

      const userData = await response.json();
      setProfileData(userData);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'خطأ في جلب البيانات');
      }
    } finally {
      setIsLoading(false);
    }
  }, [profileData?.id]);

  // تحديث البيانات
  const updateProfile = useCallback(async (updates: Partial<ChatUser>) => {
    if (!profileData?.id || !currentUser) {
      throw new Error('لا يمكن تحديث البيانات');
    }

    // التحقق من الصلاحيات
    if (profileData.id !== currentUser.id) {
      throw new Error('لا يمكنك تعديل هذا الملف الشخصي');
    }

    // إلغاء أي طلب سابق
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    setError(null);

    try {
      // تحديث فوري للواجهة
      const optimisticUpdate = { ...profileData, ...updates };
      setProfileData(optimisticUpdate);

      // إرسال التحديث للخادم
      let response;
      
      if (updates.userTheme) {
        response = await apiRequest('/api/users/update-background-color', {
          method: 'POST',
          body: {
            userId: currentUser.id,
            color: updates.userTheme
          },
          signal: abortControllerRef.current.signal
        });
      } else if (updates.profileEffect) {
        response = await apiRequest(`/api/users/${profileData.id}`, {
          method: 'PUT',
          body: updates,
          signal: abortControllerRef.current.signal
        });
      } else {
        response = await apiRequest('/api/users/update-profile', {
          method: 'POST',
          body: {
            userId: currentUser.id,
            ...updates
          },
          signal: abortControllerRef.current.signal
        });
      }

      if (!response.success && !response.id) {
        throw new Error(response.error || 'فشل في التحديث');
      }

      // جلب البيانات المحدثة من الخادم للتأكد
      await refreshProfile();

    } catch (err: any) {
      if (err.name !== 'AbortError') {
        // إرجاع البيانات للحالة السابقة في حالة الخطأ
        setProfileData(profileData);
        setError(err.message || 'خطأ في التحديث');
        throw err;
      }
    } finally {
      setIsLoading(false);
    }
  }, [profileData, currentUser, refreshProfile]);

  return {
    profileData,
    isLoading,
    error,
    updateProfile,
    refreshProfile
  };
}
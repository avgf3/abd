import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { apiRequest } from '@/lib/queryClient';
import type { ChatRoom } from '@/types/chat';
import { mapApiRooms, dedupeRooms, mapApiRoom } from '@/utils/roomUtils';

interface UseRoomManagerOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  cacheTimeout?: number;
  maxCachedRooms?: number;
}

interface RoomCache {
  data: ChatRoom[];
  timestamp: number;
  version: number;
}

interface RoomStats {
  totalRooms: number;
  activeRooms: number;
  broadcastRooms: number;
  totalUsers: number;
  lastUpdate: Date;
}

// 🚀 إدارة موحدة للغرف مع منع التكرار والتحسين الشامل
export function useRoomManager(options: UseRoomManagerOptions = {}) {
  const {
    autoRefresh = false,
    refreshInterval = 30000, // 30 seconds
    cacheTimeout = 5 * 60 * 1000, // 5 minutes
    maxCachedRooms = 100
  } = options;

  // الحالات الأساسية
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // الذاكرة المؤقتة والمراجع لمنع التكرار
  const cacheRef = useRef<RoomCache | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchingRef = useRef<boolean>(false); // 🔒 منع الطلبات المتعددة
  const lastFetchTimeRef = useRef<number>(0); // تتبع وقت آخر طلب

  // 🧹 تنظيف الذاكرة عند إلغاء التحميل
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // 📊 إحصائيات الغرف المحسوبة
  const roomStats = useMemo((): RoomStats => {
    const totalRooms = rooms.length;
    const activeRooms = rooms.filter(room => (room.userCount || 0) > 0).length;
    const broadcastRooms = rooms.filter(room => room.isBroadcast).length;
    const totalUsers = rooms.reduce((sum, room) => sum + (room.userCount || 0), 0);

    return {
      totalRooms,
      activeRooms,
      broadcastRooms,
      totalUsers,
      lastUpdate: lastUpdate || new Date()
    };
  }, [rooms, lastUpdate]);

  // ✅ التحقق من صحة الذاكرة المؤقتة
  const isCacheValid = useCallback(() => {
    if (!cacheRef.current) return false;
    const now = Date.now();
    return (now - cacheRef.current.timestamp) < cacheTimeout;
  }, [cacheTimeout]);

  // 🚀 جلب الغرف من API مع منع التكرار الكامل
  const fetchRooms = useCallback(async (force: boolean = false): Promise<ChatRoom[]> => {
    const now = Date.now();
    
    // 🚫 منع الطلبات المتكررة (أقل من ثانية واحدة)
    if (!force && (now - lastFetchTimeRef.current) < 1000) {
      return rooms;
    }

    // 🚫 منع الطلبات المتعددة المتزامنة
    if (fetchingRef.current && !force) {
      return rooms;
    }

    // 💾 استخدام الذاكرة المؤقتة إذا كانت صالحة وليس إجبارياً
    if (!force && isCacheValid() && cacheRef.current) {
      setRooms(cacheRef.current.data);
      return cacheRef.current.data;
    }

    // 🔄 إلغاء الطلب السابق إذا كان قيد التنفيذ
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 🆕 إنشاء controller جديد
    abortControllerRef.current = new AbortController();
    fetchingRef.current = true;
    lastFetchTimeRef.current = now;

    try {
      setLoading(true);
      setError(null);

      const response = await apiRequest('/api/rooms', {
        method: 'GET',
        signal: abortControllerRef.current.signal
      });

      if (!response?.rooms || !Array.isArray(response.rooms)) {
        throw new Error('استجابة غير صالحة من الخادم');
      }

      // 🔧 استخدام أدوات المساعدة: تحويل + إزالة التكرار + ترتيب
      const mappedRooms: ChatRoom[] = mapApiRooms(response.rooms);
      const uniqueRooms = dedupeRooms(mappedRooms);

      // 💾 تحديث الذاكرة المؤقتة
      cacheRef.current = {
        data: uniqueRooms,
        timestamp: Date.now(),
        version: (cacheRef.current?.version || 0) + 1
      };

      // 📏 تحديد حجم الذاكرة المؤقتة
      if (uniqueRooms.length > maxCachedRooms) {
        cacheRef.current.data = uniqueRooms.slice(0, maxCachedRooms);
        console.warn(`⚠️ تم تحديد الغرف المحفوظة إلى ${maxCachedRooms} غرفة`);
      }

      setRooms(cacheRef.current.data);
      setLastUpdate(new Date());
      setError(null);

      return cacheRef.current.data;

    } catch (err: any) {
      if (err.name === 'AbortError') {
        return rooms; // إرجاع الغرف الحالية
      }

      console.error('❌ خطأ في جلب الغرف:', err);
      const errorMessage = err.message || 'خطأ في جلب الغرف';
      setError(errorMessage);

      // 💾 استخدام الذاكرة المؤقتة في حالة الخطأ إذا كانت متوفرة
      if (cacheRef.current) {
        setRooms(cacheRef.current.data);
        return cacheRef.current.data;
      }

      return [];
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
      fetchingRef.current = false;
    }
  }, [isCacheValid, maxCachedRooms, rooms]);

  // ➕ إضافة غرفة جديدة مع التحسينات
  const addRoom = useCallback(async (roomData: {
    name: string;
    description: string;
    image: File | null;
    isBroadcast?: boolean;
  }, userId?: number): Promise<ChatRoom | null> => {
    try {
      setLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append('name', roomData.name.trim());
      formData.append('description', roomData.description.trim());
      formData.append('isBroadcast', roomData.isBroadcast ? 'true' : 'false');
      if (userId != null) {
        formData.append('userId', String(userId));
      }

      if (roomData.image) {
        formData.append('image', roomData.image);
      }

      const data = await apiRequest('/api/rooms', {
        method: 'POST',
        body: formData
      });
      const newRoom: ChatRoom = mapApiRoom(data.room);

      // 🔄 تحديث الحالة المحلية مع إزالة التكرار
      setRooms(prev => {
        const updatedRooms = dedupeRooms([newRoom, ...prev]);
        
        // تحديث الذاكرة المؤقتة
        if (cacheRef.current) {
          cacheRef.current.data = updatedRooms;
          cacheRef.current.timestamp = Date.now();
          cacheRef.current.version += 1;
        }
        
        return updatedRooms;
      });

      setLastUpdate(new Date());
      return newRoom;

    } catch (err: any) {
      console.error('❌ خطأ في إنشاء الغرفة:', err);
      setError(err.message || 'فشل في إنشاء الغرفة');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ❌ حذف غرفة مع التحسينات
  const deleteRoom = useCallback(async (roomId: string, userId: number): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiRequest(`/api/rooms/${roomId}`, {
        method: 'DELETE',
        body: { userId }
      });

      if (!response) {
        throw new Error('فشل في حذف الغرفة');
      }

      // 🔄 تحديث الحالة المحلية
      setRooms(prev => {
        const updatedRooms = prev.filter(room => room.id !== roomId);
        
        // تحديث الذاكرة المؤقتة
        if (cacheRef.current) {
          cacheRef.current.data = updatedRooms;
          cacheRef.current.timestamp = Date.now();
          cacheRef.current.version += 1;
        }
        
        return updatedRooms;
      });

      setLastUpdate(new Date());
      return true;

    } catch (err: any) {
      console.error('❌ خطأ في حذف الغرفة:', err);
      setError(err.message || 'فشل في حذف الغرفة');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // 🔢 تحديث عدد المستخدمين في غرفة
  const updateRoomUserCount = useCallback((roomId: string, userCount: number) => {
    setRooms(prev => {
      const updatedRooms = prev.map(room => 
        room.id === roomId 
          ? { ...room, userCount: Math.max(0, userCount) }
          : room
      );

      // تحديث الذاكرة المؤقتة
      if (cacheRef.current) {
        cacheRef.current.data = updatedRooms;
        cacheRef.current.timestamp = Date.now();
      }

      return updatedRooms;
    });
  }, []);

  // 🔍 البحث في الغرف
  const searchRooms = useCallback((query: string): ChatRoom[] => {
    if (!query.trim()) return rooms;

    const lowercaseQuery = query.toLowerCase();
    return rooms.filter(room =>
      room.name.toLowerCase().includes(lowercaseQuery) ||
      room.description?.toLowerCase().includes(lowercaseQuery)
    );
  }, [rooms]);

  // 🎛️ فلترة الغرف
  const filterRooms = useCallback((filters: {
    showBroadcast?: boolean;
    showEmpty?: boolean;
    isActive?: boolean;
  }): ChatRoom[] => {
    return rooms.filter(room => {
      if (filters.showBroadcast !== undefined && room.isBroadcast !== filters.showBroadcast) {
        return false;
      }
      if (filters.showEmpty === false && (room.userCount || 0) === 0) {
        return false;
      }
      if (filters.isActive !== undefined && room.isActive !== filters.isActive) {
        return false;
      }
      return true;
    });
  }, [rooms]);

  // 🔄 تحديث تلقائي محسن
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return;

    const scheduleRefresh = () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      refreshTimeoutRef.current = setTimeout(() => {
        // تحديث فقط إذا لم يكن هناك طلب قيد التنفيذ وبعد توفر التوكن
        if (!fetchingRef.current) {
          try {
            const token = localStorage.getItem('auth_token');
            if (token) {
              fetchRooms(false).then(() => {
                scheduleRefresh(); // جدولة التحديث التالي
              });
            } else {
              scheduleRefresh();
            }
          } catch {
            scheduleRefresh();
          }
        } else {
          scheduleRefresh(); // إعادة المحاولة لاحقاً
        }
      }, refreshInterval);
    };

    scheduleRefresh();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, fetchRooms]);

  // 🧹 مسح الذاكرة المؤقتة
  const clearCache = useCallback(() => {
    cacheRef.current = null;
    lastFetchTimeRef.current = 0;
  }, []);

  // 📊 الحصول على إحصائيات الذاكرة المؤقتة
  const getCacheStats = useCallback(() => {
    if (!cacheRef.current) {
      return {
        hasCache: false,
        cacheSize: 0,
        cacheAge: 0,
        version: 0
      };
    }

    return {
      hasCache: true,
      cacheSize: cacheRef.current.data.length,
      cacheAge: Date.now() - cacheRef.current.timestamp,
      version: cacheRef.current.version,
      isValid: isCacheValid()
    };
  }, [isCacheValid]);

  // 🚀 التحديث الأولي المحسن
  useEffect(() => {
    // تحميل فقط إذا لم تكن هناك غرف محملة وبعد توفر التوكن
    if (rooms.length === 0) {
      try {
        const token = localStorage.getItem('auth_token');
        if (token) {
          fetchRooms(false);
        }
      } catch {}
    }
  }, []); // التشغيل مرة واحدة فقط

  return {
    // 📊 البيانات
    rooms,
    loading,
    error,
    lastUpdate,
    roomStats,

    // 🔧 الوظائف الأساسية
    fetchRooms,
    addRoom,
    deleteRoom,
    updateRoomUserCount,
    searchRooms,
    filterRooms,
    clearCache,
    getCacheStats,

    // 📈 الحالات المحسوبة
    hasRooms: rooms.length > 0,
    isEmpty: rooms.length === 0 && !loading,
    isRefreshing: loading && rooms.length > 0,
    
    // 🚫 منع التكرار
    isFetching: fetchingRef.current
  };
}
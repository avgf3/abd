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

  // الذاكرة المؤقتة والمراجع
  const cacheRef = useRef<RoomCache | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchingRef = useRef<boolean>(false); // منع الطلبات المتعددة

  // تنظيف الذاكرة عند إلغاء التحميل
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

  // إحصائيات الغرف المحسوبة
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

  // التحقق من صحة الذاكرة المؤقتة
  const isCacheValid = useCallback(() => {
    if (!cacheRef.current) return false;
    const now = Date.now();
    return (now - cacheRef.current.timestamp) < cacheTimeout;
  }, [cacheTimeout]);

  // جلب الغرف من API مع منع التكرار
  const fetchRooms = useCallback(async (force: boolean = false): Promise<ChatRoom[]> => {
    // منع الطلبات المتعددة المتزامنة
    if (fetchingRef.current && !force) {
      console.log('⚠️ طلب جلب الغرف قيد التنفيذ بالفعل');
      return rooms;
    }

    // استخدام الذاكرة المؤقتة إذا كانت صالحة وليس إجبارياً
    if (!force && isCacheValid() && cacheRef.current) {
      console.log('✅ استخدام الذاكرة المؤقتة للغرف');
      return cacheRef.current.data;
    }

    // إلغاء الطلب السابق إذا كان قيد التنفيذ
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // إنشاء controller جديد
    abortControllerRef.current = new AbortController();
    fetchingRef.current = true;

    try {
      setLoading(true);
      setError(null);

      console.log('🔄 جلب الغرف من API...');
      const response = await apiRequest('/api/rooms', {
        method: 'GET',
        signal: abortControllerRef.current.signal
      });

      if (!response?.rooms || !Array.isArray(response.rooms)) {
        throw new Error('استجابة غير صالحة من الخادم');
      }

      // استخدام أدوات المساعدة: تحويل + إزالة التكرار + ترتيب
      const mappedRooms: ChatRoom[] = mapApiRooms(response.rooms);

      // تحديث الذاكرة المؤقتة
      cacheRef.current = {
        data: mappedRooms,
        timestamp: Date.now(),
        version: (cacheRef.current?.version || 0) + 1
      };

      // تحديد حجم الذاكرة المؤقتة
      if (mappedRooms.length > maxCachedRooms) {
        cacheRef.current.data = mappedRooms.slice(0, maxCachedRooms);
        console.warn(`⚠️ تم تحديد الغرف المحفوظة إلى ${maxCachedRooms} غرفة`);
      }

      setRooms(cacheRef.current.data);
      setLastUpdate(new Date());
      setError(null);

      console.log(`✅ تم جلب ${cacheRef.current.data.length} غرفة بنجاح`);
      return cacheRef.current.data;

    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('⚠️ تم إلغاء طلب جلب الغرف');
        return rooms; // إرجاع الغرف الحالية
      }

      console.error('❌ خطأ في جلب الغرف:', err);
      const errorMessage = err.message || 'خطأ في جلب الغرف';
      setError(errorMessage);

      // استخدام الذاكرة المؤقتة في حالة الخطأ إذا كانت متوفرة
      if (cacheRef.current) {
        console.log('⚠️ استخدام الذاكرة المؤقتة بسبب الخطأ');
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

  // إضافة غرفة جديدة
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

      const response = await fetch('/api/rooms', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'فشل في إنشاء الغرفة');
      }

      const data = await response.json();
      const newRoom: ChatRoom = mapApiRoom(data.room);

      // تحديث الحالة المحلية مع إزالة التكرار
      setRooms(prev => dedupeRooms([newRoom, ...prev]));

      // تحديث الذاكرة المؤقتة
      if (cacheRef.current) {
        cacheRef.current.data = dedupeRooms([newRoom, ...cacheRef.current.data]);
        cacheRef.current.timestamp = Date.now();
        cacheRef.current.version += 1;
      }

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

  // حذف غرفة
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

      // تحديث الحالة المحلية
      setRooms(prev => prev.filter(room => room.id !== roomId));

      // تحديث الذاكرة المؤقتة
      if (cacheRef.current) {
        cacheRef.current.data = cacheRef.current.data.filter(room => room.id !== roomId);
        cacheRef.current.timestamp = Date.now();
        cacheRef.current.version += 1;
      }

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

  // تحديث عدد المستخدمين في غرفة
  const updateRoomUserCount = useCallback((roomId: string, userCount: number) => {
    setRooms(prev => prev.map(room => 
      room.id === roomId 
        ? { ...room, userCount: Math.max(0, userCount) }
        : room
    ));

    // تحديث الذاكرة المؤقتة
    if (cacheRef.current) {
      cacheRef.current.data = cacheRef.current.data.map(room => 
        room.id === roomId 
          ? { ...room, userCount: Math.max(0, userCount) }
          : room
      );
    }
  }, []);

  // البحث في الغرف
  const searchRooms = useCallback((query: string): ChatRoom[] => {
    if (!query.trim()) return rooms;

    const lowercaseQuery = query.toLowerCase();
    return rooms.filter(room =>
      room.name.toLowerCase().includes(lowercaseQuery) ||
      room.description?.toLowerCase().includes(lowercaseQuery)
    );
  }, [rooms]);

  // فلترة الغرف
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

  // تحديث تلقائي
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return;

    const scheduleRefresh = () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      refreshTimeoutRef.current = setTimeout(() => {
        fetchRooms(false).then(() => {
          scheduleRefresh(); // جدولة التحديث التالي
        });
      }, refreshInterval);
    };

    scheduleRefresh();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, fetchRooms]);

  // مسح الذاكرة المؤقتة
  const clearCache = useCallback(() => {
    cacheRef.current = null;
    }, []);

  // الحصول على إحصائيات الذاكرة المؤقتة
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

  // التحديث الأولي
  useEffect(() => {
    fetchRooms(false);
  }, [fetchRooms]);

  return {
    // البيانات
    rooms,
    loading,
    error,
    lastUpdate,
    roomStats,

    // الوظائف
    fetchRooms,
    addRoom,
    deleteRoom,
    updateRoomUserCount,
    searchRooms,
    filterRooms,
    clearCache,
    getCacheStats,

    // الحالات المحسوبة
    hasRooms: rooms.length > 0,
    isEmpty: rooms.length === 0 && !loading,
    isRefreshing: loading && rooms.length > 0
  };
}
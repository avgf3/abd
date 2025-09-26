import { X } from 'lucide-react';
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';

import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import PointsSentNotification from '@/components/ui/PointsSentNotification';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, api } from '@/lib/queryClient';
import { getAudioCompressionTips, canCompressAudio, formatFileSize } from '@/lib/uploadConfig';
import type { ChatUser } from '@/types/chat';
import { getProfileImageSrc, getBannerImageSrc } from '@/utils/imageUtils';
import { formatPoints, getLevelInfo } from '@/utils/pointsUtils';
import {
  getEffectColor,
  getFinalUsernameColor,
  buildProfileBackgroundGradient,
} from '@/utils/themeUtils';
import { getCountryFlag } from '@/utils';
import { getUserLevelIcon } from '@/components/chat/UserRoleBadge';
import CountryFlag from '@/components/ui/CountryFlag';
import ProfileImage from './ProfileImage';
import { useStories } from '@/hooks/useStories';
import { useRoomManager } from '@/hooks/useRoomManager';
import { getSocket } from '@/lib/socket';

interface ProfileModalProps {
  user: ChatUser | null;
  currentUser: ChatUser | null;
  onClose: () => void;
  onUpdate?: (user: ChatUser) => void;
  onUserClick?: (user: ChatUser) => void;
  // عند التفعيل: يتم إدارة الصوت خارجياً من ChatInterface
  externalAudioManaged?: boolean;
}

export default function ProfileModal({
  user,
  currentUser,
  onClose,
  onUpdate,
  onUserClick,
  externalAudioManaged,
}: ProfileModalProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const musicFileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentEditType, setCurrentEditType] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  
  // معرف فريد لكل مستخدم لضمان عدم التضارب
  const currentUserId = user?.id ?? null;
  const prevUserIdRef = useRef<number | null>(null);

  // حالة محلية للمستخدم - تُحدث فوراً عند تغيير المستخدم
  const [localUser, setLocalUser] = useState<ChatUser | null>(user);
  
  // حالات الألوان والتأثيرات - مربوطة مباشرة بـ localUser
  const [selectedTheme, setSelectedTheme] = useState('');
  const [selectedEffect, setSelectedEffect] = useState('none');
  
  // تحديث فوري وقبل الرسم عند تغيير المستخدم لمنع وميض بيانات المستخدم السابق
  useLayoutEffect(() => {
    // إذا تغير المستخدم، نظف كل شيء فوراً
    if (currentUserId !== prevUserIdRef.current) {
      prevUserIdRef.current = currentUserId;
      
      if (user) {
        // تحديث فوري لجميع الحالات
        setLocalUser(user);
        setSelectedTheme(user.profileBackgroundColor || '');
        setSelectedEffect(user.profileEffect || 'none');
        setEditValue('');
        setCurrentEditType(null);
        setMusicTitle(user.profileMusicTitle || '');
        setMusicEnabled(user.profileMusicEnabled ?? true);
        setMusicVolume(typeof user.profileMusicVolume === 'number' ? user.profileMusicVolume : 70);
        setAudioError(false);
        setAudioLoading(false);
        setIsPlaying(false);
        
        // إيقاف الموسيقى القديمة فوراً
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          audioRef.current.src = '';
        }
      } else {
        // تنظيف كامل عند الإغلاق
        setLocalUser(null);
        setSelectedTheme('');
        setSelectedEffect('none');
        setEditValue('');
        setCurrentEditType(null);
        setMusicTitle('');
        setMusicEnabled(true);
        setMusicVolume(70);
        setAudioError(false);
        setAudioLoading(false);
        setIsPlaying(false);
        
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          audioRef.current.src = '';
        }
      }
    } else if (user && localUser) {
      // تحديث البيانات فقط إذا كان نفس المستخدم
      setLocalUser(prev => {
        if (!prev || prev.id !== user.id) return user;
        return {
          ...prev,
          ...user,
          lastSeen: pickLatestValidDate(prev.lastSeen as any, user.lastSeen as any),
          isOnline: typeof user.isOnline !== 'undefined' ? user.isOnline : prev.isOnline,
          currentRoom: (user as any).hasOwnProperty('currentRoom') ? (user as any).currentRoom : prev.currentRoom,
        };
      });
    }
  }, [user, currentUserId]);

  // Helper: return the most recent valid date between two values
  const pickLatestValidDate = (
    a?: string | Date | null,
    b?: string | Date | null
  ): Date | null => {
    const toDate = (v: any): Date | null => {
      if (!v) return null;
      const d = v instanceof Date ? v : new Date(v);
      return isNaN(d.getTime()) ? null : d;
    };
    const da = toDate(a);
    const db = toDate(b);
    if (da && db) return da.getTime() >= db.getTime() ? da : db;
    return da || db || null;
  };

  // توحيد لون خلفية الملف الشخصي للأعضاء والزوار ليطابق لون البوت فقط داخل نافذة البروفايل
  const isMemberOrGuest =
    (localUser?.userType === 'member' || localUser?.userType === 'guest');
  const forcedBotColor = '#2a2a2a';
  const resolvedProfileColorForCard = isMemberOrGuest
    ? forcedBotColor
    : (selectedTheme || localUser?.profileBackgroundColor || '');
  const computedCardGradient =
    buildProfileBackgroundGradient(resolvedProfileColorForCard) ||
    'linear-gradient(135deg, #1a1a1a, #2d2d2d)';

  // متغيرات نظام إرسال النقاط
  const [sendingPoints, setSendingPoints] = useState(false);
  const [pointsToSend, setPointsToSend] = useState('');
  const [pointsSentNotification, setPointsSentNotification] = useState<{
    show: boolean;
    points: number;
    recipientName: string;
  }>({ show: false, points: 0, recipientName: '' });

  // موسيقى البروفايل
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [musicTitle, setMusicTitle] = useState('');

  // قائمة الأصدقاء
  const [friends, setFriends] = useState<ChatUser[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [musicVolume, setMusicVolume] = useState<number>(70);
  const [audioError, setAudioError] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // حالة التبويبات
  const [activeTab, setActiveTab] = useState<'info' | 'options' | 'other'>('info');

  // ===== آخر تواجد + اسم الغرفة =====
  const { rooms, fetchRooms } = useRoomManager({ autoRefresh: false });
  useEffect(() => {
    // جلب مرة واحدة فقط عند فتح البروفايل لتفادي التذبذب
    fetchRooms(false).catch(() => {});
    // لا نعتمد على currentRoom لتكرار الجلب
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchRooms]);

  // تم حذف formatAmPmTime لأنها غير مستخدمة

  // الاعتماد على currentRoom فقط كمصدر للحقيقة
  const resolvedRoomId = (localUser as any)?.currentRoom || null;
  let resolvedRoomName = '';
  
  // تحسين البحث عن اسم الغرفة مع معالجة أفضل للحالات الفارغة
  if (resolvedRoomId) {
    const found = rooms.find((r) => String((r as any).id) === String(resolvedRoomId));
    if (found && (found as any).name) {
      resolvedRoomName = (found as any).name;
    } else {
      // لا نعرض اسمًا مؤقتًا لتفادي الانعكاسات؛ نترك الحقل فارغًا لحين الجلب
      resolvedRoomName = '';
    }
  }
  
  // دالة تنسيق آخر تواجد مع معالجة أفضل للأخطاء
  const formatLastSeenWithRoom = (lastSeen?: string | Date | null, roomName?: string): string => {
    if (!lastSeen) return '';
    
    try {
      const lastSeenDate = lastSeen instanceof Date ? lastSeen : new Date(lastSeen);
      
      if (isNaN(lastSeenDate.getTime())) {
        return '';
      }
      
      const now = new Date();
      const isToday = lastSeenDate.toDateString() === now.toDateString();
      
      const timeString = lastSeenDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      let formattedTime: string;
      
      if (isToday) {
        // نفس اليوم: الوقت فقط
        formattedTime = timeString;
      } else {
        // أكثر من يوم: التاريخ + الوقت
        const dateString = lastSeenDate.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit'
        });
        formattedTime = `${dateString} ${timeString}`;
      }
      
      const finalRoomName = roomName || resolvedRoomName;
      return finalRoomName && finalRoomName.trim() !== ''
        ? `${formattedTime} / غرفة║${finalRoomName}`
        : `${formattedTime}`;
      
    } catch (error) {
      return '';
    }
  };
  
  const formattedLastSeen = formatLastSeenWithRoom(localUser?.lastSeen, resolvedRoomName);
  // تحديث حي لنص "آخر تواجد" كل 30 ثانية لعرض أكثر دقة
  const [, forceRerenderTick] = useState(0);
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      forceRerenderTick((t) => (t + 1) % 1000);
    }, 30000); // تحديث كل 30 ثانية بدلاً من 60 ثانية
    return () => clearInterval(intervalId);
  }, []);

  // الاشتراك في أحداث السوكِت لتحديث آخر تواجد للمستخدمين الآخرين أيضاً
  useEffect(() => {
    const socket = getSocket();
    const handleUserConnected = (payload: any) => {
      const incoming = payload?.user || payload;
      if (!incoming?.id || incoming.id !== localUser?.id) return;
      setLocalUser((prev) => {
        if (!prev) return prev;
        const next: any = { ...prev, isOnline: true };
        if (Object.prototype.hasOwnProperty.call(incoming, 'currentRoom')) {
          next.currentRoom = incoming.currentRoom;
        }
        return next;
      });
    };
    const handleUserDisconnected = (payload: any) => {
      const uid = payload?.userId || payload?.id;
      if (!uid || uid !== localUser?.id) return;
      setLocalUser((prev) => (prev ? ({ ...prev, isOnline: false } as any) : prev));
      // جلب من السيرفر للحصول على lastSeen المحدث بعد الانفصال
      fetchAndUpdateUser(uid).catch(() => {});
    };

    // الاستماع لتحديثات userUpdated لتحديث جميع البيانات فورياً في نافذة البروفايل
    const handleUserUpdated = (payload: any) => {
      try {
        const u = payload?.user || payload;
        if (!u?.id || u.id !== localUser?.id) return;
        setLocalUser((prev) => {
          if (!prev) return prev;
          const next: any = { ...prev };
          
          // تحديث جميع البيانات المهمة مع التحقق من صحة البيانات
          next.lastSeen = pickLatestValidDate(prev.lastSeen as any, (u as any).lastSeen as any) || prev.lastSeen || null;
          if (Object.prototype.hasOwnProperty.call(u, 'currentRoom')) next.currentRoom = u.currentRoom;
          if (typeof u.isOnline !== 'undefined') next.isOnline = u.isOnline;
          
          // تحديث بيانات الملف الشخصي
          if (u.profileImage) next.profileImage = u.profileImage;
          if (u.profileBanner) next.profileBanner = u.profileBanner;
          if (u.username) next.username = u.username;
          if (u.usernameColor) next.usernameColor = u.usernameColor;
          if (u.profileBackgroundColor) next.profileBackgroundColor = u.profileBackgroundColor;
          if (u.profileEffect) next.profileEffect = u.profileEffect;
          
          // تحديث بيانات الموسيقى
          if (u.profileMusicUrl) next.profileMusicUrl = u.profileMusicUrl;
          if (u.profileMusicTitle) next.profileMusicTitle = u.profileMusicTitle;
          if (typeof u.profileMusicEnabled !== 'undefined') next.profileMusicEnabled = u.profileMusicEnabled;
          if (typeof u.profileMusicVolume !== 'undefined') next.profileMusicVolume = u.profileMusicVolume;
          
          // تحديث بيانات المستخدم الأساسية
          if (u.points !== undefined) next.points = u.points;
          if (u.level !== undefined) next.level = u.level;
          if (u.userType) next.userType = u.userType;
          
          return next;
        });
      } catch {}
    };

    socket.on('userConnected', handleUserConnected);
    socket.on('userDisconnected', handleUserDisconnected);
    socket.on('message', handleUserUpdated);
    return () => {
      socket.off('userConnected', handleUserConnected);
      socket.off('userDisconnected', handleUserDisconnected);
      socket.off('message', handleUserUpdated);
    };
  }, [localUser?.id]);
  const canShowLastSeen = (((localUser as any)?.privacy?.showLastSeen ?? (localUser as any)?.showLastSeen) ?? true) !== false;
  
  // ضبط مستوى الصوت عند تحميل الصوت
  useEffect(() => {
    if (audioRef.current && localUser?.profileMusicUrl) {
      audioRef.current.volume = Math.max(0, Math.min(1, musicVolume / 100));
    }
  }, [musicVolume, localUser?.profileMusicUrl]);
  
  // تشغيل الموسيقى تلقائياً عند فتح البروفايل (معطّل إذا كانت مُدارة خارجياً)
  useEffect(() => {
    if (externalAudioManaged) return;
    if ((currentUser as any)?.globalSoundEnabled === false) return;
    if (localUser?.profileMusicUrl && musicEnabled && audioRef.current) {
      let attempts = 0;
      const maxAttempts = 3;
      
      // محاولة التشغيل التلقائي مع إعادة المحاولة
      const playAudio = async () => {
        if (!audioRef.current || attempts >= maxAttempts) return;
        
        try {
          attempts++;
          setAudioLoading(true);
          setAudioError(false);
          
          // ضبط مستوى الصوت
          audioRef.current.volume = Math.max(0, Math.min(1, musicVolume / 100));
          
          // محاولة التشغيل العادي أولاً
          await audioRef.current.play();
          setIsPlaying(true);
          } catch (err: any) {
          // إذا فشلت المحاولة الأولى، نحاول مع الصوت المكتوم
          if (attempts === 1 && audioRef.current) {
            try {
              audioRef.current.muted = true;
              await audioRef.current.play();
              // بعد التشغيل، نرفع الكتم تدريجياً
              setTimeout(() => {
                if (audioRef.current) {
                  audioRef.current.muted = false;
                }
              }, 100);
              setIsPlaying(true);
              } catch (mutedErr) {
              // إعادة المحاولة بعد تأخير
              setTimeout(playAudio, 1000);
            }
          } else if (attempts < maxAttempts) {
            // إعادة المحاولة بعد تأخير أطول
            setTimeout(playAudio, 1500);
          } else {
            // بعد فشل كل المحاولات، ننتظر تفاعل المستخدم
            // إضافة مستمع للنقر لمحاولة التشغيل عند أول تفاعل
            const handleUserInteraction = async () => {
              if (audioRef.current && audioRef.current.paused) {
                try {
                  await audioRef.current.play();
                  setIsPlaying(true);
                  } catch {}
              }
              // إزالة المستمع بعد أول تفاعل
              document.removeEventListener('click', handleUserInteraction);
              document.removeEventListener('touchstart', handleUserInteraction);
            };
            
            document.addEventListener('click', handleUserInteraction, { once: true });
            document.addEventListener('touchstart', handleUserInteraction, { once: true });
          }
        } finally {
          setAudioLoading(false);
        }
      };
      
      // تأخير بسيط للسماح بتحميل الصوت
      const timer = setTimeout(playAudio, 300);
      
      return () => {
        clearTimeout(timer);
        // تنظيف المستمعات عند إلغاء المكون
        document.removeEventListener('click', playAudio);
        document.removeEventListener('touchstart', playAudio);
      };
    }
  }, [localUser?.profileMusicUrl, musicEnabled, musicVolume, externalAudioManaged, (currentUser as any)?.globalSoundEnabled]);
  
  // معالج أخطاء الصوت
  const handleAudioError = () => {
    setAudioError(true);
    setAudioLoading(false);
    setIsPlaying(false);
    console.error('خطأ في تحميل ملف الصوت');
  };
  
  // معالج تحميل الصوت
  const handleAudioLoadStart = () => {
    setAudioLoading(true);
    setAudioError(false);
  };
  
  const handleAudioCanPlay = () => {
    setAudioLoading(false);
    setAudioError(false);
  };
  
  // معالج تشغيل/إيقاف الصوت
  const handleAudioPlayPause = async () => {
    if (!audioRef.current) return;
    
    try {
      if (audioRef.current.paused) {
        await audioRef.current.play();
        setIsPlaying(true);
      } else {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    } catch (err) {
      console.error('خطأ في التشغيل:', err);
      setIsPlaying(false);
    }
  };
  
  // تحديث حالة التشغيل
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);
    
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    
    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [localUser?.profileMusicUrl]);
  

  // تحديث الحالة المحلية عند تغيير المستخدم مع الحفاظ على التحديثات المحلية
  useEffect(() => {
    if (user) {
      setLocalUser((prev) => {
        // إذا كان هناك مستخدم محلي موجود، ندمج البيانات الجديدة مع المحلية
        if (prev && prev.id === user.id) {
          return {
            ...prev,
            ...user,
            // الحفاظ على التحديثات المحلية المهمة
            lastSeen: prev.lastSeen || user.lastSeen,
            isOnline: prev.isOnline !== undefined ? prev.isOnline : user.isOnline,
            currentRoom: prev.currentRoom || user.currentRoom,
          };
        }
        // إذا لم يكن هناك مستخدم محلي، نستخدم البيانات الجديدة
        return user;
      });
      
      // تحديث الحالات المحلية الأخرى
      setSelectedTheme(user.profileBackgroundColor || '');
      setSelectedEffect(user.profileEffect || 'none');
      setMusicTitle(user.profileMusicTitle || '');
      setMusicEnabled(user.profileMusicEnabled ?? true);
      setMusicVolume(typeof user.profileMusicVolume === 'number' ? user.profileMusicVolume : 70);
    } else {
      setLocalUser(null);
    }
  }, [user]);

  // جلب الأصدقاء عند تغيير المستخدم أو فتح تبويب الأصدقاء (للمستخدمين الآخرين فقط)
  useEffect(() => {
    if (localUser?.id && localUser.id !== currentUser?.id && activeTab === 'other') {
      fetchFriends(localUser.id);
    }
  }, [localUser?.id, currentUser?.id, activeTab]);
  // Stories
  const { fetchMine } = useStories({ autoRefresh: false });

  const handleStoryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      const isVideo = file.type.startsWith('video/');
      if (isVideo) {
        const url = URL.createObjectURL(file);
        const ok = await new Promise<boolean>((resolve) => {
          const video = document.createElement('video');
          video.preload = 'metadata';
          video.onloadedmetadata = () => {
            const d = video.duration;
            URL.revokeObjectURL(url);
            resolve(!isFinite(d) || d <= 30);
          };
          video.onerror = () => resolve(true);
          video.src = url;
        });
        if (!ok) throw new Error('مدة الفيديو تتجاوز 30 ثانية');
      }
      const formData = new FormData();
      formData.append('story', file);
      const res = await fetch('/api/stories/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'فشل رفع الحالة');
      }
      await fetchMine();
      toast({ title: 'تم', description: 'تم نشر الحالة بنجاح' });
    } catch (err: any) {
      toast({ title: 'خطأ', description: err?.message || 'فشل رفع الحالة', variant: 'destructive' });
    } finally {
      try {
        if (e.target) (e.target as HTMLInputElement).value = '';
      } catch {}
    }
  };

  // معالجة محسنة للحالات الفارغة
  // تم إلغاء الإرجاع المبكر بناءً على الطلب لضمان استمرار العرض حتى مع غياب الكائن

  // دالة موحدة لجلب بيانات المستخدم من السيرفر وتحديث الحالة المحلية - محسّنة
  const fetchAndUpdateUser = async (userId: number) => {
    try {
      const userData = await apiRequest(`/api/users/${userId}`);
      
      // تحديث البيانات المحلية مع الحفاظ على التحديثات المحلية المهمة
      setLocalUser((prev) => {
        if (prev && prev.id === userId) {
          return {
            ...prev,
            ...userData,
            // الحفاظ على التحديثات المحلية المهمة
            lastSeen: pickLatestValidDate(prev.lastSeen as any, (userData as any).lastSeen as any),
            isOnline: typeof (userData as any).isOnline !== 'undefined' ? (userData as any).isOnline : prev.isOnline,
            currentRoom: (userData as any).hasOwnProperty('currentRoom') ? (userData as any).currentRoom : prev.currentRoom,
          };
        }
        return userData;
      });
      
      if (onUpdate) onUpdate(userData);

      // تحديث لون الخلفية والتأثير المحلي
      if (userData.profileBackgroundColor) {
        setSelectedTheme(userData.profileBackgroundColor);
      }
      if (userData.profileEffect) {
        setSelectedEffect(userData.profileEffect);
      }
      
      // تحديث بيانات الموسيقى
      if (userData.profileMusicTitle) {
        setMusicTitle(userData.profileMusicTitle);
      }
      if (typeof userData.profileMusicEnabled !== 'undefined') {
        setMusicEnabled(userData.profileMusicEnabled);
      }
      if (typeof userData.profileMusicVolume !== 'undefined') {
        setMusicVolume(userData.profileMusicVolume);
      }
      
    } catch (err: any) {
      console.error('❌ خطأ في جلب بيانات المستخدم:', err);
      toast({
        title: 'خطأ',
        description: err.message || 'فشل في تحديث بيانات الملف الشخصي من السيرفر',
        variant: 'destructive',
      });
    }
  };

  // عند فتح بروفايل مستخدم آخر، اجلب نسخة محدثة دائماً لضمان صحة آخر تواجد والغرفة
  useEffect(() => {
    try {
      if (!localUser?.id) return;
      if (currentUser?.id === localUser.id) return;
      fetchAndUpdateUser(localUser.id).catch(() => {});
    } catch {}
    // نعتمد فقط على تغيير معرف المستخدم المفتوح
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localUser?.id]);

  // تحديث إعداد خصوصية الرسائل الخاصة
  const updateDmPrivacy = async (value: 'all' | 'friends' | 'none') => {
    try {
      if (!currentUser || currentUser.id !== localUser?.id) return;
      await apiRequest(`/api/users/${currentUser.id}/dm-privacy`, {
        method: 'POST',
        body: { dmPrivacy: value },
      });
      updateUserData({ dmPrivacy: value } as any);
      toast({ title: 'تم', description: 'تم تحديث إعدادات الخاص' });
    } catch (err: any) {
      toast({ title: 'خطأ', description: err?.message || 'فشل تحديث الإعداد', variant: 'destructive' });
    }
  };

  // تحديث تفضيلات المستخدم العامة
  const updatePreferences = async (prefs: Partial<{ showPointsToOthers: boolean; showSystemMessages: boolean; globalSoundEnabled: boolean }>) => {
    try {
      if (!currentUser || currentUser.id !== localUser?.id) return;
      const body: Record<string, any> = {};
      if (Object.prototype.hasOwnProperty.call(prefs, 'showPointsToOthers')) {
        body.showPointsToOthers = !!prefs.showPointsToOthers;
      }
      if (Object.prototype.hasOwnProperty.call(prefs, 'showSystemMessages')) {
        body.showSystemMessages = !!prefs.showSystemMessages;
      }
      if (Object.prototype.hasOwnProperty.call(prefs, 'globalSoundEnabled')) {
        body.globalSoundEnabled = !!prefs.globalSoundEnabled;
      }
      if (Object.keys(body).length === 0) return;

      await apiRequest(`/api/users/${currentUser.id}/preferences`, {
        method: 'POST',
        body,
      });

      updateUserData(body as any);
      toast({ title: 'تم', description: 'تم تحديث التفضيلات' });
    } catch (err: any) {
      toast({ title: 'خطأ', description: err?.message || 'فشل تحديث التفضيلات', variant: 'destructive' });
    }
  };

  // تحديث المستخدم المحلي والخارجي - محسّن
  const updateUserData = (updates: Partial<ChatUser>) => {
    const updatedUser = { ...localUser, ...updates };
    setLocalUser(updatedUser);

    if (onUpdate) {
      onUpdate(updatedUser);
    }

    // تحديث لون الخلفية والتأثير إذا تم تغييرهما
    if (updates.profileBackgroundColor) {
      setSelectedTheme(updates.profileBackgroundColor);
    }
    if (updates.profileEffect) {
      setSelectedEffect(updates.profileEffect);
    }
    
    // تحديث بيانات الموسيقى إذا تم تغييرها
    if (updates.profileMusicTitle) {
      setMusicTitle(updates.profileMusicTitle);
    }
    if (typeof updates.profileMusicEnabled !== 'undefined') {
      setMusicEnabled(updates.profileMusicEnabled);
    }
    if (typeof updates.profileMusicVolume !== 'undefined') {
      setMusicVolume(updates.profileMusicVolume);
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'profileMusicTitle')) {
      setMusicTitle(updates.profileMusicTitle as any);
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'profileMusicEnabled')) {
      setMusicEnabled(Boolean((updates as any).profileMusicEnabled));
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'profileMusicVolume')) {
      const v = Number((updates as any).profileMusicVolume);
      setMusicVolume(Number.isFinite(v) ? v : 70);
    }
    
  };

  // Complete themes collection from original code
  const themes = [
    // الألوان الستة الجديدة من الصور
    {
      value: 'theme-orange-brown',
      name: 'البرتقالي البني',
      preview: 'linear-gradient(135deg, #3d2817 0%, #8b4513 20%, #cd853f 40%, #ff8c42 60%, #ffa366 80%, #ffb380 100%)',
      emoji: '🔥',
    },
    {
      value: 'theme-pink-red',
      name: 'الوردي الأحمر',
      preview: 'linear-gradient(135deg, #8b4c6a 0%, #b85c8a 20%, #d97aa8 40%, #ff99c8 60%, #ffb3d0 80%, #ffc8dd 100%)',
      emoji: '❤️',
    },
    {
      value: 'theme-purple-violet',
      name: 'البنفسجي الأرجواني',
      preview: 'linear-gradient(135deg, #2d1b69 0%, #4a2d8b 20%, #6b46c1 40%, #9b72cf 60%, #b794f6 80%, #d6bcfa 100%)',
      emoji: '🌹',
    },
    {
      value: 'theme-black-yellow',
      name: 'الأسود الأصفر',
      preview: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 20%, #4a4a4a 40%, #ffd700 60%, #ffed4e 80%, #fff59d 100%)',
      emoji: '⭐',
    },
    {
      value: 'theme-blue-light-purple',
      name: 'الأزرق البنفسجي الفاتح',
      preview: 'linear-gradient(135deg, #00bcd4 0%, #40c4ff 20%, #7c4dff 40%, #b388ff 60%, #d1c4e9 80%, #e1bee7 100%)',
      emoji: '🌊',
    },
    {
      value: 'theme-red-black',
      name: 'الأحمر الأسود',
      preview: 'linear-gradient(135deg, #ff0000 0%, #cc0000 20%, #990000 40%, #660000 60%, #330000 80%, #000000 100%)',
      emoji: '💥',
    },
    // الثيمات الموجودة مسبقاً
    {
      value: 'theme-sunset-glow',
      name: 'توهج الغروب',
      preview: 'linear-gradient(135deg, #ff6b6b, #ff8e53, #ffa726, #ffcc02, #ff6b6b)',
      emoji: '🌅',
    },
    {
      value: 'theme-ocean-depths',
      name: 'أعماق المحيط',
      preview: 'linear-gradient(135deg, #667eea, #764ba2, #f093fb, #667eea)',
      emoji: '🌊',
    },
    {
      value: 'theme-aurora-borealis',
      name: 'الشفق القطبي',
      preview: 'linear-gradient(135deg, #a8edea, #fed6e3, #ffecd2, #fcb69f, #a8edea)',
      emoji: '✨',
    },
    {
      value: 'theme-cosmic-night',
      name: 'الليل الكوني',
      preview: 'linear-gradient(135deg, #667eea, #764ba2, #f093fb, #667eea, #764ba2)',
      emoji: '🌌',
    },
    {
      value: 'theme-emerald-forest',
      name: 'الغابة الزمردية',
      preview: 'linear-gradient(135deg, #11998e, #38ef7d, #11998e, #38ef7d)',
      emoji: '🌿',
    },
    {
      value: 'theme-rose-gold',
      name: 'الوردي الذهبي',
      preview: 'linear-gradient(135deg, #ff9a9e, #fecfef, #fecfef, #ff9a9e)',
      emoji: '🌸',
    },
    {
      value: 'theme-midnight-purple',
      name: 'البنفسجي الليلي',
      preview: 'linear-gradient(135deg, #4facfe, #00f2fe, #4facfe, #00f2fe)',
      emoji: '🔮',
    },
    {
      value: 'theme-golden-hour',
      name: 'الساعة الذهبية',
      preview: 'linear-gradient(135deg, #fa709a, #fee140, #fa709a, #fee140)',
      emoji: '🌟',
    },
    {
      value: 'theme-neon-dreams',
      name: 'أحلام النيون',
      preview: 'linear-gradient(135deg, #ff0099, #493240, #ff0099, #493240)',
      emoji: '💫',
    },
    {
      value: 'theme-silver-mist',
      name: 'الضباب الفضي',
      preview: 'linear-gradient(135deg, #c3cfe2, #c3cfe2, #e0c3fc, #c3cfe2)',
      emoji: '☁️',
    },
    {
      value: 'theme-fire-opal',
      name: 'الأوبال الناري',
      preview: 'linear-gradient(135deg, #ff416c, #ff4b2b, #ff416c, #ff4b2b)',
      emoji: '🔥',
    },
    {
      value: 'theme-crystal-clear',
      name: 'البلور الصافي',
      preview: 'linear-gradient(135deg, #89f7fe, #66a6ff, #89f7fe, #66a6ff)',
      emoji: '💎',
    },
    {
      value: 'theme-burgundy-velvet',
      name: 'الخمري المخملي',
      preview: 'linear-gradient(135deg, #800020, #8b0000, #a52a2a, #800020)',
      emoji: '🍷',
    },
    {
      value: 'theme-golden-velvet',
      name: 'الذهبي المخملي',
      preview: 'linear-gradient(135deg, #ffd700, #daa520, #b8860b, #ffd700)',
      emoji: '👑',
    },
    {
      value: 'theme-royal-black',
      name: 'الأسود الملكي',
      preview: 'linear-gradient(135deg, #191970, #2f4f4f, #000000, #191970)',
      emoji: '⚜️',
    },
    {
      value: 'theme-berry-velvet',
      name: 'التوتي المخملي',
      preview: 'linear-gradient(135deg, #8a2be2, #4b0082, #800080, #8a2be2)',
      emoji: '🫐',
    },
    {
      value: 'theme-crimson-velvet',
      name: 'العنابي المخملي',
      preview: 'linear-gradient(135deg, #dc143c, #b22222, #8b0000, #dc143c)',
      emoji: '🔴',
    },
    {
      value: 'theme-emerald-velvet',
      name: 'الزمردي المخملي',
      preview: 'linear-gradient(135deg, #008000, #228b22, #006400, #008000)',
      emoji: '💚',
    },
    {
      value: 'theme-sapphire-velvet',
      name: 'الياقوتي المخملي',
      preview: 'linear-gradient(135deg, #0047ab, #191970, #00008b, #0047ab)',
      emoji: '💙',
    },
    {
      value: 'theme-ruby-velvet',
      name: 'الياقوت الأحمر',
      preview: 'linear-gradient(135deg, #9b111e, #8b0000, #800000, #9b111e)',
      emoji: '❤️',
    },
    {
      value: 'theme-amethyst-velvet',
      name: 'الأميثيست المخملي',
      preview: 'linear-gradient(135deg, #9966cc, #8a2be2, #4b0082, #9966cc)',
      emoji: '💜',
    },
    {
      value: 'theme-onyx-velvet',
      name: 'الأونيكس المخملي',
      preview: 'linear-gradient(135deg, #2f4f4f, #191919, #000000, #2f4f4f)',
      emoji: '🖤',
    },
    {
      value: 'theme-sunset-fire',
      name: 'توهج النار البرتقالي - محدث',
      preview: 'linear-gradient(to bottom, #ff7c00 0%, #e10026 30%, #800e8c 65%, #1a004d 100%)',
      emoji: '🔥',
    },
    {
      value: 'theme-perfect-gradient',
      name: 'التدرج المثالي - محدث',
      preview: 'linear-gradient(to bottom, #ff7c00 0%, #e10026 30%, #800e8c 65%, #1a004d 100%)',
      emoji: '🌟',
    },
    {
      value: 'theme-image-gradient',
      name: 'تدرج الصورة - محدث',
      preview: 'linear-gradient(to bottom, #ff7c00 0%, #e10026 30%, #800e8c 65%, #1a004d 100%)',
      emoji: '🖼️',
    },
    {
      value: 'theme-new-gradient',
      name: 'التدرج الجديد المطابق للصورة',
      preview: 'linear-gradient(to bottom, #ff7c00 0%, #e10026 30%, #800e8c 65%, #1a004d 100%)',
      emoji: '🎨',
    },
    {
      value: 'theme-tropical-paradise',
      name: 'الجنة الاستوائية',
      preview: 'linear-gradient(135deg, #FF6B9D, #FFC0CB, #C9FFBF, #FFAFBD)',
      emoji: '🌺',
    },
    {
      value: 'theme-lavender-dreams',
      name: 'أحلام اللافندر',
      preview: 'linear-gradient(135deg, #E8B4FF, #D4A5D5, #B19CD9, #9B88ED)',
      emoji: '💜',
    },
    {
      value: 'theme-ocean-breeze',
      name: 'نسيم المحيط',
      preview: 'linear-gradient(135deg, #2E8BC0, #61A5D4, #85C1E9, #A9D6FF)',
      emoji: '🌊',
    },
    {
      value: 'theme-candy-crush',
      name: 'حلوى الفواكه',
      preview: 'linear-gradient(135deg, #FF69B4, #FFB6C1, #FFC0CB, #FFE4E1)',
      emoji: '🍭',
    },
    {
      value: 'theme-northern-lights',
      name: 'الأضواء الشمالية',
      preview: 'linear-gradient(135deg, #43C6AC, #191654, #6A0572, #AB83A1)',
      emoji: '🌌',
    },
    {
      value: 'theme-spring-blossom',
      name: 'زهر الربيع',
      preview: 'linear-gradient(135deg, #FFB3BA, #FFDFBA, #FFFFBA, #BAFFC9)',
      emoji: '🌸',
    },
    {
      value: 'theme-magic-sunset',
      name: 'غروب سحري',
      preview: 'linear-gradient(135deg, #FA8072, #FFA07A, #FFB347, #FFCC33)',
      emoji: '🌇',
    },
    {
      value: 'theme-mystic-purple',
      name: 'البنفسجي الغامض',
      preview: 'linear-gradient(135deg, #6A0DAD, #8B00FF, #9932CC, #BA55D3)',
      emoji: '🔮',
    },
    {
      value: 'theme-electric-blue',
      name: 'الأزرق الكهربائي',
      preview: 'linear-gradient(135deg, #00D4FF, #0099CC, #006699, #003366)',
      emoji: '⚡',
    },
    {
      value: 'theme-peachy-keen',
      name: 'الخوخي الناعم',
      preview: 'linear-gradient(135deg, #FFDAB9, #FFCBA4, #FFB6C1, #FFA07A)',
      emoji: '🍑',
    },
    {
      value: 'theme-galaxy-explorer',
      name: 'مستكشف المجرة',
      preview: 'linear-gradient(135deg, #1A1A2E, #16213E, #0F3460, #533483)',
      emoji: '🚀',
    },
    {
      value: 'theme-rainbow-cascade',
      name: 'شلال قوس قزح',
      preview: 'linear-gradient(135deg, #FF0000, #FF7F00, #FFFF00, #00FF00, #0000FF, #4B0082, #9400D3)',
      emoji: '🌈',
    },
    {
      value: 'theme-mint-fresh',
      name: 'النعناع المنعش',
      preview: 'linear-gradient(135deg, #96CEB4, #FFEAA7, #DDA0DD, #B8E6B8)',
      emoji: '🌿',
    },
    {
      value: 'theme-flamingo-pink',
      name: 'وردي الفلامنجو',
      preview: 'linear-gradient(135deg, #FF1493, #FF69B4, #FFB6C1, #FFC0CB)',
      emoji: '🦩',
    },
    {
      value: 'theme-cosmic-dust',
      name: 'غبار كوني',
      preview: 'linear-gradient(135deg, #483D8B, #6A5ACD, #7B68EE, #9370DB)',
      emoji: '✨',
    },
    {
      value: 'theme-cherry-blossom',
      name: 'زهر الكرز',
      preview: 'linear-gradient(135deg, #FFB7C5, #FFC0CB, #FFDAB9, #FFE4E1)',
      emoji: '🌸',
    },
    {
      value: 'theme-deep-ocean',
      name: 'أعماق المحيط',
      preview: 'linear-gradient(135deg, #001F3F, #003366, #004080, #0059B3)',
      emoji: '🌊',
    },
    {
      value: 'theme-desert-mirage',
      name: 'سراب الصحراء',
      preview: 'linear-gradient(135deg, #EDC9AF, #E7A857, #D4A574, #C19A6B)',
      emoji: '🏜️',
    },
    {
      value: 'theme-unicorn-dreams',
      name: 'أحلام اليونيكورن',
      preview: 'linear-gradient(135deg, #FFB3FF, #FF99FF, #FF80FF, #FF66FF)',
      emoji: '🦄',
    },
    {
      value: 'theme-forest-mist',
      name: 'ضباب الغابة',
      preview: 'linear-gradient(135deg, #228B22, #32CD32, #90EE90, #98FB98)',
      emoji: '🌲',
    },
    // الألوان الجديدة المطابقة للصور
    {
      value: 'theme-purple-majesty',
      name: 'العظمة البنفسجية',
      preview: 'linear-gradient(to bottom, #4A148C 0%, #E91E63 50%, #6A1B9A 100%)',
      emoji: '👑',
    },
    {
      value: 'theme-warm-earth',
      name: 'الأرض الدافئة',
      preview: 'linear-gradient(to bottom, #8B4513 0%, #2C2018 100%)',
      emoji: '🌰',
    },
    {
      value: 'theme-soft-blush',
      name: 'الوردي الناعم',
      preview: 'linear-gradient(to right, #F8DCDC 0%, #E0A0A0 100%)',
      emoji: '🌸',
    },
    {
      value: 'theme-horizontal-earth',
      name: 'الأرض الأفقية',
      preview: 'linear-gradient(to right, #B08C6C 0%, #20150F 100%)',
      emoji: '🏔️',
    },
  ];

  // Complete effects collection from original code
  const effects = [
    {
      value: 'none',
      name: 'بدون تأثيرات',
      emoji: '🚫',
      description: 'بدون أي تأثيرات حركية',
    },
    {
      value: 'effect-pulse',
      name: 'النبض الناعم',
      emoji: '💓',
      description: 'نبض خفيف ومريح',
    },
    {
      value: 'effect-glow',
      name: 'التوهج الذهبي',
      emoji: '✨',
      description: 'توهج ذهبي جميل',
    },
    {
      value: 'effect-water',
      name: 'التموج المائي',
      emoji: '🌊',
      description: 'حركة مائية سلسة',
    },
    {
      value: 'effect-aurora',
      name: 'الشفق القطبي',
      emoji: '🌌',
      description: 'تأثير الشفق الملون',
    },
    {
      value: 'effect-neon',
      name: 'النيون المتوهج',
      emoji: '💖',
      description: 'توهج نيون وردي',
    },
    {
      value: 'effect-crystal',
      name: 'البلور المتلألئ',
      emoji: '💎',
      description: 'لمعة بلورية جميلة',
    },
    {
      value: 'effect-fire',
      name: 'النار المتوهجة',
      emoji: '🔥',
      description: 'توهج ناري حارق',
    },
    {
      value: 'effect-magnetic',
      name: 'المغناطيس',
      emoji: '🧲',
      description: 'حركة عائمة مغناطيسية',
    },
    {
      value: 'effect-heartbeat',
      name: 'القلب النابض',
      emoji: '❤️',
      description: 'نبض مثل القلب',
    },
    {
      value: 'effect-stars',
      name: 'النجوم المتلألئة',
      emoji: '⭐',
      description: 'نجوم متحركة',
    },
    {
      value: 'effect-rainbow',
      name: 'قوس قزح',
      emoji: '🌈',
      description: 'تدرج قوس قزح متحرك',
    },
    {
      value: 'effect-snow',
      name: 'الثلج المتساقط',
      emoji: '❄️',
      description: 'ثلج متساقط جميل',
    },
    {
      value: 'effect-lightning',
      name: 'البرق',
      emoji: '⚡',
      description: 'وميض البرق',
    },
    {
      value: 'effect-smoke',
      name: 'الدخان',
      emoji: '💨',
      description: 'دخان متصاعد',
    },
    {
      value: 'effect-butterfly',
      name: 'الفراشة',
      emoji: '🦋',
      description: 'فراشة متحركة',
    },
  ];

  // Profile image fallback - محسّن للتعامل مع base64 و مشاكل الcache
  const getProfileImageSrcLocal = () => {
    // محاكاة منطق ProfileImage.tsx لإضافة ?v=avatarHash|avatarVersion عند توفره
    const base = getProfileImageSrc(localUser?.profileImage);
    try {
      const isBase64 = typeof base === 'string' && base.startsWith('data:');
      const hasVersionAlready = typeof base === 'string' && base.includes('?v=');
      const versionTag = (localUser as any)?.avatarHash || (localUser as any)?.avatarVersion;
      if (!isBase64 && versionTag && !hasVersionAlready && typeof base === 'string' && base.startsWith('/')) {
        return `${base}?v=${versionTag}`;
      }
    } catch {}
    return base;
  };

  // Profile banner fallback - محسّن للتعامل مع base64 و مشاكل الcache
  // إرجاع مصدر صورة البانر إن وُجد مع دعم المسارات والـ base64
  const getProfileBannerSrcLocal = () => {
    const banner = localUser?.profileBanner;
    if (!banner || banner === '') return '';
    return getBannerImageSrc(banner);
  };

  // Edit modal handlers
  const openEditModal = (type: string) => {
    setCurrentEditType(type);

    switch (type) {
      case 'name':
        setEditValue(localUser?.username || '');
        break;
      case 'status':
        setEditValue(localUser?.status || '');
        break;
      case 'gender':
        setEditValue(localUser?.gender || '');
        break;
      case 'country':
        setEditValue(localUser?.country || '');
        break;
      case 'age':
        setEditValue(localUser?.age?.toString() || '');
        break;
      case 'socialStatus':
        setEditValue(localUser?.relation || '');
        break;
    }
  };

  const closeEditModal = () => {
    setCurrentEditType(null);
    setEditValue('');
  };

  // دعم المعاينة قبل رفع الصورة الشخصية أو الغلاف
  const [previewProfile, setPreviewProfile] = useState<string | null>(null);

  const handlePreview = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewProfile(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // عند رفع صورة جديدة، أضمن تحديث بيانات المستخدم من السيرفر بعد نجاح الرفع
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    uploadType: 'profile' | 'banner' = 'profile'
  ) => {
    // التحقق من الصلاحيات: الصورة الشخصية متاحة لكل الأعضاء، الغلاف للمشرفين أو لفل 20+
    const isModerator = !!currentUser && (currentUser.userType === 'owner' || currentUser.userType === 'admin' || currentUser.userType === 'moderator');
    const lvl = Number(currentUser?.level || 1);
    if (uploadType === 'banner') {
      const canUploadBanner = isModerator || lvl >= 20;
      if (!canUploadBanner) {
        toast({ title: 'غير مسموح', description: 'الغلاف للمشرفين أو للمستوى 20 فما فوق', variant: 'destructive' });
        return;
      }
    } else {
      if (!currentUser || currentUser.userType === 'guest') {
        toast({ title: 'غير مسموح', description: 'هذه الميزة غير متاحة للزوار', variant: 'destructive' });
        return;
      }
    }

    const file = event.target.files?.[0];
    if (!file) return;

    // التحقق من نوع الملف
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'خطأ',
        description: 'يرجى اختيار ملف صورة صحيح (JPG, PNG, GIF, WebP, SVG)',
        variant: 'destructive',
      });
      return;
    }

    // التحقق من حجم الملف
    const maxSize = uploadType === 'profile' ? 5 * 1024 * 1024 : 10 * 1024 * 1024; // 5MB للبروفايل، 10MB للبانر
    if (file.size > maxSize) {
      toast({
        title: 'خطأ',
        description:
          uploadType === 'profile'
            ? 'حجم الصورة يجب أن يكون أقل من 5 ميجابايت'
            : 'حجم الغلاف يجب أن يكون أقل من 10 ميجابايت',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);

      const formData = new FormData();
      if (uploadType === 'profile') {
        formData.append('profileImage', file);
      } else {
        formData.append('banner', file);
      }

      if (currentUser?.id) {
        formData.append('userId', currentUser.id.toString());
      }

      const endpoint =
        uploadType === 'profile' ? '/api/upload/profile-image' : '/api/upload/profile-banner';
      const result = await apiRequest(endpoint, { method: 'POST', body: formData });

      if (!result.success) {
        throw new Error(result.error || 'فشل في رفع الصورة');
      }

      // تحديث البيانات المحلية فوراً
      if (uploadType === 'profile' && result.imageUrl) {
        updateUserData({ profileImage: result.imageUrl });
      } else if (uploadType === 'banner' && result.bannerUrl) {
        updateUserData({ profileBanner: result.bannerUrl });
      }

      // انتظار قصير للتأكد من التحديث المحلي
      await new Promise((resolve) => setTimeout(resolve, 100));

      // جلب البيانات المحدثة من السيرفر للتأكد
      if (currentUser?.id) {
        await fetchAndUpdateUser(currentUser.id);
      }

      toast({
        title: 'نجح ✅',
        description: uploadType === 'profile' ? 'تم تحديث الصورة الشخصية' : 'تم تحديث صورة الغلاف',
      });

      // إزالة المعاينة
      if (uploadType === 'profile') setPreviewProfile(null);
    } catch (error: any) {
      console.error(`❌ خطأ في رفع ${uploadType}:`, error);
      toast({
        title: 'خطأ',
        description: error.message || 'فشل في تحميل الصورة',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      // تنظيف input files
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  // جلب قائمة الأصدقاء
  const fetchFriends = async (userId: number) => {
    if (loadingFriends) return;
    
    setLoadingFriends(true);
    try {
      const response = await fetch(`/api/friends/${userId}`);
      const data = await response.json();
      
      if (data.friends) {
        setFriends(data.friends);
      }
    } catch (error) {
      console.error('خطأ في جلب الأصدقاء:', error);
      setFriends([]);
    } finally {
      setLoadingFriends(false);
    }
  };

  // حفظ تعديل البيانات - محسّن بدون إعادة تحميل
  const handleSaveEdit = async () => {
    if (!editValue.trim()) {
      toast({ title: 'خطأ', description: 'يرجى إدخال قيمة صحيحة', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      let fieldName = '';
      switch (currentEditType) {
        case 'name':
          fieldName = 'username';
          break;
        case 'status':
          fieldName = 'status';
          break;
        case 'gender':
          fieldName = 'gender';
          break;
        case 'country':
          fieldName = 'country';
          break;
        case 'age':
          fieldName = 'age';
          break;
        case 'socialStatus':
          fieldName = 'relation';
          break;
      }
      const response = await apiRequest('/api/users/update-profile', {
        method: 'POST',
        body: { userId: currentUser?.id, [fieldName]: editValue },
      });
      if ((response as any).success) {
        if (currentUser?.id) {
          await fetchAndUpdateUser(currentUser.id);
        }
        toast({ title: 'نجح ✅', description: 'تم تحديث الملف الشخصي' });
        closeEditModal();
      } else {
        throw new Error((response as any).error || 'فشل في التحديث');
      }
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث البيانات. تحقق من اتصال الإنترنت.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // تحديث الثيم - محسّن
  const handleThemeChange = async (theme: string) => {
    try {
      setIsLoading(true);
      setSelectedTheme(theme);

      if (!currentUser?.id) {
        toast({
          title: 'خطأ',
          description: 'لم يتم العثور على معرف المستخدم. يرجى تسجيل الدخول مرة أخرى.',
          variant: 'destructive',
        });
        return;
      }

      if (!theme || theme.trim() === '') {
        toast({
          title: 'خطأ',
          description: 'يرجى اختيار لون صحيح.',
          variant: 'destructive',
        });
        return;
      }

      // نرسل قيمة HEX فقط. إذا تم تمرير تدرّج، سيُطبّق الخادم أول HEX صالح
      const colorValue = theme;
      const result = await apiRequest(`/api/users/${localUser?.id}`, {
        method: 'PUT',
        body: { profileBackgroundColor: colorValue },
      });

      const updated = (result as any)?.user ?? result;
      if (updated && (updated as any).id) {
        updateUserData({ profileBackgroundColor: updated.profileBackgroundColor || colorValue });
        toast({ title: 'نجح ✅', description: 'تم تحديث لون الملف الشخصي' });
      } else {
        throw new Error('فشل في تحديث لون الملف الشخصي');
      }
    } catch (error) {
      console.error('❌ خطأ في تحديث لون الملف الشخصي:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث اللون. تحقق من اتصال الإنترنت.',
        variant: 'destructive',
      });
      setSelectedTheme(localUser?.profileBackgroundColor || '');
    } finally {
      setIsLoading(false);
    }
  };

  // تحديث التأثير - محسّن
  const handleEffectChange = async (effect: string) => {
    try {
      setIsLoading(true);
      setSelectedEffect(effect);

      const result = await apiRequest(`/api/users/${localUser?.id}`, {
        method: 'PUT',
        body: {
          profileEffect: effect,
        },
      });

      const updated = (result as any)?.user ?? result;
      if (updated && (updated as any).id) {
        updateUserData({
          profileEffect: effect,
        });

        toast({
          title: 'نجح ✅',
          description: 'تم تحديث التأثيرات ولون الاسم',
        });
      } else {
        throw new Error('فشل في تحديث التأثيرات');
      }
    } catch (error) {
      console.error('❌ خطأ في تحديث التأثير:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث التأثيرات',
        variant: 'destructive',
      });
      // إرجاع التأثير للحالة السابقة
      setSelectedEffect(localUser?.profileEffect || 'none');
    } finally {
      setIsLoading(false);
    }
  };

  // دالة إرسال النقاط
  const handleSendPoints = async () => {
    const points = parseInt(pointsToSend);

    if (!points || points <= 0) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال عدد صحيح من النقاط',
        variant: 'destructive',
      });
      return;
    }

    if (
      !(currentUser?.userType === 'owner' || currentUser?.role === 'owner') &&
      points > (currentUser?.points || 0)
    ) {
      toast({
        title: 'نقاط غير كافية',
        description: `لديك ${currentUser?.points || 0} نقطة فقط`,
        variant: 'destructive',
      });
      return;
    }

    try {
      setSendingPoints(true);

      const response = await apiRequest('/api/points/send', {
        method: 'POST',
        body: {
          senderId: currentUser?.id,
          receiverId: localUser?.id,
          points: points,
          reason: `نقاط مُهداة من ${currentUser?.username}`,
        },
      });

      if (response.success) {
        // إظهار إشعار النجاح
        setPointsSentNotification({
          show: true,
          points: points,
          recipientName: localUser?.username || '',
        });

        setPointsToSend('');

        // Update current user points locally for immediate UI feedback
        if (currentUser && (window as any).updateUserPoints) {
          if (currentUser?.userType === 'owner' || currentUser?.role === 'owner') {
            (window as any).updateUserPoints(currentUser.points);
          } else {
            (window as any).updateUserPoints(currentUser.points - points);
          }
        }

        // إغلاق البروفايل بعد الإرسال الناجح
        setTimeout(() => {
          onClose();
        }, 1000);
      }
    } catch (error: any) {
      toast({
        title: 'خطأ في الإرسال',
        description: error.message || 'فشل في إرسال النقاط',
        variant: 'destructive',
      });
    } finally {
      setSendingPoints(false);
    }
  };

  return (
    <>
      {/* Complete CSS Styles from original HTML */}
      <style>{`
        :root {
          --main-bg: #121212;
          --card-bg: linear-gradient(135deg, #f57f17, #b71c1c, #6a1b9a);
          --text-color: #ffffff;
          --accent-color: #ffc107;
          --error-color: #f44336;
          --success-color: #4caf50;
          --default-bg: rgba(18, 18, 18, 0.95);
        }

        /* أنماط الألوان العصرية مع التدريج المائي */
        
        /* الألوان الستة الجديدة من الصور */
        .theme-orange-brown {
          --card-bg: linear-gradient(135deg, 
            #3d2817 0%, 
            #8b4513 20%, 
            #cd853f 40%, 
            #ff8c42 60%, 
            #ffa366 80%, 
            #ffb380 100%);
          --accent-color: #ff8c42;
        }
        
        .theme-pink-red {
          --card-bg: linear-gradient(135deg, 
            #8b4c6a 0%, 
            #b85c8a 20%, 
            #d97aa8 40%, 
            #ff99c8 60%, 
            #ffb3d0 80%, 
            #ffc8dd 100%);
          --accent-color: #ff99c8;
        }
        
        .theme-purple-violet {
          --card-bg: linear-gradient(135deg, 
            #2d1b69 0%, 
            #4a2d8b 20%, 
            #6b46c1 40%, 
            #9b72cf 60%, 
            #b794f6 80%, 
            #d6bcfa 100%);
          --accent-color: #9b72cf;
        }
        
        .theme-black-yellow {
          --card-bg: linear-gradient(135deg, 
            #1a1a1a 0%, 
            #2d2d2d 20%, 
            #4a4a4a 40%, 
            #ffd700 60%, 
            #ffed4e 80%, 
            #fff59d 100%);
          --accent-color: #ffd700;
        }
        
        .theme-blue-light-purple {
          --card-bg: linear-gradient(135deg, 
            #00bcd4 0%, 
            #40c4ff 20%, 
            #7c4dff 40%, 
            #b388ff 60%, 
            #d1c4e9 80%, 
            #e1bee7 100%);
          --accent-color: #7c4dff;
        }
        
        .theme-red-black {
          --card-bg: linear-gradient(135deg, 
            #ff0000 0%, 
            #cc0000 20%, 
            #990000 40%, 
            #660000 60%, 
            #330000 80%, 
            #000000 100%);
          --accent-color: #ff0000;
        }
        
        /* الثيمات الموجودة مسبقاً */
        .theme-sunset-glow {
          --card-bg: linear-gradient(135deg, 
            #2c1810, 
            #8b0000, 
            #dc143c, 
            #ff6347, 
            #ff8c00
          ),
          radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 60%),
          radial-gradient(circle at 80% 70%, rgba(0,150,255,0.25) 0%, transparent 60%);
          --accent-color: #fff3e0;
        }

        .theme-ocean-depths {
          --card-bg: linear-gradient(135deg, 
            rgba(102, 126, 234, 0.9), 
            rgba(118, 75, 162, 0.85), 
            rgba(171, 147, 251, 0.8), 
            rgba(102, 126, 234, 0.9)
          ),
          radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.15) 0%, transparent 60%),
          radial-gradient(circle at 80% 70%, rgba(0, 150, 255, 0.25) 0%, transparent 60%);
          --accent-color: #e3f2fd;
        }

        .theme-aurora-borealis {
          --card-bg: linear-gradient(135deg, 
            #0a0a0a, 
            #1a1a2e, 
            #16213e, 
            #0f3460, 
            #533483
          ),
          radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 60%),
          radial-gradient(circle at 80% 70%, rgba(0,150,255,0.25) 0%, transparent 60%);
          --accent-color: #f0f8ff;
        }

        .theme-cosmic-night {
          --card-bg: linear-gradient(135deg, 
            #000000, 
            #1a0033, 
            #330066, 
            #6600cc, 
            #9933ff
          ),
          radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 60%),
          radial-gradient(circle at 80% 70%, rgba(0,150,255,0.25) 0%, transparent 60%);
          --accent-color: #e8eaf6;
        }

        .theme-emerald-forest {
          --card-bg: linear-gradient(135deg, 
            #0a1a0a, 
            #1a3a1a, 
            #2d5a2d, 
            #4a7c4a, 
            #6b9e6b
          ),
          radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 60%),
          radial-gradient(circle at 80% 70%, rgba(0,150,255,0.25) 0%, transparent 60%);
          --accent-color: #e8f5e8;
        }

        .theme-rose-gold {
          --card-bg: linear-gradient(135deg, 
            #2d1b1b, 
            #4a2c2c, 
            #8b4513, 
            #daa520, 
            #ffd700
          ),
          radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 60%),
          radial-gradient(circle at 80% 70%, rgba(0,150,255,0.25) 0%, transparent 60%);
          --accent-color: #fff0f3;
        }

        .theme-midnight-purple {
          --card-bg: linear-gradient(135deg, 
            #000033, 
            #1a1a4a, 
            #333366, 
            #4d4d99, 
            #6666cc
          ),
          radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 60%),
          radial-gradient(circle at 80% 70%, rgba(0,150,255,0.25) 0%, transparent 60%);
          --accent-color: #f3e5f5;
        }

        .theme-golden-hour {
          --card-bg: linear-gradient(135deg, 
            #1a0f0f, 
            #4a2c1a, 
            #8b4513, 
            #daa520, 
            #ffd700
          ),
          radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 60%),
          radial-gradient(circle at 80% 70%, rgba(0,150,255,0.25) 0%, transparent 60%);
          --accent-color: #fff8e1;
        }

        .theme-neon-dreams {
          --card-bg: linear-gradient(135deg, 
            #0a0a0a, 
            #2d1b2d, 
            #4a1a4a, 
            #8b008b, 
            #ff00ff
          ),
          radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 60%),
          radial-gradient(circle at 80% 70%, rgba(0,150,255,0.25) 0%, transparent 60%);
          --accent-color: #fce4ec;
        }

        .theme-silver-mist {
          --card-bg: linear-gradient(135deg, 
            #1a1a1a, 
            #2d2d2d, 
            #4a4a4a, 
            #666666, 
            #808080
          ),
          radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 60%),
          radial-gradient(circle at 80% 70%, rgba(0,150,255,0.25) 0%, transparent 60%);
          --accent-color: #fafafa;
        }

        .theme-fire-opal {
          --card-bg: linear-gradient(135deg, 
            #1a0a0a, 
            #4a1a1a, 
            #8b0000, 
            #dc143c, 
            #ff4500
          ),
          radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 60%),
          radial-gradient(circle at 80% 70%, rgba(0,150,255,0.25) 0%, transparent 60%);
          --accent-color: #fff3e0;
        }

        .theme-crystal-clear {
          --card-bg: linear-gradient(135deg, 
            #0a1a2a, 
            #1a2a4a, 
            #2a4a6a, 
            #4a6a8a, 
            #6a8aaa
          ),
          radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 60%),
          radial-gradient(circle at 80% 70%, rgba(0,150,255,0.25) 0%, transparent 60%);
          --accent-color: #e1f5fe;
        }

        .theme-burgundy-velvet {
          --card-bg: linear-gradient(135deg, 
            #0a0a0a, 
            #2d1b1b, 
            #4a1a1a, 
            #8b0000, 
            #a52a2a
          ),
          radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 60%),
          radial-gradient(circle at 80% 70%, rgba(0,150,255,0.25) 0%, transparent 60%);
          --accent-color: #ffe4e1;
        }

        .theme-golden-velvet {
          --card-bg: linear-gradient(135deg, 
            #1a1a0a, 
            #2d2d1a, 
            #4a4a1a, 
            #8b8b00, 
            #ffd700
          ),
          radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 60%),
          radial-gradient(circle at 80% 70%, rgba(0,150,255,0.25) 0%, transparent 60%);
          --accent-color: #fff8dc;
        }

        .theme-royal-black {
          --card-bg: linear-gradient(135deg, 
            #000000, 
            #1a1a2e, 
            #2d2d4a, 
            #4a4a6a, 
            #66668a
          ),
          radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 60%),
          radial-gradient(circle at 80% 70%, rgba(0,150,255,0.25) 0%, transparent 60%);
          --accent-color: #f0f8ff;
        }

        .theme-berry-velvet {
          --card-bg: linear-gradient(135deg, 
            #0a0a1a, 
            #1a1a2d, 
            #2d2d4a, 
            #4a4a6a, 
            #8a2be2
          ),
          radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 60%),
          radial-gradient(circle at 80% 70%, rgba(0,150,255,0.25) 0%, transparent 60%);
          --accent-color: #f8f0ff;
        }

        .theme-crimson-velvet {
          --card-bg: linear-gradient(135deg, 
            #0a0a0a, 
            #2d1b1b, 
            #4a1a1a, 
            #8b0000, 
            #dc143c
          ),
          radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 60%),
          radial-gradient(circle at 80% 70%, rgba(0,150,255,0.25) 0%, transparent 60%);
          --accent-color: #ffe4e1;
        }

        .theme-emerald-velvet {
          --card-bg: linear-gradient(135deg, 
            #0a1a0a, 
            #1a2d1a, 
            #2d4a2d, 
            #4a6a4a, 
            #6b8a6b
          ),
          radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 60%),
          radial-gradient(circle at 80% 70%, rgba(0,150,255,0.25) 0%, transparent 60%);
          --accent-color: #f0fff0;
        }

        .theme-sapphire-velvet {
          --card-bg: linear-gradient(135deg, 
            #0a0a1a, 
            #1a1a2d, 
            #2d2d4a, 
            #4a4a6a, 
            #6b6b8a
          ),
          radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 60%),
          radial-gradient(circle at 80% 70%, rgba(0,150,255,0.25) 0%, transparent 60%);
          --accent-color: #f0f8ff;
        }

        .theme-ruby-velvet {
          --card-bg: linear-gradient(135deg, 
            #0a0a0a, 
            #2d1b1b, 
            #4a1a1a, 
            #8b0000, 
            #9b111e
          ),
          radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 60%),
          radial-gradient(circle at 80% 70%, rgba(0,150,255,0.25) 0%, transparent 60%);
          --accent-color: #ffe4e1;
        }

        .theme-amethyst-velvet {
          --card-bg: linear-gradient(135deg, 
            #0a0a1a, 
            #1a1a2d, 
            #2d2d4a, 
            #4a4a6a, 
            #9966cc
          ),
          radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 60%),
          radial-gradient(circle at 80% 70%, rgba(0,150,255,0.25) 0%, transparent 60%);
          --accent-color: #f8f0ff;
        }

        .theme-onyx-velvet {
          --card-bg: linear-gradient(135deg, 
            #000000, 
            #1a1a1a, 
            #2d2d2d, 
            #4a4a4a, 
            #666666
          ),
          radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 60%),
          radial-gradient(circle at 80% 70%, rgba(0,150,255,0.25) 0%, transparent 60%);
          --accent-color: #f5f5f5;
        }

        .theme-sunset-fire {
          --card-bg: linear-gradient(to bottom, #ff7c00 0%, #e10026 30%, #800e8c 65%, #1a004d 100%);
          --accent-color: #fff3e0;
        }

        .theme-perfect-gradient {
          --card-bg: linear-gradient(to bottom, #ff7c00 0%, #e10026 30%, #800e8c 65%, #1a004d 100%);
          --accent-color: #fff3e0;
        }

        .theme-image-gradient {
          --card-bg: linear-gradient(to bottom, #ff7c00 0%, #e10026 30%, #800e8c 65%, #1a004d 100%);
          --accent-color: #fff3e0;
        }

        .theme-new-gradient {
          --card-bg: linear-gradient(to bottom, #ff7c00 0%, #e10026 30%, #800e8c 65%, #1a004d 100%);
          --accent-color: #fff3e0;
        }

        .profile-card {
          width: 100%;
          max-width: 440px;
          border-radius: 16px;
          overflow: hidden;
          background: var(--card-bg);
          box-shadow: 0 8px 32px rgba(0,0,0,0.8);
          position: relative;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          height: fit-content;
          color: #fff;
        }

        .profile-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 40px rgba(0,0,0,0.9);
        }

        .profile-cover {
          position: relative;
          height: 220px;
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
        }

        .change-cover-btn {
          position: absolute;
          top: 12px;
          left: 12px;
          background: rgba(0,0,0,0.7);
          border-radius: 8px;
          padding: 8px 12px;
          color: #fff;
          font-size: 12px;
          cursor: pointer;
          z-index: 3;
          transition: background 0.3s ease;
          border: none;
          font-weight: 500;
        }

        .change-cover-btn:hover {
          background: rgba(0,0,0,0.9);
        }

        /* تم حذف أنماط الأزرار المحذوفة */

        /* تم حذف أنماط الأزرار المحذوفة */

        .profile-avatar {
          width: 130px;
          height: 130px;
          border-radius: 16px;
          overflow: hidden;
          border: 4px solid rgba(255,255,255,0.9);
          position: absolute;
          top: calc(100% - 90px);
          right: 20px;
          background-color: rgba(0,0,0,0.5);
          box-shadow: 0 6px 20px rgba(0,0,0,0.6);
          z-index: 2;
          transition: transform 0.3s ease;
        }

        .profile-avatar:hover {
          transform: scale(1.05);
        }

        .profile-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          border-radius: 0; /* إزالة أي استدارة للصورة */
        }

        .change-avatar-btn {
          position: absolute;
          top: calc(100% - 57px);
          right: 28px;
          background: rgba(0,0,0,0.8);
          border-radius: 50%;
          width: 30px;
          height: 30px;
          text-align: center;
          line-height: 30px;
          font-size: 14px;
          color: #fff;
          cursor: pointer;
          z-index: 3;
          transition: background 0.3s ease, transform 0.2s ease;
          border: none;
        }

        .change-avatar-btn:hover {
          background: rgba(0,0,0,1);
          transform: scale(1.1);
        }

        input[type="file"] {
          display: none;
        }

        .profile-body {
          padding: 28px 20px 10px;
        }

        /* Reduce vertical padding on desktop only */
        @media (min-width: 481px) {
          .compact-vertical { padding: 6px 8px !important; }
        }

        .profile-info {
          margin-bottom: 12px;
          text-align: center;
          margin-top: 0;
        }

        .profile-info h3 {
          margin: 0 0 6px 0;
          font-size: 20px;
          font-weight: bold;
          color: var(--accent-color);
          text-shadow: 0 2px 4px rgba(0,0,0,0.5);
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .profile-info h3:hover {
          color: #fff;
          transform: translateY(-2px);
        }

        .profile-info small {
          display: block;
          font-size: 13px;
          color: #ddd;
          opacity: 0.9;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .profile-info small:hover {
          color: var(--accent-color);
          transform: translateY(-1px);
        }

        .profile-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin: 12px 0;
          justify-content: center;
        }

        .profile-buttons button {
          flex: 1 1 30%;
          background: linear-gradient(135deg, #b71c1c, #8e0000);
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 8px;
          font-weight: bold;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.1);
          backdrop-filter: blur(10px);
        }

        .profile-buttons button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.4);
          background: linear-gradient(135deg, #d32f2f, #b71c1c);
          border-color: rgba(255,255,255,0.2);
        }

        .profile-buttons button:active {
          transform: translateY(0);
        }

        .profile-details {
          padding: 12px;
          font-size: 13px;
          background: rgba(255,255,255,0.08);
          border-radius: 12px;
          margin: 12px 0;
          border: 1px solid rgba(255,255,255,0.1);
          backdrop-filter: blur(10px);
        }

        .profile-details p {
          margin: 6px 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 8px;
          border-radius: 6px;
          transition: all 0.3s ease;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          cursor: pointer;
        }
        
        .profile-details p:hover {
          background: rgba(255,255,255,0.05);
          transform: translateX(-3px);
        }

        .profile-details p:last-child {
          border-bottom: none;
        }

        .profile-details span {
          font-weight: bold;
          color: var(--accent-color);
          text-align: left;
          text-shadow: 0 1px 2px rgba(0,0,0,0.3);
          padding: 3px 6px;
          border-radius: 4px;
          background: rgba(255,255,255,0.05);
        }

        .additional-details {
          background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05));
          padding: 10px 16px;
          border-radius: 12px;
          margin: 10px 0;
          border: 1px solid rgba(255,255,255,0.15);
          backdrop-filter: blur(15px);
          box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }

        .additional-details p {
          margin: 6px 0;
          font-size: 12px;
          color: #eee;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 8px;
          border-radius: 6px;
          transition: all 0.3s ease;
        }
        
        .additional-details p:hover {
          background: rgba(255,255,255,0.08);
          transform: scale(1.02);
        }

        .additional-details span {
          font-weight: bold;
          color: var(--accent-color);
          text-shadow: 0 1px 2px rgba(0,0,0,0.3);
          padding: 2px 6px;
          border-radius: 4px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.1);
        }

        .edit-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.8);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        
        .edit-content {
          background: var(--card-bg);
          padding: 24px;
          border-radius: 16px;
          width: 90%;
          max-width: 350px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.9);
          color: #fff;
        }
        
        .edit-content h3 {
          margin: 0 0 16px 0;
          color: var(--accent-color);
          text-align: center;
          font-size: 18px;
        }
        
        .edit-field {
          margin-bottom: 16px;
        }
        
        .edit-field label {
          display: block;
          margin-bottom: 6px;
          color: #fff;
          font-weight: bold;
          font-size: 14px;
        }
        
        .edit-field input, .edit-field select, .edit-field textarea {
          width: 100%;
          padding: 12px;
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 10px;
          background: linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05));
          color: #fff;
          font-size: 14px;
          font-weight: 500;
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
          box-sizing: border-box;
        }
        
        .edit-field input:focus, .edit-field select:focus, .edit-field textarea:focus {
          outline: none;
          border-color: var(--accent-color);
          background: linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.1));
          box-shadow: 0 0 15px rgba(255,193,7,0.3);
        }

        .edit-field select {
          cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffc107' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
          background-repeat: no-repeat;
          background-position: right 12px center;
          background-size: 16px;
          padding-right: 40px;
        }

        .theme-option {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          border-radius: 8px;
          margin: 4px 0;
          cursor: pointer;
          transition: all 0.3s ease;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
        }

        .theme-option:hover {
          background: rgba(255,255,255,0.1);
          transform: translateX(-5px);
        }

        .theme-option.selected {
          background: var(--accent-color);
          color: inherit;
          font-weight: bold;
          transform: scale(1.05);
          box-shadow: 0 4px 15px rgba(255,193,7,0.4);
        }

        .theme-preview {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.3);
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          transition: all 0.3s ease;
        }

        .theme-option:hover .theme-preview {
          transform: scale(1.2);
          border-color: rgba(255,255,255,0.8);
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        }

        .theme-name {
          flex: 1;
          font-size: 14px;
          font-weight: 500;
        }

        /* ===== تأثيرات حركية جميلة ===== */
        
        .effect-pulse {
          animation: gentlePulse 3s ease-in-out infinite;
        }
        
        @keyframes gentlePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        
        .effect-glow {
          animation: goldenGlow 4s ease-in-out infinite;
          box-shadow: 0 8px 32px rgba(0,0,0,0.8), 0 0 20px rgba(255,215,0,0.3);
        }
        
        @keyframes goldenGlow {
          0%, 100% { 
            box-shadow: 0 8px 32px rgba(0,0,0,0.8), 0 0 20px rgba(255,215,0,0.3);
          }
          50% { 
            box-shadow: 0 8px 32px rgba(0,0,0,0.8), 0 0 30px rgba(255,215,0,0.6);
          }
        }
        
        .effect-water {
          animation: waterWave 6s ease-in-out infinite;
          background-size: 400% 400% !important;
        }
        
        @keyframes waterWave {
          0%, 100% { background-position: 0% 50%; }
          25% { background-position: 100% 50%; }
          50% { background-position: 100% 100%; }
          75% { background-position: 0% 100%; }
        }
        
        .effect-aurora {
          animation: auroraShift 8s ease-in-out infinite;
          background-size: 300% 300% !important;
        }
        
        @keyframes auroraShift {
          0%, 100% { 
            background-position: 0% 50%;
            filter: hue-rotate(0deg);
          }
          25% { 
            background-position: 100% 50%;
            filter: hue-rotate(90deg);
          }
          50% { 
            background-position: 100% 100%;
            filter: hue-rotate(180deg);
          }
          75% { 
            background-position: 0% 100%;
            filter: hue-rotate(270deg);
          }
        }
        
        .effect-neon {
          animation: neonFlicker 2s ease-in-out infinite;
          box-shadow: 0 8px 32px rgba(0,0,0,0.8), 0 0 20px rgba(255,20,147,0.5);
        }
        
        @keyframes neonFlicker {
          0%, 100% { 
            box-shadow: 0 8px 32px rgba(0,0,0,0.8), 0 0 20px rgba(255,20,147,0.5);
          }
          50% { 
            box-shadow: 0 8px 32px rgba(0,0,0,0.8), 0 0 30px rgba(255,20,147,0.8);
          }
        }
        
        .effect-crystal {
          animation: crystalShimmer 5s ease-in-out infinite;
          position: relative;
        }
        
        .effect-crystal::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          animation: crystalSweep 3s ease-in-out infinite;
          z-index: 1;
          pointer-events: none;
        }
        
        @keyframes crystalShimmer {
          0%, 100% { filter: brightness(1) contrast(1); }
          50% { filter: brightness(1.1) contrast(1.1); }
        }
        
        @keyframes crystalSweep {
          0% { left: -100%; }
          100% { left: 100%; }
        }
        
        .effect-fire {
          animation: fireFlicker 1.5s ease-in-out infinite;
          box-shadow: 0 8px 32px rgba(0,0,0,0.8), 0 0 20px rgba(255,69,0,0.5);
        }
        
        @keyframes fireFlicker {
          0%, 100% { 
            box-shadow: 0 8px 32px rgba(0,0,0,0.8), 0 0 20px rgba(255,69,0,0.5);
            filter: brightness(1);
          }
          50% { 
            box-shadow: 0 8px 32px rgba(0,0,0,0.8), 0 0 30px rgba(255,69,0,0.8);
            filter: brightness(1.1);
          }
        }

        .effect-magnetic {
          animation: magneticFloat 4s ease-in-out infinite;
        }
        
        @keyframes magneticFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        
        .effect-heartbeat {
          animation: heartbeat 2s ease-in-out infinite;
        }
        
        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          14% { transform: scale(1.03); }
          28% { transform: scale(1); }
          42% { transform: scale(1.03); }
          70% { transform: scale(1); }
        }
        
        .effect-stars {
          position: relative;
          animation: starTwinkle 3s ease-in-out infinite;
        }
        
        .effect-stars::before {
          content: '✨';
          position: absolute;
          top: 10px;
          right: 10px;
          font-size: 20px;
          animation: starFloat 4s ease-in-out infinite;
          z-index: 10;
          pointer-events: none;
        }
        
        .effect-stars::after {
          content: '⭐';
          position: absolute;
          bottom: 10px;
          left: 10px;
          font-size: 16px;
          animation: starFloat 3s ease-in-out infinite reverse;
          z-index: 10;
          pointer-events: none;
        }
        
        @keyframes starTwinkle {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.2); }
        }
        
        @keyframes starFloat {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(180deg); }
        }

        .effect-rainbow {
          animation: rainbowShift 4s ease-in-out infinite;
          background-size: 400% 400% !important;
        }
        
        @keyframes rainbowShift {
          0% { filter: hue-rotate(0deg); }
          25% { filter: hue-rotate(90deg); }
          50% { filter: hue-rotate(180deg); }
          75% { filter: hue-rotate(270deg); }
          100% { filter: hue-rotate(360deg); }
        }

        .effect-snow {
          position: relative;
          overflow: hidden;
        }
        
        .effect-snow::before {
          content: '❄️';
          position: absolute;
          top: -20px;
          left: 20%;
          font-size: 16px;
          animation: snowfall 5s linear infinite;
          z-index: 10;
          pointer-events: none;
        }
        
        .effect-snow::after {
          content: '❄️';
          position: absolute;
          top: -20px;
          right: 30%;
          font-size: 12px;
          animation: snowfall 6s linear infinite 2s;
          z-index: 10;
          pointer-events: none;
        }
        
        @keyframes snowfall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(400px) rotate(360deg); opacity: 0; }
        }

        .effect-lightning {
          animation: lightningFlash 3s ease-in-out infinite;
        }
        
        @keyframes lightningFlash {
          0%, 90%, 100% { filter: brightness(1); }
          95% { filter: brightness(1.5) contrast(1.2); }
        }

        .effect-smoke {
          position: relative;
        }
        
        .effect-smoke::before {
          content: '💨';
          position: absolute;
          bottom: 10px;
          right: 10px;
          font-size: 18px;
          animation: smokeRise 4s ease-in-out infinite;
          z-index: 10;
          pointer-events: none;
        }
        
        @keyframes smokeRise {
          0% { transform: translateY(0px) scale(0.8); opacity: 0.7; }
          50% { transform: translateY(-15px) scale(1.1); opacity: 0.9; }
          100% { transform: translateY(-30px) scale(1.2); opacity: 0.3; }
        }

        .effect-butterfly {
          position: relative;
        }
        
        .effect-butterfly::before {
          content: '🦋';
          position: absolute;
          top: 15px;
          left: 15px;
          font-size: 16px;
          animation: butterflyFly 6s ease-in-out infinite;
          z-index: 10;
          pointer-events: none;
        }
        
        @keyframes butterflyFly {
          0%, 100% { transform: translate(0px, 0px) rotate(0deg); }
          25% { transform: translate(20px, -10px) rotate(15deg); }
          50% { transform: translate(-10px, -20px) rotate(-10deg); }
          75% { transform: translate(15px, -5px) rotate(20deg); }
        }

        .edit-buttons {
          display: flex;
          gap: 10px;
          justify-content: center;
          margin-top: 16px;
        }

        .edit-buttons button {
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s;
          font-size: 13px;
        }

        .save-btn {
          background: #28a745;
          color: white;
        }

        .cancel-btn {
          background: #dc3545;
          color: white;
        }

        .edit-buttons button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }

        @media (max-width: 480px) {
          .profile-card {
            max-width: 100%;
          }
          
          .profile-avatar {
            width: 100px;
            height: 100px;
            top: calc(100% - 50px);
            right: 16px;
            border-radius: 12px; /* زوايا مدورة قليلاً للأجهزة المحمولة */
          }
          
          .change-avatar-btn {
            top: calc(100% - 24px);
            right: 22px;
            width: 25px;
            height: 25px;
            line-height: 25px;
            font-size: 12px;
          }
          
          .profile-body {
            padding: 58px 12px 10px;
          }
          
          .profile-info h3 {
            font-size: 18px;
          }
          
          /* تم حذف أنماط الأزرار المحذوفة */
        }
      `}</style>

      {/* Modal Background - completely transparent */}
      <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Main Modal */}
      <div className="fixed inset-0 z-[90] flex items-start justify-center pt-6 pb-2 px-4 overflow-y-auto">
        <div
          className={`profile-card ${selectedEffect}`}
          style={{
            background: computedCardGradient,
            backgroundBlendMode: 'normal',
            ['--card-bg' as any]: computedCardGradient,
          }}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-2 right-2 z-20 p-2 rounded-full bg-red-500/80 hover:bg-red-600 text-white transition-colors shadow-lg"
          >
            <X size={20} />
          </button>

          {/* Cover Section - completely stable */}
          <div
            className="profile-cover"
            style={{
              backgroundImage: (() => {
                const src = getProfileBannerSrcLocal();
                return src ? `url(${src})` : 'none';
              })(),
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          >
            {/* مشغل الموسيقى - يظهر أعلى يمين الغلاف */}
            {localUser?.profileMusicUrl && musicEnabled && (
              <>
                {/* مشغل مخفي لصاحب البروفايل - التشغيل التلقائي فقط */}
                {localUser?.id === currentUser?.id && (
                  <audio
                    ref={audioRef}
                    src={localUser.profileMusicUrl}
                    {...(externalAudioManaged ? {} : { autoPlay: true })}
                    loop
                    style={{ display: 'none' }}
                    onError={handleAudioError}
                    onLoadStart={handleAudioLoadStart}
                    onCanPlay={handleAudioCanPlay}
                  />
                )}
                
                {/* مشغل مخفي للمستخدمين الآخرين - بدون أزرار تحكم */}
                {localUser?.id !== currentUser?.id && (
                  <audio
                    ref={audioRef}
                    src={localUser.profileMusicUrl}
                    {...(externalAudioManaged ? {} : { autoPlay: true })}
                    loop
                    style={{ display: 'none' }}
                    onError={handleAudioError}
                    onLoadStart={handleAudioLoadStart}
                    onCanPlay={handleAudioCanPlay}
                  />
                )}
              </>
            )}
            {localUser?.id === currentUser?.id && currentUser && ((
               currentUser.userType === 'owner' || 
               currentUser.userType === 'admin' || 
               currentUser.userType === 'moderator'
             ) || (typeof currentUser.level === 'number' && currentUser.level >= 20)) && (
              <>
                <button
                  className="change-cover-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                >
                  🖼️ تغيير الغلاف
                </button>
                
                {/* اسم المستخدم مع الرتبة - في أسفل صورة الغلاف */}
                <div style={{
                  position: 'absolute',
                  bottom: '10px', /* في أسفل صورة الغلاف قبل الحافة مباشرة */
                  left: '50%',
                  transform: 'translateX(calc(-50% - 12px - 2cm))',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px', /* فراغ صغير بين الشعار والاسم */
                  zIndex: 10,
                  textAlign: 'center',
                  maxWidth: 'calc(100% - 180px)',
                  padding: '0 12px',
                  boxSizing: 'border-box'
                }}>
                  {/* الرتبة فوق الاسم */}
                  {(localUser?.userType === 'owner' || localUser?.userType === 'admin' || localUser?.userType === 'moderator') && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', transform: 'translateX(2cm)' }}>
                      <span style={{ fontSize: '13px' }}>
                        {localUser?.userType === 'owner' && 'Owner'}
                        {localUser?.userType === 'admin' && 'Admin'}
                        {localUser?.userType === 'moderator' && 'Moderator'}
                      </span>
                      <span style={{ fontSize: '16px' }}>
                        {getUserLevelIcon(localUser, 16)}
                      </span>
                    </div>
                  )}
                  {/* الاسم */}
                  <h3 style={{
                    margin: 0,
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: getFinalUsernameColor(localUser || {}),
                    textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                    cursor: 'pointer',
                    // direction accepts 'ltr' | 'rtl' in TS types; rely on CSS default by omitting invalid value
                    // direction: 'auto',
                    unicodeBidi: 'plaintext',
                    textAlign: 'center',
                    whiteSpace: 'normal',
                    overflowWrap: 'break-word',
                    wordBreak: 'keep-all',
                    hyphens: 'none',
                    transform: 'translateX(2cm)'
                  }}
                  onClick={() => openEditModal('name')}
                  >
                    <bdi>{localUser?.username || 'اسم المستخدم'}</bdi>
                  </h3>
                </div>
              </>
            )}

            {/* إظهار الاسم لصاحب الحساب حتى بدون صلاحية تغيير الغلاف */}
            {localUser?.id === currentUser?.id && (!currentUser || !((
               currentUser.userType === 'owner' ||
               currentUser.userType === 'admin' ||
               currentUser.userType === 'moderator'
             ) || (typeof currentUser?.level === 'number' && currentUser.level >= 20))) && (
              <>
                <div style={{
                  position: 'absolute',
                  bottom: '10px', /* في أسفل صورة الغلاف قبل الحافة مباشرة */
                  left: '50%',
                  transform: 'translateX(calc(-50% - 12px - 2cm))',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px', /* فراغ صغير بين الشعار والاسم */
                  zIndex: 12,
                  textAlign: 'center',
                  maxWidth: 'calc(100% - 180px)',
                  padding: '0 12px',
                  boxSizing: 'border-box'
                }}>
                  {(localUser?.userType === 'owner' || localUser?.userType === 'admin' || localUser?.userType === 'moderator') && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', transform: 'translateX(2cm)' }}>
                      <span style={{ fontSize: '13px' }}>
                        {localUser?.userType === 'owner' && 'Owner'}
                        {localUser?.userType === 'admin' && 'Admin'}
                        {localUser?.userType === 'moderator' && 'Moderator'}
                      </span>
                      <span style={{ fontSize: '16px' }}>
                        {getUserLevelIcon(localUser, 16)}
                      </span>
                    </div>
                  )}
                  <h3 style={{
                    margin: 0,
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: getFinalUsernameColor(localUser || {}),
                    textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                    cursor: 'pointer',
                    // direction: 'auto',
                    unicodeBidi: 'plaintext',
                    textAlign: 'center',
                    whiteSpace: 'normal',
                    overflowWrap: 'break-word',
                    wordBreak: 'keep-all',
                    hyphens: 'none',
                    transform: 'translateX(2cm)'
                  }}
                  onClick={() => openEditModal('name')}
                  >
                    <bdi>{localUser?.username || 'اسم المستخدم'}</bdi>
                  </h3>
                </div>
              </>
            )}

            {localUser?.id !== currentUser?.id && (
              <>
                {/* اسم المستخدم مع الرتبة - في أسفل صورة الغلاف */}
                <div style={{
                  position: 'absolute',
                  bottom: '10px', /* في أسفل صورة الغلاف قبل الحافة مباشرة */
                  left: '50%',
                  transform: 'translateX(calc(-50% - 12px - 2cm))',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px', /* فراغ صغير بين الشعار والاسم */
                  zIndex: 12,
                  pointerEvents: 'none',
                  textAlign: 'center',
                  maxWidth: 'calc(100% - 180px)',
                  padding: '0 12px',
                  boxSizing: 'border-box'
                }}>
                  {/* الرتبة فوق الاسم */}
                  {(localUser?.userType === 'owner' || localUser?.userType === 'admin' || localUser?.userType === 'moderator') && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', transform: 'translateX(2cm)' }}>
                      <span style={{ fontSize: '13px' }}>
                        {localUser?.userType === 'owner' && 'Owner'}
                        {localUser?.userType === 'admin' && 'Admin'}
                        {localUser?.userType === 'moderator' && 'Moderator'}
                      </span>
                      <span style={{ fontSize: '16px' }}>
                        {getUserLevelIcon(localUser, 16)}
                      </span>
                    </div>
                  )}
                  {/* الاسم */}
                  <h3 style={{
                    margin: 0,
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: getFinalUsernameColor(localUser || {}),
                    textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                    // direction: 'auto',
                    unicodeBidi: 'plaintext',
                    textAlign: 'center',
                    whiteSpace: 'normal',
                    overflowWrap: 'break-word',
                    wordBreak: 'keep-all',
                    hyphens: 'none',
                    transform: 'translateX(2cm)'
                  }}>
                    <bdi>{localUser?.username || 'اسم المستخدم'}</bdi>
                  </h3>
                </div>
              </>
            )}

            <div className="profile-avatar">
              {/* عرض الصورة مباشرة بدون استخدام ProfileImage للحصول على شكل مربع */}
              <img
                src={getProfileImageSrcLocal()}
                alt="الصورة الشخصية"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                  transition: 'none',
                  backfaceVisibility: 'hidden',
                  transform: 'translateZ(0)',
                }}
              />
            </div>

            {localUser?.id === currentUser?.id && 
             currentUser && currentUser.userType !== 'guest' && (
              <button
                className="change-avatar-btn"
                onClick={() => avatarInputRef.current?.click()}
                title="تغيير الصورة"
                disabled={isLoading}
              >
                📷
              </button>
            )}

          </div>

          {/* Profile Body - Tab System */}
          <div className="profile-body">
            {/* Tab Navigation */}
            <div style={{
              display: 'flex',
              marginBottom: '0px',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              overflow: 'hidden'
            }}>
              <button
                onClick={() => setActiveTab('info')}
                style={{
                  flex: 1,
                  padding: '8px',
                  background: activeTab === 'info' ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: '#fff',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease',
                  borderRight: '1px solid rgba(255,255,255,0.08)'
                }}
              >
                معلوماتي
              </button>
              {/* إخفاء تبويب "خيارات" للمستخدمين الآخرين لأنه فارغ */}
              {localUser?.id === currentUser?.id && (
                <button
                  onClick={() => setActiveTab('options')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: activeTab === 'options' ? 'rgba(255,255,255,0.1)' : 'transparent',
                    color: '#fff',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'background 0.2s ease',
                    borderRight: '1px solid rgba(255,255,255,0.08)'
                  }}
                >
                  خيارات
                </button>
              )}
              {/* إخفاء تبويب "الأصدقاء" للمستخدم نفسه فقط */}
              {localUser?.id !== currentUser?.id && (
                <button
                  onClick={() => setActiveTab('other')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: activeTab === 'other' ? 'rgba(255,255,255,0.1)' : 'transparent',
                    color: '#fff',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'background 0.2s ease'
                  }}
                >
                  الأصدقاء
                </button>
              )}
            </div>

            {/* Tab Content */}
            {activeTab === 'info' && (
              <div style={{ 
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.04)'
              }}>
              
              <div className="profile-info">
                <small
                  onClick={() => localUser?.id === currentUser?.id && openEditModal('status')}
                  style={{ 
                    display: 'block', 
                    textAlign: 'center',
                    width: '100%',
                    margin: '0 auto 12px auto',
                    cursor: localUser?.id === currentUser?.id ? 'pointer' : 'default',
                    color: '#ddd',
                    fontSize: '13px',
                    fontStyle: 'italic'
                  }}
                  title={localUser?.id === currentUser?.id ? 'اضغط لتعديل الحالة' : ''}
                >
                  {localUser?.status || ''}
                </small>
              </div>

              <div className="profile-details">
                <p
                  onClick={() => localUser?.id === currentUser?.id && openEditModal('gender')}
                  style={{ cursor: localUser?.id === currentUser?.id ? 'pointer' : 'default' }}
                >
                  الجنس: <span>{localUser?.gender || 'غير محدد'}</span>
                </p>
                <p
                  onClick={() => localUser?.id === currentUser?.id && openEditModal('country')}
                  style={{ cursor: localUser?.id === currentUser?.id ? 'pointer' : 'default' }}
                >
                  🌍 البلد: <span className="inline-flex items-center gap-1">
                    {localUser?.country || 'غير محدد'}
                    {localUser?.country && <CountryFlag country={localUser?.country} size={14} />}
                  </span>
                </p>
                <p
                  onClick={() => localUser?.id === currentUser?.id && openEditModal('age')}
                  style={{ cursor: localUser?.id === currentUser?.id ? 'pointer' : 'default' }}
                >
                  العمر: <span>{localUser?.age ? `${localUser.age} سنة` : 'غير محدد'}</span>
                </p>
                <p
                  onClick={() => localUser?.id === currentUser?.id && openEditModal('socialStatus')}
                  style={{ cursor: localUser?.id === currentUser?.id ? 'pointer' : 'default' }}
                >
                  الحالة الاجتماعية: <span>{localUser?.relation || 'غير محدد'}</span>
                </p>
                <p>
                  تاريخ الإنضمام:{' '}
                  <span>
                    {localUser?.createdAt
                      ? new Date(localUser.createdAt).toLocaleDateString('ar-SA')
                      : 'غير محدد'}
                  </span>
                </p>
                <p>
                  نقاط الهدايا: <span>
                    {currentUser && localUser && currentUser.id !== localUser.id && (localUser as any)?.showPointsToOthers === false
                      ? 'مخفية'
                      : (localUser?.points || 0)}
                  </span>
                </p>
                {/* إرسال النقاط - يظهر فقط للمستخدمين الآخرين */}
                {currentUser && currentUser.id !== localUser?.id && (
                  <p onClick={() => setCurrentEditType('sendPoints')} style={{ cursor: 'pointer' }}>
                    إرسال النقاط: <span>اضغط للإرسال</span>
                  </p>
                )}
                {canShowLastSeen && (
                  <p>
                    <span style={{ color: '#fff' }}>{`آخر تواجد`}</span>
                    <br />
                    <span>{formattedLastSeen}</span>
                  </p>
                )}
                
                {localUser?.id === currentUser?.id && (
                  <>
                    <p>
                      ⭐ مستوى العضو: <span>مستوى {localUser?.level || 1}</span>
                    </p>
                  </>
                )}
              </div>
              </div>
            )}

            {/* Tab Content - Options */}
            {activeTab === 'options' && localUser?.id === currentUser?.id && (
              <div style={{ 
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.04)'
              }}>
                

                {/* إعدادات الرسائل الخاصة */}
                <div style={{ marginBottom: '16px' }}>
                  

                  <div className="compact-vertical" style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '8px',
                    padding: '8px',
                    borderRadius: '6px',
                    background: 'rgba(255,255,255,0.04)'
                  }}>
                    <span style={{ color: '#fff', fontSize: '14px' }}>إعدادات الرسائل الخاصة</span>
                    <select 
                      style={{ 
                        background: 'rgba(255,255,255,0.1)', 
                        color: '#fff', 
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        fontSize: '12px'
                      }}
                      onChange={(e) => updateDmPrivacy(e.target.value as 'all' | 'friends' | 'none')}
                    >
                      <option value="all">السماح للجميع</option>
                      <option value="friends">👥 السماح للأصدقاء فقط</option>
                      <option value="none">🚫 قفل الخاص (لا أحد)</option>
                    </select>
                  </div>
                </div>

                {/* خيارات الخصوصية */}
                <div style={{ marginBottom: '16px' }}>
                  <h5 style={{ 
                    margin: '0 0 8px 0', 
                    fontSize: '13px', 
                    fontWeight: 'bold', 
                    color: '#fff',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    paddingBottom: '4px'
                  }}>خيارات الخصوصية</h5>



                  <div className="compact-vertical" style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '8px',
                    padding: '8px',
                    borderRadius: '6px',
                    background: 'rgba(255,255,255,0.04)'
                  }}>
                    <span style={{ color: '#fff', fontSize: '14px' }}>طلبات الصداقة</span>
                  </div>


                  

                  {/* عرض نقاطي للآخرين */}
                  <div className="compact-vertical" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                    padding: '8px',
                    borderRadius: '6px',
                    background: 'rgba(255,255,255,0.04)'
                  }}>
                    <span style={{ color: '#fff', fontSize: '14px' }}>من يمكنه رؤية نقاطي</span>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#ddd' }}>
                      <input
                        type="checkbox"
                        checked={(localUser as any)?.showPointsToOthers !== false}
                        onChange={(e) => updatePreferences({ showPointsToOthers: e.target.checked })}
                      />
                      <span style={{ fontSize: '12px' }}>{(localUser as any)?.showPointsToOthers === false ? 'مخفية' : 'مرئية'}</span>
                    </label>
                  </div>

                  {/* رسائل النظام في الغرف */}
                  <div className="compact-vertical" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                    padding: '8px',
                    borderRadius: '6px',
                    background: 'rgba(255,255,255,0.04)'
                  }}>
                    <span style={{ color: '#fff', fontSize: '14px' }}>إظهار رسائل النظام (انضمام/مغادرة)</span>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#ddd' }}>
                      <input
                        type="checkbox"
                        checked={(localUser as any)?.showSystemMessages !== false}
                        onChange={(e) => updatePreferences({ showSystemMessages: e.target.checked })}
                      />
                      <span style={{ fontSize: '12px' }}>{(localUser as any)?.showSystemMessages === false ? 'إخفاء' : 'إظهار'}</span>
                    </label>
                  </div>

                  {/* أصوات الموقع */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                    padding: '8px',
                    borderRadius: '6px',
                    background: 'rgba(255,255,255,0.04)'
                  }}>
                    <span style={{ color: '#fff', fontSize: '14px' }}>الأصوات في الموقع</span>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#ddd' }}>
                      <input
                        type="checkbox"
                        checked={(localUser as any)?.globalSoundEnabled !== false}
                        onChange={(e) => updatePreferences({ globalSoundEnabled: e.target.checked })}
                      />
                      <span style={{ fontSize: '12px' }}>{(localUser as any)?.globalSoundEnabled === false ? 'مطفأة' : 'مفعلة'}</span>
                    </label>
                  </div>
                </div>

                {/* خيارات المشرفين */}
                {currentUser && (
                  currentUser.userType === 'owner' || 
                  currentUser.userType === 'admin' || 
                  currentUser.userType === 'moderator'
                ) && (
                  <div style={{ marginTop: '16px' }}>
                    <h5 style={{ 
                      margin: '0 0 8px 0', 
                      fontSize: '13px', 
                      fontWeight: 'bold', 
                      color: '#fff',
                      borderBottom: '1px solid rgba(255,255,255,0.1)',
                      paddingBottom: '4px'
                    }}>خيارات المشرفين</h5>
                    <div className="additional-details">
                  {currentUser && (
                    currentUser.userType === 'owner' || 
                    currentUser.userType === 'admin' || 
                    currentUser.userType === 'moderator'
                  ) && (
                    <>
                      <p onClick={() => setCurrentEditType('theme')} style={{ cursor: 'pointer' }}>
                        🎨 لون الملف الشخصي: <span>اضغط للتغيير</span>
                      </p>
                      <p onClick={() => setCurrentEditType('effects')} style={{ cursor: 'pointer' }}>
                        ✨ تأثيرات حركية: <span>اضغط للتغيير</span>
                      </p>
                    </>
                  )}
                  
                  {currentUser && (
                    currentUser.userType === 'owner' || 
                    currentUser.userType === 'admin' || 
                    currentUser.userType === 'moderator'
                  ) && (
                    <div
                      className="compact-vertical"
                      style={{
                        marginTop: '8px',
                        padding: '8px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.08)',
                        background: 'rgba(255,255,255,0.04)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <strong>🎵 موسيقى البروفايل</strong>
                        {localUser?.profileMusicUrl && (
                          <span style={{ fontSize: '11px', color: '#4caf50' }}>✅ نشط</span>
                        )}
                      </div>

                      <div style={{ marginTop: '8px' }}>
                        {localUser?.profileMusicUrl ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: '12px', color: '#fff', flex: 1 }}>
                              🎵 {musicTitle || 'موسيقى البروفايل'}
                            </span>
                            <button
                              onClick={async () => {
                                if (!confirm('هل أنت متأكد من حذف موسيقى البروفايل؟')) return;
                                
                                try {
                                  setIsLoading(true);
                                  await apiRequest(`/api/users/${localUser?.id}/profile-music`, { method: 'DELETE' });
                                  
                                  // إيقاف الموسيقى وتنظيف المشغل
                                  if (audioRef.current) { 
                                    audioRef.current.pause(); 
                                    audioRef.current.src = ''; 
                                  }
                                  
                                  // تحديث البيانات المحلية
                                  updateUserData({ 
                                    profileMusicUrl: undefined, 
                                    profileMusicTitle: '', 
                                    profileMusicEnabled: false 
                                  });
                                  
                                  setMusicTitle('');
                                  setMusicEnabled(false);
                                  setIsPlaying(false);
                                  setAudioError(false);
                                  
                                  toast({ title: 'تم ✅', description: 'تم حذف موسيقى البروفايل' });
                                } catch (err: any) {
                                  console.error('خطأ في حذف الموسيقى:', err);
                                  toast({ 
                                    title: 'خطأ', 
                                    description: err?.message || 'فشل حذف الموسيقى', 
                                    variant: 'destructive' 
                                  });
                                } finally {
                                  setIsLoading(false);
                                }
                              }}
                              style={{ 
                                padding: '4px 8px', 
                                borderRadius: '6px', 
                                background: '#dc2626', 
                                color: '#fff',
                                border: 'none',
                                fontSize: '11px',
                                cursor: 'pointer'
                              }}
                              disabled={isLoading}
                            >
                              {isLoading ? '⏳' : '🗑️'} حذف
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => musicFileInputRef.current?.click()}
                            style={{ 
                              padding: '8px 12px', 
                              borderRadius: '8px', 
                              border: '1px solid rgba(255,255,255,0.2)', 
                              background: 'rgba(255,255,255,0.08)', 
                              color: '#fff',
                              width: '100%',
                              cursor: 'pointer'
                            }}
                          >
                            📁 اختر ملف صوتي (MP3, WAV, OGG)
                          </button>
                        )}
                      </div>
                      <input
                        ref={musicFileInputRef}
                        type="file"
                        accept="audio/*"
                        style={{ display: 'none' }}
                        onChange={async (e) => {
                                try {
                                  // التحقق من الصلاحيات
                                  const isAuthorized = currentUser && (
                                    currentUser.userType === 'owner' || 
                                    currentUser.userType === 'admin' || 
                                    currentUser.userType === 'moderator'
                                  );
                                  
                                  if (!isAuthorized) {
                                    toast({
                                      title: 'غير مسموح',
                                      description: 'هذه الميزة متاحة للمشرفين فقط',
                                      variant: 'destructive',
                                    });
                                    return;
                                  }

                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  
                                  // التحقق من نوع الملف
                                  const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/webm', 'audio/wav', 'audio/m4a', 'audio/aac', 'audio/x-m4a', 'audio/mp4'];
                                  if (!allowedTypes.includes(file.type)) {
                                    toast({
                                      title: 'نوع ملف غير مدعوم',
                                      description: 'يرجى اختيار ملف صوتي (MP3, WAV, OGG, M4A, MP4)',
                                      variant: 'destructive',
                                    });
                                    return;
                                  }
                                  
                                  // التحقق من حجم الملف (3 ميجا كحد أقصى بسبب قيود الخادم)
                                  console.log('حجم الملف:', file.size, 'بايت =', (file.size / (1024 * 1024)).toFixed(2), 'ميجابايت');
                                  if (file.size > 3 * 1024 * 1024) {
                                    toast({
                                      title: 'حجم الملف كبير جداً',
                                      description: `الحد الأقصى لحجم الملف هو 3 ميجابايت. حجم الملف الحالي: ${(file.size / (1024 * 1024)).toFixed(2)} ميجابايت. يرجى ضغط الملف أو اختيار ملف أصغر.`,
                                      variant: 'destructive',
                                    });
                                    return;
                                  }
                                  
                                  setIsLoading(true);
                                  const fd = new FormData();
                                  fd.append('music', file);
                                  if (musicTitle) fd.append('title', musicTitle);

                                  let url: string | undefined;
                                  let title: string | undefined;

                                  const res = await api.upload(`/api/upload/profile-music`, fd, { timeout: 0, onProgress: () => {} });
                                  if (!(res as any)?.success) {
                                    throw new Error((res as any)?.error || 'فشل رفع الملف');
                                  }
                                  url = (res as any)?.url;
                                  title = (res as any)?.title;
                                  
                                  if (url) {
                                    updateUserData({ profileMusicUrl: url, profileMusicTitle: title, profileMusicEnabled: true });
                                    setMusicEnabled(true);
                                    setAudioError(false);
                                    
                                    // تحديث مشغل الصوت
                                    if (audioRef.current) {
                                      audioRef.current.src = url;
                                      audioRef.current.volume = Math.max(0, Math.min(1, (musicVolume || 70) / 100));
                                      audioRef.current.load(); // إعادة تحميل الصوت
                                      
                                      // محاولة التشغيل بعد التحميل
                                      setTimeout(async () => {
                                        try {
                                          await audioRef.current?.play();
                                        } catch (playErr) {
                                          }
                                      }, 500);
                                    }
                                    
                                    toast({ title: 'تم ✅', description: 'تم تحديث موسيقى البروفايل بنجاح' });
                                  }
                                } catch (err: any) {
                                  console.error('خطأ في رفع الموسيقى:', err);
                                  let msg = err?.message || 'فشل رفع الملف الصوتي. تأكد من نوع وحجم الملف.';
                                  
                                  if (err?.status === 413) {
                                    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
                                    const tips = getAudioCompressionTips(parseFloat(fileSizeMB));
                                    const canCompress = canCompressAudio(file);
                                    
                                    msg = `حجم الملف كبير جداً (${fileSizeMB} ميجابايت). هناك قيود في الخادم. الحد الأقصى الآمن هو 3 ميجابايت.\n\n`;
                                    
                                    if (canCompress) {
                                      msg += `💡 يمكن ضغط هذا النوع من الملفات:\n`;
                                    } else {
                                      msg += `💡 نصائح لتقليل الحجم:\n`;
                                    }
                                    
                                    msg += tips.slice(0, 2).join('\n');
                                  }
                                  
                                  toast({ 
                                    title: 'خطأ في رفع الملف', 
                                    description: msg, 
                                    variant: 'destructive' 
                                  });
                                } finally {
                                  setIsLoading(false);
                                  try { 
                                    if (e.target) (e.target as HTMLInputElement).value = ''; 
                                  } catch {}
                                }
                              }}
                            />
                    </div>
                  )}
                </div>
              </div>
            )}
        </div>
        )}

        {/* مؤشر التحميل */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl z-30">
            <div className="bg-white/90 backdrop-blur-md rounded-lg p-4 flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-700 font-medium">جاري الحفظ...</span>
            </div>
          </div>
        )}

        {/* Tab Content - Other (Friends) - فقط للمستخدمين الآخرين */}
        {activeTab === 'other' && localUser?.id !== currentUser?.id && (
          <div style={{ 
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.04)'
          }}>
            <h4 style={{ 
              margin: '0 0 12px 0', 
              fontSize: '14px', 
              fontWeight: 'bold', 
              color: '#fff',
              textAlign: 'center',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              paddingBottom: '8px'
            }}>
              الأصدقاء
            </h4>
            
            {localUser?.id === currentUser?.id ? (
              <div>
                {loadingFriends ? (
                  <div style={{ textAlign: 'center', color: '#888', fontSize: '14px' }}>
                    جاري تحميل الأصدقاء...
                  </div>
                ) : friends.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#888', fontSize: '14px' }}>
                    لا يوجد أصدقاء بعد
                  </div>
                ) : (
                  <div>
                    {friends.map(friend => (
                      <div key={friend.id} className="compact-vertical" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '8px',
                        padding: '8px',
                        borderRadius: '6px',
                        background: 'rgba(255,255,255,0.04)'
                      }}>
                        <img 
                          src={friend.profileImage || '/default-avatar.png'} 
                          alt={friend.username}
                          style={{ width: '32px', height: '32px', borderRadius: '50%' }}
                        />
                        <span style={{ color: '#fff', fontSize: '14px' }}>{friend.username}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                {loadingFriends ? (
                  <div style={{ textAlign: 'center', color: '#888', fontSize: '14px' }}>
                    جاري تحميل الأصدقاء...
                  </div>
                ) : friends.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#888', fontSize: '14px' }}>
                    لا يوجد أصدقاء بعد
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                    gap: '12px',
                    maxHeight: '300px',
                    overflowY: 'auto'
                  }}>
                    {friends.map((friend) => (
                      <div
                        key={friend.id}
                        onClick={() => onUserClick?.(friend)}
                        className="compact-vertical"
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          padding: '8px',
                          borderRadius: '8px',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                        }}
                      >
                        <div style={{
                          width: '50px',
                          height: '50px',
                          borderRadius: '50%',
                          overflow: 'hidden',
                          marginBottom: '6px',
                          border: '2px solid rgba(255,255,255,0.2)'
                        }}>
                          <img
                            src={getProfileImageSrc(friend.profileImage)}
                            alt={friend.username}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                          />
                        </div>
                        <span style={{
                          fontSize: '12px',
                          color: friend.usernameColor || '#fff',
                          fontWeight: 'bold',
                          textAlign: 'center',
                          wordBreak: 'break-word',
                          lineHeight: '1.2'
                        }}>
                          {friend.username}
                        </span>
                        {friend.isOnline && (
                          <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#4ade80',
                            marginTop: '2px'
                          }} />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
          </div>

          {/* Hidden File Inputs */}
          {localUser?.id === currentUser?.id && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, 'banner')}
                disabled={isLoading}
                style={{ display: 'none' }}
              />
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, 'profile')}
                disabled={isLoading}
              />
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleStoryUpload}
                disabled={isLoading}
                title="رفع حالة (صورة/فيديو حتى 30 ثانية)"
                style={{ display: 'none' }}
              />
            </>
          )}
        </div>
      </div>

      {/* Edit Modal - exact match to original */}
      {currentEditType && (user.id === currentUser?.id || currentEditType === 'sendPoints') && (
        <div className="edit-modal">
          <div className="edit-content">
            <h3>
              {currentEditType === 'name' && 'تعديل الاسم'}
              {currentEditType === 'status' && 'تعديل الحالة'}
              {currentEditType === 'gender' && 'تعديل الجنس'}
              {currentEditType === 'country' && 'تعديل البلد'}
              {currentEditType === 'age' && 'تعديل العمر'}
              {currentEditType === 'socialStatus' && 'تعديل الحالة الاجتماعية'}
              {currentEditType === 'theme' && '🎨 اختيار لون الملف الشخصي (خلفية الصندوق)'}
              {currentEditType === 'effects' && '✨ تعديل التأثيرات الحركية'}
              {currentEditType === 'sendPoints' && 'إرسال النقاط'}
            </h3>

            {currentEditType === 'theme' ? (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {themes.map((theme) => (
                  <div
                    key={theme.value}
                    className={`theme-option ${selectedTheme === theme.preview ? 'selected' : ''}`}
                    onClick={() => handleThemeChange(theme.preview)}
                  >
                    <div className="theme-preview" style={{ background: theme.preview }} />
                    <div className="theme-name">
                      {theme.emoji} {theme.name}
                    </div>
                  </div>
                ))}
              </div>
            ) : currentEditType === 'effects' ? (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {effects.map((effect) => (
                  <div
                    key={effect.value}
                    className={`theme-option ${selectedEffect === effect.value ? 'selected' : ''}`}
                    onClick={() => handleEffectChange(effect.value)}
                  >
                    <div
                      className="theme-preview"
                      style={{
                        background: 'linear-gradient(45deg, #ff7c00, #e10026, #800e8c, #1a004d)',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {effect.emoji}
                    </div>
                    <div>
                      <div className="theme-name">
                        {effect.emoji} {effect.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#ccc', marginTop: '2px' }}>
                        {effect.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : currentEditType === 'sendPoints' ? (
              <div>
                <div
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <div style={{ fontSize: '11px', color: '#ccc', marginBottom: '8px' }}>
                    {currentUser?.userType === 'owner' || currentUser?.role === 'owner' ? (
                      <>نقاطك الحالية: غير محدودة للمالك</>
                    ) : (
                      <>نقاطك الحالية: {formatPoints(currentUser?.points || 0)}</>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="number"
                      placeholder="عدد النقاط"
                      value={pointsToSend}
                      onChange={(e) => setPointsToSend(e.target.value)}
                      style={{
                        flex: '1',
                        padding: '8px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255,255,255,0.2)',
                        background: 'rgba(255,255,255,0.1)',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                      min="1"
                      {...(currentUser?.userType === 'owner' || currentUser?.role === 'owner'
                        ? {}
                        : { max: currentUser?.points || 0 })}
                      disabled={sendingPoints}
                      autoFocus
                    />
                    <button
                      onClick={handleSendPoints}
                      disabled={sendingPoints || !pointsToSend || parseInt(pointsToSend) <= 0}
                      style={{
                        background: sendingPoints
                          ? 'rgba(255,193,7,0.5)'
                          : 'linear-gradient(135deg, #ffc107, #ff8f00)',
                        color: '#000',
                        border: 'none',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        cursor: sendingPoints ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s ease',
                      }}
                    >
                      {sendingPoints ? '⏳' : ''} إرسال
                    </button>
                  </div>

                  <div style={{ fontSize: '10px', color: '#aaa' }}>
                    {currentUser?.userType === 'owner' || currentUser?.role === 'owner' ? (
                      <>💡 لن يتم خصم النقاط من رصيدك، كونك المالك</>
                    ) : (
                      <>💡 سيتم خصم النقاط من رصيدك وإضافتها للمستخدم</>
                    )}
                  </div>
                </div>

                <div className="edit-buttons" style={{ marginTop: '12px' }}>
                  <button className="cancel-btn" onClick={closeEditModal}>
                    ❌ إلغاء
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="edit-field">
                  <label>
                    {currentEditType === 'name' && 'الاسم الجديد:'}
                    {currentEditType === 'status' && 'الحالة الجديدة:'}
                    {currentEditType === 'gender' && 'الجنس:'}
                    {currentEditType === 'country' && 'البلد:'}
                    {currentEditType === 'age' && 'العمر:'}
                    {currentEditType === 'socialStatus' && 'الحالة الاجتماعية:'}
                  </label>
                  {currentEditType === 'gender' ? (
                    <select value={editValue} onChange={(e) => setEditValue(e.target.value)} aria-label="اختيار الجنس">
                      <option value="">اختر...</option>
                      <option value="ذكر">👨 ذكر</option>
                      <option value="أنثى">👩 أنثى</option>
                    </select>
                  ) : currentEditType === 'country' ? (
                    <select value={editValue} onChange={(e) => setEditValue(e.target.value)} aria-label="اختيار البلد">
                      <option value="">اختر...</option>
                      <option value="🇸🇦 السعودية">🇸🇦 السعودية</option>
                      <option value="🇦🇪 الإمارات">🇦🇪 الإمارات</option>
                      <option value="🇪🇬 مصر">🇪🇬 مصر</option>
                      <option value="🇯🇴 الأردن">🇯🇴 الأردن</option>
                      <option value="🇱🇧 لبنان">🇱🇧 لبنان</option>
                      <option value="🇸🇾 سوريا">🇸🇾 سوريا</option>
                      <option value="🇮🇶 العراق">🇮🇶 العراق</option>
                      <option value="🇰🇼 الكويت">🇰🇼 الكويت</option>
                      <option value="🇶🇦 قطر">🇶🇦 قطر</option>
                      <option value="🇧🇭 البحرين">🇧🇭 البحرين</option>
                      <option value="🇴🇲 عمان">🇴🇲 عمان</option>
                      <option value="🇾🇪 اليمن">🇾🇪 اليمن</option>
                      <option value="🇱🇾 ليبيا">🇱🇾 ليبيا</option>
                      <option value="🇹🇳 تونس">🇹🇳 تونس</option>
                      <option value="🇩🇿 الجزائر">🇩🇿 الجزائر</option>
                      <option value="🇲🇦 المغرب">🇲🇦 المغرب</option>
                    </select>
                  ) : currentEditType === 'socialStatus' ? (
                    <select value={editValue} onChange={(e) => setEditValue(e.target.value)} aria-label="اختيار الحالة الاجتماعية">
                      <option value="">اختر...</option>
                      <option value="أعزب">💚 أعزب</option>
                      <option value="متزوج">متزوج</option>
                      <option value="مطلق">💔 مطلق</option>
                      <option value="أرمل">🖤 أرمل</option>
                    </select>
                  ) : (
                    <input
                      type={currentEditType === 'age' ? 'number' : 'text'}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      autoFocus
                    />
                  )}
                </div>
                <div className="edit-buttons">
                  <button className="save-btn" onClick={handleSaveEdit} disabled={isLoading}>
                    {isLoading ? 'جاري الحفظ...' : '💾 حفظ'}
                  </button>
                  <button className="cancel-btn" onClick={closeEditModal}>
                    ❌ إلغاء
                  </button>
                </div>
              </>
            )}

            {(currentEditType === 'theme' || currentEditType === 'effects') && (
              <div className="edit-buttons">
                <button className="cancel-btn" onClick={closeEditModal}>
                  ❌ إغلاق
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* إشعار إرسال النقاط */}
      <PointsSentNotification
        show={pointsSentNotification.show}
        points={pointsSentNotification.points}
        recipientName={pointsSentNotification.recipientName}
        onClose={() => setPointsSentNotification({ show: false, points: 0, recipientName: '' })}
      />
    </>
  );
}

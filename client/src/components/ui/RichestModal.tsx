import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { apiRequest } from '@/lib/queryClient';
import { getSocket } from '@/lib/socket';
import type { ChatUser } from '@/types/chat';
import { getImageSrc } from '@/utils/imageUtils';
import CountryFlag from '@/components/ui/CountryFlag';
import { getFinalUsernameColor, getUserListItemClasses, getUserListItemStyles } from '@/utils/themeUtils';
import ProfileImage from '@/components/chat/ProfileImage';
import UserRoleBadge from '@/components/chat/UserRoleBadge';
import SimpleUserMenu from '@/components/chat/SimpleUserMenu';
import { Badge } from '@/components/ui/badge';
import { useQueryClient } from '@tanstack/react-query';
import { ListLoader } from '@/components/ui/loading';

interface RichestModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: ChatUser | null;
  onUserClick?: (e: React.MouseEvent, user: ChatUser) => void;
}

export default function RichestModal({ isOpen, onClose, currentUser, onUserClick }: RichestModalProps) {
  const [vipUsers, setVipUsers] = useState<ChatUser[]>([]);
  const [candidates, setCandidates] = useState<ChatUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);
  const queryClient = useQueryClient();

  const canManage = useMemo(
    () => !!currentUser && ['owner', 'admin'].includes(currentUser.userType),
    [currentUser]
  );

  const isModerator = useMemo(
    () => !!currentUser && ['moderator', 'admin', 'owner'].includes(currentUser.userType),
    [currentUser]
  );

  const renderUserBadge = useCallback((user: ChatUser) => {
    if (!user) return null;
    return <UserRoleBadge user={user} size={20} />;
  }, []);

  const renderCountryFlag = useCallback((user: ChatUser) => <CountryFlag country={user.country} size={14} />, []);

  // تحميل مسبق للصور لتحسين الأداء
  const preloadImages = useCallback((users: ChatUser[]) => {
    users.forEach(user => {
      if (user.profileImage) {
        const img = new Image();
        img.src = getImageSrc(user.profileImage);
      }
    });
  }, []);

  // تطبيع بيانات المستخدم: إزالة قيم نصية غير صالحة لحقول الألوان/التأثير
  const normalizeUser = useCallback((u: any): ChatUser => {
    const cleaned: any = { ...u };
    if (cleaned && typeof cleaned.profileBackgroundColor === 'string') {
      const v = cleaned.profileBackgroundColor;
      if (v === 'null' || v === 'undefined' || v.trim() === '') {
        cleaned.profileBackgroundColor = null;
      }
    }
    if (cleaned && typeof cleaned.profileEffect === 'string') {
      const v = cleaned.profileEffect;
      if (v === 'null' || v === 'undefined') {
        cleaned.profileEffect = 'none';
      }
    }
    return cleaned as ChatUser;
  }, []);

  const normalizeUsers = useCallback((arr: any[]): ChatUser[] => {
    return Array.isArray(arr) ? arr.map((u) => normalizeUser(u)) : [];
  }, [normalizeUser]);

  useEffect(() => {
    if (!isOpen) return;
    let ignore = false;
    const controller = new AbortController();

    // تحميل فوري من الـ cache المحلي أولاً
    try {
      // جلب من localStorage أولاً لتجربة تحميل فوري
      const lsVip = localStorage.getItem('vip_cache');
      if (lsVip && !ignore) {
        try { 
          const parsedVip = JSON.parse(lsVip);
          if (Array.isArray(parsedVip) && parsedVip.length > 0) {
            const normalized = normalizeUsers(parsedVip);
            setVipUsers(normalized);
            preloadImages(normalized);
          }
        } catch {}
      }
      
      // جلب من React Query cache
      const cachedVip = queryClient.getQueryData<{ users: ChatUser[] }>(['/api/vip']);
      if (cachedVip?.users && !ignore) {
        const normalized = normalizeUsers(cachedVip.users);
        setVipUsers(normalized);
        preloadImages(normalized);
      }
      
      // جلب المرشحين للأدمن
      if (canManage) {
        const lsCand = localStorage.getItem('vip_candidates_cache');
        if (lsCand && !ignore) {
          try { 
            const parsedCand = JSON.parse(lsCand);
            if (Array.isArray(parsedCand)) {
              setCandidates(normalizeUsers(parsedCand)); 
            }
          } catch {}
        }
        const cachedCand = queryClient.getQueryData<{ users: ChatUser[] }>(['/api/vip/candidates']);
        if (cachedCand?.users && !ignore) {
          setCandidates(normalizeUsers(cachedCand.users));
        }
      }
    } catch {}

    // تحديث البيانات من الخادم في الخلفية
    const fetchVip = async () => {
      setError(null);
      // لا نعرض loading إذا كانت البيانات موجودة بالفعل
      if (!vipUsers.length) setLoading(true);
      
      try {
        const res = await apiRequest<{ users: ChatUser[] }>(`/api/vip?limit=10`, { signal: controller.signal });
        if (!ignore) {
          const normalized = normalizeUsers(res.users || []);
          setVipUsers(normalized);
          preloadImages(normalized);
          queryClient.setQueryData(['/api/vip'], { users: normalized });
          try { localStorage.setItem('vip_cache', JSON.stringify(normalized)); } catch {}
        }
        if (canManage) {
          try {
            const cand = await apiRequest<{ users: ChatUser[] }>(`/api/vip/candidates`, { signal: controller.signal });
            if (!ignore) {
              const normalizedCand = normalizeUsers(cand.users || []);
              setCandidates(normalizedCand);
              queryClient.setQueryData(['/api/vip/candidates'], { users: normalizedCand });
              try { localStorage.setItem('vip_candidates_cache', JSON.stringify(normalizedCand)); } catch {}
            }
          } catch {}
        }
      } catch (e: any) {
        if (!ignore) setError(e?.message || 'فشل في جلب قائمة VIP');
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    
    // تشغيل fetch في الخلفية مع تأخير قصير للسماح بالعرض الفوري
    setTimeout(fetchVip, 50);

    // Listen to realtime vipUpdated
    const handleVipMessage = (payload: any) => {
      if (payload?.type === 'vipUpdated') {
        const normalized = normalizeUsers(payload.users || []);
        setVipUsers(normalized);
        try { queryClient.setQueryData(['/api/vip'], { users: normalized }); } catch {}
        try { localStorage.setItem('vip_cache', JSON.stringify(normalized)); } catch {}
      }
    };

    try {
      const s = getSocket();
      socketRef.current = s;
      s.on('message', handleVipMessage);
    } catch {}

    return () => {
      ignore = true;
      try { controller.abort(); } catch {}
      if (socketRef.current) {
        try {
          socketRef.current.off('message', handleVipMessage);
        } catch {}
        socketRef.current = null;
      }
    };
  }, [isOpen, canManage, normalizeUsers, queryClient, vipUsers.length, preloadImages]);

  const handleAddVip = async (userId: number) => {
    try {
      setError(null);
      await apiRequest(`/api/vip`, { method: 'POST', body: { targetUserId: userId } });
      const res = await apiRequest<{ users: ChatUser[] }>(`/api/vip?limit=10`);
      setVipUsers(normalizeUsers(res.users || []));
    } catch (e: any) {
      setError(e?.message || 'فشل إضافة VIP. تأكد من اتصال قاعدة البيانات.');
    }
  };

  const handleRemoveVip = async (userId: number) => {
    try {
      setError(null);
      await apiRequest(`/api/vip/${userId}`, { method: 'DELETE' });
      setVipUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (e: any) {
      setError(e?.message || 'فشل حذف VIP. تأكد من اتصال قاعدة البيانات.');
    }
  };

  if (!isOpen) return null;

  const topTen = vipUsers.slice(0, 10);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 modal-overlay" onClick={onClose} />

      <div className="relative w-[92vw] max-w-[28rem] sm:max-w-[32rem] bg-card rounded-xl overflow-hidden shadow-2xl animate-fade-in">
        <div className="relative richest-header px-4 py-3 modern-nav">
          <button
            onClick={onClose}
            className="richest-close-btn absolute left-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center"
            aria-label="إغلاق"
            title="إغلاق"
          >
            ×
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto bg-background">
          {loading && vipUsers.length === 0 && <ListLoader items={8} itemHeight="h-12" className="p-3" />}
          {error && (
            <div className="text-center text-destructive py-2 text-sm">
              {error}
              <button
                className="ml-2 underline text-xs"
                onClick={async () => {
                  try {
                    setError(null);
                    setLoading(true);
                    const res = await apiRequest<{ users: ChatUser[] }>(`/api/vip`);
                    const normalized = normalizeUsers(res.users || []);
                    setVipUsers(normalized);
                    try { queryClient.setQueryData(['/api/vip'], { users: normalized }); } catch {}
                  } catch (e: any) {
                    setError(e?.message || 'فشل في الجلب');
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                إعادة المحاولة
              </button>
            </div>
          )}

          <ul className="space-y-1">
            {topTen.map((u, idx) => (
              <li key={u.id} className="relative -mx-4 list-none">
                <SimpleUserMenu targetUser={u} currentUser={currentUser || null} showModerationActions={isModerator}>
                  <div
                    className={`flex items-center gap-2 p-3 px-4 min-h-[56px] rounded-none border-b border-border transition-colors duration-200 cursor-pointer w-full ${getUserListItemClasses(u) || 'bg-card hover:bg-accent/10'}`}
                    style={getUserListItemStyles(u)}
                    onClick={(e) => onUserClick && onUserClick(e as any, u)}
                  >
                    {/* حذف الأرقام للثلاثة الأوائل وإظهار الميدالية فقط */}
                    {idx < 3 ? (
                      <span className={`rank-medal ${idx === 0 ? 'rank-first' : idx === 1 ? 'rank-second' : 'rank-third'}`} aria-label="rank-medal">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                      </span>
                    ) : (
                      <span
                        className="rank-badge"
                        title={`الترتيب ${idx + 1}`}
                      >
                        {idx + 1}
                      </span>
                    )}
                    <ProfileImage user={u} size="small" className="" hideRoleBadgeOverlay={true} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-base font-medium transition-colors duration-300"
                            style={{ color: getFinalUsernameColor(u) }}
                            title={u.username}
                          >
                            {u.username}
                          </span>
                          {u.isMuted && <span className="text-yellow-400 text-xs">🔇</span>}
                        </div>
                        <div className="flex items-center gap-1">
                          {renderUserBadge(u)}
                          {renderCountryFlag(u)}
                          {canManage && (
                            <button
                              className="text-[10px] px-2 py-0.5 rounded bg-destructive/10 hover:bg-destructive/20 text-destructive ml-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveVip(u.id);
                              }}
                            >
                              إزالة
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </SimpleUserMenu>
              </li>
            ))}
          </ul>

          {/* قسم المرشحين للأدمن */}
          {canManage && candidates.length > 0 && (
            <div className="border-t border-border p-3">
              <div className="text-sm text-muted-foreground mb-2">مرشحون للإضافة:</div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {candidates.map((c) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <img
                      src={getImageSrc(c.profileImage || '/default_avatar.svg')}
                      alt={c.username}
                      className="w-6 h-6 rounded-full"
                    />
                    <div className="flex-1 text-sm">{c.username}</div>
                    <button
                      className="text-xs px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary"
                      onClick={() => handleAddVip(c.id)}
                    >
                      إضافة
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

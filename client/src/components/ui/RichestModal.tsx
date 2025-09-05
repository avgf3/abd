import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { apiRequest } from '@/lib/queryClient';
import { getSocket } from '@/lib/socket';
import type { ChatUser } from '@/types/chat';
import { getImageSrc } from '@/utils/imageUtils';
import { getCountryFlag } from '@/utils';
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

  const getCountryEmoji = useCallback((country?: string): string | null => getCountryFlag(country), []);

  const renderCountryFlag = useCallback(
    (user: ChatUser) => {
      const emoji = getCountryEmoji(user.country);
      const boxStyle: React.CSSProperties = {
        width: 20,
        height: 20,
        borderRadius: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        border: 'none',
      };

      if (emoji) {
        return (
          <span style={boxStyle} title={user.country}>
            <span style={{ fontSize: 14, lineHeight: 1 }}>{emoji}</span>
          </span>
        );
      }

      return null;
    },
    [getCountryEmoji]
  );

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

    // Prefill from cache to avoid loading flash
    try {
      const cachedVip = queryClient.getQueryData<{ users: ChatUser[] }>(['/api/vip']);
      if (cachedVip?.users && !ignore) {
        setVipUsers(normalizeUsers(cachedVip.users));
      }
      if (canManage) {
        const cachedCand = queryClient.getQueryData<{ users: ChatUser[] }>(['/api/vip/candidates']);
        if (cachedCand?.users && !ignore) {
          setCandidates(normalizeUsers(cachedCand.users));
        }
      }
    } catch {}

    const fetchVip = async () => {
      setError(null);
      if (!vipUsers.length) setLoading(true);
      try {
        const res = await apiRequest<{ users: ChatUser[] }>(`/api/vip?limit=10`, { signal: controller.signal });
        if (!ignore) {
          const normalized = normalizeUsers(res.users || []);
          setVipUsers(normalized);
          queryClient.setQueryData(['/api/vip'], { users: normalized });
        }
        if (canManage) {
          try {
            const cand = await apiRequest<{ users: ChatUser[] }>(`/api/vip/candidates`, { signal: controller.signal });
            if (!ignore) {
              const normalizedCand = normalizeUsers(cand.users || []);
              setCandidates(normalizedCand);
              queryClient.setQueryData(['/api/vip/candidates'], { users: normalizedCand });
            }
          } catch {}
        }
      } catch (e: any) {
        if (!ignore) setError(e?.message || 'فشل في جلب قائمة VIP');
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    fetchVip();

    // Listen to realtime vipUpdated
    const handleVipMessage = (payload: any) => {
      if (payload?.type === 'vipUpdated') {
        const normalized = normalizeUsers(payload.users || []);
        setVipUsers(normalized);
        try { queryClient.setQueryData(['/api/vip'], { users: normalized }); } catch {}
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
  }, [isOpen, canManage, normalizeUsers, queryClient, vipUsers.length]);

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

      <div className="relative w-[90vw] max-w-[20rem] sm:max-w-[22rem] bg-card rounded-xl overflow-hidden shadow-2xl animate-fade-in">
        <div className="bg-primary p-3 text-primary-foreground flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">👑</span>
            <h3 className="font-bold text-lg">الأثرياء</h3>
          </div>
          <button
            onClick={onClose}
            className="text-primary-foreground/80 hover:text-primary-foreground text-xl"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto bg-background">
          {loading && <ListLoader items={8} itemHeight="h-12" className="p-3" />}
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
                    className={`flex items-center gap-2 p-2 px-4 rounded-none border-b border-border transition-colors duration-200 cursor-pointer w-full ${getUserListItemClasses(u) || 'bg-card hover:bg-accent/10'}`}
                    style={getUserListItemStyles(u)}
                    onClick={(e) => onUserClick && onUserClick(e as any, u)}
                  >
                    <ProfileImage user={u} size="small" className="" hideRoleBadgeOverlay={true} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {/* رتبة رقمية مثبتة على يمين الحاوية */}
                          <Badge
                            variant="secondary"
                            className="text-[11px] min-w-[22px] h-5 px-2 flex items-center justify-center"
                            title={`الترتيب ${idx + 1}`}
                          >
                            {idx + 1}
                          </Badge>
                          {/* ميدالية لأعلى 3 فقط (اختياري) */}
                          {idx < 3 && (
                            <span className="text-base" aria-label="rank-medal">
                              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                            </span>
                          )}
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

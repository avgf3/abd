import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { apiRequest } from '@/lib/queryClient';
import { getSocket } from '@/lib/socket';
import type { ChatUser } from '@/types/chat';
import { getFinalUsernameColor, getUserListItemClasses, getUserListItemStyles } from '@/utils/themeUtils';
import ProfileImage from '@/components/chat/ProfileImage';
import UserRoleBadge from '@/components/chat/UserRoleBadge';
import SimpleUserMenu from '@/components/chat/SimpleUserMenu';

interface RichestModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: ChatUser | null;
  onUserClick?: (e: React.MouseEvent, user: ChatUser) => void;
}

export default function RichestModal({ isOpen, onClose, currentUser, onUserClick }: RichestModalProps) {
  const [vipUsers, setVipUsers] = useState<ChatUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);

  const isModerator = useMemo(
    () => !!currentUser && ['moderator', 'admin', 'owner'].includes(currentUser.userType),
    [currentUser]
  );

  const renderUserBadge = useCallback((user: ChatUser) => {
    if (!user) return null;
    return <UserRoleBadge user={user} size={20} />;
  }, []);

  const getCountryEmoji = useCallback((country?: string): string | null => {
    if (!country) return null;
    const token = country.trim().split(' ')[0];
    return token || null;
  }, []);

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

      return (
        <span style={boxStyle} title="لم يتم تحديد الدولة">
          <span style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1 }}>?</span>
        </span>
      );
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
    const fetchVip = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiRequest<{ users: ChatUser[] }>(`/api/vip`);
        if (!ignore) setVipUsers(normalizeUsers(res.users || []));
      } catch (e: any) {
        if (!ignore) setError(e?.message || 'فشل في جلب قائمة VIP');
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    fetchVip();

    // Listen to realtime vipUpdated
    try {
      const s = getSocket();
      socketRef.current = s;
      s.on('message', (payload: any) => {
        if (payload?.type === 'vipUpdated') {
          setVipUsers(normalizeUsers(payload.users || []));
        }
      });
    } catch {}

    return () => {
      ignore = true;
      if (socketRef.current) {
        try {
          socketRef.current.off('message');
        } catch {}
        socketRef.current = null;
      }
    };
  }, [isOpen, normalizeUsers]);

  // تمت إزالة إدارة المرشحين والإضافة/الحذف ليتطابق مع حاوية قائمة المتصلين

  if (!isOpen) return null;

  const topTen = vipUsers.slice(0, 10);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 modal-overlay" onClick={onClose} />
      <div className="relative w-[90vw] max-w-[20rem] sm:max-w-[22rem] bg-card rounded-xl overflow-hidden shadow-2xl animate-fade-in">
        {/* زر إغلاق بسيط في الأعلى */}
        <button
          onClick={onClose}
          className="absolute top-2 left-2 text-foreground/70 hover:text-foreground z-10"
          aria-label="close"
        >
          ✕
        </button>

        <div className="max-h-[70vh] overflow-y-auto bg-background p-4">
          {/* لافتة عنوان مطابقة لقائمة المتصلين */}
          <div className="bg-primary text-primary-foreground rounded-md">
            <div className="flex items-center justify-between p-2">
              <div className="flex items-center gap-2 font-bold text-base">
                الأثرياء
                <span className="bg-white/20 text-white px-2 py-0.5 rounded-full text-xs font-semibold">
                  {topTen.length}
                </span>
              </div>
            </div>
          </div>

          {loading && <div className="text-center text-muted-foreground py-4">جاري التحميل...</div>}
          {error && <div className="text-center text-destructive py-2 text-sm">{error}</div>}

          <ul className="space-y-1 mt-3">
            {topTen.map((u) => (
              <li key={u.id} className="relative -mx-4">
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
                          <UserRoleBadge user={u} size={20} />
                          {renderCountryFlag(u)}
                        </div>
                      </div>
                    </div>
                  </div>
                </SimpleUserMenu>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useMemo, useRef, useState } from 'react';

import { apiRequest } from '@/lib/queryClient';
import { getSocket } from '@/lib/socket';
import type { ChatUser } from '@/types/chat';
import { getImageSrc } from '@/utils/imageUtils';
import { getFinalUsernameColor } from '@/utils/themeUtils';

interface RichestModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: ChatUser | null;
}

export default function RichestModal({ isOpen, onClose, currentUser }: RichestModalProps) {
  const [vipUsers, setVipUsers] = useState<ChatUser[]>([]);
  const [candidates, setCandidates] = useState<ChatUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);

  const canManage = useMemo(
    () => !!currentUser && ['owner', 'admin'].includes(currentUser.userType),
    [currentUser]
  );

  useEffect(() => {
    if (!isOpen) return;
    let ignore = false;
    const fetchVip = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiRequest<{ users: ChatUser[] }>(`/api/vip`);
        if (!ignore) setVipUsers(res.users || []);
        if (canManage) {
          try {
            const cand = await apiRequest<{ users: ChatUser[] }>(`/api/vip/candidates`);
            if (!ignore) setCandidates(cand.users || []);
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
    try {
      const s = getSocket();
      socketRef.current = s;
      s.on('message', (payload: any) => {
        if (payload?.type === 'vipUpdated') {
          setVipUsers(payload.users || []);
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
  }, [isOpen, canManage]);

  const handleAddVip = async (userId: number) => {
    try {
      setError(null);
      await apiRequest(`/api/vip`, { method: 'POST', body: { targetUserId: userId } });
      const res = await apiRequest<{ users: ChatUser[] }>(`/api/vip`);
      setVipUsers(res.users || []);
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
          {loading && <div className="text-center text-muted-foreground py-4">جاري التحميل...</div>}
          {error && <div className="text-center text-destructive py-2 text-sm">{error}</div>}

          <ul className="divide-y divide-border">
            {topTen.map((u, idx) => (
              <li
                key={u.id}
                className="flex items-center gap-3 p-3 hover:bg-accent/10 transition-colors"
              >
                {/* رقم الترتيب */}
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-sm">
                  {idx + 1}
                </div>

                {/* صورة المستخدم */}
                <img
                  src={getImageSrc(u.profileImage || '/default_avatar.svg')}
                  alt={u.username}
                  className="w-10 h-10 rounded-full object-cover"
                />

                {/* اسم المستخدم */}
                <div className="flex-1">
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
                </div>

                {/* أيقونة التاج للأول والثاني والثالث */}
                {idx < 3 && (
                  <span className="text-lg">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                )}

                {/* زر الإزالة للأدمن */}
                {canManage && (
                  <button
                    className="text-xs px-2 py-1 rounded bg-destructive/10 hover:bg-destructive/20 text-destructive"
                    onClick={() => handleRemoveVip(u.id)}
                  >
                    إزالة
                  </button>
                )}
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

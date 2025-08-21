import React, { useEffect, useMemo, useRef, useState } from 'react';

import VipAvatar from './VipAvatar';
import { apiRequest } from '@/lib/queryClient';
import { getSocket } from '@/lib/socket';
import type { ChatUser } from '@/types/chat';
import { getImageSrc } from '@/utils/imageUtils';

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

      <div className="relative w-[90vw] max-w-[20rem] sm:max-w-[22rem] bg-white rounded-xl overflow-hidden shadow-2xl animate-fade-in">
        <div className="bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 p-3 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/svgs/crown.svg" alt="crown" className="w-6 h-6" />
            <h3 className="font-extrabold text-lg">الأثرياء</h3>
          </div>
          <button onClick={onClose} className="text-white/90 hover:text-white">
            ✕
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto bg-gradient-to-b from-zinc-900 via-zinc-800 to-black p-2">
          {loading && (
            <div className="text-center text-white/80 py-4">جاري التحميل...</div>
          )}
          {error && (
            <div className="text-center text-red-300 py-2 text-sm">{error}</div>
          )}
          {topTen.map((u, idx) => (
            <div
              key={u.id}
              className={`mb-2 rounded-xl p-2 shadow relative ${getRowBackground(idx + 1)} text-white`}
            >
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-black/40 border border-white/20 text-yellow-300 font-bold">
                  {idx + 1}
                </div>
                <VipAvatar
                  src={getImageSrc(u.profileImage || '/default_avatar.svg')}
                  alt={u.username}
                  size={54}
                  frame={(idx + 1) as any}
                />
                <div className="flex-1">
                  <div className="font-bold leading-snug">{u.username}</div>
                  <div className="text-xs opacity-70">VIP</div>
                </div>
                {canManage ? (
                  <button
                    className="text-white/90 hover:text-white text-sm px-2 py-1 rounded bg-red-600/80 hover:bg-red-600"
                    onClick={() => handleRemoveVip(u.id)}
                  >
                    إزالة
                  </button>
                ) : (
                  <img src="/svgs/crown.svg" alt="crown" className="w-6 h-6 opacity-90" />
                )}
              </div>
            </div>
          ))}
          {canManage && candidates.length > 0 && (
            <div className="mt-3 rounded-xl p-2 bg-zinc-800/80 text-white">
              <div className="text-xs opacity-80 mb-2">مرشحون (Owners/Admins)</div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {candidates.map((c) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <img
                      src={getImageSrc(c.profileImage || '/default_avatar.svg')}
                      alt={c.username}
                      className="w-7 h-7 rounded-full"
                    />
                    <div className="flex-1 text-sm">{c.username}</div>
                    <button
                      className="text-xs px-2 py-1 rounded bg-emerald-600/80 hover:bg-emerald-600"
                      onClick={() => handleAddVip(c.id)}
                    >
                      إضافة VIP
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

function getRowBackground(rank: number): string {
  // ألوان قريبة من الصورة: أشرطة متدرجة مختلفة
  switch (rank) {
    case 1:
      return 'bg-gradient-to-r from-red-600 to-red-500';
    case 2:
      return 'bg-gradient-to-r from-cyan-500 to-blue-500';
    case 3:
      return 'bg-gradient-to-r from-zinc-800 to-zinc-700';
    case 4:
      return 'bg-gradient-to-r from-amber-800 to-emerald-900';
    case 5:
      return 'bg-gradient-to-r from-pink-600 to-fuchsia-600';
    case 6:
      return 'bg-gradient-to-r from-red-800 to-amber-900';
    case 7:
      return 'bg-gradient-to-r from-amber-700 to-amber-800';
    case 8:
      return 'bg-gradient-to-r from-black to-zinc-900';
    case 9:
      return 'bg-gradient-to-r from-slate-800 to-slate-900';
    case 10:
      return 'bg-gradient-to-r from-slate-900 to-black';
    default:
      return 'bg-zinc-800';
  }
}

import React, { useMemo, useState } from 'react';

import TopAvatar from './TopAvatar';

import type { ChatUser } from '@/types/chat';

interface RichestModalProps {
  isOpen: boolean;
  onClose: () => void;
  users?: ChatUser[]; // initial list (optional)
  onlineUsers?: ChatUser[]; // to pick from
}

export default function RichestModal({ isOpen, onClose, users = [], onlineUsers = [] }: RichestModalProps) {
  const [list, setList] = useState<ChatUser[]>(users.slice(0, 50));
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return onlineUsers;
    return onlineUsers.filter(u => u.username.toLowerCase().includes(term));
  }, [onlineUsers, search]);

  if (!isOpen) return null;

  const addUser = (u: ChatUser) => {
    if (list.find(x => x.id === u.id)) return;
    setList(prev => [...prev, u].slice(0, 50));
    setShowPicker(false);
    setSearch('');
  };

  const removeUser = (id: number) => {
    setList(prev => prev.filter(u => u.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 modal-overlay" onClick={onClose} />

      <div className="relative w-[92vw] max-w-[420px] bg-white rounded-xl overflow-hidden shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center gap-2">
            <span className="text-amber-500">👑</span>
            <h3 className="font-extrabold text-base">الأثرياء</h3>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowPicker(true)} className="px-2 py-1 text-xs rounded bg-blue-500 text-white hover:bg-blue-600">إضافة</button>
            <button onClick={onClose} className="text-gray-600 hover:text-black">✕</button>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-2">
          {list.length === 0 && (
            <div className="p-6 text-center text-gray-500">لا يوجد أعضاء بعد. اضغط إضافة لاختيار مستخدمين من قائمة المتصلين.</div>
          )}

          <ul className="divide-y">
            {list.map((u, idx) => (
              <li key={u.id} className="flex items-center gap-3 p-2">
                <div className="w-8 h-8 flex items-center justify-center text-xs font-bold text-gray-500">{idx + 1}</div>
                <TopAvatar user={u} size={52} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold leading-snug truncate">{u.username}</div>
                </div>
                <button onClick={() => removeUser(u.id)} className="text-red-500 hover:text-red-600 text-xs">حذف</button>
              </li>
            ))}
          </ul>
        </div>

        {showPicker && (
          <div className="absolute inset-0 bg-white/95">
            <div className="p-3 border-b flex items-center gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث عن مستخدم…"
                className="flex-1 border rounded px-3 py-2 text-sm"
              />
              <button onClick={() => setShowPicker(false)} className="text-sm text-gray-600">إلغاء</button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <div className="p-6 text-center text-gray-500">لا يوجد نتائج</div>
              ) : (
                <ul className="divide-y">
                  {filtered.map(u => (
                    <li key={u.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 cursor-pointer" onClick={() => addUser(u)}>
                      <TopAvatar user={u} size={44} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{u.username}</div>
                      </div>
                      <button className="px-2 py-1 text-xs rounded bg-blue-500 text-white">إضافة</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
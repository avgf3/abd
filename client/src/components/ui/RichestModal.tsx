import React from 'react';

import { AvatarWithFrame } from './AvatarWithFrame';

interface RichUserItem {
  id: string | number;
  name: string; // placeholder; user will edit names externally
  avatar: string;
}

interface RichestModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: RichUserItem[]; // expected up to 10
}

export default function RichestModal({ isOpen, onClose, users }: RichestModalProps) {
  if (!isOpen) return null;

  const topTen = users.slice(0, 10);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 modal-overlay" onClick={onClose} />

      <div className="relative w-[90vw] max-w-[16rem] sm:max-w-[16rem] bg-white rounded-xl overflow-hidden shadow-2xl animate-fade-in">
        <div className="bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 p-3 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/svgs/crown.svg" alt="crown" className="w-6 h-6" />
            <h3 className="font-extrabold text-lg">الأثرياء</h3>
          </div>
          <button onClick={onClose} className="text-white/90 hover:text-white">✕</button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto bg-gradient-to-b from-zinc-900 via-zinc-800 to-black p-2">
          {topTen.map((u, idx) => (
            <div
              key={u.id}
              className={`mb-2 rounded-xl p-2 shadow relative ${getRowBackground(idx + 1)} text-white`}
            >
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-black/40 border border-white/20 text-yellow-300 font-bold">
                  {idx + 1}
                </div>
                <AvatarWithFrame src={u.avatar} alt={u.name} frame={'none'} imageSize={54} frameThickness={6} displayMode="compact" />
                <div className="flex-1">
                  <div className="font-bold leading-snug">{u.name}</div>
                  <div className="text-xs opacity-70">VIP</div>
                </div>
                <img src="/svgs/crown.svg" alt="crown" className="w-6 h-6 opacity-90" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getRowBackground(rank: number): string {
  // ألوان قريبة من الصورة: أشرطة متدرجة مختلفة
  switch (rank) {
    case 1: return 'bg-gradient-to-r from-red-600 to-red-500';
    case 2: return 'bg-gradient-to-r from-cyan-500 to-blue-500';
    case 3: return 'bg-gradient-to-r from-zinc-800 to-zinc-700';
    case 4: return 'bg-gradient-to-r from-amber-800 to-emerald-900';
    case 5: return 'bg-gradient-to-r from-pink-600 to-fuchsia-600';
    case 6: return 'bg-gradient-to-r from-red-800 to-amber-900';
    case 7: return 'bg-gradient-to-r from-amber-700 to-amber-800';
    case 8: return 'bg-gradient-to-r from-black to-zinc-900';
    case 9: return 'bg-gradient-to-r from-slate-800 to-slate-900';
    case 10: return 'bg-gradient-to-r from-slate-900 to-black';
    default: return 'bg-zinc-800';
  }
}
import React from 'react';

import VipAvatar from './VipAvatar';

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

      <div className="relative w-[90vw] max-w-[20rem] sm:max-w-[22rem] bg-gradient-to-br from-gray-900 to-black rounded-2xl overflow-hidden shadow-2xl animate-fade-in border border-yellow-500/20">
        <div className="bg-gradient-to-r from-yellow-600 via-amber-500 to-orange-600 p-4 text-white flex items-center justify-between relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          <div className="flex items-center gap-3 relative">
            <img src="/svgs/crown.svg" alt="crown" className="w-8 h-8 filter drop-shadow-lg animate-pulse" />
            <h3 className="font-black text-2xl tracking-wide">قائمة الأثرياء</h3>
          </div>
          <button onClick={onClose} className="text-white/90 hover:text-white text-2xl hover:scale-110 transition-transform">✕</button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto bg-gradient-to-b from-gray-900 via-gray-800 to-black p-4 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-yellow-500/5 to-transparent pointer-events-none" />
          {topTen.map((u, idx) => (
            <div
              key={u.id}
              className={`mb-3 rounded-xl p-3 shadow-xl relative ${getRowBackground(idx + 1)} text-white transform transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl`}
            >
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
              <div className="flex items-center gap-3 relative">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 border-2 border-yellow-300/50 text-white font-bold text-lg shadow-lg shadow-yellow-500/30">
                  {idx + 1}
                </div>
                <VipAvatar src={u.avatar} alt={u.name} size={60} frame={(idx + 1) as any} />
                <div className="flex-1">
                  <div className="font-bold text-lg leading-tight drop-shadow-md">{u.name}</div>
                  <div className="text-sm opacity-90 flex items-center gap-1">
                    <span className="text-yellow-300">★</span>
                    <span>VIP {idx + 1}</span>
                  </div>
                </div>
                {idx < 3 && (
                  <img src="/svgs/crown.svg" alt="crown" className="w-8 h-8 filter drop-shadow-lg animate-pulse" />
                )}
                {idx >= 3 && (
                  <div className="text-2xl">🏆</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getRowBackground(rank: number): string {
  // ألوان مطابقة تماماً للصورة المرفقة
  switch (rank) {
    case 1: return 'bg-gradient-to-r from-red-600 via-red-500 to-red-600 shadow-lg shadow-red-500/50';
    case 2: return 'bg-gradient-to-r from-cyan-500 via-blue-400 to-cyan-500 shadow-lg shadow-cyan-500/50';
    case 3: return 'bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 shadow-lg shadow-gray-600/40';
    case 4: return 'bg-gradient-to-r from-emerald-700 via-teal-600 to-emerald-700 shadow-lg shadow-emerald-600/40';
    case 5: return 'bg-gradient-to-r from-pink-500 via-fuchsia-500 to-pink-500 shadow-lg shadow-pink-500/50';
    case 6: return 'bg-gradient-to-r from-red-700 via-orange-600 to-red-700 shadow-lg shadow-red-600/40';
    case 7: return 'bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-600 shadow-lg shadow-amber-600/40';
    case 8: return 'bg-gradient-to-r from-gray-900 via-black to-gray-900 shadow-lg shadow-gray-800/30';
    case 9: return 'bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-700 shadow-lg shadow-blue-600/40';
    case 10: return 'bg-gradient-to-r from-purple-700 via-violet-600 to-purple-700 shadow-lg shadow-purple-600/40';
    default: return 'bg-zinc-800';
  }
}
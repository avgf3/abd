import { useState } from 'react';
import { Input } from '@/components/ui/input';
import SimpleUserMenu from './SimpleUserMenu';
import ProfileImage from './ProfileImage';

import type { ChatUser } from '@/types/chat';
import { getUserThemeClasses, getUserThemeStyles, getUserThemeTextColor } from '@/utils/themeUtils';

interface UserSidebarProps {
  users: ChatUser[];
  onUserClick: (event: React.MouseEvent, user: ChatUser) => void;
  currentUser?: ChatUser | null;
}

export default function UserSidebar({ users, onUserClick, currentUser }: UserSidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = users.filter(user =>
    user.isOnline && user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getUserRankBadge = (userType: string, username: string) => {
    if (username === 'عبود') {
      return <span className="text-yellow-400">👑</span>;
    }
    
    switch (userType) {
      case 'owner':
        return <span className="text-yellow-400">👑</span>;
      case 'admin':
        return <span className="text-blue-400">⭐</span>;
      case 'moderator':
        return <span className="text-green-400">🛡️</span>;
      default:
        return null;
    }
  };

  const formatLastSeen = (lastSeen?: Date) => {
    if (!lastSeen) return 'غير معروف';
    const now = new Date();
    const diff = now.getTime() - lastSeen.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'متصل الآن';
    if (minutes < 60) return `قبل ${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `قبل ${hours} ساعة`;
    const days = Math.floor(hours / 24);
    return `قبل ${days} يوم`;
  };

  return (
    <aside className="w-64 bg-gradient-to-b from-slate-700 to-slate-800 p-4 text-sm space-y-4 overflow-y-auto border-l border-white/10 backdrop-blur-sm">
      <div className="relative">
        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-300">🔍</span>
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="البحث عن المستخدمين..."
          className="w-full pl-4 pr-10 py-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 placeholder:text-gray-300 text-white focus:bg-white/15 focus:border-white/30 transition-all duration-300"
        />
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center gap-2 font-bold text-green-300 text-base">
          <span className="text-xs animate-pulse">●</span>
          المتصلون الآن
          <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm border border-green-500/30">
            {users.filter(u => u.isOnline).length}
          </span>
        </div>
        
        <ul className="space-y-2">
          {filteredUsers.map((user) => (
            <li key={user.id} className="relative">
              <SimpleUserMenu
                targetUser={user}
                currentUser={currentUser}
              >
                <div
                  className={`flex items-center gap-3 p-3 rounded-2xl transition-all duration-300 cursor-pointer hover:bg-white/10 backdrop-blur-sm border border-white/10 hover:border-white/20 group ${
                    getUserThemeClasses(user)
                  }`}
                  style={{ 
                    ...getUserThemeStyles(user)
                  }}
                  onClick={(e) => onUserClick(e, user)}
                >
              <ProfileImage 
                user={user} 
                size="small" 
                className="transition-transform group-hover:scale-110 ring-2 ring-white/20 group-hover:ring-white/40"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span 
                      className="text-sm font-semibold"
                      style={{ 
                        color: getUserThemeTextColor(user) || '#ffffff'
                      }}
                      title={user.username}
                    >
                      <span className="text-base mr-1">{getUserRankBadge(user.userType, user.username)}</span>
                      {user.username}
                    </span>
                    {/* إشارة المكتوم */}
                    {user.isMuted && (
                      <span className="text-yellow-400 text-xs">🔇</span>
                    )}
                  </div>
                  <span 
                    className="text-xs font-semibold px-2 py-1 rounded-full bg-green-500/20 text-green-300 border border-green-500/30"
                  >
                    ● متصل
                  </span>
                </div>
              </div>
                </div>
              </SimpleUserMenu>
            </li>
          ))}
        </ul>
        
        {filteredUsers.length === 0 && (
          <div className="text-center text-gray-300 py-6">
            {searchTerm ? 'لا توجد نتائج للبحث' : 'لا يوجد مستخدمون متصلون'}
          </div>
        )}
      </div>
    </aside>
  );
}

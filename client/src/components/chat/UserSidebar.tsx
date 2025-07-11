import { useState } from 'react';
import { Input } from '@/components/ui/input';
import SimpleUserMenu from './SimpleUserMenu';
import ProfileImage from './ProfileImage';

import type { ChatUser } from '@/types/chat';

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
    <aside className="w-80 bg-secondary p-6 text-sm space-y-4 overflow-y-auto border-l border-accent">
      <div className="relative">
        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">🔍</span>
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="البحث عن المستخدمين..."
          className="w-full pl-4 pr-10 py-3 rounded-xl bg-accent border-border placeholder:text-muted-foreground text-white"
        />
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center gap-2 font-bold text-green-400 text-lg">
          <span className="text-xs">●</span>
          المتصلون الآن
          <span className="bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-semibold">
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
                  className="flex items-center gap-3 p-3 rounded-xl glass-effect hover:bg-accent transition-all duration-200 cursor-pointer"
                  onClick={(e) => onUserClick(e, user)}
                >
              <ProfileImage 
                user={user} 
                size="small" 
                className="transition-transform hover:scale-105"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div 
                    className="clickable-username text-sm font-medium px-3 py-2 rounded-lg transition-all duration-300"
                    style={{ 
                      background: user.userType === 'owner' ? 'linear-gradient(135deg, #fbbf24, #f59e0b, #d97706)' :
                                 user.userType === 'admin' ? 'linear-gradient(135deg, #a855f7, #9333ea, #7c3aed)' :
                                 'transparent',
                      color: user.userType === 'owner' ? '#000000' :
                             user.userType === 'admin' ? '#FFFFFF' :
                             (user.usernameColor || '#FFFFFF'),
                      animation: user.userType === 'owner' ? 'golden-glow 2s ease-in-out infinite' :
                                user.userType === 'admin' ? 'purple-glow 2s ease-in-out infinite' :
                                'none',
                      boxShadow: user.userType === 'owner' ? '0 0 20px rgba(255, 215, 0, 0.6)' :
                                user.userType === 'admin' ? '0 0 15px rgba(147, 51, 234, 0.6)' :
                                'none'
                    }}
                  >
                    {getUserRankBadge(user.userType, user.username)} {user.username}
                  </div>
                  {/* إشارة المكتوم */}
                  {user.isMuted && (
                    <span className="text-yellow-400 text-xs">🔇</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs text-green-400">
                  متصل
                </span>
              </div>
                </div>
              </SimpleUserMenu>
            </li>
          ))}
        </ul>
        
        {filteredUsers.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            {searchTerm ? 'لا توجد نتائج للبحث' : 'لا يوجد مستخدمون متصلون'}
          </div>
        )}
      </div>
    </aside>
  );
}

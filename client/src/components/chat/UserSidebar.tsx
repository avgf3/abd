import { useState } from 'react';
import { Input } from '@/components/ui/input';
import SimpleUserMenu from './SimpleUserMenu';
import ProfileImage from './ProfileImage';

import type { ChatUser } from '@/types/chat';

// دوال مساعدة للثيمات
const getThemeData = (themeId: string) => {
  const themes = {
    'default': { gradient: 'transparent', textColor: '#FFFFFF', hasAnimation: false },
    'golden': { gradient: 'linear-gradient(45deg, #FFD700, #FFA500)', textColor: '#000000', hasAnimation: true },
    'royal': { gradient: 'linear-gradient(45deg, #8B5CF6, #A855F7)', textColor: '#FFFFFF', hasAnimation: true },
    'ocean': { gradient: 'linear-gradient(45deg, #0EA5E9, #0284C7)', textColor: '#FFFFFF', hasAnimation: true },
    'sunset': { gradient: 'linear-gradient(45deg, #F97316, #EA580C)', textColor: '#FFFFFF', hasAnimation: true },
    'forest': { gradient: 'linear-gradient(45deg, #22C55E, #16A34A)', textColor: '#FFFFFF', hasAnimation: true },
    'rose': { gradient: 'linear-gradient(45deg, #EC4899, #DB2777)', textColor: '#FFFFFF', hasAnimation: true },
    'emerald': { gradient: 'linear-gradient(45deg, #10B981, #059669)', textColor: '#FFFFFF', hasAnimation: true },
    'fire': { gradient: 'linear-gradient(45deg, #EF4444, #DC2626)', textColor: '#FFFFFF', hasAnimation: true },
    'galaxy': { gradient: 'linear-gradient(45deg, #6366F1, #4F46E5)', textColor: '#FFFFFF', hasAnimation: true },
    'rainbow': { gradient: 'linear-gradient(45deg, #F59E0B, #EF4444, #EC4899, #8B5CF6)', textColor: '#FFFFFF', hasAnimation: true }
  };
  return themes[themeId as keyof typeof themes] || themes.default;
};

const getUserThemeClasses = (user: any) => {
  const theme = getThemeData(user.userTheme || (user.userType === 'owner' ? 'golden' : 'default'));
  if (theme.gradient === 'transparent') {
    return 'glass-effect hover:bg-accent';
  }
  return 'shadow-lg';
};

const getUserThemeStyles = (user: any) => {
  const theme = getThemeData(user.userTheme || (user.userType === 'owner' ? 'golden' : 'default'));
  const styles: any = {};
  
  if (theme.gradient !== 'transparent') {
    styles.background = theme.gradient;
  }
  
  if (theme.hasAnimation) {
    styles.animation = 'golden-glow 2s ease-in-out infinite';
    styles.boxShadow = '0 0 25px rgba(255, 215, 0, 0.8)';
  }
  
  return styles;
};

const getUserThemeTextColor = (user: any) => {
  const theme = getThemeData(user.userTheme || (user.userType === 'owner' ? 'golden' : 'default'));
  return theme.textColor;
};

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
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 cursor-pointer ${
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
                className="transition-transform hover:scale-105"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span 
                      className="text-sm font-medium"
                      style={{ 
                        color: getUserThemeTextColor(user)
                      }}
                    >
                      {getUserRankBadge(user.userType, user.username)} {user.username}
                    </span>
                    {/* إشارة المكتوم */}
                    {user.isMuted && (
                      <span className="text-yellow-400 text-xs">🔇</span>
                    )}
                  </div>
                  <span 
                    className="text-xs font-medium"
                    style={{ 
                      color: user.userType === 'owner' ? '#000000' : '#10B981'
                    }}
                  >
                    متصل
                  </span>
                </div>
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

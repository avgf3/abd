import { useState } from 'react';
import { Input } from '@/components/ui/input';
import type { ChatUser } from '@/types/chat';

interface UserSidebarProps {
  users: ChatUser[];
  onUserClick: (event: React.MouseEvent, user: ChatUser) => void;
}

export default function UserSidebar({ users, onUserClick }: UserSidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getUserRankBadge = (userType: string) => {
    switch (userType) {
      case 'owner':
        return <span className="user-rank crown">👑</span>;
      case 'member':
        return <span className="user-rank star">⭐</span>;
      default:
        return <span className="user-rank shield">🛡️</span>;
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
          <span className="text-xs">🟢</span>
          المتصلون الآن
          <span className="bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-semibold">
            {users.length}
          </span>
        </div>
        
        <ul className="space-y-2">
          {filteredUsers.map((user) => (
            <li
              key={user.id}
              className="flex items-center gap-3 p-3 rounded-xl glass-effect hover:bg-accent transition-all duration-200 cursor-pointer"
              onClick={(e) => onUserClick(e, user)}
            >
              <img
                src={user.profileImage || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-4.0.3&auto=format&fit=crop&w=40&h=40"}
                alt="صورة المستخدم"
                className="user-img"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="clickable-username">{user.username}</span>
                  {getUserRankBadge(user.userType)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {user.isOnline ? 'متصل الآن' : formatLastSeen(user.lastSeen)}
                </div>
              </div>
              <div className="flex flex-col items-center">
                <span className={`text-xs ${user.isOnline ? 'text-green-400' : 'text-gray-400'}`}>
                  🟢
                </span>
              </div>
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

import { useState } from 'react';
import ProfileImage from './ProfileImage';
import type { ChatUser } from '@/types/chat';

interface UserSidebarProps {
  users: ChatUser[];
  currentUser: ChatUser | null;
  onUserClick: (event: React.MouseEvent, user: ChatUser) => void;
}

export default function NewUserSidebar({ users, currentUser, onUserClick }: UserSidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getUserTypeColor = (userType: string) => {
    switch (userType) {
      case 'owner': return 'text-red-600';
      case 'admin': return 'text-purple-600';
      case 'moderator': return 'text-blue-600';
      case 'member': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getUserTypeBadge = (userType: string) => {
    switch (userType) {
      case 'owner': return '👑';
      case 'admin': return '🛡️';
      case 'moderator': return '🔰';
      case 'member': return '⭐';
      default: return '👤';
    }
  };

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    // Sort by user type priority first
    const typePriority = { owner: 0, admin: 1, moderator: 2, member: 3, guest: 4 };
    const aPriority = typePriority[a.userType as keyof typeof typePriority] ?? 5;
    const bPriority = typePriority[b.userType as keyof typeof typePriority] ?? 5;
    
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }
    
    // Then sort alphabetically
    return a.username.localeCompare(b.username, 'ar');
  });

  return (
    <div className="w-64 bg-white border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
          <span className="text-green-500">●</span>
          المتواجدون ({users.length})
        </h2>
        
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="بحث..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md text-right bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
          <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
        </div>
      </div>

      {/* Users List */}
      <div className="flex-1 overflow-y-auto">
        {sortedUsers.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            {searchTerm ? 'لا توجد نتائج' : 'لا يوجد مستخدمون'}
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {sortedUsers.map((user) => (
              <div
                key={user.id}
                onClick={(e) => onUserClick(e, user)}
                className={`
                  flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200
                  hover:bg-gray-100 hover:shadow-sm
                  ${user.id === currentUser?.id ? 'bg-teal-50 border border-teal-200' : ''}
                `}
              >
                {/* User Avatar */}
                <div className="relative">
                  <ProfileImage user={user} size="small" />
                  {/* Online Indicator */}
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span 
                      className="text-sm font-medium truncate"
                      style={{ color: user.usernameColor || '#000000' }}
                    >
                      {getUserTypeBadge(user.userType)} {user.username}
                    </span>
                  </div>
                  
                  {/* User Status/Country */}
                  {(user.status || user.country) && (
                    <div className="text-xs text-gray-500 truncate">
                      {user.country && (
                        <span className="inline-flex items-center gap-1">
                          🌍 {user.country}
                        </span>
                      )}
                      {user.status && user.country && ' • '}
                      {user.status}
                    </div>
                  )}
                </div>

                {/* Age/Gender Info */}
                {(user.age || user.gender) && (
                  <div className="text-xs text-gray-400 flex flex-col items-end">
                    {user.age && <span>{user.age}</span>}
                    {user.gender && (
                      <span className={user.gender === 'female' ? 'text-pink-500' : 'text-blue-500'}>
                        {user.gender === 'female' ? '♀' : '♂'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Current User Info */}
      {currentUser && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <ProfileImage user={currentUser} size="small" />
            <div className="flex-1 min-w-0">
              <div 
                className="text-sm font-medium truncate"
                style={{ color: currentUser.usernameColor || '#000000' }}
              >
                {getUserTypeBadge(currentUser.userType)} {currentUser.username}
              </div>
              <div className="text-xs text-gray-500">
                {currentUser.userType === 'guest' ? 'زائر' : 'عضو'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
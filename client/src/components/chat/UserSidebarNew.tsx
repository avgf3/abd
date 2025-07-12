import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { ChatUser } from '@/types/chat';

interface UserSidebarProps {
  users: ChatUser[];
  currentUser: ChatUser | null;
  onUserClick: (user: ChatUser) => void;
  onPrivateMessage: (user: ChatUser) => void;
  onAddFriend: (user: ChatUser) => void;
}

export default function UserSidebar({ 
  users, 
  currentUser, 
  onUserClick, 
  onPrivateMessage, 
  onAddFriend 
}: UserSidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = users.filter(user => 
    user.id !== currentUser?.id && 
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getUserColor = (user: ChatUser) => {
    if (user.usernameColor) {
      return user.usernameColor;
    }
    
    switch (user.userType) {
      case 'owner': return '#FFD700';
      case 'admin': return '#FF6B6B';
      case 'moderator': return '#4ECDC4';
      case 'member': return '#95E1D3';
      default: return '#FFFFFF';
    }
  };

  const getUserTypeIcon = (userType: string) => {
    switch (userType) {
      case 'owner': return '👑';
      case 'admin': return '⭐';
      case 'moderator': return '🛡️';
      case 'member': return '👤';
      default: return '👤';
    }
  };

  const getUserTypeName = (userType: string) => {
    switch (userType) {
      case 'owner': return 'مالك';
      case 'admin': return 'مشرف';
      case 'moderator': return 'مراقب';
      case 'member': return 'عضو';
      default: return 'ضيف';
    }
  };

  return (
    <div className="h-full">
      {/* Search */}
      <div className="p-3 border-b border-gray-700">
        <Input
          placeholder="البحث عن مستخدم..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-gray-700 border-gray-600 text-white text-sm"
        />
      </div>

      {/* Users Count */}
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">المتصلين الآن</span>
          <Badge variant="secondary">{filteredUsers.length}</Badge>
        </div>
      </div>

      {/* Users List */}
      <div className="flex-1 overflow-y-auto">
        {filteredUsers.length === 0 ? (
          <div className="p-4 text-center text-gray-400">
            <p>لا يوجد مستخدمين</p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="group p-3 rounded-lg hover:bg-gray-700 cursor-pointer transition-colors"
                onClick={() => onUserClick(user)}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    {user.isOnline && (
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></div>
                    )}
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span>{getUserTypeIcon(user.userType)}</span>
                      <span 
                        className="font-medium truncate"
                        style={{ color: getUserColor(user) }}
                      >
                        {user.username}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {getUserTypeName(user.userType)}
                    </div>
                  </div>

                  {/* Status badges */}
                  <div className="flex flex-col gap-1">
                    {user.isOnline && (
                      <Badge variant="outline" className="text-xs border-green-500 text-green-400">
                        متصل
                      </Badge>
                    )}
                    {user.isMuted && (
                      <Badge variant="destructive" className="text-xs">
                        مكتوم
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Action Buttons (show on hover) */}
                <div className="mt-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs bg-gray-600 border-gray-500 hover:bg-gray-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPrivateMessage(user);
                    }}
                  >
                    💬 رسالة
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs bg-gray-600 border-gray-500 hover:bg-gray-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddFriend(user);
                    }}
                  >
                    👥 صداقة
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
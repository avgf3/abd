import React, { memo, useMemo, useCallback } from 'react';
import type { ChatUser } from '@/types/chat';

interface OptimizedUserListProps {
  users: ChatUser[];
  currentUserId?: number;
  onUserClick?: (user: ChatUser) => void;
  onUserRightClick?: (user: ChatUser, event: React.MouseEvent) => void;
  showOfflineUsers?: boolean;
  maxVisibleUsers?: number;
  className?: string;
}

// مكون محسن للمستخدم الفردي
const OptimizedUserItem = memo<{
  user: ChatUser;
  isCurrentUser: boolean;
  onUserClick?: (user: ChatUser) => void;
  onUserRightClick?: (user: ChatUser, event: React.MouseEvent) => void;
}>(({ user, isCurrentUser, onUserClick, onUserRightClick }) => {
  const handleClick = useCallback(() => {
    if (onUserClick && !isCurrentUser) {
      onUserClick(user);
    }
  }, [onUserClick, user, isCurrentUser]);

  const handleRightClick = useCallback((event: React.MouseEvent) => {
    if (onUserRightClick && !isCurrentUser) {
      onUserRightClick(user, event);
    }
  }, [onUserRightClick, user, isCurrentUser]);

  // تحسين لون المستخدم
  const userColor = useMemo(() => {
    const userType = user.userType;
    switch (userType) {
      case 'owner':
        return '#FFD700'; // ذهبي
      case 'admin':
        return '#FF6B6B'; // أحمر
      case 'moderator':
        return '#4ECDC4'; // أخضر
      case 'member':
        return '#45B7D1'; // أزرق
      default:
        return user.usernameColor || '#666666';
    }
  }, [user.userType, user.usernameColor]);

  // تحسين حالة الاتصال
  const connectionStatus = useMemo(() => {
    if (user.isOnline) {
      return { text: 'متصل', color: '#10B981' };
    } else if (user.lastSeen) {
      const lastSeen = new Date(user.lastSeen);
      const now = new Date();
      const diffInMinutes = (now.getTime() - lastSeen.getTime()) / (1000 * 60);
      
      if (diffInMinutes < 5) {
        return { text: 'متصل الآن', color: '#10B981' };
      } else if (diffInMinutes < 60) {
        return { text: `منذ ${Math.floor(diffInMinutes)} دقيقة`, color: '#F59E0B' };
      } else if (diffInMinutes < 1440) {
        return { text: `منذ ${Math.floor(diffInMinutes / 60)} ساعة`, color: '#6B7280' };
      } else {
        return { text: 'غير متصل', color: '#EF4444' };
      }
    } else {
      return { text: 'غير متصل', color: '#EF4444' };
    }
  }, [user.isOnline, user.lastSeen]);

  return (
    <div
      className={`user-item p-2 rounded-lg cursor-pointer transition-colors ${
        isCurrentUser
          ? 'bg-blue-100 dark:bg-blue-900'
          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
      onClick={handleClick}
      onContextMenu={handleRightClick}
    >
      <div className="flex items-center space-x-3 space-x-reverse">
        {/* صورة المستخدم */}
        <div className="relative">
          <div
            className="w-10 h-10 rounded-full bg-cover bg-center flex items-center justify-center text-white font-semibold"
            style={{
              backgroundColor: user.profileBackgroundColor || '#3B82F6',
              backgroundImage: user.profileImage ? `url(${user.profileImage})` : undefined
            }}
          >
            {!user.profileImage && user.username.charAt(0).toUpperCase()}
          </div>
          
          {/* مؤشر الحالة */}
          <div
            className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800"
            style={{ backgroundColor: connectionStatus.color }}
          />
        </div>

        {/* معلومات المستخدم */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 space-x-reverse">
            <span
              className="font-semibold text-sm truncate"
              style={{ color: userColor }}
            >
              {user.username}
            </span>
            
            {user.userType !== 'guest' && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ({user.userType})
              </span>
            )}
          </div>
          
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {connectionStatus.text}
          </div>
        </div>

        {/* معلومات إضافية */}
        {user.points !== undefined && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {user.points} نقطة
          </div>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.user.id === nextProps.user.id &&
    prevProps.user.username === nextProps.user.username &&
    prevProps.user.isOnline === nextProps.user.isOnline &&
    prevProps.user.lastSeen === nextProps.user.lastSeen &&
    prevProps.user.userType === nextProps.user.userType &&
    prevProps.user.points === nextProps.user.points &&
    prevProps.isCurrentUser === nextProps.isCurrentUser
  );
});

OptimizedUserItem.displayName = 'OptimizedUserItem';

// مكون محسن لقائمة المستخدمين
const OptimizedUserList = memo<OptimizedUserListProps>(({
  users,
  currentUserId,
  onUserClick,
  onUserRightClick,
  showOfflineUsers = false,
  maxVisibleUsers = 50,
  className = ''
}) => {
  // تجميع المستخدمين حسب الحالة
  const groupedUsers = useMemo(() => {
    const online = users.filter(u => u.isOnline);
    const offline = users.filter(u => !u.isOnline);
    
    return {
      online: online.slice(0, maxVisibleUsers),
      offline: showOfflineUsers ? offline.slice(0, maxVisibleUsers) : [],
      totalOnline: online.length,
      totalOffline: offline.length
    };
  }, [users, showOfflineUsers, maxVisibleUsers]);

  // تحسين معالجة النقر على المستخدم
  const handleUserClick = useCallback((user: ChatUser) => {
    if (onUserClick) {
      onUserClick(user);
    }
  }, [onUserClick]);

  // تحسين معالجة النقر بالزر الأيمن
  const handleUserRightClick = useCallback((user: ChatUser, event: React.MouseEvent) => {
    if (onUserRightClick) {
      onUserRightClick(user, event);
    }
  }, [onUserRightClick]);

  return (
    <div className={`optimized-user-list ${className}`}>
      {/* المستخدمون المتصلون */}
      {groupedUsers.online.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              متصلون ({groupedUsers.totalOnline})
            </h3>
            {groupedUsers.totalOnline > maxVisibleUsers && (
              <span className="text-xs text-gray-500">
                +{groupedUsers.totalOnline - maxVisibleUsers} أكثر
              </span>
            )}
          </div>
          
          <div className="space-y-1">
            {groupedUsers.online.map(user => (
              <OptimizedUserItem
                key={user.id}
                user={user}
                isCurrentUser={user.id === currentUserId}
                onUserClick={handleUserClick}
                onUserRightClick={handleUserRightClick}
              />
            ))}
          </div>
        </div>
      )}

      {/* المستخدمون غير المتصلين */}
      {showOfflineUsers && groupedUsers.offline.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              غير متصلين ({groupedUsers.totalOffline})
            </h3>
            {groupedUsers.totalOffline > maxVisibleUsers && (
              <span className="text-xs text-gray-500">
                +{groupedUsers.totalOffline - maxVisibleUsers} أكثر
              </span>
            )}
          </div>
          
          <div className="space-y-1 opacity-75">
            {groupedUsers.offline.map(user => (
              <OptimizedUserItem
                key={user.id}
                user={user}
                isCurrentUser={user.id === currentUserId}
                onUserClick={handleUserClick}
                onUserRightClick={handleUserRightClick}
              />
            ))}
          </div>
        </div>
      )}

      {/* رسالة إذا لم يكن هناك مستخدمون */}
      {users.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          لا يوجد مستخدمون متصلون حالياً
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // مقارنة مخصصة للأداء
  return (
    prevProps.users.length === nextProps.users.length &&
    prevProps.currentUserId === nextProps.currentUserId &&
    prevProps.showOfflineUsers === nextProps.showOfflineUsers &&
    prevProps.maxVisibleUsers === nextProps.maxVisibleUsers &&
    // مقارنة سريعة للمستخدمين
    prevProps.users.every((user, index) => 
      nextProps.users[index]?.id === user.id &&
      nextProps.users[index]?.isOnline === user.isOnline
    )
  );
});

OptimizedUserList.displayName = 'OptimizedUserList';

export default OptimizedUserList;
import { useState, useMemo } from 'react';
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

  // تحسين الأداء: استخدام useMemo للتصفية
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // التحقق من وجود اسم المستخدم قبل التصفية
      if (!user.username) return false;
      return user.username.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [users, searchTerm]);

  const getUserRankBadge = (user: ChatUser) => {
    // منطق اختيار الأيقونة حسب الدور والمستوى والجنس
    // إضافة تحقق من نوع البيانات للمستوى
    const userLevel = typeof user.level === 'string' ? parseInt(user.level, 10) : user.level;
    const level = isNaN(userLevel) ? 0 : userLevel;
    
    // owner: تاج SVG
    if (user.userType === 'owner') {
      return <img src="/svgs/crown.svg" alt="owner" style={{width: 24, height: 24, display: 'inline'}} />;
    }
    // admin: نجمة
    if (user.userType === 'admin') {
      return <span style={{fontSize: 24, display: 'inline'}}>⭐</span>;
    }
    // moderator: درع
    if (user.userType === 'moderator') {
      return <span style={{fontSize: 24, display: 'inline'}}>🛡️</span>;
    }
    // عضو ذكر لفل 1-10: سهم أزرق
    if (user.userType === 'member' && level >= 1 && level <= 10 && user.gender === 'male') {
      return <img src="/svgs/blue_arrow.svg" alt="male-lvl1-10" style={{width: 24, height: 24, display: 'inline'}} />;
    }
    // عضو أنثى لفل 1-10: ميدالية وردية
    if (user.userType === 'member' && level >= 1 && level <= 10 && user.gender === 'female') {
      return <img src="/svgs/pink_medal.svg" alt="female-lvl1-10" style={{width: 24, height: 24, display: 'inline'}} />;
    }
    // عضو لفل 10-20: ألماسة بيضاء
    if (user.userType === 'member' && level > 10 && level <= 20) {
      return <img src="/svgs/white.svg" alt="lvl10-20" style={{width: 24, height: 24, display: 'inline'}} />;
    }
    // عضو لفل 20-30: ألماسة خضراء
    if (user.userType === 'member' && level > 20 && level <= 30) {
      return <img src="/svgs/emerald.svg" alt="lvl20-30" style={{width: 24, height: 24, display: 'inline'}} />;
    }
    // عضو لفل 30-40: ألماسة برتقالية مضيئة
    if (user.userType === 'member' && level > 30 && level <= 40) {
      return <img src="/svgs/orange_shine.svg" alt="lvl30-40" style={{width: 24, height: 24, display: 'inline'}} />;
    }
    return null;
  };

  // إصلاح دالة formatLastSeen للتعامل مع string و Date
  const formatLastSeen = (lastSeen?: string | Date) => {
    if (!lastSeen) return 'غير معروف';
    
    // تحويل القيمة إلى Date object بطريقة آمنة
    const lastSeenDate = lastSeen instanceof Date ? lastSeen : new Date(lastSeen);
    
    // التحقق من صحة التاريخ
    if (isNaN(lastSeenDate.getTime())) {
      return 'غير معروف';
    }
    
    const now = new Date();
    const diff = now.getTime() - lastSeenDate.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'متصل الآن';
    if (minutes < 60) return `قبل ${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `قبل ${hours} ساعة`;
    const days = Math.floor(hours / 24);
    return `قبل ${days} يوم`;
  };

  // معالج النقر مع إيقاف انتشار الحدث
  const handleUserClick = (e: React.MouseEvent, user: ChatUser) => {
    e.stopPropagation();
    onUserClick(e, user);
  };

  // التحقق من صلاحيات الإشراف
  const isModerator = currentUser && ['moderator', 'admin', 'owner'].includes(currentUser.userType);

  return (
    <aside className="w-full sm:w-72 bg-white p-4 text-sm space-y-3 overflow-y-auto border-l border-gray-200 shadow-lg">
      <div className="relative">
        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="البحث عن المستخدمين..."
          className="w-full pl-4 pr-10 py-2 rounded-lg bg-gray-50 border-gray-300 placeholder:text-gray-500 text-gray-900"
        />
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center gap-2 font-bold text-green-600 text-base">
          <span className="text-xs">●</span>
          المتصلون الآن
          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">
            {users.length}
          </span>
        </div>
        
        <ul className="space-y-1">
          {filteredUsers.map((user) => {
            // التحقق من وجود البيانات المطلوبة
            if (!user.username || !user.userType) {
              return null;
            }
            
            return (
              <li key={user.id} className="relative -mx-4">
                <SimpleUserMenu
                  targetUser={user}
                  currentUser={currentUser}
                  showModerationActions={isModerator}
                >
                  <div
                    className={`flex items-center gap-2 p-2 px-4 rounded-lg transition-all duration-200 cursor-pointer w-full ${
                      getUserThemeClasses(user)
                    }`}
                    style={{ 
                      ...getUserThemeStyles(user)
                    }}
                    onClick={(e) => handleUserClick(e, user)}
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
                        className="text-base font-medium transition-all duration-300"
                        style={{ 
                          color: user.usernameColor || getUserThemeTextColor(user),
                          textShadow: user.usernameColor ? `0 0 10px ${user.usernameColor}40` : 'none',
                          filter: user.usernameColor ? 'drop-shadow(0 0 3px rgba(255,255,255,0.3))' : 'none'
                        }}
                        title={user.username}
                      >
                        {user.username} {getUserRankBadge(user)}
                      </span>
                      {/* إشارة المكتوم */}
                      {user.isMuted && (
                        <span className="text-yellow-400 text-xs">🔇</span>
                      )}
                    </div>
                  </div>
                </div>
                  </div>
                </SimpleUserMenu>
              </li>
            );
          })}
        </ul>
        
        {filteredUsers.length === 0 && (
          <div className="text-center text-gray-500 py-6">
            {searchTerm ? 'لا توجد نتائج للبحث' : 'لا يوجد مستخدمون متصلون'}
          </div>
        )}
      </div>
    </aside>
  );
}

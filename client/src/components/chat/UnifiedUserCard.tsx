import React, { useMemo, CSSProperties } from 'react';
import type { ChatUser } from '@/types/chat';
import { getImageSrc } from '@/utils/imageUtils';
import {
  getUserEffectStyles,
  getUserListItemClasses,
  getFinalUsernameColor,
  getUserListItemStyles,
} from '@/utils/themeUtils';
import ProfileImage from './ProfileImage';
import UserRoleBadge from './UserRoleBadge';
import SimpleUserMenu from './SimpleUserMenu';
import { formatTimeAgo } from '@/utils/timeUtils';
import { cn } from '@/lib/utils';

interface UnifiedUserCardProps {
  user: ChatUser | any; // Support both ChatUser and WallPost user data
  variant?: 'compact' | 'normal' | 'detailed';
  showProfileImage?: boolean;
  showRoleBadge?: boolean;
  showCountryFlag?: boolean;
  showTimestamp?: boolean | string | Date;
  showRankNumber?: number;
  showMedal?: boolean;
  showDeleteButton?: boolean;
  onUserClick?: (event: React.MouseEvent, user: ChatUser) => void;
  onDelete?: () => void;
  currentUser?: ChatUser | null;
  className?: string;
  enableMenu?: boolean;
  enableEffects?: boolean;
  imageSize?: 'small' | 'medium' | 'large';
  customContent?: React.ReactNode;
}

/**
 * مكون موحد لبطاقة المستخدم
 * يجمع أفضل الميزات من جميع البطاقات الموجودة
 * مع مرونة كاملة للتخصيص حسب السياق
 */
export default function UnifiedUserCard({
  user,
  variant = 'normal',
  showProfileImage = true,
  showRoleBadge = true,
  showCountryFlag = true,
  showTimestamp = false,
  showRankNumber,
  showMedal = false,
  showDeleteButton = false,
  onUserClick,
  onDelete,
  currentUser,
  className = '',
  enableMenu = true,
  enableEffects = true,
  imageSize = 'small',
  customContent,
}: UnifiedUserCardProps) {
  // تحويل البيانات إلى ChatUser إذا كانت من WallPost
  const normalizedUser = useMemo<ChatUser>(() => {
    if (user.userId) {
      // WallPost data structure
      return {
        id: user.userId,
        username: user.username,
        role: user.userRole || user.role || 'member',
        userType: user.userRole || user.userType || 'member',
        isOnline: true,
        profileImage: user.userProfileImage || user.profileImage,
        usernameColor: user.usernameColor,
        country: user.country,
        gender: user.gender,
        level: user.level || 1,
        profileBackgroundColor: user.profileBackgroundColor,
        profileEffect: user.profileEffect || 'none',
        isMuted: user.isMuted || false,
      } as ChatUser;
    }
    return user as ChatUser;
  }, [user]);

  // الحصول على emoji علم الدولة
  const getCountryEmoji = useMemo(() => {
    if (!normalizedUser.country) return null;
    const token = normalizedUser.country.trim().split(' ')[0];
    return token || null;
  }, [normalizedUser.country]);

  // حساب الأنماط
  const cardStyles = useMemo<CSSProperties>(() => {
    if (!enableEffects) return {};
    return getUserListItemStyles(normalizedUser);
  }, [normalizedUser, enableEffects]);

  const cardClasses = useMemo(() => {
    const classes = [
      'unified-user-card',
      'flex items-center gap-2 transition-all duration-200',
      enableEffects ? getUserListItemClasses(normalizedUser) : '',
    ];

    // إضافة كلاسات حسب النوع
    switch (variant) {
      case 'compact':
        classes.push('py-1 px-2');
        break;
      case 'detailed':
        classes.push('py-3 px-4');
        break;
      default: // normal
        classes.push('py-1.5 px-3');
    }

    return cn(...classes, className);
  }, [normalizedUser, variant, enableEffects, className]);

  // تحديد حجم الصورة
  const imageSizeMap = {
    small: 'w-10 h-10',
    medium: 'w-12 h-12',
    large: 'w-16 h-16',
  };

  // المحتوى الداخلي للبطاقة
  const cardContent = (
    <div className={cardClasses} style={cardStyles} onClick={(e) => onUserClick?.(e, normalizedUser)}>
      {/* الصورة الشخصية */}
      {showProfileImage && (
        <div className="flex-shrink-0">
          <ProfileImage 
            user={normalizedUser} 
            size={imageSize}
            hideRoleBadgeOverlay={true}
          />
        </div>
      )}

      {/* المحتوى الرئيسي */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          {/* الجانب الأيسر - الاسم والمعلومات */}
          <div className="flex items-center gap-2 min-w-0">
            {/* رقم الترتيب (للأثرياء) */}
            {showRankNumber !== undefined && (
              <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 bg-primary/10 text-primary text-[11px] font-semibold rounded-full">
                {showRankNumber}
              </span>
            )}

            {/* الميدالية (للثلاثة الأوائل) */}
            {showMedal && showRankNumber !== undefined && showRankNumber <= 3 && (
              <span className="text-base" aria-label="rank-medal">
                {showRankNumber === 1 ? '🥇' : showRankNumber === 2 ? '🥈' : '🥉'}
              </span>
            )}

            {/* اسم المستخدم مع أيقونة الكتم بجانبه */}
            <span
              className="font-medium text-base truncate transition-colors duration-300"
              style={{ color: getFinalUsernameColor(normalizedUser) }}
              title={normalizedUser.username}
            >
              {normalizedUser.username}
              {normalizedUser.isMuted && <span className="text-yellow-400 text-xs ml-1">🔇</span>}
            </span>

            {/* الوقت (للمنشورات) */}
            {showTimestamp && (
              <span className="text-xs text-muted-foreground">
                {typeof showTimestamp === 'string' || showTimestamp instanceof Date
                  ? formatTimeAgo(showTimestamp)
                  : ''}
              </span>
            )}
          </div>

          {/* الجانب الأيمن - الشارات والأزرار */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* شارة الرتبة */}
            {showRoleBadge && (
              <UserRoleBadge user={normalizedUser} size={20} />
            )}

            {/* علم الدولة */}
            {showCountryFlag && getCountryEmoji && (
              <span 
                className="inline-flex items-center justify-center w-5 h-5"
                title={normalizedUser.country}
              >
                <span style={{ fontSize: 14, lineHeight: 1 }}>{getCountryEmoji}</span>
              </span>
            )}

            {/* زر الحذف */}
            {showDeleteButton && onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10 p-1 rounded"
                aria-label="حذف"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* محتوى مخصص إضافي */}
        {customContent && (
          <div className="mt-1">
            {customContent}
          </div>
        )}
      </div>
    </div>
  );

  // إذا كانت القائمة مفعلة، لف البطاقة بـ SimpleUserMenu
  if (enableMenu) {
    return (
      <SimpleUserMenu
        targetUser={normalizedUser}
        currentUser={currentUser}
        showModerationActions={currentUser && ['owner', 'admin', 'moderator'].includes(currentUser.userType)}
      >
        {cardContent}
      </SimpleUserMenu>
    );
  }

  return cardContent;
}

// تصدير أنواع البطاقات الجاهزة للاستخدام المباشر
export const UserCardVariants = {
  // بطاقة قائمة المستخدمين
  UserList: (props: Omit<UnifiedUserCardProps, 'variant'>) => (
    <UnifiedUserCard
      {...props}
      variant="normal"
      showProfileImage={true}
      showRoleBadge={true}
      showCountryFlag={true}
      enableEffects={true}
      imageSize="small"
    />
  ),
  
  // بطاقة الحوائط
  WallPost: (props: Omit<UnifiedUserCardProps, 'variant'>) => (
    <UnifiedUserCard
      {...props}
      variant="normal"
      showProfileImage={true}
      showRoleBadge={true}
      showCountryFlag={true}
      showTimestamp={true}
      enableEffects={true}
      imageSize="medium"
    />
  ),
  
  // بطاقة الأثرياء
  Richest: (props: Omit<UnifiedUserCardProps, 'variant'>) => (
    <UnifiedUserCard
      {...props}
      variant="normal"
      showProfileImage={true}
      showRoleBadge={true}
      showCountryFlag={true}
      showMedal={true}
      enableEffects={true}
      imageSize="small"
    />
  ),
  
  // بطاقة الإعدادات
  Settings: (props: Omit<UnifiedUserCardProps, 'variant'>) => (
    <UnifiedUserCard
      {...props}
      variant="compact"
      showProfileImage={false}
      showRoleBadge={false}
      showCountryFlag={false}
      enableEffects={true}
      enableMenu={false}
    />
  ),
};
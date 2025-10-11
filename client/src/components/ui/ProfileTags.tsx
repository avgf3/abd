import React from 'react';

export interface ProfileTag {
  type: string;
  text: string;
  color: string;
  bgColor?: string;
  icon?: string;
}

interface ProfileTagsProps {
  tags: ProfileTag[];
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export default function ProfileTags({ tags, size = 'medium', className = '' }: ProfileTagsProps) {
  if (!tags || tags.length === 0) return null;

  const sizeClasses = {
    small: 'text-[10px] px-1.5 py-0.5 min-h-[16px]',
    medium: 'text-[11px] px-2 py-0.5 min-h-[18px]',
    large: 'text-[12px] px-2.5 py-1 min-h-[20px]',
  };

  const containerClasses = {
    small: 'gap-1',
    medium: 'gap-1.5',
    large: 'gap-2',
  };

  return (
    <div className={`absolute -top-1 -right-1 z-10 flex flex-col ${containerClasses[size]} ${className}`}>
      {tags.slice(0, 3).map((tag, index) => (
        <div
          key={`${tag.type}-${index}`}
          className={`
            ${sizeClasses[size]}
            inline-flex items-center justify-center
            rounded-full font-bold
            shadow-lg border border-white/20
            backdrop-blur-sm
            transition-all duration-200 hover:scale-105
            whitespace-nowrap
          `}
          style={{
            backgroundColor: tag.bgColor || tag.color || '#3B82F6',
            color: '#FFFFFF',
            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
            boxShadow: `0 2px 8px ${tag.color || '#3B82F6'}40, inset 0 1px 0 rgba(255,255,255,0.2)`,
          }}
          title={tag.text}
        >
          {tag.icon && (
            <span className="mr-1" style={{ fontSize: size === 'small' ? '8px' : size === 'large' ? '10px' : '9px' }}>
              {tag.icon}
            </span>
          )}
          <span className="font-extrabold tracking-wide">
            {tag.text}
          </span>
        </div>
      ))}
      
      {tags.length > 3 && (
        <div
          className={`
            ${sizeClasses[size]}
            inline-flex items-center justify-center
            rounded-full font-bold
            shadow-lg border border-white/20
            backdrop-blur-sm
            bg-gray-600/90 text-white
            transition-all duration-200 hover:scale-105
          `}
          title={`+${tags.length - 3} تاجات أخرى`}
        >
          <span className="font-extrabold">+{tags.length - 3}</span>
        </div>
      )}
    </div>
  );
}

// تاجات محددة مسبقاً
export const PREDEFINED_TAGS: Record<string, ProfileTag> = {
  vip: {
    type: 'vip',
    text: 'VIP',
    color: '#FFD700',
    bgColor: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
    icon: '👑'
  },
  premium: {
    type: 'premium',
    text: 'Premium',
    color: '#FF6B6B',
    bgColor: 'linear-gradient(135deg, #FF6B6B 0%, #FF5252 100%)',
    icon: '⭐'
  },
  admin: {
    type: 'admin',
    text: 'Admin',
    color: '#8B5CF6',
    bgColor: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
    icon: '🛡️'
  },
  moderator: {
    type: 'moderator',
    text: 'Mod',
    color: '#10B981',
    bgColor: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    icon: '🔨'
  },
  verified: {
    type: 'verified',
    text: 'Verified',
    color: '#3B82F6',
    bgColor: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
    icon: '✓'
  },
  new: {
    type: 'new',
    text: 'New',
    color: '#06D6A0',
    bgColor: 'linear-gradient(135deg, #06D6A0 0%, #048A81 100%)',
    icon: '🆕'
  },
  hot: {
    type: 'hot',
    text: 'Hot',
    color: '#FF4757',
    bgColor: 'linear-gradient(135deg, #FF4757 0%, #FF3742 100%)',
    icon: '🔥'
  },
  top: {
    type: 'top',
    text: 'Top',
    color: '#FFA726',
    bgColor: 'linear-gradient(135deg, #FFA726 0%, #FF9800 100%)',
    icon: '🏆'
  },
  star: {
    type: 'star',
    text: 'Star',
    color: '#FFEB3B',
    bgColor: 'linear-gradient(135deg, #FFEB3B 0%, #FFC107 100%)',
    icon: '⭐'
  },
  diamond: {
    type: 'diamond',
    text: 'Diamond',
    color: '#E1F5FE',
    bgColor: 'linear-gradient(135deg, #81D4FA 0%, #29B6F6 100%)',
    icon: '💎'
  }
};
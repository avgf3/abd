import React from 'react';

export interface ProfileTag {
  type: string;
  text: string;
  color?: string;
  bgColor?: string;
  icon?: string;
  image?: string; // مسار الصورة للتاج
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
      {tags.slice(0, 3).map((tag, index) => {
        // إذا كان التاج يحتوي على صورة، استخدم الصورة
        if (tag.image) {
          const imageSize = size === 'small' ? 20 : size === 'large' ? 28 : 24;
          return (
            <img
              key={`${tag.type}-${index}`}
              src={tag.image}
              alt={tag.text || tag.type}
              className="transition-all duration-200 hover:scale-105 drop-shadow-lg"
              style={{
                width: imageSize,
                height: imageSize,
                objectFit: 'contain',
              }}
              title={tag.text || tag.type}
            />
          );
        }
        
        // إذا لم تكن هناك صورة، استخدم النمط القديم
        return (
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
        );
      })}
      
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

// تاجات محددة مسبقاً - باستخدام الصور الفعلية
export const PREDEFINED_TAGS: Record<string, ProfileTag> = {
  tag1: {
    type: 'tag1',
    text: 'Tag 1',
    image: '/tags/tag1.png'
  },
  tag2: {
    type: 'tag2',
    text: 'Tag 2', 
    image: '/tags/tag2.png'
  },
  tag3: {
    type: 'tag3',
    text: 'Tag 3',
    image: '/tags/tag3.jpg'
  },
  tag4: {
    type: 'tag4',
    text: 'Tag 4',
    image: '/tags/tag4.png'
  },
  tag5: {
    type: 'tag5',
    text: 'Tag 5',
    image: '/tags/tag5.png'
  },
  tag6: {
    type: 'tag6',
    text: 'Tag 6',
    image: '/tags/tag6.png'
  },
  tag7: {
    type: 'tag7',
    text: 'Tag 7',
    image: '/tags/tag7.png'
  }
};
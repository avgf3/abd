'use client';

import React from 'react';

interface ImageAttachmentBadgeProps {
  className?: string;
  title?: string;
}

// أيقونة بطاقة الصورة فقط بدون فقاعة/سهم/نقاط
export default function ImageAttachmentBadge({ className = '', title = 'عرض الصورة' }: ImageAttachmentBadgeProps) {
  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      role="img"
      aria-label={title}
      title={title}
    >
      <svg width="28" height="20" viewBox="0 0 28 20" aria-hidden="true">
        {/* بطاقة الصورة فقط */}
        <rect x="0" y="0" rx="4" ry="4" width="28" height="20" fill="#fbbf24" />
        <circle cx="6" cy="5.5" r="3" fill="#ffffff" fillOpacity="0.7" />
        <path d="M4 16 L11 10 L15 13 L19 11 L24 16 Z" fill="#ffffff" fillOpacity="0.7" />
      </svg>
    </div>
  );
}

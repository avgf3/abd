'use client';

import React from 'react';

interface ImageAttachmentBadgeProps {
  className?: string;
  title?: string;
}

// أيقونة تشبه المثال: فقاعة خفيفة وخلفها بطاقة صورة وثلاث نقاط وسهم أخضر
export default function ImageAttachmentBadge({ className = '', title = 'عرض الصورة' }: ImageAttachmentBadgeProps) {
  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      role="img"
      aria-label={title}
      title={title}
      style={{ width: 84, height: 53 }}
    >
      <svg width="84" height="53" viewBox="0 0 84 53" aria-hidden="true">
        {/* فقاعة أساسية */}
        <g>
          <path d="M10 11 C10 6, 14 3, 20 3 L56 3 C70 3, 74 10, 74 19 C74 28, 69 33, 58 34 L36 34 L24 46 C23 47, 21 47, 21 45 L22 34 C15 34, 10 29, 10 23 Z" fill="#f1f2f4" />
        </g>
        {/* بطاقة صورة داخل الفقاعة */}
        <g transform="translate(22,12)">
          <rect x="0" y="0" rx="4" ry="4" width="28" height="20" fill="#fbbf24" />
          <circle cx="6" cy="5.5" r="3" fill="#ffffff" fillOpacity="0.7" />
          <path d="M4 16 L11 10 L15 13 L19 11 L24 16 Z" fill="#ffffff" fillOpacity="0.7" />
        </g>
        {/* ثلاث نقاط عمودية */}
        <g transform="translate(54,16)" fill="#c1c6ce">
          <circle cx="0" cy="2" r="2" />
          <circle cx="0" cy="9" r="2" />
          <circle cx="0" cy="16" r="2" />
        </g>
        {/* سهم أخضر على اليمين */}
        <g transform="translate(64,20)">
          <path d="M0 6 L12 6 M10 2 L12 6 L10 10" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>
      </svg>
    </div>
  );
}

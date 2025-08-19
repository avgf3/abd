/**
 * بيانات الإطارات المتاحة
 * كل إطار له معلومات دقيقة للعرض الأمثل
 */

import type { FrameInfo, FrameType, FrameCategory } from '@/types/avatarFrame';

export const FRAMES_DATA: Record<FrameType, FrameInfo> = {
  'none': {
    id: 'none',
    name: 'بدون إطار',
    category: 'special',
    fileName: '',
    sizeRatio: 1,
    isCircular: true,
    priority: 0
  },
  
  // إطارات التاج
  'crown-gold': {
    id: 'crown-gold',
    name: 'تاج ذهبي',
    category: 'crown',
    fileName: 'enhanced-crown-frame.svg',
    sizeRatio: 1.3,
    isCircular: false,
    priority: 90,
    primaryColor: '#FFD700'
  },
  'crown-silver': {
    id: 'crown-silver',
    name: 'تاج فضي',
    category: 'crown',
    fileName: 'crown-frame-silver.svg',
    sizeRatio: 1.3,
    isCircular: false,
    priority: 85,
    primaryColor: '#C0C0C0'
  },
  'crown-rosegold': {
    id: 'crown-rosegold',
    name: 'تاج ذهبي وردي',
    category: 'crown',
    fileName: 'crown-frame-rosegold.svg',
    sizeRatio: 1.3,
    isCircular: false,
    priority: 88,
    primaryColor: '#B76E79'
  },
  'crown-blue': {
    id: 'crown-blue',
    name: 'تاج أزرق',
    category: 'crown',
    fileName: 'crown-frame-blue.svg',
    sizeRatio: 1.3,
    isCircular: false,
    priority: 82,
    primaryColor: '#4169E1'
  },
  'crown-emerald': {
    id: 'crown-emerald',
    name: 'تاج زمردي',
    category: 'crown',
    fileName: 'crown-frame-emerald.svg',
    sizeRatio: 1.3,
    isCircular: false,
    priority: 84,
    primaryColor: '#50C878'
  },
  'crown-purple': {
    id: 'crown-purple',
    name: 'تاج بنفسجي',
    category: 'crown',
    fileName: 'crown-frame-purple.svg',
    sizeRatio: 1.3,
    isCircular: false,
    priority: 83,
    primaryColor: '#9370DB'
  },
  'crown-classic-gold': {
    id: 'crown-classic-gold',
    name: 'تاج كلاسيكي ذهبي',
    category: 'crown',
    fileName: 'crown-frame-classic-gold.svg',
    sizeRatio: 1.25,
    isCircular: true,
    priority: 75,
    primaryColor: '#FFD700'
  },
  'crown-classic-pink': {
    id: 'crown-classic-pink',
    name: 'تاج كلاسيكي وردي',
    category: 'crown',
    fileName: 'crown-frame-classic-coolpink.svg',
    sizeRatio: 1.25,
    isCircular: true,
    priority: 74,
    primaryColor: '#FFC0CB'
  },
  
  // إطارات SVIP
  'svip1-gold': {
    id: 'svip1-gold',
    name: 'SVIP1 ذهبي',
    category: 'svip',
    fileName: 'svip1-frame-gold.svg',
    sizeRatio: 1.35,
    isCircular: false,
    priority: 95,
    primaryColor: '#FFD700'
  },
  'svip1-pink': {
    id: 'svip1-pink',
    name: 'SVIP1 وردي',
    category: 'svip',
    fileName: 'svip1-frame-pink.svg',
    sizeRatio: 1.35,
    isCircular: false,
    priority: 94,
    primaryColor: '#FF69B4'
  },
  'svip2-gold': {
    id: 'svip2-gold',
    name: 'SVIP2 ذهبي',
    category: 'svip',
    fileName: 'svip2-frame-gold.svg',
    sizeRatio: 1.4,
    isCircular: false,
    priority: 98,
    primaryColor: '#FFD700'
  },
  'svip2-pink': {
    id: 'svip2-pink',
    name: 'SVIP2 وردي',
    category: 'svip',
    fileName: 'svip2-frame-pink.svg',
    sizeRatio: 1.4,
    isCircular: false,
    priority: 97,
    primaryColor: '#FF1493'
  },
  
  // إطارات خاصة
  'wings-king': {
    id: 'wings-king',
    name: 'أجنحة الملك',
    category: 'wings',
    fileName: 'wings-frame-king.svg',
    sizeRatio: 1.5,
    isCircular: false,
    priority: 100,
    primaryColor: '#FFD700'
  },
  'wings-queen': {
    id: 'wings-queen',
    name: 'أجنحة الملكة',
    category: 'wings',
    fileName: 'wings-frame-queen.svg',
    sizeRatio: 1.5,
    isCircular: false,
    priority: 99,
    primaryColor: '#FF69B4'
  }
};

// دالة مساعدة للحصول على معلومات الإطار
export function getFrameInfo(frameId: FrameType): FrameInfo {
  return FRAMES_DATA[frameId] || FRAMES_DATA.none;
}

// دالة للحصول على قائمة الإطارات حسب التصنيف
export function getFramesByCategory(category: FrameCategory): FrameInfo[] {
  return Object.values(FRAMES_DATA)
    .filter(frame => frame.category === category)
    .sort((a, b) => b.priority - a.priority);
}

// دالة للحصول على جميع الإطارات مرتبة حسب الأولوية
export function getAllFrames(): FrameInfo[] {
  return Object.values(FRAMES_DATA)
    .filter(frame => frame.id !== 'none')
    .sort((a, b) => b.priority - a.priority);
}

// دالة للتحقق من صحة ID الإطار
export function isValidFrameId(frameId: string): frameId is FrameType {
  return frameId in FRAMES_DATA;
}
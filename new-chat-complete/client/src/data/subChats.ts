// بيانات الغرف الفرعية (sub-chats)
export interface SubChat {
  id: string;
  nameAr: string;
  nameEn: string;
  path: string;
  parentPath: string;
  title: string;
  metaDescription: string;
  keywords: string[];
  chatLinks: {
    name: string;
    description?: string;
  }[];
}

export const subChats: SubChat[] = [
  // إمامير
  {
    id: 'emamir-mobile',
    nameAr: 'إمامير جوال',
    nameEn: 'Emamir Mobile',
    path: '/emamir/mobile',
    parentPath: '/emamir',
    title: 'إمامير جوال - دردشة جوال إمامير',
    metaDescription: 'إمامير جوال: دردشة جوال للإمامير في غرف متنوعة.',
    keywords: ['إمامير جوال', 'شات جوال', 'دردشة إمامير'],
    chatLinks: [
      { name: 'شات إمامير جوال العام', description: 'دردشة جوال إمامير العامة' },
      { name: 'شات إمامير جوال الخاص', description: 'دردشة جوال إمامير الخاصة' }
    ]
  },

  // الصبايا
  {
    id: 'sabaya-sabaya-chat',
    nameAr: 'شات الصبايا',
    nameEn: 'Sabaya Chat',
    path: '/sabaya/sabaya-chat',
    parentPath: '/sabaya',
    title: 'شات الصبايا - دردشة الصبايا',
    metaDescription: 'شات الصبايا: غرفة دردشة خاصة بالصبايا.',
    keywords: ['شات الصبايا', 'دردشة صبايا'],
    chatLinks: [
      { name: 'شات الصبايا العام', description: 'دردشة الصبايا العامة' },
      { name: 'شات الصبايا الخاص', description: 'دردشة الصبايا الخاصة' }
    ]
  },
  {
    id: 'sabaya-elegant-chat',
    nameAr: 'دردشة راقية',
    nameEn: 'Elegant Chat',
    path: '/sabaya/elegant-chat',
    parentPath: '/sabaya',
    title: 'دردشة راقية - دردشة الصبايا الراقية',
    metaDescription: 'دردشة راقية: غرفة دردشة راقية للصبايا.',
    keywords: ['دردشة راقية', 'شات راقي', 'دردشة صبايا'],
    chatLinks: [
      { name: 'دردشة راقية عامة', description: 'دردشة راقية عامة' },
      { name: 'دردشة راقية خاصة', description: 'دردشة راقية خاصة' }
    ]
  },

  // دردشتي
  {
    id: 'dardashti-general-chat',
    nameAr: 'دردشتي العام',
    nameEn: 'Dardashti General',
    path: '/dardashti/general-chat',
    parentPath: '/dardashti',
    title: 'دردشتي العام - دردشة دردشتي العامة',
    metaDescription: 'دردشتي العام: غرفة دردشة دردشتي العامة.',
    keywords: ['دردشتي العام', 'شات دردشتي'],
    chatLinks: [
      { name: 'دردشتي العام', description: 'دردشة دردشتي العامة' }
    ]
  },
  {
    id: 'dardashti-friends-chat',
    nameAr: 'أصدقاء دردشتي',
    nameEn: 'Dardashti Friends',
    path: '/dardashti/friends-chat',
    parentPath: '/dardashti',
    title: 'أصدقاء دردشتي - دردشة أصدقاء دردشتي',
    metaDescription: 'أصدقاء دردشتي: غرفة دردشة أصدقاء دردشتي.',
    keywords: ['أصدقاء دردشتي', 'شات أصدقاء'],
    chatLinks: [
      { name: 'أصدقاء دردشتي', description: 'دردشة أصدقاء دردشتي' }
    ]
  },

  // مزز
  {
    id: 'mezz-mezz-general',
    nameAr: 'مزز العام',
    nameEn: 'Mezz General',
    path: '/mezz/mezz-general',
    parentPath: '/mezz',
    title: 'مزز العام - دردشة مزز العامة',
    metaDescription: 'مزز العام: غرفة دردشة مزز العامة.',
    keywords: ['مزز العام', 'شات مزز'],
    chatLinks: [
      { name: 'مزز العام', description: 'دردشة مزز العامة' }
    ]
  },
  {
    id: 'mezz-mezz-mobile',
    nameAr: 'مزز جوال',
    nameEn: 'Mezz Mobile',
    path: '/mezz/mezz-mobile',
    parentPath: '/mezz',
    title: 'مزز جوال - دردشة مزز الجوال',
    metaDescription: 'مزز جوال: غرفة دردشة مزز الجوال.',
    keywords: ['مزز جوال', 'شات مزز جوال'],
    chatLinks: [
      { name: 'مزز جوال', description: 'دردشة مزز الجوال' }
    ]
  },

  // أونلاين شات
  {
    id: 'online-chat-live-chat',
    nameAr: 'شات مباشر',
    nameEn: 'Live Chat',
    path: '/online-chat/live-chat',
    parentPath: '/online-chat',
    title: 'شات مباشر - دردشة مباشرة',
    metaDescription: 'شات مباشر: غرفة دردشة مباشرة.',
    keywords: ['شات مباشر', 'دردشة مباشرة'],
    chatLinks: [
      { name: 'شات مباشر', description: 'دردشة مباشرة' }
    ]
  },
  {
    id: 'online-chat-instant-chat',
    nameAr: 'شات فوري',
    nameEn: 'Instant Chat',
    path: '/online-chat/instant-chat',
    parentPath: '/online-chat',
    title: 'شات فوري - دردشة فورية',
    metaDescription: 'شات فوري: غرفة دردشة فورية.',
    keywords: ['شات فوري', 'دردشة فورية'],
    chatLinks: [
      { name: 'شات فوري', description: 'دردشة فورية' }
    ]
  },

  // أحلا لمة
  {
    id: 'ahla-lamma-friends-gathering',
    nameAr: 'لمة الأصدقاء',
    nameEn: 'Friends Gathering',
    path: '/ahla-lamma/friends-gathering',
    parentPath: '/ahla-lamma',
    title: 'لمة الأصدقاء - دردشة لمة الأصدقاء',
    metaDescription: 'لمة الأصدقاء: غرفة دردشة لمة الأصدقاء.',
    keywords: ['لمة الأصدقاء', 'دردشة أصدقاء'],
    chatLinks: [
      { name: 'لمة الأصدقاء', description: 'دردشة لمة الأصدقاء' }
    ]
  },
  {
    id: 'ahla-lamma-arabic-gathering',
    nameAr: 'لمة عربية',
    nameEn: 'Arabic Gathering',
    path: '/ahla-lamma/arabic-gathering',
    parentPath: '/ahla-lamma',
    title: 'لمة عربية - دردشة لمة عربية',
    metaDescription: 'لمة عربية: غرفة دردشة لمة عربية.',
    keywords: ['لمة عربية', 'دردشة عربية'],
    chatLinks: [
      { name: 'لمة عربية', description: 'دردشة لمة عربية' }
    ]
  },

  // شات الحلوين
  {
    id: 'beautiful-chat-beautiful-chat',
    nameAr: 'شات الحلوين',
    nameEn: 'Beautiful Chat',
    path: '/beautiful-chat/beautiful-chat',
    parentPath: '/beautiful-chat',
    title: 'شات الحلوين - دردشة الحلوين',
    metaDescription: 'شات الحلوين: غرفة دردشة الحلوين.',
    keywords: ['شات الحلوين', 'دردشة حلوين'],
    chatLinks: [
      { name: 'شات الحلوين', description: 'دردشة الحلوين' }
    ]
  },
  {
    id: 'beautiful-chat-sweetest-chat',
    nameAr: 'أحلى دردشة',
    nameEn: 'Sweetest Chat',
    path: '/beautiful-chat/sweetest-chat',
    parentPath: '/beautiful-chat',
    title: 'أحلى دردشة - أحلى دردشة',
    metaDescription: 'أحلى دردشة: غرفة أحلى دردشة.',
    keywords: ['أحلى دردشة', 'دردشة حلوة'],
    chatLinks: [
      { name: 'أحلى دردشة', description: 'أحلى دردشة' }
    ]
  },

  // بدون تسجيل
  {
    id: 'no-signup-quick-chat',
    nameAr: 'دردشة سريعة',
    nameEn: 'Quick Chat',
    path: '/no-signup/quick-chat',
    parentPath: '/no-signup',
    title: 'دردشة سريعة - دردشة سريعة بدون تسجيل',
    metaDescription: 'دردشة سريعة: غرفة دردشة سريعة بدون تسجيل.',
    keywords: ['دردشة سريعة', 'شات سريع'],
    chatLinks: [
      { name: 'دردشة سريعة', description: 'دردشة سريعة بدون تسجيل' }
    ]
  },
  {
    id: 'no-signup-instant-entry',
    nameAr: 'دخول فوري',
    nameEn: 'Instant Entry',
    path: '/no-signup/instant-entry',
    parentPath: '/no-signup',
    title: 'دخول فوري - دخول فوري بدون تسجيل',
    metaDescription: 'دخول فوري: غرفة دخول فوري بدون تسجيل.',
    keywords: ['دخول فوري', 'دردشة فورية'],
    chatLinks: [
      { name: 'دخول فوري', description: 'دخول فوري بدون تسجيل' }
    ]
  }
];

// دالة للحصول على بيانات غرفة فرعية بواسطة المسار
export function getSubChatByPath(path: string): SubChat | undefined {
  return subChats.find(subChat => subChat.path === path);
}

// دالة للحصول على بيانات غرفة فرعية بواسطة المعرف
export function getSubChatById(id: string): SubChat | undefined {
  return subChats.find(subChat => subChat.id === id);
}

// دالة للحصول على جميع الغرف الفرعية لدولة معينة
export function getSubChatsByParent(parentPath: string): SubChat[] {
  return subChats.filter(subChat => subChat.parentPath === parentPath);
}
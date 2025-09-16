// بيانات العواصم والمدن وروابط الشات الخاصة بكل مدينة
export interface CityChat {
  id: string;
  nameAr: string;
  nameEn: string;
  path: string;
  countryPath: string;
  title: string;
  metaDescription: string;
  keywords: string[];
  chatLinks: {
    name: string;
    description?: string;
  }[];
}

export const cityChats: CityChat[] = [
  // عمان
  {
    id: 'muscat',
    nameAr: 'شات مسقط',
    nameEn: 'Muscat Chat',
    path: '/oman/muscat',
    countryPath: '/oman',
    title: 'شات مسقط - دردشة العاصمة مسقط',
    metaDescription: 'شات مسقط للتعارف والدردشة مع شباب وبنات من العاصمة مسقط. دردشة مسقطية مجانية بدون تسجيل.',
    keywords: ['شات مسقط', 'دردشة مسقطية', 'تعارف مسقط', 'بنات مسقط'],
    chatLinks: [
      { name: 'شات مسقط العام', description: 'دردشة عامة لمسقط' },
      { name: 'شات مسقط جوال', description: 'دردشة الجوال المسقطي' },
      { name: 'شات مسقط الليلي', description: 'دردشة مسقط الليلية' }
    ]
  },
  {
    id: 'salalah',
    nameAr: 'شات صلالة',
    nameEn: 'Salalah Chat',
    path: '/oman/salalah',
    countryPath: '/oman',
    title: 'شات صلالة - دردشة مدينة صلالة',
    metaDescription: 'شات صلالة للتعارف والدردشة مع شباب وبنات من مدينة صلالة. دردشة صلالية مجانية بدون تسجيل.',
    keywords: ['شات صلالة', 'دردشة صلالية', 'تعارف صلالة', 'بنات صلالة'],
    chatLinks: [
      { name: 'شات صلالة العام', description: 'دردشة عامة لصلالة' },
      { name: 'شات صلالة جوال', description: 'دردشة الجوال الصلالي' },
      { name: 'شات صلالة السياحي', description: 'دردشة السياحة في صلالة' }
    ]
  },
  {
    id: 'nizwa',
    nameAr: 'شات نزوى',
    nameEn: 'Nizwa Chat',
    path: '/oman/nizwa',
    countryPath: '/oman',
    title: 'شات نزوى - دردشة مدينة نزوى',
    metaDescription: 'شات نزوى للتعارف والدردشة مع شباب وبنات من مدينة نزوى. دردشة نزوية مجانية بدون تسجيل.',
    keywords: ['شات نزوى', 'دردشة نزوية', 'تعارف نزوى', 'بنات نزوى'],
    chatLinks: [
      { name: 'شات نزوى العام', description: 'دردشة عامة لنزوى' },
      { name: 'شات نزوى التاريخي', description: 'دردشة التاريخ في نزوى' },
      { name: 'شات نزوى جوال', description: 'دردشة الجوال النزوي' }
    ]
  },
  {
    id: 'sohar',
    nameAr: 'شات صحار',
    nameEn: 'Sohar Chat',
    path: '/oman/sohar',
    countryPath: '/oman',
    title: 'شات صحار - دردشة مدينة صحار',
    metaDescription: 'شات صحار للتعارف والدردشة مع شباب وبنات من مدينة صحار. دردشة صحارية مجانية بدون تسجيل.',
    keywords: ['شات صحار', 'دردشة صحارية', 'تعارف صحار', 'بنات صحار'],
    chatLinks: [
      { name: 'شات صحار العام', description: 'دردشة عامة لصحار' },
      { name: 'شات صحار الصناعي', description: 'دردشة الصناعة في صحار' },
      { name: 'شات صحار جوال', description: 'دردشة الجوال الصحاري' }
    ]
  },

  // مصر
  {
    id: 'cairo',
    nameAr: 'شات القاهرة',
    nameEn: 'Cairo Chat',
    path: '/egypt/cairo',
    countryPath: '/egypt',
    title: 'شات القاهرة - دردشة العاصمة القاهرة',
    metaDescription: 'شات القاهرة للتعارف والدردشة مع شباب وبنات من العاصمة القاهرة. دردشة قاهرية مجانية بدون تسجيل.',
    keywords: ['شات القاهرة', 'دردشة قاهرية', 'تعارف القاهرة', 'بنات القاهرة'],
    chatLinks: [
      { name: 'شات القاهرة العام', description: 'دردشة عامة للقاهرة' },
      { name: 'شات القاهرة التاريخي', description: 'دردشة التاريخ في القاهرة' },
      { name: 'شات القاهرة جوال', description: 'دردشة الجوال القاهري' }
    ]
  },
  {
    id: 'alexandria',
    nameAr: 'شات الإسكندرية',
    nameEn: 'Alexandria Chat',
    path: '/egypt/alexandria',
    countryPath: '/egypt',
    title: 'شات الإسكندرية - دردشة مدينة الإسكندرية',
    metaDescription: 'شات الإسكندرية للتعارف والدردشة مع شباب وبنات من مدينة الإسكندرية. دردشة إسكندرانية مجانية بدون تسجيل.',
    keywords: ['شات الإسكندرية', 'دردشة إسكندرانية', 'تعارف الإسكندرية', 'بنات الإسكندرية'],
    chatLinks: [
      { name: 'شات الإسكندرية العام', description: 'دردشة عامة للإسكندرية' },
      { name: 'شات الإسكندرية البحري', description: 'دردشة البحر في الإسكندرية' },
      { name: 'شات الإسكندرية جوال', description: 'دردشة الجوال الإسكندراني' }
    ]
  },
  {
    id: 'giza',
    nameAr: 'شات الجيزة',
    nameEn: 'Giza Chat',
    path: '/egypt/giza',
    countryPath: '/egypt',
    title: 'شات الجيزة - دردشة محافظة الجيزة',
    metaDescription: 'شات الجيزة للتعارف والدردشة مع شباب وبنات من محافظة الجيزة. دردشة جيزية مجانية بدون تسجيل.',
    keywords: ['شات الجيزة', 'دردشة جيزية', 'تعارف الجيزة', 'بنات الجيزة'],
    chatLinks: [
      { name: 'شات الجيزة العام', description: 'دردشة عامة للجيزة' },
      { name: 'شات الجيزة الأهرامات', description: 'دردشة الأهرامات في الجيزة' },
      { name: 'شات الجيزة جوال', description: 'دردشة الجوال الجيزي' }
    ]
  },

  // السعودية
  {
    id: 'riyadh',
    nameAr: 'شات الرياض',
    nameEn: 'Riyadh Chat',
    path: '/saudi/riyadh',
    countryPath: '/saudi',
    title: 'شات الرياض - دردشة العاصمة الرياض',
    metaDescription: 'شات الرياض للتعارف والدردشة مع شباب وبنات من العاصمة الرياض. دردشة رياضية مجانية بدون تسجيل.',
    keywords: ['شات الرياض', 'دردشة رياضية', 'تعارف الرياض', 'بنات الرياض'],
    chatLinks: [
      { name: 'شات الرياض العام', description: 'دردشة عامة للرياض' },
      { name: 'شات الرياض التجاري', description: 'دردشة التجارة في الرياض' },
      { name: 'شات الرياض جوال', description: 'دردشة الجوال الرياضي' }
    ]
  },
  {
    id: 'jeddah',
    nameAr: 'شات جدة',
    nameEn: 'Jeddah Chat',
    path: '/saudi/jeddah',
    countryPath: '/saudi',
    title: 'شات جدة - دردشة مدينة جدة',
    metaDescription: 'شات جدة للتعارف والدردشة مع شباب وبنات من مدينة جدة. دردشة جدة مجانية بدون تسجيل.',
    keywords: ['شات جدة', 'دردشة جدة', 'تعارف جدة', 'بنات جدة'],
    chatLinks: [
      { name: 'شات جدة العام', description: 'دردشة عامة لجدة' },
      { name: 'شات جدة البحري', description: 'دردشة البحر في جدة' },
      { name: 'شات جدة جوال', description: 'دردشة الجوال الجداوي' }
    ]
  },
  {
    id: 'makkah',
    nameAr: 'شات مكة',
    nameEn: 'Makkah Chat',
    path: '/saudi/makkah',
    countryPath: '/saudi',
    title: 'شات مكة - دردشة مكة المكرمة',
    metaDescription: 'شات مكة للتعارف والدردشة مع شباب وبنات من مكة المكرمة. دردشة مكية مجانية بدون تسجيل.',
    keywords: ['شات مكة', 'دردشة مكية', 'تعارف مكة', 'بنات مكة'],
    chatLinks: [
      { name: 'شات مكة العام', description: 'دردشة عامة لمكة' },
      { name: 'شات مكة المقدس', description: 'دردشة المقدسات في مكة' },
      { name: 'شات مكة جوال', description: 'دردشة الجوال المكي' }
    ]
  },
  {
    id: 'medina',
    nameAr: 'شات المدينة',
    nameEn: 'Medina Chat',
    path: '/saudi/medina',
    countryPath: '/saudi',
    title: 'شات المدينة - دردشة المدينة المنورة',
    metaDescription: 'شات المدينة للتعارف والدردشة مع شباب وبنات من المدينة المنورة. دردشة مدنية مجانية بدون تسجيل.',
    keywords: ['شات المدينة', 'دردشة مدنية', 'تعارف المدينة', 'بنات المدينة'],
    chatLinks: [
      { name: 'شات المدينة العام', description: 'دردشة عامة للمدينة' },
      { name: 'شات المدينة المقدس', description: 'دردشة المقدسات في المدينة' },
      { name: 'شات المدينة جوال', description: 'دردشة الجوال المدني' }
    ]
  },
  {
    id: 'dammam',
    nameAr: 'شات الدمام',
    nameEn: 'Dammam Chat',
    path: '/saudi/dammam',
    countryPath: '/saudi',
    title: 'شات الدمام - دردشة مدينة الدمام',
    metaDescription: 'شات الدمام للتعارف والدردشة مع شباب وبنات من مدينة الدمام. دردشة دمامية مجانية بدون تسجيل.',
    keywords: ['شات الدمام', 'دردشة دمامية', 'تعارف الدمام', 'بنات الدمام'],
    chatLinks: [
      { name: 'شات الدمام العام', description: 'دردشة عامة للدمام' },
      { name: 'شات الدمام النفطي', description: 'دردشة النفط في الدمام' },
      { name: 'شات الدمام جوال', description: 'دردشة الجوال الدمامي' }
    ]
  },

  // الإمارات
  {
    id: 'dubai',
    nameAr: 'شات دبي',
    nameEn: 'Dubai Chat',
    path: '/uae/dubai',
    countryPath: '/uae',
    title: 'شات دبي - دردشة إمارة دبي',
    metaDescription: 'شات دبي للتعارف والدردشة مع شباب وبنات من إمارة دبي. دردشة دبي مجانية بدون تسجيل.',
    keywords: ['شات دبي', 'دردشة دبي', 'تعارف دبي', 'بنات دبي'],
    chatLinks: [
      { name: 'شات دبي العام', description: 'دردشة عامة لدبي' },
      { name: 'شات دبي التجاري', description: 'دردشة التجارة في دبي' },
      { name: 'شات دبي جوال', description: 'دردشة الجوال الدبي' }
    ]
  },
  {
    id: 'abudhabi',
    nameAr: 'شات أبوظبي',
    nameEn: 'Abu Dhabi Chat',
    path: '/uae/abudhabi',
    countryPath: '/uae',
    title: 'شات أبوظبي - دردشة العاصمة أبوظبي',
    metaDescription: 'شات أبوظبي للتعارف والدردشة مع شباب وبنات من العاصمة أبوظبي. دردشة أبوظبي مجانية بدون تسجيل.',
    keywords: ['شات أبوظبي', 'دردشة أبوظبي', 'تعارف أبوظبي', 'بنات أبوظبي'],
    chatLinks: [
      { name: 'شات أبوظبي العام', description: 'دردشة عامة لأبوظبي' },
      { name: 'شات أبوظبي الحكومي', description: 'دردشة الحكومة في أبوظبي' },
      { name: 'شات أبوظبي جوال', description: 'دردشة الجوال الأبوظبي' }
    ]
  },
  {
    id: 'sharjah',
    nameAr: 'شات الشارقة',
    nameEn: 'Sharjah Chat',
    path: '/uae/sharjah',
    countryPath: '/uae',
    title: 'شات الشارقة - دردشة إمارة الشارقة',
    metaDescription: 'شات الشارقة للتعارف والدردشة مع شباب وبنات من إمارة الشارقة. دردشة شارقية مجانية بدون تسجيل.',
    keywords: ['شات الشارقة', 'دردشة شارقية', 'تعارف الشارقة', 'بنات الشارقة'],
    chatLinks: [
      { name: 'شات الشارقة العام', description: 'دردشة عامة للشارقة' },
      { name: 'شات الشارقة الثقافي', description: 'دردشة الثقافة في الشارقة' },
      { name: 'شات الشارقة جوال', description: 'دردشة الجوال الشارقي' }
    ]
  },

  // الأردن
  {
    id: 'amman',
    nameAr: 'شات عمان',
    nameEn: 'Amman Chat',
    path: '/jordan/amman',
    countryPath: '/jordan',
    title: 'شات عمان - دردشة العاصمة عمان',
    metaDescription: 'شات عمان للتعارف والدردشة مع شباب وبنات من العاصمة عمان. دردشة عمانية مجانية بدون تسجيل.',
    keywords: ['شات عمان', 'دردشة عمانية', 'تعارف عمان', 'بنات عمان'],
    chatLinks: [
      { name: 'شات عمان العام', description: 'دردشة عامة لعمان' },
      { name: 'شات عمان التاريخي', description: 'دردشة التاريخ في عمان' },
      { name: 'شات عمان جوال', description: 'دردشة الجوال العماني' }
    ]
  },
  {
    id: 'zarqa',
    nameAr: 'شات الزرقاء',
    nameEn: 'Zarqa Chat',
    path: '/jordan/zarqa',
    countryPath: '/jordan',
    title: 'شات الزرقاء - دردشة مدينة الزرقاء',
    metaDescription: 'شات الزرقاء للتعارف والدردشة مع شباب وبنات من مدينة الزرقاء. دردشة زرقاوية مجانية بدون تسجيل.',
    keywords: ['شات الزرقاء', 'دردشة زرقاوية', 'تعارف الزرقاء', 'بنات الزرقاء'],
    chatLinks: [
      { name: 'شات الزرقاء العام', description: 'دردشة عامة للزرقاء' },
      { name: 'شات الزرقاء الصناعي', description: 'دردشة الصناعة في الزرقاء' },
      { name: 'شات الزرقاء جوال', description: 'دردشة الجوال الزرقاوي' }
    ]
  },
  {
    id: 'irbid',
    nameAr: 'شات إربد',
    nameEn: 'Irbid Chat',
    path: '/jordan/irbid',
    countryPath: '/jordan',
    title: 'شات إربد - دردشة مدينة إربد',
    metaDescription: 'شات إربد للتعارف والدردشة مع شباب وبنات من مدينة إربد. دردشة إربدية مجانية بدون تسجيل.',
    keywords: ['شات إربد', 'دردشة إربدية', 'تعارف إربد', 'بنات إربد'],
    chatLinks: [
      { name: 'شات إربد العام', description: 'دردشة عامة لإربد' },
      { name: 'شات إربد الجامعي', description: 'دردشة الجامعة في إربد' },
      { name: 'شات إربد جوال', description: 'دردشة الجوال الإربدي' }
    ]
  },

  // فلسطين
  {
    id: 'jerusalem',
    nameAr: 'شات القدس',
    nameEn: 'Jerusalem Chat',
    path: '/palestine/jerusalem',
    countryPath: '/palestine',
    title: 'شات القدس - دردشة مدينة القدس',
    metaDescription: 'شات القدس للتعارف والدردشة مع شباب وبنات من مدينة القدس. دردشة قدسية مجانية بدون تسجيل.',
    keywords: ['شات القدس', 'دردشة قدسية', 'تعارف القدس', 'بنات القدس'],
    chatLinks: [
      { name: 'شات القدس العام', description: 'دردشة عامة للقدس' },
      { name: 'شات القدس المقدس', description: 'دردشة المقدسات في القدس' },
      { name: 'شات القدس جوال', description: 'دردشة الجوال القدسي' }
    ]
  },
  {
    id: 'gaza',
    nameAr: 'شات غزة',
    nameEn: 'Gaza Chat',
    path: '/palestine/gaza',
    countryPath: '/palestine',
    title: 'شات غزة - دردشة قطاع غزة',
    metaDescription: 'شات غزة للتعارف والدردشة مع شباب وبنات من قطاع غزة. دردشة غزية مجانية بدون تسجيل.',
    keywords: ['شات غزة', 'دردشة غزية', 'تعارف غزة', 'بنات غزة'],
    chatLinks: [
      { name: 'شات غزة العام', description: 'دردشة عامة لغزة' },
      { name: 'شات غزة الصمود', description: 'دردشة الصمود في غزة' },
      { name: 'شات غزة جوال', description: 'دردشة الجوال الغزي' }
    ]
  },
  {
    id: 'ramallah',
    nameAr: 'شات رام الله',
    nameEn: 'Ramallah Chat',
    path: '/palestine/ramallah',
    countryPath: '/palestine',
    title: 'شات رام الله - دردشة مدينة رام الله',
    metaDescription: 'شات رام الله للتعارف والدردشة مع شباب وبنات من مدينة رام الله. دردشة رام الله مجانية بدون تسجيل.',
    keywords: ['شات رام الله', 'دردشة رام الله', 'تعارف رام الله', 'بنات رام الله'],
    chatLinks: [
      { name: 'شات رام الله العام', description: 'دردشة عامة لرام الله' },
      { name: 'شات رام الله السياسي', description: 'دردشة السياسة في رام الله' },
      { name: 'شات رام الله جوال', description: 'دردشة الجوال الرام اللهي' }
    ]
  }
];

// دالة للحصول على بيانات مدينة معينة
export function getCityByPath(path: string): CityChat | undefined {
  return cityChats.find(city => city.path === path);
}

// دالة للحصول على بيانات مدينة بواسطة المعرف
export function getCityById(id: string): CityChat | undefined {
  return cityChats.find(city => city.id === id);
}

// دالة للحصول على جميع المدن لدولة معينة
export function getCitiesByCountry(countryPath: string): CityChat[] {
  return cityChats.filter(city => city.countryPath === countryPath);
}
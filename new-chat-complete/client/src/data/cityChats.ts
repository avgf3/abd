import { getCountryByPath } from '@/data/countryChats';
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
  // إضافة معلومات إضافية للنظام المتكامل
  countryId?: string;
  region?: string;
  isCapital?: boolean;
  population?: number;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export const cityChats: CityChat[] = [
  // عمان
  {
    id: 'muscat',
    nameAr: 'شات مسقط',
    nameEn: 'Muscat Chat',
    path: '/oman/muscat',
    countryPath: '/oman',
    countryId: 'oman',
    region: 'العاصمة',
    isCapital: true,
    population: 1400000,
    coordinates: { lat: 23.5880, lng: 58.3829 },
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
    countryId: 'oman',
    region: 'ظفار',
    isCapital: false,
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
    countryId: 'egypt',
    region: 'القاهرة الكبرى',
    isCapital: true,
    population: 10200000,
    coordinates: { lat: 30.0444, lng: 31.2357 },
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
    countryId: 'saudi',
    region: 'الرياض',
    isCapital: true,
    population: 7500000,
    coordinates: { lat: 24.7136, lng: 46.6753 },
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
  },

  // مدن إضافية لعمان
  {
    id: 'oman-mobile',
    nameAr: 'شات جوال عمان',
    nameEn: 'Oman Mobile Chat',
    path: '/oman/oman-mobile',
    countryPath: '/oman',
    title: 'شات جوال عمان - دردشة جوال عمانية',
    metaDescription: 'شات جوال عمان للتعارف والدردشة مع شباب وبنات من عمان. دردشة عمانية مجانية بدون تسجيل.',
    keywords: ['شات جوال عمان', 'دردشة عمانية جوال', 'تعارف عمان', 'بنات عمان'],
    chatLinks: [
      { name: 'شات جوال عمان العام', description: 'دردشة جوال عمان العامة' },
      { name: 'شات جوال عمان الخاص', description: 'دردشة جوال عمان الخاصة' }
    ]
  },
  {
    id: 'batinah',
    nameAr: 'شات الباطنة',
    nameEn: 'Batinah Chat',
    path: '/oman/batinah',
    countryPath: '/oman',
    title: 'شات الباطنة - دردشة محافظة الباطنة',
    metaDescription: 'شات الباطنة للتعارف والدردشة مع شباب وبنات من محافظة الباطنة. دردشة باطنية مجانية بدون تسجيل.',
    keywords: ['شات الباطنة', 'دردشة باطنية', 'تعارف الباطنة', 'بنات الباطنة'],
    chatLinks: [
      { name: 'شات الباطنة العام', description: 'دردشة الباطنة العامة' },
      { name: 'شات الباطنة الزراعي', description: 'دردشة الزراعة في الباطنة' }
    ]
  },
  {
    id: 'dhofar',
    nameAr: 'شات ظفار',
    nameEn: 'Dhofar Chat',
    path: '/oman/dhofar',
    countryPath: '/oman',
    title: 'شات ظفار - دردشة محافظة ظفار',
    metaDescription: 'شات ظفار للتعارف والدردشة مع شباب وبنات من محافظة ظفار. دردشة ظفارية مجانية بدون تسجيل.',
    keywords: ['شات ظفار', 'دردشة ظفارية', 'تعارف ظفار', 'بنات ظفار'],
    chatLinks: [
      { name: 'شات ظفار العام', description: 'دردشة ظفار العامة' },
      { name: 'شات ظفار الجنوبي', description: 'دردشة جنوب عمان في ظفار' }
    ]
  },
  {
    id: 'arab-oman',
    nameAr: 'شات عرب عمان',
    nameEn: 'Arab Oman Chat',
    path: '/oman/arab-oman',
    countryPath: '/oman',
    title: 'شات عرب عمان - دردشة عرب عمان',
    metaDescription: 'شات عرب عمان للتعارف والدردشة مع شباب وبنات عرب عمان. دردشة عربية عمانية مجانية بدون تسجيل.',
    keywords: ['شات عرب عمان', 'دردشة عربية عمانية', 'تعارف عرب عمان', 'بنات عرب عمان'],
    chatLinks: [
      { name: 'شات عرب عمان العام', description: 'دردشة عرب عمان العامة' },
      { name: 'شات عرب عمان الثقافي', description: 'دردشة الثقافة العربية في عمان' }
    ]
  },

  // مدن إضافية لمصر
  {
    id: 'egypt-mobile',
    nameAr: 'شات جوال مصر',
    nameEn: 'Egypt Mobile Chat',
    path: '/egypt/egypt-mobile',
    countryPath: '/egypt',
    title: 'شات جوال مصر - دردشة جوال مصرية',
    metaDescription: 'شات جوال مصر للتعارف والدردشة مع شباب وبنات من مصر. دردشة مصرية مجانية بدون تسجيل.',
    keywords: ['شات جوال مصر', 'دردشة مصرية جوال', 'تعارف مصر', 'بنات مصر'],
    chatLinks: [
      { name: 'شات جوال مصر العام', description: 'دردشة جوال مصر العامة' },
      { name: 'شات جوال مصر الخاص', description: 'دردشة جوال مصر الخاصة' }
    ]
  },
  {
    id: 'elders',
    nameAr: 'شات كبار السن',
    nameEn: 'Elders Chat',
    path: '/egypt/elders',
    countryPath: '/egypt',
    title: 'شات كبار السن - دردشة كبار السن في مصر',
    metaDescription: 'شات كبار السن للتعارف والدردشة مع كبار السن في مصر. دردشة مجانية بدون تسجيل.',
    keywords: ['شات كبار السن', 'دردشة كبار السن', 'تعارف كبار السن', 'بنات كبار السن'],
    chatLinks: [
      { name: 'شات كبار السن العام', description: 'دردشة كبار السن العامة' },
      { name: 'شات كبار السن الحكمة', description: 'دردشة الحكمة والخبرة' }
    ]
  },
  {
    id: 'upper-egypt',
    nameAr: 'شات صعيد مصر',
    nameEn: 'Upper Egypt Chat',
    path: '/egypt/upper-egypt',
    countryPath: '/egypt',
    title: 'شات صعيد مصر - دردشة صعيد مصر',
    metaDescription: 'شات صعيد مصر للتعارف والدردشة مع شباب وبنات من صعيد مصر. دردشة صعيدية مجانية بدون تسجيل.',
    keywords: ['شات صعيد مصر', 'دردشة صعيدية', 'تعارف صعيد مصر', 'بنات صعيد مصر'],
    chatLinks: [
      { name: 'شات صعيد مصر العام', description: 'دردشة صعيد مصر العامة' },
      { name: 'شات صعيد مصر التراثي', description: 'دردشة التراث الصعيدي' }
    ]
  },
  {
    id: 'delta',
    nameAr: 'شات الدلتا',
    nameEn: 'Delta Chat',
    path: '/egypt/delta',
    countryPath: '/egypt',
    title: 'شات الدلتا - دردشة الدلتا المصرية',
    metaDescription: 'شات الدلتا للتعارف والدردشة مع شباب وبنات من الدلتا المصرية. دردشة دلتا مجانية بدون تسجيل.',
    keywords: ['شات الدلتا', 'دردشة دلتا', 'تعارف الدلتا', 'بنات الدلتا'],
    chatLinks: [
      { name: 'شات الدلتا العام', description: 'دردشة الدلتا العامة' },
      { name: 'شات الدلتا الزراعي', description: 'دردشة الزراعة في الدلتا' }
    ]
  },
  {
    id: 'best-gathering',
    nameAr: 'شات أحلى لمة',
    nameEn: 'Best Gathering Chat',
    path: '/egypt/best-gathering',
    countryPath: '/egypt',
    title: 'شات أحلى لمة - أحلى لمة مصرية',
    metaDescription: 'شات أحلى لمة للتعارف والدردشة مع شباب وبنات في أحلى لمة مصرية. دردشة مجانية بدون تسجيل.',
    keywords: ['شات أحلى لمة', 'دردشة أحلى لمة', 'تعارف أحلى لمة', 'بنات أحلى لمة'],
    chatLinks: [
      { name: 'شات أحلى لمة العام', description: 'دردشة أحلى لمة العامة' },
      { name: 'شات أحلى لمة الخاص', description: 'دردشة أحلى لمة الخاصة' }
    ]
  },

  // مدن إضافية للسعودية
  {
    id: 'saudi-mobile',
    nameAr: 'شات جوال السعودية',
    nameEn: 'Saudi Mobile Chat',
    path: '/saudi/saudi-mobile',
    countryPath: '/saudi',
    title: 'شات جوال السعودية - دردشة جوال سعودي',
    metaDescription: 'شات جوال السعودية للتعارف والدردشة مع شباب وبنات من السعودية. دردشة سعودية مجانية بدون تسجيل.',
    keywords: ['شات جوال السعودية', 'دردشة سعودية جوال', 'تعارف السعودية', 'بنات السعودية'],
    chatLinks: [
      { name: 'شات جوال السعودية العام', description: 'دردشة جوال سعودي العامة' },
      { name: 'شات جوال السعودية الخاص', description: 'دردشة جوال سعودي الخاصة' }
    ]
  },
  {
    id: 'pioneers',
    nameAr: 'شات الرواد',
    nameEn: 'Pioneers Chat',
    path: '/saudi/pioneers',
    countryPath: '/saudi',
    title: 'شات الرواد - دردشة الرواد في السعودية',
    metaDescription: 'شات الرواد للتعارف والدردشة مع رواد السعودية. دردشة مجانية بدون تسجيل.',
    keywords: ['شات الرواد', 'دردشة الرواد', 'تعارف الرواد', 'بنات الرواد'],
    chatLinks: [
      { name: 'شات الرواد العام', description: 'دردشة الرواد العامة' },
      { name: 'شات الرواد التقني', description: 'دردشة التقنية في السعودية' }
    ]
  },
  {
    id: 'najd',
    nameAr: 'شات نجد',
    nameEn: 'Najd Chat',
    path: '/saudi/najd',
    countryPath: '/saudi',
    title: 'شات نجد - دردشة منطقة نجد',
    metaDescription: 'شات نجد للتعارف والدردشة مع شباب وبنات من منطقة نجد. دردشة نجدية مجانية بدون تسجيل.',
    keywords: ['شات نجد', 'دردشة نجدية', 'تعارف نجد', 'بنات نجد'],
    chatLinks: [
      { name: 'شات نجد العام', description: 'دردشة نجد العامة' },
      { name: 'شات نجد التراثي', description: 'دردشة التراث النجدي' }
    ]
  },

  // مدن إضافية للجزائر
  {
    id: 'algiers',
    nameAr: 'شات الجزائر العاصمة',
    nameEn: 'Algiers Chat',
    path: '/algeria/algiers',
    countryPath: '/algeria',
    countryId: 'algeria',
    region: 'الجزائر العاصمة',
    isCapital: true,
    population: 3500000,
    coordinates: { lat: 36.7538, lng: 3.0588 },
    title: 'شات الجزائر العاصمة - دردشة العاصمة الجزائرية',
    metaDescription: 'شات الجزائر العاصمة للتعارف والدردشة مع شباب وبنات من العاصمة. دردشة جزائرية مجانية بدون تسجيل.',
    keywords: ['شات الجزائر العاصمة', 'دردشة جزائرية', 'تعارف الجزائر', 'بنات الجزائر'],
    chatLinks: [
      { name: 'شات الجزائر العاصمة العام', description: 'دردشة عامة للعاصمة' },
      { name: 'شات الجزائر العاصمة جوال', description: 'دردشة الجوال الجزائري' }
    ]
  },
  {
    id: 'oran',
    nameAr: 'شات وهران',
    nameEn: 'Oran Chat',
    path: '/algeria/oran',
    countryPath: '/algeria',
    countryId: 'algeria',
    region: 'وهران',
    isCapital: false,
    population: 1200000,
    coordinates: { lat: 35.6969, lng: -0.6331 },
    title: 'شات وهران - دردشة مدينة وهران',
    metaDescription: 'شات وهران للتعارف والدردشة مع شباب وبنات من مدينة وهران. دردشة وهرانية مجانية بدون تسجيل.',
    keywords: ['شات وهران', 'دردشة وهرانية', 'تعارف وهران', 'بنات وهران'],
    chatLinks: [
      { name: 'شات وهران العام', description: 'دردشة عامة لوهران' },
      { name: 'شات وهران الساحلي', description: 'دردشة الساحل في وهران' }
    ]
  },
  {
    id: 'constantine',
    nameAr: 'شات قسنطينة',
    nameEn: 'Constantine Chat',
    path: '/algeria/constantine',
    countryPath: '/algeria',
    countryId: 'algeria',
    region: 'قسنطينة',
    isCapital: false,
    population: 500000,
    coordinates: { lat: 36.3650, lng: 6.6147 },
    title: 'شات قسنطينة - دردشة مدينة قسنطينة',
    metaDescription: 'شات قسنطينة للتعارف والدردشة مع شباب وبنات من مدينة قسنطينة. دردشة قسنطينية مجانية بدون تسجيل.',
    keywords: ['شات قسنطينة', 'دردشة قسنطينية', 'تعارف قسنطينة', 'بنات قسنطينة'],
    chatLinks: [
      { name: 'شات قسنطينة العام', description: 'دردشة عامة لقسنطينة' },
      { name: 'شات قسنطينة التاريخي', description: 'دردشة التاريخ في قسنطينة' }
    ]
  },
  {
    id: 'annaba',
    nameAr: 'شات عنابة',
    nameEn: 'Annaba Chat',
    path: '/algeria/annaba',
    countryPath: '/algeria',
    countryId: 'algeria',
    region: 'عنابة',
    isCapital: false,
    population: 350000,
    coordinates: { lat: 36.9000, lng: 7.7667 },
    title: 'شات عنابة - دردشة مدينة عنابة',
    metaDescription: 'شات عنابة للتعارف والدردشة مع شباب وبنات من مدينة عنابة. دردشة عنابية مجانية بدون تسجيل.',
    keywords: ['شات عنابة', 'دردشة عنابية', 'تعارف عنابة', 'بنات عنابة'],
    chatLinks: [
      { name: 'شات عنابة العام', description: 'دردشة عامة لعنابة' },
      { name: 'شات عنابة الساحلي', description: 'دردشة الساحل في عنابة' }
    ]
  },
  {
    id: 'algeria-mobile',
    nameAr: 'شات جوال الجزائر',
    nameEn: 'Algeria Mobile Chat',
    path: '/algeria/algeria-mobile',
    countryPath: '/algeria',
    title: 'شات جوال الجزائر - دردشة جوال جزائري',
    metaDescription: 'شات جوال الجزائر للتعارف والدردشة مع شباب وبنات من الجزائر. دردشة جزائرية مجانية بدون تسجيل.',
    keywords: ['شات جوال الجزائر', 'دردشة جزائرية جوال', 'تعارف الجزائر', 'بنات الجزائر'],
    chatLinks: [
      { name: 'شات جوال الجزائر العام', description: 'دردشة جوال جزائري العامة' },
      { name: 'شات جوال الجزائر الخاص', description: 'دردشة جوال جزائري الخاصة' }
    ]
  },
  {
    id: 'kabylie',
    nameAr: 'شات القبائل',
    nameEn: 'Kabylie Chat',
    path: '/algeria/kabylie',
    countryPath: '/algeria',
    title: 'شات القبائل - دردشة منطقة القبائل',
    metaDescription: 'شات القبائل للتعارف والدردشة مع شباب وبنات من منطقة القبائل. دردشة قبائلية مجانية بدون تسجيل.',
    keywords: ['شات القبائل', 'دردشة قبائلية', 'تعارف القبائل', 'بنات القبائل'],
    chatLinks: [
      { name: 'شات القبائل العام', description: 'دردشة القبائل العامة' },
      { name: 'شات القبائل الثقافي', description: 'دردشة الثقافة القبائلية' }
    ]
  },
  {
    id: 'sahara',
    nameAr: 'شات الصحراء',
    nameEn: 'Sahara Chat',
    path: '/algeria/sahara',
    countryPath: '/algeria',
    title: 'شات الصحراء - دردشة الصحراء الجزائرية',
    metaDescription: 'شات الصحراء للتعارف والدردشة مع شباب وبنات من الصحراء الجزائرية. دردشة صحراوية مجانية بدون تسجيل.',
    keywords: ['شات الصحراء', 'دردشة صحراوية', 'تعارف الصحراء', 'بنات الصحراء'],
    chatLinks: [
      { name: 'شات الصحراء العام', description: 'دردشة الصحراء العامة' },
      { name: 'شات الصحراء الطبيعي', description: 'دردشة الطبيعة في الصحراء' }
    ]
  },
  {
    id: 'million-martyrs',
    nameAr: 'شات مليون شهيد',
    nameEn: 'Million Martyrs Chat',
    path: '/algeria/million-martyrs',
    countryPath: '/algeria',
    title: 'شات مليون شهيد - دردشة مليون شهيد',
    metaDescription: 'شات مليون شهيد للتعارف والدردشة مع شباب وبنات في مليون شهيد. دردشة مجانية بدون تسجيل.',
    keywords: ['شات مليون شهيد', 'دردشة مليون شهيد', 'تعارف مليون شهيد', 'بنات مليون شهيد'],
    chatLinks: [
      { name: 'شات مليون شهيد العام', description: 'دردشة مليون شهيد العامة' },
      { name: 'شات مليون شهيد التاريخي', description: 'دردشة التاريخ في مليون شهيد' }
    ]
  },

  // مدن إضافية للبحرين
  {
    id: 'bahrain-mobile',
    nameAr: 'شات جوال البحرين',
    nameEn: 'Bahrain Mobile Chat',
    path: '/bahrain/bahrain-mobile',
    countryPath: '/bahrain',
    title: 'شات جوال البحرين - دردشة جوال بحريني',
    metaDescription: 'شات جوال البحرين للتعارف والدردشة مع شباب وبنات من البحرين. دردشة بحرينية مجانية بدون تسجيل.',
    keywords: ['شات جوال البحرين', 'دردشة بحرينية جوال', 'تعارف البحرين', 'بنات البحرين'],
    chatLinks: [
      { name: 'شات جوال البحرين العام', description: 'دردشة جوال بحريني العامة' },
      { name: 'شات جوال البحرين الخاص', description: 'دردشة جوال بحريني الخاصة' }
    ]
  },
  {
    id: 'sitrah',
    nameAr: 'شات سترة',
    nameEn: 'Sitrah Chat',
    path: '/bahrain/sitrah',
    countryPath: '/bahrain',
    title: 'شات سترة - دردشة سترة البحرينية',
    metaDescription: 'شات سترة للتعارف والدردشة مع شباب وبنات من سترة. دردشة سترة مجانية بدون تسجيل.',
    keywords: ['شات سترة', 'دردشة سترة', 'تعارف سترة', 'بنات سترة'],
    chatLinks: [
      { name: 'شات سترة العام', description: 'دردشة سترة العامة' },
      { name: 'شات سترة البحريني', description: 'دردشة سترة البحرينية' }
    ]
  },
  {
    id: 'isa',
    nameAr: 'شات عيسى',
    nameEn: 'Isa Chat',
    path: '/bahrain/isa',
    countryPath: '/bahrain',
    title: 'شات عيسى - دردشة عيسى البحرينية',
    metaDescription: 'شات عيسى للتعارف والدردشة مع شباب وبنات من عيسى. دردشة عيسى مجانية بدون تسجيل.',
    keywords: ['شات عيسى', 'دردشة عيسى', 'تعارف عيسى', 'بنات عيسى'],
    chatLinks: [
      { name: 'شات عيسى العام', description: 'دردشة عيسى العامة' },
      { name: 'شات عيسى الحكومي', description: 'دردشة الحكومة في عيسى' }
    ]
  },
  {
    id: 'pearl',
    nameAr: 'شات اللؤلؤة',
    nameEn: 'Pearl Chat',
    path: '/bahrain/pearl',
    countryPath: '/bahrain',
    title: 'شات اللؤلؤة - دردشة اللؤلؤة البحرينية',
    metaDescription: 'شات اللؤلؤة للتعارف والدردشة مع شباب وبنات من اللؤلؤة. دردشة لؤلؤة مجانية بدون تسجيل.',
    keywords: ['شات اللؤلؤة', 'دردشة اللؤلؤة', 'تعارف اللؤلؤة', 'بنات اللؤلؤة'],
    chatLinks: [
      { name: 'شات اللؤلؤة العام', description: 'دردشة اللؤلؤة العامة' },
      { name: 'شات اللؤلؤة السياحي', description: 'دردشة السياحة في اللؤلؤة' }
    ]
  },

  // مدن رئيسية في البحرين
  {
    id: 'manama',
    nameAr: 'شات المنامة',
    nameEn: 'Manama Chat',
    path: '/bahrain/manama',
    countryPath: '/bahrain',
    title: 'شات المنامة - دردشة العاصمة المنامة',
    metaDescription: 'شات المنامة للتعارف والدردشة مع شباب وبنات من العاصمة المنامة. دردشة بحرينية مجانية بدون تسجيل.',
    keywords: ['شات المنامة', 'دردشة المنامة', 'تعارف البحرين', 'بنات البحرين'],
    chatLinks: [
      { name: 'شات المنامة العام', description: 'دردشة عامة للمنامة' },
      { name: 'شات المنامة التجاري', description: 'دردشة التجارة في المنامة' }
    ]
  },
  {
    id: 'muharraq',
    nameAr: 'شات المحرق',
    nameEn: 'Muharraq Chat',
    path: '/bahrain/muharraq',
    countryPath: '/bahrain',
    title: 'شات المحرق - دردشة مدينة المحرق',
    metaDescription: 'شات المحرق للتعارف والدردشة مع شباب وبنات من المحرق. دردشة بحرينية مجانية بدون تسجيل.',
    keywords: ['شات المحرق', 'دردشة المحرق', 'تعارف البحرين', 'بنات البحرين'],
    chatLinks: [
      { name: 'شات المحرق العام', description: 'دردشة عامة للمحرق' },
      { name: 'شات المحرق التاريخي', description: 'دردشة التاريخ في المحرق' }
    ]
  },
  {
    id: 'riffa',
    nameAr: 'شات الرفاع',
    nameEn: 'Riffa Chat',
    path: '/bahrain/riffa',
    countryPath: '/bahrain',
    title: 'شات الرفاع - دردشة مدينة الرفاع',
    metaDescription: 'شات الرفاع للتعارف والدردشة مع شباب وبنات من الرفاع. دردشة بحرينية مجانية بدون تسجيل.',
    keywords: ['شات الرفاع', 'دردشة الرفاع', 'تعارف البحرين', 'بنات البحرين'],
    chatLinks: [
      { name: 'شات الرفاع العام', description: 'دردشة عامة للرفاع' },
      { name: 'شات الرفاع العائلي', description: 'دردشة الأسرة في الرفاع' }
    ]
  },
  {
    id: 'hamad',
    nameAr: 'شات حمد',
    nameEn: 'Hamad Chat',
    path: '/bahrain/hamad',
    countryPath: '/bahrain',
    title: 'شات حمد - دردشة مدينة حمد',
    metaDescription: 'شات حمد للتعارف والدردشة مع شباب وبنات من مدينة حمد. دردشة بحرينية مجانية بدون تسجيل.',
    keywords: ['شات حمد', 'دردشة حمد', 'تعارف البحرين', 'بنات البحرين'],
    chatLinks: [
      { name: 'شات حمد العام', description: 'دردشة عامة لمدينة حمد' },
      { name: 'شات حمد الرياضي', description: 'دردشة الرياضة في مدينة حمد' }
    ]
  },

  // مدن إضافية للإمارات
  {
    id: 'uae-mobile',
    nameAr: 'شات جوال الإمارات',
    nameEn: 'UAE Mobile Chat',
    path: '/uae/uae-mobile',
    countryPath: '/uae',
    title: 'شات جوال الإمارات - دردشة جوال إماراتي',
    metaDescription: 'شات جوال الإمارات للتعارف والدردشة مع شباب وبنات من الإمارات. دردشة إماراتية مجانية بدون تسجيل.',
    keywords: ['شات جوال الإمارات', 'دردشة إماراتية جوال', 'تعارف الإمارات', 'بنات الإمارات'],
    chatLinks: [
      { name: 'شات جوال الإمارات العام', description: 'دردشة جوال إماراتي العامة' },
      { name: 'شات جوال الإمارات الخاص', description: 'دردشة جوال إماراتي الخاصة' }
    ]
  },
  {
    id: 'ajman',
    nameAr: 'شات عجمان',
    nameEn: 'Ajman Chat',
    path: '/uae/ajman',
    countryPath: '/uae',
    title: 'شات عجمان - دردشة إمارة عجمان',
    metaDescription: 'شات عجمان للتعارف والدردشة مع شباب وبنات من عجمان. دردشة عجمانية مجانية بدون تسجيل.',
    keywords: ['شات عجمان', 'دردشة عجمانية', 'تعارف عجمان', 'بنات عجمان'],
    chatLinks: [
      { name: 'شات عجمان العام', description: 'دردشة عجمان العامة' },
      { name: 'شات عجمان الترفيهي', description: 'دردشة الترفيه في عجمان' }
    ]
  },
  {
    id: 'al-ain',
    nameAr: 'شات العين',
    nameEn: 'Al Ain Chat',
    path: '/uae/al-ain',
    countryPath: '/uae',
    title: 'شات العين - دردشة مدينة العين',
    metaDescription: 'شات العين للتعارف والدردشة مع شباب وبنات من العين. دردشة عينية مجانية بدون تسجيل.',
    keywords: ['شات العين', 'دردشة عينية', 'تعارف العين', 'بنات العين'],
    chatLinks: [
      { name: 'شات العين العام', description: 'دردشة العين العامة' },
      { name: 'شات العين الحدودي', description: 'دردشة الحدود في العين' }
    ]
  },
  {
    id: 'ras-al-khaimah',
    nameAr: 'شات رأس الخيمة',
    nameEn: 'Ras Al Khaimah Chat',
    path: '/uae/ras-al-khaimah',
    countryPath: '/uae',
    title: 'شات رأس الخيمة - دردشة إمارة رأس الخيمة',
    metaDescription: 'شات رأس الخيمة للتعارف والدردشة مع شباب وبنات من رأس الخيمة. دردشة رأس الخيمة مجانية بدون تسجيل.',
    keywords: ['شات رأس الخيمة', 'دردشة رأس الخيمة', 'تعارف رأس الخيمة', 'بنات رأس الخيمة'],
    chatLinks: [
      { name: 'شات رأس الخيمة العام', description: 'دردشة رأس الخيمة العامة' },
      { name: 'شات رأس الخيمة الجبلي', description: 'دردشة الجبال في رأس الخيمة' }
    ]
  },
  {
    id: 'fujairah',
    nameAr: 'شات الفجيرة',
    nameEn: 'Fujairah Chat',
    path: '/uae/fujairah',
    countryPath: '/uae',
    title: 'شات الفجيرة - دردشة إمارة الفجيرة',
    metaDescription: 'شات الفجيرة للتعارف والدردشة مع شباب وبنات من الفجيرة. دردشة فجيرة مجانية بدون تسجيل.',
    keywords: ['شات الفجيرة', 'دردشة فجيرة', 'تعارف الفجيرة', 'بنات الفجيرة'],
    chatLinks: [
      { name: 'شات الفجيرة العام', description: 'دردشة الفجيرة العامة' },
      { name: 'شات الفجيرة الساحلي', description: 'دردشة الساحل في الفجيرة' }
    ]
  },

  // مدن إضافية للأردن
  {
    id: 'jordan-mobile',
    nameAr: 'شات جوال الأردن',
    nameEn: 'Jordan Mobile Chat',
    path: '/jordan/jordan-mobile',
    countryPath: '/jordan',
    title: 'شات جوال الأردن - دردشة جوال أردني',
    metaDescription: 'شات جوال الأردن للتعارف والدردشة مع شباب وبنات من الأردن. دردشة أردنية مجانية بدون تسجيل.',
    keywords: ['شات جوال الأردن', 'دردشة أردنية جوال', 'تعارف الأردن', 'بنات الأردن'],
    chatLinks: [
      { name: 'شات جوال الأردن العام', description: 'دردشة جوال أردني العامة' },
      { name: 'شات جوال الأردن الخاص', description: 'دردشة جوال أردني الخاصة' }
    ]
  },
  {
    id: 'aqaba',
    nameAr: 'شات العقبة',
    nameEn: 'Aqaba Chat',
    path: '/jordan/aqaba',
    countryPath: '/jordan',
    title: 'شات العقبة - دردشة مدينة العقبة',
    metaDescription: 'شات العقبة للتعارف والدردشة مع شباب وبنات من العقبة. دردشة عقبة مجانية بدون تسجيل.',
    keywords: ['شات العقبة', 'دردشة عقبة', 'تعارف العقبة', 'بنات العقبة'],
    chatLinks: [
      { name: 'شات العقبة العام', description: 'دردشة العقبة العامة' },
      { name: 'شات العقبة المينائي', description: 'دردشة الميناء في العقبة' }
    ]
  },
  {
    id: 'salt',
    nameAr: 'شات السلط',
    nameEn: 'Salt Chat',
    path: '/jordan/salt',
    countryPath: '/jordan',
    title: 'شات السلط - دردشة مدينة السلط',
    metaDescription: 'شات السلط للتعارف والدردشة مع شباب وبنات من السلط. دردشة سلط مجانية بدون تسجيل.',
    keywords: ['شات السلط', 'دردشة سلط', 'تعارف السلط', 'بنات السلط'],
    chatLinks: [
      { name: 'شات السلط العام', description: 'دردشة السلط العامة' },
      { name: 'شات السلط التاريخي', description: 'دردشة التاريخ في السلط' }
    ]
  },
  {
    id: 'karak',
    nameAr: 'شات الكرك',
    nameEn: 'Karak Chat',
    path: '/jordan/karak',
    countryPath: '/jordan',
    title: 'شات الكرك - دردشة مدينة الكرك',
    metaDescription: 'شات الكرك للتعارف والدردشة مع شباب وبنات من الكرك. دردشة كرك مجانية بدون تسجيل.',
    keywords: ['شات الكرك', 'دردشة كرك', 'تعارف الكرك', 'بنات الكرك'],
    chatLinks: [
      { name: 'شات الكرك العام', description: 'دردشة الكرك العامة' },
      { name: 'شات الكرك القلعي', description: 'دردشة القلعة في الكرك' }
    ]
  },
  {
    id: 'petra',
    nameAr: 'شات البتراء',
    nameEn: 'Petra Chat',
    path: '/jordan/petra',
    countryPath: '/jordan',
    title: 'شات البتراء - دردشة مدينة البتراء',
    metaDescription: 'شات البتراء للتعارف والدردشة مع شباب وبنات من البتراء. دردشة بتراء مجانية بدون تسجيل.',
    keywords: ['شات البتراء', 'دردشة بتراء', 'تعارف البتراء', 'بنات البتراء'],
    chatLinks: [
      { name: 'شات البتراء العام', description: 'دردشة البتراء العامة' },
      { name: 'شات البتراء السياحي', description: 'دردشة السياحة في البتراء' }
    ]
  },

  // مدن إضافية للكويت
  {
    id: 'kuwait-mobile',
    nameAr: 'شات جوال الكويت',
    nameEn: 'Kuwait Mobile Chat',
    path: '/kuwait/kuwait-mobile',
    countryPath: '/kuwait',
    title: 'شات جوال الكويت - دردشة جوال كويتي',
    metaDescription: 'شات جوال الكويت للتعارف والدردشة مع شباب وبنات من الكويت. دردشة كويتية مجانية بدون تسجيل.',
    keywords: ['شات جوال الكويت', 'دردشة كويتية جوال', 'تعارف الكويت', 'بنات الكويت'],
    chatLinks: [
      { name: 'شات جوال الكويت العام', description: 'دردشة جوال كويتي العامة' },
      { name: 'شات جوال الكويت الخاص', description: 'دردشة جوال كويتي الخاصة' }
    ]
  },
  {
    id: 'farwaniyah',
    nameAr: 'شات الفروانية',
    nameEn: 'Farwaniyah Chat',
    path: '/kuwait/farwaniyah',
    countryPath: '/kuwait',
    title: 'شات الفروانية - دردشة محافظة الفروانية',
    metaDescription: 'شات الفروانية للتعارف والدردشة مع شباب وبنات من الفروانية. دردشة فروانية مجانية بدون تسجيل.',
    keywords: ['شات الفروانية', 'دردشة فروانية', 'تعارف الفروانية', 'بنات الفروانية'],
    chatLinks: [
      { name: 'شات الفروانية العام', description: 'دردشة الفروانية العامة' },
      { name: 'شات الفروانية التجاري', description: 'دردشة التجارة في الفروانية' }
    ]
  },
  {
    id: 'hawalli',
    nameAr: 'شات حولي',
    nameEn: 'Hawalli Chat',
    path: '/kuwait/hawalli',
    countryPath: '/kuwait',
    title: 'شات حولي - دردشة محافظة حولي',
    metaDescription: 'شات حولي للتعارف والدردشة مع شباب وبنات من حولي. دردشة حولي مجانية بدون تسجيل.',
    keywords: ['شات حولي', 'دردشة حولي', 'تعارف حولي', 'بنات حولي'],
    chatLinks: [
      { name: 'شات حولي العام', description: 'دردشة حولي العامة' },
      { name: 'شات حولي السكني', description: 'دردشة السكن في حولي' }
    ]
  },
  {
    id: 'mubarak-al-kabeer',
    nameAr: 'شات مبارك الكبير',
    nameEn: 'Mubarak Al Kabeer Chat',
    path: '/kuwait/mubarak-al-kabeer',
    countryPath: '/kuwait',
    title: 'شات مبارك الكبير - دردشة محافظة مبارك الكبير',
    metaDescription: 'شات مبارك الكبير للتعارف والدردشة مع شباب وبنات من مبارك الكبير. دردشة مبارك الكبير مجانية بدون تسجيل.',
    keywords: ['شات مبارك الكبير', 'دردشة مبارك الكبير', 'تعارف مبارك الكبير', 'بنات مبارك الكبير'],
    chatLinks: [
      { name: 'شات مبارك الكبير العام', description: 'دردشة مبارك الكبير العامة' },
      { name: 'شات مبارك الكبير الحكومي', description: 'دردشة الحكومة في مبارك الكبير' }
    ]
  },
  {
    id: 'diwaniyah',
    nameAr: 'شات الديوانية',
    nameEn: 'Diwaniyah Chat',
    path: '/kuwait/diwaniyah',
    countryPath: '/kuwait',
    title: 'شات الديوانية - دردشة الديوانية الكويتية',
    metaDescription: 'شات الديوانية للتعارف والدردشة مع شباب وبنات من الديوانية. دردشة ديوانية مجانية بدون تسجيل.',
    keywords: ['شات الديوانية', 'دردشة ديوانية', 'تعارف الديوانية', 'بنات الديوانية'],
    chatLinks: [
      { name: 'شات الديوانية العام', description: 'دردشة الديوانية العامة' },
      { name: 'شات الديوانية الزراعي', description: 'دردشة الزراعة في الديوانية' }
    ]
  },

  // مدن رئيسية في الكويت
  {
    id: 'kuwait-city',
    nameAr: 'شات مدينة الكويت',
    nameEn: 'Kuwait City Chat',
    path: '/kuwait/kuwait-city',
    countryPath: '/kuwait',
    title: 'شات مدينة الكويت - دردشة العاصمة الكويت',
    metaDescription: 'شات مدينة الكويت للتعارف والدردشة مع شباب وبنات من العاصمة. دردشة كويتية مجانية بدون تسجيل.',
    keywords: ['شات مدينة الكويت', 'دردشة الكويت', 'تعارف الكويت', 'بنات الكويت'],
    chatLinks: [
      { name: 'شات مدينة الكويت العام', description: 'دردشة عامة لمدينة الكويت' },
      { name: 'شات مدينة الكويت الساحلي', description: 'دردشة الساحل في العاصمة' }
    ]
  },
  {
    id: 'jahra',
    nameAr: 'شات الجهراء',
    nameEn: 'Jahra Chat',
    path: '/kuwait/jahra',
    countryPath: '/kuwait',
    title: 'شات الجهراء - دردشة محافظة الجهراء',
    metaDescription: 'شات الجهراء للتعارف والدردشة مع شباب وبنات من الجهراء. دردشة كويتية مجانية بدون تسجيل.',
    keywords: ['شات الجهراء', 'دردشة الجهراء', 'تعارف الكويت', 'بنات الكويت'],
    chatLinks: [
      { name: 'شات الجهراء العام', description: 'دردشة عامة للجهراء' },
      { name: 'شات الجهراء الصحراوي', description: 'دردشة الصحراء في الجهراء' }
    ]
  },
  {
    id: 'ahmadi',
    nameAr: 'شات الأحمدي',
    nameEn: 'Ahmadi Chat',
    path: '/kuwait/ahmadi',
    countryPath: '/kuwait',
    title: 'شات الأحمدي - دردشة محافظة الأحمدي',
    metaDescription: 'شات الأحمدي للتعارف والدردشة مع شباب وبنات من الأحمدي. دردشة كويتية مجانية بدون تسجيل.',
    keywords: ['شات الأحمدي', 'دردشة الأحمدي', 'تعارف الكويت', 'بنات الكويت'],
    chatLinks: [
      { name: 'شات الأحمدي العام', description: 'دردشة عامة للأحمدي' },
      { name: 'شات الأحمدي النفطي', description: 'دردشة النفط في الأحمدي' }
    ]
  },

  // مدن إضافية لليبيا
  {
    id: 'libya-mobile',
    nameAr: 'شات جوال ليبيا',
    nameEn: 'Libya Mobile Chat',
    path: '/libya/libya-mobile',
    countryPath: '/libya',
    title: 'شات جوال ليبيا - دردشة جوال ليبي',
    metaDescription: 'شات جوال ليبيا للتعارف والدردشة مع شباب وبنات من ليبيا. دردشة ليبية مجانية بدون تسجيل.',
    keywords: ['شات جوال ليبيا', 'دردشة ليبية جوال', 'تعارف ليبيا', 'بنات ليبيا'],
    chatLinks: [
      { name: 'شات جوال ليبيا العام', description: 'دردشة جوال ليبي العامة' },
      { name: 'شات جوال ليبيا الخاص', description: 'دردشة جوال ليبي الخاصة' }
    ]
  },
  {
    id: 'bayda',
    nameAr: 'شات البيضاء',
    nameEn: 'Bayda Chat',
    path: '/libya/bayda',
    countryPath: '/libya',
    title: 'شات البيضاء - دردشة مدينة البيضاء',
    metaDescription: 'شات البيضاء للتعارف والدردشة مع شباب وبنات من البيضاء. دردشة بيضاء مجانية بدون تسجيل.',
    keywords: ['شات البيضاء', 'دردشة بيضاء', 'تعارف البيضاء', 'بنات البيضاء'],
    chatLinks: [
      { name: 'شات البيضاء العام', description: 'دردشة البيضاء العامة' },
      { name: 'شات البيضاء الجبلي', description: 'دردشة الجبال في البيضاء' }
    ]
  },
  {
    id: 'zawiya',
    nameAr: 'شات الزاوية',
    nameEn: 'Zawiya Chat',
    path: '/libya/zawiya',
    countryPath: '/libya',
    title: 'شات الزاوية - دردشة مدينة الزاوية',
    metaDescription: 'شات الزاوية للتعارف والدردشة مع شباب وبنات من الزاوية. دردشة زاوية مجانية بدون تسجيل.',
    keywords: ['شات الزاوية', 'دردشة زاوية', 'تعارف الزاوية', 'بنات الزاوية'],
    chatLinks: [
      { name: 'شات الزاوية العام', description: 'دردشة الزاوية العامة' },
      { name: 'شات الزاوية الساحلي', description: 'دردشة الساحل في الزاوية' }
    ]
  },
  {
    id: 'sabha',
    nameAr: 'شات سبها',
    nameEn: 'Sabha Chat',
    path: '/libya/sabha',
    countryPath: '/libya',
    title: 'شات سبها - دردشة مدينة سبها',
    metaDescription: 'شات سبها للتعارف والدردشة مع شباب وبنات من سبها. دردشة سبها مجانية بدون تسجيل.',
    keywords: ['شات سبها', 'دردشة سبها', 'تعارف سبها', 'بنات سبها'],
    chatLinks: [
      { name: 'شات سبها العام', description: 'دردشة سبها العامة' },
      { name: 'شات سبها الصحراوي', description: 'دردشة الصحراء في سبها' }
    ]
  },
  {
    id: 'ajdabiya',
    nameAr: 'شات أجدابيا',
    nameEn: 'Ajdabiya Chat',
    path: '/libya/ajdabiya',
    countryPath: '/libya',
    title: 'شات أجدابيا - دردشة مدينة أجدابيا',
    metaDescription: 'شات أجدابيا للتعارف والدردشة مع شباب وبنات من أجدابيا. دردشة أجدابيا مجانية بدون تسجيل.',
    keywords: ['شات أجدابيا', 'دردشة أجدابيا', 'تعارف أجدابيا', 'بنات أجدابيا'],
    chatLinks: [
      { name: 'شات أجدابيا العام', description: 'دردشة أجدابيا العامة' },
      { name: 'شات أجدابيا النفطي', description: 'دردشة النفط في أجدابيا' }
    ]
  },

  // مدن إضافية لتونس
  {
    id: 'tunisia-mobile',
    nameAr: 'شات جوال تونس',
    nameEn: 'Tunisia Mobile Chat',
    path: '/tunisia/tunisia-mobile',
    countryPath: '/tunisia',
    title: 'شات جوال تونس - دردشة جوال تونسي',
    metaDescription: 'شات جوال تونس للتعارف والدردشة مع شباب وبنات من تونس. دردشة تونسية مجانية بدون تسجيل.',
    keywords: ['شات جوال تونس', 'دردشة تونسية جوال', 'تعارف تونس', 'بنات تونس'],
    chatLinks: [
      { name: 'شات جوال تونس العام', description: 'دردشة جوال تونسي العامة' },
      { name: 'شات جوال تونس الخاص', description: 'دردشة جوال تونسي الخاصة' }
    ]
  },
  {
    id: 'monastir',
    nameAr: 'شات المنستير',
    nameEn: 'Monastir Chat',
    path: '/tunisia/monastir',
    countryPath: '/tunisia',
    title: 'شات المنستير - دردشة مدينة المنستير',
    metaDescription: 'شات المنستير للتعارف والدردشة مع شباب وبنات من المنستير. دردشة منستيرية مجانية بدون تسجيل.',
    keywords: ['شات المنستير', 'دردشة منستيرية', 'تعارف المنستير', 'بنات المنستير'],
    chatLinks: [
      { name: 'شات المنستير العام', description: 'دردشة المنستير العامة' },
      { name: 'شات المنستير الساحلي', description: 'دردشة الساحل في المنستير' }
    ]
  },
  {
    id: 'bizerte',
    nameAr: 'شات بنزرت',
    nameEn: 'Bizerte Chat',
    path: '/tunisia/bizerte',
    countryPath: '/tunisia',
    title: 'شات بنزرت - دردشة مدينة بنزرت',
    metaDescription: 'شات بنزرت للتعارف والدردشة مع شباب وبنات من بنزرت. دردشة بنزرت مجانية بدون تسجيل.',
    keywords: ['شات بنزرت', 'دردشة بنزرت', 'تعارف بنزرت', 'بنات بنزرت'],
    chatLinks: [
      { name: 'شات بنزرت العام', description: 'دردشة بنزرت العامة' },
      { name: 'شات بنزرت المينائي', description: 'دردشة الميناء في بنزرت' }
    ]
  },
  {
    id: 'gabes',
    nameAr: 'شات قابس',
    nameEn: 'Gabes Chat',
    path: '/tunisia/gabes',
    countryPath: '/tunisia',
    title: 'شات قابس - دردشة مدينة قابس',
    metaDescription: 'شات قابس للتعارف والدردشة مع شباب وبنات من قابس. دردشة قابس مجانية بدون تسجيل.',
    keywords: ['شات قابس', 'دردشة قابس', 'تعارف قابس', 'بنات قابس'],
    chatLinks: [
      { name: 'شات قابس العام', description: 'دردشة قابس العامة' },
      { name: 'شات قابس الصناعي', description: 'دردشة الصناعة في قابس' }
    ]
  },
  {
    id: 'kairouan',
    nameAr: 'شات القيروان',
    nameEn: 'Kairouan Chat',
    path: '/tunisia/kairouan',
    countryPath: '/tunisia',
    title: 'شات القيروان - دردشة مدينة القيروان',
    metaDescription: 'شات القيروان للتعارف والدردشة مع شباب وبنات من القيروان. دردشة قيروان مجانية بدون تسجيل.',
    keywords: ['شات القيروان', 'دردشة قيروان', 'تعارف القيروان', 'بنات القيروان'],
    chatLinks: [
      { name: 'شات القيروان العام', description: 'دردشة القيروان العامة' },
      { name: 'شات القيروان التاريخي', description: 'دردشة التاريخ في القيروان' }
    ]
  },

  // مدن إضافية للمغرب
  {
    id: 'morocco-mobile',
    nameAr: 'شات جوال المغرب',
    nameEn: 'Morocco Mobile Chat',
    path: '/morocco/morocco-mobile',
    countryPath: '/morocco',
    title: 'شات جوال المغرب - دردشة جوال مغربي',
    metaDescription: 'شات جوال المغرب للتعارف والدردشة مع شباب وبنات من المغرب. دردشة مغربية مجانية بدون تسجيل.',
    keywords: ['شات جوال المغرب', 'دردشة مغربية جوال', 'تعارف المغرب', 'بنات المغرب'],
    chatLinks: [
      { name: 'شات جوال المغرب العام', description: 'دردشة جوال مغربي العامة' },
      { name: 'شات جوال المغرب الخاص', description: 'دردشة جوال مغربي الخاصة' }
    ]
  },
  {
    id: 'fes',
    nameAr: 'شات فاس',
    nameEn: 'Fes Chat',
    path: '/morocco/fes',
    countryPath: '/morocco',
    title: 'شات فاس - دردشة مدينة فاس',
    metaDescription: 'شات فاس للتعارف والدردشة مع شباب وبنات من فاس. دردشة فاس مجانية بدون تسجيل.',
    keywords: ['شات فاس', 'دردشة فاس', 'تعارف فاس', 'بنات فاس'],
    chatLinks: [
      { name: 'شات فاس العام', description: 'دردشة فاس العامة' },
      { name: 'شات فاس الثقافي', description: 'دردشة الثقافة في فاس' }
    ]
  },
  {
    id: 'tangier',
    nameAr: 'شات طنجة',
    nameEn: 'Tangier Chat',
    path: '/morocco/tangier',
    countryPath: '/morocco',
    title: 'شات طنجة - دردشة مدينة طنجة',
    metaDescription: 'شات طنجة للتعارف والدردشة مع شباب وبنات من طنجة. دردشة طنجة مجانية بدون تسجيل.',
    keywords: ['شات طنجة', 'دردشة طنجة', 'تعارف طنجة', 'بنات طنجة'],
    chatLinks: [
      { name: 'شات طنجة العام', description: 'دردشة طنجة العامة' },
      { name: 'شات طنجة المينائي', description: 'دردشة الميناء في طنجة' }
    ]
  },
  {
    id: 'agadir',
    nameAr: 'شات أغادير',
    nameEn: 'Agadir Chat',
    path: '/morocco/agadir',
    countryPath: '/morocco',
    title: 'شات أغادير - دردشة مدينة أغادير',
    metaDescription: 'شات أغادير للتعارف والدردشة مع شباب وبنات من أغادير. دردشة أغادير مجانية بدون تسجيل.',
    keywords: ['شات أغادير', 'دردشة أغادير', 'تعارف أغادير', 'بنات أغادير'],
    chatLinks: [
      { name: 'شات أغادير العام', description: 'دردشة أغادير العامة' },
      { name: 'شات أغادير السياحي', description: 'دردشة السياحة في أغادير' }
    ]
  },
  {
    id: 'meknes',
    nameAr: 'شات مكناس',
    nameEn: 'Meknes Chat',
    path: '/morocco/meknes',
    countryPath: '/morocco',
    title: 'شات مكناس - دردشة مدينة مكناس',
    metaDescription: 'شات مكناس للتعارف والدردشة مع شباب وبنات من مكناس. دردشة مكناس مجانية بدون تسجيل.',
    keywords: ['شات مكناس', 'دردشة مكناس', 'تعارف مكناس', 'بنات مكناس'],
    chatLinks: [
      { name: 'شات مكناس العام', description: 'دردشة مكناس العامة' },
      { name: 'شات مكناس التاريخي', description: 'دردشة التاريخ في مكناس' }
    ]
  },

  // مدن رئيسية في المغرب
  {
    id: 'rabat',
    nameAr: 'شات الرباط',
    nameEn: 'Rabat Chat',
    path: '/morocco/rabat',
    countryPath: '/morocco',
    title: 'شات الرباط - دردشة العاصمة الرباط',
    metaDescription: 'شات الرباط للتعارف والدردشة مع شباب وبنات من العاصمة الرباط. دردشة مغربية مجانية بدون تسجيل.',
    keywords: ['شات الرباط', 'دردشة الرباط', 'تعارف المغرب', 'بنات المغرب'],
    chatLinks: [
      { name: 'شات الرباط العام', description: 'دردشة عامة للرباط' },
      { name: 'شات الرباط الإداري', description: 'دردشة الحكومة في الرباط' }
    ]
  },
  {
    id: 'casablanca',
    nameAr: 'شات الدار البيضاء',
    nameEn: 'Casablanca Chat',
    path: '/morocco/casablanca',
    countryPath: '/morocco',
    title: 'شات الدار البيضاء - دردشة مدينة الدار البيضاء',
    metaDescription: 'شات الدار البيضاء للتعارف والدردشة مع شباب وبنات من الدار البيضاء. دردشة مغربية مجانية بدون تسجيل.',
    keywords: ['شات الدار البيضاء', 'دردشة كازابلانكا', 'تعارف المغرب', 'بنات المغرب'],
    chatLinks: [
      { name: 'شات الدار البيضاء العام', description: 'دردشة عامة للدار البيضاء' },
      { name: 'شات الدار البيضاء الاقتصادي', description: 'دردشة الاقتصاد في كازا' }
    ]
  },
  {
    id: 'marrakesh',
    nameAr: 'شات مراكش',
    nameEn: 'Marrakesh Chat',
    path: '/morocco/marrakesh',
    countryPath: '/morocco',
    title: 'شات مراكش - دردشة مدينة مراكش',
    metaDescription: 'شات مراكش للتعارف والدردشة مع شباب وبنات من مراكش. دردشة مغربية مجانية بدون تسجيل.',
    keywords: ['شات مراكش', 'دردشة مراكش', 'تعارف المغرب', 'بنات المغرب'],
    chatLinks: [
      { name: 'شات مراكش العام', description: 'دردشة عامة لمراكش' },
      { name: 'شات مراكش السياحي', description: 'دردشة السياحة في مراكش' }
    ]
  },

  // مدن إضافية للسودان
  {
    id: 'sudan-mobile',
    nameAr: 'شات جوال السودان',
    nameEn: 'Sudan Mobile Chat',
    path: '/sudan/sudan-mobile',
    countryPath: '/sudan',
    title: 'شات جوال السودان - دردشة جوال سوداني',
    metaDescription: 'شات جوال السودان للتعارف والدردشة مع شباب وبنات من السودان. دردشة سودانية مجانية بدون تسجيل.',
    keywords: ['شات جوال السودان', 'دردشة سودانية جوال', 'تعارف السودان', 'بنات السودان'],
    chatLinks: [
      { name: 'شات جوال السودان العام', description: 'دردشة جوال سوداني العامة' },
      { name: 'شات جوال السودان الخاص', description: 'دردشة جوال سوداني الخاصة' }
    ]
  },
  {
    id: 'gezira',
    nameAr: 'شات الجزيرة',
    nameEn: 'Gezira Chat',
    path: '/sudan/gezira',
    countryPath: '/sudan',
    title: 'شات الجزيرة - دردشة ولاية الجزيرة',
    metaDescription: 'شات الجزيرة للتعارف والدردشة مع شباب وبنات من الجزيرة. دردشة جزيرة مجانية بدون تسجيل.',
    keywords: ['شات الجزيرة', 'دردشة جزيرة', 'تعارف الجزيرة', 'بنات الجزيرة'],
    chatLinks: [
      { name: 'شات الجزيرة العام', description: 'دردشة الجزيرة العامة' },
      { name: 'شات الجزيرة الزراعي', description: 'دردشة الزراعة في الجزيرة' }
    ]
  },
  {
    id: 'darfur',
    nameAr: 'شات دارفور',
    nameEn: 'Darfur Chat',
    path: '/sudan/darfur',
    countryPath: '/sudan',
    title: 'شات دارفور - دردشة إقليم دارفور',
    metaDescription: 'شات دارفور للتعارف والدردشة مع شباب وبنات من دارفور. دردشة دارفور مجانية بدون تسجيل.',
    keywords: ['شات دارفور', 'دردشة دارفور', 'تعارف دارفور', 'بنات دارفور'],
    chatLinks: [
      { name: 'شات دارفور العام', description: 'دردشة دارفور العامة' },
      { name: 'شات دارفور الإقليمي', description: 'دردشة الإقليم في دارفور' }
    ]
  },
  {
    id: 'blue-nile',
    nameAr: 'شات النيل الأزرق',
    nameEn: 'Blue Nile Chat',
    path: '/sudan/blue-nile',
    countryPath: '/sudan',
    title: 'شات النيل الأزرق - دردشة ولاية النيل الأزرق',
    metaDescription: 'شات النيل الأزرق للتعارف والدردشة مع شباب وبنات من النيل الأزرق. دردشة نيل أزرق مجانية بدون تسجيل.',
    keywords: ['شات النيل الأزرق', 'دردشة نيل أزرق', 'تعارف النيل الأزرق', 'بنات النيل الأزرق'],
    chatLinks: [
      { name: 'شات النيل الأزرق العام', description: 'دردشة النيل الأزرق العامة' },
      { name: 'شات النيل الأزرق النهري', description: 'دردشة النهر في النيل الأزرق' }
    ]
  },

  // مدن رئيسية في السودان
  {
    id: 'khartoum',
    nameAr: 'شات الخرطوم',
    nameEn: 'Khartoum Chat',
    path: '/sudan/khartoum',
    countryPath: '/sudan',
    title: 'شات الخرطوم - دردشة العاصمة الخرطوم',
    metaDescription: 'شات الخرطوم للتعارف والدردشة مع شباب وبنات من الخرطوم. دردشة سودانية مجانية بدون تسجيل.',
    keywords: ['شات الخرطوم', 'دردشة الخرطوم', 'تعارف السودان', 'بنات السودان'],
    chatLinks: [
      { name: 'شات الخرطوم العام', description: 'دردشة عامة للخرطوم' },
      { name: 'شات الخرطوم النهري', description: 'دردشة النيل في الخرطوم' }
    ]
  },
  {
    id: 'omdurman',
    nameAr: 'شات أم درمان',
    nameEn: 'Omdurman Chat',
    path: '/sudan/omdurman',
    countryPath: '/sudan',
    title: 'شات أم درمان - دردشة مدينة أم درمان',
    metaDescription: 'شات أم درمان للتعارف والدردشة مع شباب وبنات من أم درمان. دردشة سودانية مجانية بدون تسجيل.',
    keywords: ['شات أم درمان', 'دردشة أم درمان', 'تعارف السودان', 'بنات السودان'],
    chatLinks: [
      { name: 'شات أم درمان العام', description: 'دردشة عامة لأم درمان' },
      { name: 'شات أم درمان التاريخي', description: 'دردشة التاريخ في أم درمان' }
    ]
  },
  {
    id: 'port-sudan',
    nameAr: 'شات بورتسودان',
    nameEn: 'Port Sudan Chat',
    path: '/sudan/port-sudan',
    countryPath: '/sudan',
    title: 'شات بورتسودان - دردشة مدينة بورتسودان',
    metaDescription: 'شات بورتسودان للتعارف والدردشة مع شباب وبنات من بورتسودان. دردشة سودانية مجانية بدون تسجيل.',
    keywords: ['شات بورتسودان', 'دردشة بورتسودان', 'تعارف السودان', 'بنات السودان'],
    chatLinks: [
      { name: 'شات بورتسودان العام', description: 'دردشة عامة لبورتسودان' },
      { name: 'شات بورتسودان الساحلي', description: 'دردشة الساحل في بورتسودان' }
    ]
  },
  {
    id: 'kassala',
    nameAr: 'شات كسلا',
    nameEn: 'Kassala Chat',
    path: '/sudan/kassala',
    countryPath: '/sudan',
    title: 'شات كسلا - دردشة مدينة كسلا',
    metaDescription: 'شات كسلا للتعارف والدردشة مع شباب وبنات من كسلا. دردشة سودانية مجانية بدون تسجيل.',
    keywords: ['شات كسلا', 'دردشة كسلا', 'تعارف السودان', 'بنات السودان'],
    chatLinks: [
      { name: 'شات كسلا العام', description: 'دردشة عامة لكسلا' },
      { name: 'شات كسلا الجبلي', description: 'دردشة الجبال في كسلا' }
    ]
  },

  // مدن إضافية لفلسطين
  {
    id: 'palestine-mobile',
    nameAr: 'شات جوال فلسطين',
    nameEn: 'Palestine Mobile Chat',
    path: '/palestine/palestine-mobile',
    countryPath: '/palestine',
    title: 'شات جوال فلسطين - دردشة جوال فلسطيني',
    metaDescription: 'شات جوال فلسطين للتعارف والدردشة مع شباب وبنات من فلسطين. دردشة فلسطينية مجانية بدون تسجيل.',
    keywords: ['شات جوال فلسطين', 'دردشة فلسطينية جوال', 'تعارف فلسطين', 'بنات فلسطين'],
    chatLinks: [
      { name: 'شات جوال فلسطين العام', description: 'دردشة جوال فلسطيني العامة' },
      { name: 'شات جوال فلسطين الخاص', description: 'دردشة جوال فلسطيني الخاصة' }
    ]
  },
  {
    id: 'nablus',
    nameAr: 'شات نابلس',
    nameEn: 'Nablus Chat',
    path: '/palestine/nablus',
    countryPath: '/palestine',
    title: 'شات نابلس - دردشة مدينة نابلس',
    metaDescription: 'شات نابلس للتعارف والدردشة مع شباب وبنات من نابلس. دردشة نابلس مجانية بدون تسجيل.',
    keywords: ['شات نابلس', 'دردشة نابلس', 'تعارف نابلس', 'بنات نابلس'],
    chatLinks: [
      { name: 'شات نابلس العام', description: 'دردشة نابلس العامة' },
      { name: 'شات نابلس الجبلي', description: 'دردشة الجبال في نابلس' }
    ]
  },
  {
    id: 'hebron',
    nameAr: 'شات الخليل',
    nameEn: 'Hebron Chat',
    path: '/palestine/hebron',
    countryPath: '/palestine',
    title: 'شات الخليل - دردشة مدينة الخليل',
    metaDescription: 'شات الخليل للتعارف والدردشة مع شباب وبنات من الخليل. دردشة خليل مجانية بدون تسجيل.',
    keywords: ['شات الخليل', 'دردشة خليل', 'تعارف الخليل', 'بنات الخليل'],
    chatLinks: [
      { name: 'شات الخليل العام', description: 'دردشة الخليل العامة' },
      { name: 'شات الخليل التاريخي', description: 'دردشة التاريخ في الخليل' }
    ]
  },
  {
    id: 'bethlehem',
    nameAr: 'شات بيت لحم',
    nameEn: 'Bethlehem Chat',
    path: '/palestine/bethlehem',
    countryPath: '/palestine',
    title: 'شات بيت لحم - دردشة مدينة بيت لحم',
    metaDescription: 'شات بيت لحم للتعارف والدردشة مع شباب وبنات من بيت لحم. دردشة بيت لحم مجانية بدون تسجيل.',
    keywords: ['شات بيت لحم', 'دردشة بيت لحم', 'تعارف بيت لحم', 'بنات بيت لحم'],
    chatLinks: [
      { name: 'شات بيت لحم العام', description: 'دردشة بيت لحم العامة' },
      { name: 'شات بيت لحم المقدس', description: 'دردشة المقدسات في بيت لحم' }
    ]
  },
  {
    id: 'jenin',
    nameAr: 'شات جنين',
    nameEn: 'Jenin Chat',
    path: '/palestine/jenin',
    countryPath: '/palestine',
    title: 'شات جنين - دردشة مدينة جنين',
    metaDescription: 'شات جنين للتعارف والدردشة مع شباب وبنات من جنين. دردشة جنين مجانية بدون تسجيل.',
    keywords: ['شات جنين', 'دردشة جنين', 'تعارف جنين', 'بنات جنين'],
    chatLinks: [
      { name: 'شات جنين العام', description: 'دردشة جنين العامة' },
      { name: 'شات جنين الشمالي', description: 'دردشة الشمال في جنين' }
    ]
  },

  // مدن إضافية لقطر
  {
    id: 'qatar-mobile',
    nameAr: 'شات جوال قطر',
    nameEn: 'Qatar Mobile Chat',
    path: '/qatar/qatar-mobile',
    countryPath: '/qatar',
    title: 'شات جوال قطر - دردشة جوال قطري',
    metaDescription: 'شات جوال قطر للتعارف والدردشة مع شباب وبنات من قطر. دردشة قطرية مجانية بدون تسجيل.',
    keywords: ['شات جوال قطر', 'دردشة قطرية جوال', 'تعارف قطر', 'بنات قطر'],
    chatLinks: [
      { name: 'شات جوال قطر العام', description: 'دردشة جوال قطري العامة' },
      { name: 'شات جوال قطر الخاص', description: 'دردشة جوال قطري الخاصة' }
    ]
  },
  {
    id: 'al-khor',
    nameAr: 'شات الخور',
    nameEn: 'Al Khor Chat',
    path: '/qatar/al-khor',
    countryPath: '/qatar',
    title: 'شات الخور - دردشة مدينة الخور',
    metaDescription: 'شات الخور للتعارف والدردشة مع شباب وبنات من الخور. دردشة خور مجانية بدون تسجيل.',
    keywords: ['شات الخور', 'دردشة خور', 'تعارف الخور', 'بنات الخور'],
    chatLinks: [
      { name: 'شات الخور العام', description: 'دردشة الخور العامة' },
      { name: 'شات الخور الصناعي', description: 'دردشة الصناعة في الخور' }
    ]
  },
  {
    id: 'umm-salal',
    nameAr: 'شات أم صلال',
    nameEn: 'Umm Salal Chat',
    path: '/qatar/umm-salal',
    countryPath: '/qatar',
    title: 'شات أم صلال - دردشة أم صلال',
    metaDescription: 'شات أم صلال للتعارف والدردشة مع شباب وبنات من أم صلال. دردشة أم صلال مجانية بدون تسجيل.',
    keywords: ['شات أم صلال', 'دردشة أم صلال', 'تعارف أم صلال', 'بنات أم صلال'],
    chatLinks: [
      { name: 'شات أم صلال العام', description: 'دردشة أم صلال العامة' },
      { name: 'شات أم صلال الشمالي', description: 'دردشة الشمال في أم صلال' }
    ]
  },
  {
    id: 'lusail',
    nameAr: 'شات لوسيل',
    nameEn: 'Lusail Chat',
    path: '/qatar/lusail',
    countryPath: '/qatar',
    title: 'شات لوسيل - دردشة مدينة لوسيل',
    metaDescription: 'شات لوسيل للتعارف والدردشة مع شباب وبنات من لوسيل. دردشة لوسيل مجانية بدون تسجيل.',
    keywords: ['شات لوسيل', 'دردشة لوسيل', 'تعارف لوسيل', 'بنات لوسيل'],
    chatLinks: [
      { name: 'شات لوسيل العام', description: 'دردشة لوسيل العامة' },
      { name: 'شات لوسيل الجديد', description: 'دردشة المدينة الجديدة في لوسيل' }
    ]
  },
  {
    id: 'al-shamal',
    nameAr: 'شات الشمال',
    nameEn: 'Al Shamal Chat',
    path: '/qatar/al-shamal',
    countryPath: '/qatar',
    title: 'شات الشمال - دردشة الشمال قطري',
    metaDescription: 'شات الشمال للتعارف والدردشة مع شباب وبنات من الشمال. دردشة شمال مجانية بدون تسجيل.',
    keywords: ['شات الشمال', 'دردشة شمال', 'تعارف الشمال', 'بنات الشمال'],
    chatLinks: [
      { name: 'شات الشمال العام', description: 'دردشة الشمال العامة' },
      { name: 'شات الشمال الطبيعي', description: 'دردشة الطبيعة في الشمال' }
    ]
  },

  // مدن رئيسية في قطر
  {
    id: 'doha',
    nameAr: 'شات الدوحة',
    nameEn: 'Doha Chat',
    path: '/qatar/doha',
    countryPath: '/qatar',
    title: 'شات الدوحة - دردشة العاصمة الدوحة',
    metaDescription: 'شات الدوحة للتعارف والدردشة مع شباب وبنات من الدوحة. دردشة قطرية مجانية بدون تسجيل.',
    keywords: ['شات الدوحة', 'دردشة الدوحة', 'تعارف قطر', 'بنات قطر'],
    chatLinks: [
      { name: 'شات الدوحة العام', description: 'دردشة عامة للدوحة' },
      { name: 'شات الدوحة الكورنيش', description: 'دردشة الكورنيش في الدوحة' }
    ]
  },
  {
    id: 'al-rayyan',
    nameAr: 'شات الريان',
    nameEn: 'Al Rayyan Chat',
    path: '/qatar/al-rayyan',
    countryPath: '/qatar',
    title: 'شات الريان - دردشة مدينة الريان',
    metaDescription: 'شات الريان للتعارف والدردشة مع شباب وبنات من الريان. دردشة قطرية مجانية بدون تسجيل.',
    keywords: ['شات الريان', 'دردشة الريان', 'تعارف قطر', 'بنات قطر'],
    chatLinks: [
      { name: 'شات الريان العام', description: 'دردشة عامة للريان' },
      { name: 'شات الريان الرياضي', description: 'دردشة الرياضة في الريان' }
    ]
  },
  {
    id: 'al-wakrah',
    nameAr: 'شات الوكرة',
    nameEn: 'Al Wakrah Chat',
    path: '/qatar/al-wakrah',
    countryPath: '/qatar',
    title: 'شات الوكرة - دردشة مدينة الوكرة',
    metaDescription: 'شات الوكرة للتعارف والدردشة مع شباب وبنات من الوكرة. دردشة قطرية مجانية بدون تسجيل.',
    keywords: ['شات الوكرة', 'دردشة الوكرة', 'تعارف قطر', 'بنات قطر'],
    chatLinks: [
      { name: 'شات الوكرة العام', description: 'دردشة عامة للوكرة' },
      { name: 'شات الوكرة الساحلي', description: 'دردشة الساحل في الوكرة' }
    ]
  },

  // مدن إضافية لليمن
  {
    id: 'yemen-mobile',
    nameAr: 'شات جوال اليمن',
    nameEn: 'Yemen Mobile Chat',
    path: '/yemen/yemen-mobile',
    countryPath: '/yemen',
    title: 'شات جوال اليمن - دردشة جوال يمني',
    metaDescription: 'شات جوال اليمن للتعارف والدردشة مع شباب وبنات من اليمن. دردشة يمنية مجانية بدون تسجيل.',
    keywords: ['شات جوال اليمن', 'دردشة يمنية جوال', 'تعارف اليمن', 'بنات اليمن'],
    chatLinks: [
      { name: 'شات جوال اليمن العام', description: 'دردشة جوال يمني العامة' },
      { name: 'شات جوال اليمن الخاص', description: 'دردشة جوال يمني الخاصة' }
    ]
  },
  {
    id: 'hodeidah',
    nameAr: 'شات الحديدة',
    nameEn: 'Hodeidah Chat',
    path: '/yemen/hodeidah',
    countryPath: '/yemen',
    title: 'شات الحديدة - دردشة محافظة الحديدة',
    metaDescription: 'شات الحديدة للتعارف والدردشة مع شباب وبنات من الحديدة. دردشة حديدة مجانية بدون تسجيل.',
    keywords: ['شات الحديدة', 'دردشة حديدة', 'تعارف الحديدة', 'بنات الحديدة'],
    chatLinks: [
      { name: 'شات الحديدة العام', description: 'دردشة الحديدة العامة' },
      { name: 'شات الحديدة الساحلي', description: 'دردشة الساحل في الحديدة' }
    ]
  },
  {
    id: 'ibb',
    nameAr: 'شات إب',
    nameEn: 'Ibb Chat',
    path: '/yemen/ibb',
    countryPath: '/yemen',
    title: 'شات إب - دردشة محافظة إب',
    metaDescription: 'شات إب للتعارف والدردشة مع شباب وبنات من إب. دردشة إب مجانية بدون تسجيل.',
    keywords: ['شات إب', 'دردشة إب', 'تعارف إب', 'بنات إب'],
    chatLinks: [
      { name: 'شات إب العام', description: 'دردشة إب العامة' },
      { name: 'شات إب الجبلي', description: 'دردشة الجبال في إب' }
    ]
  },
  {
    id: 'hadramaut',
    nameAr: 'شات حضرموت',
    nameEn: 'Hadramaut Chat',
    path: '/yemen/hadramaut',
    countryPath: '/yemen',
    title: 'شات حضرموت - دردشة حضرموت',
    metaDescription: 'شات حضرموت للتعارف والدردشة مع شباب وبنات من حضرموت. دردشة حضرموت مجانية بدون تسجيل.',
    keywords: ['شات حضرموت', 'دردشة حضرموت', 'تعارف حضرموت', 'بنات حضرموت'],
    chatLinks: [
      { name: 'شات حضرموت العام', description: 'دردشة حضرموت العامة' },
      { name: 'شات حضرموت الشرقي', description: 'دردشة الشرق في حضرموت' }
    ]
  },
  {
    id: 'mukalla',
    nameAr: 'شات المكلا',
    nameEn: 'Mukalla Chat',
    path: '/yemen/mukalla',
    countryPath: '/yemen',
    title: 'شات المكلا - دردشة مدينة المكلا',
    metaDescription: 'شات المكلا للتعارف والدردشة مع شباب وبنات من المكلا. دردشة مكلا مجانية بدون تسجيل.',
    keywords: ['شات المكلا', 'دردشة مكلا', 'تعارف المكلا', 'بنات المكلا'],
    chatLinks: [
      { name: 'شات المكلا العام', description: 'دردشة المكلا العامة' },
      { name: 'شات المكلا الساحلي', description: 'دردشة الساحل في المكلا' }
    ]
  },

  // مدن رئيسية في اليمن
  {
    id: 'sanaa',
    nameAr: 'شات صنعاء',
    nameEn: 'Sanaa Chat',
    path: '/yemen/sanaa',
    countryPath: '/yemen',
    title: 'شات صنعاء - دردشة العاصمة صنعاء',
    metaDescription: 'شات صنعاء للتعارف والدردشة مع شباب وبنات من صنعاء. دردشة يمنية مجانية بدون تسجيل.',
    keywords: ['شات صنعاء', 'دردشة صنعاء', 'تعارف اليمن', 'بنات اليمن'],
    chatLinks: [
      { name: 'شات صنعاء العام', description: 'دردشة عامة لصنعاء' },
      { name: 'شات صنعاء التاريخي', description: 'دردشة التاريخ في صنعاء' }
    ]
  },
  {
    id: 'aden',
    nameAr: 'شات عدن',
    nameEn: 'Aden Chat',
    path: '/yemen/aden',
    countryPath: '/yemen',
    title: 'شات عدن - دردشة مدينة عدن',
    metaDescription: 'شات عدن للتعارف والدردشة مع شباب وبنات من عدن. دردشة يمنية مجانية بدون تسجيل.',
    keywords: ['شات عدن', 'دردشة عدن', 'تعارف اليمن', 'بنات اليمن'],
    chatLinks: [
      { name: 'شات عدن العام', description: 'دردشة عامة لعدن' },
      { name: 'شات عدن الساحلي', description: 'دردشة الساحل في عدن' }
    ]
  },
  {
    id: 'taiz',
    nameAr: 'شات تعز',
    nameEn: 'Taiz Chat',
    path: '/yemen/taiz',
    countryPath: '/yemen',
    title: 'شات تعز - دردشة مدينة تعز',
    metaDescription: 'شات تعز للتعارف والدردشة مع شباب وبنات من تعز. دردشة يمنية مجانية بدون تسجيل.',
    keywords: ['شات تعز', 'دردشة تعز', 'تعارف اليمن', 'بنات اليمن'],
    chatLinks: [
      { name: 'شات تعز العام', description: 'دردشة عامة لتعز' },
      { name: 'شات تعز الجبلي', description: 'دردشة الجبال في تعز' }
    ]
  },

  // مدن إضافية للبنان
  {
    id: 'lebanon-mobile',
    nameAr: 'شات جوال لبنان',
    nameEn: 'Lebanon Mobile Chat',
    path: '/lebanon/lebanon-mobile',
    countryPath: '/lebanon',
    title: 'شات جوال لبنان - دردشة جوال لبناني',
    metaDescription: 'شات جوال لبنان للتعارف والدردشة مع شباب وبنات من لبنان. دردشة لبنانية مجانية بدون تسجيل.',
    keywords: ['شات جوال لبنان', 'دردشة لبنانية جوال', 'تعارف لبنان', 'بنات لبنان'],
    chatLinks: [
      { name: 'شات جوال لبنان العام', description: 'دردشة جوال لبناني العامة' },
      { name: 'شات جوال لبنان الخاص', description: 'دردشة جوال لبناني الخاصة' }
    ]
  },
  {
    id: 'tyre',
    nameAr: 'شات صور',
    nameEn: 'Tyre Chat',
    path: '/lebanon/tyre',
    countryPath: '/lebanon',
    title: 'شات صور - دردشة مدينة صور',
    metaDescription: 'شات صور للتعارف والدردشة مع شباب وبنات من صور. دردشة صور مجانية بدون تسجيل.',
    keywords: ['شات صور', 'دردشة صور', 'تعارف صور', 'بنات صور'],
    chatLinks: [
      { name: 'شات صور العام', description: 'دردشة صور العامة' },
      { name: 'شات صور التاريخي', description: 'دردشة التاريخ في صور' }
    ]
  },
  {
    id: 'zahle',
    nameAr: 'شات زحلة',
    nameEn: 'Zahle Chat',
    path: '/lebanon/zahle',
    countryPath: '/lebanon',
    title: 'شات زحلة - دردشة مدينة زحلة',
    metaDescription: 'شات زحلة للتعارف والدردشة مع شباب وبنات من زحلة. دردشة زحلة مجانية بدون تسجيل.',
    keywords: ['شات زحلة', 'دردشة زحلة', 'تعارف زحلة', 'بنات زحلة'],
    chatLinks: [
      { name: 'شات زحلة العام', description: 'دردشة زحلة العامة' },
      { name: 'شات زحلة الزراعي', description: 'دردشة الزراعة في زحلة' }
    ]
  },
  {
    id: 'byblos',
    nameAr: 'شات جبيل',
    nameEn: 'Byblos Chat',
    path: '/lebanon/byblos',
    countryPath: '/lebanon',
    title: 'شات جبيل - دردشة مدينة جبيل',
    metaDescription: 'شات جبيل للتعارف والدردشة مع شباب وبنات من جبيل. دردشة جبيل مجانية بدون تسجيل.',
    keywords: ['شات جبيل', 'دردشة جبيل', 'تعارف جبيل', 'بنات جبيل'],
    chatLinks: [
      { name: 'شات جبيل العام', description: 'دردشة جبيل العامة' },
      { name: 'شات جبيل الساحلي', description: 'دردشة الساحل في جبيل' }
    ]
  },
  {
    id: 'baalbek',
    nameAr: 'شات بعلبك',
    nameEn: 'Baalbek Chat',
    path: '/lebanon/baalbek',
    countryPath: '/lebanon',
    title: 'شات بعلبك - دردشة مدينة بعلبك',
    metaDescription: 'شات بعلبك للتعارف والدردشة مع شباب وبنات من بعلبك. دردشة بعلبك مجانية بدون تسجيل.',
    keywords: ['شات بعلبك', 'دردشة بعلبك', 'تعارف بعلبك', 'بنات بعلبك'],
    chatLinks: [
      { name: 'شات بعلبك العام', description: 'دردشة بعلبك العامة' },
      { name: 'شات بعلبك التراثي', description: 'دردشة التراث في بعلبك' }
    ]
  },

  // مدن رئيسية في لبنان
  {
    id: 'beirut',
    nameAr: 'شات بيروت',
    nameEn: 'Beirut Chat',
    path: '/lebanon/beirut',
    countryPath: '/lebanon',
    title: 'شات بيروت - دردشة العاصمة بيروت',
    metaDescription: 'شات بيروت للتعارف والدردشة مع شباب وبنات من بيروت. دردشة لبنانية مجانية بدون تسجيل.',
    keywords: ['شات بيروت', 'دردشة بيروت', 'تعارف لبنان', 'بنات لبنان'],
    chatLinks: [
      { name: 'شات بيروت العام', description: 'دردشة عامة لبيروت' },
      { name: 'شات بيروت الساحلي', description: 'دردشة الساحل في بيروت' }
    ]
  },
  {
    id: 'tripoli',
    nameAr: 'شات طرابلس',
    nameEn: 'Tripoli Chat',
    path: '/lebanon/tripoli',
    countryPath: '/lebanon',
    title: 'شات طرابلس - دردشة مدينة طرابلس',
    metaDescription: 'شات طرابلس للتعارف والدردشة مع شباب وبنات من طرابلس. دردشة لبنانية مجانية بدون تسجيل.',
    keywords: ['شات طرابلس', 'دردشة طرابلس', 'تعارف لبنان', 'بنات لبنان'],
    chatLinks: [
      { name: 'شات طرابلس العام', description: 'دردشة عامة لطرابلس' },
      { name: 'شات طرابلس البحري', description: 'دردشة البحر في طرابلس' }
    ]
  },
  {
    id: 'sidon',
    nameAr: 'شات صيدا',
    nameEn: 'Sidon Chat',
    path: '/lebanon/sidon',
    countryPath: '/lebanon',
    title: 'شات صيدا - دردشة مدينة صيدا',
    metaDescription: 'شات صيدا للتعارف والدردشة مع شباب وبنات من صيدا. دردشة لبنانية مجانية بدون تسجيل.',
    keywords: ['شات صيدا', 'دردشة صيدا', 'تعارف لبنان', 'بنات لبنان'],
    chatLinks: [
      { name: 'شات صيدا العام', description: 'دردشة عامة لصيدا' },
      { name: 'شات صيدا الساحلي', description: 'دردشة الساحل في صيدا' }
    ]
  },

  // مدن إضافية لسوريا
  {
    id: 'syria-mobile',
    nameAr: 'شات جوال سوريا',
    nameEn: 'Syria Mobile Chat',
    path: '/syria/syria-mobile',
    countryPath: '/syria',
    title: 'شات جوال سوريا - دردشة جوال سوري',
    metaDescription: 'شات جوال سوريا للتعارف والدردشة مع شباب وبنات من سوريا. دردشة سورية مجانية بدون تسجيل.',
    keywords: ['شات جوال سوريا', 'دردشة سورية جوال', 'تعارف سوريا', 'بنات سوريا'],
    chatLinks: [
      { name: 'شات جوال سوريا العام', description: 'دردشة جوال سوري العامة' },
      { name: 'شات جوال سوريا الخاص', description: 'دردشة جوال سوري الخاصة' }
    ]
  },
  {
    id: 'latakia',
    nameAr: 'شات اللاذقية',
    nameEn: 'Latakia Chat',
    path: '/syria/latakia',
    countryPath: '/syria',
    title: 'شات اللاذقية - دردشة مدينة اللاذقية',
    metaDescription: 'شات اللاذقية للتعارف والدردشة مع شباب وبنات من اللاذقية. دردشة لاذقية مجانية بدون تسجيل.',
    keywords: ['شات اللاذقية', 'دردشة لاذقية', 'تعارف اللاذقية', 'بنات اللاذقية'],
    chatLinks: [
      { name: 'شات اللاذقية العام', description: 'دردشة اللاذقية العامة' },
      { name: 'شات اللاذقية الساحلي', description: 'دردشة الساحل في اللاذقية' }
    ]
  },
  {
    id: 'hama',
    nameAr: 'شات حماة',
    nameEn: 'Hama Chat',
    path: '/syria/hama',
    countryPath: '/syria',
    title: 'شات حماة - دردشة مدينة حماة',
    metaDescription: 'شات حماة للتعارف والدردشة مع شباب وبنات من حماة. دردشة حماة مجانية بدون تسجيل.',
    keywords: ['شات حماة', 'دردشة حماة', 'تعارف حماة', 'بنات حماة'],
    chatLinks: [
      { name: 'شات حماة العام', description: 'دردشة حماة العامة' },
      { name: 'شات حماة النهري', description: 'دردشة النهر في حماة' }
    ]
  },
  {
    id: 'tartus',
    nameAr: 'شات طرطوس',
    nameEn: 'Tartus Chat',
    path: '/syria/tartus',
    countryPath: '/syria',
    title: 'شات طرطوس - دردشة مدينة طرطوس',
    metaDescription: 'شات طرطوس للتعارف والدردشة مع شباب وبنات من طرطوس. دردشة طرطوس مجانية بدون تسجيل.',
    keywords: ['شات طرطوس', 'دردشة طرطوس', 'تعارف طرطوس', 'بنات طرطوس'],
    chatLinks: [
      { name: 'شات طرطوس العام', description: 'دردشة طرطوس العامة' },
      { name: 'شات طرطوس الساحلي', description: 'دردشة الساحل في طرطوس' }
    ]
  },
  {
    id: 'deir-ez-zor',
    nameAr: 'شات دير الزور',
    nameEn: 'Deir ez-Zor Chat',
    path: '/syria/deir-ez-zor',
    countryPath: '/syria',
    title: 'شات دير الزور - دردشة مدينة دير الزور',
    metaDescription: 'شات دير الزور للتعارف والدردشة مع شباب وبنات من دير الزور. دردشة دير الزور مجانية بدون تسجيل.',
    keywords: ['شات دير الزور', 'دردشة دير الزور', 'تعارف دير الزور', 'بنات دير الزور'],
    chatLinks: [
      { name: 'شات دير الزور العام', description: 'دردشة دير الزور العامة' },
      { name: 'شات دير الزور النهري', description: 'دردشة النهر في دير الزور' }
    ]
  },

  // مدن رئيسية في سوريا
  {
    id: 'damascus',
    nameAr: 'شات دمشق',
    nameEn: 'Damascus Chat',
    path: '/syria/damascus',
    countryPath: '/syria',
    title: 'شات دمشق - دردشة العاصمة دمشق',
    metaDescription: 'شات دمشق للتعارف والدردشة مع شباب وبنات من دمشق. دردشة سورية مجانية بدون تسجيل.',
    keywords: ['شات دمشق', 'دردشة دمشق', 'تعارف سوريا', 'بنات سوريا'],
    chatLinks: [
      { name: 'شات دمشق العام', description: 'دردشة عامة لدمشق' },
      { name: 'شات دمشق التاريخي', description: 'دردشة التاريخ في دمشق' }
    ]
  },
  {
    id: 'aleppo',
    nameAr: 'شات حلب',
    nameEn: 'Aleppo Chat',
    path: '/syria/aleppo',
    countryPath: '/syria',
    title: 'شات حلب - دردشة مدينة حلب',
    metaDescription: 'شات حلب للتعارف والدردشة مع شباب وبنات من حلب. دردشة سورية مجانية بدون تسجيل.',
    keywords: ['شات حلب', 'دردشة حلب', 'تعارف سوريا', 'بنات سوريا'],
    chatLinks: [
      { name: 'شات حلب العام', description: 'دردشة عامة لحلب' },
      { name: 'شات حلب الصناعي', description: 'دردشة الصناعة في حلب' }
    ]
  },
  {
    id: 'homs',
    nameAr: 'شات حمص',
    nameEn: 'Homs Chat',
    path: '/syria/homs',
    countryPath: '/syria',
    title: 'شات حمص - دردشة مدينة حمص',
    metaDescription: 'شات حمص للتعارف والدردشة مع شباب وبنات من حمص. دردشة سورية مجانية بدون تسجيل.',
    keywords: ['شات حمص', 'دردشة حمص', 'تعارف سوريا', 'بنات سوريا'],
    chatLinks: [
      { name: 'شات حمص العام', description: 'دردشة عامة لحمص' },
      { name: 'شات حمص التاريخي', description: 'دردشة التاريخ في حمص' }
    ]
  },

  // مدن إضافية للعراق
  {
    id: 'iraq-mobile',
    nameAr: 'شات جوال العراق',
    nameEn: 'Iraq Mobile Chat',
    path: '/iraq/iraq-mobile',
    countryPath: '/iraq',
    title: 'شات جوال العراق - دردشة جوال عراقي',
    metaDescription: 'شات جوال العراق للتعارف والدردشة مع شباب وبنات من العراق. دردشة عراقية مجانية بدون تسجيل.',
    keywords: ['شات جوال العراق', 'دردشة عراقية جوال', 'تعارف العراق', 'بنات العراق'],
    chatLinks: [
      { name: 'شات جوال العراق العام', description: 'دردشة جوال عراقي العامة' },
      { name: 'شات جوال العراق الخاص', description: 'دردشة جوال عراقي الخاصة' }
    ]
  },
  {
    id: 'erbil',
    nameAr: 'شات أربيل',
    nameEn: 'Erbil Chat',
    path: '/iraq/erbil',
    countryPath: '/iraq',
    title: 'شات أربيل - دردشة مدينة أربيل',
    metaDescription: 'شات أربيل للتعارف والدردشة مع شباب وبنات من أربيل. دردشة أربيل مجانية بدون تسجيل.',
    keywords: ['شات أربيل', 'دردشة أربيل', 'تعارف أربيل', 'بنات أربيل'],
    chatLinks: [
      { name: 'شات أربيل العام', description: 'دردشة أربيل العامة' },
      { name: 'شات أربيل الكردي', description: 'دردشة الكرد في أربيل' }
    ]
  },
  {
    id: 'najaf',
    nameAr: 'شات النجف',
    nameEn: 'Najaf Chat',
    path: '/iraq/najaf',
    countryPath: '/iraq',
    title: 'شات النجف - دردشة مدينة النجف',
    metaDescription: 'شات النجف للتعارف والدردشة مع شباب وبنات من النجف. دردشة نجف مجانية بدون تسجيل.',
    keywords: ['شات النجف', 'دردشة نجف', 'تعارف النجف', 'بنات النجف'],
    chatLinks: [
      { name: 'شات النجف العام', description: 'دردشة النجف العامة' },
      { name: 'شات النجف المقدس', description: 'دردشة المقدسات في النجف' }
    ]
  },
  {
    id: 'karbala',
    nameAr: 'شات كربلاء',
    nameEn: 'Karbala Chat',
    path: '/iraq/karbala',
    countryPath: '/iraq',
    title: 'شات كربلاء - دردشة مدينة كربلاء',
    metaDescription: 'شات كربلاء للتعارف والدردشة مع شباب وبنات من كربلاء. دردشة كربلاء مجانية بدون تسجيل.',
    keywords: ['شات كربلاء', 'دردشة كربلاء', 'تعارف كربلاء', 'بنات كربلاء'],
    chatLinks: [
      { name: 'شات كربلاء العام', description: 'دردشة كربلاء العامة' },
      { name: 'شات كربلاء المقدس', description: 'دردشة المقدسات في كربلاء' }
    ]
  },
  {
    id: 'sulaymaniyah',
    nameAr: 'شات السليمانية',
    nameEn: 'Sulaymaniyah Chat',
    path: '/iraq/sulaymaniyah',
    countryPath: '/iraq',
    title: 'شات السليمانية - دردشة مدينة السليمانية',
    metaDescription: 'شات السليمانية للتعارف والدردشة مع شباب وبنات من السليمانية. دردشة سليمانية مجانية بدون تسجيل.',
    keywords: ['شات السليمانية', 'دردشة سليمانية', 'تعارف السليمانية', 'بنات السليمانية'],
    chatLinks: [
      { name: 'شات السليمانية العام', description: 'دردشة السليمانية العامة' },
      { name: 'شات السليمانية الكردي', description: 'دردشة الكرد في السليمانية' }
    ]
  },

  // مدن رئيسية في العراق
  {
    id: 'baghdad',
    nameAr: 'شات بغداد',
    nameEn: 'Baghdad Chat',
    path: '/iraq/baghdad',
    countryPath: '/iraq',
    title: 'شات بغداد - دردشة العاصمة بغداد',
    metaDescription: 'شات بغداد للتعارف والدردشة مع شباب وبنات من بغداد. دردشة عراقية مجانية بدون تسجيل.',
    keywords: ['شات بغداد', 'دردشة بغداد', 'تعارف العراق', 'بنات العراق'],
    chatLinks: [
      { name: 'شات بغداد العام', description: 'دردشة عامة لبغداد' },
      { name: 'شات بغداد التاريخي', description: 'دردشة التاريخ في بغداد' }
    ]
  },
  {
    id: 'basra',
    nameAr: 'شات البصرة',
    nameEn: 'Basra Chat',
    path: '/iraq/basra',
    countryPath: '/iraq',
    title: 'شات البصرة - دردشة مدينة البصرة',
    metaDescription: 'شات البصرة للتعارف والدردشة مع شباب وبنات من البصرة. دردشة عراقية مجانية بدون تسجيل.',
    keywords: ['شات البصرة', 'دردشة البصرة', 'تعارف العراق', 'بنات العراق'],
    chatLinks: [
      { name: 'شات البصرة العام', description: 'دردشة عامة للبصرة' },
      { name: 'شات البصرة النفطي', description: 'دردشة النفط في البصرة' }
    ]
  },
  {
    id: 'mosul',
    nameAr: 'شات الموصل',
    nameEn: 'Mosul Chat',
    path: '/iraq/mosul',
    countryPath: '/iraq',
    title: 'شات الموصل - دردشة مدينة الموصل',
    metaDescription: 'شات الموصل للتعارف والدردشة مع شباب وبنات من الموصل. دردشة عراقية مجانية بدون تسجيل.',
    keywords: ['شات الموصل', 'دردشة الموصل', 'تعارف العراق', 'بنات العراق'],
    chatLinks: [
      { name: 'شات الموصل العام', description: 'دردشة عامة للموصل' },
      { name: 'شات الموصل التاريخي', description: 'دردشة التاريخ في الموصل' }
    ]
  },

  // مدن إضافية لجزر القمر
  {
    id: 'comoros-mobile',
    nameAr: 'شات جوال جزر القمر',
    nameEn: 'Comoros Mobile Chat',
    path: '/comoros/comoros-mobile',
    countryPath: '/comoros',
    title: 'شات جوال جزر القمر - دردشة جوال قمري',
    metaDescription: 'شات جوال جزر القمر للتعارف والدردشة مع شباب وبنات من جزر القمر. دردشة قمرية مجانية بدون تسجيل.',
    keywords: ['شات جوال جزر القمر', 'دردشة قمرية جوال', 'تعارف جزر القمر', 'بنات جزر القمر'],
    chatLinks: [
      { name: 'شات جوال جزر القمر العام', description: 'دردشة جوال قمري العامة' },
      { name: 'شات جوال جزر القمر الخاص', description: 'دردشة جوال قمري الخاصة' }
    ]
  },
  {
    id: 'anjouan',
    nameAr: 'شات أنجوان',
    nameEn: 'Anjouan Chat',
    path: '/comoros/anjouan',
    countryPath: '/comoros',
    title: 'شات أنجوان - دردشة جزيرة أنجوان',
    metaDescription: 'شات أنجوان للتعارف والدردشة مع شباب وبنات من أنجوان. دردشة أنجوان مجانية بدون تسجيل.',
    keywords: ['شات أنجوان', 'دردشة أنجوان', 'تعارف أنجوان', 'بنات أنجوان'],
    chatLinks: [
      { name: 'شات أنجوان العام', description: 'دردشة أنجوان العامة' },
      { name: 'شات أنجوان الجزيري', description: 'دردشة الجزر في أنجوان' }
    ]
  },
  {
    id: 'mohéli',
    nameAr: 'شات موهيلي',
    nameEn: 'Mohéli Chat',
    path: '/comoros/mohéli',
    countryPath: '/comoros',
    title: 'شات موهيلي - دردشة جزيرة موهيلي',
    metaDescription: 'شات موهيلي للتعارف والدردشة مع شباب وبنات من موهيلي. دردشة موهيلي مجانية بدون تسجيل.',
    keywords: ['شات موهيلي', 'دردشة موهيلي', 'تعارف موهيلي', 'بنات موهيلي'],
    chatLinks: [
      { name: 'شات موهيلي العام', description: 'دردشة موهيلي العامة' },
      { name: 'شات موهيلي الجزيري', description: 'دردشة الجزر في موهيلي' }
    ]
  },
  {
    id: 'grande-comore',
    nameAr: 'شات غراند كومور',
    nameEn: 'Grande Comore Chat',
    path: '/comoros/grande-comore',
    countryPath: '/comoros',
    title: 'شات غراند كومور - دردشة جزيرة غراند كومور',
    metaDescription: 'شات غراند كومور للتعارف والدردشة مع شباب وبنات من غراند كومور. دردشة غراند كومور مجانية بدون تسجيل.',
    keywords: ['شات غراند كومور', 'دردشة غراند كومور', 'تعارف غراند كومور', 'بنات غراند كومور'],
    chatLinks: [
      { name: 'شات غراند كومور العام', description: 'دردشة غراند كومور العامة' },
      { name: 'شات غراند كومور الرئيسي', description: 'دردشة الجزيرة الرئيسية' }
    ]
  },
  {
    id: 'mayotte',
    nameAr: 'شات مايوت',
    nameEn: 'Mayotte Chat',
    path: '/comoros/mayotte',
    countryPath: '/comoros',
    title: 'شات مايوت - دردشة جزيرة مايوت',
    metaDescription: 'شات مايوت للتعارف والدردشة مع شباب وبنات من مايوت. دردشة مايوت مجانية بدون تسجيل.',
    keywords: ['شات مايوت', 'دردشة مايوت', 'تعارف مايوت', 'بنات مايوت'],
    chatLinks: [
      { name: 'شات مايوت العام', description: 'دردشة مايوت العامة' },
      { name: 'شات مايوت الفرنسي', description: 'دردشة الجزيرة الفرنسية' }
    ]
  },
  {
    id: 'domoni',
    nameAr: 'شات دوموني',
    nameEn: 'Domoni Chat',
    path: '/comoros/domoni',
    countryPath: '/comoros',
    title: 'شات دوموني - دردشة مدينة دوموني',
    metaDescription: 'شات دوموني للتعارف والدردشة مع شباب وبنات من دوموني. دردشة دوموني مجانية بدون تسجيل.',
    keywords: ['شات دوموني', 'دردشة دوموني', 'تعارف دوموني', 'بنات دوموني'],
    chatLinks: [
      { name: 'شات دوموني العام', description: 'دردشة دوموني العامة' },
      { name: 'شات دوموني التراثي', description: 'دردشة التراث في دوموني' }
    ]
  },
  {
    id: 'fomboni',
    nameAr: 'شات فومبوني',
    nameEn: 'Fomboni Chat',
    path: '/comoros/fomboni',
    countryPath: '/comoros',
    title: 'شات فومبوني - دردشة مدينة فومبوني',
    metaDescription: 'شات فومبوني للتعارف والدردشة مع شباب وبنات من فومبوني. دردشة فومبوني مجانية بدون تسجيل.',
    keywords: ['شات فومبوني', 'دردشة فومبوني', 'تعارف فومبوني', 'بنات فومبوني'],
    chatLinks: [
      { name: 'شات فومبوني العام', description: 'دردشة فومبوني العامة' },
      { name: 'شات فومبوني الرئيسي', description: 'دردشة المدينة الرئيسية' }
    ]
  },

  // العاصمة في جزر القمر
  {
    id: 'moroni',
    nameAr: 'شات موروني',
    nameEn: 'Moroni Chat',
    path: '/comoros/moroni',
    countryPath: '/comoros',
    title: 'شات موروني - دردشة العاصمة موروني',
    metaDescription: 'شات موروني للتعارف والدردشة مع شباب وبنات من موروني. دردشة قمرية مجانية بدون تسجيل.',
    keywords: ['شات موروني', 'دردشة موروني', 'تعارف جزر القمر', 'بنات جزر القمر'],
    chatLinks: [
      { name: 'شات موروني العام', description: 'دردشة عامة لموروني' },
      { name: 'شات موروني الجزيري', description: 'دردشة الجزر في موروني' }
    ]
  },

  // مدن إضافية لجيبوتي
  {
    id: 'djibouti-mobile',
    nameAr: 'شات جوال جيبوتي',
    nameEn: 'Djibouti Mobile Chat',
    path: '/djibouti/djibouti-mobile',
    countryPath: '/djibouti',
    title: 'شات جوال جيبوتي - دردشة جوال جيبوتي',
    metaDescription: 'شات جوال جيبوتي للتعارف والدردشة مع شباب وبنات من جيبوتي. دردشة جيبوتية مجانية بدون تسجيل.',
    keywords: ['شات جوال جيبوتي', 'دردشة جيبوتية جوال', 'تعارف جيبوتي', 'بنات جيبوتي'],
    chatLinks: [
      { name: 'شات جوال جيبوتي العام', description: 'دردشة جوال جيبوتي العامة' },
      { name: 'شات جوال جيبوتي الخاص', description: 'دردشة جوال جيبوتي الخاصة' }
    ]
  },
  {
    id: 'djibouti-city',
    nameAr: 'شات جيبوتي العاصمة',
    nameEn: 'Djibouti City Chat',
    path: '/djibouti/djibouti-city',
    countryPath: '/djibouti',
    title: 'شات جيبوتي العاصمة - دردشة العاصمة جيبوتي',
    metaDescription: 'شات جيبوتي العاصمة للتعارف والدردشة مع شباب وبنات من العاصمة جيبوتي. دردشة جيبوتية مجانية بدون تسجيل.',
    keywords: ['شات جيبوتي العاصمة', 'دردشة جيبوتي', 'تعارف جيبوتي', 'بنات جيبوتي'],
    chatLinks: [
      { name: 'شات جيبوتي العاصمة العام', description: 'دردشة عامة للعاصمة' },
      { name: 'شات جيبوتي العاصمة الساحلي', description: 'دردشة الساحل في العاصمة' }
    ]
  },
  {
    id: 'ali-sabieh',
    nameAr: 'شات علي صبيح',
    nameEn: 'Ali Sabieh Chat',
    path: '/djibouti/ali-sabieh',
    countryPath: '/djibouti',
    title: 'شات علي صبيح - دردشة مدينة علي صبيح',
    metaDescription: 'شات علي صبيح للتعارف والدردشة مع شباب وبنات من علي صبيح. دردشة علي صبيح مجانية بدون تسجيل.',
    keywords: ['شات علي صبيح', 'دردشة علي صبيح', 'تعارف علي صبيح', 'بنات علي صبيح'],
    chatLinks: [
      { name: 'شات علي صبيح العام', description: 'دردشة علي صبيح العامة' },
      { name: 'شات علي صبيح الجنوبي', description: 'دردشة الجنوب في علي صبيح' }
    ]
  },
  {
    id: 'tadjoura',
    nameAr: 'شات تاجورة',
    nameEn: 'Tadjoura Chat',
    path: '/djibouti/tadjoura',
    countryPath: '/djibouti',
    title: 'شات تاجورة - دردشة مدينة تاجورة',
    metaDescription: 'شات تاجورة للتعارف والدردشة مع شباب وبنات من تاجورة. دردشة تاجورة مجانية بدون تسجيل.',
    keywords: ['شات تاجورة', 'دردشة تاجورة', 'تعارف تاجورة', 'بنات تاجورة'],
    chatLinks: [
      { name: 'شات تاجورة العام', description: 'دردشة تاجورة العامة' },
      { name: 'شات تاجورة الشمالي', description: 'دردشة الشمال في تاجورة' }
    ]
  },
  {
    id: 'obock',
    nameAr: 'شات أوبوك',
    nameEn: 'Obock Chat',
    path: '/djibouti/obock',
    countryPath: '/djibouti',
    title: 'شات أوبوك - دردشة مدينة أوبوك',
    metaDescription: 'شات أوبوك للتعارف والدردشة مع شباب وبنات من أوبوك. دردشة أوبوك مجانية بدون تسجيل.',
    keywords: ['شات أوبوك', 'دردشة أوبوك', 'تعارف أوبوك', 'بنات أوبوك'],
    chatLinks: [
      { name: 'شات أوبوك العام', description: 'دردشة أوبوك العامة' },
      { name: 'شات أوبوك الساحلي', description: 'دردشة الساحل في أوبوك' }
    ]
  },
  {
    id: 'dikhil',
    nameAr: 'شات دخيل',
    nameEn: 'Dikhil Chat',
    path: '/djibouti/dikhil',
    countryPath: '/djibouti',
    title: 'شات دخيل - دردشة مدينة دخيل',
    metaDescription: 'شات دخيل للتعارف والدردشة مع شباب وبنات من دخيل. دردشة دخيل مجانية بدون تسجيل.',
    keywords: ['شات دخيل', 'دردشة دخيل', 'تعارف دخيل', 'بنات دخيل'],
    chatLinks: [
      { name: 'شات دخيل العام', description: 'دردشة دخيل العامة' },
      { name: 'شات دخيل الجنوبي', description: 'دردشة الجنوب في دخيل' }
    ]
  },
  {
    id: 'arta',
    nameAr: 'شات أرتا',
    nameEn: 'Arta Chat',
    path: '/djibouti/arta',
    countryPath: '/djibouti',
    title: 'شات أرتا - دردشة مدينة أرتا',
    metaDescription: 'شات أرتا للتعارف والدردشة مع شباب وبنات من أرتا. دردشة أرتا مجانية بدون تسجيل.',
    keywords: ['شات أرتا', 'دردشة أرتا', 'تعارف أرتا', 'بنات أرتا'],
    chatLinks: [
      { name: 'شات أرتا العام', description: 'دردشة أرتا العامة' },
      { name: 'شات أرتا الزراعي', description: 'دردشة الزراعة في أرتا' }
    ]
  },
  {
    id: 'horn-of-africa',
    nameAr: 'شات قرن أفريقيا',
    nameEn: 'Horn of Africa Chat',
    path: '/djibouti/horn-of-africa',
    countryPath: '/djibouti',
    title: 'شات قرن أفريقيا - دردشة قرن أفريقيا',
    metaDescription: 'شات قرن أفريقيا للتعارف والدردشة مع شباب وبنات من قرن أفريقيا. دردشة قرن أفريقيا مجانية بدون تسجيل.',
    keywords: ['شات قرن أفريقيا', 'دردشة قرن أفريقيا', 'تعارف قرن أفريقيا', 'بنات قرن أفريقيا'],
    chatLinks: [
      { name: 'شات قرن أفريقيا العام', description: 'دردشة قرن أفريقيا العامة' },
      { name: 'شات قرن أفريقيا الإقليمي', description: 'دردشة الإقليم في قرن أفريقيا' }
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

// دالة للحصول على جميع المدن لجميع الدول
export function getAllCities(): CityChat[] {
  return cityChats;
}

// دالة للبحث عن مدينة بواسطة الاسم (عربي أو إنجليزي)
export function searchCities(query: string): CityChat[] {
  const lowerQuery = query.toLowerCase();
  return cityChats.filter(city =>
    city.nameAr.toLowerCase().includes(lowerQuery) ||
    city.nameEn.toLowerCase().includes(lowerQuery) ||
    city.title.toLowerCase().includes(lowerQuery)
  );
}

// دالة للحصول على إحصائيات المدن
export function getCitiesStats() {
  const citiesByCountry: Record<string, number> = {};

  cityChats.forEach(city => {
    citiesByCountry[city.countryPath] = (citiesByCountry[city.countryPath] || 0) + 1;
  });

  return {
    total: cityChats.length,
    byCountry: citiesByCountry
  };
}

// نظام متكامل للمدن والدول
export class CitiesSystem {
  // الحصول على جميع المدن لدولة معينة مع معلومات إضافية
  static getCitiesWithCountryInfo(countryPath: string) {
    const cities = getCitiesByCountry(countryPath);
    const country = getCountryByPath(countryPath);

    return {
      country,
      cities,
      stats: {
        totalCities: cities.length,
        hasMobile: cities.some(c => c.id.includes('mobile')),
        hasCapital: cities.some(c => c.isCapital),
        regions: [...new Set(cities.map(c => c.region).filter(Boolean))]
      }
    };
  }

  // البحث المتقدم في المدن والدول
  static search(query: string, filters?: {
    countryId?: string;
    region?: string;
    hasMobile?: boolean;
  }) {
    let results = cityChats;

    if (query.trim()) {
      results = searchCities(query);
    }

    if (filters?.countryId) {
      results = results.filter(c => c.countryId === filters.countryId);
    }

    if (filters?.region) {
      results = results.filter(c => c.region === filters.region);
    }

    if (filters?.hasMobile) {
      results = results.filter(c => c.id.includes('mobile'));
    }

    return results;
  }

  // الحصول على المدن الأكثر شعبية
  static getPopularCities(limit = 10) {
    return cityChats
      .sort((a, b) => (b.population || 0) - (a.population || 0))
      .slice(0, limit);
  }

  // الحصول على المدن حسب المنطقة
  static getCitiesByRegion(region: string) {
    return cityChats.filter(c => c.region === region);
  }

  // الحصول على العواصم فقط
  static getCapitals() {
    return cityChats.filter(c => c.isCapital);
  }

  // إنشاء خريطة للمدن والدول
  static generateMapData() {
    const mapData: Record<string, any[]> = {};

    cityChats.forEach(city => {
      const countryId = city.countryId || 'unknown';
      if (!mapData[countryId]) {
        mapData[countryId] = [];
      }
      mapData[countryId].push(city);
    });

    return mapData;
  }
}


// إضافة countryId تلقائياً لجميع المدن
// هذا السكريبت يضيف countryId بناءً على countryPath
const pathToCountryIdMap: Record<string, string> = {
  '/oman': 'oman',
  '/egypt': 'egypt',
  '/saudi': 'saudi',
  '/algeria': 'algeria',
  '/bahrain': 'bahrain',
  '/uae': 'uae',
  '/jordan': 'jordan',
  '/kuwait': 'kuwait',
  '/libya': 'libya',
  '/tunisia': 'tunisia',
  '/morocco': 'morocco',
  '/sudan': 'sudan',
  '/palestine': 'palestine',
  '/qatar': 'qatar',
  '/yemen': 'yemen',
  '/lebanon': 'lebanon',
  '/syria': 'syria',
  '/iraq': 'iraq',
  '/comoros': 'comoros',
  '/djibouti': 'djibouti'
};

// تحديث جميع المدن بـ countryId تلقائياً
cityChats.forEach(city => {
  if (!city.countryId && city.countryPath) {
    city.countryId = pathToCountryIdMap[city.countryPath] || 'unknown';
  }
});
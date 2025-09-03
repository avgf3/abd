// بيانات المدن وروابط الشات الخاصة بكل مدينة
export interface CityChat {
  id: string;
  nameAr: string;
  nameEn: string;
  path: string;
  countryId: string;
  countryNameAr: string;
  title: string;
  metaDescription: string;
  keywords: string[];
  chatLinks: {
    name: string;
    description?: string;
  }[];
}

export const cityChats: CityChat[] = [
  // مدن الأردن
  {
    id: 'amman',
    nameAr: 'شات عمان',
    nameEn: 'Amman Chat',
    path: '/jordan/amman',
    countryId: 'jordan',
    countryNameAr: 'الأردن',
    title: 'شات عمان الأردن - دردشة عمان | تعارف شباب وبنات عمان الأردن',
    metaDescription: 'شات عمان الأردن للتعارف والدردشة مع شباب وبنات من العاصمة عمان. دردشة عمان مجانية بدون تسجيل، تعرف على أصدقاء جدد من جميع مناطق عمان الأردن.',
    keywords: ['شات عمان الأردن', 'دردشة عمان', 'شات العاصمة عمان', 'تعارف عمان الأردن', 'بنات عمان', 'شباب عمان'],
    chatLinks: [
      { name: 'شات وسط البلد', description: 'دردشة وسط عمان' },
      { name: 'شات جبل الحسين', description: 'دردشة جبل الحسين' },
      { name: 'شات الجامعة الأردنية', description: 'دردشة منطقة الجامعة' },
      { name: 'شات العبدلي', description: 'دردشة منطقة العبدلي' },
      { name: 'شات الدوار السابع', description: 'دردشة الدوار السابع' },
      { name: 'شات مرج الحمام', description: 'دردشة مرج الحمام' },
      { name: 'شات خلدا', description: 'دردشة منطقة خلدا' },
      { name: 'شات الشميساني', description: 'دردشة الشميساني' }
    ]
  },
  {
    id: 'zarqa',
    nameAr: 'شات الزرقاء',
    nameEn: 'Zarqa Chat',
    path: '/jordan/zarqa',
    countryId: 'jordan',
    countryNameAr: 'الأردن',
    title: 'شات الزرقاء - دردشة الزرقاء | تعارف شباب وبنات الزرقاء الأردن',
    metaDescription: 'شات الزرقاء للتعارف والدردشة مع شباب وبنات من مدينة الزرقاء الأردن. دردشة الزرقاء مجانية بدون تسجيل، تعرف على أصدقاء جدد من جميع مناطق الزرقاء.',
    keywords: ['شات الزرقاء', 'دردشة الزرقاء', 'تعارف الزرقاء', 'بنات الزرقاء', 'شباب الزرقاء', 'شات الزرقاء الأردن'],
    chatLinks: [
      { name: 'شات الزرقاء الجديدة', description: 'دردشة الزرقاء الجديدة' },
      { name: 'شات حي الأمير حسن', description: 'دردشة حي الأمير حسن' },
      { name: 'شات الضليل', description: 'دردشة منطقة الضليل' },
      { name: 'شات الأزرق', description: 'دردشة منطقة الأزرق' },
      { name: 'شات الرصيفة', description: 'دردشة مدينة الرصيفة' },
      { name: 'شات الهاشمي الشمالي', description: 'دردشة الهاشمي الشمالي' },
      { name: 'شات جامعة الزرقاء', description: 'دردشة جامعة الزرقاء' },
      { name: 'شات شارع الملكة نور', description: 'دردشة شارع الملكة نور' }
    ]
  },
  {
    id: 'irbid',
    nameAr: 'شات إربد',
    nameEn: 'Irbid Chat',
    path: '/jordan/irbid',
    countryId: 'jordan',
    countryNameAr: 'الأردن',
    title: 'شات إربد - دردشة إربد | تعارف شباب وبنات إربد الأردن',
    metaDescription: 'شات إربد للتعارف والدردشة مع شباب وبنات من مدينة إربد الأردن. دردشة إربد مجانية بدون تسجيل، تعرف على أصدقاء جدد من جميع مناطق إربد.',
    keywords: ['شات إربد', 'دردشة إربد', 'تعارف إربد', 'بنات إربد', 'شباب إربد', 'شات إربد الأردن'],
    chatLinks: [
      { name: 'شات وسط إربد', description: 'دردشة وسط مدينة إربد' },
      { name: 'شات جامعة اليرموك', description: 'دردشة جامعة اليرموك' },
      { name: 'شات حوارة', description: 'دردشة منطقة حوارة' },
      { name: 'شات الحصن', description: 'دردشة منطقة الحصن' },
      { name: 'شات بيت راس', description: 'دردشة بيت راس' },
      { name: 'شات الرمثا', description: 'دردشة مدينة الرمثا' },
      { name: 'شات المفرق', description: 'دردشة محافظة المفرق' },
      { name: 'شات جرش', description: 'دردشة مدينة جرش' }
    ]
  },
  {
    id: 'aqaba',
    nameAr: 'شات العقبة',
    nameEn: 'Aqaba Chat',
    path: '/jordan/aqaba',
    countryId: 'jordan',
    countryNameAr: 'الأردن',
    title: 'شات العقبة - دردشة العقبة | تعارف شباب وبنات العقبة الأردن',
    metaDescription: 'شات العقبة للتعارف والدردشة مع شباب وبنات من مدينة العقبة الأردن. دردشة العقبة مجانية بدون تسجيل، تعرف على أصدقاء جدد من العقبة.',
    keywords: ['شات العقبة', 'دردشة العقبة', 'تعارف العقبة', 'بنات العقبة', 'شباب العقبة'],
    chatLinks: [
      { name: 'شات العقبة الجنوبية', description: 'دردشة العقبة الجنوبية' },
      { name: 'شات الميناء', description: 'دردشة منطقة الميناء' },
      { name: 'شات وادي رم', description: 'دردشة وادي رم' },
      { name: 'شات الديسة', description: 'دردشة منطقة الديسة' },
      { name: 'شات العقبة السياحية', description: 'دردشة المنطقة السياحية' },
      { name: 'شات الشاطئ الجنوبي', description: 'دردشة الشاطئ الجنوبي' },
      { name: 'شات العقبة الاقتصادية', description: 'دردشة المنطقة الاقتصادية' },
      { name: 'شات تلة العلم', description: 'دردشة منطقة تلة العلم' }
    ]
  },

  // مدن مصر
  {
    id: 'cairo',
    nameAr: 'شات القاهرة',
    nameEn: 'Cairo Chat',
    path: '/egypt/cairo',
    countryId: 'egypt',
    countryNameAr: 'مصر',
    title: 'شات القاهرة - دردشة القاهرة | تعارف شباب وبنات القاهرة مصر',
    metaDescription: 'شات القاهرة للتعارف والدردشة مع شباب وبنات من العاصمة القاهرة مصر. دردشة القاهرة مجانية بدون تسجيل، تعرف على أصدقاء جدد من جميع أحياء القاهرة.',
    keywords: ['شات القاهرة', 'دردشة القاهرة', 'تعارف القاهرة', 'بنات القاهرة', 'شباب القاهرة', 'شات القاهرة مصر'],
    chatLinks: [
      { name: 'شات وسط البلد', description: 'دردشة وسط القاهرة' },
      { name: 'شات المعادي', description: 'دردشة حي المعادي' },
      { name: 'شات الزمالك', description: 'دردشة حي الزمالك' },
      { name: 'شات مصر الجديدة', description: 'دردشة مصر الجديدة' },
      { name: 'شات المهندسين', description: 'دردشة حي المهندسين' },
      { name: 'شات الدقي', description: 'دردشة حي الدقي' },
      { name: 'شات شبرا', description: 'دردشة منطقة شبرا' },
      { name: 'شات العباسية', description: 'دردشة حي العباسية' }
    ]
  },
  {
    id: 'alexandria',
    nameAr: 'شات الإسكندرية',
    nameEn: 'Alexandria Chat',
    path: '/egypt/alexandria',
    countryId: 'egypt',
    countryNameAr: 'مصر',
    title: 'شات الإسكندرية - دردشة الإسكندرية | تعارف شباب وبنات الإسكندرية مصر',
    metaDescription: 'شات الإسكندرية للتعارف والدردشة مع شباب وبنات من مدينة الإسكندرية مصر. دردشة الإسكندرية مجانية بدون تسجيل، تعرف على أصدقاء جدد من عروس البحر المتوسط.',
    keywords: ['شات الإسكندرية', 'دردشة الإسكندرية', 'تعارف الإسكندرية', 'بنات الإسكندرية', 'شباب الإسكندرية'],
    chatLinks: [
      { name: 'شات المنتزه', description: 'دردشة حي المنتزه' },
      { name: 'شات ستانلي', description: 'دردشة منطقة ستانلي' },
      { name: 'شات سيدي جابر', description: 'دردشة سيدي جابر' },
      { name: 'شات الشاطبي', description: 'دردشة حي الشاطبي' },
      { name: 'شات كامب شيزار', description: 'دردشة كامب شيزار' },
      { name: 'شات ميامي', description: 'دردشة شاطئ ميامي' },
      { name: 'شات الإبراهيمية', description: 'دردشة الإبراهيمية' },
      { name: 'شات الأزاريطة', description: 'دردشة حي الأزاريطة' }
    ]
  },
  {
    id: 'giza',
    nameAr: 'شات الجيزة',
    nameEn: 'Giza Chat',
    path: '/egypt/giza',
    countryId: 'egypt',
    countryNameAr: 'مصر',
    title: 'شات الجيزة - دردشة الجيزة | تعارف شباب وبنات الجيزة مصر',
    metaDescription: 'شات الجيزة للتعارف والدردشة مع شباب وبنات من محافظة الجيزة مصر. دردشة الجيزة مجانية بدون تسجيل، تعرف على أصدقاء جدد من أرض الأهرام.',
    keywords: ['شات الجيزة', 'دردشة الجيزة', 'تعارف الجيزة', 'بنات الجيزة', 'شباب الجيزة'],
    chatLinks: [
      { name: 'شات الهرم', description: 'دردشة منطقة الهرم' },
      { name: 'شات فيصل', description: 'دردشة شارع فيصل' },
      { name: 'شات الدقي', description: 'دردشة حي الدقي' },
      { name: 'شات المهندسين', description: 'دردشة حي المهندسين' },
      { name: 'شات بولاق الدكرور', description: 'دردشة بولاق الدكرور' },
      { name: 'شات إمبابة', description: 'دردشة حي إمبابة' },
      { name: 'شات الوراق', description: 'دردشة جزيرة الوراق' },
      { name: 'شات أوسيم', description: 'دردشة مدينة أوسيم' }
    ]
  },

  // مدن السعودية
  {
    id: 'riyadh',
    nameAr: 'شات الرياض',
    nameEn: 'Riyadh Chat',
    path: '/saudi/riyadh',
    countryId: 'saudi',
    countryNameAr: 'السعودية',
    title: 'شات الرياض - دردشة الرياض | تعارف شباب وبنات الرياض السعودية',
    metaDescription: 'شات الرياض للتعارف والدردشة مع شباب وبنات من العاصمة الرياض السعودية. دردشة الرياض مجانية بدون تسجيل، تعرف على أصدقاء جدد من جميع أحياء الرياض.',
    keywords: ['شات الرياض', 'دردشة الرياض', 'تعارف الرياض', 'بنات الرياض', 'شباب الرياض', 'شات الرياض السعودية'],
    chatLinks: [
      { name: 'شات العليا', description: 'دردشة حي العليا' },
      { name: 'شات الملز', description: 'دردشة حي الملز' },
      { name: 'شات النخيل', description: 'دردشة حي النخيل' },
      { name: 'شات الورود', description: 'دردشة حي الورود' },
      { name: 'شات الياسمين', description: 'دردشة حي الياسمين' },
      { name: 'شات الملك فهد', description: 'دردشة حي الملك فهد' },
      { name: 'شات السليمانية', description: 'دردشة حي السليمانية' },
      { name: 'شات الشفا', description: 'دردشة حي الشفا' }
    ]
  },
  {
    id: 'jeddah',
    nameAr: 'شات جدة',
    nameEn: 'Jeddah Chat',
    path: '/saudi/jeddah',
    countryId: 'saudi',
    countryNameAr: 'السعودية',
    title: 'شات جدة - دردشة جدة | تعارف شباب وبنات جدة السعودية',
    metaDescription: 'شات جدة للتعارف والدردشة مع شباب وبنات من مدينة جدة السعودية. دردشة جدة مجانية بدون تسجيل، تعرف على أصدقاء جدد من عروس البحر الأحمر.',
    keywords: ['شات جدة', 'دردشة جدة', 'تعارف جدة', 'بنات جدة', 'شباب جدة', 'شات جدة السعودية'],
    chatLinks: [
      { name: 'شات البلد', description: 'دردشة جدة البلد' },
      { name: 'شات الكورنيش', description: 'دردشة كورنيش جدة' },
      { name: 'شات الروضة', description: 'دردشة حي الروضة' },
      { name: 'شات النزلة', description: 'دردشة حي النزلة' },
      { name: 'شات الصفا', description: 'دردشة حي الصفا' },
      { name: 'شات الشاطئ', description: 'دردشة منطقة الشاطئ' },
      { name: 'شات المرجان', description: 'دردشة حي المرجان' },
      { name: 'شات أبحر', description: 'دردشة منطقة أبحر' }
    ]
  },
  {
    id: 'mecca',
    nameAr: 'شات مكة',
    nameEn: 'Mecca Chat',
    path: '/saudi/mecca',
    countryId: 'saudi',
    countryNameAr: 'السعودية',
    title: 'شات مكة المكرمة - دردشة مكة | تعارف شباب وبنات مكة السعودية',
    metaDescription: 'شات مكة المكرمة للتعارف والدردشة مع شباب وبنات من مكة المكرمة السعودية. دردشة مكة مجانية بدون تسجيل، تعرف على أصدقاء جدد من أم القرى.',
    keywords: ['شات مكة', 'دردشة مكة', 'شات مكة المكرمة', 'تعارف مكة', 'بنات مكة', 'شباب مكة'],
    chatLinks: [
      { name: 'شات الحرم المكي', description: 'دردشة منطقة الحرم' },
      { name: 'شات العزيزية', description: 'دردشة حي العزيزية' },
      { name: 'شات المسفلة', description: 'دردشة حي المسفلة' },
      { name: 'شات جرول', description: 'دردشة منطقة جرول' },
      { name: 'شات الكعكية', description: 'دردشة حي الكعكية' },
      { name: 'شات الطندباوي', description: 'دردشة حي الطندباوي' },
      { name: 'شات النوارية', description: 'دردشة حي النوارية' },
      { name: 'شات الششة', description: 'دردشة حي الششة' }
    ]
  },

  // مدن الإمارات
  {
    id: 'dubai',
    nameAr: 'شات دبي',
    nameEn: 'Dubai Chat',
    path: '/uae/dubai',
    countryId: 'uae',
    countryNameAr: 'الإمارات',
    title: 'شات دبي - دردشة دبي | تعارف شباب وبنات دبي الإمارات',
    metaDescription: 'شات دبي للتعارف والدردشة مع شباب وبنات من إمارة دبي. دردشة دبي مجانية بدون تسجيل، تعرف على أصدقاء جدد من مدينة الذهب.',
    keywords: ['شات دبي', 'دردشة دبي', 'تعارف دبي', 'بنات دبي', 'شباب دبي', 'شات دبي الإمارات'],
    chatLinks: [
      { name: 'شات ديرة', description: 'دردشة منطقة ديرة' },
      { name: 'شات بر دبي', description: 'دردشة بر دبي' },
      { name: 'شات الجميرا', description: 'دردشة منطقة الجميرا' },
      { name: 'شات المرينا', description: 'دردشة دبي مارينا' },
      { name: 'شات الإمارات مول', description: 'دردشة منطقة الإمارات مول' },
      { name: 'شات برج خليفة', description: 'دردشة منطقة برج خليفة' },
      { name: 'شات جبل علي', description: 'دردشة منطقة جبل علي' },
      { name: 'شات الساطوة', description: 'دردشة منطقة الساطوة' }
    ]
  },
  {
    id: 'abudhabi',
    nameAr: 'شات أبوظبي',
    nameEn: 'Abu Dhabi Chat',
    path: '/uae/abudhabi',
    countryId: 'uae',
    countryNameAr: 'الإمارات',
    title: 'شات أبوظبي - دردشة أبوظبي | تعارف شباب وبنات أبوظبي الإمارات',
    metaDescription: 'شات أبوظبي للتعارف والدردشة مع شباب وبنات من العاصمة أبوظبي. دردشة أبوظبي مجانية بدون تسجيل، تعرف على أصدقاء جدد من عاصمة الإمارات.',
    keywords: ['شات أبوظبي', 'دردشة أبوظبي', 'تعارف أبوظبي', 'بنات أبوظبي', 'شباب أبوظبي'],
    chatLinks: [
      { name: 'شات الكورنيش', description: 'دردشة كورنيش أبوظبي' },
      { name: 'شات المارينا', description: 'دردشة مارينا أبوظبي' },
      { name: 'شات الخالدية', description: 'دردشة منطقة الخالدية' },
      { name: 'شات الزعفرانة', description: 'دردشة منطقة الزعفرانة' },
      { name: 'شات المصفح', description: 'دردشة منطقة المصفح' },
      { name: 'شات شخبوط', description: 'دردشة مدينة شخبوط' },
      { name: 'شات العين', description: 'دردشة مدينة العين' },
      { name: 'شات الظفرة', description: 'دردشة منطقة الظفرة' }
    ]
  },

  // مدن الكويت
  {
    id: 'kuwait_city',
    nameAr: 'شات مدينة الكويت',
    nameEn: 'Kuwait City Chat',
    path: '/kuwait/kuwait_city',
    countryId: 'kuwait',
    countryNameAr: 'الكويت',
    title: 'شات مدينة الكويت - دردشة الكويت | تعارف شباب وبنات مدينة الكويت',
    metaDescription: 'شات مدينة الكويت للتعارف والدردشة مع شباب وبنات من العاصمة الكويت. دردشة الكويت مجانية بدون تسجيل، تعرف على أصدقاء جدد من جميع مناطق الكويت.',
    keywords: ['شات الكويت', 'دردشة الكويت', 'شات مدينة الكويت', 'تعارف الكويت', 'بنات الكويت'],
    chatLinks: [
      { name: 'شات الشرق', description: 'دردشة منطقة الشرق' },
      { name: 'شات المرقاب', description: 'دردشة منطقة المرقاب' },
      { name: 'شات الصالحية', description: 'دردشة منطقة الصالحية' },
      { name: 'شات دسمان', description: 'دردشة منطقة دسمان' },
      { name: 'شات الفيحاء', description: 'دردشة منطقة الفيحاء' },
      { name: 'شات الدعية', description: 'دردشة منطقة الدعية' },
      { name: 'شات كيفان', description: 'دردشة منطقة كيفان' },
      { name: 'شات الشامية', description: 'دردشة منطقة الشامية' }
    ]
  },

  // المزيد من مدن الأردن
  {
    id: 'salt',
    nameAr: 'شات السلط',
    nameEn: 'Salt Chat',
    path: '/jordan/salt',
    countryId: 'jordan',
    countryNameAr: 'الأردن',
    title: 'شات السلط - دردشة السلط | تعارف شباب وبنات السلط الأردن',
    metaDescription: 'شات السلط للتعارف والدردشة مع شباب وبنات من مدينة السلط الأردن. دردشة السلط مجانية بدون تسجيل.',
    keywords: ['شات السلط', 'دردشة السلط', 'تعارف السلط', 'بنات السلط', 'شباب السلط'],
    chatLinks: [
      { name: 'شات وسط السلط', description: 'دردشة وسط السلط' },
      { name: 'شات الجادة', description: 'دردشة منطقة الجادة' },
      { name: 'شات الأكراد', description: 'دردشة حي الأكراد' },
      { name: 'شات العيزرية', description: 'دردشة العيزرية' },
      { name: 'شات زي', description: 'دردشة منطقة زي' },
      { name: 'شات ماحص', description: 'دردشة ماحص' },
      { name: 'شات الفحيص', description: 'دردشة الفحيص' },
      { name: 'شات يرقا', description: 'دردشة يرقا' }
    ]
  },
  {
    id: 'karak',
    nameAr: 'شات الكرك',
    nameEn: 'Karak Chat',
    path: '/jordan/karak',
    countryId: 'jordan',
    countryNameAr: 'الأردن',
    title: 'شات الكرك - دردشة الكرك | تعارف شباب وبنات الكرك الأردن',
    metaDescription: 'شات الكرك للتعارف والدردشة مع شباب وبنات من محافظة الكرك الأردن. دردشة الكرك مجانية بدون تسجيل.',
    keywords: ['شات الكرك', 'دردشة الكرك', 'تعارف الكرك', 'بنات الكرك', 'شباب الكرك'],
    chatLinks: [
      { name: 'شات الكرك المدينة', description: 'دردشة مدينة الكرك' },
      { name: 'شات المزار الجنوبي', description: 'دردشة المزار الجنوبي' },
      { name: 'شات القصر', description: 'دردشة منطقة القصر' },
      { name: 'شات عي', description: 'دردشة منطقة عي' },
      { name: 'شات الربة', description: 'دردشة الربة' },
      { name: 'شات مؤتة', description: 'دردشة مؤتة' },
      { name: 'شات الثنية', description: 'دردشة الثنية' },
      { name: 'شات فقوع', description: 'دردشة فقوع' }
    ]
  },

  // المزيد من مدن مصر
  {
    id: 'mansoura',
    nameAr: 'شات المنصورة',
    nameEn: 'Mansoura Chat',
    path: '/egypt/mansoura',
    countryId: 'egypt',
    countryNameAr: 'مصر',
    title: 'شات المنصورة - دردشة المنصورة | تعارف شباب وبنات المنصورة مصر',
    metaDescription: 'شات المنصورة للتعارف والدردشة مع شباب وبنات من مدينة المنصورة مصر. دردشة المنصورة مجانية بدون تسجيل.',
    keywords: ['شات المنصورة', 'دردشة المنصورة', 'تعارف المنصورة', 'بنات المنصورة', 'شباب المنصورة'],
    chatLinks: [
      { name: 'شات وسط المنصورة', description: 'دردشة وسط المنصورة' },
      { name: 'شات جامعة المنصورة', description: 'دردشة جامعة المنصورة' },
      { name: 'شات طلخا', description: 'دردشة مدينة طلخا' },
      { name: 'شات ميت غمر', description: 'دردشة ميت غمر' },
      { name: 'شات دكرنس', description: 'دردشة دكرنس' },
      { name: 'شات شربين', description: 'دردشة شربين' },
      { name: 'شات بلقاس', description: 'دردشة بلقاس' },
      { name: 'شات السنبلاوين', description: 'دردشة السنبلاوين' }
    ]
  },
  {
    id: 'aswan',
    nameAr: 'شات أسوان',
    nameEn: 'Aswan Chat',
    path: '/egypt/aswan',
    countryId: 'egypt',
    countryNameAr: 'مصر',
    title: 'شات أسوان - دردشة أسوان | تعارف شباب وبنات أسوان مصر',
    metaDescription: 'شات أسوان للتعارف والدردشة مع شباب وبنات من محافظة أسوان مصر. دردشة أسوان مجانية بدون تسجيل.',
    keywords: ['شات أسوان', 'دردشة أسوان', 'تعارف أسوان', 'بنات أسوان', 'شباب أسوان'],
    chatLinks: [
      { name: 'شات أسوان المدينة', description: 'دردشة مدينة أسوان' },
      { name: 'شات كوم أمبو', description: 'دردشة كوم أمبو' },
      { name: 'شات إدفو', description: 'دردشة إدفو' },
      { name: 'شات دراو', description: 'دردشة دراو' },
      { name: 'شات النوبة', description: 'دردشة النوبة' },
      { name: 'شات أبو سمبل', description: 'دردشة أبو سمبل' },
      { name: 'شات الشلال', description: 'دردشة منطقة الشلال' },
      { name: 'شات فيلة', description: 'دردشة جزيرة فيلة' }
    ]
  },

  // المزيد من مدن السعودية
  {
    id: 'medina',
    nameAr: 'شات المدينة المنورة',
    nameEn: 'Medina Chat',
    path: '/saudi/medina',
    countryId: 'saudi',
    countryNameAr: 'السعودية',
    title: 'شات المدينة المنورة - دردشة المدينة | تعارف شباب وبنات المدينة المنورة السعودية',
    metaDescription: 'شات المدينة المنورة للتعارف والدردشة مع شباب وبنات من المدينة المنورة السعودية. دردشة المدينة مجانية بدون تسجيل.',
    keywords: ['شات المدينة المنورة', 'دردشة المدينة', 'تعارف المدينة المنورة', 'بنات المدينة'],
    chatLinks: [
      { name: 'شات الحرم النبوي', description: 'دردشة منطقة الحرم النبوي' },
      { name: 'شات العوالي', description: 'دردشة حي العوالي' },
      { name: 'شات قباء', description: 'دردشة منطقة قباء' },
      { name: 'شات الحرة الشرقية', description: 'دردشة الحرة الشرقية' },
      { name: 'شات بئر عثمان', description: 'دردشة بئر عثمان' },
      { name: 'شات الجامعات', description: 'دردشة منطقة الجامعات' },
      { name: 'شات ينبع', description: 'دردشة مدينة ينبع' },
      { name: 'شات العلا', description: 'دردشة مدينة العلا' }
    ]
  },
  {
    id: 'dammam',
    nameAr: 'شات الدمام',
    nameEn: 'Dammam Chat',
    path: '/saudi/dammam',
    countryId: 'saudi',
    countryNameAr: 'السعودية',
    title: 'شات الدمام - دردشة الدمام | تعارف شباب وبنات الدمام السعودية',
    metaDescription: 'شات الدمام للتعارف والدردشة مع شباب وبنات من مدينة الدمام السعودية. دردشة الدمام مجانية بدون تسجيل.',
    keywords: ['شات الدمام', 'دردشة الدمام', 'تعارف الدمام', 'بنات الدمام', 'شباب الدمام'],
    chatLinks: [
      { name: 'شات وسط الدمام', description: 'دردشة وسط الدمام' },
      { name: 'شات الخبر', description: 'دردشة مدينة الخبر' },
      { name: 'شات الظهران', description: 'دردشة الظهران' },
      { name: 'شات القطيف', description: 'دردشة القطيف' },
      { name: 'شات سيهات', description: 'دردشة سيهات' },
      { name: 'شات راس تنورة', description: 'دردشة راس تنورة' },
      { name: 'شات الجبيل', description: 'دردشة الجبيل' },
      { name: 'شات الأحساء', description: 'دردشة الأحساء' }
    ]
  },

  // المزيد من مدن الإمارات
  {
    id: 'sharjah',
    nameAr: 'شات الشارقة',
    nameEn: 'Sharjah Chat',
    path: '/uae/sharjah',
    countryId: 'uae',
    countryNameAr: 'الإمارات',
    title: 'شات الشارقة - دردشة الشارقة | تعارف شباب وبنات الشارقة الإمارات',
    metaDescription: 'شات الشارقة للتعارف والدردشة مع شباب وبنات من إمارة الشارقة. دردشة الشارقة مجانية بدون تسجيل.',
    keywords: ['شات الشارقة', 'دردشة الشارقة', 'تعارف الشارقة', 'بنات الشارقة', 'شباب الشارقة'],
    chatLinks: [
      { name: 'شات وسط الشارقة', description: 'دردشة وسط الشارقة' },
      { name: 'شات الخان', description: 'دردشة منطقة الخان' },
      { name: 'شات الحلوان', description: 'دردشة منطقة الحلوان' },
      { name: 'شات الطوار', description: 'دردشة منطقة الطوار' },
      { name: 'شات الرولة', description: 'دردشة منطقة الرولة' },
      { name: 'شات كلباء', description: 'دردشة مدينة كلباء' },
      { name: 'شات خورفكان', description: 'دردشة خورفكان' },
      { name: 'شات دبا الحصن', description: 'دردشة دبا الحصن' }
    ]
  },

  // المزيد من مدن الكويت  
  {
    id: 'jahra',
    nameAr: 'شات الجهراء',
    nameEn: 'Jahra Chat',
    path: '/kuwait/jahra',
    countryId: 'kuwait',
    countryNameAr: 'الكويت',
    title: 'شات الجهراء - دردشة الجهراء | تعارف شباب وبنات الجهراء الكويت',
    metaDescription: 'شات الجهراء للتعارف والدردشة مع شباب وبنات من محافظة الجهراء الكويت. دردشة الجهراء مجانية بدون تسجيل.',
    keywords: ['شات الجهراء', 'دردشة الجهراء', 'تعارف الجهراء', 'بنات الجهراء', 'شباب الجهراء'],
    chatLinks: [
      { name: 'شات الجهراء القديمة', description: 'دردشة الجهراء القديمة' },
      { name: 'شات الواحة', description: 'دردشة منطقة الواحة' },
      { name: 'شات النعيم', description: 'دردشة منطقة النعيم' },
      { name: 'شات تيماء', description: 'دردشة منطقة تيماء' },
      { name: 'شات الصليبية', description: 'دردشة الصليبية' },
      { name: 'شات كاظمة', description: 'دردشة كاظمة' },
      { name: 'شات السالمي', description: 'دردشة السالمي' },
      { name: 'شات العبدلي', description: 'دردشة العبدلي' }
    ]
  },
  {
    id: 'ahmadi',
    nameAr: 'شات الأحمدي',
    nameEn: 'Ahmadi Chat',
    path: '/kuwait/ahmadi',
    countryId: 'kuwait',
    countryNameAr: 'الكويت',
    title: 'شات الأحمدي - دردشة الأحمدي | تعارف شباب وبنات الأحمدي الكويت',
    metaDescription: 'شات الأحمدي للتعارف والدردشة مع شباب وبنات من محافظة الأحمدي الكويت. دردشة الأحمدي مجانية بدون تسجيل.',
    keywords: ['شات الأحمدي', 'دردشة الأحمدي', 'تعارف الأحمدي', 'بنات الأحمدي', 'شباب الأحمدي'],
    chatLinks: [
      { name: 'شات الأحمدي المدينة', description: 'دردشة مدينة الأحمدي' },
      { name: 'شات الفحيحيل', description: 'دردشة الفحيحيل' },
      { name: 'شات المنقف', description: 'دردشة المنقف' },
      { name: 'شات الصباحية', description: 'دردشة الصباحية' },
      { name: 'شات هدية', description: 'دردشة هدية' },
      { name: 'شات الخيران', description: 'دردشة الخيران' },
      { name: 'شات الوفرة', description: 'دردشة الوفرة' },
      { name: 'شات النويصيب', description: 'دردشة النويصيب' }
    ]
  },

  // مدن الجزائر
  {
    id: 'algiers',
    nameAr: 'شات الجزائر العاصمة',
    nameEn: 'Algiers Chat',
    path: '/algeria/algiers',
    countryId: 'algeria',
    countryNameAr: 'الجزائر',
    title: 'شات الجزائر العاصمة - دردشة الجزائر | تعارف شباب وبنات الجزائر العاصمة',
    metaDescription: 'شات الجزائر العاصمة للتعارف والدردشة مع شباب وبنات من الجزائر العاصمة. دردشة الجزائر مجانية بدون تسجيل.',
    keywords: ['شات الجزائر العاصمة', 'دردشة الجزائر', 'تعارف الجزائر', 'بنات الجزائر', 'شباب الجزائر'],
    chatLinks: [
      { name: 'شات باب الوادي', description: 'دردشة باب الوادي' },
      { name: 'شات الحراش', description: 'دردشة الحراش' },
      { name: 'شات حيدرة', description: 'دردشة حيدرة' },
      { name: 'شات بئر مراد رايس', description: 'دردشة بئر مراد رايس' },
      { name: 'شات بن عكنون', description: 'دردشة بن عكنون' },
      { name: 'شات الجزائر الوسطى', description: 'دردشة الجزائر الوسطى' },
      { name: 'شات حسين داي', description: 'دردشة حسين داي' },
      { name: 'شات بوزريعة', description: 'دردشة بوزريعة' }
    ]
  },
  {
    id: 'oran',
    nameAr: 'شات وهران',
    nameEn: 'Oran Chat',
    path: '/algeria/oran',
    countryId: 'algeria',
    countryNameAr: 'الجزائر',
    title: 'شات وهران - دردشة وهران | تعارف شباب وبنات وهران الجزائر',
    metaDescription: 'شات وهران للتعارف والدردشة مع شباب وبنات من مدينة وهران الجزائر. دردشة وهران مجانية بدون تسجيل.',
    keywords: ['شات وهران', 'دردشة وهران', 'تعارف وهران', 'بنات وهران', 'شباب وهران'],
    chatLinks: [
      { name: 'شات وهران المدينة', description: 'دردشة مدينة وهران' },
      { name: 'شات بئر الجير', description: 'دردشة بئر الجير' },
      { name: 'شات السانيا', description: 'دردشة السانيا' },
      { name: 'شات سيدي الشحمي', description: 'دردشة سيدي الشحمي' },
      { name: 'شات حاسي بونيف', description: 'دردشة حاسي بونيف' },
      { name: 'شات عين الترك', description: 'دردشة عين الترك' },
      { name: 'شات بوتليليس', description: 'دردشة بوتليليس' },
      { name: 'شات مرسى الحجاج', description: 'دردشة مرسى الحجاج' }
    ]
  },

  // مدن البحرين
  {
    id: 'manama',
    nameAr: 'شات المنامة',
    nameEn: 'Manama Chat',
    path: '/bahrain/manama',
    countryId: 'bahrain',
    countryNameAr: 'البحرين',
    title: 'شات المنامة - دردشة المنامة | تعارف شباب وبنات المنامة البحرين',
    metaDescription: 'شات المنامة للتعارف والدردشة مع شباب وبنات من العاصمة المنامة البحرين. دردشة المنامة مجانية بدون تسجيل.',
    keywords: ['شات المنامة', 'دردشة المنامة', 'تعارف المنامة', 'بنات المنامة', 'شباب المنامة'],
    chatLinks: [
      { name: 'شات المنامة القديمة', description: 'دردشة المنامة القديمة' },
      { name: 'شات الدبلوماسية', description: 'دردشة المنطقة الدبلوماسية' },
      { name: 'شات الجفير', description: 'دردشة الجفير' },
      { name: 'شات الحورة', description: 'دردشة الحورة' },
      { name: 'شات النعيم', description: 'دردشة النعيم' },
      { name: 'شات الزنج', description: 'دردشة الزنج' },
      { name: 'شات الحد', description: 'دردشة الحد' },
      { name: 'شات عراد', description: 'دردشة عراد' }
    ]
  },
  {
    id: 'muharraq',
    nameAr: 'شات المحرق',
    nameEn: 'Muharraq Chat',
    path: '/bahrain/muharraq',
    countryId: 'bahrain',
    countryNameAr: 'البحرين',
    title: 'شات المحرق - دردشة المحرق | تعارف شباب وبنات المحرق البحرين',
    metaDescription: 'شات المحرق للتعارف والدردشة مع شباب وبنات من مدينة المحرق البحرين. دردشة المحرق مجانية بدون تسجيل.',
    keywords: ['شات المحرق', 'دردشة المحرق', 'تعارف المحرق', 'بنات المحرق', 'شباب المحرق'],
    chatLinks: [
      { name: 'شات المحرق القديمة', description: 'دردشة المحرق القديمة' },
      { name: 'شات الحالة', description: 'دردشة الحالة' },
      { name: 'شات البسيتين', description: 'دردشة البسيتين' },
      { name: 'شات قلالي', description: 'دردشة قلالي' },
      { name: 'شات السهلة', description: 'دردشة السهلة' },
      { name: 'شات الدير', description: 'دردشة الدير' },
      { name: 'شات عالي', description: 'دردشة عالي' },
      { name: 'شات سماهيج', description: 'دردشة سماهيج' }
    ]
  },

  // مدن المغرب
  {
    id: 'rabat',
    nameAr: 'شات الرباط',
    nameEn: 'Rabat Chat',
    path: '/morocco/rabat',
    countryId: 'morocco',
    countryNameAr: 'المغرب',
    title: 'شات الرباط - دردشة الرباط | تعارف شباب وبنات الرباط المغرب',
    metaDescription: 'شات الرباط للتعارف والدردشة مع شباب وبنات من العاصمة الرباط المغرب. دردشة الرباط مجانية بدون تسجيل، تعرف على أصدقاء جدد من عاصمة المغرب.',
    keywords: ['شات الرباط', 'دردشة الرباط', 'تعارف الرباط', 'بنات الرباط', 'شباب الرباط'],
    chatLinks: [
      { name: 'شات أكدال', description: 'دردشة حي أكدال' },
      { name: 'شات حسان', description: 'دردشة منطقة حسان' },
      { name: 'شات يعقوب المنصور', description: 'دردشة يعقوب المنصور' },
      { name: 'شات الرياض', description: 'دردشة حي الرياض' },
      { name: 'شات السويسي', description: 'دردشة حي السويسي' },
      { name: 'شات تقدوم', description: 'دردشة حي تقدوم' },
      { name: 'شات المحيط', description: 'دردشة حي المحيط' },
      { name: 'شات سلا', description: 'دردشة مدينة سلا' }
    ]
  },
  {
    id: 'casablanca',
    nameAr: 'شات الدار البيضاء',
    nameEn: 'Casablanca Chat',
    path: '/morocco/casablanca',
    countryId: 'morocco',
    countryNameAr: 'المغرب',
    title: 'شات الدار البيضاء - دردشة الدار البيضاء | تعارف شباب وبنات الدار البيضاء المغرب',
    metaDescription: 'شات الدار البيضاء للتعارف والدردشة مع شباب وبنات من الدار البيضاء المغرب. دردشة الدار البيضاء مجانية بدون تسجيل، تعرف على أصدقاء جدد من العاصمة الاقتصادية.',
    keywords: ['شات الدار البيضاء', 'دردشة الدار البيضاء', 'تعارف الدار البيضاء', 'بنات الدار البيضاء'],
    chatLinks: [
      { name: 'شات عين الذئاب', description: 'دردشة عين الذئاب' },
      { name: 'شات المعاريف', description: 'دردشة حي المعاريف' },
      { name: 'شات الحي المحمدي', description: 'دردشة الحي المحمدي' },
      { name: 'شات سيدي مومن', description: 'دردشة سيدي مومن' },
      { name: 'شات البرنوصي', description: 'دردشة حي البرنوصي' },
      { name: 'شات عين السبع', description: 'دردشة عين السبع' },
      { name: 'شات سيدي عثمان', description: 'دردشة سيدي عثمان' },
      { name: 'شات الفداء', description: 'دردشة حي الفداء' }
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

// دالة للحصول على جميع المدن لبلد معين
export function getCitiesByCountry(countryId: string): CityChat[] {
  return cityChats.filter(city => city.countryId === countryId);
}

// دالة لتحديث بيانات البلدان لتشمل روابط المدن
export function updateCountryWithCityLinks(countryId: string) {
  const cities = getCitiesByCountry(countryId);
  return cities.map(city => ({
    name: city.nameAr,
    path: city.path,
    description: `دردشة ${city.nameAr.replace('شات ', '')}`
  }));
}
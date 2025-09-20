// دالة لتحويل اسم المدينة إلى رابط
export function getCityLinkFromName(cityName: string, countryPath: string): string | null {
  // إزالة "شات" من بداية الاسم
  const cleanName = cityName.replace(/^شات\s*/, '');
  
  // تحويل الاسم إلى رابط
  const cityMap: { [key: string]: string } = {
    // عمان
    'مسقط': 'muscat',
    'صلالة': 'salalah', 
    'نزوى': 'nizwa',
    'صحار': 'sohar',
    
    // مصر
    'القاهرة': 'cairo',
    'الإسكندرية': 'alexandria',
    'الجيزة': 'giza',
    
    // السعودية
    'الرياض': 'riyadh',
    'جدة': 'jeddah',
    'مكة': 'makkah',
    'المدينة': 'medina',
    'الدمام': 'dammam',
    
    // الإمارات
    'دبي': 'dubai',
    'أبوظبي': 'abudhabi',
    'الشارقة': 'sharjah',
    
    // الأردن
    'عمان': 'amman',
    'الزرقاء': 'zarqa',
    'إربد': 'irbid',
    
    // فلسطين
    'القدس': 'jerusalem',
    'غزة': 'gaza',
    'رام الله': 'ramallah',
    
    // روابط فرعية إضافية
    'امامير جوال': 'mobile',
    'شات الصبايا': 'sabaya-chat',
    'دردشة راقية': 'elegant-chat',
    'دردشتي العام': 'general-chat',
    'أصدقاء دردشتي': 'friends-chat',
    'مزز العام': 'mezz-general',
    'مزز جوال': 'mezz-mobile',
    'شات مباشر': 'live-chat',
    'شات فوري': 'instant-chat',
    'لمة الأصدقاء': 'friends-gathering',
    'لمة عربية': 'arabic-gathering',
    'شات الحلوين': 'beautiful-chat',
    'أحلى دردشة': 'sweetest-chat',
    'دردشة سريعة': 'quick-chat',
    'دخول فوري': 'instant-entry',
    
    // روابط عمان الإضافية
    'عماني جوال': 'oman-mobile',
    'الباطنة': 'batinah',
    'ظفار': 'dhofar',
    'العرب عمان': 'arab-oman',
    
    // روابط مصر الإضافية
    'مصري جوال': 'egypt-mobile',
    'الأكابر': 'elders',
    'الصعيد': 'upper-egypt',
    'الدلتا': 'delta',
    'أحلا لمة': 'best-gathering',
    
    // روابط السعودية الإضافية
    'سعودي جوال': 'saudi-mobile',
    'الرواد': 'pioneers',
    'نجد': 'najd',
    
    // روابط الجزائر الإضافية
    'جزائري جوال': 'algeria-mobile',
    'القبائل': 'kabylie',
    'الصحراء': 'sahara',
    'بلاد المليون شهيد': 'million-martyrs',
    
    // روابط البحرين الإضافية
    'بحريني جوال': 'bahrain-mobile',
    'سترة': 'sitrah',
    'عيسى': 'isa',
    'اللؤلؤة': 'pearl',
    
    // روابط الإمارات الإضافية
    'إماراتي جوال': 'uae-mobile',
    'عجمان': 'ajman',
    'العين': 'al-ain',
    'رأس الخيمة': 'ras-al-khaimah',
    'الفجيرة': 'fujairah',
    
    // روابط الأردن الإضافية
    'أردني جوال': 'jordan-mobile',
    'العقبة': 'aqaba',
    'السلط': 'salt',
    'الكرك': 'karak',
    'البتراء': 'petra',
    
    // روابط الكويت الإضافية
    'كويتي جوال': 'kuwait-mobile',
    'الفروانية': 'farwaniyah',
    'حولي': 'hawalli',
    'مبارك الكبير': 'mubarak-al-kabeer',
    'الديوانية': 'diwaniyah',
    
    // روابط ليبيا الإضافية
    'ليبي جوال': 'libya-mobile',
    'البيضاء': 'bayda',
    'الزاوية': 'zawiya',
    'سبها': 'sabha',
    'أجدابيا': 'ajdabiya',
    
    // روابط تونس الإضافية
    'تونسي جوال': 'tunisia-mobile',
    'المنستير': 'monastir',
    'بنزرت': 'bizerte',
    'قابس': 'gabes',
    'القيروان': 'kairouan',
    
    // روابط المغرب الإضافية
    'مغربي جوال': 'morocco-mobile',
    'فاس': 'fes',
    'طنجة': 'tangier',
    'أغادير': 'agadir',
    'مكناس': 'meknes',
    
    // روابط السودان الإضافية
    'سوداني جوال': 'sudan-mobile',
    'الجزيرة': 'gezira',
    'دارفور': 'darfur',
    'النيل الأزرق': 'blue-nile',
    
    // روابط فلسطين الإضافية
    'فلسطيني جوال': 'palestine-mobile',
    'نابلس': 'nablus',
    'الخليل': 'hebron',
    'بيت لحم': 'bethlehem',
    'جنين': 'jenin',
    
    // روابط قطر الإضافية
    'قطري جوال': 'qatar-mobile',
    'الخور': 'al-khor',
    'أم صلال': 'umm-salal',
    'لوسيل': 'lusail',
    'الشمال': 'al-shamal',
    
    // روابط اليمن الإضافية
    'يمني جوال': 'yemen-mobile',
    'الحديدة': 'hodeidah',
    'إب': 'ibb',
    'حضرموت': 'hadramaut',
    'المكلا': 'mukalla',
    
    // روابط لبنان الإضافية
    'لبناني جوال': 'lebanon-mobile',
    'صور': 'tyre',
    'زحلة': 'zahle',
    'جبيل': 'byblos',
    'بعلبك': 'baalbek',
    
    // روابط سوريا الإضافية
    'سوري جوال': 'syria-mobile',
    'اللاذقية': 'latakia',
    'حماة': 'hama',
    'طرطوس': 'tartus',
    'دير الزور': 'deir-ez-zor',
    
    // روابط العراق الإضافية
    'عراقي جوال': 'iraq-mobile',
    'أربيل': 'erbil',
    'النجف': 'najaf',
    'كربلاء': 'karbala',
    'السليمانية': 'sulaymaniyah',
    
    // روابط جزر القمر الإضافية
    'قمري جوال': 'comoros-mobile',
    'أنجوان': 'anjouan',
    'موهيلي': 'mohéli',
    'القمر الكبرى': 'grande-comore',
    'مايوت': 'mayotte',
    'دوموني': 'domoni',
    'فومبوني': 'fomboni',
    
    // روابط جيبوتي الإضافية
    'جيبوتي جوال': 'djibouti-mobile',
    'علي صبيح': 'ali-sabieh',
    'تاجورة': 'tadjoura',
    'أوبوك': 'obock',
    'دخيل': 'dikhil',
    'أرتا': 'arta',
    'القرن الأفريقي': 'horn-of-africa'
  };
  
  const citySlug = cityMap[cleanName];
  if (citySlug) {
    return `${countryPath}/${citySlug}`;
  }
  
  return null;
}
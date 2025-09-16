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
    'رام الله': 'ramallah'
  };
  
  const citySlug = cityMap[cleanName];
  if (citySlug) {
    return `${countryPath}/${citySlug}`;
  }
  
  return null;
}
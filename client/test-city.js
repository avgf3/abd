// اختبار دالة getCityByPath
const cityChats = [
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
  }
];

function getCityByPath(path) {
  return cityChats.find(city => city.path === path);
}

console.log('Testing /libya/bayda:', getCityByPath('/libya/bayda'));
console.log('Testing /libya/nonexistent:', getCityByPath('/libya/nonexistent'));
console.log('Available paths:', cityChats.map(c => c.path));
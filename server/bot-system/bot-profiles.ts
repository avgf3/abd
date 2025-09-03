import { BotProfile } from './types.js';
import crypto from 'crypto';

// قوائم البيانات الواقعية
const firstNames = [
  'محمد', 'أحمد', 'عبدالله', 'عبدالرحمن', 'سعود', 'فهد', 'خالد', 'سالم', 'ناصر', 'تركي',
  'يوسف', 'إبراهيم', 'عمر', 'علي', 'حسن', 'حسين', 'زياد', 'ماجد', 'وليد', 'طارق',
  'نورة', 'سارة', 'فاطمة', 'عائشة', 'مريم', 'هند', 'لمى', 'دانة', 'رغد', 'شهد',
  'منى', 'هدى', 'أمل', 'ريم', 'نوف', 'غادة', 'سلمى', 'ليلى', 'جواهر', 'بشاير'
];

const lastNames = [
  'العتيبي', 'الحربي', 'الدوسري', 'القحطاني', 'الشمري', 'المطيري', 'الغامدي', 'الزهراني',
  'السبيعي', 'العنزي', 'الخالدي', 'المالكي', 'الأحمدي', 'الجهني', 'الثقفي', 'الحارثي',
  'العمري', 'الشهري', 'النجدي', 'القرني'
];

const userAgents = [
  // Desktop browsers
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.1.2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  
  // Mobile browsers
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.43 Mobile Safari/537.36',
  'Mozilla/5.0 (iPad; CPU OS 17_1_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
];

const ipRanges = [
  { start: '86.51.0.0', end: '86.51.255.255' },     // السعودية
  { start: '188.48.0.0', end: '188.48.255.255' },   // السعودية
  { start: '212.12.0.0', end: '212.12.255.255' },   // السعودية
  { start: '46.151.208.0', end: '46.151.223.255' }, // السعودية
  { start: '5.62.60.0', end: '5.62.63.255' },       // الإمارات
  { start: '185.56.88.0', end: '185.56.91.255' },   // الكويت
  { start: '37.98.224.0', end: '37.98.231.255' },   // قطر
  { start: '5.32.0.0', end: '5.39.255.255' },       // البحرين
];

const profilePictures = {
  male: [
    'avatar-male-1.jpg', 'avatar-male-2.jpg', 'avatar-male-3.jpg', 
    'avatar-male-4.jpg', 'avatar-male-5.jpg', 'avatar-male-6.jpg',
    'avatar-male-7.jpg', 'avatar-male-8.jpg', 'avatar-male-9.jpg',
    'avatar-male-10.jpg'
  ],
  female: [
    'avatar-female-1.jpg', 'avatar-female-2.jpg', 'avatar-female-3.jpg',
    'avatar-female-4.jpg', 'avatar-female-5.jpg', 'avatar-female-6.jpg',
    'avatar-female-7.jpg', 'avatar-female-8.jpg', 'avatar-female-9.jpg',
    'avatar-female-10.jpg'
  ]
};

export async function generateBotProfile(isOwner: boolean): Promise<BotProfile> {
  const gender = Math.random() > 0.5 ? 'male' : 'female';
  const firstName = selectFromGenderList(firstNames, gender);
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const username = generateUsername(firstName, lastName);
  
  const profile: BotProfile = {
    id: crypto.randomUUID(),
    username,
    displayName: `${firstName} ${lastName}`,
    email: `${username}@example.com`,
    gender,
    age: 18 + Math.floor(Math.random() * 40), // 18-57
    location: generateLocation(),
    bio: generateBio(firstName, gender),
    avatar: generateAvatar(gender),
    joinDate: generateJoinDate(),
    lastSeen: new Date(),
    isOwner,
    deviceId: generateDeviceId(),
    ipAddress: generateIpAddress(),
    userAgent: userAgents[Math.floor(Math.random() * userAgents.length)],
    browserFingerprint: generateBrowserFingerprint(),
    timezone: generateTimezone(),
    language: 'ar-SA',
    connectionInfo: {
      pingLatency: 20 + Math.floor(Math.random() * 80), // 20-100ms
      connectionQuality: Math.random() > 0.2 ? 'good' : 'moderate',
      networkType: Math.random() > 0.4 ? 'wifi' : '4g'
    }
  };

  return profile;
}

function selectFromGenderList(names: string[], gender: string): string {
  // الأسماء من 0-19 للذكور، 20-39 للإناث
  const isMale = gender === 'male';
  const startIndex = isMale ? 0 : 20;
  const endIndex = isMale ? 20 : 40;
  const genderNames = names.slice(startIndex, endIndex);
  return genderNames[Math.floor(Math.random() * genderNames.length)];
}

function generateUsername(firstName: string, lastName: string): string {
  const strategies = [
    () => `${firstName}_${lastName}`.toLowerCase(),
    () => `${firstName}${Math.floor(Math.random() * 1000)}`,
    () => `${firstName[0]}${lastName}${Math.floor(Math.random() * 100)}`.toLowerCase(),
    () => `${firstName}.${lastName.substring(0, 3)}`.toLowerCase(),
    () => `${firstName}_${new Date().getFullYear() - 20 - Math.floor(Math.random() * 20)}`
  ];

  const strategy = strategies[Math.floor(Math.random() * strategies.length)];
  return strategy().replace(/\s/g, '');
}

function generateLocation(): string {
  const cities = [
    'الرياض', 'جدة', 'مكة المكرمة', 'المدينة المنورة', 'الدمام', 'الخبر',
    'الطائف', 'تبوك', 'بريدة', 'خميس مشيط', 'الأحساء', 'حائل',
    'دبي', 'أبوظبي', 'الشارقة', 'الكويت', 'المنامة', 'الدوحة', 'مسقط'
  ];
  
  return cities[Math.floor(Math.random() * cities.length)];
}

function generateBio(name: string, gender: string): string {
  const templates = [
    `${name} من عشاق ${getRandomHobby()}`,
    `محب لـ ${getRandomHobby()} و ${getRandomHobby()}`,
    `${getRandomProfession()} | ${getRandomHobby()}`,
    `"${getRandomQuote()}"`,
    `${getRandomEmoji()} ${getRandomHobby()} ${getRandomEmoji()}`,
    `${name} | ${getRandomAge()} | ${getRandomHobby()}`
  ];

  return templates[Math.floor(Math.random() * templates.length)];
}

function getRandomHobby(): string {
  const hobbies = [
    'القراءة', 'السفر', 'الرياضة', 'الطبخ', 'التصوير', 'الموسيقى',
    'الألعاب', 'البرمجة', 'الرسم', 'الكتابة', 'مشاهدة الأفلام',
    'كرة القدم', 'السباحة', 'ركوب الخيل', 'التسوق', 'القهوة'
  ];
  return hobbies[Math.floor(Math.random() * hobbies.length)];
}

function getRandomProfession(): string {
  const professions = [
    'طالب', 'مهندس', 'طبيب', 'معلم', 'مصمم', 'مبرمج',
    'محاسب', 'رائد أعمال', 'كاتب', 'صحفي', 'محامي', 'مدير'
  ];
  return professions[Math.floor(Math.random() * professions.length)];
}

function getRandomQuote(): string {
  const quotes = [
    'كن التغيير الذي تريد أن تراه في العالم',
    'الحياة أقصر من أن نضيعها في الندم',
    'النجاح رحلة وليس وجهة',
    'كل يوم هو فرصة جديدة',
    'الأحلام لا تعمل إلا إذا عملت أنت'
  ];
  return quotes[Math.floor(Math.random() * quotes.length)];
}

function getRandomEmoji(): string {
  const emojis = ['✨', '🌟', '💫', '🎯', '🚀', '💪', '❤️', '🌹', '☕', '📚'];
  return emojis[Math.floor(Math.random() * emojis.length)];
}

function getRandomAge(): string {
  const age = 18 + Math.floor(Math.random() * 30);
  return `${age} سنة`;
}

function generateAvatar(gender: string): string {
  const avatars = gender === 'male' ? profilePictures.male : profilePictures.female;
  return `/avatars/${avatars[Math.floor(Math.random() * avatars.length)]}`;
}

function generateJoinDate(): Date {
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * 365 * 2); // آخر سنتين
  const joinDate = new Date(now);
  joinDate.setDate(joinDate.getDate() - daysAgo);
  return joinDate;
}

function generateDeviceId(): string {
  // محاكاة device ID واقعي
  const segments = [];
  for (let i = 0; i < 4; i++) {
    segments.push(Math.random().toString(36).substring(2, 10));
  }
  return segments.join('-');
}

function generateIpAddress(): string {
  const range = ipRanges[Math.floor(Math.random() * ipRanges.length)];
  const startParts = range.start.split('.').map(Number);
  const endParts = range.end.split('.').map(Number);
  
  const ip = startParts.map((start, i) => {
    const end = endParts[i];
    return start + Math.floor(Math.random() * (end - start + 1));
  });
  
  return ip.join('.');
}

function generateBrowserFingerprint(): string {
  const canvas = crypto.randomBytes(16).toString('hex');
  const webgl = crypto.randomBytes(16).toString('hex');
  const audio = crypto.randomBytes(8).toString('hex');
  
  return crypto
    .createHash('sha256')
    .update(`${canvas}-${webgl}-${audio}`)
    .digest('hex')
    .substring(0, 32);
}

function generateTimezone(): string {
  const timezones = [
    'Asia/Riyadh',    // السعودية
    'Asia/Dubai',     // الإمارات
    'Asia/Kuwait',    // الكويت
    'Asia/Qatar',     // قطر
    'Asia/Bahrain',   // البحرين
    'Asia/Muscat',    // عمان
    'Asia/Baghdad',   // العراق
    'Asia/Amman',     // الأردن
    'Africa/Cairo'    // مصر
  ];
  
  return timezones[Math.floor(Math.random() * timezones.length)];
}
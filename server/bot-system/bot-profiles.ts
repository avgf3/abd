import crypto from 'crypto';
import { BotProfile } from './types';
import { BotSecurityFeatures } from './security-features';

const maleNames = [
  'محمد', 'أحمد', 'علي', 'عبدالله', 'سعود', 'سلمان', 'ناصر', 'خالد', 'بدر', 'يوسف',
  'فيصل', 'ماجد', 'طلال', 'سيف', 'طارق', 'عماد', 'راشد', 'عبدالعزيز', 'فهد', 'حمد'
];
const femaleNames = [
  'نورة', 'فاطمة', 'سارة', 'ريم', 'نجلاء', 'منى', 'ليان', 'نجلاء', 'جود', 'جمانة',
  'هند', 'مريم', 'أفنان', 'جود', 'نجلاء', 'العنود', 'شذى', 'لولو', 'مشاعل', 'تهاني'
];

const lastNames = [
  'العتيبي', 'القحطاني', 'الزهراني', 'الحربي', 'الشهري', 'الغامدي', 'الأنصاري', 'الدوسري',
  'المطيري', 'الخثعمي', 'الهاجري', 'العنزي', 'العوفي', 'الشهراني', 'اليامي', 'التميمي'
];

const locations = ['الرياض', 'جدة', 'مكة', 'الدمام', 'المدينة', 'القصيم', 'أبها', 'جازان', 'دبي', 'الكويت', 'الدوحة', 'مسقط', 'القاهرة'];

function randomChoice<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateUsername(displayName: string): string {
  // Ensure username length complies with server limit (<= 14 chars)
  // Reserve 1 for '_' and 3 for numeric suffix => base max 10
  const suffixNum = Math.floor(100 + Math.random() * 900);
  const maxBaseLength = 14 - 1 - String(suffixNum).length; // typically 10
  const baseRaw = displayName
    .replace(/\s+/g, '')
    .replace(/[^\u0600-\u06FFa-zA-Z0-9_]/g, '');
  const base = (baseRaw || 'user').slice(0, Math.max(1, maxBaseLength));
  return `${base}_${suffixNum}`;
}

function generateEmail(username: string): string {
  const domains = ['example.com', 'mail.com', 'post.com'];
  return `${username.toLowerCase()}@${randomChoice(domains)}`;
}

function generateAvatar(name: string): string {
  const initials = encodeURIComponent(name.slice(0, 2));
  return `/default_avatar.svg?i=${initials}`;
}

function generateBio(interests: string[]): string {
  const templates = [
    'أحب {i1} و {i2} وأستمتع بالنقاش الهادئ',
    'مهتم بـ {i1} وأتابع أخبار {i2}',
    'وقتي غالباً مع {i1} وأحياناً {i2}',
    'أحب التعارف والنقاش حول {i1} و {i2}',
  ];
  const i1 = interests[0] || 'الأفلام';
  const i2 = interests[1] || 'الرياضة';
  const t = randomChoice(templates);
  return t.replace('{i1}', i1).replace('{i2}', i2);
}

function generateUserAgent(): string {
  const browsers = [
    ['Chrome', ['120.0.0.0', '121.0.0.0', '122.0.0.0']],
    ['Firefox', ['120.0', '121.0', '122.0']],
    ['Safari', ['17.0', '17.1', '17.2']],
    ['Edge', ['120.0.0.0', '121.0.0.0']]
  ] as const;
  const oses = [
    ['Windows NT 10.0; Win64; x64', 'Windows'],
    ['X11; Linux x86_64', 'Linux'],
    ['Macintosh; Intel Mac OS X 14_1_2', 'Mac'],
    ['Android 14; Mobile', 'Android'],
    ['iPhone; CPU iPhone OS 17_2 like Mac OS X', 'iOS']
  ] as const;
  const [browser, versions] = randomChoice(browsers);
  const [osString] = randomChoice(oses);
  const version = randomChoice(versions);
  if (browser === 'Chrome' || browser === 'Edge') {
    return `Mozilla/5.0 (${osString}) AppleWebKit/537.36 (KHTML, like Gecko) ${browser}/${version} Safari/537.36`;
  }
  if (browser === 'Firefox') {
    return `Mozilla/5.0 (${osString}; rv:${version}) Gecko/20100101 Firefox/${version}`;
  }
  return `Mozilla/5.0 (${osString}) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${version} Safari/605.1.15`;
}

export async function generateBotProfile(isOwner: boolean): Promise<BotProfile> {
  const gender = Math.random() < 0.5 ? 'male' : 'female';
  const first = gender === 'male' ? randomChoice(maleNames) : randomChoice(femaleNames);
  const last = randomChoice(lastNames);
  const displayName = `${first} ${last}`;
  const username = generateUsername(displayName.replace(/\s+/g, '_'));

  const connectionData = BotSecurityFeatures.generateRealisticConnectionData();
  const userAgent = generateUserAgent();
  const deviceId = crypto.randomUUID();
  const browserFingerprint = BotSecurityFeatures.generateDeviceFingerprint({
    userAgent,
    screen: connectionData.screen,
    timezone: connectionData.timezone,
    language: connectionData.language,
    plugins: connectionData.plugins,
  });

  const joinDate = new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 3600 * 1000));
  const lastSeen = new Date();
  const age = 18 + Math.floor(Math.random() * 20);
  const location = randomChoice(locations);

  const interestsPool = [
    'الرياضة', 'الألعاب', 'الأفلام', 'الموسيقى', 'التقنية',
    'السفر', 'الطبخ', 'القراءة', 'الفن', 'التصوير',
  ];
  const interests: string[] = [];
  while (interests.length < 3) {
    const pick = randomChoice(interestsPool);
    if (!interests.includes(pick)) interests.push(pick);
  }

  const profile: BotProfile = {
    id: crypto.randomUUID(),
    username,
    displayName,
    email: generateEmail(username),
    gender,
    age,
    location,
    bio: generateBio(interests),
    avatar: generateAvatar(displayName),
    joinDate,
    lastSeen,
    isOwner,
    deviceId,
    ipAddress: '0.0.0.0',
    userAgent,
    browserFingerprint,
    timezone: connectionData.timezone,
    language: connectionData.language,
    connectionInfo: {
      pingLatency: BotSecurityFeatures.getRealisticNetworkDelay(location),
      connectionQuality: 'good',
      networkType: Math.random() < 0.7 ? 'wifi' : '4g',
    },
    interests,
  };

  return profile;
}
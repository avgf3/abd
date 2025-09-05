// Country utilities: normalize input to ISO-2 and build SVG URLs

export type Iso2 = string;

// Minimal Arabic + English name map to ISO-2
const NAME_TO_ISO2: Record<string, Iso2> = {
  // Arabic
  'السعودية': 'SA', 'المملكة العربية السعودية': 'SA',
  'الإمارات': 'AE', 'الإمارات العربية المتحدة': 'AE',
  'الكويت': 'KW', 'قطر': 'QA', 'البحرين': 'BH', 'عمان': 'OM', 'اليمن': 'YE',
  'مصر': 'EG', 'السودان': 'SD',
  'العراق': 'IQ', 'سوريا': 'SY', 'لبنان': 'LB', 'الأردن': 'JO', 'فلسطين': 'PS',
  'المغرب': 'MA', 'الجزائر': 'DZ', 'تونس': 'TN', 'ليبيا': 'LY',
  'موريتانيا': 'MR', 'الصومال': 'SO', 'جيبوتي': 'DJ', 'جزر القمر': 'KM',
  // Common English
  'saudi': 'SA', 'saudi arabia': 'SA',
  'uae': 'AE', 'united arab emirates': 'AE',
  'kuwait': 'KW', 'qatar': 'QA', 'bahrain': 'BH', 'oman': 'OM', 'yemen': 'YE',
  'egypt': 'EG', 'sudan': 'SD',
  'iraq': 'IQ', 'syria': 'SY', 'lebanon': 'LB', 'jordan': 'JO', 'palestine': 'PS',
  'morocco': 'MA', 'algeria': 'DZ', 'tunisia': 'TN', 'libya': 'LY',
  'mauritania': 'MR', 'somalia': 'SO', 'djibouti': 'DJ', 'comoros': 'KM'
};

export function extractIso2FromEmojiFlag(input: string): Iso2 | null {
  const chars = Array.from(input.trim());
  if (chars.length < 2) return null;
  const cp0 = chars[0].codePointAt(0) || 0;
  const cp1 = chars[1].codePointAt(0) || 0;
  const isRegional = (cp: number) => cp >= 0x1f1e6 && cp <= 0x1f1ff;
  if (!isRegional(cp0) || !isRegional(cp1)) return null;
  const a = String.fromCharCode((cp0 - 0x1f1e6) + 65);
  const b = String.fromCharCode((cp1 - 0x1f1e6) + 65);
  return (a + b).toUpperCase();
}

export function getIso2FromCountry(country?: string): Iso2 | null {
  if (!country) return null;
  const text = country.trim();
  if (!text) return null;

  // 1) Emoji flag at the start
  const fromEmoji = extractIso2FromEmojiFlag(text);
  if (fromEmoji) return fromEmoji;

  // 2) Raw ISO-2 code
  const letters = text.replace(/[^A-Za-z]/g, '').toUpperCase();
  if (letters.length === 2) return letters;

  // 3) Name mapping (ar/en), also try after removing a leading emoji and space
  const normalized = text.toLowerCase();
  const withoutEmojiPrefix = normalized.replace(/^\p{Emoji}+\s*/u, '').trim();

  return (
    NAME_TO_ISO2[normalized] ||
    NAME_TO_ISO2[withoutEmojiPrefix] ||
    NAME_TO_ISO2[text] ||
    null
  );
}

export function getFlagSvgUrl(iso2: Iso2, style: '3x2' | '1x1' = '3x2'): string {
  const code = iso2.toUpperCase();
  // CDN with full set of SVG flags
  return `https://cdn.jsdelivr.net/npm/country-flag-icons/${style}/${code}.svg`;
}


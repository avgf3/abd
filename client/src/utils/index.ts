// دالة موحدة لإرجاع علم الدولة (إيموجي) من مدخل دولة قد يكون:
// - إيموجي علم جاهز
// - اسم دولة بالعربية/الإنجليزية، أو بصيغة "🇸🇦 السعودية"
// - كود ISO-2 مثل SA / US
export const getCountryFlag = (country?: string): string | null => {
  if (!country) return null;
  const text = country.trim();
  if (!text) return null;

  // 1) إذا المستخدم أدخل إيموجي علم مباشرة في بداية النص
  const chars = Array.from(text);
  const isRegionalIndicator = (cp: number) => cp >= 0x1f1e6 && cp <= 0x1f1ff;
  if (chars.length >= 2) {
    const cp0 = chars[0].codePointAt(0) || 0;
    const cp1 = chars[1].codePointAt(0) || 0;
    if (isRegionalIndicator(cp0) && isRegionalIndicator(cp1)) return chars[0] + chars[1];
  }

  // 2) لا حاجة لالتقاط إضافي؛ الشرط السابق يغطي حالة "🇸🇦 السعودية"

  // 3) إذا كانت صيغة ISO-2 مثل SA، US، JO... نحولها لعلم
  const isoCandidate = text.replace(/[^A-Za-z]/g, '').toUpperCase();
  if (isoCandidate.length === 2) {
    const base = 0x1f1e6;
    const a = isoCandidate.charCodeAt(0) - 65;
    const b = isoCandidate.charCodeAt(1) - 65;
    if (a >= 0 && a < 26 && b >= 0 && b < 26) {
      return String.fromCodePoint(base + a) + String.fromCodePoint(base + b);
    }
  }

  // 4) محاولة مطابقة أسماء الدول العربية/الإنجليزية إلى ISO-2
  const nameToIso2: Record<string, string> = {
    // عربياً
    'السعودية': 'SA', 'الإمارات': 'AE', 'مصر': 'EG', 'الأردن': 'JO', 'لبنان': 'LB', 'سوريا': 'SY', 'العراق': 'IQ',
    'الكويت': 'KW', 'قطر': 'QA', 'البحرين': 'BH', 'عمان': 'OM', 'فلسطين': 'PS', 'اليمن': 'YE', 'المغرب': 'MA',
    'الجزائر': 'DZ', 'تونس': 'TN', 'ليبيا': 'LY', 'السودان': 'SD', 'موريتانيا': 'MR', 'جيبوتي': 'DJ', 'الصومال': 'SO',
    'جزر القمر': 'KM', 'تركيا': 'TR', 'إيران': 'IR', 'باكستان': 'PK', 'أفغانستان': 'AF', 'الهند': 'IN', 'الصين': 'CN',
    'اليابان': 'JP', 'كوريا': 'KR', 'بريطانيا': 'GB', 'أمريكا': 'US', 'الولايات المتحدة': 'US', 'كندا': 'CA', 'أستراليا': 'AU',
    'ألمانيا': 'DE', 'فرنسا': 'FR', 'إيطاليا': 'IT', 'إسبانيا': 'ES', 'البرتغال': 'PT', 'هولندا': 'NL', 'بلجيكا': 'BE',
    'سويسرا': 'CH', 'النمسا': 'AT', 'الدانمارك': 'DK', 'الدنمارك': 'DK', 'السويد': 'SE', 'النرويج': 'NO', 'فنلندا': 'FI',
    'روسيا': 'RU', 'بولندا': 'PL', 'التشيك': 'CZ', 'المجر': 'HU', 'اليونان': 'GR', 'بلغاريا': 'BG', 'رومانيا': 'RO',
    'كرواتيا': 'HR', 'صربيا': 'RS', 'البوسنة': 'BA', 'البرازيل': 'BR', 'الأرجنتين': 'AR', 'المكسيك': 'MX',
    // English
    'saudi arabia': 'SA', 'uae': 'AE', 'united arab emirates': 'AE', 'egypt': 'EG', 'jordan': 'JO', 'lebanon': 'LB',
    'syria': 'SY', 'iraq': 'IQ', 'kuwait': 'KW', 'qatar': 'QA', 'bahrain': 'BH', 'oman': 'OM', 'palestine': 'PS',
    'yemen': 'YE', 'morocco': 'MA', 'algeria': 'DZ', 'tunisia': 'TN', 'libya': 'LY', 'sudan': 'SD', 'mauritania': 'MR',
    'djibouti': 'DJ', 'somalia': 'SO', 'comoros': 'KM', 'turkey': 'TR', 'iran': 'IR', 'pakistan': 'PK', 'afghanistan': 'AF',
    'india': 'IN', 'china': 'CN', 'japan': 'JP', 'korea': 'KR', 'south korea': 'KR', 'united kingdom': 'GB', 'uk': 'GB',
    'britain': 'GB', 'usa': 'US', 'united states': 'US', 'canada': 'CA', 'australia': 'AU', 'germany': 'DE', 'france': 'FR',
    'italy': 'IT', 'spain': 'ES', 'portugal': 'PT', 'netherlands': 'NL', 'belgium': 'BE', 'switzerland': 'CH', 'austria': 'AT',
    'denmark': 'DK', 'sweden': 'SE', 'norway': 'NO', 'finland': 'FI', 'russia': 'RU', 'poland': 'PL', 'czech': 'CZ', 'hungary': 'HU',
    'greece': 'GR', 'bulgaria': 'BG', 'romania': 'RO', 'croatia': 'HR', 'serbia': 'RS', 'bosnia': 'BA', 'brazil': 'BR',
    'argentina': 'AR', 'mexico': 'MX'
  };

  const normalized = text.toLowerCase().trim();
  const iso =
    nameToIso2[normalized] ||
    nameToIso2[text] ||
    nameToIso2[normalized.replace(/^.+?\s+/, '')] ||
    nameToIso2[text.replace(/^.+?\s+/, '')];
  if (iso && iso.length === 2) {
    const base = 0x1f1e6;
    const a = iso.charCodeAt(0) - 65;
    const b = iso.charCodeAt(1) - 65;
    if (a >= 0 && a < 26 && b >= 0 && b < 26) {
      return String.fromCodePoint(base + a) + String.fromCodePoint(base + b);
    }
  }

  return null;
};

// دالة لإرجاع كود الدولة ISO-2 من أي مدخل (إيموجي / اسم / كود)
export const getCountryIso2 = (country?: string): string | null => {
  if (!country) return null;
  const text = country.trim();
  if (!text) return null;

  // 1) إذا بدأ النص بإيموجي علم، حوّله إلى ISO-2
  const chars = Array.from(text);
  const isRegionalIndicator = (cp: number) => cp >= 0x1f1e6 && cp <= 0x1f1ff;
  if (chars.length >= 2) {
    const cp0 = chars[0].codePointAt(0) || 0;
    const cp1 = chars[1].codePointAt(0) || 0;
    if (isRegionalIndicator(cp0) && isRegionalIndicator(cp1)) {
      const base = 0x1f1e6;
      const a = String.fromCharCode(65 + (cp0 - base));
      const b = String.fromCharCode(65 + (cp1 - base));
      return `${a}${b}`;
    }
  }

  // 2) إذا كانت صيغة ISO-2 مثل SA، US، JO
  const isoCandidate = text.replace(/[^A-Za-z]/g, '').toUpperCase();
  if (isoCandidate.length === 2) {
    const a = isoCandidate.charCodeAt(0) - 65;
    const b = isoCandidate.charCodeAt(1) - 65;
    if (a >= 0 && a < 26 && b >= 0 && b < 26) return isoCandidate;
  }

  // 3) مطابقة أسماء الدول العربية/الإنجليزية إلى ISO-2
  const nameToIso2: Record<string, string> = {
    // عربياً
    'السعودية': 'SA', 'الإمارات': 'AE', 'مصر': 'EG', 'الأردن': 'JO', 'لبنان': 'LB', 'سوريا': 'SY', 'العراق': 'IQ',
    'الكويت': 'KW', 'قطر': 'QA', 'البحرين': 'BH', 'عمان': 'OM', 'فلسطين': 'PS', 'اليمن': 'YE', 'المغرب': 'MA',
    'الجزائر': 'DZ', 'تونس': 'TN', 'ليبيا': 'LY', 'السودان': 'SD', 'موريتانيا': 'MR', 'جيبوتي': 'DJ', 'الصومال': 'SO',
    'جزر القمر': 'KM', 'تركيا': 'TR', 'إيران': 'IR', 'باكستان': 'PK', 'أفغانستان': 'AF', 'الهند': 'IN', 'الصين': 'CN',
    'اليابان': 'JP', 'كوريا': 'KR', 'بريطانيا': 'GB', 'أمريكا': 'US', 'الولايات المتحدة': 'US', 'كندا': 'CA', 'أستراليا': 'AU',
    'ألمانيا': 'DE', 'فرنسا': 'FR', 'إيطاليا': 'IT', 'إسبانيا': 'ES', 'البرتغال': 'PT', 'هولندا': 'NL', 'بلجيكا': 'BE',
    'سويسرا': 'CH', 'النمسا': 'AT', 'الدانمارك': 'DK', 'الدنمارك': 'DK', 'السويد': 'SE', 'النرويج': 'NO', 'فنلندا': 'FI',
    'روسيا': 'RU', 'بولندا': 'PL', 'التشيك': 'CZ', 'المجر': 'HU', 'اليونان': 'GR', 'بلغاريا': 'BG', 'رومانيا': 'RO',
    'كرواتيا': 'HR', 'صربيا': 'RS', 'البوسنة': 'BA', 'البرازيل': 'BR', 'الأرجنتين': 'AR', 'المكسيك': 'MX',
    // English
    'saudi arabia': 'SA', 'uae': 'AE', 'united arab emirates': 'AE', 'egypt': 'EG', 'jordan': 'JO', 'lebanon': 'LB',
    'syria': 'SY', 'iraq': 'IQ', 'kuwait': 'KW', 'qatar': 'QA', 'bahrain': 'BH', 'oman': 'OM', 'palestine': 'PS',
    'yemen': 'YE', 'morocco': 'MA', 'algeria': 'DZ', 'tunisia': 'TN', 'libya': 'LY', 'sudan': 'SD', 'mauritania': 'MR',
    'djibouti': 'DJ', 'somalia': 'SO', 'comoros': 'KM', 'turkey': 'TR', 'iran': 'IR', 'pakistan': 'PK', 'afghanistan': 'AF',
    'india': 'IN', 'china': 'CN', 'japan': 'JP', 'korea': 'KR', 'south korea': 'KR', 'united kingdom': 'GB', 'uk': 'GB',
    'britain': 'GB', 'usa': 'US', 'united states': 'US', 'canada': 'CA', 'australia': 'AU', 'germany': 'DE', 'france': 'FR',
    'italy': 'IT', 'spain': 'ES', 'portugal': 'PT', 'netherlands': 'NL', 'belgium': 'BE', 'switzerland': 'CH', 'austria': 'AT',
    'denmark': 'DK', 'sweden': 'SE', 'norway': 'NO', 'finland': 'FI', 'russia': 'RU', 'poland': 'PL', 'czech': 'CZ', 'hungary': 'HU',
    'greece': 'GR', 'bulgaria': 'BG', 'romania': 'RO', 'croatia': 'HR', 'serbia': 'RS', 'bosnia': 'BA', 'brazil': 'BR',
    'argentina': 'AR', 'mexico': 'MX'
  };

  const normalized = text.toLowerCase().trim();
  const iso =
    nameToIso2[normalized] ||
    nameToIso2[text] ||
    nameToIso2[normalized.replace(/^.+?\s+/, '')] ||
    nameToIso2[text.replace(/^.+?\s+/, '')];
  return iso || null;
};


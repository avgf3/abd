export const getCountryFlag = (country?: string): string | null => {
  if (!country) return null;
  const text = country.trim();
  if (!text) return null;
  // إذا المستخدم أدخل إيموجي علم مباشرة
  const chars = Array.from(text);
  const isRI = (cp: number) => cp >= 0x1f1e6 && cp <= 0x1f1ff;
  if (chars.length >= 2) {
    const cp0 = chars[0].codePointAt(0) || 0;
    const cp1 = chars[1].codePointAt(0) || 0;
    if (isRI(cp0) && isRI(cp1)) return chars[0] + chars[1];
  }
  // إذا كانت صيغة ISO-2 مثل SA، US، JO... نحولها لعلم
  const iso = text.replace(/[^A-Za-z]/g, '').toUpperCase();
  if (iso.length === 2) {
    const base = 0x1f1e6;
    const a = iso.charCodeAt(0) - 65;
    const b = iso.charCodeAt(1) - 65;
    if (a >= 0 && a < 26 && b >= 0 && b < 26) {
      return String.fromCodePoint(base + a) + String.fromCodePoint(base + b);
    }
  }
  return null;
};


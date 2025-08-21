export function parseCountryEmoji(country?: string): string | null {
  if (!country) return null;
  const token = country.trim().split(' ')[0];
  return token || null;
}


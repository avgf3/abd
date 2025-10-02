export function getDeviceIdFromHeaders(headers: Record<string, any>): string {
  try {
    const raw = (headers['x-device-id'] || headers['X-Device-Id'] || headers['x_device_id']) as
      | string
      | undefined;
    if (typeof raw === 'string' && raw.trim().length > 0) return raw.trim();

    // لا تولّد معرفاً عاماً من user-agent/accept عند غياب x-device-id
    // لأن ذلك قد يسبب تشارك نفس المعرّف بين عدة مستخدمين خلف نفس المتصفح/البروكسي
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

export function getClientIpFromHeaders(headers: Record<string, any>, fallback?: string): string {
  const forwarded = (headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
  const real = (headers['x-real-ip'] as string | undefined)?.trim();
  const resolved = forwarded || real || fallback || 'unknown';
  return resolved;
}

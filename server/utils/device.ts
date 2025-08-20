export function getDeviceIdFromHeaders(headers: Record<string, any>): string {
  try {
    const raw = (headers['x-device-id'] || headers['X-Device-Id'] || headers['x_device_id']) as
      | string
      | undefined;
    if (typeof raw === 'string' && raw.trim().length > 0) return raw.trim();

    const userAgent = (headers['user-agent'] as string | undefined) || '';
    const acceptLanguage = (headers['accept-language'] as string | undefined) || '';
    const acceptEncoding = (headers['accept-encoding'] as string | undefined) || '';

    const combined = `${userAgent}-${acceptLanguage}-${acceptEncoding}`;
    if (combined.trim().length === 0) return 'unknown';

    return Buffer.from(combined).toString('base64').substring(0, 32);
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

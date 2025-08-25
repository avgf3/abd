import crypto from 'crypto';

import type { Request } from 'express';

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24h

let cachedDevSecret: string | null = null;

function getSecret(): string {
  const envSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET || '';
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) {
    if (!envSecret || envSecret.length < 32) {
      throw new Error('JWT_SECRET must be set to a strong value in production');
    }
    return String(envSecret);
  }
  // In development, accept a shorter env secret or generate an ephemeral one
  if (envSecret && envSecret.length >= 16) return String(envSecret);
  if (!cachedDevSecret) {
    cachedDevSecret = crypto.randomBytes(32).toString('hex');
  }
  return cachedDevSecret;
}

export function issueAuthToken(userId: number, ttlMs: number = DEFAULT_TTL_MS): string {
  const ts = Date.now();
  const exp = ts + ttlMs;
  const payload = `${userId}.${exp}`;
  const hmac = crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
  return `${userId}.${exp}.${hmac}`;
}

export function verifyAuthToken(token: string): { userId: number } | null {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [userIdStr, expStr, sig] = parts;
    const userId = parseInt(userIdStr);
    const exp = parseInt(expStr);
    if (!userId || isNaN(userId) || !exp || isNaN(exp)) return null;
    if (Date.now() > exp) return null;
    // Ensure signature is valid hex (sha256 => 64 hex chars)
    if (!/^[0-9a-fA-F]{64}$/.test(sig)) return null;
    const expected = crypto
      .createHmac('sha256', getSecret())
      .update(`${userId}.${exp}`)
      .digest('hex');
    const providedBuf = Buffer.from(sig, 'hex');
    const expectedBuf = Buffer.from(expected, 'hex');
    if (providedBuf.length !== expectedBuf.length) return null;
    if (!crypto.timingSafeEqual(providedBuf, expectedBuf)) return null;
    return { userId };
  } catch {
    return null;
  }
}

function parseCookie(header: string | undefined): Record<string, string> {
  const jar: Record<string, string> = {};
  if (!header) return jar;
  const parts = header.split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) jar[k] = decodeURIComponent(v);
  }
  return jar;
}

export function getAuthTokenFromRequest(req: Request): string | null {
  // Prefer Authorization: Bearer <token>
  const auth = req.headers['authorization'];
  if (typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }
  // Fallback to cookie
  const cookieHeader = req.headers['cookie'] as string | undefined;
  const cookies = parseCookie(cookieHeader);
  if (cookies['auth_token']) return cookies['auth_token'];
  return null;
}

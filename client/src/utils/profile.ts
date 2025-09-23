import type { ChatUser } from '@/types/chat';
import { apiRequest } from '@/lib/queryClient';

/**
 * fetchFreshProfile: مصدر موحّد لجلب ملف المستخدم بدون أي كاش.
 * - يضيف باراميتر زمني لكسر كاش المتصفح/الوسائط
 * - يمرر ترويسات no-cache ويتوافق مع middleware الخادم عبر x-no-cache
 */
export async function fetchFreshProfile(userId: number, options?: { signal?: AbortSignal }): Promise<ChatUser> {
  const ts = Date.now();
  const url = `/api/users/${userId}?_=${ts}`;
  const headers = {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'x-no-cache': 'true',
  } as Record<string, string>;

  return apiRequest<ChatUser>(url, { method: 'GET', headers, signal: options?.signal });
}


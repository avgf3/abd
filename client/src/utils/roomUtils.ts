import type { ChatRoom } from '@/types/chat';

// يحول عنصر من API إلى ChatRoom موحّد
export function mapApiRoom(room: any): ChatRoom {
  return {
    id: String(room.id),
    name: room.name || 'غرفة بدون اسم',
    description: room.description || '',
    isDefault: Boolean(room.isDefault ?? room.is_default ?? false),
    createdBy: Number(room.createdBy ?? room.created_by ?? 0),
    createdAt: new Date(room.createdAt ?? room.created_at ?? Date.now()),
    isActive: room.isActive !== false && room.is_active !== false,
    userCount: Math.max(0, Number(room.userCount ?? room.user_count ?? 0)),
    icon: room.icon || '',
    isBroadcast: Boolean(room.isBroadcast ?? room.is_broadcast ?? false),
    hostId: room.hostId ?? room.host_id ?? null,
    speakers: Array.isArray(room.speakers)
      ? room.speakers
      : typeof room.speakers === 'string'
        ? safeParseArray(room.speakers)
        : [],
    micQueue: Array.isArray(room.micQueue)
      ? room.micQueue
      : typeof room.micQueue === 'string'
        ? safeParseArray(room.micQueue)
        : []
  };
}

function safeParseArray(jsonLike: string): number[] {
  try {
    const arr = JSON.parse(jsonLike || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

// يزيل أي تكرار حسب id ويقوم بدمج أفضل البيانات ثم يرتب الافتراضي أولاً ثم حسب عدد المتصلين
export function dedupeRooms(rooms: ChatRoom[]): ChatRoom[] {
  const idToRoom = new Map<string, ChatRoom>();

  for (const raw of rooms || []) {
    if (!raw || !raw.id) continue;
    const id = String(raw.id);
    const existing = idToRoom.get(id);
    if (!existing) {
      idToRoom.set(id, raw);
      continue;
    }

    // دمج ذكي: نأخذ الأفضل من القيم
    const merged: ChatRoom = {
      ...existing,
      ...raw,
      isDefault: Boolean(existing.isDefault || raw.isDefault),
      isBroadcast: Boolean(existing.isBroadcast || raw.isBroadcast),
      userCount: Math.max(existing.userCount || 0, raw.userCount || 0),
      speakers: Array.from(new Set([...(existing.speakers || []), ...(raw.speakers || [])])),
      micQueue: Array.from(new Set([...(existing.micQueue || []), ...(raw.micQueue || [])]))
    };

    idToRoom.set(id, merged);
  }

  const unique = Array.from(idToRoom.values()).filter(r => r && r.id && r.name);

  unique.sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return (b.userCount || 0) - (a.userCount || 0);
  });

  return unique;
}

// يحول Array من API ثم يزيل التكرار ويرتب
export function mapApiRooms(apiRooms: any[]): ChatRoom[] {
  return dedupeRooms((apiRooms || []).map(mapApiRoom));
}

export function normalizeBroadcastInfo(info: any): { hostId: number | null; speakers: number[]; micQueue: number[] } {
  const toNumberArray = (val: any): number[] => {
    try {
      if (Array.isArray(val)) return val.map((v) => Number(v)).filter((n) => Number.isFinite(n));
      if (typeof val === 'string') {
        const parsed = JSON.parse(val || '[]');
        return Array.isArray(parsed) ? parsed.map((v) => Number(v)).filter((n) => Number.isFinite(n)) : [];
      }
      return [];
    } catch {
      return [];
    }
  };

  return {
    hostId: info?.hostId ?? info?.host_id ?? null,
    speakers: Array.from(new Set(toNumberArray(info?.speakers))),
    micQueue: Array.from(new Set(toNumberArray(info?.micQueue ?? info?.mic_queue)))
  };
}
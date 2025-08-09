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

// إزالة تكرار صارمة: نحتفظ بأول ظهور لكل id ونحذف ما عداه، ثم نرتب
export function dedupeRooms(rooms: ChatRoom[]): ChatRoom[] {
  const seen = new Set<string>();
  const unique: ChatRoom[] = [];

  for (const r of rooms || []) {
    if (!r || !r.id) continue;
    const id = String(r.id);
    if (seen.has(id)) continue; // حذف التكرار بدون دمج
    seen.add(id);
    unique.push(r);
  }

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
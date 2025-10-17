/* Simple IndexedDB-based chat cache for offline/return resume.
 * Stores per-room messages (capped), and per-room metadata (lastId/lastTs), and current room id.
 */

const DB_NAME = 'chatCacheDB';
const DB_VERSION = 1;
const STORE_MESSAGES = 'room_messages';
const STORE_META = 'room_meta';
const STORE_STATE = 'state';

export type RoomMessageLite = {
  id: number;
  content: string;
  timestamp: string; // ISO string
  senderId: number;
  messageType: 'text' | 'image' | 'system';
  isPrivate: boolean;
  roomId?: string;
  reactions?: { like: number; dislike: number; heart: number };
  myReaction?: 'like' | 'dislike' | 'heart' | null;
  attachments?: any[];
  textColor?: string;
  bold?: boolean;
};

export type RoomMeta = { lastId?: number; lastTs?: string };

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_MESSAGES)) {
        const store = db.createObjectStore(STORE_MESSAGES, { keyPath: ['roomId', 'id'] as any });
        store.createIndex('byRoom', 'roomId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'roomId' });
      }
      if (!db.objectStoreNames.contains(STORE_STATE)) {
        db.createObjectStore(STORE_STATE, { keyPath: 'key' });
      }
    };
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
  });
}

export async function saveCurrentRoomId(roomId: string): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_STATE, 'readwrite');
    tx.objectStore(STORE_STATE).put({ key: 'currentRoomId', value: roomId });
    await tx.done;
  } catch {}
}

export async function getCurrentRoomId(): Promise<string | null> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_STATE, 'readonly');
    const res = await new Promise<any>((resolve, reject) => {
      const req = tx.objectStore(STORE_STATE).get('currentRoomId');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return res?.value || null;
  } catch {
    return null;
  }
}

export async function saveRoomMeta(roomId: string, meta: RoomMeta): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_META, 'readwrite');
    tx.objectStore(STORE_META).put({ roomId, ...meta });
    await tx.done;
  } catch {}
}

export async function getRoomMeta(roomId: string): Promise<RoomMeta> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_META, 'readonly');
    const res = await new Promise<any>((resolve, reject) => {
      const req = tx.objectStore(STORE_META).get(roomId);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const meta: RoomMeta = {};
    if (res && typeof res === 'object') {
      if (typeof res.lastId === 'number') meta.lastId = res.lastId;
      if (typeof res.lastTs === 'string') meta.lastTs = res.lastTs;
    }
    return meta;
  } catch {
    return {};
  }
}

export async function saveRoomMessages(
  roomId: string,
  messages: RoomMessageLite[],
  cap: number = 300
): Promise<void> {
  try {
    if (!Array.isArray(messages) || messages.length === 0) return;
    const db = await openDb();
    const tx = db.transaction([STORE_MESSAGES, STORE_META], 'readwrite');
    const messagesStore = tx.objectStore(STORE_MESSAGES);
    // Put messages individually (keyPath ['roomId','id'])
    const sorted = messages
      .slice()
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    for (const msg of sorted) {
      try {
        (messagesStore as any).put({ ...msg, roomId });
      } catch {}
    }
    // Trim per room to CAP
    await new Promise<void>((resolve) => {
      const index = messagesStore.index('byRoom');
      const req = index.getAllKeys(IDBKeyRange.only(roomId));
      req.onsuccess = () => {
        const keys: any[] = req.result || [];
        if (keys.length > cap) {
          const toDelete = keys
            .slice()
            .sort((a, b) => (a[1] as number) - (b[1] as number))
            .slice(0, Math.max(0, keys.length - cap));
          for (const key of toDelete) {
            try { (messagesStore as any).delete(key); } catch {}
          }
        }
        resolve();
      };
      req.onerror = () => resolve();
    });
    // Save meta (lastId/lastTs)
    const last = sorted[sorted.length - 1];
    if (last) {
      const metaStore = tx.objectStore(STORE_META);
      metaStore.put({ roomId, lastId: last.id, lastTs: last.timestamp });
    }
    await tx.done;
  } catch {}
}

export async function getRoomMessages(roomId: string, limit: number = 300): Promise<RoomMessageLite[]> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_MESSAGES, 'readonly');
    const store = tx.objectStore(STORE_MESSAGES);
    const index = store.index('byRoom');
    const all = await new Promise<any[]>((resolve) => {
      const req = index.getAll(IDBKeyRange.only(roomId));
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
    const normalized = (all || [])
      .filter(Boolean)
      .map((m: any) => ({ ...m, roomId })) as RoomMessageLite[];
    normalized.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    if (limit && normalized.length > limit) {
      return normalized.slice(-limit);
    }
    return normalized;
  } catch {
    return [];
  }
}

export async function clearRoom(roomId: string): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction([STORE_MESSAGES, STORE_META], 'readwrite');
    const messagesStore = tx.objectStore(STORE_MESSAGES);
    const index = messagesStore.index('byRoom');
    await new Promise<void>((resolve) => {
      const req = index.getAllKeys(IDBKeyRange.only(roomId));
      req.onsuccess = () => {
        const keys: any[] = req.result || [];
        for (const key of keys) {
          try { (messagesStore as any).delete(key); } catch {}
        }
        resolve();
      };
      req.onerror = () => resolve();
    });
    tx.objectStore(STORE_META).delete(roomId);
    await tx.done;
  } catch {}
}

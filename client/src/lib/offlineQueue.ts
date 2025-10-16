// Lightweight persistent offline outbox for room messages
// Uses localStorage to queue unsent messages and flush them later via HTTP.

export type QueuedRoomMessage = {
  id: string; // client-generated id
  senderId: number;
  roomId: string;
  content: string;
  messageType: 'text' | 'image' | 'sticker';
  textColor?: string;
  bold?: boolean;
  createdAt: number; // epoch ms
};

const STORAGE_KEY = 'offline_room_outbox_v1';

function loadQueue(): QueuedRoomMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedRoomMessage[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {}
}

export function getOfflineQueueLength(): number {
  return loadQueue().length;
}

export function enqueueOfflineMessage(msg: Omit<QueuedRoomMessage, 'id' | 'createdAt'>): QueuedRoomMessage {
  const queue = loadQueue();
  const item: QueuedRoomMessage = {
    ...msg,
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    createdAt: Date.now(),
  };
  queue.push(item);
  saveQueue(queue);
  return item;
}

let flushInProgress = false;

// Flush queued messages using provided sender function.
// The sender should throw on failure so we can keep the message in the queue.
export async function flushOfflineQueue(
  sender: (m: QueuedRoomMessage) => Promise<void>,
  options?: { maxAgeMs?: number; limit?: number }
): Promise<{ sent: number; remaining: number }> {
  if (flushInProgress) {
    return { sent: 0, remaining: getOfflineQueueLength() };
  }

  flushInProgress = true;
  try {
    const maxAgeMs = options?.maxAgeMs ?? 1000 * 60 * 60 * 12; // 12h default
    const limit = options?.limit ?? 100; // safety limit per flush
    let queue = loadQueue();

    // Drop too-old items first
    const now = Date.now();
    queue = queue.filter((m) => now - m.createdAt <= maxAgeMs);

    const toSend = queue.slice(0, limit);
    let sent = 0;
    const remaining: QueuedRoomMessage[] = queue.slice();

    for (const m of toSend) {
      try {
        await sender(m);
        // remove from remaining by id
        const idx = remaining.findIndex((x) => x.id === m.id);
        if (idx !== -1) remaining.splice(idx, 1);
        sent += 1;
      } catch {
        // keep the message for later
      }
    }

    saveQueue(remaining);
    return { sent, remaining: remaining.length };
  } finally {
    flushInProgress = false;
  }
}

export function clearOfflineQueue() {
  saveQueue([]);
}

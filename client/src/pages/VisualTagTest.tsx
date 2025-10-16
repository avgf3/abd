import { useMemo, useState } from 'react';
import ProfileImage from '@/components/chat/ProfileImage';
import type { ChatUser } from '@/types/chat';

function makeUser(tag: string | number, image: string, frame?: string): ChatUser {
  const tagStr = typeof tag === 'number' ? `tag${tag}` : String(tag);
  return {
    id: Number(String(tag).replace(/\D/g, '')) || Math.floor(Math.random() * 1000000),
    username: `User-${tagStr}`,
    displayName: `User ${tagStr}`,
    profileImage: image,
    role: 'member',
    isOnline: true,
    userType: 'member',
    profileTag: tagStr,
    profileFrame: frame,
  } as ChatUser;
}

export default function VisualTagTest() {
  const [baseImage, setBaseImage] = useState<string>('/default_avatar.svg');
  const [size, setSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [pixelSize, setPixelSize] = useState<number | undefined>(undefined);
  const [frame, setFrame] = useState<string>('');

  const tags = useMemo(() => Array.from({ length: 50 }, (_, i) => i + 1), []);

  const users = useMemo(() => {
    return tags.map(n => makeUser(n, baseImage, frame || undefined));
  }, [tags, baseImage, frame]);

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ color: '#fff', marginBottom: 12 }}>اختبار بصري للتيجان 1–50</h2>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <label style={{ color: '#ddd' }}>
          صورة مرجعية:
          <input
            type="text"
            value={baseImage}
            onChange={(e) => setBaseImage(e.target.value)}
            placeholder="/default_avatar.svg أو /uploads/profiles/..."
            style={{ marginInlineStart: 8, width: 360 }}
          />
        </label>
        <label style={{ color: '#ddd' }}>
          حجم:
          <select value={size} onChange={(e) => setSize(e.target.value as any)} style={{ marginInlineStart: 8 }}>
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </label>
        <label style={{ color: '#ddd' }}>
          Pixel size (اختياري):
          <input
            type="number"
            min={24}
            max={200}
            value={pixelSize ?? ''}
            onChange={(e) => setPixelSize(e.target.value ? Number(e.target.value) : undefined)}
            style={{ marginInlineStart: 8, width: 100 }}
          />
        </label>
        <label style={{ color: '#ddd' }}>
          إطار (مثلاً frame10):
          <input
            type="text"
            value={frame}
            onChange={(e) => setFrame(e.target.value)}
            placeholder="frame10 أو اتركه فارغًا"
            style={{ marginInlineStart: 8, width: 140 }}
          />
        </label>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
        gap: 16,
        alignItems: 'center',
      }}>
        {users.map((u, idx) => (
          <div key={idx} style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: 12,
            textAlign: 'center',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              <ProfileImage user={u as any} size={size} pixelSize={pixelSize} />
            </div>
            <div style={{ color: '#9ca3af', fontSize: 12 }}>tag{idx + 1}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

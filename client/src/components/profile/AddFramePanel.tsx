import React, { useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AvatarWithFrame } from '@/components/ui/AvatarWithFrame';
import { getAvailableFrames, type AvatarFrameId } from '@/utils/avatarFrame';
import { apiRequest } from '@/lib/queryClient';

interface AddFramePanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: { id?: number; username?: string; avatarFrame?: string } | null;
  onFrameApplied?: (frame: AvatarFrameId) => void;
}

export default function AddFramePanel({ isOpen, onClose, currentUser, onFrameApplied }: AddFramePanelProps) {
  const { toast } = useToast();
  const [selected, setSelected] = useState<AvatarFrameId>((currentUser?.avatarFrame as AvatarFrameId) || 'none');
  const [saving, setSaving] = useState(false);

  const frames = useMemo(() => getAvailableFrames(), []);

  const categories = useMemo(() => {
    const map = new Map<string, Array<{ id: AvatarFrameId; name: string }>>();
    for (const f of frames) {
      const arr = map.get(f.category) || [];
      arr.push({ id: f.id as AvatarFrameId, name: f.name });
      map.set(f.category, arr);
    }
    return Array.from(map.entries()).map(([cat, items]) => ({ category: cat, items }));
  }, [frames]);

  const handleSave = async () => {
    if (!currentUser?.id) {
      onClose();
      return;
    }
    try {
      setSaving(true);
      const result = await apiRequest(`/api/users/${currentUser.id}`, {
        method: 'PUT',
        body: { avatarFrame: selected }
      });
      const ok = (result as any)?.user?.id || (result as any)?.id || (result as any)?.success;
      if (ok) {
        onFrameApplied?.(selected);
        toast({ title: 'تم الحفظ ✅', description: 'تم تحديث إطار الصورة الشخصية' });
        onClose();
      } else {
        throw new Error('فشل حفظ الإطار');
      }
    } catch (err: any) {
      toast({ title: 'خطأ', description: err?.message || 'تعذر حفظ الإطار', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl w-full" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>إضافة إطار للصورة الشخصية</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-4 py-2">
          <div className="shrink-0">
            <AvatarWithFrame
              src={'/default_avatar.svg'}
              alt={currentUser?.username || 'المعاينة'}
              frame={selected}
              size={120}
              variant="profile"
              ringOnly={false}
            />
          </div>
          <div className="text-sm text-muted-foreground">
            اختر إطاراً من الأسفل ثم اضغط حفظ. يمكنك اختيار "بدون إطار" لإزالة الإطار.
          </div>
        </div>

        <Tabs defaultValue={categories[0]?.category || 'عام'} className="w-full">
          <TabsList className="w-full flex flex-wrap gap-2 justify-start">
            {categories.map(({ category }) => (
              <TabsTrigger key={category} value={category}>{category}</TabsTrigger>
            ))}
          </TabsList>

          {categories.map(({ category, items }) => (
            <TabsContent key={category} value={category} className="mt-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {items.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setSelected(f.id)}
                    className={`group border rounded-lg p-3 text-right hover:bg-accent transition-colors ${selected === f.id ? 'border-primary ring-1 ring-primary' : 'border-border'}`}
                    aria-pressed={selected === f.id}
                  >
                    <div className="flex items-center justify-center mb-2">
                      <AvatarWithFrame
                        src={'/default_avatar.svg'}
                        alt={f.name}
                        frame={f.id}
                        size={88}
                        variant="profile"
                        ringOnly={false}
                      />
                    </div>
                    <div className="text-sm font-medium truncate">{f.name}</div>
                    <div className="text-xs text-muted-foreground">{f.id === 'none' ? 'بدون إطار' : f.id}</div>
                  </button>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="ghost" onClick={onClose} disabled={saving}>إلغاء</Button>
          <Button onClick={handleSave} disabled={saving}>حفظ</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


import React, { useCallback, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { api, apiRequest } from '@/lib/queryClient';
import type { ChatUser } from '@/types/chat';
import { useStories, type StoryItem } from '@/hooks/useStories';

interface StoriesSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: ChatUser | null;
}

export default function StoriesSettings({ isOpen, onClose, currentUser }: StoriesSettingsProps) {
  const { toast } = useToast();
  const { myStories, fetchMine } = useStories({ autoRefresh: false });

  // التحقق من الصلاحيات
  const isAuthorized = currentUser && (
    currentUser.userType === 'owner' || 
    currentUser.userType === 'admin' || 
    currentUser.userType === 'moderator'
  );

  const [activeTab, setActiveTab] = useState<'add' | 'mine'>('add');
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number>(0);

  const handlePick = () => {
    fileRef.current?.click();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      // التحقق من الصلاحيات
      if (!isAuthorized) {
        toast({
          title: 'غير مسموح',
          description: 'هذه الميزة متاحة للمشرفين فقط',
          variant: 'destructive',
        });
        return;
      }

      const file = e.target.files?.[0];
      if (!file) return;
      // validate client-side video duration <= 30s
      if (file.type.startsWith('video/')) {
        const url = URL.createObjectURL(file);
        const ok = await new Promise<boolean>((resolve) => {
          const video = document.createElement('video');
          video.preload = 'metadata';
          video.onloadedmetadata = () => {
            const d = video.duration;
            URL.revokeObjectURL(url);
            resolve(!isFinite(d) || d <= 30);
          };
          video.onerror = () => resolve(true);
          video.src = url;
        });
        if (!ok) throw new Error('مدة الفيديو تتجاوز 30 ثانية');
      }

      setUploading(true);
      setProgress(0);
      const form = new FormData();
      form.append('story', file);
      if (caption) form.append('caption', caption);

      await api.upload('/api/stories/upload', form, {
        onProgress: (p) => setProgress(p),
      });

      setCaption('');
      await fetchMine();
      setActiveTab('mine');
      toast({ title: 'تم', description: 'تم نشر الحالة بنجاح' });
    } catch (err: any) {
      toast({ title: 'خطأ', description: err?.message || 'فشل رفع الحالة', variant: 'destructive' });
    } finally {
      setUploading(false);
      try {
        if (e.target) (e.target as HTMLInputElement).value = '';
      } catch {}
    }
  };

  const handleDelete = async (story: StoryItem) => {
    try {
      if (!confirm('حذف هذه الحالة؟')) return;
      await apiRequest(`/api/stories/${story.id}`, { method: 'DELETE' });
      await fetchMine();
      toast({ title: 'تم الحذف', description: 'تم حذف الحالة بنجاح' });
    } catch (err: any) {
      toast({ title: 'خطأ', description: err?.message || 'فشل حذف الحالة', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-xl bg-slate-900/95 backdrop-blur-lg border-slate-700/50">
        <DialogHeader>
          <DialogTitle className="text-white text-lg font-bold text-center">الحالات</DialogTitle>
        </DialogHeader>
        <div className="p-2">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-3">
              <TabsTrigger value="add">➕ إضافة حالة</TabsTrigger>
              <TabsTrigger value="mine">📁 حالاتي</TabsTrigger>
            </TabsList>

            <TabsContent value="add" className="space-y-3">
              {!isAuthorized ? (
                <div className="text-slate-400 text-sm text-center p-4">
                  هذه الميزة متاحة للمشرفين فقط
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">نص قصير (اختياري)</label>
                    <Input
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="مثال: مساء الخير للجميع"
                      disabled={uploading}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">صورة أو فيديو (حتى 30 ثانية)</label>
                    <div className="flex gap-2">
                      <Button onClick={handlePick} disabled={uploading} className="min-w-28">اختر ملف</Button>
                      {uploading && (
                        <div className="text-slate-300 text-sm flex items-center">جارٍ الرفع... {Math.round(progress)}%</div>
                      )}
                    </div>
                    <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleUpload} hidden />
                    <div className="text-xs text-slate-400">الملفات المدعومة: الصور والفيديو. مدة الفيديو القصوى 30 ثانية.</div>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="mine" className="space-y-3">
              {myStories.length === 0 ? (
                <div className="text-slate-400 text-sm">لا توجد حالات حالياً.</div>
              ) : (
                <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                  {myStories.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg border border-slate-700">
                      <div className="w-16 h-16 bg-black rounded overflow-hidden flex items-center justify-center">
                        {s.mediaType === 'video' ? (
                          <video src={s.mediaUrl} className="w-full h-full object-cover" muted />
                        ) : (
                          <img src={s.mediaUrl} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-slate-200 text-sm truncate">{s.caption || 'بدون عنوان'}</div>
                        <div className="text-slate-400 text-xs">ينتهي خلال 24 ساعة</div>
                      </div>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(s)}>حذف</Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
        <div className="flex justify-center gap-2 pb-2">
          <Button variant="outline" onClick={onClose} className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700">إغلاق</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


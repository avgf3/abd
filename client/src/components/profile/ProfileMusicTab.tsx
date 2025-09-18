import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Play, Pause, Volume2, VolumeX, Upload, Trash2 } from 'lucide-react';
import type { ChatUser } from '@/types/chat';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface ProfileMusicTabProps {
  user: ChatUser | null;
  currentUser: ChatUser | null;
  onUpdate: (updates: Partial<ChatUser>) => void;
}

export default function ProfileMusicTab({ user, currentUser, onUpdate }: ProfileMusicTabProps) {
  const { toast } = useToast();
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicTitle, setMusicTitle] = useState(user?.profileMusicTitle || '');
  const [musicEnabled, setMusicEnabled] = useState(user?.profileMusicEnabled ?? true);
  const [musicVolume, setMusicVolume] = useState(user?.profileMusicVolume ?? 70);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const isOwnProfile = currentUser?.id === user?.id;

  useEffect(() => {
    if (user?.profileMusicUrl && audioRef.current) {
      audioRef.current.src = user.profileMusicUrl;
      audioRef.current.load();
    }
  }, [user?.profileMusicUrl]);

  const handleFileSelect = async (file: File) => {
    if (!isOwnProfile) return;

    if (!file.type.startsWith('audio/')) {
      toast({
        title: 'خطأ في نوع الملف',
        description: 'يرجى اختيار ملف صوتي صالح',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      toast({
        title: 'حجم الملف كبير',
        description: 'حجم الملف يجب أن يكون أقل من 10 ميجابايت',
        variant: 'destructive',
      });
      return;
    }

    setMusicFile(file);
    setMusicTitle(file.name.replace(/\.[^/.]+$/, ''));
  };

  const handleUpload = async () => {
    if (!musicFile || !isOwnProfile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('music', musicFile);
      formData.append('userId', currentUser!.id.toString());
      formData.append('title', musicTitle);

      const result = await apiRequest('/api/upload/profile-music', {
        method: 'POST',
        body: formData,
      });

      if (result.success) {
        onUpdate({
          profileMusicUrl: result.musicUrl,
          profileMusicTitle: musicTitle,
        });

        toast({
          title: 'تم رفع الموسيقى بنجاح',
          description: 'تم تحديث موسيقى البروفايل',
        });

        setMusicFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        throw new Error(result.error || 'فشل في رفع الموسيقى');
      }
    } catch (error: any) {
      toast({
        title: 'خطأ في رفع الموسيقى',
        description: error.message || 'حدث خطأ أثناء رفع الموسيقى',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMusic = async () => {
    if (!isOwnProfile) return;

    try {
      await apiRequest(`/api/users/${currentUser!.id}/profile-music`, {
        method: 'DELETE',
      });

      onUpdate({
        profileMusicUrl: null,
        profileMusicTitle: '',
      });

      toast({
        title: 'تم حذف الموسيقى',
        description: 'تم حذف موسيقى البروفايل',
      });
    } catch (error: any) {
      toast({
        title: 'خطأ في الحذف',
        description: 'حدث خطأ أثناء حذف الموسيقى',
        variant: 'destructive',
      });
    }
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {
        setAudioError(true);
        setIsPlaying(false);
      });
      setIsPlaying(true);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setMusicVolume(newVolume);
    
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
    }

    // حفظ الإعدادات
    if (isOwnProfile) {
      apiRequest(`/api/users/${currentUser!.id}`, {
        method: 'PUT',
        body: { profileMusicVolume: newVolume },
      }).catch(() => {});
    }
  };

  const handleToggleEnabled = (enabled: boolean) => {
    setMusicEnabled(enabled);
    
    if (audioRef.current) {
      audioRef.current.muted = !enabled;
    }

    // حفظ الإعدادات
    if (isOwnProfile) {
      apiRequest(`/api/users/${currentUser!.id}`, {
        method: 'PUT',
        body: { profileMusicEnabled: enabled },
      }).catch(() => {});
    }
  };

  return (
    <div className="space-y-4">
      {/* رفع موسيقى جديدة */}
      {isOwnProfile && (
        <Card>
          <CardHeader>
            <CardTitle>رفع موسيقى جديدة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="music-file">اختر ملف صوتي</Label>
              <Input
                ref={fileInputRef}
                id="music-file"
                type="file"
                accept="audio/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
              <p className="text-xs text-muted-foreground">
                الصيغ المدعومة: MP3, WAV, OGG. الحد الأقصى: 10MB
              </p>
            </div>

            {musicFile && (
              <div className="space-y-2">
                <Label htmlFor="music-title">عنوان الموسيقى</Label>
                <Input
                  id="music-title"
                  value={musicTitle}
                  onChange={(e) => setMusicTitle(e.target.value)}
                  placeholder="عنوان الموسيقى"
                />
              </div>
            )}

            {musicFile && (
              <Button
                onClick={handleUpload}
                disabled={uploading || !musicTitle.trim()}
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? 'جاري الرفع...' : 'رفع الموسيقى'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* الموسيقى الحالية */}
      {user?.profileMusicUrl && (
        <Card>
          <CardHeader>
            <CardTitle>موسيقى البروفايل الحالية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Button
                onClick={handlePlayPause}
                variant="outline"
                size="sm"
                disabled={audioError}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </Button>
              
              <div className="flex-1">
                <p className="font-medium">{user.profileMusicTitle || 'بدون عنوان'}</p>
                <p className="text-sm text-muted-foreground">موسيقى البروفايل</p>
              </div>

              {isOwnProfile && (
                <Button
                  onClick={handleDeleteMusic}
                  variant="destructive"
                  size="sm"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* إعدادات الصوت */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="music-enabled">تفعيل الموسيقى</Label>
                <Switch
                  id="music-enabled"
                  checked={musicEnabled}
                  onCheckedChange={handleToggleEnabled}
                  disabled={!isOwnProfile}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="music-volume">مستوى الصوت</Label>
                  <span className="text-sm text-muted-foreground">{musicVolume}%</span>
                </div>
                <Slider
                  id="music-volume"
                  value={[musicVolume]}
                  onValueChange={handleVolumeChange}
                  max={100}
                  step={1}
                  disabled={!isOwnProfile}
                  className="w-full"
                />
              </div>
            </div>

            {audioError && (
              <div className="text-sm text-destructive">
                خطأ في تشغيل الموسيقى. تأكد من أن الملف صالح.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ملف صوتي مخفي للتشغيل */}
      <audio
        ref={audioRef}
        onEnded={() => setIsPlaying(false)}
        onError={() => setAudioError(true)}
        onLoadedData={() => setAudioError(false)}
        volume={musicVolume / 100}
        muted={!musicEnabled}
      />
    </div>
  );
}
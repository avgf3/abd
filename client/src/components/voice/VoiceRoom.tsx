import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Mic, MicOff, Volume2, VolumeX, Settings, Users, Phone, PhoneOff,
  Headphones, Speaker, Signal, Wifi, WifiOff, Crown, Shield,
  Hand, UserCheck, UserX, MoreVertical, Volume1
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

import type { VoiceRoom as VoiceRoomType, VoiceUser, VoiceSettings } from '@/types/voice';
import { voiceManager } from '@/lib/voice/VoiceManager';

interface VoiceRoomProps {
  room: VoiceRoomType | null;
  currentUser: any;
  onLeaveRoom: () => void;
  onToggleMute: () => void;
  onVolumeChange: (volume: number) => void;
  onMicVolumeChange: (volume: number) => void;
  onRequestMic?: () => void;
  onManageSpeaker?: (userId: number, action: 'approve' | 'deny' | 'remove') => void;
}

interface VoiceUserCardProps {
  user: VoiceUser;
  currentUser: any;
  room: VoiceRoomType;
  onManageSpeaker?: (userId: number, action: 'approve' | 'deny' | 'remove') => void;
}

// مكون بطاقة المستخدم الصوتي
const VoiceUserCard: React.FC<VoiceUserCardProps> = ({ 
  user, 
  currentUser, 
  room, 
  onManageSpeaker 
}) => {
  const canManage = currentUser && (
    ['admin', 'owner', 'moderator'].includes(currentUser.userType) || 
    currentUser.id === room.hostId
  );

  const isSpeaker = room.speakers.includes(user.id);
  const isInQueue = room.micQueue.includes(user.id);

  // تحديد جودة الاتصال
  const getConnectionColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-yellow-500';
      case 'poor': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  // تحديد أيقونة الدور
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="w-3 h-3 text-yellow-500" />;
      case 'admin': return <Shield className="w-3 h-3 text-red-500" />;
      case 'moderator': return <Shield className="w-3 h-3 text-blue-500" />;
      default: return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`
        relative p-3 rounded-lg border transition-all duration-300
        ${user.isSpeaking ? 'bg-green-50 border-green-200 shadow-lg' : 'bg-card border-border'}
        ${user.isMuted ? 'opacity-75' : ''}
      `}
    >
      {/* مؤشر الكلام */}
      {user.isSpeaking && (
        <motion.div
          className="absolute inset-0 rounded-lg bg-green-400/20 border-2 border-green-400"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}

      <div className="flex items-center gap-3 relative z-10">
        {/* صورة المستخدم */}
        <div className="relative">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex items-center justify-center">
            {user.profileImage ? (
              <img 
                src={user.profileImage} 
                alt={user.username} 
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-sm font-bold text-muted-foreground">
                {user.username.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* مؤشر الاتصال */}
          <div className={`
            absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white
            ${user.isConnected ? 'bg-green-500' : 'bg-red-500'}
          `} />
        </div>

        {/* معلومات المستخدم */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-1">
            <span className="font-medium text-sm truncate">
              {user.displayName || user.username}
            </span>
            {getRoleIcon(user.role)}
            {isSpeaker && <Mic className="w-3 h-3 text-green-500" />}
            {isInQueue && <Hand className="w-3 h-3 text-orange-500" />}
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {/* حالة الميكروفون */}
            {user.isMuted ? (
              <MicOff className="w-3 h-3 text-red-500" />
            ) : (
              <Mic className="w-3 h-3 text-green-500" />
            )}

            {/* جودة الاتصال */}
            <div className={`flex items-center gap-1 ${getConnectionColor(user.connectionQuality)}`}>
              {user.connectionQuality === 'poor' ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
              <span>{user.latency}ms</span>
            </div>

            {/* مستوى الصوت */}
            {user.isSpeaking && (
              <div className="flex items-center gap-1">
                <Volume1 className="w-3 h-3" />
                <div className="w-8 h-1 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-green-500"
                    style={{ width: `${user.volume}%` }}
                    animate={{ width: `${user.volume}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* أزرار الإدارة */}
        {canManage && user.id !== currentUser.id && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreVertical className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {room.isBroadcastRoom && (
                <>
                  {isInQueue && (
                    <>
                      <DropdownMenuItem 
                        onClick={() => onManageSpeaker?.(user.id, 'approve')}
                        className="text-green-600"
                      >
                        <UserCheck className="w-4 h-4 mr-2" />
                        الموافقة على الميكروفون
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onManageSpeaker?.(user.id, 'deny')}
                        className="text-red-600"
                      >
                        <UserX className="w-4 h-4 mr-2" />
                        رفض طلب الميكروفون
                      </DropdownMenuItem>
                    </>
                  )}
                  {isSpeaker && (
                    <DropdownMenuItem 
                      onClick={() => onManageSpeaker?.(user.id, 'remove')}
                      className="text-red-600"
                    >
                      <MicOff className="w-4 h-4 mr-2" />
                      إزالة من المتحدثين
                    </DropdownMenuItem>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </motion.div>
  );
};

// المكون الرئيسي
export default function VoiceRoom({
  room,
  currentUser,
  onLeaveRoom,
  onToggleMute,
  onVolumeChange,
  onMicVolumeChange,
  onRequestMic,
  onManageSpeaker
}: VoiceRoomProps) {
  const [settings, setSettings] = useState<VoiceSettings | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [connectionStats, setConnectionStats] = useState({
    latency: 0,
    packetsLost: 0,
    quality: 'good' as 'poor' | 'good' | 'excellent'
  });
  const [voiceLevel, setVoiceLevel] = useState(0);
  const { toast } = useToast();

  // المراجع
  const voiceLevelRef = useRef<NodeJS.Timeout>();

  // تحديث الإعدادات عند التحميل
  useEffect(() => {
    const currentSettings = voiceManager.voiceSettings;
    setSettings(currentSettings);
  }, []);

  // الاستماع لأحداث النظام الصوتي
  useEffect(() => {
    const handleVoiceLevel = (data: { level: number }) => {
      setVoiceLevel(data.level);
      
      // إعادة تعيين مستوى الصوت بعد فترة قصيرة
      if (voiceLevelRef.current) {
        clearTimeout(voiceLevelRef.current);
      }
      voiceLevelRef.current = setTimeout(() => {
        setVoiceLevel(0);
      }, 100);
    };

    const handleStatsUpdated = (data: any) => {
      setConnectionStats({
        latency: Math.round(data.stats.rtt * 1000),
        packetsLost: data.stats.packetsLost,
        quality: data.stats.rtt < 0.1 ? 'excellent' : data.stats.rtt < 0.2 ? 'good' : 'poor'
      });
    };

    voiceManager.on('voice_level', handleVoiceLevel);
    voiceManager.on('stats_updated', handleStatsUpdated);

    return () => {
      voiceManager.off('voice_level', handleVoiceLevel);
      voiceManager.off('stats_updated', handleStatsUpdated);
      if (voiceLevelRef.current) {
        clearTimeout(voiceLevelRef.current);
      }
    };
  }, []);

  // معالجات الأحداث
  const handleVolumeChange = useCallback((value: number[]) => {
    const volume = value[0];
    onVolumeChange(volume);
    if (settings) {
      setSettings({ ...settings, speakerVolume: volume });
    }
  }, [onVolumeChange, settings]);

  const handleMicVolumeChange = useCallback((value: number[]) => {
    const volume = value[0];
    onMicVolumeChange(volume);
    if (settings) {
      setSettings({ ...settings, micVolume: volume });
    }
  }, [onMicVolumeChange, settings]);

  const handleRequestMic = useCallback(() => {
    if (room?.isBroadcastRoom && !room.speakers.includes(currentUser?.id)) {
      onRequestMic?.();
      toast({
        title: 'تم إرسال الطلب',
        description: 'تم إرسال طلب الميكروفون للمشرفين'
      });
    }
  }, [room, currentUser, onRequestMic, toast]);

  if (!room) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-muted-foreground">
          <Phone className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>لا توجد غرفة صوتية نشطة</p>
        </div>
      </div>
    );
  }

  const isMuted = settings?.micEnabled === false;
  const currentUserInRoom = room.connectedUsers.find(u => u.id === currentUser?.id);
  const isCurrentUserSpeaker = room.speakers.includes(currentUser?.id);
  const isCurrentUserInQueue = room.micQueue.includes(currentUser?.id);

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col bg-background">
        {/* رأس الغرفة */}
        <Card className="rounded-none border-x-0 border-t-0">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* أيقونة الغرفة */}
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                  {room.icon ? (
                    <img src={room.icon} alt={room.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg font-bold text-primary">
                      {room.name.charAt(0)}
                    </span>
                  )}
                </div>

                {/* معلومات الغرفة */}
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {room.name}
                    {room.isBroadcastRoom && (
                      <Badge variant="secondary" className="text-orange-600">
                        <Mic className="w-3 h-3 mr-1" />
                        بث مباشر
                      </Badge>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{room.userCount} متصل</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Signal className="w-4 h-4" />
                      <span>{room.audioCodec.toUpperCase()} {room.bitrate}kbps</span>
                    </div>
                    <div className={`flex items-center gap-1 ${
                      connectionStats.quality === 'excellent' ? 'text-green-600' :
                      connectionStats.quality === 'good' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      <Wifi className="w-4 h-4" />
                      <span>{connectionStats.latency}ms</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* أزرار التحكم */}
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSettings(true)}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>إعدادات الصوت</TooltipContent>
                </Tooltip>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onLeaveRoom}
                >
                  <PhoneOff className="w-4 h-4 mr-2" />
                  مغادرة
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* أدوات التحكم السريع */}
        <Card className="rounded-none border-x-0 border-t-0">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              {/* التحكم في الميكروفون */}
              <div className="flex items-center gap-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isMuted ? "destructive" : "default"}
                      size="lg"
                      onClick={onToggleMute}
                      className="rounded-full w-12 h-12 p-0"
                    >
                      {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isMuted ? 'إلغاء كتم الميكروفون' : 'كتم الميكروفون'}
                  </TooltipContent>
                </Tooltip>

                {/* مؤشر مستوى الصوت */}
                <div className="flex items-center gap-2">
                  <Volume1 className="w-4 h-4 text-muted-foreground" />
                  <Progress 
                    value={voiceLevel} 
                    className="w-20 h-2"
                  />
                </div>

                {/* مستوى الميكروفون */}
                <div className="flex items-center gap-2 min-w-[120px]">
                  <Mic className="w-4 h-4 text-muted-foreground" />
                  <Slider
                    value={[settings?.micVolume || 80]}
                    onValueChange={handleMicVolumeChange}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                </div>
              </div>

              {/* التحكم في السماعة */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 min-w-[120px]">
                  <Volume2 className="w-4 h-4 text-muted-foreground" />
                  <Slider
                    value={[settings?.speakerVolume || 80]}
                    onValueChange={handleVolumeChange}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                </div>

                {/* طلب الميكروفون في غرف البث */}
                {room.isBroadcastRoom && !isCurrentUserSpeaker && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={isCurrentUserInQueue ? "secondary" : "outline"}
                        size="sm"
                        onClick={handleRequestMic}
                        disabled={isCurrentUserInQueue}
                      >
                        {isCurrentUserInQueue ? (
                          <>
                            <Hand className="w-4 h-4 mr-2" />
                            في الانتظار
                          </>
                        ) : (
                          <>
                            <Hand className="w-4 h-4 mr-2" />
                            طلب الميكروفون
                          </>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isCurrentUserInQueue ? 'طلبك في قائمة الانتظار' : 'طلب إذن للتحدث'}
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* قائمة المستخدمين */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {/* المتحدثون في غرف البث */}
            {room.isBroadcastRoom && room.speakers.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <Mic className="w-4 h-4" />
                  المتحدثون ({room.speakers.length})
                </h3>
                <div className="grid gap-3">
                  {room.connectedUsers
                    .filter(user => room.speakers.includes(user.id))
                    .map(user => (
                      <VoiceUserCard
                        key={user.id}
                        user={user}
                        currentUser={currentUser}
                        room={room}
                        onManageSpeaker={onManageSpeaker}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* قائمة انتظار الميكروفون */}
            {room.isBroadcastRoom && room.micQueue.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <Hand className="w-4 h-4" />
                  قائمة انتظار الميكروفون ({room.micQueue.length})
                </h3>
                <div className="grid gap-3">
                  {room.connectedUsers
                    .filter(user => room.micQueue.includes(user.id))
                    .map(user => (
                      <VoiceUserCard
                        key={user.id}
                        user={user}
                        currentUser={currentUser}
                        room={room}
                        onManageSpeaker={onManageSpeaker}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* جميع المستخدمين */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                {room.isBroadcastRoom ? 'المستمعون' : 'المتصلون'} ({
                  room.isBroadcastRoom 
                    ? room.connectedUsers.filter(u => !room.speakers.includes(u.id)).length
                    : room.connectedUsers.length
                })
              </h3>
              <div className="grid gap-3">
                <AnimatePresence>
                  {room.connectedUsers
                    .filter(user => !room.isBroadcastRoom || !room.speakers.includes(user.id))
                    .map(user => (
                      <VoiceUserCard
                        key={user.id}
                        user={user}
                        currentUser={currentUser}
                        room={room}
                        onManageSpeaker={onManageSpeaker}
                      />
                    ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* مربع حوار الإعدادات */}
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogContent className="sm:max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle>إعدادات الصوت</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* إعدادات الميكروفون */}
              <div className="space-y-4">
                <h4 className="font-semibold">الميكروفون</h4>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">مستوى الميكروفون</label>
                  <Slider
                    value={[settings?.micVolume || 80]}
                    onValueChange={handleMicVolumeChange}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>
              </div>

              {/* إعدادات السماعة */}
              <div className="space-y-4">
                <h4 className="font-semibold">السماعة</h4>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">مستوى الصوت</label>
                  <Slider
                    value={[settings?.speakerVolume || 80]}
                    onValueChange={handleVolumeChange}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>
              </div>

              {/* إحصائيات الاتصال */}
              <div className="space-y-4">
                <h4 className="font-semibold">إحصائيات الاتصال</h4>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">زمن الاستجابة:</span>
                    <span className="font-medium ml-2">{connectionStats.latency}ms</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">الحزم المفقودة:</span>
                    <span className="font-medium ml-2">{connectionStats.packetsLost}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">جودة الاتصال:</span>
                    <Badge variant="outline" className="ml-2">
                      {connectionStats.quality === 'excellent' ? 'ممتازة' :
                       connectionStats.quality === 'good' ? 'جيدة' : 'ضعيفة'}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">ترميز الصوت:</span>
                    <span className="font-medium ml-2">{room.audioCodec.toUpperCase()}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setShowSettings(false)}>
                  إغلاق
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
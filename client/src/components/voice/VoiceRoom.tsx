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
        relative p-4 rounded-2xl backdrop-blur-sm transition-all duration-500 group
        ${user.isSpeaking 
          ? 'bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 border-2 border-green-300 shadow-2xl shadow-green-200/50' 
          : 'bg-gradient-to-br from-white/80 via-gray-50/80 to-slate-50/80 border border-gray-200/60 hover:border-gray-300/80 shadow-lg hover:shadow-xl'
        }
        ${user.isMuted ? 'opacity-75' : ''}
        hover:scale-[1.02] hover:shadow-2xl
      `}
    >
      {/* مؤشر الكلام المحسن */}
      {user.isSpeaking && (
        <>
          <motion.div
            className="absolute inset-0 rounded-2xl bg-gradient-to-r from-green-400/30 via-emerald-400/20 to-teal-400/30"
            animate={{ 
              scale: [1, 1.02, 1],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute inset-0 rounded-2xl border-2 border-gradient-to-r from-green-400 to-emerald-400"
            animate={{ 
              boxShadow: [
                "0 0 0 0px rgba(34, 197, 94, 0.4)",
                "0 0 0 8px rgba(34, 197, 94, 0.1)",
                "0 0 0 0px rgba(34, 197, 94, 0.4)"
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              background: 'linear-gradient(45deg, rgba(34, 197, 94, 0.2), rgba(16, 185, 129, 0.2))',
              borderImage: 'linear-gradient(45deg, #22c55e, #10b981) 1'
            }}
          />
        </>
      )}

      <div className="flex items-center gap-3 relative z-10">
        {/* صورة المستخدم المحسنة */}
        <div className="relative group">
          <motion.div 
            className="relative w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center ring-2 ring-white shadow-lg group-hover:shadow-xl transition-all duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {user.profileImage ? (
              <img 
                src={user.profileImage} 
                alt={user.username} 
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-sm font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {user.username.charAt(0).toUpperCase()}
              </span>
            )}
          </motion.div>

          {/* مؤشر الاتصال المحسن */}
          <motion.div 
            className={`
              absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-3 border-white shadow-lg
              ${user.isConnected 
                ? 'bg-gradient-to-r from-green-400 to-emerald-500' 
                : 'bg-gradient-to-r from-red-400 to-rose-500'
              }
            `}
            animate={user.isConnected ? {
              boxShadow: [
                "0 0 0 0px rgba(34, 197, 94, 0.7)",
                "0 0 0 4px rgba(34, 197, 94, 0)",
                "0 0 0 0px rgba(34, 197, 94, 0.7)"
              ]
            } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          />

          {/* مؤشر الكلام على الصورة */}
          {user.isSpeaking && (
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-green-400"
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
          )}
        </div>

        {/* معلومات المستخدم المحسنة */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold text-sm truncate bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              {user.displayName || user.username}
            </span>
            <div className="flex items-center gap-1">
              {getRoleIcon(user.role)}
              {isSpeaker && (
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Mic className="w-3 h-3 text-green-500" />
                </motion.div>
              )}
              {isInQueue && (
                <motion.div
                  animate={{ y: [0, -2, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Hand className="w-3 h-3 text-orange-500" />
                </motion.div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            {/* حالة الميكروفون المحسنة */}
            <div className="flex items-center gap-1">
              {user.isMuted ? (
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <MicOff className="w-3 h-3 text-red-500" />
                </motion.div>
              ) : (
                <motion.div
                  animate={user.isSpeaking ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 0.5, repeat: Infinity }}
                >
                  <Mic className="w-3 h-3 text-green-500" />
                </motion.div>
              )}
            </div>

            {/* جودة الاتصال المحسنة */}
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${getConnectionColor(user.connectionQuality)} bg-opacity-10`}>
              {user.connectionQuality === 'poor' ? (
                <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1, repeat: Infinity }}>
                  <WifiOff className="w-3 h-3" />
                </motion.div>
              ) : (
                <Wifi className="w-3 h-3" />
              )}
              <span className="font-medium">{user.latency}ms</span>
            </div>

            {/* مستوى الصوت المحسن */}
            {user.isSpeaking && (
              <div className="flex items-center gap-2 px-2 py-1 bg-green-50 rounded-full">
                <Volume1 className="w-3 h-3 text-green-600" />
                <div className="w-12 h-1.5 bg-green-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full"
                    style={{ width: `${user.volume}%` }}
                    animate={{ 
                      width: `${user.volume}%`,
                      boxShadow: [
                        "0 0 0 0px rgba(34, 197, 94, 0.4)",
                        "0 0 4px 2px rgba(34, 197, 94, 0.2)",
                        "0 0 0 0px rgba(34, 197, 94, 0.4)"
                      ]
                    }}
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
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-8 bg-gradient-to-br from-white/80 via-blue-50/50 to-purple-50/50 rounded-3xl shadow-2xl backdrop-blur-md border border-blue-200/50"
        >
          <motion.div
            animate={{ 
              rotate: [0, 10, -10, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 3, repeat: Infinity }}
            className="mb-6"
          >
            <Phone className="w-16 h-16 mx-auto text-blue-400" />
          </motion.div>
          <h3 className="text-xl font-bold bg-gradient-to-r from-blue-700 to-purple-700 bg-clip-text text-transparent mb-2">
            لا توجد غرفة صوتية نشطة
          </h3>
          <p className="text-gray-600">انضم إلى غرفة صوتية للبدء في المحادثة</p>
        </motion.div>
      </div>
    );
  }

  const isMuted = settings?.micEnabled === false;
  const currentUserInRoom = room.connectedUsers.find(u => u.id === currentUser?.id);
  const isCurrentUserSpeaker = room.speakers.includes(currentUser?.id);
  const isCurrentUserInQueue = room.micQueue.includes(currentUser?.id);

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 backdrop-blur-sm">
        {/* رأس الغرفة */}
        <Card className="rounded-none border-x-0 border-t-0 bg-gradient-to-r from-white/80 via-blue-50/50 to-purple-50/50 backdrop-blur-md shadow-lg">
          <CardHeader className="pb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* أيقونة الغرفة المحسنة */}
                <motion.div 
                  className="w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex items-center justify-center shadow-lg ring-2 ring-white/50"
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {room.icon ? (
                    <img src={room.icon} alt={room.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                      {room.name.charAt(0)}
                    </span>
                  )}
                </motion.div>

                {/* معلومات الغرفة المحسنة */}
                <div>
                  <CardTitle className="text-xl font-bold flex items-center gap-3 bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">
                    {room.name}
                    {room.isBroadcastRoom && (
                      <motion.div
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Badge className="bg-gradient-to-r from-orange-400 to-red-500 text-white shadow-lg border-0 px-3 py-1">
                          <motion.div
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="mr-1"
                          >
                            <Mic className="w-3 h-3" />
                          </motion.div>
                          بث مباشر
                        </Badge>
                      </motion.div>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-4 text-sm mt-3">
                    <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-blue-800">{room.userCount} متصل</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-purple-50 rounded-full">
                      <Signal className="w-4 h-4 text-purple-600" />
                      <span className="font-medium text-purple-800">{room.audioCodec.toUpperCase()} {room.bitrate}kbps</span>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                      connectionStats.quality === 'excellent' ? 'bg-green-50 text-green-800' :
                      connectionStats.quality === 'good' ? 'bg-yellow-50 text-yellow-800' : 'bg-red-50 text-red-800'
                    }`}>
                      <motion.div
                        animate={connectionStats.quality !== 'excellent' ? { scale: [1, 1.1, 1] } : {}}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <Wifi className="w-4 h-4" />
                      </motion.div>
                      <span className="font-medium">{connectionStats.latency}ms</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* أزرار التحكم المحسنة */}
              <div className="flex items-center gap-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowSettings(true)}
                        className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 hover:from-blue-100 hover:to-purple-100 shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <motion.div
                          animate={{ rotate: [0, 180, 360] }}
                          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        >
                          <Settings className="w-4 h-4 text-blue-600" />
                        </motion.div>
                      </Button>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent>إعدادات الصوت</TooltipContent>
                </Tooltip>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    onClick={onLeaveRoom}
                    className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 shadow-lg hover:shadow-xl transition-all duration-300 border-0"
                  >
                    <motion.div
                      animate={{ rotate: [0, -10, 10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="mr-2"
                    >
                      <PhoneOff className="w-4 h-4" />
                    </motion.div>
                    مغادرة
                  </Button>
                </motion.div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* أدوات التحكم السريع */}
        <Card className="rounded-none border-x-0 border-t-0 bg-gradient-to-r from-white/90 via-slate-50/90 to-gray-50/90 backdrop-blur-md shadow-md">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              {/* التحكم في الميكروفون المحسن */}
              <div className="flex items-center gap-6">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Button
                        variant={isMuted ? "destructive" : "default"}
                        size="lg"
                        onClick={onToggleMute}
                        className={`
                          rounded-full w-14 h-14 p-0 shadow-xl transition-all duration-300 border-2
                          ${isMuted 
                            ? 'bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 border-red-300 shadow-red-200/50' 
                            : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 border-green-300 shadow-green-200/50'
                          }
                        `}
                      >
                        <motion.div
                          animate={!isMuted && voiceLevel > 0 ? { 
                            scale: [1, 1.2, 1],
                            rotate: [0, 5, -5, 0]
                          } : {}}
                          transition={{ duration: 0.5, repeat: Infinity }}
                        >
                          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                        </motion.div>
                      </Button>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isMuted ? 'إلغاء كتم الميكروفون' : 'كتم الميكروفون'}
                  </TooltipContent>
                </Tooltip>

                {/* مؤشر مستوى الصوت المحسن */}
                <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl shadow-md">
                  <Volume1 className="w-5 h-5 text-blue-600" />
                  <div className="relative w-24 h-3 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 rounded-full"
                      style={{ width: `${voiceLevel}%` }}
                      animate={{ 
                        width: `${voiceLevel}%`,
                        boxShadow: voiceLevel > 50 ? [
                          "0 0 0 0px rgba(59, 130, 246, 0.5)",
                          "0 0 8px 4px rgba(59, 130, 246, 0.2)",
                          "0 0 0 0px rgba(59, 130, 246, 0.5)"
                        ] : []
                      }}
                      transition={{ duration: 0.1 }}
                    />
                  </div>
                </div>

                {/* مستوى الميكروفون المحسن */}
                <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl shadow-md min-w-[140px]">
                  <Mic className="w-5 h-5 text-green-600" />
                  <div className="flex-1 relative">
                    <Slider
                      value={[settings?.micVolume || 80]}
                      onValueChange={handleMicVolumeChange}
                      max={100}
                      step={1}
                      className="w-full [&>span:first-child]:bg-gradient-to-r [&>span:first-child]:from-green-200 [&>span:first-child]:to-emerald-200 [&>span:first-child]:h-2 [&>span:last-child]:bg-gradient-to-r [&>span:last-child]:from-green-500 [&>span:last-child]:to-emerald-500 [&>span:last-child]:h-2"
                    />
                  </div>
                </div>
              </div>

              {/* التحكم في السماعة المحسن */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-2xl shadow-md min-w-[140px]">
                  <Volume2 className="w-5 h-5 text-orange-600" />
                  <div className="flex-1 relative">
                    <Slider
                      value={[settings?.speakerVolume || 80]}
                      onValueChange={handleVolumeChange}
                      max={100}
                      step={1}
                      className="w-full [&>span:first-child]:bg-gradient-to-r [&>span:first-child]:from-orange-200 [&>span:first-child]:to-yellow-200 [&>span:first-child]:h-2 [&>span:last-child]:bg-gradient-to-r [&>span:last-child]:from-orange-500 [&>span:last-child]:to-yellow-500 [&>span:last-child]:h-2"
                    />
                  </div>
                </div>

                {/* طلب الميكروفون في غرف البث */}
                {room.isBroadcastRoom && !isCurrentUserSpeaker && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          variant={isCurrentUserInQueue ? "secondary" : "outline"}
                          size="sm"
                          onClick={handleRequestMic}
                          disabled={isCurrentUserInQueue}
                          className={`
                            px-6 py-3 rounded-2xl shadow-lg transition-all duration-300 border-2
                            ${isCurrentUserInQueue 
                              ? 'bg-gradient-to-r from-yellow-100 to-orange-100 border-yellow-300 text-yellow-800' 
                              : 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 hover:from-blue-100 hover:to-purple-100 text-blue-800 hover:border-blue-300'
                            }
                          `}
                        >
                          {isCurrentUserInQueue ? (
                            <>
                              <motion.div
                                animate={{ y: [0, -2, 0] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className="mr-2"
                              >
                                <Hand className="w-4 h-4" />
                              </motion.div>
                              في الانتظار
                            </>
                          ) : (
                            <>
                              <motion.div
                                animate={{ rotate: [0, 20, -20, 0] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="mr-2"
                              >
                                <Hand className="w-4 h-4" />
                              </motion.div>
                              طلب الميكروفون
                            </>
                          )}
                        </Button>
                      </motion.div>
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

        {/* قائمة المستخدمين المحسنة */}
        <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-transparent via-slate-50/20 to-blue-50/30">
          <div className="space-y-6">
            {/* المتحدثون في غرف البث */}
            {room.isBroadcastRoom && room.speakers.length > 0 && (
              <div className="mb-8">
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 mb-4 px-4 py-2 bg-gradient-to-r from-green-100 via-emerald-100 to-teal-100 rounded-2xl shadow-md"
                >
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Mic className="w-5 h-5 text-green-600" />
                  </motion.div>
                  <h3 className="text-base font-bold bg-gradient-to-r from-green-700 to-emerald-700 bg-clip-text text-transparent">
                    المتحدثون ({room.speakers.length})
                  </h3>
                  <motion.div
                    className="w-2 h-2 bg-green-500 rounded-full"
                    animate={{ 
                      scale: [1, 1.5, 1],
                      opacity: [0.5, 1, 0.5]
                    }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                </motion.div>
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
              <div className="mb-8">
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 mb-4 px-4 py-2 bg-gradient-to-r from-orange-100 via-yellow-100 to-amber-100 rounded-2xl shadow-md"
                >
                  <motion.div
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <Hand className="w-5 h-5 text-orange-600" />
                  </motion.div>
                  <h3 className="text-base font-bold bg-gradient-to-r from-orange-700 to-amber-700 bg-clip-text text-transparent">
                    قائمة انتظار الميكروفون ({room.micQueue.length})
                  </h3>
                  <motion.div
                    className="w-2 h-2 bg-orange-500 rounded-full"
                    animate={{ 
                      scale: [1, 1.5, 1],
                      opacity: [0.5, 1, 0.5]
                    }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  />
                </motion.div>
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
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 mb-4 px-4 py-2 bg-gradient-to-r from-blue-100 via-purple-100 to-indigo-100 rounded-2xl shadow-md"
              >
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Users className="w-5 h-5 text-blue-600" />
                </motion.div>
                <h3 className="text-base font-bold bg-gradient-to-r from-blue-700 to-purple-700 bg-clip-text text-transparent">
                  {room.isBroadcastRoom ? 'المستمعون' : 'المتصلون'} ({
                    room.isBroadcastRoom 
                      ? room.connectedUsers.filter(u => !room.speakers.includes(u.id)).length
                      : room.connectedUsers.length
                  })
                </h3>
                <motion.div
                  className="w-2 h-2 bg-blue-500 rounded-full"
                  animate={{ 
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                />
              </motion.div>
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

        {/* مربع حوار الإعدادات المحسن */}
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogContent className="sm:max-w-lg bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 backdrop-blur-md border-2 border-blue-200/50 shadow-2xl" dir="rtl">
            <DialogHeader className="pb-6">
              <DialogTitle className="text-xl font-bold bg-gradient-to-r from-blue-700 via-purple-700 to-indigo-700 bg-clip-text text-transparent flex items-center gap-3">
                <motion.div
                  animate={{ rotate: [0, 180, 360] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                >
                  <Settings className="w-6 h-6 text-blue-600" />
                </motion.div>
                إعدادات الصوت
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-8">
              {/* إعدادات الميكروفون المحسنة */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl shadow-md border border-green-200/50"
              >
                <div className="flex items-center gap-3">
                  <Mic className="w-5 h-5 text-green-600" />
                  <h4 className="font-bold text-green-800">الميكروفون</h4>
                </div>
                
                <div className="space-y-3">
                  <label className="text-sm font-medium text-green-700">مستوى الميكروفون</label>
                  <Slider
                    value={[settings?.micVolume || 80]}
                    onValueChange={handleMicVolumeChange}
                    max={100}
                    step={1}
                    className="w-full [&>span:first-child]:bg-green-200 [&>span:first-child]:h-3 [&>span:last-child]:bg-gradient-to-r [&>span:last-child]:from-green-500 [&>span:last-child]:to-emerald-500 [&>span:last-child]:h-3"
                  />
                  <div className="text-xs text-green-600 text-center">{settings?.micVolume || 80}%</div>
                </div>
              </motion.div>

              {/* إعدادات السماعة المحسنة */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-4 p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-2xl shadow-md border border-orange-200/50"
              >
                <div className="flex items-center gap-3">
                  <Volume2 className="w-5 h-5 text-orange-600" />
                  <h4 className="font-bold text-orange-800">السماعة</h4>
                </div>
                
                <div className="space-y-3">
                  <label className="text-sm font-medium text-orange-700">مستوى الصوت</label>
                  <Slider
                    value={[settings?.speakerVolume || 80]}
                    onValueChange={handleVolumeChange}
                    max={100}
                    step={1}
                    className="w-full [&>span:first-child]:bg-orange-200 [&>span:first-child]:h-3 [&>span:last-child]:bg-gradient-to-r [&>span:last-child]:from-orange-500 [&>span:last-child]:to-yellow-500 [&>span:last-child]:h-3"
                  />
                  <div className="text-xs text-orange-600 text-center">{settings?.speakerVolume || 80}%</div>
                </div>
              </motion.div>

              {/* إحصائيات الاتصال المحسنة */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl shadow-md border border-blue-200/50"
              >
                <div className="flex items-center gap-3">
                  <Signal className="w-5 h-5 text-blue-600" />
                  <h4 className="font-bold text-blue-800">إحصائيات الاتصال</h4>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-white/50 rounded-xl">
                    <div className="text-gray-600 mb-1">زمن الاستجابة</div>
                    <div className={`font-bold text-lg ${
                      connectionStats.latency < 50 ? 'text-green-600' :
                      connectionStats.latency < 100 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {connectionStats.latency}ms
                    </div>
                  </div>
                  <div className="p-3 bg-white/50 rounded-xl">
                    <div className="text-gray-600 mb-1">الحزم المفقودة</div>
                    <div className="font-bold text-lg text-blue-600">{connectionStats.packetsLost}</div>
                  </div>
                  <div className="p-3 bg-white/50 rounded-xl">
                    <div className="text-gray-600 mb-1">جودة الاتصال</div>
                    <Badge className={`${
                      connectionStats.quality === 'excellent' ? 'bg-green-500' :
                      connectionStats.quality === 'good' ? 'bg-yellow-500' : 'bg-red-500'
                    } text-white`}>
                      {connectionStats.quality === 'excellent' ? 'ممتازة' :
                       connectionStats.quality === 'good' ? 'جيدة' : 'ضعيفة'}
                    </Badge>
                  </div>
                  <div className="p-3 bg-white/50 rounded-xl">
                    <div className="text-gray-600 mb-1">ترميز الصوت</div>
                    <div className="font-bold text-lg text-purple-600">{room.audioCodec.toUpperCase()}</div>
                  </div>
                </div>
              </motion.div>

              <div className="flex justify-end pt-4">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button 
                    onClick={() => setShowSettings(false)}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300 px-6"
                  >
                    إغلاق
                  </Button>
                </motion.div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
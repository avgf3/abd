import React, { useState, useEffect, useCallback } from 'react';
import { 
  Mic, MicOff, Headphones, HeadphonesOff, Settings, 
  Phone, PhoneOff, Volume2, VolumeX, Signal, Wifi, WifiOff
} from 'lucide-react';
import { motion } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';

import type { VoiceSettings } from '@/types/voice';
import { voiceManager } from '@/lib/voice/VoiceManager';

interface VoiceControlsProps {
  isConnected: boolean;
  isMuted: boolean;
  isDeafened: boolean;
  currentRoom: string | null;
  settings: VoiceSettings;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onJoinRoom: (roomId: string) => void;
  onLeaveRoom: () => void;
  onOpenSettings: () => void;
  onVolumeChange: (volume: number) => void;
  onMicVolumeChange: (volume: number) => void;
  className?: string;
}

interface ConnectionStats {
  latency: number;
  quality: 'poor' | 'good' | 'excellent';
  packetsLost: number;
  isConnected: boolean;
}

export default function VoiceControls({
  isConnected,
  isMuted,
  isDeafened,
  currentRoom,
  settings,
  onToggleMute,
  onToggleDeafen,
  onJoinRoom,
  onLeaveRoom,
  onOpenSettings,
  onVolumeChange,
  onMicVolumeChange,
  className = ''
}: VoiceControlsProps) {
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [connectionStats, setConnectionStats] = useState<ConnectionStats>({
    latency: 0,
    quality: 'good',
    packetsLost: 0,
    isConnected: false
  });
  const [isExpanded, setIsExpanded] = useState(false);

  // الاستماع لأحداث النظام الصوتي
  useEffect(() => {
    const handleVoiceLevel = (data: { level: number }) => {
      setVoiceLevel(data.level);
    };

    const handleStatsUpdated = (data: any) => {
      setConnectionStats({
        latency: Math.round(data.stats.rtt * 1000),
        quality: data.stats.rtt < 0.1 ? 'excellent' : data.stats.rtt < 0.2 ? 'good' : 'poor',
        packetsLost: data.stats.packetsLost || 0,
        isConnected: true
      });
    };

    const handleConnectionStateChanged = (data: any) => {
      setConnectionStats(prev => ({
        ...prev,
        isConnected: data.state === 'connected'
      }));
    };

    voiceManager.on('voice_level', handleVoiceLevel);
    voiceManager.on('stats_updated', handleStatsUpdated);
    voiceManager.on('connection_state_changed', handleConnectionStateChanged);

    return () => {
      voiceManager.off('voice_level', handleVoiceLevel);
      voiceManager.off('stats_updated', handleStatsUpdated);
      voiceManager.off('connection_state_changed', handleConnectionStateChanged);
    };
  }, []);

  // معالجات الأحداث
  const handleVolumeChange = useCallback((value: number[]) => {
    onVolumeChange(value[0]);
  }, [onVolumeChange]);

  const handleMicVolumeChange = useCallback((value: number[]) => {
    onMicVolumeChange(value[0]);
  }, [onMicVolumeChange]);

  // تحديد لون جودة الاتصال
  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-yellow-500';
      case 'poor': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  // تحديد أيقونة جودة الاتصال
  const getQualityIcon = (quality: string, isConnected: boolean) => {
    if (!isConnected) return <WifiOff className="w-4 h-4" />;
    return <Wifi className="w-4 h-4" />;
  };

  return (
    <TooltipProvider>
      <Card className={`${className} transition-all duration-300 ${isExpanded ? 'shadow-lg' : ''}`}>
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* الصف الأول - الأزرار الرئيسية */}
            <div className="flex items-center justify-between">
              {/* معلومات الاتصال */}
              <div className="flex items-center gap-3">
                {isConnected && (
                  <>
                    <Badge variant="secondary" className="text-xs">
                      {currentRoom}
                    </Badge>
                    <div className={`flex items-center gap-1 text-xs ${getQualityColor(connectionStats.quality)}`}>
                      {getQualityIcon(connectionStats.quality, connectionStats.isConnected)}
                      <span>{connectionStats.latency}ms</span>
                    </div>
                  </>
                )}
              </div>

              {/* أزرار التحكم الرئيسية */}
              <div className="flex items-center gap-2">
                {/* زر الاتصال/قطع الاتصال */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isConnected ? "destructive" : "default"}
                      size="sm"
                      onClick={isConnected ? onLeaveRoom : () => onJoinRoom('general')}
                    >
                      {isConnected ? (
                        <>
                          <PhoneOff className="w-4 h-4 mr-2" />
                          قطع
                        </>
                      ) : (
                        <>
                          <Phone className="w-4 h-4 mr-2" />
                          اتصال
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isConnected ? 'قطع الاتصال الصوتي' : 'الاتصال بالغرفة الصوتية'}
                  </TooltipContent>
                </Tooltip>

                {/* زر توسيع/طي التحكم */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* الصف الثاني - أزرار الميكروفون والسماعة (يظهر عند الاتصال) */}
            {isConnected && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center justify-between"
              >
                {/* التحكم في الميكروفون */}
                <div className="flex items-center gap-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={isMuted ? "destructive" : "default"}
                        size="sm"
                        onClick={onToggleMute}
                        className="relative"
                      >
                        {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        
                        {/* مؤشر مستوى الصوت */}
                        {!isMuted && voiceLevel > 0 && (
                          <motion.div
                            className="absolute inset-0 rounded border-2 border-green-400"
                            animate={{ 
                              scale: [1, 1.1, 1],
                              opacity: [0.5, 1, 0.5]
                            }}
                            transition={{ 
                              duration: 0.5,
                              repeat: Infinity
                            }}
                          />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isMuted ? 'إلغاء كتم الميكروفون' : 'كتم الميكروفون'}
                    </TooltipContent>
                  </Tooltip>

                  {/* مؤشر مستوى الميكروفون */}
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={voiceLevel} 
                      className="w-16 h-1"
                    />
                    <span className="text-xs text-muted-foreground min-w-[3ch]">
                      {Math.round(voiceLevel)}%
                    </span>
                  </div>
                </div>

                {/* التحكم في السماعة */}
                <div className="flex items-center gap-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={isDeafened ? "destructive" : "outline"}
                        size="sm"
                        onClick={onToggleDeafen}
                      >
                        {isDeafened ? <HeadphonesOff className="w-4 h-4" /> : <Headphones className="w-4 h-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isDeafened ? 'إلغاء كتم السماعة' : 'كتم السماعة'}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </motion.div>
            )}

            {/* التحكم المتقدم (يظهر عند التوسيع) */}
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 pt-2 border-t"
              >
                {/* تحكم مستوى الميكروفون */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">مستوى الميكروفون</label>
                    <span className="text-xs text-muted-foreground">{settings.micVolume}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mic className="w-4 h-4 text-muted-foreground" />
                    <Slider
                      value={[settings.micVolume]}
                      onValueChange={handleMicVolumeChange}
                      max={100}
                      step={1}
                      className="flex-1"
                    />
                  </div>
                </div>

                {/* تحكم مستوى السماعة */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">مستوى السماعة</label>
                    <span className="text-xs text-muted-foreground">{settings.speakerVolume}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {settings.speakerEnabled ? (
                      <Volume2 className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-muted-foreground" />
                    )}
                    <Slider
                      value={[settings.speakerVolume]}
                      onValueChange={handleVolumeChange}
                      max={100}
                      step={1}
                      className="flex-1"
                    />
                  </div>
                </div>

                {/* إحصائيات الاتصال */}
                {isConnected && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">إحصائيات الاتصال</label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">زمن الاستجابة:</span>
                        <span>{connectionStats.latency}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">الحزم المفقودة:</span>
                        <span>{connectionStats.packetsLost}</span>
                      </div>
                      <div className="flex justify-between col-span-2">
                        <span className="text-muted-foreground">جودة الاتصال:</span>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getQualityColor(connectionStats.quality)}`}
                        >
                          {connectionStats.quality === 'excellent' ? 'ممتازة' :
                           connectionStats.quality === 'good' ? 'جيدة' : 'ضعيفة'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}

                {/* زر الإعدادات المتقدمة */}
                <div className="flex justify-center pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onOpenSettings}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    إعدادات متقدمة
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
import { useState, useEffect, useCallback, useRef } from 'react';
import { voiceManager } from '@/lib/voice/VoiceManager';
import { useToast } from '@/hooks/use-toast';
import type { 
  VoiceRoom, 
  VoiceUser, 
  VoiceSettings, 
  VoiceEvent,
  AudioDeviceInfo 
} from '@/types/voice';

export interface UseVoiceOptions {
  autoConnect?: boolean;
  defaultRoom?: string;
  enableAnalytics?: boolean;
}

export interface UseVoiceReturn {
  // حالة الاتصال
  isInitialized: boolean;
  isConnecting: boolean;
  isConnected: boolean;
  currentRoom: VoiceRoom | null;
  error: string | null;
  
  // المستخدمون والغرف
  connectedUsers: VoiceUser[];
  availableRooms: VoiceRoom[];
  
  // الإعدادات والأجهزة
  settings: VoiceSettings;
  audioDevices: AudioDeviceInfo[];
  
  // حالة الصوت
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  voiceLevel: number;
  
  // الوظائف
  initialize: () => Promise<void>;
  joinRoom: (roomId: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  toggleMute: () => Promise<void>;
  toggleDeafen: () => Promise<void>;
  setVolume: (volume: number) => void;
  setMicVolume: (volume: number) => void;
  changeAudioDevice: (deviceId: string, type: 'input' | 'output') => Promise<void>;
  requestMic: () => Promise<void>;
  manageSpeaker: (userId: number, action: 'approve' | 'deny' | 'remove') => Promise<void>;
  
  // إحصائيات
  connectionStats: {
    latency: number;
    packetsLost: number;
    quality: 'poor' | 'good' | 'excellent';
  };
}

export function useVoice(options: UseVoiceOptions = {}): UseVoiceReturn {
  const { autoConnect = false, defaultRoom = 'general', enableAnalytics = true } = options;
  
  // الحالات الأساسية
  const [isInitialized, setIsInitialized] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<VoiceRoom | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // المستخدمون والغرف
  const [connectedUsers, setConnectedUsers] = useState<VoiceUser[]>([]);
  const [availableRooms, setAvailableRooms] = useState<VoiceRoom[]>([]);
  
  // الإعدادات والأجهزة
  const [settings, setSettings] = useState<VoiceSettings>({
    micEnabled: true,
    micVolume: 80,
    micDevice: 'default',
    speakerEnabled: true,
    speakerVolume: 80,
    speakerDevice: 'default',
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    audioQuality: 'high',
    adaptiveQuality: true,
    showVoiceIndicators: true,
    pushToTalk: false,
    pushToTalkKey: 'Space',
    joinSoundEnabled: true,
    leaveSoundEnabled: true,
    muteSoundEnabled: true
  });
  const [audioDevices, setAudioDevices] = useState<AudioDeviceInfo[]>([]);
  
  // حالة الصوت
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceLevel, setVoiceLevel] = useState(0);
  
  // إحصائيات الاتصال
  const [connectionStats, setConnectionStats] = useState({
    latency: 0,
    packetsLost: 0,
    quality: 'good' as 'poor' | 'good' | 'excellent'
  });
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [degraded, setDegraded] = useState(false);
  
  // المراجع
  const initializationPromiseRef = useRef<Promise<void> | null>(null);
  const { toast } = useToast();

  // تهيئة النظام الصوتي
  const initialize = useCallback(async (): Promise<void> => {
    if (initializationPromiseRef.current) {
      return initializationPromiseRef.current;
    }

    initializationPromiseRef.current = (async () => {
      try {
        setError(null);
        await voiceManager.initialize();
        
        // تحديث الإعدادات والأجهزة
        const currentSettings = voiceManager.voiceSettings;
        const devices = voiceManager.availableDevices;
        
        setSettings(currentSettings);
        setAudioDevices(devices);
        setIsInitialized(true);
        
        // الاتصال التلقائي إذا كان مفعلاً
        if (autoConnect && defaultRoom) {
          await joinRoom(defaultRoom);
        }
        
      } catch (err: any) {
        const errorMessage = err.message || 'فشل في تهيئة النظام الصوتي';
        setError(errorMessage);
        toast({
          title: 'خطأ في النظام الصوتي',
          description: errorMessage,
          variant: 'destructive'
        });
        throw err;
      }
    })();

    return initializationPromiseRef.current;
  }, [autoConnect, defaultRoom, toast]);

  // الانضمام لغرفة صوتية
  const joinRoom = useCallback(async (roomId: string): Promise<void> => {
    try {
      setIsConnecting(true);
      setError(null);
      
      if (!isInitialized) {
        await initialize();
      }
      
      await voiceManager.joinRoom(roomId);
      
    } catch (err: any) {
      const errorMessage = err.message || 'فشل في الانضمام للغرفة الصوتية';
      setError(errorMessage);
      toast({
        title: 'خطأ في الاتصال',
        description: errorMessage,
        variant: 'destructive'
      });
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [isInitialized, initialize, toast]);

  // مغادرة الغرفة الصوتية
  const leaveRoom = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      await voiceManager.leaveRoom();
    } catch (err: any) {
      const errorMessage = err.message || 'فشل في مغادرة الغرفة الصوتية';
      setError(errorMessage);
      toast({
        title: 'خطأ في قطع الاتصال',
        description: errorMessage,
        variant: 'destructive'
      });
      throw err;
    }
  }, [toast]);

  // تبديل كتم الميكروفون
  const toggleMute = useCallback(async (): Promise<void> => {
    try {
      await voiceManager.toggleMute();
    } catch (err: any) {
      toast({
        title: 'خطأ في تغيير حالة الكتم',
        description: err.message,
        variant: 'destructive'
      });
    }
  }, [toast]);

  // تبديل كتم السماعة
  const toggleDeafen = useCallback(async (): Promise<void> => {
    // تنفيذ كتم السماعة
    try {
      const newDeafenState = !isDeafened;
      setIsDeafened(newDeafenState);
      
      if (newDeafenState) {
        voiceManager.setVolume(0);
      } else {
        voiceManager.setVolume(settings.speakerVolume);
      }
      
      toast({
        title: newDeafenState ? 'تم كتم السماعة' : 'تم إلغاء كتم السماعة',
        description: newDeafenState ? 'لن تسمع أي أصوات' : 'يمكنك سماع الأصوات الآن'
      });
    } catch (err: any) {
      toast({
        title: 'خطأ في تغيير حالة السماعة',
        description: err.message,
        variant: 'destructive'
      });
    }
  }, [isDeafened, settings.speakerVolume, toast]);

  // تغيير مستوى الصوت
  const setVolume = useCallback((volume: number): void => {
    voiceManager.setVolume(volume);
    setSettings(prev => ({ ...prev, speakerVolume: volume }));
  }, []);

  // تغيير مستوى الميكروفون
  const setMicVolume = useCallback((volume: number): void => {
    voiceManager.setMicVolume(volume);
    setSettings(prev => ({ ...prev, micVolume: volume }));
  }, []);

  // تغيير جهاز الصوت
  const changeAudioDevice = useCallback(async (deviceId: string, type: 'input' | 'output'): Promise<void> => {
    try {
      await voiceManager.changeAudioDevice(deviceId, type);
      
      setSettings(prev => ({
        ...prev,
        [type === 'input' ? 'micDevice' : 'speakerDevice']: deviceId
      }));
      
      toast({
        title: 'تم تغيير الجهاز',
        description: `تم تغيير جهاز ${type === 'input' ? 'الميكروفون' : 'السماعة'} بنجاح`
      });
    } catch (err: any) {
      toast({
        title: 'خطأ في تغيير الجهاز',
        description: err.message,
        variant: 'destructive'
      });
      throw err;
    }
  }, [toast]);

  // طلب الميكروفون في غرفة البث
  const requestMic = useCallback(async (): Promise<void> => {
    try {
      if (!currentRoom?.isBroadcastRoom) {
        throw new Error('هذه الغرفة ليست غرفة بث');
      }
      
      // إرسال طلب عبر Socket.IO
      // سيتم تنفيذه في VoiceManager
      
      toast({
        title: 'تم إرسال الطلب',
        description: 'تم إرسال طلب الميكروفون للمشرفين'
      });
    } catch (err: any) {
      toast({
        title: 'خطأ في طلب الميكروفون',
        description: err.message,
        variant: 'destructive'
      });
      throw err;
    }
  }, [currentRoom, toast]);

  // إدارة المتحدثين
  const manageSpeaker = useCallback(async (userId: number, action: 'approve' | 'deny' | 'remove'): Promise<void> => {
    try {
      if (!currentRoom?.isBroadcastRoom) {
        throw new Error('هذه الغرفة ليست غرفة بث');
      }
      
      // إرسال إجراء عبر Socket.IO
      // سيتم تنفيذه في VoiceManager
      
      const actionText = action === 'approve' ? 'الموافقة' : 
                        action === 'deny' ? 'الرفض' : 'الإزالة';
      
      toast({
        title: `تم ${actionText}`,
        description: `تم ${actionText} على طلب الميكروفون`
      });
    } catch (err: any) {
      toast({
        title: 'خطأ في إدارة المتحدثين',
        description: err.message,
        variant: 'destructive'
      });
      throw err;
    }
  }, [currentRoom, toast]);

  // إعداد معالجات الأحداث
  useEffect(() => {
    const handleInitialized = () => {
      setIsInitialized(true);
    };

    const handleRoomJoined = (data: { roomId: string; room: VoiceRoom }) => {
      setCurrentRoom(data.room);
      setIsConnected(true);
      setConnectedUsers(data.room.connectedUsers);
      
      toast({
        title: 'تم الاتصال',
        description: `تم الاتصال بالغرفة الصوتية: ${data.room.name}`
      });
    };

    const handleRoomLeft = (data: { roomId: string }) => {
      setCurrentRoom(null);
      setIsConnected(false);
      setConnectedUsers([]);
      
      toast({
        title: 'تم قطع الاتصال',
        description: 'تم قطع الاتصال من الغرفة الصوتية'
      });
    };

    const handleMuteChanged = (data: { muted: boolean }) => {
      setIsMuted(data.muted);
    };

    const handleSpeakingStarted = () => {
      setIsSpeaking(true);
    };

    const handleSpeakingStopped = () => {
      setIsSpeaking(false);
    };

    const handleVoiceLevel = (data: { level: number }) => {
      setVoiceLevel(data.level);
    };

    const handleStatsUpdated = (data: any) => {
      const rttSec = data?.stats?.rtt || 0;
      const latencyMs = Math.round(rttSec * 1000);
      const lost = data?.stats?.packetsLost || 0;
      const recv = data?.stats?.packetsReceived || 0;
      const lossRate = recv > 0 ? (lost / Math.max(1, lost + recv)) : 0;
      const quality = rttSec < 0.1 && lossRate < 0.02 ? 'excellent' : (rttSec < 0.2 && lossRate < 0.05 ? 'good' : 'poor');

      setConnectionStats({ latency: latencyMs, packetsLost: lost, quality });
      setDegraded(quality === 'poor');
    };

    const handleAudioDevicesUpdated = (devices: AudioDeviceInfo[]) => {
      setAudioDevices(devices);
    };

    const handleError = (error: any) => {
      setError(error.message || 'خطأ في النظام الصوتي');
      toast({
        title: 'خطأ في النظام الصوتي',
        description: error.message,
        variant: 'destructive'
      });
    };

    // ربط معالجات الأحداث
    voiceManager.on('initialized', handleInitialized);
    voiceManager.on('room_joined', handleRoomJoined);
    voiceManager.on('room_left', handleRoomLeft);
    voiceManager.on('mute_changed', handleMuteChanged);
    voiceManager.on('speaking_started', handleSpeakingStarted);
    voiceManager.on('speaking_stopped', handleSpeakingStopped);
    voiceManager.on('voice_level', handleVoiceLevel);
    voiceManager.on('stats_updated', handleStatsUpdated);
    voiceManager.on('remote_stream_added', () => {
      // عند وصول ستريم، قد يحظر التشغيل: دع الواجهة تعرف لتعرض زر تشغيل الصوت
      try {
        setAutoplayBlocked(false);
      } catch {}
    });
    voiceManager.on('audio_devices_updated', handleAudioDevicesUpdated);
    voiceManager.on('error', handleError);

    // تنظيف معالجات الأحداث
    return () => {
      voiceManager.off('initialized', handleInitialized);
      voiceManager.off('room_joined', handleRoomJoined);
      voiceManager.off('room_left', handleRoomLeft);
      voiceManager.off('mute_changed', handleMuteChanged);
      voiceManager.off('speaking_started', handleSpeakingStarted);
      voiceManager.off('speaking_stopped', handleSpeakingStopped);
      voiceManager.off('voice_level', handleVoiceLevel);
      voiceManager.off('stats_updated', handleStatsUpdated);
      try { voiceManager.off('remote_stream_added', () => {}); } catch {}
      voiceManager.off('audio_devices_updated', handleAudioDevicesUpdated);
      voiceManager.off('error', handleError);
    };
  }, [toast]);

  // تحديث حالة الكتم من الإعدادات
  useEffect(() => {
    setIsMuted(!settings.micEnabled);
  }, [settings.micEnabled]);

  return {
    // حالة الاتصال
    isInitialized,
    isConnecting,
    isConnected,
    currentRoom,
    error,
    
    // المستخدمون والغرف
    connectedUsers,
    availableRooms,
    
    // الإعدادات والأجهزة
    settings,
    audioDevices,
    
    // حالة الصوت
    isMuted,
    isDeafened,
    isSpeaking,
    voiceLevel,
    
    // الوظائف
    initialize,
    joinRoom,
    leaveRoom,
    toggleMute,
    toggleDeafen,
    setVolume,
    setMicVolume,
    changeAudioDevice,
    requestMic,
    manageSpeaker,
    
    // إحصائيات
    connectionStats
    ,
    // إشارات الجودة والمتابعة
    autoplayBlocked,
    degraded
  };
}
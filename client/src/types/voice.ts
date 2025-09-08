// أنواع بيانات النظام الصوتي المحدث

export interface VoiceUser {
  id: number;
  username: string;
  displayName?: string;
  profileImage?: string;
  role: 'guest' | 'member' | 'owner' | 'admin' | 'moderator';
  
  // خصائص الصوت
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  volume: number; // 0-100
  micQuality: 'low' | 'medium' | 'high';
  
  // حالة الاتصال
  isConnected: boolean;
  connectionQuality: 'poor' | 'good' | 'excellent';
  latency: number; // milliseconds
  
  // إعدادات الميكروفون
  micDevice?: string;
  speakerDevice?: string;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
}

export interface VoiceRoom {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  
  // إعدادات الغرفة
  maxUsers: number;
  isLocked: boolean;
  isPrivate: boolean;
  requireMicPermission: boolean;
  
  // إعدادات الصوت
  audioCodec: 'opus' | 'pcm';
  bitrate: number; // kbps
  sampleRate: 48000 | 44100 | 16000;
  channels: 1 | 2; // mono or stereo
  
  // إعدادات البث
  isBroadcastRoom: boolean;
  hostId?: number;
  speakers: number[];
  micQueue: number[];
  
  // المستخدمون
  connectedUsers: VoiceUser[];
  userCount: number;
  
  // إحصائيات
  createdAt: Date;
  lastActivity: Date;
}

export interface VoiceConnection {
  roomId: string;
  userId: number;
  
  // WebRTC
  peerConnection?: RTCPeerConnection;
  localStream?: MediaStream;
  remoteStreams: Map<number, MediaStream>;
  
  // حالة الاتصال
  connectionState: RTCPeerConnectionState;
  iceConnectionState: RTCIceConnectionState;
  
  // إعدادات الصوت
  audioContext?: AudioContext;
  gainNode?: GainNode;
  analyserNode?: AnalyserNode;
  
  // معلومات الجودة
  stats: {
    packetsLost: number;
    packetsReceived: number;
    bytesReceived: number;
    jitter: number;
    rtt: number;
  };
}

export interface VoiceSettings {
  // إعدادات الميكروفون
  micEnabled: boolean;
  micVolume: number;
  micDevice: string;
  
  // إعدادات السماعة
  speakerEnabled: boolean;
  speakerVolume: number;
  speakerDevice: string;
  
  // إعدادات الصوت المتقدمة
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  
  // إعدادات الجودة
  audioQuality: 'low' | 'medium' | 'high';
  adaptiveQuality: boolean;
  
  // إعدادات الواجهة
  showVoiceIndicators: boolean;
  pushToTalk: boolean;
  pushToTalkKey: string;
  
  // إعدادات الإشعارات
  joinSoundEnabled: boolean;
  leaveSoundEnabled: boolean;
  muteSoundEnabled: boolean;
}

export interface VoiceEvent {
  type: 'user_joined' | 'user_left' | 'user_muted' | 'user_unmuted' | 
        'user_speaking' | 'user_stopped_speaking' | 'connection_quality_changed' |
        'room_created' | 'room_deleted' | 'room_updated' | 'mic_requested' |
        'mic_approved' | 'mic_denied' | 'speaker_added' | 'speaker_removed';
  
  roomId: string;
  userId?: number;
  data?: any;
  timestamp: Date;
}

export interface AudioDeviceInfo {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
  isDefault: boolean;
}

export interface VoicePermissions {
  canSpeak: boolean;
  canMute: boolean;
  canDeafen: boolean;
  canManageUsers: boolean;
  canManageRoom: boolean;
  canKickUsers: boolean;
  canBanUsers: boolean;
}

// WebRTC Configuration
export interface RTCConfig {
  iceServers: RTCIceServer[];
  iceTransportPolicy?: RTCIceTransportPolicy;
  bundlePolicy?: RTCBundlePolicy;
  rtcpMuxPolicy?: RTCRtcpMuxPolicy;
  iceCandidatePoolSize?: number;
}

// Voice Analytics
export interface VoiceAnalytics {
  roomId: string;
  userId: number;
  
  // إحصائيات الجلسة
  sessionDuration: number;
  speakingTime: number;
  mutedTime: number;
  
  // إحصائيات الصوت
  averageVolume: number;
  peakVolume: number;
  
  // إحصائيات الاتصال
  averageLatency: number;
  packetsLost: number;
  connectionDrops: number;
  
  // جودة الصوت
  audioQualityScore: number; // 0-100
}

export type VoiceState = {
  // الغرف
  rooms: Map<string, VoiceRoom>;
  currentRoom: VoiceRoom | null;
  
  // الاتصالات
  connections: Map<string, VoiceConnection>;
  
  // الإعدادات
  settings: VoiceSettings;
  
  // الأجهزة
  audioDevices: AudioDeviceInfo[];
  
  // الصلاحيات
  permissions: VoicePermissions;
  
  // حالة التطبيق
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
  
  // الإحصائيات
  analytics: VoiceAnalytics | null;
};
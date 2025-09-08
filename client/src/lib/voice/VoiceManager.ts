import { EventEmitter } from 'events';
import type { 
  VoiceRoom, 
  VoiceUser, 
  VoiceConnection, 
  VoiceSettings, 
  VoiceEvent,
  AudioDeviceInfo,
  RTCConfig,
  VoiceAnalytics
} from '@/types/voice';

/**
 * مدير النظام الصوتي المتقدم
 * يدير جميع جوانب الصوت في الغرف
 */
export class VoiceManager extends EventEmitter {
  private connections: Map<string, VoiceConnection> = new Map();
  private currentRoom: VoiceRoom | null = null;
  private settings: VoiceSettings;
  private audioDevices: AudioDeviceInfo[] = [];
  private isInitialized = false;
  private analytics: VoiceAnalytics | null = null;
  
  // WebRTC Configuration
  private rtcConfig: RTCConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ],
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require'
  };

  // Audio Context
  private audioContext: AudioContext | null = null;
  private localStream: MediaStream | null = null;
  private gainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private socket: any = null;
  private currentUserId: number | null = null;

  constructor() {
    super();
    
    // الإعدادات الافتراضية
    this.settings = {
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
    };

    this.loadSettings();
    this.setupEventHandlers();
  }

  /**
   * تهيئة النظام الصوتي
   */
  async initialize(): Promise<void> {
    try {
      // تهيئة AudioContext
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // جلب الأجهزة الصوتية
      await this.refreshAudioDevices();
      
      // طلب أذونات الميكروفون
      await this.requestMicrophonePermission();
      
      // تهيئة Socket.IO للصوت
      await this.initializeSocket();
      
      this.isInitialized = true;
      this.emit('initialized');
      
      console.log('✅ تم تهيئة النظام الصوتي بنجاح');
    } catch (error) {
      console.error('❌ خطأ في تهيئة النظام الصوتي:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * تهيئة Socket.IO للصوت
   */
  private async initializeSocket(): Promise<void> {
    try {
      // استيراد Socket.IO من المكتبة الموجودة
      const { socket } = await import('@/lib/socket');
      this.socket = socket;

      // إعداد معالجات أحداث الصوت
      this.socket.on('voice:room-joined', (data: any) => {
        this.emit('room_joined', data);
      });

      this.socket.on('voice:room-left', (data: any) => {
        this.emit('room_left', data);
      });

      this.socket.on('voice:signal', (message: any) => {
        this.handleIncomingSignal(message);
      });

      this.socket.on('voice:user-joined', (data: any) => {
        this.emit('user_joined', data);
      });

      this.socket.on('voice:user-left', (data: any) => {
        this.emit('user_left', data);
      });

      this.socket.on('voice:user-mute-changed', (data: any) => {
        this.emit('user_mute_changed', data);
      });

      this.socket.on('voice:user-speaking-changed', (data: any) => {
        this.emit('user_speaking_changed', data);
      });

      this.socket.on('voice:error', (data: any) => {
        this.emit('error', new Error(data.message));
      });

      console.log('✅ تم تهيئة Socket.IO للصوت');
    } catch (error) {
      console.error('❌ خطأ في تهيئة Socket.IO للصوت:', error);
      throw error;
    }
  }

  /**
   * معالجة الإشارات الواردة
   */
  private async handleIncomingSignal(message: any): Promise<void> {
    try {
      const connection = this.connections.get(message.roomId);
      if (!connection) return;

      const { peerConnection } = connection;

      switch (message.type) {
        case 'offer':
          await peerConnection.setRemoteDescription(new RTCSessionDescription(message.data));
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          
          this.socket.emit('voice:signal', {
            type: 'answer',
            roomId: message.roomId,
            targetUserId: message.userId,
            data: answer
          });
          break;

        case 'answer':
          await peerConnection.setRemoteDescription(new RTCSessionDescription(message.data));
          break;

        case 'ice-candidate':
          await peerConnection.addIceCandidate(new RTCIceCandidate(message.data));
          break;
      }
    } catch (error) {
      console.error('❌ خطأ في معالجة الإشارة:', error);
    }
  }

  /**
   * الانضمام لغرفة صوتية
   */
  async joinRoom(roomId: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // مغادرة الغرفة الحالية إن وجدت
      if (this.currentRoom) {
        await this.leaveRoom();
      }

      // التحقق من صلاحيات الانضمام عبر API
      const response = await fetch(`/api/voice/rooms/${roomId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'فشل في الانضمام للغرفة');
      }

      // إنشاء اتصال جديد
      const connection = await this.createConnection(roomId);
      this.connections.set(roomId, connection);

      // جلب معلومات الغرفة
      this.currentRoom = await this.fetchRoomInfo(roomId);
      
      // إرسال طلب الانضمام عبر Socket.IO
      this.socket.emit('voice:join-room', {
        roomId,
        userId: this.getUserId() // سنحتاج لتنفيذ هذه الدالة
      });
      
      console.log(`✅ تم إرسال طلب الانضمام للغرفة الصوتية: ${roomId}`);
      
    } catch (error) {
      console.error('❌ خطأ في الانضمام للغرفة:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * مغادرة الغرفة الصوتية
   */
  async leaveRoom(): Promise<void> {
    if (!this.currentRoom) return;

    try {
      const roomId = this.currentRoom.id;
      
      // إرسال طلب المغادرة عبر Socket.IO
      this.socket.emit('voice:leave-room');
      
      const connection = this.connections.get(roomId);
      
      if (connection) {
        // إغلاق الاتصال
        await this.closeConnection(connection);
        this.connections.delete(roomId);
      }

      // تنظيف الموارد
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = null;
      }

      this.currentRoom = null;
      this.emit('room_left', { roomId });
      
      console.log(`✅ تم مغادرة الغرفة الصوتية: ${roomId}`);
      
    } catch (error) {
      console.error('❌ خطأ في مغادرة الغرفة:', error);
      this.emit('error', error);
    }
  }

  /**
   * الحصول على معرف المستخدم الحالي
   */
  private getUserId(): number {
    // يمكن الحصول على المعرف من السياق أو التخزين المحلي
    if (this.currentUserId) {
      return this.currentUserId;
    }
    
    // محاولة الحصول على المعرف من التخزين المحلي أو السياق
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        this.currentUserId = user.id;
        return user.id;
      } catch (error) {
        console.error('خطأ في قراءة بيانات المستخدم:', error);
      }
    }
    
    throw new Error('لم يتم العثور على معرف المستخدم');
  }

  /**
   * تعيين معرف المستخدم الحالي
   */
  setUserId(userId: number): void {
    this.currentUserId = userId;
  }

  /**
   * كتم/إلغاء كتم الميكروفون
   */
  async toggleMute(): Promise<void> {
    if (!this.localStream) return;

    try {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        this.settings.micEnabled = audioTrack.enabled;
        
        // إرسال حالة الكتم عبر Socket.IO
        if (this.socket && this.currentRoom) {
          this.socket.emit('voice:toggle-mute', {
            muted: !audioTrack.enabled
          });
        }
        
        await this.saveSettings();
        this.emit('mute_changed', { muted: !audioTrack.enabled });
        
        // تشغيل صوت الكتم
        if (this.settings.muteSoundEnabled) {
          this.playSound(audioTrack.enabled ? 'unmute' : 'mute');
        }
      }
    } catch (error) {
      console.error('❌ خطأ في تغيير حالة الكتم:', error);
      this.emit('error', error);
    }
  }

  /**
   * تغيير مستوى الصوت
   */
  setVolume(volume: number): void {
    if (volume < 0 || volume > 100) return;
    
    this.settings.speakerVolume = volume;
    
    if (this.gainNode) {
      // تحويل النسبة المئوية إلى مستوى صوت
      this.gainNode.gain.value = volume / 100;
    }
    
    this.saveSettings();
    this.emit('volume_changed', { volume });
  }

  /**
   * تغيير مستوى الميكروفون
   */
  setMicVolume(volume: number): void {
    if (volume < 0 || volume > 100) return;
    
    this.settings.micVolume = volume;
    this.saveSettings();
    this.emit('mic_volume_changed', { volume });
  }

  /**
   * تغيير جهاز الصوت
   */
  async changeAudioDevice(deviceId: string, type: 'input' | 'output'): Promise<void> {
    try {
      if (type === 'input') {
        this.settings.micDevice = deviceId;
        
        // إعادة إنشاء stream الميكروفون
        if (this.localStream) {
          await this.createLocalStream();
        }
      } else {
        this.settings.speakerDevice = deviceId;
        // تغيير جهاز الإخراج للعناصر الصوتية
        await this.updateAudioOutputDevice(deviceId);
      }
      
      await this.saveSettings();
      this.emit('audio_device_changed', { deviceId, type });
      
    } catch (error) {
      console.error('❌ خطأ في تغيير جهاز الصوت:', error);
      this.emit('error', error);
    }
  }

  /**
   * إنشاء اتصال جديد
   */
  private async createConnection(roomId: string): Promise<VoiceConnection> {
    const peerConnection = new RTCPeerConnection(this.rtcConfig);
    
    const connection: VoiceConnection = {
      roomId,
      userId: 0, // سيتم تحديثه
      peerConnection,
      remoteStreams: new Map(),
      connectionState: 'new',
      iceConnectionState: 'new',
      stats: {
        packetsLost: 0,
        packetsReceived: 0,
        bytesReceived: 0,
        jitter: 0,
        rtt: 0
      }
    };

    // إعداد معالجات الأحداث
    this.setupConnectionHandlers(connection);
    
    // إضافة الـ stream المحلي
    if (!this.localStream) {
      await this.createLocalStream();
    }
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, this.localStream!);
      });
    }

    return connection;
  }

  /**
   * إنشاء stream الميكروفون المحلي
   */
  private async createLocalStream(): Promise<void> {
    try {
      // إيقاف الـ stream السابق
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
      }

      // إعدادات الصوت المتقدمة حسب الجودة
      const getAudioConstraints = () => {
        const baseConstraints = {
          deviceId: this.settings.micDevice !== 'default' ? 
            { exact: this.settings.micDevice } : undefined,
          echoCancellation: this.settings.echoCancellation,
          noiseSuppression: this.settings.noiseSuppression,
          autoGainControl: this.settings.autoGainControl,
        };

        switch (this.settings.audioQuality) {
          case 'high':
            return {
              ...baseConstraints,
              sampleRate: 48000,
              channelCount: 2,
              bitrate: 128000,
              latency: 0.01 // 10ms
            };
          case 'medium':
            return {
              ...baseConstraints,
              sampleRate: 44100,
              channelCount: 1,
              bitrate: 64000,
              latency: 0.02 // 20ms
            };
          case 'low':
            return {
              ...baseConstraints,
              sampleRate: 16000,
              channelCount: 1,
              bitrate: 32000,
              latency: 0.05 // 50ms
            };
          default:
            return {
              ...baseConstraints,
              sampleRate: 48000,
              channelCount: 1,
              bitrate: 96000
            };
        }
      };

      const constraints: MediaStreamConstraints = {
        audio: getAudioConstraints()
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // إعداد معالجة الصوت
      await this.setupAudioProcessing();
      
    } catch (error) {
      console.error('❌ خطأ في إنشاء stream الميكروفون:', error);
      throw error;
    }
  }

  /**
   * إعداد معالجة الصوت المتقدمة
   */
  private async setupAudioProcessing(): Promise<void> {
    if (!this.audioContext || !this.localStream) return;

    try {
      // إنشاء العقد الصوتية
      const source = this.audioContext.createMediaStreamSource(this.localStream);
      this.gainNode = this.audioContext.createGain();
      this.analyserNode = this.audioContext.createAnalyser();

      // ربط العقد
      source.connect(this.gainNode);
      this.gainNode.connect(this.analyserNode);

      // إعداد المحلل
      this.analyserNode.fftSize = 256;
      this.analyserNode.smoothingTimeConstant = 0.8;

      // تطبيق الإعدادات
      this.gainNode.gain.value = this.settings.micVolume / 100;

      // بدء مراقبة مستوى الصوت
      this.startVoiceDetection();
      
    } catch (error) {
      console.error('❌ خطأ في إعداد معالجة الصوت:', error);
    }
  }

  /**
   * بدء كشف الصوت
   */
  private startVoiceDetection(): void {
    if (!this.analyserNode) return;

    const bufferLength = this.analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    let isSpeaking = false;
    const SPEAKING_THRESHOLD = 30; // عتبة الكلام
    const SILENCE_THRESHOLD = 10; // عتبة الصمت
    
    const checkAudioLevel = () => {
      this.analyserNode!.getByteFrequencyData(dataArray);
      
      // حساب متوسط مستوى الصوت
      const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
      
      // تحديث حالة الكلام
      if (!isSpeaking && average > SPEAKING_THRESHOLD) {
        isSpeaking = true;
        this.emit('speaking_started');
      } else if (isSpeaking && average < SILENCE_THRESHOLD) {
        isSpeaking = false;
        this.emit('speaking_stopped');
      }
      
      // إرسال مستوى الصوت
      this.emit('voice_level', { level: average });
      
      requestAnimationFrame(checkAudioLevel);
    };
    
    checkAudioLevel();
  }

  /**
   * إعداد معالجات أحداث الاتصال
   */
  private setupConnectionHandlers(connection: VoiceConnection): void {
    const { peerConnection } = connection;
    
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        // إرسال ICE candidate للخادم
        this.emit('ice_candidate', {
          roomId: connection.roomId,
          candidate: event.candidate
        });
      }
    };
    
    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream) {
        // تحديد المستخدم من الـ stream
        const userId = this.getUserIdFromStream(remoteStream);
        if (userId) {
          connection.remoteStreams.set(userId, remoteStream);
          this.emit('remote_stream_added', {
            roomId: connection.roomId,
            userId,
            stream: remoteStream
          });
        }
      }
    };
    
    peerConnection.onconnectionstatechange = () => {
      connection.connectionState = peerConnection.connectionState;
      this.emit('connection_state_changed', {
        roomId: connection.roomId,
        state: connection.connectionState
      });
      
      if (connection.connectionState === 'connected') {
        this.startStatsMonitoring(connection);
      }
    };
    
    peerConnection.oniceconnectionstatechange = () => {
      connection.iceConnectionState = peerConnection.iceConnectionState;
      this.emit('ice_connection_state_changed', {
        roomId: connection.roomId,
        state: connection.iceConnectionState
      });
    };
  }

  /**
   * مراقبة إحصائيات الاتصال
   */
  private async startStatsMonitoring(connection: VoiceConnection): Promise<void> {
    const monitorStats = async () => {
      if (connection.connectionState !== 'connected') return;
      
      try {
        const stats = await connection.peerConnection!.getStats();
        
        stats.forEach((report) => {
          if (report.type === 'inbound-rtp' && report.mediaType === 'audio') {
            connection.stats.packetsReceived = report.packetsReceived || 0;
            connection.stats.packetsLost = report.packetsLost || 0;
            connection.stats.bytesReceived = report.bytesReceived || 0;
            connection.stats.jitter = report.jitter || 0;
          }
          
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            connection.stats.rtt = report.currentRoundTripTime || 0;
          }
        });
        
        this.emit('stats_updated', {
          roomId: connection.roomId,
          stats: connection.stats
        });
        
        // جدولة المراقبة التالية
        setTimeout(monitorStats, 5000);
        
      } catch (error) {
        console.error('❌ خطأ في مراقبة الإحصائيات:', error);
      }
    };
    
    monitorStats();
  }

  /**
   * جلب الأجهزة الصوتية المتاحة
   */
  private async refreshAudioDevices(): Promise<void> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      this.audioDevices = devices
        .filter(device => device.kind === 'audioinput' || device.kind === 'audiooutput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `جهاز ${device.kind === 'audioinput' ? 'الميكروفون' : 'السماعة'}`,
          kind: device.kind,
          isDefault: device.deviceId === 'default'
        }));
      
      this.emit('audio_devices_updated', this.audioDevices);
      
    } catch (error) {
      console.error('❌ خطأ في جلب الأجهزة الصوتية:', error);
    }
  }

  /**
   * طلب إذن الميكروفون
   */
  private async requestMicrophonePermission(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      console.log('✅ تم الحصول على إذن الميكروفون');
    } catch (error) {
      console.error('❌ تم رفض إذن الميكروفون:', error);
      throw new Error('يجب السماح بالوصول للميكروفون لاستخدام الغرف الصوتية');
    }
  }

  /**
   * إعداد معالجات الأحداث
   */
  private setupEventHandlers(): void {
    // مراقبة تغيير الأجهزة
    navigator.mediaDevices.addEventListener('devicechange', () => {
      this.refreshAudioDevices();
    });

    // معالجة فقدان التركيز
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.currentRoom) {
        // تقليل جودة الصوت عند فقدان التركيز
        this.adjustQualityForBackground(true);
      } else if (!document.hidden && this.currentRoom) {
        // استعادة الجودة عند العودة
        this.adjustQualityForBackground(false);
      }
    });
  }

  /**
   * تعديل الجودة للخلفية
   */
  private adjustQualityForBackground(isBackground: boolean): void {
    if (!this.settings.adaptiveQuality) return;
    
    // تنفيذ منطق تعديل الجودة
    console.log(`🔧 تعديل الجودة للخلفية: ${isBackground}`);
  }

  /**
   * تشغيل الأصوات
   */
  private playSound(type: 'join' | 'leave' | 'mute' | 'unmute'): void {
    // تنفيذ تشغيل الأصوات
    console.log(`🔊 تشغيل صوت: ${type}`);
  }

  /**
   * حفظ الإعدادات
   */
  private async saveSettings(): Promise<void> {
    try {
      localStorage.setItem('voice_settings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('❌ خطأ في حفظ الإعدادات:', error);
    }
  }

  /**
   * تحميل الإعدادات
   */
  private loadSettings(): void {
    try {
      const saved = localStorage.getItem('voice_settings');
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error('❌ خطأ في تحميل الإعدادات:', error);
    }
  }

  /**
   * مساعدات إضافية
   */
  private async fetchRoomInfo(roomId: string): Promise<VoiceRoom> {
    try {
      const response = await fetch(`/api/voice/rooms/${roomId}`);
      if (!response.ok) {
        throw new Error('فشل في جلب معلومات الغرفة');
      }
      const data = await response.json();
      return data.data.room;
    } catch (error) {
      console.error('خطأ في جلب معلومات الغرفة:', error);
      throw error;
    }
  }

  private async startConnection(connection: VoiceConnection): Promise<void> {
    try {
      const { peerConnection, roomId, userId } = connection;
      
      // إنشاء العرض (offer) للاتصال
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      });
      
      await peerConnection.setLocalDescription(offer);
      
      // إرسال العرض عبر Socket.IO
      this.emit('ice_candidate', {
        type: 'offer',
        roomId,
        userId,
        data: offer
      });
      
    } catch (error) {
      console.error('خطأ في بدء الاتصال:', error);
      throw error;
    }
  }

  private async closeConnection(connection: VoiceConnection): Promise<void> {
    try {
      // تنظيف الاتصال
      if (connection.peerConnection) {
        connection.peerConnection.close();
      }
      
      // تنظيف التدفقات البعيدة
      connection.remoteStreams.clear();
      
      // تنظيف الذاكرة
      connection.localStream = undefined;
      connection.audioContext = undefined;
      connection.gainNode = undefined;
      connection.analyserNode = undefined;
      
      console.log('✅ تم تنظيف موارد الاتصال');
    } catch (error) {
      console.error('❌ خطأ في تنظيف الاتصال:', error);
    }
  }

  /**
   * تنظيف شامل للموارد
   */
  cleanup(): void {
    try {
      // إيقاف جميع الاتصالات
      for (const [roomId, connection] of this.connections.entries()) {
        this.closeConnection(connection);
      }
      this.connections.clear();
      
      // تنظيف الصوت المحلي
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          track.stop();
        });
        this.localStream = null;
      }
      
      // تنظيف AudioContext
      if (this.audioContext && this.audioContext.state !== 'closed') {
        this.audioContext.close();
        this.audioContext = null;
      }
      
      // إزالة معالجات الأحداث
      if (this.socket) {
        this.socket.removeAllListeners();
      }
      
      // إعادة تعيين الحالات
      this.currentRoom = null;
      this.isInitialized = false;
      
      console.log('✅ تم تنظيف جميع موارد النظام الصوتي');
    } catch (error) {
      console.error('❌ خطأ في تنظيف الموارد:', error);
    }
  }

  private getUserIdFromStream(stream: MediaStream): number | null {
    // تنفيذ تحديد المستخدم من الـ stream
    return null;
  }

  private async updateAudioOutputDevice(deviceId: string): Promise<void> {
    // تنفيذ تغيير جهاز الإخراج
  }

  // Getters
  get currentRoomInfo(): VoiceRoom | null {
    return this.currentRoom;
  }

  get voiceSettings(): VoiceSettings {
    return { ...this.settings };
  }

  get availableDevices(): AudioDeviceInfo[] {
    return [...this.audioDevices];
  }

  get isInRoom(): boolean {
    return this.currentRoom !== null;
  }

  get isMuted(): boolean {
    return !this.settings.micEnabled || !this.localStream?.getAudioTracks()[0]?.enabled;
  }
}

// تصدير instance واحد
export const voiceManager = new VoiceManager();
// WebRTC Audio Manager for Broadcast Rooms
import { Socket } from 'socket.io-client';

interface PeerConnection {
  peer: RTCPeerConnection;
  stream?: MediaStream;
}

export class WebRTCAudioManager {
  private socket: Socket;
  private localStream: MediaStream | null = null;
  private peers: Map<number, PeerConnection> = new Map();
  private roomId: string;
  private userId: number;
  private isSpeaker: boolean = false;
  private audioElement: HTMLAudioElement | null = null;

  constructor(socket: Socket, roomId: string, userId: number) {
    this.socket = socket;
    this.roomId = roomId;
    this.userId = userId;
    this.setupSocketListeners();
  }

  private setupSocketListeners() {
    // استقبال عرض من متحدث
    this.socket.on('webrtc-offer', async (data: { from: number; offer: RTCSessionDescriptionInit }) => {
      console.log('استقبال عرض WebRTC من:', data.from);
      await this.handleOffer(data.from, data.offer);
    });

    // استقبال إجابة
    this.socket.on('webrtc-answer', async (data: { from: number; answer: RTCSessionDescriptionInit }) => {
      console.log('استقبال إجابة WebRTC من:', data.from);
      await this.handleAnswer(data.from, data.answer);
    });

    // استقبال ICE candidate
    this.socket.on('webrtc-ice-candidate', async (data: { from: number; candidate: RTCIceCandidateInit }) => {
      console.log('استقبال ICE candidate من:', data.from);
      await this.handleIceCandidate(data.from, data.candidate);
    });

    // متحدث غادر
    this.socket.on('speaker-left', (data: { userId: number }) => {
      console.log('متحدث غادر:', data.userId);
      this.removePeer(data.userId);
    });
  }

  // بدء البث كمتحدث
  async startBroadcasting(): Promise<boolean> {
    try {
      // الحصول على صوت المايكروفون
      this.localStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }, 
        video: false 
      });
      
      this.isSpeaker = true;
      
      // إرسال إشارة للخادم أن المتحدث بدأ البث
      this.socket.emit('start-broadcasting', { roomId: this.roomId });
      
      return true;
    } catch (error) {
      console.error('خطأ في الوصول للمايكروفون:', error);
      return false;
    }
  }

  // إيقاف البث
  stopBroadcasting() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    this.isSpeaker = false;
    
    // إغلاق جميع الاتصالات
    this.peers.forEach((_, userId) => this.removePeer(userId));
    
    // إرسال إشارة للخادم
    this.socket.emit('stop-broadcasting', { roomId: this.roomId });
  }

  // إنشاء اتصال peer جديد
  private async createPeerConnection(userId: number): Promise<RTCPeerConnection> {
    const config: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    const peer = new RTCPeerConnection(config);

    // إضافة المسارات المحلية إذا كنا متحدث
    if (this.isSpeaker && this.localStream) {
      this.localStream.getTracks().forEach(track => {
        peer.addTrack(track, this.localStream!);
      });
    }

    // معالجة ICE candidates
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('webrtc-ice-candidate', {
          to: userId,
          candidate: event.candidate
        });
      }
    };

    // معالجة المسارات الواردة (للمستمعين)
    peer.ontrack = (event) => {
      console.log('استقبال مسار صوتي من:', userId);
      const [remoteStream] = event.streams;
      
      // تشغيل الصوت
      if (!this.audioElement) {
        this.audioElement = new Audio();
        this.audioElement.autoplay = true;
      }
      
      this.audioElement.srcObject = remoteStream;
    };

    this.peers.set(userId, { peer });
    return peer;
  }

  // معالجة عرض WebRTC
  private async handleOffer(fromUserId: number, offer: RTCSessionDescriptionInit) {
    const peer = await this.createPeerConnection(fromUserId);
    
    await peer.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    
    this.socket.emit('webrtc-answer', {
      to: fromUserId,
      answer: answer
    });
  }

  // معالجة إجابة WebRTC
  private async handleAnswer(fromUserId: number, answer: RTCSessionDescriptionInit) {
    const connection = this.peers.get(fromUserId);
    if (connection) {
      await connection.peer.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  // معالجة ICE candidate
  private async handleIceCandidate(fromUserId: number, candidate: RTCIceCandidateInit) {
    const connection = this.peers.get(fromUserId);
    if (connection) {
      await connection.peer.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }

  // إرسال عرض لمستمع جديد
  async sendOfferToListener(listenerId: number) {
    if (!this.isSpeaker) return;
    
    const peer = await this.createPeerConnection(listenerId);
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    
    this.socket.emit('webrtc-offer', {
      to: listenerId,
      offer: offer
    });
  }

  // إزالة اتصال peer
  private removePeer(userId: number) {
    const connection = this.peers.get(userId);
    if (connection) {
      connection.peer.close();
      this.peers.delete(userId);
    }
  }

  // تنظيف
  cleanup() {
    this.stopBroadcasting();
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.srcObject = null;
      this.audioElement = null;
    }
  }
}
import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { ChatUser } from '@/types/chat';

interface NotificationEventDetail {
  senderName?: string;
  senderId?: number;
  friendName?: string;
  targetUserId?: number;
  [key: string]: any;
}

interface NotificationOptions {
  title: string;
  description: string;
  variant?: 'default' | 'destructive';
  playSound?: boolean;
}

export function useNotificationManager(currentUser: ChatUser | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio
  useEffect(() => {
    const audio = new Audio('/notification.mp3');
    audio.volume = 0.5;

    const onError = () => {
      // Fallback: use Web Audio API beep if mp3 cannot be decoded
      audioRef.current = null;
    };

    audio.addEventListener('error', onError, { once: true });
    audioRef.current = audio;

    return () => {
      audio.removeEventListener('error', onError as any);
    };
  }, []);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    const tryBeep = () => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
        gain.gain.setValueAtTime(0.001, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.03, audioContext.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.25);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.25);
      } catch {}
    };

    if (audioRef.current) {
      audioRef.current.play().catch(tryBeep);
    } else {
      tryBeep();
    }
  }, []);

  // Show toast notification
  const showToast = useCallback((options: NotificationOptions) => {
    toast({
      title: options.title,
      description: options.description,
      variant: options.variant || 'default'
    });

    if (options.playSound) {
      playNotificationSound();
    }
  }, [toast, playNotificationSound]);

  // Update notification queries
  const updateNotificationQueries = useCallback(() => {
    if (!currentUser?.id) return;

    queryClient.invalidateQueries({
      queryKey: ['/api/notifications', currentUser.id]
    });
    queryClient.invalidateQueries({
      queryKey: ['/api/notifications/unread-count', currentUser.id]
    });
  }, [currentUser?.id, queryClient]);

  // Update friend queries
  const updateFriendQueries = useCallback(() => {
    if (!currentUser?.id) return;

    queryClient.invalidateQueries({
      queryKey: ['/api/friends', currentUser.id]
    });
    queryClient.invalidateQueries({
      queryKey: ['/api/friend-requests/incoming', currentUser.id]
    });
    queryClient.invalidateQueries({
      queryKey: ['/api/friend-requests/outgoing', currentUser.id]
    });
  }, [currentUser?.id, queryClient]);

  // Update all notification-related queries
  const updateAllQueries = useCallback(() => {
    updateNotificationQueries();
    updateFriendQueries();
  }, [updateNotificationQueries, updateFriendQueries]);

  // Handle notification received event
  const handleNotificationReceived = useCallback((event: CustomEvent<NotificationEventDetail>) => {
    updateNotificationQueries();
  }, [updateNotificationQueries]);

  // Handle friend request received event
  const handleFriendRequestReceived = useCallback((event: CustomEvent<NotificationEventDetail>) => {
    updateAllQueries();
    
    showToast({
      title: "طلب صداقة جديد",
      description: `${event.detail.senderName} يريد إضافتك كصديق`,
      playSound: true
    });
  }, [updateAllQueries, showToast]);

  // Handle friend request accepted event
  const handleFriendRequestAccepted = useCallback((event: CustomEvent<NotificationEventDetail>) => {
    updateAllQueries();
    
    showToast({
      title: "تم قبول طلب الصداقة",
      description: `${event.detail.friendName} قبل طلب صداقتك`,
      playSound: true
    });
  }, [updateAllQueries, showToast]);

  // Handle friend added event
  const handleFriendAdded = useCallback((event: CustomEvent<NotificationEventDetail>) => {
    updateFriendQueries();
  }, [updateFriendQueries]);

  // Setup event listeners
  useEffect(() => {
    if (!currentUser?.id) return;

    const events = [
      { name: 'notificationReceived', handler: handleNotificationReceived },
      { name: 'friendRequestReceived', handler: handleFriendRequestReceived },
      { name: 'friendRequestAccepted', handler: handleFriendRequestAccepted },
      { name: 'friendAdded', handler: handleFriendAdded }
    ];

    events.forEach(({ name, handler }) => {
      window.addEventListener(name, handler as EventListener);
    });

    return () => {
      events.forEach(({ name, handler }) => {
        window.removeEventListener(name, handler as EventListener);
      });
    };
  }, [
    currentUser?.id,
    handleNotificationReceived,
    handleFriendRequestReceived,
    handleFriendRequestAccepted,
    handleFriendAdded
  ]);

  // Create notification in database
  const createNotification = useCallback(async (notificationData: {
    userId: number;
    type: string;
    title: string;
    message: string;
    data?: any;
  }) => {
    try {
      return await apiRequest('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationData)
      });
    } catch (error) {
      console.error('Failed to create notification:', error);
      throw error;
    }
  }, []);

  // Standard notification creators
  const createFriendRequestNotification = useCallback(async (
    receiverId: number, 
    senderName: string, 
    senderId: number,
    requestId: number
  ) => {
    return createNotification({
      userId: receiverId,
      type: 'friendRequest',
      title: '👫 طلب صداقة جديد',
      message: `أرسل ${senderName} طلب صداقة إليك`,
      data: { requestId, senderId, senderName }
    });
  }, [createNotification]);

  const createFriendAcceptedNotification = useCallback(async (
    userId: number,
    friendName: string,
    friendId: number
  ) => {
    return createNotification({
      userId,
      type: 'friendAccepted',
      title: '✅ تم قبول طلب الصداقة',
      message: `قبل ${friendName} طلب صداقتك`,
      data: { friendId, friendName }
    });
  }, [createNotification]);

  const createSystemNotification = useCallback(async (
    userId: number,
    title: string,
    message: string,
    data?: any
  ) => {
    return createNotification({
      userId,
      type: 'system',
      title,
      message,
      data
    });
  }, [createNotification]);

  // Standard toast notifications
  const showSuccessToast = useCallback((message: string, title?: string) => {
    showToast({
      title: title || "تم بنجاح",
      description: message,
      variant: 'default'
    });
  }, [showToast]);

  const showErrorToast = useCallback((message: string, title?: string) => {
    showToast({
      title: title || "خطأ",
      description: message,
      variant: 'destructive'
    });
  }, [showToast]);

  const showWarningToast = useCallback((message: string, title?: string) => {
    showToast({
      title: title || "تحذير",
      description: message,
      variant: 'default'
    });
  }, [showToast]);

  return {
    // Core functions
    showToast,
    showSuccessToast,
    showErrorToast,
    showWarningToast,
    playNotificationSound,
    
    // Query updates
    updateNotificationQueries,
    updateFriendQueries,
    updateAllQueries,
    
    // Notification creators
    createNotification,
    createFriendRequestNotification,
    createFriendAcceptedNotification,
    createSystemNotification
  };
}
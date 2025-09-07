import { useState, useEffect } from 'react';
import { isSocketConnected, forceReconnect } from '@/lib/socket';

declare global {
  interface Window {
    isSocketConnected: () => boolean;
  }
}

export function useConnectionStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [showReconnectButton, setShowReconnectButton] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 الشبكة متاحة');
      setIsOnline(true);
      setShowReconnectButton(false);
    };

    const handleOffline = () => {
      console.log('📡 الشبكة غير متاحة');
      setIsOnline(false);
      setIsSocketConnected(false);
      setShowReconnectButton(true);
    };

    // مراقبة حالة الشبكة
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // مراقبة حالة Socket
    const checkSocketStatus = () => {
      const connected = isSocketConnected();
      setIsSocketConnected(connected);
      
      // إظهار زر إعادة الاتصال إذا كانت الشبكة متاحة لكن Socket غير متصل
      if (isOnline && !connected) {
        setShowReconnectButton(true);
      } else if (connected) {
        setShowReconnectButton(false);
      }
    };

    // إتاحة الوصول للدالة من وحدة التحكم للتشخيص
    if (typeof window !== 'undefined') {
      window.isSocketConnected = isSocketConnected;
    }

    // فحص دوري لحالة Socket
    const interval = setInterval(checkSocketStatus, 2000);
    checkSocketStatus(); // فحص فوري

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [isOnline]);

  const reconnect = () => {
    console.log('🔄 محاولة إعادة الاتصال يدوياً');
    forceReconnect();
    setShowReconnectButton(false);
  };

  return {
    isOnline,
    isSocketConnected,
    showReconnectButton,
    reconnect,
    connectionStatus: !isOnline ? 'offline' : !isSocketConnected ? 'disconnected' : 'connected'
  };
}
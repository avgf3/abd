import { Wifi, WifiOff, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './button';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';

export default function ConnectionStatus() {
  const { isOnline, isSocketConnected, showReconnectButton, reconnect, connectionStatus } = useConnectionStatus();

  // لا نعرض شيئاً إذا كان كل شيء يعمل بشكل طبيعي
  if (connectionStatus === 'connected') {
    return null;
  }

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className={`
        flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg text-sm font-medium
        ${connectionStatus === 'offline' 
          ? 'bg-red-500/90 text-white' 
          : 'bg-yellow-500/90 text-white'
        }
        backdrop-blur-sm border animate-fade-in
      `}>
        {connectionStatus === 'offline' ? (
          <>
            <WifiOff className="h-4 w-4" />
            <span>لا توجد شبكة</span>
          </>
        ) : (
          <>
            <AlertCircle className="h-4 w-4" />
            <span>انقطع الاتصال بالخادم</span>
            {showReconnectButton && (
              <Button
                size="sm"
                variant="outline"
                className="ml-2 h-6 text-xs bg-white/20 border-white/30 hover:bg-white/30"
                onClick={reconnect}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                إعادة الاتصال
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
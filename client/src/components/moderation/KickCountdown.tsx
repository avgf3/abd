import { useState, useEffect } from 'react';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from '@/components/ui/alert-dialog';

interface KickCountdownProps {
  isVisible: boolean;
  onClose: () => void;
  durationMinutes?: number;
}

export default function KickCountdown({ isVisible, onClose, durationMinutes = 15 }: KickCountdownProps) {
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60); // seconds

  useEffect(() => {
    if (!isVisible) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose();
          window.location.reload();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isVisible, onClose]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AlertDialog open={isVisible}>
      <AlertDialogContent className="max-w-md bg-red-950/95 border-red-800">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-100 text-center">
            ⏰ تم طردك من الدردشة
          </AlertDialogTitle>
          <AlertDialogDescription className="text-red-200 text-center space-y-4">
            <div className="text-lg font-bold">
              الوقت المتبقي: {formatTime(timeLeft)}
            </div>
            <div>
              سيتم إعادة تحميل الصفحة تلقائياً عند انتهاء المدة
            </div>
            <div className="text-sm opacity-75">
              يمكنك العودة للدردشة بعد انتهاء هذه المدة
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
      </AlertDialogContent>
    </AlertDialog>
  );
}
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface KickCountdownProps {
  isVisible: boolean;
  onClose: () => void;
  durationMinutes: number;
}

export default function KickCountdown({ isVisible, onClose, durationMinutes }: KickCountdownProps) {
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60); // بالثواني

  useEffect(() => {
    if (!isVisible) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          onClose();
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
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" dir="rtl">
      <Card className="bg-red-900 border-red-700 text-white max-w-md w-full mx-4">
        <CardHeader>
          <CardTitle className="text-center text-red-200">
            ⏰ تم طردك مؤقتاً
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div>
            <div className="text-4xl font-bold text-red-200 mb-2">
              {formatTime(timeLeft)}
            </div>
            <p className="text-red-300">
              سيتم السماح لك بالعودة بعد انتهاء هذا الوقت
            </p>
          </div>
          
          <Button
            onClick={onClose}
            variant="outline"
            className="border-red-500 text-red-200 hover:bg-red-800"
          >
            فهمت
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, AlertTriangle } from 'lucide-react';

interface KickNotificationProps {
  isVisible: boolean;
  durationMinutes: number;
  onClose: () => void;
}

export default function KickNotification({ isVisible, durationMinutes, onClose }: KickNotificationProps) {
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60); // تحويل إلى ثوان

  useEffect(() => {
    if (!isVisible) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // انتهى الوقت - إعادة تحميل الصفحة
          clearInterval(timer);
          window.location.reload();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isVisible]);

  if (!isVisible) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center">
      <Card className="w-96 bg-orange-900/95 border-orange-700 shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-orange-200 flex items-center justify-center gap-2">
            <Clock className="w-6 h-6 text-orange-500" />
            تم طردك مؤقتاً
          </CardTitle>
        </CardHeader>
        
        <CardContent className="text-center space-y-4">
          <div className="p-4 bg-orange-800/50 rounded-lg">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-orange-400" />
            <p className="text-orange-200 font-semibold">
              تم طردك من الموقع لمدة {durationMinutes} دقيقة
            </p>
          </div>
          
          <div className="text-2xl font-mono text-orange-300 bg-orange-800/30 p-4 rounded-lg">
            {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
          </div>
          
          <div className="text-sm text-orange-300">
            <p>سيتم إعادة تحميل الصفحة تلقائياً عند انتهاء المدة</p>
            <p>يمكنك العودة بعد انتهاء الوقت المحدد</p>
          </div>
          
          <div className="pt-4 border-t border-orange-700">
            <Button 
              onClick={() => window.location.reload()}
              variant="outline"
              className="w-full border-orange-600 text-orange-400 hover:bg-orange-800"
            >
              إعادة تحميل الصفحة
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
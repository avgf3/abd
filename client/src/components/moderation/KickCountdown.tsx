import { Clock, AlertTriangle } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { Badge } from '@/components/ui/badge';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCountdownTime } from '@/utils/timeUtils';

interface KickCountdownProps {
  isVisible: boolean;
  onClose: () => void;
  durationMinutes: number;
}

export default function KickCountdown({ isVisible, onClose, durationMinutes }: KickCountdownProps) {
  const [, setLocation] = useLocation();
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60); // بالثواني

  useEffect(() => {
    if (!isVisible) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose();
          // إعادة التوجيه للصفحة الرئيسية عند انتهاء الوقت
          setTimeout(() => {
            try { setLocation('/'); } catch { window.location.href = '/'; }
          }, 1000);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isVisible, onClose]);

  // تم نقل دالة formatTime إلى utils/timeUtils.ts كـ formatCountdownTime

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
      <Card className="w-96 bg-red-900/95 border-red-700 shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-red-200 flex items-center justify-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            تم طردك من الدردشة
          </CardTitle>
        </CardHeader>

        <CardContent className="text-center space-y-4">
          <div className="p-4 bg-red-800/50 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-red-300" />
              <span className="text-red-200">الوقت المتبقي:</span>
            </div>
            <div className="text-3xl font-bold text-red-400 font-mono">
              {formatCountdownTime(timeLeft)}
            </div>
          </div>

          <p className="text-red-200 text-sm">
            لا يمكنك الدخول للدردشة حتى انتهاء المدة المحددة. سيتم إعادتك للصفحة الرئيسية عند انتهاء
            الوقت.
          </p>

          <Badge variant="destructive" className="bg-red-700">
            طرد مؤقت - {durationMinutes} دقيقة
          </Badge>

          <div className="pt-4 border-t border-red-700">
            <Button
              onClick={onClose}
              variant="outline"
              className="border-red-600 text-red-300 hover:bg-red-800"
            >
              إخفاء هذه النافذة
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

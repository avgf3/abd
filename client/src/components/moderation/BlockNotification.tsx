import { Ban, AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BlockNotificationProps {
  isVisible: boolean;
  reason: string;
  onClose: () => void;
}

export default function BlockNotification({ isVisible, reason, onClose }: BlockNotificationProps) {
  const [, setLocation] = useLocation();
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center">
      <Card className="w-96 bg-red-900/95 border-red-700 shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-red-200 flex items-center justify-center gap-2">
            <Ban className="w-6 h-6 text-red-500" />
            تم حجبك نهائياً
          </CardTitle>
        </CardHeader>

        <CardContent className="text-center space-y-4">
          <div className="p-4 bg-red-800/50 rounded-lg">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-400" />
            <p className="text-red-200 font-semibold">تم حجبك من الموقع نهائياً</p>
          </div>

          <div className="text-sm text-red-300 space-y-2">
            <p>
              <strong>السبب:</strong> {reason}
            </p>
            <p>تم حجب عنوان IP والجهاز الخاص بك</p>
            <p>لا يمكنك الدخول مرة أخرى بأي اسم مستخدم</p>
          </div>

          <div className="pt-4 border-t border-red-700">
            <Button
              onClick={() => {
                onClose();
                try { setLocation('/'); } catch { window.location.href = '/'; }
              }}
              variant="destructive"
              className="w-full"
            >
              العودة للصفحة الرئيسية
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

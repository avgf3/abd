import { CheckCircle, Gift } from 'lucide-react';
import { useEffect } from 'react';

interface PointsSentNotificationProps {
  show: boolean;
  points: number;
  recipientName: string;
  onClose: () => void;
}

export default function PointsSentNotification({
  show,
  points,
  recipientName,
  onClose,
}: PointsSentNotificationProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000); // إخفاء بعد 4 ثوان

      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] animate-fade-in">
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-4 rounded-lg shadow-lg border border-green-400 min-w-[300px] max-w-sm">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Gift className="w-6 h-6 text-white" />
            </div>
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-200" />
              <h4 className="font-bold text-sm">تم إرسال النقاط!</h4>
            </div>

            <p className="text-sm text-green-100">
              تم إرسال <span className="font-bold">{points}</span> نقطة إلى{' '}
              <span className="font-bold">{recipientName}</span> بنجاح
            </p>
          </div>

          <button
            onClick={onClose}
            className="flex-shrink-0 text-white/80 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* شريط التقدم */}
        <div className="mt-3 h-1 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white/60 rounded-full animate-countdown"
            style={{
              animation: 'countdown 4s linear forwards',
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes countdown {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { ChatUser } from '@/types/chat';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportedUser: ChatUser | null;
  reportedMessage?: { content: string; id: number } | null;
  currentUser: ChatUser | null;
}

export default function ReportModal({ 
  isOpen, 
  onClose, 
  reportedUser, 
  reportedMessage, 
  currentUser 
}: ReportModalProps) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!reason || !reportedUser || !currentUser) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار سبب التبليغ",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest('/api/moderation/report', {
        method: 'POST',
        body: {
          reporterId: currentUser.id,
          reportedUserId: reportedUser.id,
          reason,
          content: reportedMessage ? reportedMessage.content : details,
          messageId: reportedMessage?.id
        }
      });

      toast({
        title: "تم الإرسال",
        description: "تم إرسال التبليغ بنجاح وسيتم مراجعته",
      });

      // إعادة تعيين النموذج
      setReason('');
      setDetails('');
      onClose();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء إرسال التبليغ",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const reportReasons = [
    { value: 'spam', label: 'رسائل مزعجة أو تكرار' },
    { value: 'harassment', label: 'تحرش أو إزعاج' },
    { value: 'inappropriate', label: 'محتوى غير لائق' },
    { value: 'offensive', label: 'لغة مسيئة أو بذيئة' },
    { value: 'impersonation', label: 'انتحال شخصية' },
    { value: 'other', label: 'أخرى' }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">🚨 تبليغ عن مستخدم</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {reportedUser && (
            <div className="bg-gray-700 p-3 rounded-lg">
              <p className="text-gray-300">تبليغ عن: <span className="text-white font-medium">{reportedUser.username}</span></p>
              {reportedMessage && (
                <div className="mt-2 p-2 bg-gray-600 rounded text-sm">
                  <p className="text-gray-300">الرسالة:</p>
                  <p className="text-white">{reportedMessage.content}</p>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-gray-300 mb-2">سبب التبليغ</label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="اختر سبب التبليغ" />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                {reportReasons.map(r => (
                  <SelectItem key={r.value} value={r.value} className="text-white">
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!reportedMessage && (
            <div>
              <label className="block text-gray-300 mb-2">تفاصيل إضافية</label>
              <Textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="أضف تفاصيل أكثر عن سبب التبليغ..."
                className="bg-gray-700 border-gray-600 text-white"
                rows={3}
              />
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleSubmit}
              disabled={submitting || !reason}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {submitting ? 'جاري الإرسال...' : 'إرسال التبليغ'}
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              إلغاء
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
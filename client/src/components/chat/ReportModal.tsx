import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { ChatUser } from '@/types/chat';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportedUser: ChatUser | null;
  currentUser: ChatUser | null;
  messageContent?: string;
  messageId?: number;
}

export default function ReportModal({
  isOpen,
  onClose,
  reportedUser,
  currentUser,
  messageContent,
  messageId
}: ReportModalProps) {
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const reportReasons = [
    { value: 'spam', label: 'رسائل سبام' },
    { value: 'abuse', label: 'سلوك مسيء' },
    { value: 'inappropriate', label: 'محتوى غير مناسب' },
    { value: 'harassment', label: 'مضايقة' },
    { value: 'advertising', label: 'إعلانات' },
    { value: 'other', label: 'أخرى' }
  ];

  const handleSubmit = async () => {
    if (currentUser?.userType === 'guest') {
      toast({
        title: 'غير مسموح',
        description: 'التبليغ متاح للأعضاء فقط. سجل كعضو أولاً',
        variant: 'destructive'
      });
      return;
    }

    // منع التبليغ على المشرفين والمالكين
    if (reportedUser?.userType === 'admin' || reportedUser?.userType === 'owner') {
      toast({
        title: 'غير مسموح',
        description: 'لا يمكن الإبلاغ عن المشرفين أو المالكين',
        variant: 'destructive'
      });
      return;
    }

    if (!reason || !reportedUser || !currentUser) {
      toast({
        title: 'خطأ',
        description: 'يرجى اختيار سبب التبليغ',
        variant: 'destructive'
      });
      return;
    }

    if (reason === 'other' && !customReason.trim()) {
      toast({
        title: 'خطأ',
        description: 'يرجى كتابة سبب التبليغ',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const finalReason = reason === 'other' ? customReason : reason;
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reporterId: currentUser.id,
          reportedUserId: reportedUser.id,
          reason: finalReason,
          content: messageContent || 'تبليغ عام على المستخدم',
          messageId: messageId
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'تم الإرسال',
          description: 'تم إرسال التبليغ بنجاح. سيتم مراجعته من قبل المشرفين.',
          variant: 'default'
        });
        onClose();
        setReason('');
        setCustomReason('');
      } else {
        throw new Error(data.error || 'خطأ في إرسال التبليغ');
      }
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'خطأ في إرسال التبليغ',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>إبلاغ عن مستخدم</DialogTitle>
          <DialogDescription>
            إبلاغ عن المستخدم: {reportedUser?.username}
            {messageContent && (
              <div className="mt-2 p-2 bg-muted rounded text-sm">
                الرسالة: "{messageContent}"
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="reason">سبب التبليغ</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="اختر سبب التبليغ" />
              </SelectTrigger>
              <SelectContent>
                {reportReasons.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {reason === 'other' && (
            <div className="grid gap-2">
              <Label htmlFor="customReason">تفاصيل التبليغ</Label>
              <Textarea
                id="customReason"
                placeholder="اكتب سبب التبليغ..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            إلغاء
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !reason || currentUser?.userType === 'guest'}
            variant={currentUser?.userType === 'guest' ? 'secondary' : 'default'}
          >
            {currentUser?.userType === 'guest' 
              ? 'للأعضاء فقط' 
              : isSubmitting 
                ? 'جاري الإرسال...' 
                : 'إرسال التبليغ'
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
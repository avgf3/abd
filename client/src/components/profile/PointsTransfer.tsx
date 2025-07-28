import React, { useState } from 'react';
import { Gift, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { validatePointsTransfer } from '@/utils/validation';
import { formatPoints } from '@/utils/pointsUtils';
import type { ChatUser } from '@/types/chat';

interface PointsTransferProps {
  sender: ChatUser;
  receiver: ChatUser;
  onTransferComplete: () => void;
}

export function PointsTransfer({
  sender,
  receiver,
  onTransferComplete
}: PointsTransferProps) {
  const { toast } = useToast();
  const [points, setPoints] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleTransfer = async () => {
    const pointsNum = parseInt(points);
    
    const validation = validatePointsTransfer(pointsNum, sender.points || 0);
    if (!validation.isValid) {
      toast({
        title: "خطأ",
        description: validation.error,
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiRequest('/api/points/send', {
        method: 'POST',
        body: {
          senderId: sender.id,
          receiverId: receiver.id,
          points: pointsNum,
          reason: `نقاط مُهداة من ${sender.username}`
        }
      });

      if (response.success) {
        toast({
          title: "تم الإرسال بنجاح",
          description: `تم إرسال ${formatPoints(pointsNum)} إلى ${receiver.username}`
        });
        
        setPoints('');
        onTransferComplete();
      } else {
        throw new Error(response.error || 'فشل في إرسال النقاط');
      }
    } catch (error: any) {
      toast({
        title: "خطأ في الإرسال",
        description: error.message || 'حدث خطأ أثناء إرسال النقاط',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Gift size={16} className="text-yellow-400" />
          إرسال نقاط
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-xs text-gray-400">
          نقاطك الحالية: {formatPoints(sender.points || 0)}
        </div>
        
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="عدد النقاط"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            min="1"
            max={sender.points || 0}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleTransfer}
            disabled={isLoading || !points || parseInt(points) <= 0}
            size="sm"
            className="bg-yellow-500 hover:bg-yellow-600"
          >
            {isLoading ? (
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <Send size={16} />
            )}
          </Button>
        </div>
        
        <div className="text-xs text-gray-500">
          💡 سيتم خصم النقاط من رصيدك وإضافتها للمستخدم
        </div>
      </CardContent>
    </Card>
  );
}
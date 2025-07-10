import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { ChatUser } from '@/types/chat';

interface FriendRequest {
  id: number;
  userId: number;
  friendId: number;
  status: 'pending' | 'accepted' | 'declined' | 'ignored';
  createdAt: Date;
  user: ChatUser;
}

interface FriendRequestsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: ChatUser | null;
}

export default function FriendRequestsPanel({ 
  isOpen, 
  onClose, 
  currentUser 
}: FriendRequestsPanelProps) {
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmRemove, setConfirmRemove] = useState<FriendRequest | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && currentUser) {
      fetchFriendRequests();
    }
  }, [isOpen, currentUser]);

  const fetchFriendRequests = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const response = await apiRequest('GET', `/api/friend-requests/${currentUser.id}`);
      setIncomingRequests(response.incoming || []);
      setOutgoingRequests(response.outgoing || []);
    } catch (error) {
      console.error('Error fetching friend requests:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في جلب طلبات الصداقة',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (request: FriendRequest) => {
    try {
      await apiRequest('POST', `/api/friend-requests/${request.id}/accept`);
      
      toast({
        title: 'تم قبول الطلب',
        description: `تم قبول طلب صداقة ${request.user.username}`,
        variant: 'default'
      });
      
      fetchFriendRequests();
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في قبول الطلب',
        variant: 'destructive'
      });
    }
  };

  const handleDeclineRequest = async (request: FriendRequest) => {
    try {
      await apiRequest('POST', `/api/friend-requests/${request.id}/decline`);
      
      toast({
        title: 'تم رفض الطلب',
        description: `تم رفض طلب صداقة ${request.user.username}`,
        variant: 'default'
      });
      
      fetchFriendRequests();
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في رفض الطلب',
        variant: 'destructive'
      });
    }
  };

  const handleIgnoreRequest = async (request: FriendRequest) => {
    try {
      await apiRequest('POST', `/api/friend-requests/${request.id}/ignore`);
      
      toast({
        title: 'تم تجاهل الطلب',
        description: `تم تجاهل طلب صداقة ${request.user.username}`,
        variant: 'default'
      });
      
      fetchFriendRequests();
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في تجاهل الطلب',
        variant: 'destructive'
      });
    }
  };

  const handleCancelRequest = async (request: FriendRequest) => {
    try {
      await apiRequest('DELETE', `/api/friend-requests/${request.id}`);
      
      toast({
        title: 'تم إلغاء الطلب',
        description: 'تم إلغاء طلب الصداقة',
        variant: 'default'
      });
      
      fetchFriendRequests();
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في إلغاء الطلب',
        variant: 'destructive'
      });
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[700px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            👥 طلبات الصداقة
          </DialogTitle>
          <DialogDescription>
            إدارة طلبات الصداقة الواردة والصادرة
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* الطلبات الواردة */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>الطلبات الواردة</span>
                <Badge variant="secondary">
                  {incomingRequests.length}
                </Badge>
              </CardTitle>
              <CardDescription>
                طلبات الصداقة التي وصلتك من مستخدمين آخرين
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  </div>
                ) : incomingRequests.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    لا توجد طلبات صداقة واردة
                  </div>
                ) : (
                  <div className="space-y-3">
                    {incomingRequests.map((request) => (
                      <div key={request.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <img
                              src={request.user.profileImage || '/default_avatar.svg'}
                              alt={request.user.username}
                              className="w-10 h-10 rounded-full"
                            />
                            <div>
                              <div className="font-semibold">{request.user.username}</div>
                              <div className="text-sm text-gray-600">
                                {formatDate(request.createdAt)}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleAcceptRequest(request)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              قبول
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeclineRequest(request)}
                            >
                              رفض
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleIgnoreRequest(request)}
                            >
                              تجاهل
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* الطلبات الصادرة */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>الطلبات الصادرة</span>
                <Badge variant="secondary">
                  {outgoingRequests.length}
                </Badge>
              </CardTitle>
              <CardDescription>
                طلبات الصداقة التي أرسلتها لمستخدمين آخرين
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  </div>
                ) : outgoingRequests.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    لا توجد طلبات صداقة صادرة
                  </div>
                ) : (
                  <div className="space-y-3">
                    {outgoingRequests.map((request) => (
                      <div key={request.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <img
                              src={request.user.profileImage || '/default_avatar.svg'}
                              alt={request.user.username}
                              className="w-10 h-10 rounded-full"
                            />
                            <div>
                              <div className="font-semibold">{request.user.username}</div>
                              <div className="text-sm text-gray-600">
                                {formatDate(request.createdAt)}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {request.status === 'pending' ? 'في الانتظار' : 
                               request.status === 'accepted' ? 'مقبول' : 
                               request.status === 'declined' ? 'مرفوض' : 'مجاهل'}
                            </Badge>
                            {request.status === 'pending' && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setConfirmRemove(request)}
                                  >
                                    إلغاء
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent dir="rtl">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>تأكيد الإلغاء</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      هل أنت متأكد من إلغاء طلب الصداقة المرسل لـ {request.user.username}؟
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleCancelRequest(request)}
                                    >
                                      تأكيد الإلغاء
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
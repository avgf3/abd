import React from 'react';
import { MessageCircle, UserPlus, Flag, UserX, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ChatUser } from '@/types/chat';

interface ProfileActionsProps {
  user: ChatUser;
  currentUser: ChatUser | null;
  isOwnProfile: boolean;
  sendingPoints: boolean;
  pointsToSend: string;
  onPrivateMessage?: () => void;
  onAddFriend?: () => void;
  onReportUser?: () => void;
  onIgnoreUser?: () => void;
  onPointsChange: (value: string) => void;
  onSendPoints: () => void;
}

export function ProfileActions({
  user,
  currentUser,
  isOwnProfile,
  sendingPoints,
  pointsToSend,
  onPrivateMessage,
  onAddFriend,
  onReportUser,
  onIgnoreUser,
  onPointsChange,
  onSendPoints,
}: ProfileActionsProps) {
  if (isOwnProfile) return null;

  return (
    <div className="px-6 pb-6 space-y-4">
      <div className="flex gap-2">
        {onPrivateMessage && (
          <Button
            onClick={onPrivateMessage}
            variant="default"
            className="flex-1"
          >
            <MessageCircle className="h-4 w-4 ml-2" />
            رسالة خاصة
          </Button>
        )}
        
        {onAddFriend && (
          <Button
            onClick={onAddFriend}
            variant="secondary"
            className="flex-1"
          >
            <UserPlus className="h-4 w-4 ml-2" />
            إضافة صديق
          </Button>
        )}
      </div>

      {currentUser && !currentUser.isGuest && (
        <div className="space-y-2">
          <p className="text-sm font-medium">إرسال نقاط</p>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="عدد النقاط"
              value={pointsToSend}
              onChange={(e) => onPointsChange(e.target.value)}
              min="1"
              max={currentUser.totalPoints?.toString()}
              disabled={sendingPoints}
            />
            <Button
              onClick={onSendPoints}
              disabled={
                sendingPoints ||
                !pointsToSend ||
                parseInt(pointsToSend) <= 0 ||
                parseInt(pointsToSend) > (currentUser.totalPoints || 0)
              }
            >
              <Send className="h-4 w-4 ml-2" />
              إرسال
            </Button>
          </div>
          {currentUser.totalPoints && currentUser.totalPoints > 0 && (
            <p className="text-xs text-muted-foreground">
              لديك {currentUser.totalPoints} نقطة
            </p>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-2 border-t">
        {onIgnoreUser && (
          <Button
            onClick={onIgnoreUser}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <UserX className="h-4 w-4 ml-2" />
            تجاهل
          </Button>
        )}
        
        {onReportUser && (
          <Button
            onClick={onReportUser}
            variant="outline"
            size="sm"
            className="flex-1 text-destructive hover:text-destructive"
          >
            <Flag className="h-4 w-4 ml-2" />
            إبلاغ
          </Button>
        )}
      </div>
    </div>
  );
}
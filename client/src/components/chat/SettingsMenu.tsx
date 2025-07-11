import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import type { ChatUser } from '@/types/chat';

interface SettingsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: ChatUser | null;
}

export default function SettingsMenu({ isOpen, onClose, currentUser }: SettingsMenuProps) {
  const [notifications, setNotifications] = useState(true);
  const [sounds, setSounds] = useState(true);
  const [privateMessages, setPrivateMessages] = useState(true);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">⚙️ الإعدادات</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">إعدادات الإشعارات</h3>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="notifications" className="text-gray-300">
                إشعارات الرسائل
              </Label>
              <Switch
                id="notifications"
                checked={notifications}
                onCheckedChange={setNotifications}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="sounds" className="text-gray-300">
                أصوات الإشعارات
              </Label>
              <Switch
                id="sounds"
                checked={sounds}
                onCheckedChange={setSounds}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="privateMessages" className="text-gray-300">
                قبول الرسائل الخاصة
              </Label>
              <Switch
                id="privateMessages"
                checked={privateMessages}
                onCheckedChange={setPrivateMessages}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">معلومات الحساب</h3>
            <div className="bg-gray-700 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-300">اسم المستخدم:</span>
                <span>{currentUser?.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">نوع الحساب:</span>
                <span>
                  {currentUser?.userType === 'owner' && '👑 مالك'}
                  {currentUser?.userType === 'admin' && '⭐ مشرف'}
                  {currentUser?.userType === 'moderator' && '🛡️ مراقب'}
                  {currentUser?.userType === 'member' && '👤 عضو'}
                  {currentUser?.userType === 'guest' && '👤 ضيف'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">تاريخ الانضمام:</span>
                <span>{currentUser?.joinDate ? new Date(currentUser.joinDate).toLocaleDateString('ar-SA') : 'غير محدد'}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={onClose}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              حفظ
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
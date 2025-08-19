/**
 * مكون إدارة الإطارات
 * يسمح للأونر بإضافة وإزالة الإطارات للمستخدمين
 */

import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { ChatUser } from '@/types/chat';
import type { FrameType, FrameCategory } from '@/types/avatarFrame';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import AvatarFrame from '@/components/ui/AvatarFrame';
import { getFramesByCategory, getAllFrames, getFrameInfo } from '@/data/frames';
import { apiRequest } from '@/lib/queryClient';

interface FrameManagerProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: ChatUser;
  currentUser: ChatUser;
}

const FrameManager: React.FC<FrameManagerProps> = ({
  isOpen,
  onClose,
  targetUser,
  currentUser
}) => {
  const { toast } = useToast();
  const [selectedFrame, setSelectedFrame] = useState<FrameType>(
    (targetUser.avatarFrame as FrameType) || 'none'
  );
  const [isUpdating, setIsUpdating] = useState(false);
  
  // التحقق من الصلاحيات
  const canManageFrames = currentUser.userType === 'owner';
  
  // تصنيف الإطارات
  const frameCategories = useMemo(() => {
    return [
      { id: 'all', name: 'جميع الإطارات', frames: getAllFrames() },
      { id: 'crown', name: 'التيجان', frames: getFramesByCategory('crown') },
      { id: 'svip', name: 'SVIP', frames: getFramesByCategory('svip') },
      { id: 'wings', name: 'الأجنحة', frames: getFramesByCategory('wings') }
    ];
  }, []);
  
  // معالجة تحديث الإطار
  const handleUpdateFrame = async () => {
    if (!canManageFrames) {
      toast({
        title: 'غير مصرح',
        description: 'ليس لديك صلاحية لإدارة الإطارات',
        variant: 'destructive'
      });
      return;
    }
    
    setIsUpdating(true);
    
    try {
      await apiRequest(`/api/users/${targetUser.id}/avatar-frame`, {
        method: 'POST',
        body: {
          frame: selectedFrame,
          moderatorId: currentUser.id
        }
      });
      
      toast({
        title: 'تم التحديث',
        description: `تم تحديث إطار ${targetUser.username} بنجاح`,
        className: 'bg-green-500 text-white'
      });
      
      onClose();
    } catch (error) {
      console.error('خطأ في تحديث الإطار:', error);
      toast({
        title: 'خطأ',
        description: 'فشل تحديث الإطار. يرجى المحاولة مرة أخرى.',
        variant: 'destructive'
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleRemoveFrame = async () => {
    setSelectedFrame('none');
    await handleUpdateFrame();
  };
  
  if (!canManageFrames) {
    return null;
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>إدارة إطار {targetUser.username}</DialogTitle>
          <DialogDescription>
            اختر إطاراً للصورة الشخصية أو قم بإزالة الإطار الحالي
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* معاينة الإطار المحدد */}
          <div className="flex flex-col items-center space-y-4 p-6 bg-muted rounded-lg">
            <h3 className="text-sm font-medium">المعاينة</h3>
            <AvatarFrame
              src={targetUser.profileImage}
              alt={targetUser.username}
              fallback={targetUser.username.substring(0, 2).toUpperCase()}
              frame={selectedFrame}
              size={100}
              variant="profile"
              glow={true}
              animate={true}
            />
            <p className="text-sm text-muted-foreground">
              {selectedFrame === 'none' ? 'بدون إطار' : getFrameInfo(selectedFrame).name}
            </p>
          </div>
          
          {/* تبويبات الإطارات */}
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid grid-cols-5 w-full">
              {frameCategories.map(category => (
                <TabsTrigger key={category.id} value={category.id}>
                  {category.name}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {frameCategories.map(category => (
              <TabsContent key={category.id} value={category.id} className="mt-4">
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-h-[40vh] overflow-y-auto p-2">
                  {/* خيار "بدون إطار" */}
                  {category.id === 'all' && (
                    <button
                      onClick={() => setSelectedFrame('none')}
                      className={cn(
                        'frame-option',
                        'border-2 rounded-lg p-4',
                        'transition-all duration-200',
                        'hover:scale-105 hover:shadow-lg',
                        selectedFrame === 'none'
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <div className="flex flex-col items-center space-y-2">
                        <AvatarFrame
                          src={targetUser.profileImage}
                          alt="بدون إطار"
                          fallback={targetUser.username.substring(0, 2).toUpperCase()}
                          frame="none"
                          size={60}
                          variant="profile"
                        />
                        <span className="text-xs font-medium">بدون إطار</span>
                      </div>
                    </button>
                  )}
                  
                  {/* الإطارات */}
                  {category.frames.map(frameInfo => (
                    <button
                      key={frameInfo.id}
                      onClick={() => setSelectedFrame(frameInfo.id)}
                      className={cn(
                        'frame-option',
                        'border-2 rounded-lg p-4',
                        'transition-all duration-200',
                        'hover:scale-105 hover:shadow-lg',
                        selectedFrame === frameInfo.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <div className="flex flex-col items-center space-y-2">
                        <AvatarFrame
                          src={targetUser.profileImage}
                          alt={frameInfo.name}
                          fallback={targetUser.username.substring(0, 2).toUpperCase()}
                          frame={frameInfo.id}
                          size={60}
                          variant="profile"
                          glow={frameInfo.priority > 90}
                        />
                        <span className="text-xs font-medium text-center">
                          {frameInfo.name}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
          
          {/* أزرار التحكم */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleRemoveFrame}
              disabled={isUpdating || selectedFrame === 'none'}
            >
              إزالة الإطار
            </Button>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={isUpdating}>
                إلغاء
              </Button>
              <Button 
                onClick={handleUpdateFrame} 
                disabled={isUpdating || selectedFrame === (targetUser.avatarFrame || 'none')}
              >
                {isUpdating ? 'جاري التحديث...' : 'تحديث الإطار'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default React.memo(FrameManager);
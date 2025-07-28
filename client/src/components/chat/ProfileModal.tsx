import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Camera, Upload, Edit2, Save, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import type { ChatUser } from '@/types/chat';
import { ProfileImageUpload } from '../profile/ProfileImageUpload';
import { ProfileBannerUpload } from '../profile/ProfileBannerUpload';
import { ThemeSelector } from '../profile/ThemeSelector';
import { EffectSelector } from '../profile/EffectSelector';
import { PointsTransfer } from '../profile/PointsTransfer';
import { ProfileInfo } from '../profile/ProfileInfo';
import { ProfileActions } from '../profile/ProfileActions';
import { sanitizeInput, validateProfileData } from '@/utils/validation';
import { useProfileData } from '@/hooks/useProfileData';
import './ProfileModal.css';

interface ProfileModalProps {
  user: ChatUser | null;
  currentUser: ChatUser | null;
  onClose: () => void;
  onIgnoreUser?: (userId: number) => void;
  onUpdate?: (user: ChatUser) => void;
  onPrivateMessage?: (user: ChatUser) => void;
  onAddFriend?: (user: ChatUser) => void;
}

export default function ProfileModal({ 
  user, 
  currentUser, 
  onClose, 
  onIgnoreUser, 
  onUpdate, 
  onPrivateMessage, 
  onAddFriend 
}: ProfileModalProps) {
  const { toast } = useToast();
  const modalRef = useRef<HTMLDivElement>(null);
  
  // استخدام hook مخصص لإدارة بيانات البروفايل
  const {
    profileData,
    isLoading,
    updateProfile,
    refreshProfile,
    error
  } = useProfileData(user, currentUser);

  // حالات التحرير
  const [editMode, setEditMode] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // التحقق من الصلاحيات
  const isOwnProfile = profileData?.id === currentUser?.id;
  const canEdit = isOwnProfile;

  // إغلاق المودال عند الضغط خارجه
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // إغلاق المودال بمفتاح Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // تنظيف الموارد عند إلغاء التحميل
  useEffect(() => {
    return () => {
      // إلغاء أي طلبات معلقة
      if (controller) {
        controller.abort();
      }
    };
  }, []);

  const controller = useRef<AbortController | null>(null);

  // بدء وضع التحرير
  const startEdit = useCallback((field: string) => {
    if (!canEdit) return;
    
    setEditMode(field);
    setEditValue(getFieldValue(field));
  }, [canEdit, profileData]);

  // الحصول على قيمة الحقل
  const getFieldValue = (field: string): string => {
    switch (field) {
      case 'username': return profileData?.username || '';
      case 'status': return profileData?.status || '';
      case 'gender': return profileData?.gender || '';
      case 'country': return profileData?.country || '';
      case 'age': return profileData?.age?.toString() || '';
      case 'relation': return profileData?.relation || '';
      case 'bio': return profileData?.bio || '';
      default: return '';
    }
  };

  // حفظ التعديلات
  const saveEdit = useCallback(async () => {
    if (!editMode || !canEdit) return;

    const sanitizedValue = sanitizeInput(editValue);
    const validation = validateProfileData(editMode, sanitizedValue);
    
    if (!validation.isValid) {
      toast({
        title: "خطأ في البيانات",
        description: validation.error,
        variant: "destructive"
      });
      return;
    }

    try {
      await updateProfile({ [editMode]: sanitizedValue });
      setEditMode(null);
      setEditValue('');
      
      toast({
        title: "تم الحفظ",
        description: "تم تحديث البيانات بنجاح"
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في حفظ التعديلات",
        variant: "destructive"
      });
    }
  }, [editMode, editValue, canEdit, updateProfile, toast]);

  // إلغاء التحرير
  const cancelEdit = useCallback(() => {
    setEditMode(null);
    setEditValue('');
  }, []);

  // معالجة تحديث الصورة
  const handleImageUpdate = useCallback(async (imageUrl: string) => {
    try {
      await updateProfile({ profileImage: imageUrl });
      toast({
        title: "تم التحديث",
        description: "تم تحديث الصورة الشخصية بنجاح"
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في تحديث الصورة",
        variant: "destructive"
      });
    }
  }, [updateProfile, toast]);

  // معالجة تحديث البانر
  const handleBannerUpdate = useCallback(async (bannerUrl: string) => {
    try {
      await updateProfile({ profileBanner: bannerUrl });
      toast({
        title: "تم التحديث", 
        description: "تم تحديث صورة الغلاف بنجاح"
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في تحديث صورة الغلاف",
        variant: "destructive"
      });
    }
  }, [updateProfile, toast]);

  if (!profileData) {
    return null;
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
        <Card className="w-96 p-6 text-center">
          <p className="text-red-500 mb-4">خطأ في تحميل البيانات</p>
          <Button onClick={onClose}>إغلاق</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <Card 
        ref={modalRef}
        className={`profile-modal max-w-md w-full max-h-[90vh] overflow-y-auto ${profileData.userTheme} ${profileData.profileEffect}`}
      >
        {/* زر الإغلاق */}
        <Button
          onClick={onClose}
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 z-10 text-white hover:bg-white/20"
        >
          <X size={20} />
        </Button>

        {/* صورة الغلاف */}
        <ProfileBannerUpload
          currentUser={currentUser}
          profileData={profileData}
          canEdit={canEdit}
          onBannerUpdate={handleBannerUpdate}
          isLoading={isLoading}
        />

        {/* الصورة الشخصية */}
        <div className="relative -mt-16 flex justify-center">
          <ProfileImageUpload
            currentUser={currentUser}
            profileData={profileData}
            canEdit={canEdit}
            onImageUpdate={handleImageUpdate}
            isLoading={isLoading}
          />
        </div>

        <CardContent className="pt-4 space-y-4">
          {/* معلومات المستخدم الأساسية */}
          <ProfileInfo
            profileData={profileData}
            editMode={editMode}
            editValue={editValue}
            canEdit={canEdit}
            onStartEdit={startEdit}
            onSaveEdit={saveEdit}
            onCancelEdit={cancelEdit}
            onEditValueChange={setEditValue}
            isLoading={isLoading}
          />

          {/* أزرار التفاعل للمستخدمين الآخرين */}
          {!isOwnProfile && (
            <ProfileActions
              user={profileData}
              onIgnoreUser={onIgnoreUser}
              onPrivateMessage={onPrivateMessage}
              onAddFriend={onAddFriend}
            />
          )}

          {/* إرسال النقاط */}
          {!isOwnProfile && currentUser && (
            <PointsTransfer
              sender={currentUser}
              receiver={profileData}
              onTransferComplete={onClose}
            />
          )}

          {/* الإعدادات المتقدمة للمالك */}
          {isOwnProfile && (
            <div className="space-y-4">
              <Button
                onClick={() => setShowAdvanced(!showAdvanced)}
                variant="outline"
                className="w-full"
              >
                {showAdvanced ? 'إخفاء' : 'إظهار'} الإعدادات المتقدمة
              </Button>

              {showAdvanced && (
                <div className="space-y-4">
                  {/* اختيار الثيم */}
                  <ThemeSelector
                    currentTheme={profileData.userTheme}
                    onThemeChange={(theme) => updateProfile({ userTheme: theme })}
                    isLoading={isLoading}
                  />

                  {/* اختيار التأثيرات */}
                  <EffectSelector
                    currentEffect={profileData.profileEffect}
                    onEffectChange={(effect) => updateProfile({ profileEffect: effect })}
                    isLoading={isLoading}
                  />
                </div>
              )}
            </div>
          )}

          {/* مؤشر التحميل */}
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="animate-spin mr-2" size={20} />
              <span>جاري التحديث...</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
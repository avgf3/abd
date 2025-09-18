import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { ChatUser } from '@/types/chat';
import { getProfileImageSrc, getBannerImageSrc } from '@/utils/imageUtils';
import { formatPoints, getLevelInfo } from '@/utils/pointsUtils';
import { buildProfileBackgroundGradient } from '@/utils/themeUtils';
import ProfileImage from '@/components/chat/ProfileImage';
import ProfileImageUpload from './ProfileImageUpload';
import ProfileBanner from './ProfileBanner';
import ProfileInfoTab from './ProfileInfoTab';
import ProfileEditForm from './ProfileEditForm';
import ProfileMusicTab from './ProfileMusicTab';

interface ProfileModalProps {
  user: ChatUser | null;
  currentUser: ChatUser | null;
  onClose: () => void;
  onUpdate?: (user: ChatUser) => void;
  onUserClick?: (user: ChatUser) => void;
}

export default function ProfileModal({
  user,
  currentUser,
  onClose,
  onUpdate,
  onUserClick,
}: ProfileModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'info' | 'music' | 'settings'>('info');
  const [editingField, setEditingField] = useState<string | null>(null);
  const [localUser, setLocalUser] = useState<ChatUser | null>(user);

  // مزامنة حالة المستخدم المحلي
  useEffect(() => {
    if (user) {
      setLocalUser((prev) => {
        if (prev && prev.id === user.id) {
          return { ...prev, ...user };
        }
        return user;
      });
    } else {
      setLocalUser(null);
    }
  }, [user]);

  const isOwnProfile = currentUser?.id === localUser?.id;
  const levelInfo = getLevelInfo(localUser?.level || 1);

  // توحيد لون خلفية الملف الشخصي للأعضاء والزوار
  const isMemberOrGuest = (localUser?.userType === 'member' || localUser?.userType === 'guest');
  const forcedBotColor = '#2a2a2a';
  const resolvedProfileColor = isMemberOrGuest
    ? forcedBotColor
    : (localUser?.profileBackgroundColor || '');
  const computedGradient = buildProfileBackgroundGradient(resolvedProfileColor) ||
    'linear-gradient(135deg, #1a1a1a, #2d2d2d)';

  const handleImageUpdate = (imageUrl: string) => {
    if (localUser) {
      const updatedUser = { ...localUser, profileImage: imageUrl };
      setLocalUser(updatedUser);
      onUpdate?.(updatedUser);
    }
  };

  const handleBannerUpdate = (bannerUrl: string) => {
    if (localUser) {
      const updatedUser = { ...localUser, profileBanner: bannerUrl };
      setLocalUser(updatedUser);
      onUpdate?.(updatedUser);
    }
  };

  const handleFieldEdit = (field: string) => {
    setEditingField(field);
  };

  const handleFieldSave = (field: string, value: any) => {
    if (localUser) {
      const updatedUser = { ...localUser, ...value };
      setLocalUser(updatedUser);
      onUpdate?.(updatedUser);
    }
    setEditingField(null);
  };

  const handleFieldCancel = () => {
    setEditingField(null);
  };

  const handleUserUpdate = (updates: Partial<ChatUser>) => {
    if (localUser) {
      const updatedUser = { ...localUser, ...updates };
      setLocalUser(updatedUser);
      onUpdate?.(updatedUser);
    }
  };

  if (!localUser) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="relative">
          {/* Banner */}
          <div 
            className="h-48 w-full bg-cover bg-center relative"
            style={{
              backgroundImage: localUser.profileBanner 
                ? `url(${getBannerImageSrc(localUser.profileBanner)})` 
                : computedGradient,
            }}
          >
            <div className="absolute inset-0 bg-black/20" />
            
            {/* Profile Image */}
            <div className="absolute bottom-0 left-4 transform translate-y-1/2">
              <ProfileImage user={localUser} size="large" />
            </div>

            {/* Close Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* User Info */}
          <div className="pt-16 pb-4 px-4">
            <div className="flex items-end justify-between">
              <div>
                <h1 className="text-2xl font-bold">{localUser.username}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary">المستوى {localUser.level || 1}</Badge>
                  <Badge variant="outline">{formatPoints(localUser.points || 0)} نقطة</Badge>
                  {localUser.userType && (
                    <Badge variant={localUser.userType === 'owner' ? 'default' : 'secondary'}>
                      {localUser.userType === 'owner' ? 'مالك' : 
                       localUser.userType === 'admin' ? 'مدير' :
                       localUser.userType === 'moderator' ? 'مشرف' :
                       localUser.userType === 'member' ? 'عضو' : 'زائر'}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info">المعلومات</TabsTrigger>
              <TabsTrigger value="music">الموسيقى</TabsTrigger>
              <TabsTrigger value="settings">الإعدادات</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="mt-4">
              {editingField ? (
                <ProfileEditForm
                  user={localUser}
                  field={editingField}
                  onSave={handleFieldSave}
                  onCancel={handleFieldCancel}
                />
              ) : (
                <ProfileInfoTab
                  user={localUser}
                  currentUser={currentUser}
                  onEdit={handleFieldEdit}
                />
              )}
            </TabsContent>

            <TabsContent value="music" className="mt-4">
              <ProfileMusicTab
                user={localUser}
                currentUser={currentUser}
                onUpdate={handleUserUpdate}
              />
            </TabsContent>

            <TabsContent value="settings" className="mt-4">
              <div className="space-y-4">
                {isOwnProfile && (
                  <>
                    <Card>
                      <CardHeader>
                        <CardTitle>تحديث الصور</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <h3 className="text-sm font-medium mb-2">صورة البروفايل</h3>
                          <ProfileImageUpload
                            currentUser={currentUser}
                            onImageUpdate={handleImageUpdate}
                          />
                        </div>
                        
                        <div>
                          <h3 className="text-sm font-medium mb-2">صورة البانر</h3>
                          <ProfileBanner
                            currentUser={currentUser}
                            onBannerUpdate={handleBannerUpdate}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
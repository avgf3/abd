import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ChatUser } from '@/types/chat';
import { getBannerImageSrc } from '@/utils/imageUtils';

interface ProfileHeaderProps {
  user: ChatUser;
  isOwnProfile: boolean;
  onClose: () => void;
  onBannerClick?: () => void;
  bannerInputRef?: React.RefObject<HTMLInputElement>;
  onBannerChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ProfileHeader({
  user,
  isOwnProfile,
  onClose,
  onBannerClick,
  bannerInputRef,
  onBannerChange,
}: ProfileHeaderProps) {
  return (
    <div className="relative h-32 bg-gradient-to-br from-primary/20 to-primary/5 rounded-t-lg overflow-hidden">
      {user.profileBanner && (
        <img
          src={getBannerImageSrc(user.profileBanner)}
          alt="Profile banner"
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      
      <Button
        onClick={onClose}
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 bg-background/80 hover:bg-background/90 backdrop-blur-sm"
      >
        <X className="h-4 w-4" />
      </Button>

      {isOwnProfile && (
        <>
          <input
            ref={bannerInputRef}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={onBannerChange}
          />
          <Button
            onClick={onBannerClick}
            variant="secondary"
            size="sm"
            className="absolute bottom-2 right-2 bg-background/80 hover:bg-background/90 backdrop-blur-sm"
          >
            تغيير الغلاف
          </Button>
        </>
      )}
    </div>
  );
}
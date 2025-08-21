import React from 'react';
import { Camera } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { ChatUser } from '@/types/chat';
import { getProfileImageSrc } from '@/utils/imageUtils';

interface ProfileAvatarProps {
  user: ChatUser;
  isOwnProfile: boolean;
  onAvatarClick?: () => void;
  avatarInputRef?: React.RefObject<HTMLInputElement>;
  onAvatarChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ProfileAvatar({
  user,
  isOwnProfile,
  onAvatarClick,
  avatarInputRef,
  onAvatarChange,
}: ProfileAvatarProps) {
  return (
    <div className="relative -mt-16 mb-4 px-6">
      <div className="relative inline-block">
        <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
          <AvatarImage 
            src={getProfileImageSrc(user.avatar)}
            alt={user.displayName}
          />
          <AvatarFallback className="text-3xl">
            {user.displayName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        {isOwnProfile && (
          <>
            <input
              ref={avatarInputRef}
              type="file"
              className="hidden"
              accept="image/*"
              onChange={onAvatarChange}
            />
            <Button
              onClick={onAvatarClick}
              variant="secondary"
              size="icon"
              className="absolute bottom-0 right-0 rounded-full shadow-lg"
            >
              <Camera className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
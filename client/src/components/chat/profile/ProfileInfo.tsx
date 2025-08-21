import React from 'react';
import { Crown, Shield, ShieldCheck, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ChatUser } from '@/types/chat';
import { formatPoints, getLevelInfo } from '@/utils/pointsUtils';
import { getFinalUsernameColor } from '@/utils/themeUtils';

interface ProfileInfoProps {
  user: ChatUser;
  isOwnProfile: boolean;
  onEditClick: (type: string, currentValue: string) => void;
}

const roleIcons = {
  owner: Crown,
  admin: ShieldCheck,
  moderator: Shield,
  member: User,
};

const roleNames = {
  owner: 'المالك',
  admin: 'مدير',
  moderator: 'مشرف',
  member: 'عضو',
};

export function ProfileInfo({ user, isOwnProfile, onEditClick }: ProfileInfoProps) {
  const levelInfo = getLevelInfo(user.totalPoints || 0);
  const RoleIcon = roleIcons[user.role as keyof typeof roleIcons] || User;
  const finalUsernameColor = getFinalUsernameColor(user);

  return (
    <div className="px-6 pb-4">
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <h3 
            className="text-2xl font-bold"
            style={{ color: finalUsernameColor }}
          >
            {user.displayName}
          </h3>
          {isOwnProfile && (
            <button
              onClick={() => onEditClick('displayName', user.displayName)}
              className="text-sm text-primary hover:underline"
            >
              تعديل
            </button>
          )}
        </div>
        
        <p className="text-muted-foreground">@{user.username}</p>
        
        <div className="flex items-center gap-4 mt-3">
          <Badge variant="secondary" className="flex items-center gap-1">
            <RoleIcon className="h-3 w-3" />
            {roleNames[user.role as keyof typeof roleNames]}
          </Badge>
          
          <Badge variant="outline">
            المستوى {levelInfo.level} - {levelInfo.title}
          </Badge>
        </div>
      </div>

      {user.bio && (
        <div className="mb-4">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            نبذة شخصية
            {isOwnProfile && (
              <button
                onClick={() => onEditClick('bio', user.bio || '')}
                className="text-sm text-primary hover:underline"
              >
                تعديل
              </button>
            )}
          </h4>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {user.bio}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 py-4 border-t">
        <div className="text-center">
          <p className="text-2xl font-bold text-primary">
            {formatPoints(user.totalPoints || 0)}
          </p>
          <p className="text-sm text-muted-foreground">النقاط</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-primary">
            {user.messageCount || 0}
          </p>
          <p className="text-sm text-muted-foreground">الرسائل</p>
        </div>
      </div>
    </div>
  );
}
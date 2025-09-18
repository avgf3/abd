import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, MapPin, Calendar, Users, Heart } from 'lucide-react';
import type { ChatUser } from '@/types/chat';
import { formatPoints, getLevelInfo } from '@/utils/pointsUtils';
import { getUserLevelIcon } from '@/components/chat/UserRoleBadge';
import CountryFlag from '@/components/ui/CountryFlag';
import ProfileImage from '@/components/chat/ProfileImage';

interface ProfileInfoTabProps {
  user: ChatUser | null;
  currentUser: ChatUser | null;
  onEdit: (field: string) => void;
}

export default function ProfileInfoTab({ user, currentUser, onEdit }: ProfileInfoTabProps) {
  if (!user) return null;

  const levelInfo = getLevelInfo(user.level || 1);
  const isOwnProfile = currentUser?.id === user.id;

  return (
    <div className="space-y-4">
      {/* معلومات أساسية */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            المعلومات الأساسية
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* صورة البروفايل والاسم */}
          <div className="flex items-center gap-4">
            <ProfileImage user={user} size="large" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-2xl font-bold">{user.username}</h2>
                {getUserLevelIcon(user.level || 1, 24)}
                <UserRoleBadge user={user} size={20} />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>المستوى {user.level || 1}</span>
                <span>•</span>
                <span>{formatPoints(user.points || 0)} نقطة</span>
                {user.country && (
                  <>
                    <span>•</span>
                    <CountryFlag country={user.country} size={16} />
                    <span>{user.country}</span>
                  </>
                )}
              </div>
            </div>
            {isOwnProfile && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit('username')}
                className="flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                تعديل
              </Button>
            )}
          </div>

          {/* معلومات إضافية */}
          <div className="grid grid-cols-2 gap-4">
            {user.age && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{user.age} سنة</span>
              </div>
            )}
            {user.gender && (
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{user.gender}</span>
              </div>
            )}
            {user.relation && (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{user.relation}</span>
              </div>
            )}
            {user.country && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{user.country}</span>
              </div>
            )}
          </div>

          {/* السيرة الذاتية */}
          {user.bio && (
            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2">نبذة شخصية</h3>
              <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                {user.bio}
              </p>
              {isOwnProfile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit('bio')}
                  className="mt-2 text-xs"
                >
                  <Edit className="w-3 h-3 mr-1" />
                  تعديل السيرة الذاتية
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* إحصائيات المستخدم */}
      <Card>
        <CardHeader>
          <CardTitle>الإحصائيات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">{formatPoints(user.points || 0)}</div>
              <div className="text-sm text-muted-foreground">النقاط</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">{user.level || 1}</div>
              <div className="text-sm text-muted-foreground">المستوى</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">{levelInfo.progress}%</div>
              <div className="text-sm text-muted-foreground">التقدم</div>
            </div>
          </div>
          
          {/* شريط التقدم */}
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span>التقدم للمستوى التالي</span>
              <span>{levelInfo.progress}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${levelInfo.progress}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {levelInfo.pointsNeeded} نقطة للوصول للمستوى {levelInfo.nextLevel}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
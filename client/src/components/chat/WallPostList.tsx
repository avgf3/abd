import React, { useState, useEffect } from 'react';
import { Trash2, Globe } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { getFinalUsernameColor, getUsernameDisplayStyle } from '@/utils/themeUtils';
import ImageLightbox from '@/components/ui/ImageLightbox';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { WallPost, ChatUser } from '@/types/chat';
import { getImageSrc } from '@/utils/imageUtils';
import { formatTimeAgo } from '@/utils/timeUtils';
import { apiRequest } from '@/lib/queryClient';
import ProfileImage from '@/components/chat/ProfileImage';
 

interface WallPostListProps {
  posts: WallPost[];
  loading?: boolean;
  emptyFor?: 'public' | 'friends';
  currentUser?: ChatUser | null;
  onDelete?: (postId: number) => void;
  onReact?: (postId: number, type: 'like' | 'dislike' | 'heart') => void;
  canDelete?: (post: WallPost) => boolean;
  onUserClick?: (event: React.MouseEvent, user: ChatUser) => void;
}

export default function WallPostList({
  posts,
  loading = false,
  emptyFor = 'public',
  currentUser,
  onDelete,
  onReact,
  canDelete,
  onUserClick,
}: WallPostListProps) {
  const [usersData, setUsersData] = useState<{[key: number]: ChatUser}>({});

  // جلب بيانات المستخدمين لكل منشور مع التركيز على المشرفين
  useEffect(() => {
    const fetchUsersData = async () => {
      const userIds = [...new Set(posts.map(post => post.userId))];
      const newUsersData: {[key: number]: ChatUser} = {};
      
      for (const userId of userIds) {
        // جلب بيانات المستخدم دائماً للمشرفين لضمان الحصول على أحدث ألوان وتأثيرات
        const isModeratorPost = posts.some(p => p.userId === userId && ['admin', 'owner', 'moderator'].includes(p.userRole as string));
        
        if (!usersData[userId] || isModeratorPost) {
          try {
            const userData = await apiRequest(`/api/users/${userId}`);
            if (userData) {
              newUsersData[userId] = userData;
            }
          } catch (error) {
            console.error(`Failed to fetch user ${userId}:`, error);
          }
        }
      }
      
      if (Object.keys(newUsersData).length > 0) {
        setUsersData(prev => ({...prev, ...newUsersData}));
      }
    };

    if (posts.length > 0) {
      fetchUsersData();
    }
  }, [posts, usersData]);
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">جاري تحميل المنشورات...</p>
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mx-auto mb-4">
          <Globe className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">لا توجد منشورات بعد</h3>
        <p className="text-muted-foreground text-sm">
          كن أول من ينشر على {emptyFor === 'public' ? 'الحائط العام' : 'حائط الأصدقاء'}!
        </p>
      </div>
    );
  }

  const [imageLightbox, setImageLightbox] = React.useState<{ open: boolean; src: string | null }>({ open: false, src: null });

  return (
    <>
      {posts.map((post) => (
        <Card
          key={post.id}
          className="hover:shadow-lg transition-all duration-300 border-0 wall-post-card backdrop-blur-sm group"
        >
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  {(() => {
                    const userFromCache = usersData[post.userId];
                    const frameFromPost = (post as any)?.userProfileFrame as string | undefined;
                    const tagFromPost = (post as any)?.userProfileTag as string | undefined;
                    const effectiveUser: ChatUser = (userFromCache
                      ? { ...userFromCache }
                      : {
                          id: post.userId,
                          username: post.username,
                          role: (post.userRole as any) || 'member',
                          userType: (post.userRole as any) || 'member',
                          isOnline: true,
                          profileImage: post.userProfileImage,
                          usernameColor: post.usernameColor,
                          usernameGradient: (post as any).usernameGradient,
                          usernameEffect: (post as any).usernameEffect,
                        }) as ChatUser;
                    if (!('profileFrame' in (effectiveUser as any)) && frameFromPost) {
                      (effectiveUser as any).profileFrame = frameFromPost;
                    }
                    if (!('profileTag' in (effectiveUser as any)) && tagFromPost) {
                      (effectiveUser as any).profileTag = tagFromPost;
                    }
                    const hasFrame = Boolean((effectiveUser as any)?.profileFrame);
                    // النظام الجديد: مع إطار = 40 + (2 × 8) = 56px، بدون إطار = 40px
                    const containerSize = hasFrame ? 56 : 40;
                    return (
                      <div style={{ width: containerSize, height: containerSize, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ProfileImage
                          user={effectiveUser}
                          size="small"
                          pixelSize={40}
                          className=""
                          hideRoleBadgeOverlay={true}
                        />
                      </div>
                    );
                  })()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const userFromCache = usersData[post.userId];
                      const displayUser: Partial<ChatUser> = userFromCache
                        ? userFromCache
                        : {
                            userType: (post.userRole as any) || 'member',
                            usernameColor: post.usernameColor,
                            usernameGradient: (post as any).usernameGradient,
                            usernameEffect: (post as any).usernameEffect,
                          };
                      const uds = getUsernameDisplayStyle(displayUser);
                      return (
                        <div
                          className={`font-bold text-base ${onUserClick ? 'cursor-pointer hover:underline' : ''}`}
                          onClick={(e) => {
                            if (!onUserClick) return;
                            const targetUser = usersData[post.userId] || {
                              id: post.userId,
                              username: post.username,
                              role: (post.userRole as any) || 'member',
                              userType: post.userRole || 'member',
                              isOnline: true,
                              profileImage: post.userProfileImage,
                              usernameColor: post.usernameColor,
                              usernameGradient: (post as any).usernameGradient,
                              usernameEffect: (post as any).usernameEffect,
                              gender: (post as any).userGender,
                              level: (post as any).userLevel || 1,
                            } as ChatUser;
                            onUserClick(e, targetUser);
                          }}
                          title="عرض خيارات المستخدم"
                        >
                          <span className={`${uds.className || ''}`} style={uds.style}>
                            {post.username}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <span>{formatTimeAgo(post.timestamp)}</span>
                    {/* حذف أي شعار/شارة بجانب الاسم في الحائط */}
                  </div>
                </div>
              </div>
              {canDelete && canDelete(post) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete?.(post.id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {post.content && (
              <div className="mb-4">
                <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap wall-text">
                  {post.content}
                </p>
              </div>
            )}

            {post.imageUrl && (
              <div className="mb-4 rounded-xl bg-muted/10">
                <img
                  src={post.imageUrl}
                  alt={`صورة منشور من ${post.username}`}
                  className="w-full h-auto object-contain max-h-[520px] cursor-pointer"
                  onClick={() => setImageLightbox({ open: true, src: post.imageUrl! })}
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-border/30">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onReact?.(post.id, 'like')}
                  className="flex items-center gap-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-xl transition-colors"
                >
                  👍
                  <span className="text-sm font-medium">{post.totalLikes}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onReact?.(post.id, 'heart')}
                  className="flex items-center gap-2 text-pink-600 hover:text-pink-700 hover:bg-pink-50 rounded-xl transition-colors"
                >
                  ❤️
                  <span className="text-sm font-medium">{post.totalHearts}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onReact?.(post.id, 'dislike')}
                  className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors"
                >
                  👎
                  <span className="text-sm font-medium">{post.totalDislikes}</span>
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                {post.totalLikes + post.totalHearts + post.totalDislikes} تفاعل
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      <ImageLightbox
        open={imageLightbox.open}
        src={imageLightbox.src}
        onOpenChange={(open) => {
          if (!open) setImageLightbox({ open: false, src: null });
        }}
      />
    </>
  );
}

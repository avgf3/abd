import React from 'react';
import { Trash2, Globe } from 'lucide-react';

import { Button } from '@/components/ui/button';
import ImageLightbox from '@/components/ui/ImageLightbox';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import UnifiedUserCard from '@/components/chat/UnifiedUserCard';
import type { WallPost, ChatUser } from '@/types/chat';
import { getImageSrc } from '@/utils/imageUtils';
import { formatTimeAgo } from '@/utils/timeUtils';

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
          className="hover:shadow-lg transition-all duration-300 border-0 bg-background/60 backdrop-blur-sm group"
        >
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <UnifiedUserCard
                user={post}
                variant="normal"
                showProfileImage={true}
                showRoleBadge={true}
                showCountryFlag={true}
                showTimestamp={post.timestamp}
                showDeleteButton={canDelete && canDelete(post)}
                onUserClick={onUserClick}
                onDelete={() => onDelete?.(post.id)}
                currentUser={currentUser}
                enableMenu={true}
                enableEffects={true}
                imageSize="medium"
                className="flex-1"
              />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {post.content && (
              <div className="mb-4">
                <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                  {post.content}
                </p>
              </div>
            )}

            {post.imageUrl && (
              <div className="mb-4 rounded-xl overflow-hidden bg-muted/10">
                <img
                  src={post.imageUrl}
                  alt="منشور"
                  className="w-full h-auto object-cover max-h-80 hover:scale-105 transition-transform duration-300 cursor-pointer"
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

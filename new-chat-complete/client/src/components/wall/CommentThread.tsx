import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Heart, Reply, MoreVertical, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/queryClient';
import { getImageSrc } from '@/utils/imageUtils';
import type { ChatUser } from '@/types/chat';
import ProfileFrame from '@/components/profile/ProfileFrame';

export interface WallComment {
  id: number;
  postId: number;
  userId: number;
  username: string;
  userAvatar: string;
  userLevel: number;
  content: string;
  likesCount: number;
  isLiked?: boolean;
  parentCommentId?: number | null;
  replies?: WallComment[];
  createdAt: Date | string;
}

interface CommentThreadProps {
  comment: WallComment;
  currentUser: ChatUser | null;
  depth?: number;
  maxDepth?: number;
  onReply?: (commentId: number, content: string) => Promise<void>;
  onLike?: (commentId: number) => Promise<void>;
  onDelete?: (commentId: number) => Promise<void>;
  onUpdate?: () => void;
}

export default function CommentThread({
  comment,
  currentUser,
  depth = 0,
  maxDepth = 3,
  onReply,
  onLike,
  onDelete,
  onUpdate
}: CommentThreadProps) {
  const { toast } = useToast();
  const [showReplies, setShowReplies] = useState(false);
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [liked, setLiked] = useState(comment.isLiked || false);
  const [likesCount, setLikesCount] = useState(comment.likesCount || 0);
  const [sending, setSending] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const isOwner = currentUser?.id === comment.userId;
  const canReply = depth < maxDepth;

  const handleReply = async () => {
    if (!replyText.trim()) return;
    if (!currentUser) {
      toast({
        title: 'خطأ',
        description: 'يجب تسجيل الدخول للرد',
        variant: 'destructive'
      });
      return;
    }

    setSending(true);
    try {
      if (onReply) {
        await onReply(comment.id, replyText.trim());
        setReplyText('');
        setReplying(false);
        setShowReplies(true);
        
        toast({
          title: 'تم الرد',
          description: 'تم إضافة ردك بنجاح'
        });
      }
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message || 'فشل إرسال الرد',
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  };

  const handleLike = async () => {
    if (!currentUser) {
      toast({
        title: 'خطأ',
        description: 'يجب تسجيل الدخول للإعجاب',
        variant: 'destructive'
      });
      return;
    }

    // Optimistic UI - تحديث فوري
    const wasLiked = liked;
    setLiked(!liked);
    setLikesCount(prev => wasLiked ? prev - 1 : prev + 1);

    try {
      if (onLike) {
        await onLike(comment.id);
      }
    } catch (error) {
      // إرجاع الحالة إذا فشل
      setLiked(wasLiked);
      setLikesCount(prev => wasLiked ? prev + 1 : prev - 1);
      
      toast({
        title: 'خطأ',
        description: 'فشل الإعجاب',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('هل تريد حذف هذا التعليق؟')) return;

    try {
      if (onDelete) {
        await onDelete(comment.id);
        
        toast({
          title: 'تم الحذف',
          description: 'تم حذف التعليق'
        });
        
        if (onUpdate) onUpdate();
      }
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message || 'فشل حذف التعليق',
        variant: 'destructive'
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="mb-3"
      style={{ marginRight: `${depth * 16}px` }}
    >
      {/* التعليق */}
      <div className="flex gap-3 bg-gray-800/30 rounded-lg p-3 hover:bg-gray-800/50 transition-all group">
        {/* الصورة مع الإطار */}
        <div className="flex-shrink-0">
          <ProfileFrame level={comment.userLevel || 0} size="small" showBadge={false}>
            <img
              src={getImageSrc(comment.userAvatar || '/default_avatar.svg')}
              alt={comment.username}
              className="w-full h-full object-cover"
            />
          </ProfileFrame>
        </div>
        
        {/* المحتوى */}
        <div className="flex-1 min-w-0">
          {/* الاسم والوقت */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-white">
                {comment.username}
              </span>
              <span className="text-xs text-gray-400">
                {formatTimeAgo(comment.createdAt)}
              </span>
            </div>
            
            {/* قائمة الخيارات */}
            {isOwner && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1 hover:bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="w-4 h-4 text-gray-400" />
                </button>
                
                {showMenu && (
                  <div className="absolute left-0 top-full mt-1 bg-gray-900 rounded-lg shadow-lg border border-gray-700 z-10">
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        handleDelete();
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-gray-800 w-full text-right rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                      حذف
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* النص */}
          <p className="text-sm text-gray-200 mb-2 break-words leading-relaxed">
            {comment.content}
          </p>
          
          {/* الأزرار */}
          <div className="flex items-center gap-4 text-xs">
            {/* إعجاب */}
            <button
              onClick={handleLike}
              className={`flex items-center gap-1 transition-all ${
                liked 
                  ? 'text-red-500' 
                  : 'text-gray-400 hover:text-red-400'
              }`}
            >
              <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
              <span className="font-medium">{likesCount}</span>
            </button>
            
            {/* رد */}
            {canReply && (
              <button
                onClick={() => setReplying(!replying)}
                className="flex items-center gap-1 text-gray-400 hover:text-blue-400 transition-colors"
              >
                <Reply className="w-4 h-4" />
                <span>رد</span>
              </button>
            )}
            
            {/* عرض/إخفاء الردود */}
            {comment.replies && comment.replies.length > 0 && (
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="flex items-center gap-1 text-gray-400 hover:text-blue-400 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>
                  {showReplies ? 'إخفاء' : 'عرض'} الردود ({comment.replies.length})
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* نموذج الرد */}
      <AnimatePresence>
        {replying && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2"
            style={{ marginRight: `${(depth + 1) * 16}px` }}
          >
            <div className="flex gap-2 bg-gray-800/30 rounded-lg p-3">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleReply();
                  }
                }}
                placeholder={`الرد على ${comment.username}...`}
                className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
                disabled={sending}
              />
              <button
                onClick={handleReply}
                disabled={!replyText.trim() || sending}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
              >
                {sending ? '...' : 'إرسال'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* الردود المتداخلة */}
      <AnimatePresence>
        {showReplies && comment.replies && comment.replies.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 space-y-2"
          >
            {comment.replies.map((reply) => (
              <CommentThread
                key={reply.id}
                comment={reply}
                currentUser={currentUser}
                depth={depth + 1}
                maxDepth={maxDepth}
                onReply={onReply}
                onLike={onLike}
                onDelete={onDelete}
                onUpdate={onUpdate}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// دالة لتنسيق الوقت (مثل arabic.chat)
function formatTimeAgo(date: Date | string): string {
  const now = new Date();
  const commentDate = typeof date === 'string' ? new Date(date) : date;
  const seconds = Math.floor((now.getTime() - commentDate.getTime()) / 1000);
  
  if (seconds < 10) return 'الآن';
  if (seconds < 60) return `منذ ${seconds} ثانية`;
  if (seconds < 3600) return `منذ ${Math.floor(seconds / 60)} دقيقة`;
  if (seconds < 86400) return `منذ ${Math.floor(seconds / 3600)} ساعة`;
  if (seconds < 604800) return `منذ ${Math.floor(seconds / 86400)} يوم`;
  if (seconds < 2592000) return `منذ ${Math.floor(seconds / 604800)} أسبوع`;
  if (seconds < 31536000) return `منذ ${Math.floor(seconds / 2592000)} شهر`;
  return `منذ ${Math.floor(seconds / 31536000)} سنة`;
}

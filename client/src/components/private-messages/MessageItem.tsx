import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { 
  Check, 
  CheckCheck, 
  MoreVertical, 
  Reply, 
  Edit2, 
  Trash2, 
  Copy, 
  Forward,
  Download,
  Heart,
  ThumbsUp,
  ThumbsDown,
  Laugh,
  Frown,
  Star
} from 'lucide-react';
import { PrivateMessage, MessageStatus } from '@/types/private-messages';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface MessageItemProps {
  message: PrivateMessage;
  isOwn: boolean;
  isSelected: boolean;
  isSelectionMode: boolean;
  onSelect: () => void;
  onReply: () => void;
  onEdit: () => void;
  onDelete: (deleteForEveryone: boolean) => void;
  onReact: (reaction: string) => void;
}

export function MessageItem({
  message,
  isOwn,
  isSelected,
  isSelectionMode,
  onSelect,
  onReply,
  onEdit,
  onDelete,
  onReact,
}: MessageItemProps) {
  const [showReactions, setShowReactions] = useState(false);
  const [imageError, setImageError] = useState(false);

  // التفاعلات المتاحة
  const availableReactions = ['❤️', '👍', '👎', '😂', '😢', '⭐'];

  // عرض حالة الرسالة
  const renderMessageStatus = () => {
    if (!isOwn) return null;

    switch (message.status) {
      case 'sending':
        return <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />;
      case 'sent':
        return <Check className="w-4 h-4 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="w-4 h-4 text-gray-400" />;
      case 'read':
        return <CheckCheck className="w-4 h-4 text-blue-500" />;
      case 'failed':
        return <span className="text-red-500 text-xs">فشل الإرسال</span>;
      default:
        return null;
    }
  };

  // عرض محتوى الرسالة حسب النوع
  const renderMessageContent = () => {
    if (message.isDeleted) {
      return (
        <p className="text-gray-500 italic">
          {isOwn ? 'لقد حذفت هذه الرسالة' : 'تم حذف هذه الرسالة'}
        </p>
      );
    }

    switch (message.type) {
      case 'text':
        return (
          <p className="whitespace-pre-wrap break-words">
            {message.content}
          </p>
        );

      case 'image':
        const imageUrl = message.attachments?.[0]?.url || message.content;
        const thumbnailUrl = message.attachments?.[0]?.metadata?.thumbnailDataUrl;
        
        return (
          <div className="relative">
            <img
              src={imageError ? '/broken-image.png' : (thumbnailUrl || imageUrl)}
              alt="صورة"
              className="max-w-sm max-h-96 rounded-lg cursor-pointer"
              onClick={() => !imageError && window.open(imageUrl, '_blank')}
              onError={() => setImageError(true)}
              loading="lazy"
            />
            {message.attachments?.[0] && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 left-2 bg-black/50 text-white hover:bg-black/70"
                onClick={(e) => {
                  e.stopPropagation();
                  // تنزيل الصورة
                  const a = document.createElement('a');
                  a.href = imageUrl!;
                  a.download = message.attachments![0].name || 'image';
                  a.click();
                }}
              >
                <Download className="w-4 h-4" />
              </Button>
            )}
          </div>
        );

      case 'video':
        return (
          <video
            controls
            className="max-w-sm max-h-96 rounded-lg"
            src={message.attachments?.[0]?.url || message.content}
          >
            متصفحك لا يدعم تشغيل الفيديو
          </video>
        );

      case 'audio':
        return (
          <audio
            controls
            className="max-w-sm"
            src={message.attachments?.[0]?.url || message.content}
          >
            متصفحك لا يدعم تشغيل الصوت
          </audio>
        );

      case 'file':
        const file = message.attachments?.[0];
        if (!file) return null;

        return (
          <div className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs">
                {file.name.split('.').pop()?.toUpperCase() || 'FILE'}
              </span>
            </div>
            <div className="flex-1">
              <p className="font-medium truncate">{file.name}</p>
              <p className="text-sm text-gray-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const a = document.createElement('a');
                a.href = file.url;
                a.download = file.name;
                a.click();
              }}
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        );

      case 'location':
        const location = message.metadata as { lat: number; lng: number } | undefined;
        if (!location) return null;

        return (
          <div className="relative">
            <img
              src={`https://maps.googleapis.com/maps/api/staticmap?center=${location.lat},${location.lng}&zoom=15&size=300x200&markers=${location.lat},${location.lng}&key=YOUR_API_KEY`}
              alt="موقع"
              className="rounded-lg cursor-pointer"
              onClick={() => window.open(`https://maps.google.com/?q=${location.lat},${location.lng}`, '_blank')}
            />
            <p className="text-sm mt-1">📍 موقع مشترك</p>
          </div>
        );

      case 'sticker':
      case 'gif':
        return (
          <img
            src={message.content}
            alt={message.type}
            className="max-w-xs rounded-lg"
          />
        );

      default:
        return <p className="text-gray-500">نوع رسالة غير مدعوم</p>;
    }
  };

  // عرض الرد على رسالة
  const renderReplyTo = () => {
    if (!message.replyTo) return null;

    return (
      <div className="mb-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg border-l-4 border-blue-500">
        <p className="text-xs text-gray-500 mb-1">
          رد على {message.replyTo.senderName}
        </p>
        <p className="text-sm truncate">
          {message.replyTo.type === 'text' 
            ? message.replyTo.content 
            : `[${message.replyTo.type}]`
          }
        </p>
      </div>
    );
  };

  // عرض التفاعلات
  const renderReactions = () => {
    if (!message.reactions || message.reactions.length === 0) return null;

    // تجميع التفاعلات
    const reactionGroups = message.reactions.reduce((acc, reaction) => {
      if (!acc[reaction.reaction]) {
        acc[reaction.reaction] = [];
      }
      acc[reaction.reaction].push(reaction);
      return acc;
    }, {} as Record<string, typeof message.reactions>);

    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {Object.entries(reactionGroups).map(([emoji, reactions]) => (
          <TooltipProvider key={emoji}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={cn(
                    "px-2 py-1 rounded-full text-xs flex items-center gap-1",
                    "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700",
                    reactions.some(r => r.userId === message.senderId) && "ring-2 ring-blue-500"
                  )}
                  onClick={() => onReact(emoji)}
                >
                  <span>{emoji}</span>
                  <span>{reactions.length}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  {reactions.map(r => r.username).join(', ')}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    );
  };

  return (
    <div
      className={cn(
        "group relative flex gap-2",
        isOwn ? "flex-row-reverse" : "flex-row",
        isSelectionMode && "cursor-pointer",
        isSelected && "bg-blue-50 dark:bg-blue-900/20"
      )}
      onClick={() => isSelectionMode && onSelect()}
    >
      {/* الصورة الشخصية */}
      {!isOwn && (
        <Avatar className="w-8 h-8 mt-auto">
          <img 
            src={message.sender?.profileImage || '/default-avatar.png'} 
            alt={message.sender?.username || 'مستخدم'}
            className="w-full h-full object-cover"
          />
        </Avatar>
      )}

      <div className={cn("flex flex-col max-w-[70%]", isOwn && "items-end")}>
        {/* اسم المرسل (للمجموعات) */}
        {!isOwn && message.sender && (
          <span className="text-xs text-gray-500 mb-1 mr-2">
            {message.sender.username}
          </span>
        )}

        {/* فقاعة الرسالة */}
        <div
          className={cn(
            "relative rounded-2xl px-4 py-2",
            isOwn 
              ? "bg-blue-500 text-white rounded-tl-sm" 
              : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-tr-sm"
          )}
        >
          {/* الرد على رسالة */}
          {renderReplyTo()}

          {/* محتوى الرسالة */}
          {renderMessageContent()}

          {/* معلومات الرسالة */}
          <div className={cn(
            "flex items-center gap-1 mt-1",
            isOwn ? "justify-start" : "justify-end"
          )}>
            {/* علامة التعديل */}
            {message.isEdited && (
              <span className="text-xs opacity-70">
                (معدّلة)
              </span>
            )}

            {/* الوقت */}
            <span className="text-xs opacity-70">
              {formatDistanceToNow(new Date(message.createdAt), { 
                addSuffix: false, 
                locale: ar 
              })}
            </span>

            {/* حالة الرسالة */}
            {renderMessageStatus()}
          </div>

          {/* قائمة الخيارات */}
          {!isSelectionMode && (
            <div className={cn(
              "absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity",
              isOwn ? "left-full ml-1" : "right-full mr-1"
            )}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isOwn ? "end" : "start"}>
                  <DropdownMenuItem onClick={onReply}>
                    <Reply className="w-4 h-4 ml-2" />
                    رد
                  </DropdownMenuItem>
                  
                  {isOwn && message.type === 'text' && !message.isDeleted && (
                    <DropdownMenuItem onClick={onEdit}>
                      <Edit2 className="w-4 h-4 ml-2" />
                      تعديل
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem onClick={() => {
                    navigator.clipboard.writeText(message.content || '');
                  }}>
                    <Copy className="w-4 h-4 ml-2" />
                    نسخ
                  </DropdownMenuItem>

                  <DropdownMenuItem>
                    <Forward className="w-4 h-4 ml-2" />
                    توجيه
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  {isOwn && (
                    <>
                      <DropdownMenuItem 
                        onClick={() => onDelete(false)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 ml-2" />
                        حذف لي فقط
                      </DropdownMenuItem>
                      
                      {!message.isDeleted && (
                        <DropdownMenuItem 
                          onClick={() => onDelete(true)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 ml-2" />
                          حذف للجميع
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* زر التفاعلات */}
          {!isSelectionMode && (
            <button
              className={cn(
                "absolute -bottom-6 opacity-0 group-hover:opacity-100 transition-opacity",
                "bg-white dark:bg-gray-800 rounded-full shadow-md p-1",
                isOwn ? "right-0" : "left-0"
              )}
              onClick={() => setShowReactions(!showReactions)}
            >
              <Heart className="w-4 h-4 text-gray-500" />
            </button>
          )}

          {/* قائمة التفاعلات */}
          {showReactions && (
            <div className={cn(
              "absolute -bottom-10 bg-white dark:bg-gray-800 rounded-full shadow-lg p-2 flex gap-1",
              isOwn ? "right-0" : "left-0"
            )}>
              {availableReactions.map(reaction => (
                <button
                  key={reaction}
                  className="hover:scale-125 transition-transform"
                  onClick={() => {
                    onReact(reaction);
                    setShowReactions(false);
                  }}
                >
                  {reaction}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* التفاعلات */}
        {renderReactions()}
      </div>
    </div>
  );
}
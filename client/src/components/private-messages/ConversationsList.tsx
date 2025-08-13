import React, { useState, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Search, Plus, Pin, Archive, MoreVertical, Phone, Video, Check, CheckCheck } from 'lucide-react';
import { ConversationWithDetails, MessageStatus } from '@/types/private-messages';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ConversationsListProps {
  conversations: ConversationWithDetails[];
  activeConversationId?: number;
  onSelectConversation: (conversationId: number) => void;
  onCreateConversation: () => void;
  onPinConversation: (conversationId: number) => void;
  onArchiveConversation: (conversationId: number) => void;
  onMuteConversation: (conversationId: number) => void;
  onStartCall: (conversationId: number, type: 'voice' | 'video') => void;
}

export function ConversationsList({
  conversations,
  activeConversationId,
  onSelectConversation,
  onCreateConversation,
  onPinConversation,
  onArchiveConversation,
  onMuteConversation,
  onStartCall,
}: ConversationsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  // فلترة وترتيب المحادثات
  const filteredConversations = useMemo(() => {
    let filtered = conversations;

    // فلترة حسب الأرشفة
    if (!showArchived) {
      filtered = filtered.filter(conv => !conv.participant.isArchived);
    } else {
      filtered = filtered.filter(conv => conv.participant.isArchived);
    }

    // فلترة حسب البحث
    if (searchQuery) {
      filtered = filtered.filter(conv => {
        const otherParticipant = conv.otherParticipants[0];
        const name = conv.conversation.type === 'group' 
          ? conv.conversation.name 
          : otherParticipant?.username;
        
        return name?.toLowerCase().includes(searchQuery.toLowerCase());
      });
    }

    // ترتيب: المثبتة أولاً، ثم حسب آخر رسالة
    return filtered.sort((a, b) => {
      if (a.participant.isPinned && !b.participant.isPinned) return -1;
      if (!a.participant.isPinned && b.participant.isPinned) return 1;
      
      const aTime = new Date(a.conversation.lastMessageAt || a.conversation.createdAt).getTime();
      const bTime = new Date(b.conversation.lastMessageAt || b.conversation.createdAt).getTime();
      
      return bTime - aTime;
    });
  }, [conversations, searchQuery, showArchived]);

  // عرض اسم المحادثة
  const getConversationName = (conv: ConversationWithDetails) => {
    if (conv.conversation.type === 'group') {
      return conv.conversation.name || 'مجموعة بدون اسم';
    }
    
    const otherParticipant = conv.otherParticipants[0];
    return otherParticipant?.username || 'مستخدم محذوف';
  };

  // عرض صورة المحادثة
  const getConversationAvatar = (conv: ConversationWithDetails) => {
    if (conv.conversation.type === 'group') {
      return conv.conversation.avatar || '/default-group-avatar.png';
    }
    
    const otherParticipant = conv.otherParticipants[0];
    return otherParticipant?.profileImage || '/default-avatar.png';
  };

  // عرض معاينة آخر رسالة
  const getLastMessagePreview = (conv: ConversationWithDetails) => {
    const lastMessage = conv.lastMessage;
    if (!lastMessage) return 'لا توجد رسائل بعد';

    let preview = '';
    
    // إضافة اسم المرسل للمجموعات
    if (conv.conversation.type === 'group' && lastMessage.sender) {
      preview = `${lastMessage.sender.username}: `;
    }

    // محتوى الرسالة حسب النوع
    switch (lastMessage.type) {
      case 'text':
        preview += lastMessage.content || '';
        break;
      case 'image':
        preview += '📷 صورة';
        break;
      case 'video':
        preview += '🎥 فيديو';
        break;
      case 'audio':
        preview += '🎵 رسالة صوتية';
        break;
      case 'file':
        preview += '📎 ملف';
        break;
      case 'location':
        preview += '📍 موقع';
        break;
      case 'sticker':
        preview += '🎨 ملصق';
        break;
      case 'gif':
        preview += 'GIF';
        break;
      default:
        preview += 'رسالة';
    }

    return preview;
  };

  // عرض حالة الرسالة
  const getMessageStatusIcon = (status?: MessageStatus) => {
    switch (status) {
      case 'sent':
        return <Check className="w-3 h-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-gray-400" />;
      case 'read':
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* الرأس */}
      <div className="p-4 border-b dark:border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">المحادثات</h2>
          <Button
            size="sm"
            variant="ghost"
            onClick={onCreateConversation}
            className="rounded-full"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        {/* شريط البحث */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث في المحادثات..."
            className="pr-10"
          />
        </div>

        {/* تبويبات */}
        <div className="flex gap-2 mt-3">
          <Button
            variant={!showArchived ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setShowArchived(false)}
          >
            الرسائل
          </Button>
          <Button
            variant={showArchived ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setShowArchived(true)}
          >
            الأرشيف
          </Button>
        </div>
      </div>

      {/* قائمة المحادثات */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p className="text-lg mb-2">
              {searchQuery 
                ? 'لا توجد نتائج للبحث' 
                : showArchived 
                  ? 'لا توجد محادثات مؤرشفة'
                  : 'لا توجد محادثات بعد'
              }
            </p>
            {!searchQuery && !showArchived && (
              <Button variant="outline" onClick={onCreateConversation}>
                ابدأ محادثة جديدة
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y dark:divide-gray-800">
            {filteredConversations.map((conv) => {
              const isActive = conv.conversation.id === activeConversationId;
              const otherParticipant = conv.otherParticipants[0];
              const isOnline = otherParticipant?.isOnline;

              return (
                <div
                  key={conv.conversation.id}
                  className={cn(
                    'flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors',
                    isActive && 'bg-blue-50 dark:bg-blue-900/20'
                  )}
                  onClick={() => onSelectConversation(conv.conversation.id)}
                >
                  {/* الصورة الشخصية */}
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      <img 
                        src={getConversationAvatar(conv)} 
                        alt={getConversationName(conv)}
                        className="w-full h-full object-cover"
                      />
                    </Avatar>
                    
                    {/* حالة الاتصال */}
                    {conv.conversation.type === 'direct' && isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900" />
                    )}

                    {/* أيقونة التثبيت */}
                    {conv.participant.isPinned && (
                      <div className="absolute -top-1 -left-1 bg-blue-500 rounded-full p-1">
                        <Pin className="w-3 h-3 text-white fill-white" />
                      </div>
                    )}
                  </div>

                  {/* محتوى المحادثة */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold truncate">
                        {getConversationName(conv)}
                      </h3>
                      <div className="flex items-center gap-1">
                        {/* حالة الرسالة */}
                        {conv.lastMessage && conv.lastMessage.senderId === conv.participant.userId && (
                          getMessageStatusIcon(conv.lastMessage.status as MessageStatus)
                        )}
                        
                        {/* الوقت */}
                        <span className="text-xs text-gray-500">
                          {conv.lastMessage && formatDistanceToNow(
                            new Date(conv.lastMessage.createdAt),
                            { addSuffix: true, locale: ar }
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      {/* معاينة الرسالة */}
                      <p className={cn(
                        'text-sm truncate',
                        conv.unreadCount > 0 ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-500'
                      )}>
                        {getLastMessagePreview(conv)}
                      </p>

                      <div className="flex items-center gap-2">
                        {/* عداد الرسائل غير المقروءة */}
                        {conv.unreadCount > 0 && (
                          <Badge variant="default" className="min-w-[20px] h-5 px-1">
                            {conv.unreadCount}
                          </Badge>
                        )}

                        {/* أيقونة الكتم */}
                        {conv.participant.isMuted && (
                          <span className="text-gray-400">🔇</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* قائمة الخيارات */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onStartCall(conv.conversation.id, 'voice')}>
                        <Phone className="w-4 h-4 ml-2" />
                        مكالمة صوتية
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onStartCall(conv.conversation.id, 'video')}>
                        <Video className="w-4 h-4 ml-2" />
                        مكالمة فيديو
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onPinConversation(conv.conversation.id)}>
                        <Pin className="w-4 h-4 ml-2" />
                        {conv.participant.isPinned ? 'إلغاء التثبيت' : 'تثبيت'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onMuteConversation(conv.conversation.id)}>
                        <span className="ml-2">🔇</span>
                        {conv.participant.isMuted ? 'إلغاء الكتم' : 'كتم الإشعارات'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onArchiveConversation(conv.conversation.id)}>
                        <Archive className="w-4 h-4 ml-2" />
                        {conv.participant.isArchived ? 'إلغاء الأرشفة' : 'أرشفة'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
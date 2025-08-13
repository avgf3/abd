import React, { useState, useEffect, useRef, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { 
  Send, 
  Paperclip, 
  Smile, 
  MoreVertical, 
  Phone, 
  Video, 
  Search,
  ArrowLeft,
  Edit2,
  Trash2,
  Reply,
  Forward,
  Copy,
  Download,
  Mic,
  Camera,
  Image as ImageIcon,
  FileText,
  MapPin
} from 'lucide-react';
import { ConversationWithDetails, PrivateMessage, TypingIndicator, MessageDraft } from '@/types/private-messages';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { useAuth } from '@/contexts/UserContext';
import { cn } from '@/lib/utils';
import { MessageItem } from './MessageItem';
import { MessageInput } from './MessageInput';
import { TypingIndicatorDisplay } from './TypingIndicatorDisplay';
import { EmojiPicker } from './EmojiPicker';
import { AttachmentPicker } from './AttachmentPicker';

interface ConversationViewProps {
  conversation: ConversationWithDetails;
  messages: PrivateMessage[];
  typingIndicators: TypingIndicator[];
  draft?: MessageDraft;
  loadingMessages: boolean;
  sendingMessage: boolean;
  onSendMessage: (content: string, type?: any) => void;
  onSendFile: (file: File) => void;
  onEditMessage: (messageId: number, newContent: string) => void;
  onDeleteMessage: (messageId: number, deleteForEveryone?: boolean) => void;
  onAddReaction: (messageId: number, reaction: string) => void;
  onMarkAsRead: (messageIds: number[]) => void;
  onTypingStatusChange: (isTyping: boolean) => void;
  onSaveDraft: (content: string) => void;
  onStartCall: (type: 'voice' | 'video') => void;
  onBack?: () => void;
  onLoadMoreMessages?: () => void;
}

export function ConversationView({
  conversation,
  messages,
  typingIndicators,
  draft,
  loadingMessages,
  sendingMessage,
  onSendMessage,
  onSendFile,
  onEditMessage,
  onDeleteMessage,
  onAddReaction,
  onMarkAsRead,
  onTypingStatusChange,
  onSaveDraft,
  onStartCall,
  onBack,
  onLoadMoreMessages,
}: ConversationViewProps) {
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [messageText, setMessageText] = useState(draft?.content || '');
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<PrivateMessage | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<number>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // تحديد اسم المحادثة
  const conversationName = conversation.conversation.type === 'group' 
    ? conversation.conversation.name 
    : conversation.otherParticipants[0]?.username || 'مستخدم محذوف';

  // تحديد صورة المحادثة
  const conversationAvatar = conversation.conversation.type === 'group'
    ? conversation.conversation.avatar
    : conversation.otherParticipants[0]?.profileImage || '/default-avatar.png';

  // تحديد حالة الاتصال
  const isOnline = conversation.conversation.type === 'direct' && conversation.otherParticipants[0]?.isOnline;
  const lastSeen = conversation.conversation.type === 'direct' && conversation.otherParticipants[0]?.lastSeen;

  // التمرير إلى أسفل عند وصول رسائل جديدة
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // تحديد الرسائل كمقروءة
  useEffect(() => {
    const unreadMessages = messages.filter(msg => 
      msg.senderId !== user?.id && 
      msg.status !== 'read' &&
      !msg.readBy?.includes(user?.id || 0)
    );

    if (unreadMessages.length > 0) {
      const unreadIds = unreadMessages.map(msg => msg.id);
      onMarkAsRead(unreadIds);
    }
  }, [messages, user, onMarkAsRead]);

  // تحديث حالة الكتابة
  const handleTyping = useCallback((text: string) => {
    setMessageText(text);
    
    // حفظ المسودة
    if (text.trim()) {
      onSaveDraft(text);
    }

    // إرسال حالة الكتابة
    if (text.trim() && !sendingMessage) {
      onTypingStatusChange(true);
    } else {
      onTypingStatusChange(false);
    }
  }, [onSaveDraft, onTypingStatusChange, sendingMessage]);

  // إرسال الرسالة
  const handleSendMessage = useCallback(() => {
    if (!messageText.trim()) return;

    if (editingMessageId) {
      onEditMessage(editingMessageId, messageText.trim());
      setEditingMessageId(null);
    } else {
      onSendMessage(messageText.trim());
    }

    setMessageText('');
    setReplyToMessage(null);
    onTypingStatusChange(false);
  }, [messageText, editingMessageId, onSendMessage, onEditMessage, onTypingStatusChange]);

  // التعامل مع ضغط Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // بدء تعديل رسالة
  const startEditMessage = (message: PrivateMessage) => {
    if (message.senderId !== user?.id || message.type !== 'text') return;
    
    setEditingMessageId(message.id);
    setMessageText(message.content || '');
    setReplyToMessage(null);
  };

  // إلغاء التعديل
  const cancelEdit = () => {
    setEditingMessageId(null);
    setMessageText(draft?.content || '');
  };

  // الرد على رسالة
  const replyToMsg = (message: PrivateMessage) => {
    setReplyToMessage(message);
    setEditingMessageId(null);
  };

  // تحديد/إلغاء تحديد رسالة
  const toggleMessageSelection = (messageId: number) => {
    const newSelection = new Set(selectedMessages);
    if (newSelection.has(messageId)) {
      newSelection.delete(messageId);
    } else {
      newSelection.add(messageId);
    }
    setSelectedMessages(newSelection);
    
    if (newSelection.size === 0) {
      setIsSelectionMode(false);
    }
  };

  // حذف الرسائل المحددة
  const deleteSelectedMessages = (deleteForEveryone = false) => {
    selectedMessages.forEach(messageId => {
      onDeleteMessage(messageId, deleteForEveryone);
    });
    setSelectedMessages(new Set());
    setIsSelectionMode(false);
  };

  // التحقق من التمرير لتحميل المزيد
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current || loadingMessages) return;

    if (messagesContainerRef.current.scrollTop === 0 && onLoadMoreMessages) {
      onLoadMoreMessages();
    }
  }, [loadingMessages, onLoadMoreMessages]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* رأس المحادثة */}
      <div className="flex items-center justify-between p-4 border-b dark:border-gray-800">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} className="lg:hidden">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}

          <Avatar className="w-10 h-10">
            <img src={conversationAvatar} alt={conversationName} className="w-full h-full object-cover" />
          </Avatar>

          <div>
            <h3 className="font-semibold">{conversationName}</h3>
            <p className="text-sm text-gray-500">
              {isOnline ? (
                <span className="text-green-500">متصل الآن</span>
              ) : lastSeen ? (
                `آخر ظهور ${formatDistanceToNow(new Date(lastSeen), { addSuffix: true, locale: ar })}`
              ) : (
                conversation.otherParticipants.length > 0 && `${conversation.otherParticipants.length} عضو`
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSelectionMode ? (
            <>
              <span className="text-sm text-gray-500">{selectedMessages.size} محدد</span>
              <Button variant="ghost" size="sm" onClick={() => deleteSelectedMessages(false)}>
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setSelectedMessages(new Set());
                  setIsSelectionMode(false);
                }}
              >
                إلغاء
              </Button>
            </>
          ) : (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={() => onStartCall('voice')}>
                      <Phone className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>مكالمة صوتية</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={() => onStartCall('video')}>
                      <Video className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>مكالمة فيديو</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Search className="w-4 h-4 ml-2" />
                    البحث في المحادثة
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsSelectionMode(true)}>
                    تحديد الرسائل
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    مسح المحادثة
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>

      {/* منطقة الرسائل */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
        onScroll={handleScroll}
      >
        {loadingMessages && (
          <div className="text-center text-gray-500">جاري تحميل الرسائل...</div>
        )}

        {messages.map((message, index) => {
          const showDate = index === 0 || 
            new Date(message.createdAt).toDateString() !== 
            new Date(messages[index - 1].createdAt).toDateString();

          return (
            <React.Fragment key={message.id}>
              {showDate && (
                <div className="text-center text-xs text-gray-500 my-4">
                  {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true, locale: ar })}
                </div>
              )}
              
              <MessageItem
                message={message}
                isOwn={message.senderId === user?.id}
                isSelected={selectedMessages.has(message.id)}
                isSelectionMode={isSelectionMode}
                onSelect={() => toggleMessageSelection(message.id)}
                onReply={() => replyToMsg(message)}
                onEdit={() => startEditMessage(message)}
                onDelete={(deleteForEveryone) => onDeleteMessage(message.id, deleteForEveryone)}
                onReact={(reaction) => onAddReaction(message.id, reaction)}
              />
            </React.Fragment>
          );
        })}

        {/* مؤشرات الكتابة */}
        {typingIndicators.length > 0 && (
          <TypingIndicatorDisplay indicators={typingIndicators} />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* منطقة الإدخال */}
      <div className="border-t dark:border-gray-800 p-4">
        {/* عرض الرد أو التعديل */}
        {(replyToMessage || editingMessageId) && (
          <div className="mb-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              {editingMessageId ? (
                <>
                  <Edit2 className="w-4 h-4 text-blue-500" />
                  <span className="text-sm">تعديل الرسالة</span>
                </>
              ) : (
                <>
                  <Reply className="w-4 h-4 text-blue-500" />
                  <span className="text-sm">
                    الرد على {replyToMessage?.sender?.username}
                  </span>
                </>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setReplyToMessage(null);
                cancelEdit();
              }}
            >
              ✕
            </Button>
          </div>
        )}

        <MessageInput
          value={messageText}
          onChange={handleTyping}
          onSend={handleSendMessage}
          onAttachment={onSendFile}
          disabled={sendingMessage}
          placeholder={editingMessageId ? 'تعديل الرسالة...' : 'اكتب رسالتك...'}
        />
      </div>
    </div>
  );
}
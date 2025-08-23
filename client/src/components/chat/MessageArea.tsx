import { Send, Image as ImageIcon, Smile } from 'lucide-react';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';

import EmojiPicker from './EmojiPicker';
import ProfileImage from './ProfileImage';
import UserRoleBadge from './UserRoleBadge';
import MessageComposer from './MessageComposer';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useIsMobile } from '@/hooks/use-mobile';
import { apiRequest, api } from '@/lib/queryClient';
import type { ChatMessage, ChatUser } from '@/types/chat';
import {
  findMentions,
  playMentionSound,
  renderMessageWithMentions,
  insertMention,
} from '@/utils/mentionUtils';
import { getDynamicBorderColor } from '@/utils/messageUtils';
import { getFinalUsernameColor } from '@/utils/themeUtils';
import { formatTime } from '@/utils/timeUtils';

interface MessageAreaProps {
  messages: ChatMessage[];
  currentUser: ChatUser | null;
  onSendMessage: (content: string, messageType?: string) => void;
  onTyping: () => void;
  typingUsers: Set<string>;
  onReportMessage?: (user: ChatUser, messageContent: string, messageId: number) => void;
  onUserClick?: (event: React.MouseEvent, user: ChatUser) => void;
  onlineUsers?: ChatUser[]; // إضافة قائمة المستخدمين المتصلين للمنشن
  currentRoomName?: string; // اسم الغرفة الحالية
  currentRoomId?: string; // معرف الغرفة الحالية
  ignoredUserIds?: Set<number>; // قائمة المتجاهلين لحجب الرسائل ظاهرياً
  compactHeader?: boolean; // تفعيل نمط مدمج للرأس والمسافات
}

export default function MessageArea({
  messages,
  currentUser,
  onSendMessage,
  onTyping,
  typingUsers,
  onReportMessage,
  onUserClick,
  onlineUsers = [],
  currentRoomName = 'الدردشة العامة',
  currentRoomId = 'general',
  ignoredUserIds,
  compactHeader = false,
}: MessageAreaProps) {
  const [messageText, setMessageText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const isMobile = useIsMobile();

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const lastTypingTime = useRef<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const prevMessagesLenRef = useRef<number>(0);

  // State for improved scroll behavior
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // 🔥 SIMPLIFIED message filtering - حذف الفلترة المعقدة التي تخفي رسائل صحيحة
  const validMessages = useMemo(() => {
    // ✅ فلترة بسيطة فقط لإزالة الرسائل الفارغة تماماً
    const base = messages.filter(
      (msg) => msg && msg.content && msg.content.trim() !== '' && msg.sender // التأكد من وجود بيانات المرسل الأساسية
    );
    // ✅ حجب رسائل المستخدمين المتجاهَلين (حماية واجهة فقط؛ الخادم يمنع أيضاً للخاص)
    if (ignoredUserIds && ignoredUserIds.size > 0) {
      return base.filter((msg) => !ignoredUserIds.has(msg.senderId));
    }
    return base;
  }, [messages, ignoredUserIds]);

  // Scroll to bottom function - optimized via Virtuoso
  type ScrollBehaviorStrict = 'auto' | 'smooth';
  const scrollToBottom = useCallback(
    (behavior: ScrollBehaviorStrict = 'smooth') => {
      if (!virtuosoRef.current || validMessages.length === 0) return;
      virtuosoRef.current.scrollToIndex({
        index: validMessages.length - 1,
        align: 'end',
        behavior,
      });
    },
    [validMessages.length]
  );

  // Track bottom state from Virtuoso
  const handleAtBottomChange = useCallback((atBottom: boolean) => {
    setIsAtBottom(atBottom);
    if (atBottom) setUnreadCount(0);
  }, []);

  // Auto scroll to bottom only when appropriate
  useEffect(() => {
    const prevLen = prevMessagesLenRef.current;
    const currLen = validMessages.length;
    if (currLen <= prevLen) return;

    const lastMessage = validMessages[currLen - 1];
    const sentByMe = !!(currentUser && lastMessage?.sender?.id === currentUser.id);

    // If first load, or user is at bottom, or the last message was sent by me, autoscroll
    if (prevLen === 0 || isAtBottom || sentByMe) {
      scrollToBottom(prevLen === 0 ? 'auto' : 'smooth');
      setUnreadCount(0);
    } else {
      setUnreadCount((count) => count + (currLen - prevLen));
    }

    prevMessagesLenRef.current = currLen;
  }, [validMessages.length, isAtBottom, currentUser, scrollToBottom]);

  // Ensure initial prev length is set on mount
  useEffect(() => {
    prevMessagesLenRef.current = validMessages.length;
    // If there are messages on first mount, jump to bottom without animation
    if (validMessages.length > 0) {
      const t = setTimeout(() => scrollToBottom('auto'), 0);
      return () => clearTimeout(t);
    }
  }, []);

  // تشغيل صوت التنبيه عند استقبال منشن - محسن
  useEffect(() => {
    if (validMessages.length > 0 && currentUser) {
      const lastMessage = validMessages[validMessages.length - 1];

      // فحص إذا كانت الرسالة الأخيرة تحتوي على منشن للمستخدم الحالي
      // وليست من المستخدم الحالي نفسه
      if (
        lastMessage?.content?.includes(`@${currentUser.username}`) &&
        lastMessage?.sender?.id !== currentUser.id
      ) {
        playMentionSound();
      }
    }
  }, [validMessages.length, currentUser?.id]);

  // Typing indicator logic (unchanged)
  const notifyTyping = useCallback(() => {
    const now = Date.now();
    lastTypingTime.current = now;
    if (!isTyping) setIsTyping(true);
    onTyping();
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (Date.now() - lastTypingTime.current >= 1000) setIsTyping(false);
    }, 1200);
  }, [isTyping, onTyping]);

  const handleSend = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      onSendMessage(trimmed);
      setMessageText('');
      setShowEmojiPicker(false);
      setTimeout(() => scrollToBottom('smooth'), 0);
    },
    [onSendMessage, scrollToBottom]
  );

  return (
    <div className="flex h-full flex-col">
      {/* messages list here (omitted for brevity) */}

      {/* Composer extracted */}
      <MessageComposer
        value={messageText}
        onChange={setMessageText}
        onTyping={notifyTyping}
        onSend={handleSend}
        showEmojiPicker={showEmojiPicker}
        setShowEmojiPicker={setShowEmojiPicker}
        inputRef={inputRef}
        fileInputRef={fileInputRef}
        isMobile={isMobile}
      />
    </div>
  );
}

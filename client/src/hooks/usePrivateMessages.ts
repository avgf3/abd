import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/contexts/UserContext';
import type {
  ConversationWithDetails,
  PrivateMessage,
  MessageDraft,
  TypingIndicator,
  CallLog,
  MessageType,
  SendMessageState,
} from '@/types/private-messages';
import { getSocket } from '@/lib/socket';

interface UsePrivateMessagesReturn {
  // المحادثات
  conversations: ConversationWithDetails[];
  activeConversation: ConversationWithDetails | null;
  loadingConversations: boolean;
  
  // الرسائل
  messages: Map<number, PrivateMessage[]>; // conversationId -> messages
  loadingMessages: Map<number, boolean>;
  sendingState: SendMessageState;
  
  // حالة الكتابة
  typingIndicators: Map<number, TypingIndicator[]>; // conversationId -> typing users
  
  // المسودات
  drafts: Map<number, MessageDraft>;
  
  // المكالمات
  activeCalls: Map<number, CallLog>;
  incomingCall: { call: CallLog; caller: any } | null;
  
  // الإجراءات
  loadConversations: () => Promise<void>;
  createConversation: (participantId: number) => Promise<ConversationWithDetails>;
  loadMessages: (conversationId: number, options?: { beforeId?: number }) => Promise<void>;
  sendMessage: (conversationId: number, content: string, type?: MessageType) => Promise<void>;
  sendFile: (conversationId: number, file: File) => Promise<void>;
  editMessage: (messageId: number, conversationId: number, newContent: string) => Promise<void>;
  deleteMessage: (messageId: number, conversationId: number, deleteForEveryone?: boolean) => Promise<void>;
  markAsRead: (conversationId: number, messageIds: number[]) => Promise<void>;
  setTypingStatus: (conversationId: number, isTyping: boolean) => void;
  saveDraft: (conversationId: number, content: string) => void;
  addReaction: (messageId: number, conversationId: number, reaction: string) => Promise<void>;
  
  // إدارة المحادثات
  pinConversation: (conversationId: number) => Promise<void>;
  muteConversation: (conversationId: number, duration?: number) => Promise<void>;
  archiveConversation: (conversationId: number) => Promise<void>;
  
  // المكالمات
  startCall: (conversationId: number, type: 'voice' | 'video') => Promise<void>;
  answerCall: (callId: number) => void;
  endCall: (callId: number) => void;
  rejectCall: (callId: number) => void;
  
  // البحث
  searchMessages: (query: string, filters?: any) => Promise<PrivateMessage[]>;
  
  // الأدوات
  setActiveConversation: (conversationId: number | null) => void;
  getUnreadCount: (conversationId: number) => number;
  getTotalUnreadCount: () => number;
}

export function usePrivateMessages(): UsePrivateMessagesReturn {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  
  // الحالة
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [activeConversation, setActiveConversation] = useState<ConversationWithDetails | null>(null);
  const [loadingConversations, setLoadingConversations] = useState(false);
  
  const [messages, setMessages] = useState<Map<number, PrivateMessage[]>>(new Map());
  const [loadingMessages, setLoadingMessages] = useState<Map<number, boolean>>(new Map());
  const [sendingState, setSendingState] = useState<SendMessageState>({ isLoading: false });
  
  const [typingIndicators, setTypingIndicators] = useState<Map<number, TypingIndicator[]>>(new Map());
  const [drafts, setDrafts] = useState<Map<number, MessageDraft>>(new Map());
  
  const [activeCalls, setActiveCalls] = useState<Map<number, CallLog>>(new Map());
  const [incomingCall, setIncomingCall] = useState<{ call: CallLog; caller: any } | null>(null);
  
  const typingTimeoutsRef = useRef<Map<number, NodeJS.Timeout>>(new Map());

  // الاتصال بـ Socket.IO
  useEffect(() => {
    if (!user) return;

    const socket = getSocket();

    socketRef.current = socket as unknown as Socket;

    // معالجات الأحداث
    socket.on('connect', () => {
      socket.emit('join_conversations');
    });

    socket.on('conversations_joined', ({ conversationIds }) => {
    });

    socket.on('new_message', (message: PrivateMessage) => {
      handleNewMessage(message);
    });

    socket.on('message_edited', ({ messageId, conversationId, newContent, editedAt }) => {
      handleMessageEdit(conversationId, messageId, newContent, editedAt);
    });

    socket.on('message_deleted', ({ messageId, conversationId, deleteForEveryone }) => {
      handleMessageDelete(conversationId, messageId, deleteForEveryone);
    });

    socket.on('typing_status', (indicator: TypingIndicator) => {
      handleTypingStatus(indicator);
    });

    socket.on('messages_read', ({ conversationId, userId, messageIds }) => {
      handleMessagesRead(conversationId, userId, messageIds);
    });

    socket.on('reaction_update', ({ messageId, conversationId, user, reaction, action }) => {
      handleReactionUpdate(conversationId, messageId, user, reaction, action);
    });

    socket.on('incoming_call', ({ call, caller }) => {
      setIncomingCall({ call, caller });
    });

    socket.on('call_answered', ({ callId }) => {
      const call = Array.from(activeCalls.values()).find(c => c.id === callId);
      if (call) {
        setActiveCalls(prev => new Map(prev).set(call.conversationId, {
          ...call,
          status: 'answered',
          answeredAt: new Date().toISOString(),
        }));
      }
    });

    socket.on('call_ended', ({ callId }) => {
      const call = Array.from(activeCalls.values()).find(c => c.id === callId);
      if (call) {
        setActiveCalls(prev => {
          const newCalls = new Map(prev);
          newCalls.delete(call.conversationId);
          return newCalls;
        });
      }
      if (incomingCall?.call.id === callId) {
        setIncomingCall(null);
      }
    });

    socket.on('error', ({ message }) => {
      console.error('خطأ في Socket:', message);
    });

    return () => {
      socket.off('new_message');
      socket.off('message_edited');
      socket.off('message_deleted');
      socket.off('typing_status');
      socket.off('messages_read');
      socket.off('reaction_update');
      socket.off('incoming_call');
      socket.off('call_answered');
      socket.off('call_ended');
    };
  }, [user]);

  // معالجات الأحداث
  const handleNewMessage = useCallback((message: PrivateMessage) => {
    setMessages(prev => {
      const newMessages = new Map(prev);
      const conversationMessages = newMessages.get(message.conversationId) || [];
      newMessages.set(message.conversationId, [...conversationMessages, message]);
      return newMessages;
    });

    // تحديث آخر رسالة في المحادثة
    setConversations(prev => prev.map(conv => {
      if (conv.conversation.id === message.conversationId) {
        return {
          ...conv,
          conversation: {
            ...conv.conversation,
            lastMessageId: message.id,
            lastMessageAt: message.createdAt,
          },
          lastMessage: {
            id: message.id,
            content: message.content,
            type: message.type,
            senderId: message.senderId,
            createdAt: message.createdAt,
            sender: message.sender,
          },
          unreadCount: message.senderId !== user?.id ? conv.unreadCount + 1 : conv.unreadCount,
        };
      }
      return conv;
    }));
  }, [user]);

  const handleMessageEdit = useCallback((conversationId: number, messageId: number, newContent: string, editedAt: string) => {
    setMessages(prev => {
      const newMessages = new Map(prev);
      const conversationMessages = newMessages.get(conversationId) || [];
      const updatedMessages = conversationMessages.map(msg => {
        if (msg.id === messageId) {
          return {
            ...msg,
            content: newContent,
            isEdited: true,
            editedAt,
          };
        }
        return msg;
      });
      newMessages.set(conversationId, updatedMessages);
      return newMessages;
    });
  }, []);

  const handleMessageDelete = useCallback((conversationId: number, messageId: number, deleteForEveryone: boolean) => {
    setMessages(prev => {
      const newMessages = new Map(prev);
      const conversationMessages = newMessages.get(conversationId) || [];
      
      if (deleteForEveryone) {
        const updatedMessages = conversationMessages.map(msg => {
          if (msg.id === messageId) {
            return {
              ...msg,
              isDeleted: true,
              content: undefined,
              attachments: [],
            };
          }
          return msg;
        });
        newMessages.set(conversationId, updatedMessages);
      } else {
        const filteredMessages = conversationMessages.filter(msg => msg.id !== messageId);
        newMessages.set(conversationId, filteredMessages);
      }
      
      return newMessages;
    });
  }, []);

  const handleTypingStatus = useCallback((indicator: TypingIndicator) => {
    const { conversationId, user: typingUser, isTyping } = indicator;

    setTypingIndicators(prev => {
      const newIndicators = new Map(prev);
      const conversationIndicators = newIndicators.get(conversationId) || [];
      
      if (isTyping) {
        const exists = conversationIndicators.find(ind => ind.user.id === typingUser.id);
        if (!exists) {
          newIndicators.set(conversationId, [...conversationIndicators, indicator]);
        }
        
        // إزالة المؤشر بعد 10 ثواني
        const existingTimeout = typingTimeoutsRef.current.get(typingUser.id);
        if (existingTimeout) clearTimeout(existingTimeout);
        
        const timeout = setTimeout(() => {
          setTypingIndicators(prev => {
            const newInd = new Map(prev);
            const convInd = newInd.get(conversationId) || [];
            newInd.set(conversationId, convInd.filter(ind => ind.user.id !== typingUser.id));
            return newInd;
          });
        }, 10000);
        
        typingTimeoutsRef.current.set(typingUser.id, timeout);
      } else {
        newIndicators.set(conversationId, conversationIndicators.filter(ind => ind.user.id !== typingUser.id));
      }
      
      return newIndicators;
    });
  }, []);

  const handleMessagesRead = useCallback((conversationId: number, userId: number, messageIds: number[]) => {
    setMessages(prev => {
      const newMessages = new Map(prev);
      const conversationMessages = newMessages.get(conversationId) || [];
      const updatedMessages = conversationMessages.map(msg => {
        if (messageIds.includes(msg.id)) {
          const readBy = msg.readBy || [];
          if (!readBy.includes(userId)) {
            return {
              ...msg,
              readBy: [...readBy, userId],
              status: 'read' as const,
            };
          }
        }
        return msg;
      });
      newMessages.set(conversationId, updatedMessages);
      return newMessages;
    });
  }, []);

  const handleReactionUpdate = useCallback((
    conversationId: number,
    messageId: number,
    user: { id: number; username: string },
    reaction: string,
    action: 'added' | 'removed'
  ) => {
    setMessages(prev => {
      const newMessages = new Map(prev);
      const conversationMessages = newMessages.get(conversationId) || [];
      const updatedMessages = conversationMessages.map(msg => {
        if (msg.id === messageId) {
          const reactions = msg.reactions || [];
          if (action === 'added') {
            return {
              ...msg,
              reactions: [...reactions, { reaction, userId: user.id, username: user.username }],
            };
          } else {
            return {
              ...msg,
              reactions: reactions.filter(r => !(r.userId === user.id && r.reaction === reaction)),
            };
          }
        }
        return msg;
      });
      newMessages.set(conversationId, updatedMessages);
      return newMessages;
    });
  }, []);

  // الإجراءات
  const loadConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const response = await fetch('/api/private-messages/conversations', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'x-user-id': user?.id ? String(user.id) : ''
        },
      });
      
      if (!response.ok) throw new Error('فشل جلب المحادثات');
      
      const data = await response.json();
      setConversations(data.conversations);
    } catch (error) {
      console.error('خطأ في جلب المحادثات:', error);
    } finally {
      setLoadingConversations(false);
    }
  }, [user?.id]);

  const createConversation = useCallback(async (participantId: number): Promise<ConversationWithDetails> => {
    const response = await fetch('/api/private-messages/conversations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({
        type: 'direct',
        participantId,
      }),
    });
    
    if (!response.ok) throw new Error('فشل إنشاء المحادثة');
    
    const data = await response.json();
    await loadConversations(); // إعادة تحميل المحادثات
    return data.conversation;
  }, [loadConversations]);

  const loadMessages = useCallback(async (conversationId: number, options?: { beforeId?: number }) => {
    setLoadingMessages(prev => new Map(prev).set(conversationId, true));
    
    try {
      const params = new URLSearchParams();
      if (options?.beforeId) params.append('beforeId', options.beforeId.toString());
      
      const response = await fetch(`/api/private-messages/conversations/${conversationId}/messages?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'x-user-id': user?.id ? String(user.id) : ''
        },
      });
      
      if (!response.ok) throw new Error('فشل جلب الرسائل');
      
      const data = await response.json();
      
      setMessages(prev => {
        const newMessages = new Map(prev);
        const existingMessages = newMessages.get(conversationId) || [];
        
        if (options?.beforeId) {
          newMessages.set(conversationId, [...data.messages, ...existingMessages]);
        } else {
          newMessages.set(conversationId, data.messages);
        }
        
        return newMessages;
      });
      
      // الانضمام إلى غرفة المحادثة
      socketRef.current?.emit('join_conversation', conversationId);
    } catch (error) {
      console.error('خطأ في جلب الرسائل:', error);
    } finally {
      setLoadingMessages(prev => new Map(prev).set(conversationId, false));
    }
  }, [user?.id]);

  const sendMessage = useCallback(async (
    conversationId: number,
    content: string,
    type: MessageType = 'text'
  ) => {
    setSendingState({ isLoading: true });
    
    try {
      socketRef.current?.emit('send_message', {
        conversationId,
        content,
        type,
      });
      
      // حذف المسودة
      setDrafts(prev => {
        const newDrafts = new Map(prev);
        newDrafts.delete(conversationId);
        return newDrafts;
      });
      
      setSendingState({ isLoading: false });
    } catch (error) {
      console.error('خطأ في إرسال الرسالة:', error);
      setSendingState({ isLoading: false, error: 'فشل إرسال الرسالة' });
    }
  }, []);

  const sendFile = useCallback(async (conversationId: number, file: File) => {
    setSendingState({ isLoading: true, progress: 0 });
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`/api/private-messages/conversations/${conversationId}/messages/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'x-user-id': user?.id ? String(user.id) : ''
        },
        body: formData,
      });
      
      if (!response.ok) throw new Error('فشل رفع الملف');
      
      setSendingState({ isLoading: false });
    } catch (error) {
      console.error('خطأ في رفع الملف:', error);
      setSendingState({ isLoading: false, error: 'فشل رفع الملف' });
    }
  }, [user?.id]);

  const editMessage = useCallback(async (
    messageId: number,
    conversationId: number,
    newContent: string
  ) => {
    socketRef.current?.emit('edit_message', {
      messageId,
      conversationId,
      newContent,
    });
  }, []);

  const deleteMessage = useCallback(async (
    messageId: number,
    conversationId: number,
    deleteForEveryone = false
  ) => {
    socketRef.current?.emit('delete_message', {
      messageId,
      conversationId,
      deleteForEveryone,
    });
  }, []);

  const markAsRead = useCallback(async (conversationId: number, messageIds: number[]) => {
    socketRef.current?.emit('mark_messages_read', {
      conversationId,
      messageIds,
    });
    
    // تحديث عداد الرسائل غير المقروءة
    setConversations(prev => prev.map(conv => {
      if (conv.conversation.id === conversationId) {
        return {
          ...conv,
          unreadCount: 0,
          participant: {
            ...conv.participant,
            lastReadMessageId: Math.max(...messageIds),
            lastReadAt: new Date().toISOString(),
          },
        };
      }
      return conv;
    }));
  }, []);

  const setTypingStatus = useCallback((conversationId: number, isTyping: boolean) => {
    socketRef.current?.emit('typing_status', {
      conversationId,
      isTyping,
    });
  }, []);

  const saveDraft = useCallback((conversationId: number, content: string) => {
    if (!content.trim()) {
      setDrafts(prev => {
        const newDrafts = new Map(prev);
        newDrafts.delete(conversationId);
        return newDrafts;
      });
      return;
    }
    
    const draft: MessageDraft = {
      conversationId,
      userId: user!.id,
      content,
      updatedAt: new Date().toISOString(),
    };
    
    setDrafts(prev => new Map(prev).set(conversationId, draft));
    
    // حفظ في الخادم
    socketRef.current?.emit('save_draft', {
      conversationId,
      content,
    });
  }, [user]);

  const addReaction = useCallback(async (
    messageId: number,
    conversationId: number,
    reaction: string
  ) => {
    socketRef.current?.emit('toggle_reaction', {
      messageId,
      conversationId,
      reaction,
    });
  }, []);

  const pinConversation = useCallback(async (conversationId: number) => {
    try {
      const response = await fetch(`/api/private-messages/conversations/${conversationId}/pin`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'x-user-id': user?.id ? String(user.id) : ''
        },
      });
      
      if (!response.ok) throw new Error('فشل تثبيت المحادثة');
      
      const { isPinned } = await response.json();
      
      setConversations(prev => prev.map(conv => {
        if (conv.conversation.id === conversationId) {
          return {
            ...conv,
            participant: {
              ...conv.participant,
              isPinned,
              pinnedAt: isPinned ? new Date().toISOString() : undefined,
            },
          };
        }
        return conv;
      }));
    } catch (error) {
      console.error('خطأ في تثبيت المحادثة:', error);
    }
  }, [user?.id]);

  const muteConversation = useCallback(async (conversationId: number, duration?: number) => {
    try {
      const response = await fetch(`/api/private-messages/conversations/${conversationId}/mute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'x-user-id': user?.id ? String(user.id) : ''
        },
        body: JSON.stringify({ duration }),
      });
      
      if (!response.ok) throw new Error('فشل كتم المحادثة');
      
      const { isMuted, mutedUntil } = await response.json();
      
      setConversations(prev => prev.map(conv => {
        if (conv.conversation.id === conversationId) {
          return {
            ...conv,
            participant: {
              ...conv.participant,
              isMuted,
              mutedUntil,
            },
          };
        }
        return conv;
      }));
    } catch (error) {
      console.error('خطأ في كتم المحادثة:', error);
    }
  }, [user?.id]);

  const archiveConversation = useCallback(async (conversationId: number) => {
    try {
      const response = await fetch(`/api/private-messages/conversations/${conversationId}/archive`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'x-user-id': user?.id ? String(user.id) : ''
        },
      });
      
      if (!response.ok) throw new Error('فشل أرشفة المحادثة');
      
      const { isArchived } = await response.json();
      
      setConversations(prev => prev.map(conv => {
        if (conv.conversation.id === conversationId) {
          return {
            ...conv,
            participant: {
              ...conv.participant,
              isArchived,
              archivedAt: isArchived ? new Date().toISOString() : undefined,
            },
          };
        }
        return conv;
      }));
    } catch (error) {
      console.error('خطأ في أرشفة المحادثة:', error);
    }
  }, [user?.id]);

  const startCall = useCallback(async (conversationId: number, type: 'voice' | 'video') => {
    socketRef.current?.emit('start_call', {
      conversationId,
      type,
    });
  }, []);

  const answerCall = useCallback((callId: number) => {
    const call = incomingCall?.call;
    if (call) {
      socketRef.current?.emit('answer_call', {
        callId,
        conversationId: call.conversationId,
      });
      setActiveCalls(prev => new Map(prev).set(call.conversationId, {
        ...call,
        status: 'answered',
      }));
      setIncomingCall(null);
    }
  }, [incomingCall]);

  const endCall = useCallback((callId: number) => {
    const call = Array.from(activeCalls.values()).find(c => c.id === callId);
    if (call) {
      socketRef.current?.emit('end_call', {
        callId,
        conversationId: call.conversationId,
      });
    }
  }, [activeCalls]);

  const rejectCall = useCallback((callId: number) => {
    if (incomingCall?.call.id === callId) {
      socketRef.current?.emit('end_call', {
        callId,
        conversationId: incomingCall.call.conversationId,
      });
      setIncomingCall(null);
    }
  }, [incomingCall]);

  const searchMessages = useCallback(async (query: string, filters?: any): Promise<PrivateMessage[]> => {
    try {
      const params = new URLSearchParams({ q: query });
      if (filters?.conversationId) params.append('conversationId', filters.conversationId.toString());
      
      const response = await fetch(`/api/private-messages/messages/search?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'x-user-id': user?.id ? String(user.id) : ''
        },
      });
      
      if (!response.ok) throw new Error('فشل البحث');
      
      const data = await response.json();
      return data.results.map((r: any) => r.message);
    } catch (error) {
      console.error('خطأ في البحث:', error);
      return [];
    }
  }, [user?.id]);

  const getUnreadCount = useCallback((conversationId: number): number => {
    const conversation = conversations.find(c => c.conversation.id === conversationId);
    return conversation?.unreadCount || 0;
  }, [conversations]);

  const getTotalUnreadCount = useCallback((): number => {
    return conversations.reduce((total, conv) => total + conv.unreadCount, 0);
  }, [conversations]);

  // تحميل المحادثات عند بدء التشغيل
  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user, loadConversations]);

  return {
    conversations,
    activeConversation,
    loadingConversations,
    messages,
    loadingMessages,
    sendingState,
    typingIndicators,
    drafts,
    activeCalls,
    incomingCall,
    loadConversations,
    createConversation,
    loadMessages,
    sendMessage,
    sendFile,
    editMessage,
    deleteMessage,
    markAsRead,
    setTypingStatus,
    saveDraft,
    addReaction,
    pinConversation,
    muteConversation,
    archiveConversation,
    startCall,
    answerCall,
    endCall,
    rejectCall,
    searchMessages,
    setActiveConversation: (conversationId: number | null) => {
      const conv = conversations.find(c => c.conversation.id === conversationId) || null;
      setActiveConversation(conv);
    },
    getUnreadCount,
    getTotalUnreadCount,
  };
}
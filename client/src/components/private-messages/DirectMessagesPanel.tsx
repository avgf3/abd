import React, { useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConversationsList } from '@/components/private-messages/ConversationsList';
import { ConversationView } from '@/components/private-messages/ConversationView';
import { usePrivateMessages } from '@/hooks/usePrivateMessages';

interface DirectMessagesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialParticipantId?: number | null;
}

export default function DirectMessagesPanel({ isOpen, onClose, initialParticipantId }: DirectMessagesPanelProps) {
  const {
    // state
    conversations,
    activeConversation,
    loadingConversations,
    messages,
    loadingMessages,
    sendingState,
    typingIndicators,
    drafts,
    // actions
    loadConversations,
    createConversation,
    loadMessages,
    sendMessage,
    sendFile,
    editMessage,
    deleteMessage,
    addReaction,
    markAsRead,
    setTypingStatus,
    saveDraft,
    // management
    pinConversation,
    muteConversation,
    archiveConversation,
    startCall,
    setActiveConversation,
  } = usePrivateMessages();

  // Load conversations when opening
  useEffect(() => {
    if (isOpen) {
      loadConversations().catch(() => {});
    }
  }, [isOpen, loadConversations]);

  // Ensure we open/create the conversation with the target participant when provided
  useEffect(() => {
    if (!isOpen || !initialParticipantId) return;

    // try to find an existing direct conversation with this participant
    const existing = conversations.find(c => c.conversation.type === 'direct' && c.otherParticipants?.some(p => p?.id === initialParticipantId));
    if (existing) {
      setActiveConversation(existing.conversation.id);
      // ensure messages loaded
      loadMessages(existing.conversation.id).catch(() => {});
      return;
    }

    // create if not found
    (async () => {
      try {
        const conv = await createConversation(initialParticipantId);
        if (conv) {
          setActiveConversation(conv.conversation.id);
          await loadMessages(conv.conversation.id);
        }
      } catch {}
    })();
  }, [isOpen, initialParticipantId, conversations, setActiveConversation, createConversation, loadMessages]);

  const activeConversationId = activeConversation?.conversation.id;
  const activeMessages = useMemo(() => (activeConversationId ? (messages.get(activeConversationId) || []) : []), [messages, activeConversationId]);
  const activeTyping = useMemo(() => (activeConversationId ? (typingIndicators.get(activeConversationId) || []) : []), [typingIndicators, activeConversationId]);
  const activeDraft = useMemo(() => (activeConversationId ? drafts.get(activeConversationId) : undefined), [drafts, activeConversationId]);
  const isLoadingMsgs = useMemo(() => (activeConversationId ? (loadingMessages.get(activeConversationId) || false) : false), [loadingMessages, activeConversationId]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="w-[95vw] max-w-5xl p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2 border-b">
          <DialogTitle className="text-xl font-bold">الرسائل الخاصة</DialogTitle>
        </DialogHeader>
        <div className="flex h-[70vh]">
          <div className="w-80 border-l overflow-hidden">
            <ConversationsList
              conversations={conversations}
              activeConversationId={activeConversationId}
              onSelectConversation={(conversationId) => {
                setActiveConversation(conversationId);
                loadMessages(conversationId).catch(() => {});
              }}
              onCreateConversation={() => {}}
              onPinConversation={pinConversation}
              onArchiveConversation={archiveConversation}
              onMuteConversation={muteConversation}
              onStartCall={(conversationId, type) => startCall(conversationId, type)}
            />
          </div>
          <div className="flex-1 overflow-hidden">
            {activeConversation && (
              <ConversationView
                conversation={activeConversation}
                messages={activeMessages}
                typingIndicators={activeTyping}
                draft={activeDraft}
                loadingMessages={isLoadingMsgs}
                sendingMessage={!!sendingState.isLoading}
                onSendMessage={(content, type) => {
                  if (!activeConversationId) return;
                  sendMessage(activeConversationId, content, type);
                }}
                onSendFile={(file) => {
                  if (!activeConversationId) return;
                  sendFile(activeConversationId, file);
                }}
                onEditMessage={(messageId, newContent) => {
                  if (!activeConversationId) return;
                  editMessage(messageId, activeConversationId, newContent);
                }}
                onDeleteMessage={(messageId, deleteForEveryone) => {
                  if (!activeConversationId) return;
                  deleteMessage(messageId, activeConversationId, deleteForEveryone);
                }}
                onAddReaction={(messageId, reaction) => {
                  if (!activeConversationId) return;
                  addReaction(messageId, activeConversationId, reaction);
                }}
                onMarkAsRead={(messageIds) => {
                  if (!activeConversationId) return;
                  markAsRead(activeConversationId, messageIds);
                }}
                onTypingStatusChange={(isTyping) => {
                  if (!activeConversationId) return;
                  setTypingStatus(activeConversationId, isTyping);
                }}
                onSaveDraft={(content) => {
                  if (!activeConversationId) return;
                  saveDraft(activeConversationId, content);
                }}
                onStartCall={(type) => {
                  if (!activeConversationId) return;
                  startCall(activeConversationId, type);
                }}
                onLoadMoreMessages={() => {
                  if (!activeConversationId) return;
                  const msgs = messages.get(activeConversationId) || [];
                  const oldest = msgs[0]?.id;
                  if (oldest) {
                    loadMessages(activeConversationId, { beforeId: oldest }).catch(() => {});
                  }
                }}
              />
            )}
            {!activeConversation && (
              <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                اختر محادثة من القائمة
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
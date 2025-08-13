import { Server, Socket } from "socket.io";
import { PrivateMessagesService } from "../services/privateMessagesService";
import { NotificationService } from "../services/notificationService";

interface AuthenticatedSocket extends Socket {
  userId?: number;
  user?: any;
}

export function setupPrivateMessagesSocket(
  io: Server,
  pmService: PrivateMessagesService,
  notificationService: NotificationService
) {
  io.on("connection", (socket: AuthenticatedSocket) => {
    // الانضمام إلى غرف المحادثات عند الاتصال
    socket.on("join_conversations", async () => {
      if (!socket.userId) return;

      try {
        const conversations = await pmService.getUserConversations(socket.userId);
        
        // الانضمام إلى غرفة كل محادثة
        for (const conv of conversations) {
          socket.join(`conversation:${conv.conversation.id}`);
        }

        socket.emit("conversations_joined", { 
          count: conversations.length,
          conversationIds: conversations.map(c => c.conversation.id)
        });
      } catch (error) {
        console.error("خطأ في الانضمام للمحادثات:", error);
        socket.emit("error", { message: "فشل الانضمام للمحادثات" });
      }
    });

    // الانضمام إلى محادثة محددة
    socket.on("join_conversation", async (conversationId: number) => {
      if (!socket.userId) return;

      try {
        // التحقق من صلاحية المستخدم
        const conversations = await pmService.getUserConversations(socket.userId);
        const hasAccess = conversations.some(c => c.conversation.id === conversationId);

        if (hasAccess) {
          socket.join(`conversation:${conversationId}`);
          socket.emit("conversation_joined", { conversationId });
        } else {
          socket.emit("error", { message: "ليس لديك صلاحية للوصول لهذه المحادثة" });
        }
      } catch (error) {
        console.error("خطأ في الانضمام للمحادثة:", error);
        socket.emit("error", { message: "فشل الانضمام للمحادثة" });
      }
    });

    // مغادرة محادثة
    socket.on("leave_conversation", (conversationId: number) => {
      socket.leave(`conversation:${conversationId}`);
      socket.emit("conversation_left", { conversationId });
    });

    // إرسال رسالة
    socket.on("send_message", async (data: {
      conversationId: number;
      content?: string;
      type?: string;
      attachments?: any[];
      metadata?: any;
      replyToId?: number;
      forwardedFromId?: number;
    }) => {
      if (!socket.userId || !socket.user) return;

      try {
        const { conversationId, ...messageData } = data;

        if (!messageData.content && messageData.type === 'text') {
          socket.emit("error", { message: "محتوى الرسالة مطلوب" });
          return;
        }

        const message = await pmService.sendMessage(conversationId, socket.userId, messageData);

        // إضافة بيانات المرسل
        const messageWithSender = {
          ...message,
          sender: socket.user,
        };

        // إرسال الرسالة لجميع المشاركين
        io.to(`conversation:${conversationId}`).emit("new_message", messageWithSender);

        // إرسال إشعارات
        const conversations = await pmService.getUserConversations(socket.userId, { limit: 1 });
        const participants = conversations[0]?.otherParticipants || [];
        
        for (const participant of participants) {
          if (participant.id !== socket.userId) {
            await notificationService.createMessageNotification(
              participant.id,
              socket.user.username,
              socket.userId,
              messageData.content?.substring(0, 100) || 'رسالة جديدة'
            );

            // إرسال إشعار فوري
            io.to(`user:${participant.id}`).emit("new_notification", {
              type: "message",
              from: socket.user,
              conversationId,
              preview: messageData.content?.substring(0, 100),
            });
          }
        }
      } catch (error) {
        console.error("خطأ في إرسال الرسالة:", error);
        socket.emit("error", { 
          message: error instanceof Error ? error.message : "فشل إرسال الرسالة" 
        });
      }
    });

    // تحديث حالة الكتابة
    socket.on("typing_status", async (data: {
      conversationId: number;
      isTyping: boolean;
    }) => {
      if (!socket.userId || !socket.user) return;

      try {
        const { conversationId, isTyping } = data;

        await pmService.updateTypingStatus(conversationId, socket.userId, isTyping);

        // إرسال حالة الكتابة للمشاركين الآخرين
        socket.to(`conversation:${conversationId}`).emit("typing_status", {
          conversationId,
          user: {
            id: socket.userId,
            username: socket.user.username,
            profileImage: socket.user.profileImage,
          },
          isTyping,
        });
      } catch (error) {
        console.error("خطأ في تحديث حالة الكتابة:", error);
      }
    });

    // تحديد الرسائل كمقروءة
    socket.on("mark_messages_read", async (data: {
      conversationId: number;
      messageIds: number[];
    }) => {
      if (!socket.userId) return;

      try {
        const { conversationId, messageIds } = data;

        await pmService.markMessagesAsRead(conversationId, socket.userId, messageIds);

        // إرسال تحديث حالة القراءة للمشاركين
        socket.to(`conversation:${conversationId}`).emit("messages_read", {
          conversationId,
          userId: socket.userId,
          messageIds,
        });
      } catch (error) {
        console.error("خطأ في تحديد الرسائل كمقروءة:", error);
      }
    });

    // إضافة/إزالة تفاعل
    socket.on("toggle_reaction", async (data: {
      messageId: number;
      conversationId: number;
      reaction: string;
    }) => {
      if (!socket.userId || !socket.user) return;

      try {
        const { messageId, conversationId, reaction } = data;

        const result = await pmService.toggleReaction(messageId, socket.userId, reaction);

        // إرسال التحديث لجميع المشاركين
        io.to(`conversation:${conversationId}`).emit("reaction_update", {
          messageId,
          user: {
            id: socket.userId,
            username: socket.user.username,
          },
          reaction,
          action: result.action,
        });
      } catch (error) {
        console.error("خطأ في التفاعل:", error);
        socket.emit("error", { message: "فشل التفاعل" });
      }
    });

    // حذف رسالة
    socket.on("delete_message", async (data: {
      messageId: number;
      conversationId: number;
      deleteForEveryone?: boolean;
    }) => {
      if (!socket.userId) return;

      try {
        const { messageId, conversationId, deleteForEveryone = false } = data;

        await pmService.deleteMessage(messageId, socket.userId, deleteForEveryone);

        // إرسال التحديث لجميع المشاركين
        io.to(`conversation:${conversationId}`).emit("message_deleted", {
          messageId,
          deletedBy: socket.userId,
          deleteForEveryone,
        });
      } catch (error) {
        console.error("خطأ في حذف الرسالة:", error);
        socket.emit("error", { 
          message: error instanceof Error ? error.message : "فشل حذف الرسالة" 
        });
      }
    });

    // تعديل رسالة
    socket.on("edit_message", async (data: {
      messageId: number;
      conversationId: number;
      newContent: string;
    }) => {
      if (!socket.userId) return;

      try {
        const { messageId, conversationId, newContent } = data;

        await pmService.editMessage(messageId, socket.userId, newContent);

        // إرسال التحديث لجميع المشاركين
        io.to(`conversation:${conversationId}`).emit("message_edited", {
          messageId,
          newContent,
          editedBy: socket.userId,
          editedAt: new Date(),
        });
      } catch (error) {
        console.error("خطأ في تعديل الرسالة:", error);
        socket.emit("error", { 
          message: error instanceof Error ? error.message : "فشل تعديل الرسالة" 
        });
      }
    });

    // حفظ مسودة
    socket.on("save_draft", async (data: {
      conversationId: number;
      content: string;
      replyToId?: number;
    }) => {
      if (!socket.userId) return;

      try {
        const { conversationId, content, replyToId } = data;

        await pmService.saveDraft(conversationId, socket.userId, content, replyToId);

        socket.emit("draft_saved", { conversationId });
      } catch (error) {
        console.error("خطأ في حفظ المسودة:", error);
      }
    });

    // معالجة المكالمات
    socket.on("start_call", async (data: {
      conversationId: number;
      type: 'voice' | 'video';
    }) => {
      if (!socket.userId || !socket.user) return;

      try {
        const { conversationId, type } = data;

        const call = await pmService.createCall(conversationId, socket.userId, type);

        // إرسال إشعار المكالمة للمشاركين
        socket.to(`conversation:${conversationId}`).emit("incoming_call", {
          call,
          caller: socket.user,
        });

        socket.emit("call_started", { call });
      } catch (error) {
        console.error("خطأ في بدء المكالمة:", error);
        socket.emit("error", { message: "فشل بدء المكالمة" });
      }
    });

    socket.on("answer_call", async (data: {
      callId: number;
      conversationId: number;
    }) => {
      if (!socket.userId) return;

      try {
        const { callId, conversationId } = data;

        await pmService.updateCallStatus(callId, 'answered', socket.userId);

        io.to(`conversation:${conversationId}`).emit("call_answered", {
          callId,
          answeredBy: socket.userId,
        });
      } catch (error) {
        console.error("خطأ في الرد على المكالمة:", error);
      }
    });

    socket.on("end_call", async (data: {
      callId: number;
      conversationId: number;
    }) => {
      if (!socket.userId) return;

      try {
        const { callId, conversationId } = data;

        await pmService.updateCallStatus(callId, 'ended');

        io.to(`conversation:${conversationId}`).emit("call_ended", {
          callId,
          endedBy: socket.userId,
        });
      } catch (error) {
        console.error("خطأ في إنهاء المكالمة:", error);
      }
    });

    // WebRTC Signaling
    socket.on("webrtc_offer", (data: {
      conversationId: number;
      targetUserId: number;
      offer: any;
    }) => {
      if (!socket.userId) return;

      io.to(`user:${data.targetUserId}`).emit("webrtc_offer", {
        from: socket.userId,
        offer: data.offer,
        conversationId: data.conversationId,
      });
    });

    socket.on("webrtc_answer", (data: {
      conversationId: number;
      targetUserId: number;
      answer: any;
    }) => {
      if (!socket.userId) return;

      io.to(`user:${data.targetUserId}`).emit("webrtc_answer", {
        from: socket.userId,
        answer: data.answer,
        conversationId: data.conversationId,
      });
    });

    socket.on("webrtc_ice_candidate", (data: {
      conversationId: number;
      targetUserId: number;
      candidate: any;
    }) => {
      if (!socket.userId) return;

      io.to(`user:${data.targetUserId}`).emit("webrtc_ice_candidate", {
        from: socket.userId,
        candidate: data.candidate,
        conversationId: data.conversationId,
      });
    });

    // تنظيف عند قطع الاتصال
    socket.on("disconnect", () => {
      if (!socket.userId) return;

      // إرسال حالة إيقاف الكتابة لجميع المحادثات
      const rooms = Array.from(socket.rooms);
      
      rooms.forEach(room => {
        if (room.startsWith('conversation:')) {
          const conversationId = parseInt(room.split(':')[1]);
          
          socket.to(room).emit("typing_status", {
            conversationId,
            user: {
              id: socket.userId,
              username: socket.user?.username,
            },
            isTyping: false,
          });
        }
      });
    });
  });

  // مهام دورية للتنظيف
  setInterval(async () => {
    try {
      await pmService.cleanupExpiredMessages();
      await pmService.cleanupExpiredTypingIndicators();
    } catch (error) {
      console.error("خطأ في التنظيف الدوري:", error);
    }
  }, 60000); // كل دقيقة
}
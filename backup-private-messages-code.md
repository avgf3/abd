# نسخة احتياطية من كود الرسائل الخاصة القديم
## تاريخ: ${new Date().toISOString()}

### ملاحظة: هذا الكود تم حفظه قبل إعادة البناء الكامل لنظام الرسائل الخاصة

---

## 1. كود API في server/routes.ts

```typescript
// السطور 1206-1225: GET endpoint للحصول على الرسائل الخاصة
app.get("/api/messages/private/:userId1/:userId2", async (req, res) => {
  try {
    const userId1 = parseInt(req.params.userId1);
    const userId2 = parseInt(req.params.userId2);
    const limit = parseInt(req.query.limit as string) || 50;
    
    const messages = await storage.getPrivateMessages(userId1, userId2, limit);
    
    const messagesWithUsers = await Promise.all(
      messages.map(async (msg) => {
        const sender = msg.senderId ? await storage.getUser(msg.senderId) : null;
        return { ...msg, sender };
      })
    );

    res.json({ messages: messagesWithUsers });
  } catch (error) {
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// السطور 1809-1850: Socket.IO handler للرسائل الخاصة
socket.on('privateMessage', async (data) => {
  try {
    if (!socket.userId) return;
    
    const { receiverId, content, messageType = 'text' } = data;
    
    // التحقق من المستقبل
    const receiver = await storage.getUser(receiverId);
    if (!receiver) {
      socket.emit('message', { type: 'error', message: 'المستقبل غير موجود' });
      return;
    }

    // منع الرسائل إذا كان المستقبل قد تجاهل المرسل
    try {
      const ignoredByReceiver: number[] = await storage.getIgnoredUsers(receiverId);
      if (Array.isArray(ignoredByReceiver) && ignoredByReceiver.includes(socket.userId)) {
        socket.emit('message', { type: 'error', message: 'لا يمكن إرسال رسالة: هذا المستخدم قام بتجاهلك' });
        return;
      }
    } catch (e) {
      // في حال فشل جلب قائمة التجاهل، لا نمنع لكن نسجل تحذير
      console.warn('تحذير: تعذر التحقق من قائمة التجاهل للمستقبل:', e);
    }
    
    // إنشاء الرسالة الخاصة
    const newMessage = await storage.createMessage({
      senderId: socket.userId,
      receiverId: receiverId,
      content: content.trim(),
      messageType,
      isPrivate: true
    });
    
    const sender = await storage.getUser(socket.userId);
    const messageWithSender = { ...newMessage, sender };
    
    // إرسال للمستقبل والمرسل - حدث موحّد فقط
    io.to(receiverId.toString()).emit('privateMessage', { message: messageWithSender });
    socket.emit('privateMessage', { message: messageWithSender });
    
  } catch (error) {
    // ...
  }
});
```

## 2. كود واجهة المستخدم

### client/src/components/chat/PrivateMessageBox.tsx
[الكود الكامل محفوظ في السطور 1-149]

### كود في useChat.ts للتعامل مع الرسائل الخاصة
```typescript
// معالج الرسائل الخاصة
const handlePrivateMessage = (incoming: any) => {
  // ... كود المعالج
};

socketInstance.on('privateMessage', handlePrivateMessage);

// إرسال رسالة خاصة
sendPrivateMessage: (receiverId: number, content: string) => sendMessage(content, 'text', receiverId),
```

---

هذا الكود سيتم حذفه واستبداله بنظام جديد قوي ومتطور.
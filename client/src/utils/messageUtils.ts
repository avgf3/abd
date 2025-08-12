import type { ChatMessage } from '@/types/chat';

/**
 * تحويل رسالة من قاعدة البيانات إلى تنسيق ChatMessage مع معالجة آمنة للأخطاء
 */
export function mapDbMessageToChatMessage(msg: any, fallbackRoomId?: string): ChatMessage | null {
  try {
    // التحقق من صحة البيانات الأساسية
    if (!msg || typeof msg !== 'object') {
      console.warn('رسالة غير صحيحة:', msg);
      return null;
    }

    // التحقق من وجود المعرف
    if (!msg.id && msg.id !== 0) {
      console.warn('رسالة بدون معرف:', msg);
      return null;
    }

    // التحقق من وجود معرف المرسل
    if (!msg.senderId && msg.senderId !== 0) {
      console.warn('رسالة بدون معرف مرسل:', msg);
      return null;
    }

    // معالجة آمنة للطابع الزمني
    let timestamp: string;
    try {
      if (msg.timestamp instanceof Date) {
        timestamp = msg.timestamp.toISOString();
      } else if (typeof msg.timestamp === 'string') {
        // التحقق من صحة تنسيق التاريخ
        const date = new Date(msg.timestamp);
        if (isNaN(date.getTime())) {
          throw new Error('تاريخ غير صحيح');
        }
        timestamp = date.toISOString();
      } else if (typeof msg.timestamp === 'number') {
        timestamp = new Date(msg.timestamp).toISOString();
      } else {
        // استخدام الوقت الحالي كقيمة افتراضية
        timestamp = new Date().toISOString();
        console.warn('طابع زمني غير صحيح، تم استخدام الوقت الحالي:', msg);
      }
    } catch (error) {
      timestamp = new Date().toISOString();
      console.warn('خطأ في معالجة الطابع الزمني:', error);
    }

    // تنظيف وتأمين المحتوى
    const content = sanitizeMessageContent(msg.content);
    if (!content) {
      console.warn('محتوى رسالة فارغ أو غير صحيح:', msg);
      return null;
    }

    // التحقق من نوع الرسالة
    const messageType = validateMessageType(msg.messageType);

    // إنشاء الرسالة المنسقة
    const chatMessage: ChatMessage = {
      id: Number(msg.id),
      content,
      timestamp,
      senderId: Number(msg.senderId),
      sender: validateSender(msg.sender),
      messageType,
      isPrivate: Boolean(msg.isPrivate),
      roomId: msg.roomId || fallbackRoomId,
      receiverId: msg.receiverId ? Number(msg.receiverId) : undefined
    };

    return chatMessage;

  } catch (error) {
    console.error('خطأ في تحويل الرسالة:', error, msg);
    return null;
  }
}

/**
 * تحويل مصفوفة من رسائل قاعدة البيانات إلى ChatMessages مع معالجة الأخطاء
 */
export function mapDbMessagesToChatMessages(messages: any[], fallbackRoomId?: string): ChatMessage[] {
  if (!Array.isArray(messages)) {
    console.warn('البيانات المرسلة ليست مصفوفة:', messages);
    return [];
  }

  const validMessages: ChatMessage[] = [];
  const errors: string[] = [];

  for (let i = 0; i < messages.length; i++) {
    try {
      const chatMessage = mapDbMessageToChatMessage(messages[i], fallbackRoomId);
      if (chatMessage) {
        validMessages.push(chatMessage);
      } else {
        errors.push(`الرسالة رقم ${i} غير صحيحة`);
      }
    } catch (error) {
      errors.push(`خطأ في الرسالة رقم ${i}: ${error}`);
    }
  }

  // تسجيل الأخطاء إذا وجدت
  if (errors.length > 0) {
    console.warn(`تم تجاهل ${errors.length} رسالة من أصل ${messages.length}:`, errors);
  }

  // ترتيب الرسائل حسب الطابع الزمني
  return sortMessagesByTimestamp(validMessages);
}

/**
 * تنظيف وتأمين محتوى الرسالة
 */
function sanitizeMessageContent(content: any): string {
  if (typeof content !== 'string') {
    if (content === null || content === undefined) {
      return '';
    }
    // محاولة تحويل إلى نص
    try {
      content = String(content);
    } catch {
      return '';
    }
  }

  // إزالة المحتوى الضار
  return content
    .replace(/<[^>]*>/g, '') // إزالة HTML tags
    .replace(/javascript:/gi, '') // إزالة javascript URLs
    .replace(/on\w+\s*=/gi, '') // إزالة event handlers
    .replace(/data:(?!image\/)[^;]+;/gi, '') // إزالة data URLs غير الصور
    .trim()
    .substring(0, 5000); // حد أقصى للطول
}

/**
 * التحقق من صحة نوع الرسالة
 */
function validateMessageType(messageType: any): 'text' | 'image' | 'system' {
  const validTypes = ['text', 'image', 'system'];
  
  if (typeof messageType === 'string' && validTypes.includes(messageType)) {
    return messageType as 'text' | 'image' | 'system';
  }
  
  return 'text'; // القيمة الافتراضية
}

/**
 * التحقق من صحة بيانات المرسل
 */
function validateSender(sender: any): any {
  if (!sender || typeof sender !== 'object') {
    return undefined;
  }

  // التحقق من وجود الحقول الأساسية
  if (!sender.id && sender.id !== 0) {
    return undefined;
  }

  if (!sender.username || typeof sender.username !== 'string') {
    return undefined;
  }

  // إرجاع نسخة منظفة من المرسل
  return {
    id: Number(sender.id),
    username: String(sender.username).trim().substring(0, 50),
    userType: validateUserType(sender.userType),
    profileImage: typeof sender.profileImage === 'string' ? sender.profileImage : undefined,
    isOnline: Boolean(sender.isOnline),
    // إضافة باقي الحقول بأمان
    usernameColor: typeof sender.usernameColor === 'string' ? sender.usernameColor : undefined,
    userTheme: typeof sender.userTheme === 'string' ? sender.userTheme : undefined,
    level: typeof sender.level === 'number' ? sender.level : undefined,
    points: typeof sender.points === 'number' ? sender.points : undefined
  };
}

/**
 * التحقق من صحة نوع المستخدم
 */
function validateUserType(userType: any): string {
  const validUserTypes = ['guest', 'member', 'moderator', 'admin', 'owner'];
  
  if (typeof userType === 'string' && validUserTypes.includes(userType)) {
    return userType;
  }
  
  return 'guest'; // القيمة الافتراضية
}

/**
 * ترتيب الرسائل حسب الطابع الزمني
 */
function sortMessagesByTimestamp(messages: ChatMessage[]): ChatMessage[] {
  return messages.sort((a, b) => {
    try {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      
      // التعامل مع التواريخ غير الصحيحة
      if (isNaN(timeA) && isNaN(timeB)) return 0;
      if (isNaN(timeA)) return 1;
      if (isNaN(timeB)) return -1;
      
      return timeA - timeB;
    } catch (error) {
      console.warn('خطأ في ترتيب الرسائل:', error);
      return 0;
    }
  });
}

/**
 * تنسيق محتوى الرسالة للعرض
 */
export function formatMessageContent(content: string, messageType?: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  // معالجة خاصة للصور
  if (messageType === 'image' || content.startsWith('data:image/')) {
    return content; // إرجاع المحتوى كما هو للصور
  }

  // تنسيق النص العادي
  return content
    .trim()
    .replace(/\n{3,}/g, '\n\n') // تحديد عدد الأسطر الجديدة
    .substring(0, 1000); // حد أقصى للعرض
}

/**
 * فحص ما إذا كانت الرسالة صورة
 */
export function isImageMessage(message: ChatMessage): boolean {
  if (!message) return false;
  
  return message.messageType === 'image' || 
         (typeof message.content === 'string' && message.content.startsWith('data:image/'));
}

/**
 * فحص ما إذا كان عنوان URL للصورة آمن
 */
export function isValidImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  
  try {
    // السماح بـ data URLs للصور
    if (url.startsWith('data:image/')) {
      return true;
    }
    
    // السماح بـ HTTP/HTTPS URLs
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const urlObj = new URL(url);
      const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
      return validExtensions.some(ext => 
        urlObj.pathname.toLowerCase().endsWith(`.${ext}`)
      );
    }
    
    return false;
  } catch {
    return false;
  }
}

/**
 * تصفية الرسائل حسب المعايير
 */
export function filterMessages(
  messages: ChatMessage[], 
  criteria: {
    userId?: number;
    messageType?: string;
    startDate?: Date;
    endDate?: Date;
    searchText?: string;
  }
): ChatMessage[] {
  if (!Array.isArray(messages)) return [];
  
  return messages.filter(message => {
    try {
      // تصفية حسب المستخدم
      if (criteria.userId !== undefined && message.senderId !== criteria.userId) {
        return false;
      }
      
      // تصفية حسب نوع الرسالة
      if (criteria.messageType && message.messageType !== criteria.messageType) {
        return false;
      }
      
      // تصفية حسب التاريخ
      if (criteria.startDate || criteria.endDate) {
        const messageDate = new Date(message.timestamp);
        if (isNaN(messageDate.getTime())) return false;
        
        if (criteria.startDate && messageDate < criteria.startDate) return false;
        if (criteria.endDate && messageDate > criteria.endDate) return false;
      }
      
      // تصفية حسب النص
      if (criteria.searchText) {
        const searchText = criteria.searchText.toLowerCase();
        const content = message.content.toLowerCase();
        const username = message.sender?.username?.toLowerCase() || '';
        
        return content.includes(searchText) || username.includes(searchText);
      }
      
      return true;
    } catch (error) {
      console.warn('خطأ في تصفية الرسالة:', error, message);
      return false;
    }
  });
}

/**
 * تجميع الرسائل حسب التاريخ
 */
export function groupMessagesByDate(messages: ChatMessage[]): { [date: string]: ChatMessage[] } {
  if (!Array.isArray(messages)) return {};
  
  const grouped: { [date: string]: ChatMessage[] } = {};
  
  messages.forEach(message => {
    try {
      const date = new Date(message.timestamp);
      if (isNaN(date.getTime())) return;
      
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      
      grouped[dateKey].push(message);
    } catch (error) {
      console.warn('خطأ في تجميع الرسالة:', error, message);
    }
  });
  
  return grouped;
}

/**
 * حساب إحصائيات الرسائل
 */
export function calculateMessageStats(messages: ChatMessage[]): {
  total: number;
  byType: { [type: string]: number };
  byUser: { [userId: number]: number };
  timeRange: { start?: Date; end?: Date };
} {
  const stats = {
    total: 0,
    byType: {} as { [type: string]: number },
    byUser: {} as { [userId: number]: number },
    timeRange: {} as { start?: Date; end?: Date }
  };
  
  if (!Array.isArray(messages) || messages.length === 0) {
    return stats;
  }
  
  const timestamps: Date[] = [];
  
  messages.forEach(message => {
    try {
      stats.total++;
      
      // إحصائيات حسب النوع
      const type = message.messageType || 'text';
      stats.byType[type] = (stats.byType[type] || 0) + 1;
      
      // إحصائيات حسب المستخدم
      stats.byUser[message.senderId] = (stats.byUser[message.senderId] || 0) + 1;
      
      // جمع الطوابع الزمنية
      const timestamp = new Date(message.timestamp);
      if (!isNaN(timestamp.getTime())) {
        timestamps.push(timestamp);
      }
    } catch (error) {
      console.warn('خطأ في حساب إحصائيات الرسالة:', error, message);
    }
  });
  
  // حساب النطاق الزمني
  if (timestamps.length > 0) {
    timestamps.sort((a, b) => a.getTime() - b.getTime());
    stats.timeRange.start = timestamps[0];
    stats.timeRange.end = timestamps[timestamps.length - 1];
  }
  
  return stats;
}

/**
 * إنشاء معاينة للرسالة
 */
export function createMessagePreview(message: ChatMessage, maxLength: number = 50): string {
  if (!message || !message.content) return '';
  
  if (isImageMessage(message)) {
    return '📷 صورة';
  }
  
  const content = message.content.trim();
  if (content.length <= maxLength) {
    return content;
  }
  
  return content.substring(0, maxLength - 3) + '...';
}
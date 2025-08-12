/**
 * دوال مساعدة للتمرير في مكونات الرسائل
 */

/**
 * التمرير إلى أسفل العنصر مع خيارات مختلفة
 * @param options - خيارات التمرير
 */
export function scrollToBottom(options: {
  messagesEndRef?: React.RefObject<HTMLDivElement>;
  messagesContainerRef?: React.RefObject<HTMLDivElement>;
  behavior?: ScrollBehavior;
  useContainer?: boolean;
}): void {
  const { 
    messagesEndRef, 
    messagesContainerRef, 
    behavior = 'smooth', 
    useContainer = false 
  } = options;

  // إذا كان useContainer مفعل ومتاح، استخدم container scrollTo
  if (useContainer && messagesContainerRef?.current) {
    const container = messagesContainerRef.current;
    if (behavior === 'smooth') {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    } else {
      container.scrollTop = container.scrollHeight;
    }
    return;
  }

  // استخدم anchor scrollIntoView كأولوية
  if (messagesEndRef?.current) {
    messagesEndRef.current.scrollIntoView({ 
      behavior,
      block: 'end'
    });
    return;
  }

  // fallback لـ container إذا لم يكن anchor متاحاً
  if (messagesContainerRef?.current) {
    const el = messagesContainerRef.current;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }
}

/**
 * فحص إذا كان المستخدم قريباً من أسفل المنطقة
 * @param containerRef - مرجع حاوي الرسائل
 * @param threshold - الحد الأدنى للمسافة من الأسفل (px)
 * @returns true إذا كان المستخدم قريباً من الأسفل
 */
export function isNearBottom(
  containerRef: React.RefObject<HTMLDivElement>, 
  threshold: number = 80
): boolean {
  const el = containerRef.current;
  if (!el) return false;
  
  return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
}

/**
 * دالة موحدة لإدارة التمرير التلقائي للرسائل الجديدة
 * @param options - خيارات التمرير التلقائي
 */
export function handleAutoScroll(options: {
  messagesEndRef?: React.RefObject<HTMLDivElement>;
  messagesContainerRef?: React.RefObject<HTMLDivElement>;
  isFirstLoad?: boolean;
  isUserAtBottom?: boolean;
  sentByCurrentUser?: boolean;
  messageCount?: number;
  useContainer?: boolean;
}): void {
  const { 
    messagesEndRef, 
    messagesContainerRef,
    isFirstLoad = false,
    isUserAtBottom = true,
    sentByCurrentUser = false,
    messageCount = 0,
    useContainer = false
  } = options;

  // تحديد نوع السلوك بناءً على الحالة
  let shouldScroll = false;
  let behavior: ScrollBehavior = 'smooth';

  if (isFirstLoad) {
    shouldScroll = true;
    behavior = 'auto'; // تمرير فوري عند التحميل الأول
  } else if (sentByCurrentUser) {
    shouldScroll = true;
    behavior = 'smooth'; // تمرير سلس للرسائل المرسلة من المستخدم
  } else if (isUserAtBottom) {
    shouldScroll = true;
    behavior = messageCount > 20 ? 'auto' : 'smooth'; // تمرير سلس للرسائل القليلة
  }

  if (shouldScroll) {
    // تأخير بسيط للسماح للعنصر بالعرض
    setTimeout(() => {
      scrollToBottom({
        messagesEndRef,
        messagesContainerRef,
        behavior,
        useContainer
      });
    }, 0);
  }
}
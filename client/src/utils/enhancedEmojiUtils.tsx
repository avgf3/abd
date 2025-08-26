import React from 'react';
// import { Player } from '@lottiefiles/react-lottie-player';

// معالجة السمايلات المتحركة بأنواعها المختلفة
export function parseEnhancedEmojis(content: string): (string | React.ReactElement)[] {
  const parts: (string | React.ReactElement)[] = [];
  
  // نمط للكشف عن السمايلات المختلفة
  const emojiPattern = /\[\[(emoji|lottie|gif):([^:]+):([^\]]+)\]\]/g;
  
  let lastIndex = 0;
  let match;
  
  while ((match = emojiPattern.exec(content)) !== null) {
    // إضافة النص قبل السمايل
    if (match.index > lastIndex) {
      parts.push(content.substring(lastIndex, match.index));
    }
    
    const [fullMatch, type, id, url] = match;
    
    switch (type) {
      case 'emoji':
      case 'gif':
        parts.push(
          <img
            key={`${type}-${id}-${match.index}`}
            src={url}
            alt={id}
            className="animated-emoji-gif inline-block mx-1"
            loading="lazy"
          />
        );
        break;
        
      case 'lottie':
        // مؤقتاً نعرض صورة بدلاً من Lottie
        parts.push(
          <img
            key={`lottie-${id}-${match.index}`}
            src="/assets/emojis/classic/smile.gif"
            alt={id}
            className="animated-emoji-gif inline-block mx-1"
            loading="lazy"
          />
        );
        break;
    }
    
    lastIndex = match.index + fullMatch.length;
  }
  
  // إضافة النص المتبقي
  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex));
  }
  
  return parts.length > 0 ? parts : [content];
}

// دمج معالجة السمايلات المحسنة مع المحتوى
export function renderMessageWithEnhancedEmojis(
  content: string,
  existingRenderer?: (text: string) => React.ReactNode
): React.ReactNode {
  const parts = parseEnhancedEmojis(content);
  
  if (parts.length === 1 && typeof parts[0] === 'string') {
    // لا توجد سمايلات محسنة، استخدم المعالج الموجود
    return existingRenderer ? existingRenderer(content) : content;
  }
  
  // معالجة كل جزء
  return parts.map((part, index) => {
    if (typeof part === 'string' && existingRenderer) {
      return <React.Fragment key={index}>{existingRenderer(part)}</React.Fragment>;
    }
    return part;
  });
}

// تحويل أكواد السمايلات الشائعة إلى إيموجي
const commonEmoticonMap: Record<string, string> = {
  ':)': '😊',
  ':-)': '😊',
  ':D': '😃',
  ':-D': '😃',
  ';)': '😉',
  ';-)': '😉',
  ':(': '😢',
  ':-(': '😢',
  ':P': '😛',
  ':-P': '😛',
  ':p': '😛',
  ':-p': '😛',
  ':o': '😮',
  ':O': '😮',
  ':-o': '😮',
  ':-O': '😮',
  '8)': '😎',
  '8-)': '😎',
  ':|': '😐',
  ':-|': '😐',
  ':/': '😕',
  ':-/': '😕',
  ':*': '😘',
  ':-*': '😘',
  '<3': '❤️',
  '</3': '💔',
  '>:(': '😠',
  '>:-(': '😠',
  ':\'(': '😭',
  ':\'-(': '😭',
  '^_^': '😊',
  '-_-': '😑',
  'o_o': '😳',
  'O_O': '😳',
  '>_<': '😣',
  'T_T': '😭',
  'XD': '🤣',
  'xD': '🤣',
};

export function convertCommonEmoticons(text: string): string {
  let result = text;
  
  // استبدال الأكواد بالإيموجي
  Object.entries(commonEmoticonMap).forEach(([code, emoji]) => {
    // استخدام regex للتأكد من أن الكود محاط بمسافات أو في بداية/نهاية النص
    const regex = new RegExp(`(^|\\s)${escapeRegex(code)}($|\\s)`, 'g');
    result = result.replace(regex, `$1${emoji}$2`);
  });
  
  return result;
}

// دالة مساعدة لتجنب الأحرف الخاصة في regex
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
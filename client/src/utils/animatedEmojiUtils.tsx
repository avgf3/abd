import React from 'react';
import animatedEmojis from '@/data/animatedEmojis.json';

// تحويل أكواد السمايلات إلى صور متحركة
export function parseAnimatedEmojis(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  
  // البحث عن السمايلات بصيغة [[emoji:id:url]]
  const emojiRegex = /\[\[emoji:([^:]+):([^\]]+)\]\]/g;
  let match;
  
  while ((match = emojiRegex.exec(text)) !== null) {
    // إضافة النص قبل السمايل
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    
    // إضافة السمايل المتحرك
    const [fullMatch, emojiId, emojiUrl] = match;
    parts.push(
      <img
        key={`emoji-${match.index}`}
        src={emojiUrl}
        alt={emojiId}
        className="inline-block w-8 h-8 mx-1 align-middle animated-emoji"
        loading="lazy"
      />
    );
    
    lastIndex = match.index + fullMatch.length;
  }
  
  // إضافة النص المتبقي
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  
  return parts.length > 0 ? parts : [text];
}

// تحويل أكواد السمايلات النصية إلى سمايلات متحركة
export function convertTextToAnimatedEmojis(text: string): string {
  let result = text;
  
  // البحث عن جميع السمايلات في البيانات
  Object.values(animatedEmojis.categories).forEach(category => {
    category.emojis.forEach(emoji => {
      // استبدال الكود النصي بصيغة السمايل المتحرك
      const codeRegex = new RegExp(
        emoji.code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), // Escape special regex characters
        'g'
      );
      result = result.replace(codeRegex, ` [[emoji:${emoji.id}:${emoji.url}]] `);
    });
  });
  
  return result;
}

// دمج معالجة السمايلات المتحركة مع المحتوى
export function renderMessageWithAnimatedEmojis(
  content: string,
  existingRenderer?: (text: string) => React.ReactNode
): React.ReactNode {
  // أولاً: تحويل الأكواد النصية إلى سمايلات متحركة
  const convertedContent = convertTextToAnimatedEmojis(content);
  
  // ثانياً: معالجة السمايلات المتحركة
  const parts = parseAnimatedEmojis(convertedContent);
  
  // ثالثاً: معالجة كل جزء بالمعالج الأصلي إن وجد
  if (existingRenderer) {
    return parts.map((part, index) => {
      if (typeof part === 'string') {
        return <React.Fragment key={index}>{existingRenderer(part)}</React.Fragment>;
      }
      return part;
    });
  }
  
  return parts;
}
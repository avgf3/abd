import React from 'react';

import type { ChatUser } from '@/types/chat';

// تشغيل صوت التنبيه للمنشن
export const playMentionSound = () => {
  try {
    // إنشاء صوت تنبيه بسيط باستخدام Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // تردد الصوت (800 Hz لصوت لطيف)
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.type = 'sine';
    
    // مستوى الصوت (خفيف)
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    // تشغيل الصوت لمدة 300ms
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    }
};

// البحث عن المناشين في النص
export const findMentions = (text: string, users: ChatUser[]): ChatUser[] => {
  const mentionedUsers: ChatUser[] = [];
  
  users.forEach(user => {
    // البحث عن اسم المستخدم في النص
    if (text.includes(user.username)) {
      mentionedUsers.push(user);
    }
  });
  
  return mentionedUsers;
};

// تحويل النص لعرض المناشين بألوان مميزة للمستخدم المذكور
export const renderMessageWithMentions = (
  text: string, 
  currentUser: ChatUser | null,
): JSX.Element => {
  if (!currentUser) {
    return <span>{text}</span>;
  }

  // فحص إذا كان المستخدم الحالي مذكور في النص
  const isMentioned = text.includes(currentUser.username);
  
  if (!isMentioned) {
    return <span>{text}</span>;
  }

  // تقسيم النص وإبراز اسم المستخدم
  const parts = text.split(currentUser.username);
  const result: JSX.Element[] = [];
  
  parts.forEach((part, index) => {
    result.push(<span key={`part-${index}`}>{part}</span>);
    
    if (index < parts.length - 1) {
      // إضافة اسم المستخدم بتنسيق مميز
      result.push(
        <span
          key={`mention-${index}`}
          className="bg-blue-200 text-blue-800 px-2 py-1 rounded-md font-bold shadow-md border border-blue-300"
          style={{
            textShadow: '0 0 8px rgba(59, 130, 246, 0.5)',
            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
          }}
        >
          {currentUser.username}
        </span>
      );
    }
  });
  
  return <>{result}</>;
};

// إضافة اسم المستخدم لمربع النص
export const insertMention = (
  currentText: string,
  username: string,
  setMessageText: (text: string) => void
) => {
  // إضافة مسافة قبل الاسم إذا لم يكن النص فارغاً
  const separator = currentText.trim() ? ' ' : '';
  const newText = currentText + separator + username + ' ';
  setMessageText(newText);
};
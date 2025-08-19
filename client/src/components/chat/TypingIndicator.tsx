import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TypingIndicatorProps {
  typingUsers: Set<string>;
  currentUser: string | null;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ typingUsers, currentUser }) => {
  // فلترة المستخدم الحالي من قائمة الكاتبين
  const otherTypingUsers = Array.from(typingUsers).filter(user => user !== currentUser);
  
  if (otherTypingUsers.length === 0) return null;

  // تحديد النص المناسب حسب عدد الكاتبين
  const getTypingText = () => {
    if (otherTypingUsers.length === 1) {
      return `${otherTypingUsers[0]} يكتب`;
    } else if (otherTypingUsers.length === 2) {
      return `${otherTypingUsers[0]} و ${otherTypingUsers[1]} يكتبان`;
    } else if (otherTypingUsers.length === 3) {
      return `${otherTypingUsers[0]}، ${otherTypingUsers[1]} و ${otherTypingUsers[2]} يكتبون`;
    } else {
      const remainingCount = otherTypingUsers.length - 2;
      return `${otherTypingUsers[0]}، ${otherTypingUsers[1]} و ${remainingCount} آخرون يكتبون`;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.2 }}
        className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground"
      >
        <div className="flex items-center gap-1">
          <span>{getTypingText()}</span>
          <div className="flex items-center gap-1">
            <motion.div
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="w-1.5 h-1.5 bg-primary rounded-full"
            />
            <motion.div
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
              className="w-1.5 h-1.5 bg-primary rounded-full"
            />
            <motion.div
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
              className="w-1.5 h-1.5 bg-primary rounded-full"
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TypingIndicator;
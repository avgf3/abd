import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { ChatUser } from '@/types/chat';

interface StealthModeToggleProps {
  currentUser: ChatUser | null;
  onToggle: (isHidden: boolean) => void;
}

export default function StealthModeToggle({ currentUser, onToggle }: StealthModeToggleProps) {
  const [isHidden, setIsHidden] = useState(currentUser?.isHidden || false);

  const handleToggle = () => {
    const newHiddenState = !isHidden;
    setIsHidden(newHiddenState);
    onToggle(newHiddenState);
  };

  // فقط للإدمن والمالك
  if (!currentUser || (currentUser.userType !== 'admin' && currentUser.userType !== 'owner')) {
    return null;
  }

  return (
    <Button
      onClick={handleToggle}
      variant={isHidden ? "default" : "outline"}
      size="sm"
      className={`${isHidden ? 'bg-purple-600 hover:bg-purple-700' : 'border-purple-600 text-purple-600 hover:bg-purple-50'}`}
    >
      {isHidden ? '👻 مخفي' : '👤 ظاهر'}
    </Button>
  );
}
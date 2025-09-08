import { MoreVertical, Mic, Lock, Unlock, Settings, Trash2, Phone, PhoneOff } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import type { ChatRoom, ChatUser } from '@/types/chat';

interface RoomListItemProps {
  room: ChatRoom;
  isActive: boolean;
  currentUser: ChatUser | null;
  onSelect: (roomId: string) => void;
  onDelete?: (roomId: string, e: React.MouseEvent) => void;
  onChangeIcon?: (roomId: string) => void;
  onToggleLock?: (roomId: string, isLocked: boolean) => void;
  onVoiceJoin?: (roomId: string) => void;
  onVoiceLeave?: () => void;
  isVoiceConnected?: boolean;
  currentVoiceRoom?: string | null;
}

export default function RoomListItem({
  room,
  isActive,
  currentUser,
  onSelect,
  onDelete,
  onChangeIcon,
  onToggleLock,
  onVoiceJoin,
  onVoiceLeave,
  isVoiceConnected = false,
  currentVoiceRoom = null,
}: RoomListItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isAdmin = currentUser && ['owner', 'admin'].includes(currentUser.userType);
  const canModerate = currentUser && ['owner', 'admin', 'moderator'].includes(currentUser.userType);
  const canDelete = isAdmin && !room.isDefault && onDelete;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete && confirm('هل أنت متأكد من حذف هذه الغرفة؟')) {
      onDelete(room.id, e);
    }
  };

  return (
    <div
      className={`flex items-center gap-2 py-1.5 px-3 rounded-none border-b border-border/20 transition-colors duration-200 cursor-pointer w-full hover:bg-accent/10 ${
        isActive ? 'bg-primary/5' : ''
      }`}
      onClick={() => onSelect(room.id)}
    >
      {/* صورة الغرفة */}
      <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
        {room.icon ? (
          <img src={room.icon} alt={room.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
            <span className="text-sm font-bold text-primary">{room.name.charAt(0)}</span>
          </div>
        )}
      </div>

      {/* معلومات الغرفة */}
      <div className="flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-base font-medium transition-colors duration-300">
              {room.name}
            </span>
            <span className="flex items-center gap-1">
              {room.isBroadcast && <Mic className="w-3 h-3 text-orange-500" />}
              {room.isLocked && <Lock className="w-3 h-3 text-yellow-600" />}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">
              {room.userCount || 0} متصل
            </span>
            
            {/* زر الصوت */}
            {onVoiceJoin && onVoiceLeave && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  if (isVoiceConnected && currentVoiceRoom === room.id) {
                    onVoiceLeave();
                  } else {
                    onVoiceJoin(room.id);
                  }
                }}
                variant={isVoiceConnected && currentVoiceRoom === room.id ? "default" : "ghost"}
                size="sm"
                className="h-6 w-6 p-0"
              >
                {isVoiceConnected && currentVoiceRoom === room.id ? (
                  <PhoneOff className="w-3 h-3" />
                ) : (
                  <Phone className="w-3 h-3" />
                )}
              </Button>
            )}
            
            {(canModerate || canDelete) && (
              <div className="relative" ref={menuRef}>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(!showMenu);
                  }}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
                {showMenu && (
                  <div className="absolute left-0 top-full mt-1 bg-popover border rounded-md shadow-lg z-50 min-w-[150px]">
                    {canModerate && onToggleLock && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleLock(room.id, !room.isLocked);
                          setShowMenu(false);
                        }}
                        className="w-full text-right px-3 py-2 hover:bg-accent text-sm flex items-center gap-2"
                      >
                        {room.isLocked ? (
                          <>
                            <Unlock className="w-4 h-4" />
                            <span>فتح الغرفة</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-4 h-4" />
                            <span>قفل الغرفة</span>
                          </>
                        )}
                      </button>
                    )}
                    {isAdmin && onChangeIcon && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onChangeIcon(room.id);
                          setShowMenu(false);
                        }}
                        className="w-full text-right px-3 py-2 hover:bg-accent text-sm flex items-center gap-2"
                      >
                        <Settings className="w-4 h-4" />
                        <span>تغيير الصورة</span>
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(e);
                          setShowMenu(false);
                        }}
                        className="w-full text-right px-3 py-2 hover:bg-accent text-sm text-destructive flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>حذف الغرفة</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
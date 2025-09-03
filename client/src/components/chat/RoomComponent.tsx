import { X, Plus, Users, Mic, RefreshCw, MessageCircle, Search, Settings, Lock, Unlock } from 'lucide-react';
import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Virtuoso } from 'react-virtuoso';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useGrabScroll } from '@/hooks/useGrabScroll';
import { useRoomManager } from '@/hooks/useRoomManager';
import type { ChatRoom, ChatUser } from '@/types/chat';
import { dedupeRooms } from '@/utils/roomUtils';

interface RoomComponentProps {
  // بيانات أساسية
  currentUser: ChatUser | null;
  rooms: ChatRoom[];
  currentRoomId: string;

  // وظائف التفاعل
  onRoomChange: (roomId: string) => void;
  onAddRoom?: (roomData: { name: string; description: string; image: File | null }) => void;
  onDeleteRoom?: (roomId: string) => void;
  onRefreshRooms?: () => void;

  // إعدادات العرض
  viewMode?: 'list' | 'grid' | 'selector';
  showSearch?: boolean;
  showStats?: boolean;
  compact?: boolean;

  // إعدادات التفاعل
  allowCreate?: boolean;
  allowDelete?: boolean;
  allowRefresh?: boolean;
}

interface RoomCardProps {
  room: ChatRoom;
  isActive: boolean;
  currentUser: ChatUser | null;
  viewMode: 'list' | 'grid' | 'selector';
  compact: boolean;
  onSelect: (roomId: string) => void;
  onDelete?: (roomId: string, e: React.MouseEvent) => void;
  onChangeIcon?: (roomId: string) => void;
  onToggleLock?: (roomId: string, isLocked: boolean) => void;
}

// مكون البطاقة المعاد استخدامه
const RoomCard: React.FC<RoomCardProps> = ({
  room,
  isActive,
  currentUser,
  viewMode,
  compact,
  onSelect,
  onDelete,
  onChangeIcon,
  onToggleLock,
}) => {
  const isAdmin = currentUser && ['owner', 'admin'].includes(currentUser.userType);
  const canModerate = currentUser && ['owner', 'admin', 'moderator'].includes(currentUser.userType);
  const canDelete = isAdmin && !room.isDefault && onDelete;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete && confirm('هل أنت متأكد من حذف هذه الغرفة؟')) {
      onDelete(room.id, e);
    }
  };

  // أيقونة الغرفة - مثل صورة المستخدم في قائمة المتصلين
  const RoomIcon = () => (
    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-muted">
      {room.icon ? (
        <img src={room.icon} alt={room.name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
          <span className="text-white font-bold text-sm">
            {room.name.charAt(0)}
          </span>
        </div>
      )}
    </div>
  );

  // معلومات الغرفة - مثل معلومات المستخدم في قائمة المتصلين
  const RoomInfo = () => {
    const isAdminOrOwner = ['admin', 'owner', 'moderator'].includes(currentUser?.userType || 'guest');
    
    return (
      <div className="flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-base font-medium text-foreground" title={room.name}>
              {room.name}
            </span>
            {room.isMuted && <span className="text-yellow-400 text-xs">🔇</span>}
          </div>
          <div className="flex items-center gap-1">
            {room.isBroadcast && (
              <Badge variant="secondary" className="text-xs px-1 py-0">
                <Mic className="w-3 h-3 mr-1" />
                بث
              </Badge>
            )}
            {room.isLocked && (
              <Badge variant="secondary" className="text-xs px-1 py-0">
                <Lock className="w-3 h-3 mr-1" />
                مقفلة
              </Badge>
            )}
            <Badge variant="outline" className="text-xs px-1 py-0">
              {room.userCount || 0} متصل
            </Badge>
          </div>
        </div>
      </div>
    );
  };

  // عرض القائمة - مثل قائمة المتصلين
  if (viewMode === 'list') {
    return (
      <div
        className="flex items-center gap-2 py-1.5 px-3 rounded-none border-b border-border transition-colors duration-200 cursor-pointer w-full hover:bg-accent/10"
        onClick={() => onSelect(room.id)}
      >
        <RoomIcon />
        <RoomInfo />
      </div>
    );
  }

  // عرض الشبكة - نستخدم نفس شكل القائمة
  if (viewMode === 'grid') {
    return (
      <div
        className="flex items-center gap-2 py-1.5 px-3 rounded-none border-b border-border transition-colors duration-200 cursor-pointer w-full hover:bg-accent/10"
        onClick={() => onSelect(room.id)}
      >
        <RoomIcon />
        <RoomInfo />
      </div>
    );
  }

  // عرض المحدد - نستخدم نفس شكل القائمة
  return (
    <div
      className="flex items-center gap-2 py-1.5 px-3 rounded-none border-b border-border transition-colors duration-200 cursor-pointer w-full hover:bg-accent/10"
      onClick={() => onSelect(room.id)}
    >
      <RoomIcon />
      <RoomInfo />
    </div>
  );
};

// المكون الرئيسي
export default function RoomComponent({
  currentUser,
  rooms,
  currentRoomId,
  onRoomChange,
  onAddRoom,
  onDeleteRoom,
  onRefreshRooms,
  viewMode = 'list',
  showSearch = false,
  showStats = false,
  compact = false,
  allowCreate = true,
  allowDelete = true,
  allowRefresh = true,
}: RoomComponentProps) {
  // الحالات المحلية
  const listScrollRef = React.useRef<HTMLDivElement>(null);
  useGrabScroll(listScrollRef);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');
  const [roomImage, setRoomImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAtBottomRooms, setIsAtBottomRooms] = useState(true);
  const [roomIdToChangeIcon, setRoomIdToChangeIcon] = useState<string | null>(null);
  const { updateRoomIcon, toggleRoomLock } = useRoomManager();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();

  const handleChangeIconClick = useCallback((roomId: string) => {
    setRoomIdToChangeIcon(roomId);
    if (fileInputRef.current) fileInputRef.current.value = '';
    fileInputRef.current?.click();
  }, []);

  const handleFileSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!currentUser) return;
      try {
        const targetRoomId = roomIdToChangeIcon || currentRoomId;
        await updateRoomIcon(targetRoomId, file, currentUser.id);
        toast({ title: 'نجاح', description: 'تم تحديث صورة الغرفة' });
      } catch (err) {
        toast({ title: 'خطأ', description: 'فشل تحديث صورة الغرفة', variant: 'destructive' });
      }
    },
    [updateRoomIcon, currentUser, roomIdToChangeIcon, currentRoomId, toast]
  );

  const handleToggleLock = useCallback(
    async (roomId: string, nextLocked: boolean) => {
      try {
        await toggleRoomLock(roomId, nextLocked);
      } catch {}
    },
    [toggleRoomLock]
  );

  // منع الدخول إلى الغرف المقفلة لغير المشرفين/المدراء/المالكين مع إظهار رسالة عربية
  const handleRoomSelect = useCallback(
    (room: ChatRoom) => {
      const isPrivileged = ['admin', 'owner', 'moderator'].includes(
        currentUser?.userType || 'guest'
      );
      if (room.isLocked && !isPrivileged) {
        try {
          toast({
            title: 'غرفة مقفلة',
            description: 'هذه الغرفة مقفلة ولا يمكن الدخول إليها',
            variant: 'destructive',
          });
        } catch {}
        return; // لا تُنفّذ تغيير الغرفة
      }
      onRoomChange(room.id);
    },
    [currentUser?.userType, onRoomChange, toast]
  );

  // التحقق من الصلاحيات
  const isAdmin = currentUser && ['owner', 'admin'].includes(currentUser.userType);
  const canCreateRooms = isAdmin && allowCreate && onAddRoom;
  const canDeleteRooms = isAdmin && allowDelete && onDeleteRoom;

  // تصفية الغرف حسب البحث
  const filteredRooms = useMemo(() => {
    const uniqueRooms = dedupeRooms(rooms);
    if (!searchQuery.trim()) return uniqueRooms;

    const query = searchQuery.toLowerCase();
    return uniqueRooms.filter(
      (room) =>
        room.name.toLowerCase().includes(query) || room.description?.toLowerCase().includes(query)
    );
  }, [rooms, searchQuery]);

  // إحصائيات الغرف
  const roomStats = useMemo(() => {
    const uniqueRooms = dedupeRooms(rooms);
    const totalRooms = uniqueRooms.length;
    const broadcastRooms = uniqueRooms.filter((r) => r.isBroadcast).length;
    const totalUsers = uniqueRooms.reduce((sum, r) => sum + (r.userCount || 0), 0);
    const activeRooms = uniqueRooms.filter((r) => (r.userCount || 0) > 0).length;

    return { totalRooms, broadcastRooms, totalUsers, activeRooms };
  }, [rooms]);

  // معالجة تغيير الصورة
  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setRoomImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  // معالجة إضافة غرفة
  const handleAddRoom = useCallback(() => {
    if (newRoomName.trim() && onAddRoom) {
      onAddRoom({
        name: newRoomName.trim(),
        description: newRoomDescription.trim(),
        image: roomImage,
      });

      // إعادة تعيين النموذج
      setNewRoomName('');
      setNewRoomDescription('');
      setRoomImage(null);
      setImagePreview(null);
      setShowAddRoom(false);
    }
  }, [newRoomName, newRoomDescription, roomImage, onAddRoom]);

  // معالجة حذف غرفة
  const handleDeleteRoom = useCallback(
    (roomId: string, e: React.MouseEvent) => {
      if (onDeleteRoom) {
        onDeleteRoom(roomId);
      }
    },
    [onDeleteRoom]
  );

  // تصدير JSX حسب وضع العرض
  if (viewMode === 'selector') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl mx-auto">
          {/* العنوان */}
          <div className="text-center mb-8">
            <div className="mb-4">
              <MessageCircle className="w-16 h-16 text-primary mx-auto" />
            </div>
            <h1 className="text-4xl font-bold mb-2">أهلاً وسهلاً {currentUser?.username}</h1>
            <p className="text-xl text-muted-foreground">اختر الغرفة التي تريد الدخول إليها</p>
          </div>

          {/* الإحصائيات */}
          {showStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardContent className="text-center p-4">
                  <div className="text-2xl font-bold text-primary">{roomStats.totalRooms}</div>
                  <div className="text-sm text-muted-foreground">إجمالي الغرف</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="text-center p-4">
                  <div className="text-2xl font-bold text-orange-500">
                    {roomStats.broadcastRooms}
                  </div>
                  <div className="text-sm text-muted-foreground">غرف البث</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="text-center p-4">
                  <div className="text-2xl font-bold text-green-500">{roomStats.totalUsers}</div>
                  <div className="text-sm text-muted-foreground">المتصلون</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="text-center p-4">
                  <div className="text-2xl font-bold text-blue-500">{roomStats.activeRooms}</div>
                  <div className="text-sm text-muted-foreground">غرف نشطة</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* شبكة الغرف */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                isActive={false}
                currentUser={currentUser}
                viewMode="selector"
                compact={false}
                onSelect={(_rid) => handleRoomSelect(room)}
              />
            ))}
          </div>

          {/* التذييل */}
          <div className="text-center mt-8 text-sm text-muted-foreground">
            <p>يمكنك تغيير الغرفة في أي وقت من تبويب "الغرف"</p>
          </div>
        </div>
      </div>
    );
  }

  // العرض العادي (قائمة أو شبكة)
  return (
    <div className="h-full flex flex-col bg-background/95 backdrop-blur-sm">
      {/* العنوان */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg">الغرف</h3>
            {showStats && (
              <Badge variant="secondary" className="ml-2">
                {roomStats.totalRooms} غرفة
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {allowRefresh && onRefreshRooms && (
              <Button
                onClick={onRefreshRooms}
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-primary"
                title="تحديث الغرف"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}

            {showSearch && (
              <Button variant="ghost" size="sm" title="البحث في الغرف">
                <Search className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* شريط البحث */}
        {showSearch && (
          <div className="mt-3">
            <Input
              placeholder="البحث في الغرف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-right"
            />
          </div>
        )}
      </div>

      {/* المحتوى */}
      <div
        ref={listScrollRef}
        onScroll={() => {
          const el = listScrollRef.current;
          if (!el) return;
          const threshold = 80;
          const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
          setIsAtBottomRooms(atBottom);
        }}
        className="relative flex-1 min-h-0 overflow-y-auto p-4 pb-24 cursor-grab"
      >
        {/* زر إضافة غرفة */}
        {canCreateRooms && (
          <Button
            onClick={() => setShowAddRoom(true)}
            variant="outline"
            className="w-full justify-start gap-2 text-primary hover:bg-primary/10 mb-4"
          >
            <Plus className="w-4 h-4" />
            إضافة غرفة جديدة
          </Button>
        )}

        {/* قائمة الغرف */}
        <div
          className=
            {viewMode === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
              : 'space-y-1 h-full'}
        >
          {viewMode === 'grid' ? (
            filteredRooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                isActive={currentRoomId === room.id}
                currentUser={currentUser}
                viewMode={viewMode}
                compact={compact}
                onSelect={(_rid) => handleRoomSelect(room)}
                onDelete={canDeleteRooms ? (id, e) => handleDeleteRoom(id, e) : undefined}
                onChangeIcon={isAdmin ? (rid) => handleChangeIconClick(rid) : undefined}
                onToggleLock={isAdmin ? (rid, locked) => handleToggleLock(rid, locked) : undefined}
              />
            ))
          ) : (
            <Virtuoso
              style={{ height: '100%' }}
              totalCount={filteredRooms.length}
              itemContent={(index) => {
                const room = filteredRooms[index];
                return (
                  <RoomCard
                    key={room.id}
                    room={room}
                    isActive={currentRoomId === room.id}
                    currentUser={currentUser}
                    viewMode={viewMode}
                    compact={compact}
                    onSelect={(_rid) => handleRoomSelect(room)}
                    onDelete={canDeleteRooms ? (id, e) => handleDeleteRoom(id, e) : undefined}
                    onChangeIcon={isAdmin ? (rid) => handleChangeIconClick(rid) : undefined}
                    onToggleLock={isAdmin ? (rid, locked) => handleToggleLock(rid, locked) : undefined}
                  />
                );
              }}
            />
          )}
        </div>
        {/* Hidden file input for changing room icon */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileSelected}
        />
        {!isAtBottomRooms && (
          <div className="absolute bottom-4 right-4 z-10">
            <Button
              size="sm"
              onClick={() => {
                const el = listScrollRef.current;
                if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
              }}
              className="px-3 py-1.5 rounded-full text-xs bg-primary text-primary-foreground shadow"
            >
              الانتقال لأسفل
            </Button>
          </div>
        )}
      </div>

      {/* مربع حوار إضافة غرفة */}
      <Dialog open={showAddRoom} onOpenChange={setShowAddRoom}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-center">إضافة غرفة جديدة</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* اسم الغرفة */}
            <div className="space-y-2">
              <Label htmlFor="roomName">اسم الغرفة</Label>
              <Input
                id="roomName"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="مثال: أغاني وسهر"
                className="text-right"
              />
            </div>

            {/* وصف الغرفة */}
            <div className="space-y-2">
              <Label htmlFor="roomDescription">وصف الغرفة (اختياري)</Label>
              <Input
                id="roomDescription"
                value={newRoomDescription}
                onChange={(e) => setNewRoomDescription(e.target.value)}
                placeholder="وصف مختصر للغرفة"
                className="text-right"
              />
            </div>

            {/* صورة الغرفة */}
            <div className="space-y-2">
              <Label htmlFor="roomImage">صورة الغرفة</Label>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                  {imagePreview ? (
                    <img src={imagePreview} alt="معاينة" className="w-full h-full object-cover" />
                  ) : (
                    <Plus className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <Input
                  id="roomImage"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="flex-1"
                />
              </div>
            </div>

            {/* الأزرار */}
            <div className="flex gap-2 pt-4">
              <Button onClick={() => setShowAddRoom(false)} variant="outline" className="flex-1">
                إلغاء
              </Button>
              <Button onClick={handleAddRoom} disabled={!newRoomName.trim()} className="flex-1">
                إنشاء الغرفة
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { X, Plus, Users, Mic, MicOff, RefreshCw, MessageCircle, Search, Settings, Lock, Unlock, Phone, PhoneOff } from 'lucide-react';
import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Virtuoso } from 'react-virtuoso';

import RoomListItem from './RoomListItem';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useRoomManager } from '@/hooks/useRoomManager';
import { useVoice } from '@/hooks/useVoice';
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

  // أيقونة الغرفة
  const RoomIcon = () => (
    <div
      className={`${compact ? 'w-6 h-6' : 'w-8 h-8'} rounded-lg overflow-hidden flex-shrink-0 bg-muted`}
    >
      {room.icon ? (
        <img src={room.icon} alt={room.name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
          <span className={`${compact ? 'text-xs' : 'text-sm'} font-bold text-primary`}>
            {room.name.charAt(0)}
          </span>
        </div>
      )}
    </div>
  );

  // معلومات الغرفة
  const RoomInfo = () => {
    // اعتبار المشرف كإداري أيضاً
    const isAdminOrOwner = ['admin', 'owner', 'moderator'].includes(currentUser?.userType || 'guest');
    
    return (
      <div className="flex-1 min-w-0">
        <div className={`font-medium ${compact ? 'text-sm' : 'text-base'} flex items-center gap-2 min-w-0`}>
          <span className="truncate">{room.name}</span>
          <span className="flex items-center gap-1 flex-shrink-0">
            {room.isBroadcast && <Mic className="w-3 h-3 text-orange-500" />}
            {room.isLocked && <Lock className="w-3 h-3 text-yellow-600" />}
            {false && (
              <Phone className="w-3 h-3 text-green-500" />
            )}
          </span>
          {/* إزالة شارة "افتراضي" بناءً على طلب العميل */}
        </div>
        <div className={`${compact ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
          {room.userCount || 0} متصل
          {room.isBroadcast && <span className="text-orange-500 ml-1">• بث مباشر</span>}
          {room.isLocked && !isAdminOrOwner && <span className="text-yellow-600 ml-1">• مقفلة</span>}
        </div>
        {!compact && room.description && (
          <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{room.description}</div>
        )}
      </div>
    );
  };

  // عرض القائمة - مشابه لقائمة المتصلين
  if (viewMode === 'list') {
    return (
      <RoomListItem
        room={room}
        isActive={isActive}
        currentUser={currentUser}
        onSelect={onSelect}
        onDelete={canDelete ? onDelete : undefined}
        onChangeIcon={isAdmin ? onChangeIcon : undefined}
        onToggleLock={canModerate ? onToggleLock : undefined}
      />
    );
  }

  // عرض الشبكة
  if (viewMode === 'grid') {
    // تحديد إذا كان المستخدم مشرف أو مالك
    const isAdminOrOwner = ['admin', 'owner', 'moderator'].includes(currentUser?.userType || 'guest');
    
    return (
      <Card
        className={`cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg border-2 ${
          isActive ? 'border-primary/50 bg-primary/5' : 'hover:border-primary/30'
        } ${room.isLocked && !isAdminOrOwner ? 'opacity-75' : ''}`}
        onClick={() => onSelect(room.id)}
      >
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 mx-auto mb-2 rounded-xl overflow-hidden border">
            {room.icon ? (
              <img src={room.icon} alt={room.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                <span className="text-xl font-bold text-primary">{room.name.charAt(0)}</span>
              </div>
            )}
          </div>

          <CardTitle className="text-lg flex items-center justify-center gap-2">
            {room.name}
            {room.isBroadcast && <Mic className="w-4 h-4 text-orange-500" />}
            {room.isLocked && <Lock className="w-4 h-4 text-yellow-600" />}
          </CardTitle>

          {room.description && (
            <CardDescription className="text-center line-clamp-2">
              {room.description}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="pt-0">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-3">
            <Users className="w-4 h-4" />
            <span>{room.userCount || 0} متصل</span>
          </div>

                  <Button 
          className="w-full" 
          variant={isActive ? 'default' : (room.isLocked && !isAdminOrOwner ? 'destructive' : 'outline')}
          disabled={room.isLocked && !isAdminOrOwner}
        >
          {isActive ? 'الغرفة الحالية' : (room.isLocked && !isAdminOrOwner ? 'غرفة مقفلة' : 'دخول الغرفة')}
        </Button>

          {canDelete && (
            <Button
              onClick={handleDelete}
              variant="ghost"
              size="sm"
              className="w-full mt-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <X className="w-4 h-4 mr-2" />
              حذف الغرفة
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // عرض المحدد (شاشة اختيار الغرفة)
  // تحديد إذا كان المستخدم مشرف أو مالك
  const isAdminOrOwner = ['admin', 'owner', 'moderator'].includes(currentUser?.userType || 'guest');
  
  return (
    <Card
      className={`cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg border-2 hover:border-primary/50 ${
        room.isLocked && !isAdminOrOwner ? 'opacity-75' : ''
      }`}
      onClick={() => onSelect(room.id)}
    >
      <CardHeader className="text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-xl overflow-hidden border">
          {room.icon ? (
            <img src={room.icon} alt={room.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">{room.name.charAt(0)}</span>
            </div>
          )}
        </div>

        <CardTitle className="text-xl flex items-center justify-center gap-2">
          {room.name}
          {room.isBroadcast && <Mic className="w-4 h-4 text-orange-500" />}
          {room.isLocked && <Lock className="w-4 h-4 text-yellow-600" />}
        </CardTitle>

        {room.description && (
          <CardDescription className="text-center">{room.description}</CardDescription>
        )}
      </CardHeader>

      <CardContent>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-4">
          <Users className="w-4 h-4" />
          <span>{room.userCount || 0} متصل الآن</span>
        </div>

        <Button 
          className="w-full" 
          variant={room.isLocked && !isAdminOrOwner ? 'destructive' : 'outline'}
          disabled={room.isLocked && !isAdminOrOwner}
        >
          {room.isLocked && !isAdminOrOwner ? 'غرفة مقفلة' : 'دخول الغرفة'}
        </Button>
      </CardContent>
    </Card>
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
  // تم الاستغناء عن مرجع تمرير خارجي لقائمة الغرف للاعتماد على سكرول داخلي واحد فقط
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');
  const [roomImage, setRoomImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  // لا حاجة لتعقب موضع الأسفل بعد إزالة زر "الانتقال لأسفل"
  const [roomIdToChangeIcon, setRoomIdToChangeIcon] = useState<string | null>(null);
  const { updateRoomIcon, toggleRoomLock } = useRoomManager();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();
  
  // خطاف الصوت
  const {
    isConnected: isVoiceConnected,
    currentRoom: currentVoiceRoom,
    joinRoom: joinVoiceRoom,
    leaveRoom: leaveVoiceRoom,
    isMuted: isVoiceMuted,
    toggleMute: toggleVoiceMute
  } = useVoice({
    autoConnect: false,
    enableAnalytics: true
  });

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

  // معالجات الصوت
  const handleVoiceJoin = useCallback(async (roomId: string) => {
    try {
      await joinVoiceRoom(roomId);
      toast({
        title: 'تم الاتصال',
        description: 'تم الاتصال بالغرفة الصوتية بنجاح'
      });
    } catch (error: any) {
      toast({
        title: 'خطأ في الاتصال',
        description: error.message || 'فشل في الاتصال بالغرفة الصوتية',
        variant: 'destructive'
      });
    }
  }, [joinVoiceRoom, toast]);

  const handleVoiceLeave = useCallback(async () => {
    try {
      await leaveVoiceRoom();
      toast({
        title: 'تم قطع الاتصال',
        description: 'تم قطع الاتصال من الغرفة الصوتية'
      });
    } catch (error: any) {
      toast({
        title: 'خطأ في قطع الاتصال',
        description: error.message || 'فشل في قطع الاتصال',
        variant: 'destructive'
      });
    }
  }, [leaveVoiceRoom, toast]);

  const handleVoiceToggleMute = useCallback(async () => {
    try {
      await toggleVoiceMute();
    } catch (error: any) {
      toast({
        title: 'خطأ في تغيير حالة الكتم',
        description: error.message,
        variant: 'destructive'
      });
    }
  }, [toggleVoiceMute, toast]);

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
    <div className="h-full flex flex-col bg-background/95 backdrop-blur-sm" style={{ overflowX: 'hidden' }}>
      {/* شريط البحث - مشابه لقائمة المتصلين */}
      <div className="p-2 bg-card border-b border-border flex-shrink-0">
        <div className="relative">
          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="البحث عن الغرف..."
            className="w-full pl-4 pr-10 py-1.5 rounded-lg bg-background border-input placeholder:text-muted-foreground text-foreground"
          />
        </div>
      </div>

      {/* المحتوى */}
      <div
        className="relative flex-1 min-h-0 overflow-hidden cursor-grab bg-background flex flex-col"
        style={{ overflowX: 'hidden' }}
      >
        {/* العنوان - مشابه لقائمة المتصلين */}
        <div className="bg-primary text-primary-foreground mb-1 mx-0 mt-0 rounded-none">
          <div className="flex items-center justify-between px-3 py-1.5">
            <div className="flex items-center gap-2 font-bold text-sm">
              الغرف المتاحة
              <span className="bg-white/20 text-white px-1.5 py-0.5 rounded-full text-[10px] font-semibold">
                {filteredRooms.length}
              </span>
            </div>
          </div>
        </div>

        {/* زر إضافة غرفة */}
        {canCreateRooms && (
          <div className="px-3 py-2">
            <Button
              onClick={() => setShowAddRoom(true)}
              variant="outline"
              className="w-full justify-start gap-2 text-primary hover:bg-primary/10"
            >
              <Plus className="w-4 h-4" />
              إضافة غرفة جديدة
            </Button>
          </div>
        )}

        {/* قائمة الغرف */}
        <div
          className=
            {viewMode === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4'
              : 'flex-1 min-h-0 flex flex-col'}
          style={{ overflowX: 'hidden' }}
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
            <div className="px-0 flex-1 min-h-0">
              {filteredRooms.length === 0 ? (
                <div className="text-center text-gray-500 py-6">
                  <div className="mb-3">{searchQuery ? '🔍' : '🏠'}</div>
                  <p className="text-sm">
                    {searchQuery ? 'لا توجد نتائج للبحث' : 'لا توجد غرف متاحة حالياً'}
                  </p>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-blue-500 hover:text-blue-700 text-xs mt-2 underline"
                    >
                      مسح البحث
                    </button>
                  )}
                </div>
              ) : (
                <Virtuoso
                  style={{ height: '100%' }}
                  totalCount={filteredRooms.length}
                  itemContent={(index) => {
                    const room = filteredRooms[index];
                    return (
                      <RoomListItem
                        room={room}
                        isActive={currentRoomId === room.id}
                        currentUser={currentUser}
                        onSelect={(_rid) => handleRoomSelect(room)}
                        onDelete={canDeleteRooms ? (id, e) => handleDeleteRoom(id, e) : undefined}
                        onChangeIcon={isAdmin ? (rid) => handleChangeIconClick(rid) : undefined}
                        onToggleLock={isAdmin ? (rid, locked) => handleToggleLock(rid, locked) : undefined}
                        onVoiceJoin={handleVoiceJoin}
                        onVoiceLeave={handleVoiceLeave}
                        isVoiceConnected={isVoiceConnected}
                        currentVoiceRoom={currentVoiceRoom?.id || null}
                      />
                    );
                  }}
                />
              )}
            </div>
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
      </div>

      {/* شريط التحكم الصوتي */}
      {isVoiceConnected && currentVoiceRoom && (
        <div className="border-t bg-card p-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">{currentVoiceRoom.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant={isVoiceMuted ? "destructive" : "outline"}
                  size="sm"
                  onClick={handleVoiceToggleMute}
                >
                  {false ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleVoiceLeave}
            >
              <PhoneOff className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

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

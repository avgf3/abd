import React, { useState } from 'react';
import { X, Plus, Users, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ChatRoom, ChatUser } from '@/types/chat';

interface RoomsPanelProps {
  currentUser: ChatUser | null;
  rooms: ChatRoom[];
  currentRoomId: string;
  onRoomChange: (roomId: string) => void;
  onAddRoom: (roomData: { name: string; description: string; image: File | null }) => void;
  onDeleteRoom: (roomId: string) => void;
}

export default function RoomsPanel({
  currentUser,
  rooms,
  currentRoomId,
  onRoomChange,
  onAddRoom,
  onDeleteRoom
}: RoomsPanelProps) {
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');
  const [roomImage, setRoomImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const isAdmin = currentUser && ['owner', 'admin'].includes(currentUser.role);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setRoomImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddRoom = () => {
    if (newRoomName.trim()) {
      onAddRoom({
        name: newRoomName.trim(),
        description: newRoomDescription.trim(),
        image: roomImage
      });
      setNewRoomName('');
      setNewRoomDescription('');
      setRoomImage(null);
      setImagePreview(null);
      setShowAddRoom(false);
    }
  };

  const handleDeleteRoom = (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('هل أنت متأكد من حذف هذه الغرفة؟')) {
      onDeleteRoom(roomId);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background/95 backdrop-blur-sm">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg">الغرف</h3>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {/* Add Room Button for Admins */}
        {isAdmin && (
          <Button
            onClick={() => setShowAddRoom(true)}
            variant="outline"
            className="w-full justify-start gap-2 text-primary hover:bg-primary/10"
          >
            <Plus className="w-4 h-4" />
            إضافة غرفة جديدة
          </Button>
        )}

        {/* Rooms List */}
        <div className="space-y-1">
          {rooms.map((room) => (
            <div
              key={room.id}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors group ${
                currentRoomId === room.id
                  ? 'bg-primary/20 border border-primary/30'
                  : 'hover:bg-muted/80'
              }`}
              onClick={() => onRoomChange(room.id)}
            >
              {/* Room Image */}
              <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                {room.icon ? (
                  <img
                    src={room.icon}
                    alt={room.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">
                      {room.name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>

              {/* Room Info */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate flex items-center gap-2">
                  {room.name}
                  {room.isBroadcast && (
                    <Mic className="w-3 h-3 text-orange-500" />
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {room.userCount} متصل
                  {room.isBroadcast && (
                    <span className="text-orange-500 ml-1">• بث مباشر</span>
                  )}
                </div>
              </div>

              {/* Delete Button for Admins */}
              {isAdmin && !room.isDefault && (
                <Button
                  onClick={(e) => handleDeleteRoom(room.id, e)}
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add Room Dialog */}
      <Dialog open={showAddRoom} onOpenChange={setShowAddRoom}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-center">إضافة غرفة جديدة</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Room Name */}
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

            {/* Room Description */}
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

            {/* Room Image */}
            <div className="space-y-2">
              <Label htmlFor="roomImage">صورة الغرفة</Label>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="معاينة"
                      className="w-full h-full object-cover"
                    />
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

            {/* Buttons */}
            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => setShowAddRoom(false)}
                variant="outline"
                className="flex-1"
              >
                إلغاء
              </Button>
              <Button
                onClick={handleAddRoom}
                disabled={!newRoomName.trim()}
                className="flex-1"
              >
                إنشاء الغرفة
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
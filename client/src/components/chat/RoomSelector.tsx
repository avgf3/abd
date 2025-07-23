import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, MessageCircle } from 'lucide-react';
import type { ChatRoom, ChatUser } from '@/types/chat';

interface RoomSelectorProps {
  rooms: ChatRoom[];
  currentUser: ChatUser;
  onRoomSelect: (roomId: string) => void;
}

export default function RoomSelector({ rooms, currentUser, onRoomSelect }: RoomSelectorProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-4">
            <MessageCircle className="w-16 h-16 text-primary mx-auto" />
          </div>
          <h1 className="text-4xl font-bold mb-2">أهلاً وسهلاً {currentUser.username}</h1>
          <p className="text-xl text-muted-foreground">اختر الغرفة التي تريد الدخول إليها</p>
        </div>

        {/* Rooms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room) => (
            <Card 
              key={room.id}
              className="cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg border-2 hover:border-primary/50"
              onClick={() => onRoomSelect(room.id)}
            >
              <CardHeader className="text-center">
                {/* Room Image */}
                <div className="w-20 h-20 mx-auto mb-4 rounded-xl overflow-hidden border">
                  {room.icon ? (
                    <img
                      src={room.icon}
                      alt={room.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                      <span className="text-2xl font-bold text-primary">
                        {room.name.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
                
                <CardTitle className="text-xl">{room.name}</CardTitle>
                {room.description && (
                  <CardDescription className="text-center">
                    {room.description}
                  </CardDescription>
                )}
              </CardHeader>
              
              <CardContent>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-4">
                  <Users className="w-4 h-4" />
                  <span>{room.userCount} متصل الآن</span>
                </div>
                
                <Button 
                  className="w-full"
                  variant={room.isDefault ? "default" : "outline"}
                >
                  دخول الغرفة
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>يمكنك تغيير الغرفة في أي وقت من تبويب "الغرف"</p>
        </div>
      </div>
    </div>
  );
}
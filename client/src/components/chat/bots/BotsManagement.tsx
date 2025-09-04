import { useState, useEffect } from 'react';
import { Bot, Plus, Trash2, Edit, ToggleLeft, ToggleRight, ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ChatUser } from '@/types/chat';

interface Bot {
  id: number;
  username: string;
  userType: string;
  role: string;
  profileImage?: string;
  profileBanner?: string;
  profileBackgroundColor: string;
  status: string;
  gender: string;
  country: string;
  relation: string;
  bio: string;
  isOnline: boolean;
  currentRoom: string;
  usernameColor: string;
  profileEffect: string;
  points: number;
  level: number;
  totalPoints: number;
  levelProgress: number;
  createdBy?: number;
  createdAt: string;
  lastActivity: string;
  isActive: boolean;
  botType: 'system' | 'chat' | 'moderator';
  settings?: any;
}

interface Room {
  id: string;
  name: string;
  description?: string;
}

interface BotsManagementProps {
  currentUser: ChatUser | null;
}

export default function BotsManagement({ currentUser }: BotsManagementProps) {
  const [bots, setBots] = useState<Bot[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const [deletingBotId, setDeletingBotId] = useState<number | null>(null);
  const [movingBotId, setMovingBotId] = useState<number | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const { toast } = useToast();

  // بيانات البوت الجديد
  const [newBot, setNewBot] = useState({
    username: '',
    password: '',
    status: 'بوت نشط',
    bio: 'أنا بوت آلي',
    botType: 'system' as 'system' | 'chat' | 'moderator',
    usernameColor: '#00FF00',
  });

  // جلب قائمة البوتات
  const fetchBots = async () => {
    try {
      const response = await apiRequest<Bot[]>('/api/bots');
      setBots(response);
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في جلب قائمة البوتات',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // جلب قائمة الغرف
  const fetchRooms = async () => {
    try {
      const response = await apiRequest<Room[]>('/api/rooms');
      setRooms(response);
    } catch (error) {
      console.error('فشل في جلب الغرف:', error);
    }
  };

  useEffect(() => {
    fetchBots();
    fetchRooms();
  }, []);

  // إنشاء بوت جديد
  const handleCreateBot = async () => {
    try {
      if (!newBot.username || !newBot.password) {
        toast({
          title: 'خطأ',
          description: 'يجب إدخال اسم المستخدم وكلمة المرور',
          variant: 'destructive',
        });
        return;
      }

      const response = await apiRequest<Bot>('/api/bots', {
        method: 'POST',
        body: newBot,
      });

      setBots([...bots, response]);
      setIsCreateDialogOpen(false);
      setNewBot({
        username: '',
        password: '',
        status: 'بوت نشط',
        bio: 'أنا بوت آلي',
        botType: 'system',
        usernameColor: '#00FF00',
      });

      toast({
        title: 'نجح',
        description: 'تم إنشاء البوت بنجاح',
      });
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error?.message || 'فشل في إنشاء البوت',
        variant: 'destructive',
      });
    }
  };

  // تحديث بوت
  const handleUpdateBot = async () => {
    if (!selectedBot) return;

    try {
      const response = await apiRequest<Bot>(`/api/bots/${selectedBot.id}`, {
        method: 'PUT',
        body: {
          status: selectedBot.status,
          bio: selectedBot.bio,
          usernameColor: selectedBot.usernameColor,
          botType: selectedBot.botType,
        },
      });

      setBots(bots.map(bot => bot.id === response.id ? response : bot));
      setIsEditDialogOpen(false);
      setSelectedBot(null);

      toast({
        title: 'نجح',
        description: 'تم تحديث البوت بنجاح',
      });
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث البوت',
        variant: 'destructive',
      });
    }
  };

  // تبديل حالة البوت (تفعيل/تعطيل)
  const handleToggleBot = async (botId: number) => {
    try {
      const response = await apiRequest<{ message: string; bot: Bot }>(`/api/bots/${botId}/toggle`, {
        method: 'PATCH',
      });

      setBots(bots.map(bot => bot.id === botId ? response.bot : bot));

      toast({
        title: 'نجح',
        description: response.message,
      });
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في تبديل حالة البوت',
        variant: 'destructive',
      });
    }
  };

  // نقل بوت إلى غرفة أخرى
  const handleMoveBot = async (botId: number) => {
    if (!selectedRoom) {
      toast({
        title: 'خطأ',
        description: 'يجب اختيار غرفة',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await apiRequest<{ message: string; bot: Bot }>(`/api/bots/${botId}/move`, {
        method: 'POST',
        body: { roomId: selectedRoom },
      });

      setBots(bots.map(bot => bot.id === botId ? response.bot : bot));
      setMovingBotId(null);
      setSelectedRoom('');

      toast({
        title: 'نجح',
        description: response.message,
      });
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في نقل البوت',
        variant: 'destructive',
      });
    }
  };

  // حذف بوت
  const handleDeleteBot = async (botId: number) => {
    try {
      await apiRequest(`/api/bots/${botId}`, {
        method: 'DELETE',
      });

      setBots(bots.filter(bot => bot.id !== botId));
      setDeletingBotId(null);

      toast({
        title: 'نجح',
        description: 'تم حذف البوت بنجاح',
      });
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في حذف البوت',
        variant: 'destructive',
      });
    }
  };

  // إنشاء البوتات الافتراضية
  const handleCreateDefaultBots = async () => {
    try {
      const response = await apiRequest<{ message: string; bots: Bot[] }>('/api/bots/create-defaults', {
        method: 'POST',
      });

      setBots([...bots, ...response.bots]);

      toast({
        title: 'نجح',
        description: response.message,
      });
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في إنشاء البوتات الافتراضية',
        variant: 'destructive',
      });
    }
  };

  const getBotTypeColor = (type: string) => {
    switch (type) {
      case 'system':
        return 'bg-blue-100 text-blue-800';
      case 'chat':
        return 'bg-green-100 text-green-800';
      case 'moderator':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getBotTypeName = (type: string) => {
    switch (type) {
      case 'system':
        return 'نظام';
      case 'chat':
        return 'محادثة';
      case 'moderator':
        return 'مشرف';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* رأس القسم */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-3 rounded-xl">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-800">نظام البوتات</h3>
              <p className="text-sm text-gray-600">إدارة البوتات وتحكم في نشاطها</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600"
            >
              <Plus className="w-4 h-4 ml-2" />
              إضافة بوت
            </Button>
            {bots.length === 0 && (
              <Button
                onClick={handleCreateDefaultBots}
                variant="outline"
                className="border-green-500 text-green-700 hover:bg-green-50"
              >
                <Bot className="w-4 h-4 ml-2" />
                إنشاء 10 بوتات افتراضية
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* قائمة البوتات */}
      <ScrollArea className="h-[500px] rounded-xl border bg-white/50">
        <div className="grid gap-4 p-6">
          {bots.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">لا توجد بوتات حالياً</p>
              <Button
                onClick={handleCreateDefaultBots}
                variant="outline"
                className="mt-4"
              >
                <Bot className="w-4 h-4 ml-2" />
                إنشاء البوتات الافتراضية
              </Button>
            </div>
          ) : (
            bots.map((bot) => (
              <Card key={bot.id} className="relative overflow-hidden hover:shadow-lg transition-shadow">
                <div
                  className="absolute inset-0 opacity-10"
                  style={{ backgroundColor: bot.usernameColor }}
                />
                <CardHeader className="relative">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: bot.usernameColor }}
                      >
                        <Bot className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <span style={{ color: bot.usernameColor }}>{bot.username}</span>
                          <Badge className={getBotTypeColor(bot.botType)}>
                            {getBotTypeName(bot.botType)}
                          </Badge>
                          {bot.isActive ? (
                            <Badge className="bg-green-100 text-green-800">نشط</Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-800">معطل</Badge>
                          )}
                        </CardTitle>
                        <CardDescription>{bot.status}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleBot(bot.id)}
                        className="hover:bg-gray-100"
                      >
                        {bot.isActive ? (
                          <ToggleRight className="w-5 h-5 text-green-600" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-gray-600" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedBot(bot);
                          setIsEditDialogOpen(true);
                        }}
                        className="hover:bg-blue-50"
                      >
                        <Edit className="w-4 h-4 text-blue-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeletingBotId(bot.id)}
                        className="hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="relative space-y-3">
                  <p className="text-sm text-gray-600">{bot.bio}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-500">الغرفة الحالية:</span>
                      <Badge variant="outline">{bot.currentRoom}</Badge>
                      <span className="text-gray-500">المستوى:</span>
                      <Badge variant="outline">{bot.level}</Badge>
                      <span className="text-gray-500">النقاط:</span>
                      <Badge variant="outline">{bot.points}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {movingBotId === bot.id ? (
                        <>
                          <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                            <SelectTrigger className="w-32 h-8">
                              <SelectValue placeholder="اختر غرفة" />
                            </SelectTrigger>
                            <SelectContent>
                              {rooms.map((room) => (
                                <SelectItem key={room.id} value={room.id}>
                                  {room.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            onClick={() => handleMoveBot(bot.id)}
                            disabled={!selectedRoom}
                          >
                            نقل
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setMovingBotId(null);
                              setSelectedRoom('');
                            }}
                          >
                            إلغاء
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setMovingBotId(bot.id)}
                          className="text-blue-600 border-blue-300 hover:bg-blue-50"
                        >
                          <ArrowRight className="w-4 h-4 ml-2" />
                          نقل لغرفة أخرى
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* نافذة إنشاء بوت جديد */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>إنشاء بوت جديد</DialogTitle>
            <DialogDescription>
              أدخل بيانات البوت الجديد
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="username">اسم المستخدم</Label>
              <Input
                id="username"
                value={newBot.username}
                onChange={(e) => setNewBot({ ...newBot, username: e.target.value })}
                placeholder="أدخل اسم البوت"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                value={newBot.password}
                onChange={(e) => setNewBot({ ...newBot, password: e.target.value })}
                placeholder="أدخل كلمة مرور قوية"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">الحالة</Label>
              <Input
                id="status"
                value={newBot.status}
                onChange={(e) => setNewBot({ ...newBot, status: e.target.value })}
                placeholder="حالة البوت"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bio">الوصف</Label>
              <Input
                id="bio"
                value={newBot.bio}
                onChange={(e) => setNewBot({ ...newBot, bio: e.target.value })}
                placeholder="وصف البوت"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="botType">نوع البوت</Label>
              <Select
                value={newBot.botType}
                onValueChange={(value: 'system' | 'chat' | 'moderator') => 
                  setNewBot({ ...newBot, botType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">نظام</SelectItem>
                  <SelectItem value="chat">محادثة</SelectItem>
                  <SelectItem value="moderator">مشرف</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="color">لون الاسم</Label>
              <div className="flex gap-2">
                <Input
                  id="color"
                  type="color"
                  value={newBot.usernameColor}
                  onChange={(e) => setNewBot({ ...newBot, usernameColor: e.target.value })}
                  className="w-20"
                />
                <Input
                  value={newBot.usernameColor}
                  onChange={(e) => setNewBot({ ...newBot, usernameColor: e.target.value })}
                  placeholder="#00FF00"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleCreateBot}>
              إنشاء البوت
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة تعديل البوت */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>تعديل البوت</DialogTitle>
            <DialogDescription>
              تعديل بيانات البوت
            </DialogDescription>
          </DialogHeader>
          {selectedBot && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-status">الحالة</Label>
                <Input
                  id="edit-status"
                  value={selectedBot.status}
                  onChange={(e) => setSelectedBot({ ...selectedBot, status: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-bio">الوصف</Label>
                <Input
                  id="edit-bio"
                  value={selectedBot.bio}
                  onChange={(e) => setSelectedBot({ ...selectedBot, bio: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-botType">نوع البوت</Label>
                <Select
                  value={selectedBot.botType}
                  onValueChange={(value: 'system' | 'chat' | 'moderator') => 
                    setSelectedBot({ ...selectedBot, botType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">نظام</SelectItem>
                    <SelectItem value="chat">محادثة</SelectItem>
                    <SelectItem value="moderator">مشرف</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-color">لون الاسم</Label>
                <div className="flex gap-2">
                  <Input
                    id="edit-color"
                    type="color"
                    value={selectedBot.usernameColor}
                    onChange={(e) => setSelectedBot({ ...selectedBot, usernameColor: e.target.value })}
                    className="w-20"
                  />
                  <Input
                    value={selectedBot.usernameColor}
                    onChange={(e) => setSelectedBot({ ...selectedBot, usernameColor: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleUpdateBot}>
              حفظ التغييرات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* تأكيد حذف البوت */}
      <AlertDialog open={!!deletingBotId} onOpenChange={() => setDeletingBotId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا البوت؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingBotId && handleDeleteBot(deletingBotId)}
              className="bg-red-600 hover:bg-red-700"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Loader2, Bot, Users, MessageSquare, Activity, Settings, Eye, EyeOff } from 'lucide-react';
import { api } from '../../lib/queryClient';

interface BotInfo {
  id: string;
  username: string;
  displayName: string;
  currentRoom: string;
  isActive: boolean;
  isOwner: boolean;
  messageCount: number;
  lastActivity: Date;
}

interface BotStatus {
  totalBots: number;
  activeBots: number;
  ownerBots: number;
  roomDistribution: Record<string, number>;
  serverTime: Date;
}

export function BotControl() {
  const { user } = useAuth();
  const [showInterface, setShowInterface] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bots, setBots] = useState<BotInfo[]>([]);
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [selectedBot, setSelectedBot] = useState<BotInfo | null>(null);
  const [message, setMessage] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // رمز سري للوصول للواجهة
  const SECRET_CODE = 'owner2024$control';

  useEffect(() => {
    // التحقق من أن المستخدم أونر
    if (!user || user.role !== 'owner') {
      return;
    }

    // اختصار لوحة المفاتيح للإظهار/الإخفاء
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'B') {
        setShowInterface(!showInterface);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [user, showInterface]);

  const authenticate = () => {
    if (accessCode === SECRET_CODE) {
      setIsAuthenticated(true);
      loadBotData();
    } else {
      setAlert({ type: 'error', message: 'رمز الوصول غير صحيح' });
    }
  };

  const loadBotData = async () => {
    setLoading(true);
    try {
      const [statusRes, botsRes] = await Promise.all([
        api.get('/admin/bots/status'),
        api.get('/admin/bots')
      ]);

      setStatus(statusRes.data.data);
      setBots(botsRes.data.data);
    } catch (error) {
      setAlert({ type: 'error', message: 'فشل تحميل بيانات البوتات' });
    } finally {
      setLoading(false);
    }
  };

  const sendBotMessage = async () => {
    if (!selectedBot || !message.trim()) return;

    try {
      await api.post(`/admin/bots/${selectedBot.id}/message`, { message });
      setMessage('');
      setAlert({ type: 'success', message: 'تم إرسال الرسالة بنجاح' });
    } catch (error) {
      setAlert({ type: 'error', message: 'فشل إرسال الرسالة' });
    }
  };

  const moveBotToRoom = async () => {
    if (!selectedBot || !selectedRoom) return;

    try {
      await api.post(`/admin/bots/${selectedBot.id}/move`, { room: selectedRoom });
      setAlert({ type: 'success', message: 'تم نقل البوت بنجاح' });
      loadBotData();
    } catch (error) {
      setAlert({ type: 'error', message: 'فشل نقل البوت' });
    }
  };

  const executeCommand = async (command: string) => {
    try {
      await api.post('/admin/bots/command', { command });
      setAlert({ type: 'success', message: 'تم تنفيذ الأمر بنجاح' });
      loadBotData();
    } catch (error) {
      setAlert({ type: 'error', message: 'فشل تنفيذ الأمر' });
    }
  };

  if (!user || user.role !== 'owner') {
    return null;
  }

  if (!showInterface) {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowInterface(true)}
          className="opacity-30 hover:opacity-100 transition-opacity"
        >
          <EyeOff className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              نظام التحكم بالبوتات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Input
                type="password"
                placeholder="أدخل رمز الوصول"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && authenticate()}
              />
              <div className="flex gap-2">
                <Button onClick={authenticate} className="flex-1">
                  دخول
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowInterface(false);
                    setAccessCode('');
                  }}
                >
                  إلغاء
                </Button>
              </div>
              {alert && (
                <Alert variant={alert.type === 'error' ? 'destructive' : 'default'}>
                  <AlertDescription>{alert.message}</AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background/95 z-50 overflow-auto">
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6" />
            نظام التحكم بالبوتات
          </h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setShowInterface(false);
              setIsAuthenticated(false);
              setAccessCode('');
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>

        {alert && (
          <Alert className="mb-4" variant={alert.type === 'error' ? 'destructive' : 'default'}>
            <AlertDescription>{alert.message}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* الإحصائيات */}
            <div className="lg:col-span-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">إجمالي البوتات</p>
                        <p className="text-2xl font-bold">{status?.totalBots || 0}</p>
                      </div>
                      <Users className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">البوتات النشطة</p>
                        <p className="text-2xl font-bold">{status?.activeBots || 0}</p>
                      </div>
                      <Activity className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">بوتات الأونر</p>
                        <p className="text-2xl font-bold">{status?.ownerBots || 0}</p>
                      </div>
                      <Settings className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">إجمالي الرسائل</p>
                        <p className="text-2xl font-bold">
                          {bots.reduce((sum, bot) => sum + bot.messageCount, 0)}
                        </p>
                      </div>
                      <MessageSquare className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* التحكم والقوائم */}
            <div className="lg:col-span-3">
              <Tabs defaultValue="bots">
                <TabsList className="w-full">
                  <TabsTrigger value="bots" className="flex-1">قائمة البوتات</TabsTrigger>
                  <TabsTrigger value="control" className="flex-1">التحكم</TabsTrigger>
                  <TabsTrigger value="commands" className="flex-1">الأوامر</TabsTrigger>
                </TabsList>

                <TabsContent value="bots">
                  <Card>
                    <CardHeader>
                      <CardTitle>البوتات المتصلة</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {bots.map((bot) => (
                          <div
                            key={bot.id}
                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedBot?.id === bot.id ? 'bg-accent' : 'hover:bg-accent/50'
                            }`}
                            onClick={() => setSelectedBot(bot)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{bot.username}</span>
                                  {bot.isOwner && <Badge variant="secondary">أونر</Badge>}
                                  {bot.isActive ? (
                                    <Badge variant="success">نشط</Badge>
                                  ) : (
                                    <Badge variant="outline">غير نشط</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  الغرفة: {bot.currentRoom} | الرسائل: {bot.messageCount}
                                </p>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(bot.lastActivity).toLocaleTimeString('ar-SA')}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="control">
                  <Card>
                    <CardHeader>
                      <CardTitle>التحكم في البوت</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedBot ? (
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">البوت المحدد</p>
                            <div className="p-3 bg-accent rounded-lg">
                              <p className="font-medium">{selectedBot.username}</p>
                              <p className="text-sm text-muted-foreground">
                                {selectedBot.currentRoom} - {selectedBot.messageCount} رسالة
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">إرسال رسالة</label>
                            <div className="flex gap-2">
                              <Input
                                placeholder="اكتب رسالة..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && sendBotMessage()}
                              />
                              <Button onClick={sendBotMessage}>إرسال</Button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">نقل إلى غرفة</label>
                            <div className="flex gap-2">
                              <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                                <SelectTrigger>
                                  <SelectValue placeholder="اختر غرفة" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="general">عام</SelectItem>
                                  <SelectItem value="games">ألعاب</SelectItem>
                                  <SelectItem value="tech">تقنية</SelectItem>
                                  <SelectItem value="music">موسيقى</SelectItem>
                                  <SelectItem value="sports">رياضة</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button onClick={moveBotToRoom}>نقل</Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-center text-muted-foreground py-8">
                          اختر بوت من القائمة للتحكم فيه
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="commands">
                  <Card>
                    <CardHeader>
                      <CardTitle>أوامر النظام</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Button
                          variant="outline"
                          className="h-20"
                          onClick={() => executeCommand('start_all')}
                        >
                          <div className="text-center">
                            <Activity className="h-6 w-6 mx-auto mb-1" />
                            <span>تشغيل جميع البوتات</span>
                          </div>
                        </Button>
                        <Button
                          variant="outline"
                          className="h-20"
                          onClick={() => executeCommand('stop_all')}
                        >
                          <div className="text-center">
                            <Settings className="h-6 w-6 mx-auto mb-1" />
                            <span>إيقاف جميع البوتات</span>
                          </div>
                        </Button>
                        <Button
                          variant="outline"
                          className="h-20"
                          onClick={() => executeCommand('restart')}
                        >
                          <div className="text-center">
                            <Activity className="h-6 w-6 mx-auto mb-1" />
                            <span>إعادة تشغيل النظام</span>
                          </div>
                        </Button>
                        <Button
                          variant="outline"
                          className="h-20"
                          onClick={() => executeCommand('move_random')}
                        >
                          <div className="text-center">
                            <Users className="h-6 w-6 mx-auto mb-1" />
                            <span>تحريك عشوائي للبوتات</span>
                          </div>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
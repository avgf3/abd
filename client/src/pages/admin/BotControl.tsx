import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Progress } from '../../components/ui/progress';
import { 
  Loader2, Bot, Users, MessageSquare, Activity, 
  Settings, Eye, EyeOff, RefreshCw, Play, Pause,
  Shuffle, Plus, Minus, Zap, Server, AlertCircle
} from 'lucide-react';
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
  personality?: string;
  activityLevel?: number;
}

interface BotStatus {
  totalBots: number;
  activeBots: number;
  ownerBots: number;
  roomDistribution: Record<string, number>;
  serverTime: Date;
}

interface BotAnalytics {
  totalMessages: number;
  averageMessagesPerBot: number;
  mostActiveRoom: string;
  activityTrend: number[];
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
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning'; title: string; message: string } | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<BotAnalytics | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [systemHealth, setSystemHealth] = useState<'good' | 'warning' | 'error'>('good');

  const SECRET_CODE = 'owner2024$control';
  const rooms = ['general', 'games', 'tech', 'music', 'sports', 'movies', 'food', 'travel'];

  // اختصار لوحة المفاتيح
  useEffect(() => {
    if (!user || user.role !== 'owner') return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'B') {
        setShowInterface(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [user]);

  // تحديث تلقائي للبيانات
  useEffect(() => {
    if (!isAuthenticated || !autoRefresh) return;

    const interval = setInterval(() => {
      loadBotData();
    }, 5000); // كل 5 ثواني

    return () => clearInterval(interval);
  }, [isAuthenticated, autoRefresh]);

  useEffect(() => {
    if (!showInterface) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowInterface(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showInterface]);

  const authenticate = async () => {
    if (accessCode !== SECRET_CODE) {
      setAlert({ 
        type: 'error', 
        title: 'خطأ في المصادقة',
        message: 'رمز الوصول غير صحيح' 
      });
      return;
    }

    try {
      setLoading(true);
      const ownerId = (user as any)?.id || '1';
      const response = await api.post('/api/admin/bot-setup/generate-bot-token', {
        secretKey: 'owner-master-2024-secret',
        userId: String(ownerId),
      });

      const token = response.token || response.data?.token;
      if (!token) throw new Error('لم يتم الحصول على رمز الوصول');

      setAdminToken(token);
      setIsAuthenticated(true);
      await loadBotData(token);
      
      setAlert({
        type: 'success',
        title: 'تم بنجاح',
        message: 'تم الوصول لواجهة التحكم بنجاح'
      });
    } catch (error: any) {
      const isUnauthorized = (error?.status === 403) || String(error?.message || '').toLowerCase().includes('unauthorized');
      setAlert({ 
        type: 'error', 
        title: 'فشل التوثيق',
        message: isUnauthorized 
          ? 'فشل التوثيق: تأكد من تطابق المفتاح السري في الخادم BOT_MASTER_SECRET مع قيمة الواجهة.' 
          : (error.message || 'فشل توليد رمز الوصول')
      });
    } finally {
      setLoading(false);
    }
  };

  const loadBotData = async (tokenOverride?: string) => {
    const token = tokenOverride || adminToken;
    if (!token) return;

    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const [statusRes, botsRes] = await Promise.all([
        api.get('/api/admin/bots/status', { headers } as any).catch(() => null),
        api.get('/api/admin/bots/bots', { headers } as any).catch(() => null)
      ]);

      if (statusRes) setStatus(statusRes as any);

      const botsList = Array.isArray(botsRes)
        ? (botsRes as BotInfo[])
        : Array.isArray((botsRes as any)?.data)
          ? ((botsRes as any).data as BotInfo[])
          : [];

      setBots(botsList);
      updateAnalytics(botsList);
      checkSystemHealth(botsList);
    } catch (error) {
      console.error('خطأ في تحميل البيانات:', error);
      setSystemHealth('error');
    }
  };

  const updateAnalytics = (botList: BotInfo[]) => {
    const totalMessages = botList.reduce((sum, bot) => sum + bot.messageCount, 0);
    const averageMessagesPerBot = botList.length > 0 ? totalMessages / botList.length : 0;
    
    const roomCounts: Record<string, number> = {};
    botList.forEach(bot => {
      roomCounts[bot.currentRoom] = (roomCounts[bot.currentRoom] || 0) + 1;
    });
    
    const mostActiveRoom = Object.entries(roomCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'general';

    setAnalytics({
      totalMessages,
      averageMessagesPerBot,
      mostActiveRoom,
      activityTrend: [] // يمكن تحسينها لاحقاً
    });
  };

  const checkSystemHealth = (botList: BotInfo[]) => {
    const activeBots = botList.filter(bot => bot.isActive).length;
    const activeRatio = botList.length > 0 ? activeBots / botList.length : 0;

    if (activeRatio < 0.5) {
      setSystemHealth('error');
    } else if (activeRatio < 0.8) {
      setSystemHealth('warning');
    } else {
      setSystemHealth('good');
    }
  };

  const sendBotMessage = async () => {
    if (!selectedBot || !message.trim()) return;

    setLoading(true);
    try {
      await api.post(
        `/api/admin/bots/bots/${selectedBot.id}/message`,
        { content: message, room: selectedBot.currentRoom },
        { headers: { Authorization: `Bearer ${adminToken}` } } as any
      );

      setMessage('');
      setAlert({
        type: 'success',
        title: 'تم الإرسال',
        message: `تم إرسال الرسالة من ${selectedBot.username}`
      });
      
      await loadBotData();
    } catch (error: any) {
      setAlert({
        type: 'error',
        title: 'فشل الإرسال',
        message: error.message || 'فشل إرسال الرسالة'
      });
    } finally {
      setLoading(false);
    }
  };

  const moveBotToRoom = async () => {
    if (!selectedBot || !selectedRoom) return;

    setLoading(true);
    try {
      await api.post(
        `/api/admin/bots/bots/${selectedBot.id}/move`,
        { room: selectedRoom },
        { headers: { Authorization: `Bearer ${adminToken}` } } as any
      );

      setAlert({
        type: 'success',
        title: 'تم النقل',
        message: `تم نقل ${selectedBot.username} إلى ${selectedRoom}`
      });
      
      await loadBotData();
    } catch (error: any) {
      setAlert({
        type: 'error',
        title: 'فشل النقل',
        message: error.message || 'فشل نقل البوت'
      });
    } finally {
      setLoading(false);
    }
  };

  const executeCommand = async (uiCommand: string) => {
    setLoading(true);
    try {
      const map: Record<string, { server: string; successText: string }> = {
        'START_ALL': { server: 'start_all', successText: 'تشغيل جميع البوتات' },
        'STOP_ALL': { server: 'stop_all', successText: 'إيقاف جميع البوتات' },
        'RANDOM_MOVEMENT': { server: 'move_random', successText: 'حركة عشوائية' },
        'RESTART': { server: 'restart', successText: 'إعادة التشغيل' },
      };

      const mapped = map[uiCommand];
      if (!mapped) {
        setAlert({ type: 'warning', title: 'أمر غير مدعوم', message: 'هذا الأمر غير مدعوم حالياً' });
        return;
      }

      await api.post(
        '/api/admin/bots/command',
        { command: mapped.server, params: {} },
        { headers: { Authorization: `Bearer ${adminToken}` } } as any
      );

      setAlert({
        type: 'success',
        title: 'تم التنفيذ',
        message: `تم تنفيذ: ${mapped.successText}`
      });
      
      setTimeout(() => loadBotData(), 1000);
    } catch (error: any) {
      setAlert({
        type: 'error',
        title: 'فشل التنفيذ',
        message: error.message || 'فشل تنفيذ الأمر'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'owner') {
    return null;
  }

  if (!showInterface) {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowInterface(true)}
          className="shadow-lg"
        >
          <Bot className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm">
      <div className="container mx-auto h-full overflow-y-auto p-4">
        <Card className="mx-auto max-w-7xl bg-background/95">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-4">
              <Bot className="h-8 w-8 text-primary" />
              <CardTitle className="text-2xl">نظام التحكم بالبوتات المتقدم</CardTitle>
              {systemHealth !== 'good' && (
                <Badge variant={systemHealth === 'warning' ? 'default' : 'destructive'}>
                  {systemHealth === 'warning' ? 'تحذير' : 'خطأ'}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={autoRefresh ? 'text-primary' : ''}
              >
                <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowInterface(false)}
              >
                <EyeOff className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {!isAuthenticated ? (
              <div className="mx-auto max-w-md space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>تحقق من الهوية</AlertTitle>
                  <AlertDescription>
                    أدخل رمز الوصول السري للدخول لواجهة التحكم
                  </AlertDescription>
                </Alert>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="رمز الوصول السري"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && authenticate()}
                  />
                  <Button onClick={authenticate} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'دخول'}
                  </Button>
                  <Button variant="outline" onClick={() => setShowInterface(false)}>
                    إغلاق
                  </Button>
                </div>
              </div>
            ) : (
              <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
                  <TabsTrigger value="bots">البوتات</TabsTrigger>
                  <TabsTrigger value="control">التحكم</TabsTrigger>
                  <TabsTrigger value="analytics">التحليلات</TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">إجمالي البوتات</CardTitle>
                        <Bot className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{status?.totalBots || 0}</div>
                        <Progress 
                          value={(status?.activeBots || 0) / (status?.totalBots || 1) * 100} 
                          className="mt-2"
                        />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">نشطون</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                          {status?.activeBots || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {status?.totalBots ? 
                            `${Math.round((status.activeBots / status.totalBots) * 100)}% نشط` : 
                            '0% نشط'
                          }
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">بوتات الأونر</CardTitle>
                        <Zap className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-purple-600">
                          {status?.ownerBots || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">صلاحيات كاملة</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">الرسائل</CardTitle>
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {analytics?.totalMessages || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          ~{Math.round(analytics?.averageMessagesPerBot || 0)} لكل بوت
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">توزيع الغرف</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {status?.roomDistribution && Array.isArray(Object.entries(status.roomDistribution)) && Object.entries(status.roomDistribution).map(([room, count]) => (
                            <div key={room} className="flex items-center justify-between">
                              <span className="text-sm">{room}</span>
                              <div className="flex items-center gap-2">
                                <Progress 
                                  value={(count / (status?.totalBots || 1)) * 100} 
                                  className="w-32"
                                />
                                <Badge variant="secondary">{count}</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">أوامر سريعة</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          onClick={() => executeCommand('START_ALL')}
                          disabled={loading}
                        >
                          <Play className="mr-2 h-4 w-4" />
                          تشغيل الكل
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => executeCommand('STOP_ALL')}
                          disabled={loading}
                        >
                          <Pause className="mr-2 h-4 w-4" />
                          إيقاف الكل
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => executeCommand('RANDOM_MOVEMENT')}
                          disabled={loading}
                        >
                          <Shuffle className="mr-2 h-4 w-4" />
                          حركة عشوائية
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => executeCommand('INCREASE_ACTIVITY')}
                          disabled={loading}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          زيادة النشاط
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="bots">
                  <Card>
                    <CardHeader>
                      <CardTitle>قائمة البوتات</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-2">
                          {Array.isArray(bots) && bots.length > 0 ? bots.map((bot) => (
                            <div
                              key={bot.id}
                              className={`flex items-center justify-between rounded-lg border p-3 transition-colors cursor-pointer
                                ${selectedBot?.id === bot.id ? 'bg-accent' : 'hover:bg-accent/50'}
                                ${!bot.isActive ? 'opacity-50' : ''}`}
                              onClick={() => setSelectedBot(bot)}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`h-2 w-2 rounded-full ${bot.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{bot.username}</span>
                                    {bot.isOwner && <Badge variant="secondary">أونر</Badge>}
                                    {bot.personality && (
                                      <Badge variant="outline" className="text-xs">
                                        {bot.personality}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {bot.currentRoom} • {bot.messageCount} رسالة
                                  </div>
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(bot.lastActivity).toLocaleTimeString('ar')}
                              </div>
                            </div>
                          )) : (
                            <div className="text-sm text-muted-foreground p-3">لا توجد بوتات حالياً</div>
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="control">
                  {selectedBot ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      <Card>
                        <CardHeader>
                          <CardTitle>التحكم في: {selectedBot.username}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <label className="text-sm font-medium">إرسال رسالة</label>
                            <div className="mt-2 flex gap-2">
                              <Input
                                placeholder="اكتب الرسالة..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && sendBotMessage()}
                              />
                              <Button onClick={sendBotMessage} disabled={loading || !message.trim()}>
                                إرسال
                              </Button>
                            </div>
                          </div>

                          <div>
                            <label className="text-sm font-medium">نقل إلى غرفة</label>
                            <div className="mt-2 flex gap-2">
                              <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                                <SelectTrigger>
                                  <SelectValue placeholder="اختر غرفة" />
                                </SelectTrigger>
                                <SelectContent>
                                  {rooms.map((room) => (
                                    <SelectItem key={room} value={room}>
                                      {room}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button 
                                onClick={moveBotToRoom} 
                                disabled={loading || !selectedRoom || selectedRoom === selectedBot.currentRoom}
                              >
                                نقل
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>معلومات البوت</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <dl className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <dt className="text-muted-foreground">المعرف:</dt>
                              <dd className="font-mono">{selectedBot.id}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-muted-foreground">الحالة:</dt>
                              <dd>
                                <Badge variant={selectedBot.isActive ? 'default' : 'secondary'}>
                                  {selectedBot.isActive ? 'نشط' : 'غير نشط'}
                                </Badge>
                              </dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-muted-foreground">الغرفة الحالية:</dt>
                              <dd>{selectedBot.currentRoom}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-muted-foreground">عدد الرسائل:</dt>
                              <dd>{selectedBot.messageCount}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-muted-foreground">الشخصية:</dt>
                              <dd>{selectedBot.personality || 'عادي'}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-muted-foreground">مستوى النشاط:</dt>
                              <dd>
                                <Progress 
                                  value={(selectedBot.activityLevel || 0.5) * 100} 
                                  className="w-20"
                                />
                              </dd>
                            </div>
                          </dl>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>لم يتم اختيار بوت</AlertTitle>
                      <AlertDescription>
                        اختر بوت من قائمة البوتات للتحكم فيه
                      </AlertDescription>
                    </Alert>
                  )}
                </TabsContent>

                <TabsContent value="analytics">
                  <div className="grid gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>إحصائيات النظام</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="text-center">
                            <div className="text-3xl font-bold text-primary">
                              {analytics?.totalMessages || 0}
                            </div>
                            <p className="text-sm text-muted-foreground">إجمالي الرسائل</p>
                          </div>
                          <div className="text-center">
                            <div className="text-3xl font-bold text-green-600">
                              {Math.round(analytics?.averageMessagesPerBot || 0)}
                            </div>
                            <p className="text-sm text-muted-foreground">متوسط الرسائل/بوت</p>
                          </div>
                          <div className="text-center">
                            <div className="text-3xl font-bold text-purple-600">
                              {analytics?.mostActiveRoom || 'general'}
                            </div>
                            <p className="text-sm text-muted-foreground">أكثر غرفة نشاطاً</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>حالة النظام</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span>صحة النظام</span>
                            <Badge 
                              variant={
                                systemHealth === 'good' ? 'default' : 
                                systemHealth === 'warning' ? 'secondary' : 'destructive'
                              }
                            >
                              {systemHealth === 'good' ? 'ممتاز' : 
                               systemHealth === 'warning' ? 'تحذير' : 'خطأ'}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>معدل النشاط</span>
                            <Progress 
                              value={(status?.activeBots || 0) / (status?.totalBots || 1) * 100} 
                              className="w-32"
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <span>وقت الخادم</span>
                            <span className="text-sm text-muted-foreground">
                              {status?.serverTime ? new Date(status.serverTime).toLocaleString('ar') : '-'}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            )}

            {alert && (
              <Alert 
                className="mt-4"
                variant={alert.type === 'error' ? 'destructive' : 'default'}
              >
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{alert.title}</AlertTitle>
                <AlertDescription>{alert.message}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
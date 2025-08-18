import React, { useState } from 'react';
import { AvatarWithFrame, availableFrames } from '@/components/ui/AvatarWithFrame';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CheckCircle, Crown, Sparkles, Star } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function AllFramesGallery() {
  const [selectedSize, setSelectedSize] = useState<number>(100);
  const [testImageUrl, setTestImageUrl] = useState<string>('');
  const [selectedFrame, setSelectedFrame] = useState<string>('none');
  const [variant, setVariant] = useState<'profile' | 'list'>('profile');
  
  // صورة افتراضية للاختبار
  const defaultTestImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Ccircle cx='100' cy='100' r='100' fill='%235865F2'/%3E%3Ctext x='100' y='110' text-anchor='middle' font-size='60' fill='white'%3ETest%3C/text%3E%3C/svg%3E";
  
  // تجميع الإطارات حسب الفئة
  const framesByCategory = availableFrames.reduce((acc, frame) => {
    const category = frame.category || 'عام';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(frame);
    return acc;
  }, {} as Record<string, typeof availableFrames>);

  // أحجام محددة مسبقاً
  const presetSizes = [
    { label: 'صغير جداً (30px)', value: 30 },
    { label: 'صغير (40px)', value: 40 },
    { label: 'متوسط (60px)', value: 60 },
    { label: 'كبير (80px)', value: 80 },
    { label: 'كبير جداً (100px)', value: 100 },
    { label: 'ضخم (130px)', value: 130 },
    { label: 'عملاق (200px)', value: 200 },
  ];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'تاج TOP':
        return <Crown className="w-4 h-4" />;
      case 'SVIP':
        return <Star className="w-4 h-4" />;
      case 'كلاسيك':
        return <Sparkles className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'تاج TOP':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'SVIP':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'كلاسيك':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8" dir="rtl">
      <div className="container mx-auto px-4">
        {/* رأس الصفحة */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">معرض جميع إطارات الصور الشخصية</h1>
          <p className="text-gray-600 text-lg">استعرض جميع الإطارات المتاحة واختبرها بأحجام مختلفة</p>
        </div>

        {/* لوحة التحكم */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>لوحة التحكم في الاختبار</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* حجم الصورة */}
              <div className="space-y-2">
                <Label>حجم الصورة</Label>
                <Select value={selectedSize.toString()} onValueChange={(value) => setSelectedSize(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {presetSizes.map((size) => (
                      <SelectItem key={size.value} value={size.value.toString()}>
                        {size.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={selectedSize}
                    onChange={(e) => setSelectedSize(parseInt(e.target.value) || 100)}
                    min={20}
                    max={300}
                    className="w-24"
                  />
                  <span className="text-sm text-gray-500">بكسل</span>
                </div>
              </div>

              {/* نوع العرض */}
              <div className="space-y-2">
                <Label>نوع العرض</Label>
                <Select value={variant} onValueChange={(value) => setVariant(value as 'profile' | 'list')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="profile">ملف شخصي (كامل)</SelectItem>
                    <SelectItem value="list">قائمة (مختصر)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* رابط الصورة */}
              <div className="space-y-2">
                <Label>رابط صورة مخصصة (اختياري)</Label>
                <Input
                  type="url"
                  value={testImageUrl}
                  onChange={(e) => setTestImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTestImageUrl('')}
                  className="w-full"
                >
                  استخدام الصورة الافتراضية
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* معلومات تقنية */}
        <Alert className="mb-8">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>معلومات تقنية</AlertTitle>
          <AlertDescription className="space-y-2 mt-2">
            <p>• <strong>الوضع الكامل (profile):</strong> يعرض الإطار كاملاً خارج الصورة مع توسيع الحاوية</p>
            <p>• <strong>الوضع المختصر (list):</strong> يقص الأجزاء العلوية للإطار ليناسب المساحة المحدودة</p>
            <p>• عند الأحجام الصغيرة جداً (&lt; 64px) قد يتم استخدام إطار بديل أبسط</p>
          </AlertDescription>
        </Alert>

        {/* عرض الإطارات */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="all">جميع الإطارات</TabsTrigger>
            {Object.keys(framesByCategory).map((category) => (
              <TabsTrigger key={category} value={category}>
                <span className="flex items-center gap-1">
                  {getCategoryIcon(category)}
                  {category}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {availableFrames.map((frame) => (
                <Card
                  key={frame.id}
                  className={`transition-all duration-200 hover:shadow-lg cursor-pointer ${
                    selectedFrame === frame.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setSelectedFrame(frame.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{frame.name}</CardTitle>
                      <Badge className={getCategoryColor(frame.category)}>
                        <span className="flex items-center gap-1">
                          {getCategoryIcon(frame.category)}
                          {frame.category}
                        </span>
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-center items-center p-4 bg-gray-50 rounded-lg">
                      <AvatarWithFrame
                        src={testImageUrl || defaultTestImage}
                        alt={frame.name}
                        frame={frame.id}
                        size={selectedSize}
                        variant={variant}
                      />
                    </div>
                    <div className="mt-3 text-center">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        frame="{frame.id}"
                      </code>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {Object.entries(framesByCategory).map(([category, frames]) => (
            <TabsContent key={category} value={category}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {frames.map((frame) => (
                  <Card
                    key={frame.id}
                    className={`transition-all duration-200 hover:shadow-lg cursor-pointer ${
                      selectedFrame === frame.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => setSelectedFrame(frame.id)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{frame.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-center items-center p-4 bg-gray-50 rounded-lg">
                        <AvatarWithFrame
                          src={testImageUrl || defaultTestImage}
                          alt={frame.name}
                          frame={frame.id}
                          size={selectedSize}
                          variant={variant}
                        />
                      </div>
                      <div className="mt-3 text-center">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          frame="{frame.id}"
                        </code>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* قسم كيفية الاستخدام */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="text-green-600" />
              كيفية استخدام الإطارات في الكود
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">استيراد المكون:</h3>
              <pre className="bg-gray-900 text-gray-100 p-3 rounded-md overflow-x-auto">
                <code>{`import { AvatarWithFrame } from '@/components/ui/AvatarWithFrame';`}</code>
              </pre>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">استخدام بسيط:</h3>
              <pre className="bg-gray-900 text-gray-100 p-3 rounded-md overflow-x-auto">
                <code>{`<AvatarWithFrame
  src="/path/to/image.jpg"
  alt="User Name"
  frame="${selectedFrame}"
  size={${selectedSize}}
  variant="${variant}"
/>`}</code>
              </pre>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">خصائص المكون:</h3>
              <ul className="space-y-2 text-sm">
                <li><strong>src:</strong> مسار الصورة (اختياري)</li>
                <li><strong>alt:</strong> نص بديل للصورة</li>
                <li><strong>frame:</strong> معرف الإطار من القائمة أعلاه</li>
                <li><strong>size:</strong> قطر الصورة بالبكسل</li>
                <li><strong>variant:</strong> "profile" للعرض الكامل أو "list" للعرض المختصر</li>
                <li><strong>fallback:</strong> نص يظهر عند فشل تحميل الصورة</li>
                <li><strong>onClick:</strong> دالة للنقر (اختياري)</li>
              </ul>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <h3 className="font-semibold mb-2 text-yellow-800">ملاحظات مهمة:</h3>
              <ul className="space-y-1 text-sm text-yellow-700">
                <li>• الإطار يحيط بالصورة من الخارج دون تصغيرها</li>
                <li>• في وضع profile: الحاوية تتوسع لاستيعاب الإطار</li>
                <li>• في وضع list: الإطار يُقص ليناسب الحجم المحدد</li>
                <li>• عند الأحجام الصغيرة جداً قد يتم استخدام إطار بديل</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* قسم الأحجام الموصى بها */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>الأحجام الموصى بها</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">للملف الشخصي:</h3>
                <ul className="space-y-1 text-sm">
                  <li>• صورة رئيسية: 130-200px</li>
                  <li>• صورة ثانوية: 80-100px</li>
                  <li>• بطاقة المستخدم: 60-80px</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">للقوائم:</h3>
                <ul className="space-y-1 text-sm">
                  <li>• قائمة المتصلين: 40px</li>
                  <li>• قائمة الأصدقاء: 50px</li>
                  <li>• التعليقات: 30-40px</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
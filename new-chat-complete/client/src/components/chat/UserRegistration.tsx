import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { ChatUser } from '@/types/chat';

interface UserRegistrationProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister: (user: ChatUser) => void;
}

export default function UserRegistration({ isOpen, onClose, onRegister }: UserRegistrationProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    status: '',
    gender: '',
    age: '',
    country: '',
    relation: '',
  });

  const countries = [
    'السعودية',
    'الإمارات',
    'الكويت',
    'مصر',
    'الأردن',
    'المغرب',
    'العراق',
    'سوريا',
    'لبنان',
    'تونس',
    'الجزائر',
    'ليبيا',
    'قطر',
    'البحرين',
    'عمان',
    'فلسطين',
    'اليمن',
    'السودان',
    'موريتانيا',
    'الصومال',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'خطأ',
        description: 'كلمات المرور غير متطابقة',
        variant: 'destructive',
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: 'خطأ',
        description: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: {
          username: formData.username,
          password: formData.password,
          userType: 'member',
          status: formData.status,
          gender: formData.gender,
          age: formData.age ? parseInt(formData.age) : undefined,
          country: formData.country,
          relation: formData.relation,
        },
      });

      const { user } = response;

      toast({
        title: 'تم التسجيل بنجاح',
        description: 'مرحباً بك كعضو جديد في الموقع',
      });

      onRegister(user);
      onClose();
    } catch (error: any) {
      const errorData = await error.response?.json();
      toast({
        title: 'خطأ في التسجيل',
        description: errorData?.error || 'حدث خطأ أثناء التسجيل',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md bg-slate-900/95 backdrop-blur-lg border-slate-700/50 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white text-xl font-bold text-center">
            تسجيل عضوية جديدة
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-slate-300">
              اسم المستخدم
            </Label>
            <Input
              id="username"
              type="text"
              required
              value={formData.username}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, username: e.target.value.slice(0, 14) }))
              }
              className="bg-slate-800/50 border-slate-600 text-white"
              placeholder="اختر اسم مستخدم فريد"
              maxLength={14}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-300">
              كلمة المرور
            </Label>
            <Input
              id="password"
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
              className="bg-slate-800/50 border-slate-600 text-white"
              placeholder="6 أحرف على الأقل"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-slate-300">
              تأكيد كلمة المرور
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              required
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))
              }
              className="bg-slate-800/50 border-slate-600 text-white"
              placeholder="أعد كتابة كلمة المرور"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status" className="text-slate-300">
              الحالة الشخصية
            </Label>
            <Input
              id="status"
              type="text"
              value={formData.status}
              onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
              className="bg-slate-800/50 border-slate-600 text-white"
              placeholder="اكتب حالتك الشخصية (اختياري)"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">الجنس</Label>
              <Select
                onValueChange={(value) => setFormData((prev) => ({ ...prev, gender: value }))}
              >
                <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white">
                  <SelectValue placeholder="اختر" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  <SelectItem value="ذكر">ذكر</SelectItem>
                  <SelectItem value="أنثى">أنثى</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="age" className="text-slate-300">
                العمر
              </Label>
              <Input
                id="age"
                type="number"
                min="18"
                max="100"
                value={formData.age}
                onChange={(e) => setFormData((prev) => ({ ...prev, age: e.target.value }))}
                className="bg-slate-800/50 border-slate-600 text-white"
                placeholder="العمر"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">البلد</Label>
            <Select onValueChange={(value) => setFormData((prev) => ({ ...prev, country: value }))}>
              <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white">
                <SelectValue placeholder="اختر بلدك" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600 max-h-48 overflow-y-auto">
                {countries.map((country) => (
                  <SelectItem key={country} value={country}>
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">الحالة الاجتماعية</Label>
            <Select
              onValueChange={(value) => setFormData((prev) => ({ ...prev, relation: value }))}
            >
              <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white">
                <SelectValue placeholder="اختر" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="أعزب">أعزب</SelectItem>
                <SelectItem value="مرتبط">مرتبط</SelectItem>
                <SelectItem value="متزوج">متزوج</SelectItem>
                <SelectItem value="مطلق">مطلق</SelectItem>
                <SelectItem value="أرمل">أرمل</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? 'جاري التسجيل...' : 'تسجيل العضوية'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              إلغاء
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

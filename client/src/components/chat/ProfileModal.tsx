import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { ChatUser } from '@/types/chat';

interface ProfileModalProps {
  user: ChatUser;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (user: ChatUser) => void;
}

export default function ProfileModal({ user, isOpen, onClose, onUpdate }: ProfileModalProps) {
  const [formData, setFormData] = useState({
    username: user.username,
    status: user.status || '',
    gender: user.gender || '',
    age: user.age?.toString() || '',
    country: user.country || '',
    relation: user.relation || ''
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setFormData({
      username: user.username,
      status: user.status || '',
      gender: user.gender || '',
      age: user.age?.toString() || '',
      country: user.country || '',
      relation: user.relation || ''
    });
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = await apiRequest('/api/users/profile', {
        method: 'PUT',
        body: {
          userId: user.id,
          ...formData,
          age: formData.age ? parseInt(formData.age) : undefined
        }
      });

      if (data.user) {
        onUpdate?.(data.user);
        toast({
          title: "تم التحديث",
          description: "تم حفظ التغييرات بنجاح",
        });
        onClose();
      }
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء الحفظ",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">تعديل الملف الشخصي</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="username" className="text-gray-300">اسم المستخدم</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>

          <div>
            <Label htmlFor="status" className="text-gray-300">الحالة</Label>
            <Textarea
              id="status"
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
              placeholder="كيف تشعر اليوم؟"
              className="bg-gray-700 border-gray-600 text-white"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="gender" className="text-gray-300">الجنس</Label>
            <Select value={formData.gender} onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="اختر الجنس" />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                <SelectItem value="male" className="text-white">ذكر</SelectItem>
                <SelectItem value="female" className="text-white">أنثى</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="age" className="text-gray-300">العمر</Label>
            <Input
              id="age"
              type="number"
              value={formData.age}
              onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
              className="bg-gray-700 border-gray-600 text-white"
              min="13"
              max="100"
            />
          </div>

          <div>
            <Label htmlFor="country" className="text-gray-300">البلد</Label>
            <Input
              id="country"
              value={formData.country}
              onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
              placeholder="بلدك"
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>

          <div>
            <Label htmlFor="relation" className="text-gray-300">الحالة الاجتماعية</Label>
            <Select value={formData.relation} onValueChange={(value) => setFormData(prev => ({ ...prev, relation: value }))}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="اختر الحالة" />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                <SelectItem value="single" className="text-white">أعزب/عزباء</SelectItem>
                <SelectItem value="married" className="text-white">متزوج/متزوجة</SelectItem>
                <SelectItem value="engaged" className="text-white">مخطوب/مخطوبة</SelectItem>
                <SelectItem value="divorced" className="text-white">مطلق/مطلقة</SelectItem>
                <SelectItem value="complicated" className="text-white">الأمر معقد</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {saving ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              إلغاء
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
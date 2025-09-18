import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, X } from 'lucide-react';
import type { ChatUser } from '@/types/chat';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface ProfileEditFormProps {
  user: ChatUser | null;
  field: string;
  onSave: (field: string, value: any) => void;
  onCancel: () => void;
}

const COUNTRIES = [
  'السعودية', 'الإمارات', 'الكويت', 'قطر', 'البحرين', 'عُمان',
  'الأردن', 'لبنان', 'سوريا', 'العراق', 'مصر', 'السودان',
  'ليبيا', 'تونس', 'الجزائر', 'المغرب', 'اليمن', 'الصومال',
  'جيبوتي', 'جزر القمر', 'موريتانيا', 'فلسطين', 'أخرى'
];

const RELATIONSHIP_STATUS = [
  'أعزب', 'متزوج', 'مطلق', 'أرمل', 'في علاقة', 'غير محدد'
];

export default function ProfileEditForm({ user, field, onSave, onCancel }: ProfileEditFormProps) {
  const { toast } = useToast();
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (!user) return;
    
    switch (field) {
      case 'username':
        setValue(user.username || '');
        break;
      case 'age':
        setValue(user.age?.toString() || '');
        break;
      case 'gender':
        setValue(user.gender || '');
        break;
      case 'country':
        setValue(user.country || '');
        break;
      case 'relation':
        setValue(user.relation || '');
        break;
      case 'bio':
        setValue(user.bio || '');
        break;
    }
  }, [user, field]);

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const updateData: any = {};
      
      switch (field) {
        case 'username':
          if (!value.trim()) {
            toast({
              title: 'خطأ',
              description: 'اسم المستخدم مطلوب',
              variant: 'destructive',
            });
            return;
          }
          updateData.username = value.trim();
          break;
          
        case 'age':
          const age = parseInt(value);
          if (isNaN(age) || age < 13 || age > 120) {
            toast({
              title: 'خطأ',
              description: 'العمر يجب أن يكون بين 13 و 120 سنة',
              variant: 'destructive',
            });
            return;
          }
          updateData.age = age;
          break;
          
        case 'gender':
          if (!['ذكر', 'أنثى'].includes(value)) {
            toast({
              title: 'خطأ',
              description: 'الجنس يجب أن يكون ذكر أو أنثى',
              variant: 'destructive',
            });
            return;
          }
          updateData.gender = value;
          break;
          
        case 'country':
          if (!value.trim()) {
            toast({
              title: 'خطأ',
              description: 'البلد مطلوب',
              variant: 'destructive',
            });
            return;
          }
          updateData.country = value.trim();
          break;
          
        case 'relation':
          updateData.relation = value;
          break;
          
        case 'bio':
          if (value.length > 500) {
            toast({
              title: 'خطأ',
              description: 'السيرة الذاتية يجب أن تكون أقل من 500 حرف',
              variant: 'destructive',
            });
            return;
          }
          updateData.bio = value.trim();
          break;
      }

      await apiRequest(`/api/users/${user.id}`, {
        method: 'PUT',
        body: updateData,
      });

      toast({
        title: 'تم الحفظ',
        description: 'تم تحديث البيانات بنجاح',
      });

      onSave(field, updateData);
    } catch (error: any) {
      toast({
        title: 'خطأ في الحفظ',
        description: error.message || 'حدث خطأ أثناء حفظ البيانات',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderInput = () => {
    switch (field) {
      case 'username':
        return (
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="اسم المستخدم"
            maxLength={50}
          />
        );
        
      case 'age':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="العمر"
            min="13"
            max="120"
          />
        );
        
      case 'gender':
        return (
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger>
              <SelectValue placeholder="اختر الجنس" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ذكر">ذكر</SelectItem>
              <SelectItem value="أنثى">أنثى</SelectItem>
            </SelectContent>
          </Select>
        );
        
      case 'country':
        return (
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger>
              <SelectValue placeholder="اختر البلد" />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((country) => (
                <SelectItem key={country} value={country}>
                  {country}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
        
      case 'relation':
        return (
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger>
              <SelectValue placeholder="اختر الحالة الاجتماعية" />
            </SelectTrigger>
            <SelectContent>
              {RELATIONSHIP_STATUS.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
        
      case 'bio':
        return (
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="اكتب نبذة شخصية عنك..."
            maxLength={500}
            rows={4}
          />
        );
        
      default:
        return null;
    }
  };

  const getFieldTitle = () => {
    switch (field) {
      case 'username': return 'تعديل اسم المستخدم';
      case 'age': return 'تعديل العمر';
      case 'gender': return 'تعديل الجنس';
      case 'country': return 'تعديل البلد';
      case 'relation': return 'تعديل الحالة الاجتماعية';
      case 'bio': return 'تعديل السيرة الذاتية';
      default: return 'تعديل البيانات';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{getFieldTitle()}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderInput()}
        
        {field === 'bio' && (
          <div className="text-xs text-muted-foreground text-right">
            {value.length}/500 حرف
          </div>
        )}
        
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {loading ? 'جاري الحفظ...' : 'حفظ'}
          </Button>
          
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            إلغاء
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
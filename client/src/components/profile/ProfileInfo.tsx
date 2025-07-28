import React from 'react';
import { Edit2, Save, X, User, MapPin, Calendar, Heart, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatPoints } from '@/utils/pointsUtils';
import type { ChatUser } from '@/types/chat';

interface ProfileInfoProps {
  profileData: ChatUser;
  editMode: string | null;
  editValue: string;
  canEdit: boolean;
  onStartEdit: (field: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditValueChange: (value: string) => void;
  isLoading: boolean;
}

const COUNTRIES = [
  '🇸🇦 السعودية', '🇦🇪 الإمارات', '🇪🇬 مصر', '🇯🇴 الأردن',
  '🇱🇧 لبنان', '🇸🇾 سوريا', '🇮🇶 العراق', '🇰🇼 الكويت',
  '🇶🇦 قطر', '🇧🇭 البحرين', '🇴🇲 عمان', '🇾🇪 اليمن',
  '🇱🇾 ليبيا', '🇹🇳 تونس', '🇩🇿 الجزائر', '🇲🇦 المغرب'
];

const RELATIONS = [
  '💚 أعزب', '💍 متزوج', '💔 مطلق', '🖤 أرمل'
];

const GENDERS = [
  '👨 ذكر', '👩 أنثى'
];

export function ProfileInfo({
  profileData,
  editMode,
  editValue,
  canEdit,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditValueChange,
  isLoading
}: ProfileInfoProps) {

  const InfoField = ({ 
    field, 
    label, 
    value, 
    icon: Icon, 
    type = 'text',
    options = []
  }: {
    field: string;
    label: string;
    value: string | number | undefined;
    icon: any;
    type?: 'text' | 'number' | 'select' | 'textarea';
    options?: string[];
  }) => {
    const isEditing = editMode === field;
    const displayValue = value || 'غير محدد';

    if (isEditing) {
      return (
        <div className="flex items-center gap-2 p-3 bg-white/5 rounded-lg">
          <Icon size={16} className="text-blue-400 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-xs text-gray-400 mb-1">{label}</div>
            <div className="flex gap-2">
              {type === 'select' ? (
                <Select value={editValue} onValueChange={onEditValueChange}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={`اختر ${label}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : type === 'textarea' ? (
                <Textarea
                  value={editValue}
                  onChange={(e) => onEditValueChange(e.target.value)}
                  placeholder={`أدخل ${label}`}
                  className="flex-1 min-h-[80px]"
                  disabled={isLoading}
                />
              ) : (
                <Input
                  type={type}
                  value={editValue}
                  onChange={(e) => onEditValueChange(e.target.value)}
                  placeholder={`أدخل ${label}`}
                  className="flex-1"
                  disabled={isLoading}
                />
              )}
              <Button
                onClick={onSaveEdit}
                size="sm"
                disabled={isLoading || !editValue.trim()}
                className="bg-green-500 hover:bg-green-600"
              >
                <Save size={14} />
              </Button>
              <Button
                onClick={onCancelEdit}
                size="sm"
                variant="outline"
                disabled={isLoading}
              >
                <X size={14} />
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div 
        className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
          canEdit ? 'hover:bg-white/5 cursor-pointer' : ''
        }`}
        onClick={() => canEdit && onStartEdit(field)}
      >
        <Icon size={16} className="text-blue-400 flex-shrink-0" />
        <div className="flex-1">
          <div className="text-xs text-gray-400">{label}</div>
          <div className="text-sm font-medium">{displayValue}</div>
        </div>
        {canEdit && (
          <Edit2 size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* الاسم والحالة */}
      <div className="text-center space-y-2">
        <InfoField
          field="username"
          label="اسم المستخدم"
          value={profileData.username}
          icon={User}
        />
        
        <InfoField
          field="status"
          label="الحالة الشخصية"
          value={profileData.status}
          icon={MessageCircle}
          type="textarea"
        />
      </div>

      {/* المعلومات الشخصية */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-300 border-b border-gray-600 pb-1">
          المعلومات الشخصية
        </h3>
        
        <InfoField
          field="gender"
          label="الجنس"
          value={profileData.gender}
          icon={User}
          type="select"
          options={GENDERS}
        />
        
        <InfoField
          field="age"
          label="العمر"
          value={profileData.age}
          icon={Calendar}
          type="number"
        />
        
        <InfoField
          field="country"
          label="البلد"
          value={profileData.country}
          icon={MapPin}
          type="select"
          options={COUNTRIES}
        />
        
        <InfoField
          field="relation"
          label="الحالة الاجتماعية"
          value={profileData.relation}
          icon={Heart}
          type="select"
          options={RELATIONS}
        />
      </div>

      {/* معلومات النظام */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-300 border-b border-gray-600 pb-1">
          معلومات الحساب
        </h3>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-white/5 rounded-lg">
            <div className="text-xs text-gray-400">النقاط</div>
            <div className="text-lg font-bold text-yellow-400">
              {formatPoints(profileData.points || 0)}
            </div>
          </div>
          
          <div className="text-center p-3 bg-white/5 rounded-lg">
            <div className="text-xs text-gray-400">المستوى</div>
            <div className="text-lg font-bold text-blue-400">
              {profileData.level || 1}
            </div>
          </div>
        </div>
        
        <div className="text-center p-3 bg-white/5 rounded-lg">
          <div className="text-xs text-gray-400">تاريخ الانضمام</div>
          <div className="text-sm">
            {profileData.createdAt 
              ? new Date(profileData.createdAt).toLocaleDateString('ar-SA')
              : 'غير محدد'
            }
          </div>
        </div>
        
        <div className="flex items-center justify-center gap-2 p-3 bg-white/5 rounded-lg">
          <div className={`w-3 h-3 rounded-full ${
            profileData.isOnline ? 'bg-green-400' : 'bg-gray-400'
          }`} />
          <span className="text-sm">
            {profileData.isOnline ? 'متصل الآن' : 'غير متصل'}
          </span>
        </div>
      </div>
    </div>
  );
}
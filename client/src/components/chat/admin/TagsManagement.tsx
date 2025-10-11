import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Edit, Save, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { PREDEFINED_TAGS, type ProfileTag } from '@/components/ui/ProfileTags';
import { apiRequest } from '@/lib/utils';

interface TagsManagementProps {
  userId?: number;
  username?: string;
  currentTags?: ProfileTag[];
  onTagsUpdate?: (tags: ProfileTag[]) => void;
}

export default function TagsManagement({ 
  userId, 
  username, 
  currentTags = [], 
  onTagsUpdate 
}: TagsManagementProps) {
  const [userTags, setUserTags] = useState<ProfileTag[]>(currentTags);
  const [isEditing, setIsEditing] = useState(false);
  const [newTag, setNewTag] = useState<Partial<ProfileTag>>({
    type: '',
    text: '',
    color: '#3B82F6',
    icon: ''
  });

  useEffect(() => {
    setUserTags(currentTags);
  }, [currentTags]);

  const handleAddPredefinedTag = (tagType: string) => {
    const predefinedTag = PREDEFINED_TAGS[tagType];
    if (!predefinedTag) return;

    // تحقق من عدم وجود التاج مسبقاً
    if (userTags.some(tag => tag.type === tagType)) {
      toast({
        title: 'تحذير',
        description: 'هذا التاج موجود بالفعل',
        variant: 'destructive'
      });
      return;
    }

    const updatedTags = [...userTags, predefinedTag];
    setUserTags(updatedTags);
    saveTags(updatedTags);
  };

  const handleAddCustomTag = () => {
    if (!newTag.text || !newTag.type) {
      toast({
        title: 'خطأ',
        description: 'يجب إدخال نص ونوع التاج',
        variant: 'destructive'
      });
      return;
    }

    const customTag: ProfileTag = {
      type: newTag.type!,
      text: newTag.text!,
      color: newTag.color || '#3B82F6',
      icon: newTag.icon || ''
    };

    const updatedTags = [...userTags, customTag];
    setUserTags(updatedTags);
    saveTags(updatedTags);

    // إعادة تعيين النموذج
    setNewTag({
      type: '',
      text: '',
      color: '#3B82F6',
      icon: ''
    });
  };

  const handleRemoveTag = (index: number) => {
    const updatedTags = userTags.filter((_, i) => i !== index);
    setUserTags(updatedTags);
    saveTags(updatedTags);
  };

  const saveTags = async (tags: ProfileTag[]) => {
    if (!userId) return;

    try {
      await apiRequest(`/api/users/${userId}`, {
        method: 'PUT',
        body: { profileTags: tags }
      });

      toast({
        title: 'تم الحفظ',
        description: `تم تحديث تاجات ${username || 'المستخدم'} بنجاح`
      });

      onTagsUpdate?.(tags);
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في حفظ التاجات',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* التاجات الحالية */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>تاجات {username || 'المستخدم'}</span>
            <Badge variant="secondary">{userTags.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {userTags.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              لا توجد تاجات حالياً
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {userTags.map((tag, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 border text-sm font-medium shadow-sm"
                >
                  {tag.image ? (
                    <img src={tag.image} alt={tag.text} className="w-5 h-5 object-contain" />
                  ) : (
                    tag.icon && <span>{tag.icon}</span>
                  )}
                  <span className="text-gray-800">{tag.text}</span>
                  <button
                    onClick={() => handleRemoveTag(index)}
                    className="ml-1 hover:bg-red-100 text-red-500 rounded-full p-0.5 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* التاجات المحددة مسبقاً */}
      <Card>
        <CardHeader>
          <CardTitle>التاجات المحددة مسبقاً</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(PREDEFINED_TAGS).map(([key, tag]) => (
              <Button
                key={key}
                variant="outline"
                size="sm"
                onClick={() => handleAddPredefinedTag(key)}
                className="flex items-center gap-2 justify-start h-12"
                disabled={userTags.some(userTag => userTag.type === key)}
              >
                {tag.image ? (
                  <img src={tag.image} alt={tag.text} className="w-6 h-6 object-contain" />
                ) : (
                  tag.icon && <span>{tag.icon}</span>
                )}
                <span>{tag.text}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* إضافة تاج مخصص */}
      <Card>
        <CardHeader>
          <CardTitle>إضافة تاج مخصص</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tagType">نوع التاج</Label>
              <Input
                id="tagType"
                value={newTag.type || ''}
                onChange={(e) => setNewTag(prev => ({ ...prev, type: e.target.value }))}
                placeholder="مثل: custom_vip"
              />
            </div>
            <div>
              <Label htmlFor="tagText">نص التاج</Label>
              <Input
                id="tagText"
                value={newTag.text || ''}
                onChange={(e) => setNewTag(prev => ({ ...prev, text: e.target.value }))}
                placeholder="مثل: VIP"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tagColor">لون التاج</Label>
              <div className="flex gap-2">
                <Input
                  id="tagColor"
                  type="color"
                  value={newTag.color || '#3B82F6'}
                  onChange={(e) => setNewTag(prev => ({ ...prev, color: e.target.value }))}
                  className="w-16"
                />
                <Input
                  value={newTag.color || '#3B82F6'}
                  onChange={(e) => setNewTag(prev => ({ ...prev, color: e.target.value }))}
                  placeholder="#3B82F6"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="tagIcon">أيقونة التاج (اختيارية)</Label>
              <Input
                id="tagIcon"
                value={newTag.icon || ''}
                onChange={(e) => setNewTag(prev => ({ ...prev, icon: e.target.value }))}
                placeholder="مثل: 👑"
              />
            </div>
          </div>

          {/* معاينة التاج */}
          {newTag.text && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">معاينة:</span>
              <div
                className="px-3 py-1 rounded-full text-white text-sm font-bold shadow-lg"
                style={{ backgroundColor: newTag.color || '#3B82F6' }}
              >
                {newTag.icon && <span className="mr-1">{newTag.icon}</span>}
                <span>{newTag.text}</span>
              </div>
            </div>
          )}

          <Button onClick={handleAddCustomTag} className="w-full">
            <Plus size={16} className="mr-2" />
            إضافة التاج المخصص
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
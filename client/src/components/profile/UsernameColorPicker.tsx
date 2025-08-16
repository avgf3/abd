import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { ChatUser } from '@/types/chat';

interface UsernameColorPickerProps {
  currentUser: ChatUser;
  onColorUpdate: (color: string) => void;
}

// 30 لون جميل ومتنوع
const USERNAME_COLORS = [
  { name: 'أبيض', value: '#FFFFFF', bg: 'bg-white' },
  { name: 'أحمر', value: '#FF4444', bg: 'bg-red-500' },
  { name: 'أحمر فاتح', value: '#FF6B6B', bg: 'bg-red-400' },
  { name: 'أزرق', value: '#4A90E2', bg: 'bg-blue-500' },
  { name: 'أزرق فاتح', value: '#74B9FF', bg: 'bg-blue-400' },
  { name: 'أخضر', value: '#2ECC71', bg: 'bg-green-500' },
  { name: 'أخضر فاتح', value: '#55EFC4', bg: 'bg-green-400' },
  { name: 'أصفر', value: '#F1C40F', bg: 'bg-yellow-500' },
  { name: 'ذهبي', value: '#FFD700', bg: 'bg-yellow-400' },
  { name: 'برتقالي', value: '#FF8C00', bg: 'bg-orange-500' },
  { name: 'برتقالي فاتح', value: '#FFA726', bg: 'bg-orange-400' },
  { name: 'بنفسجي', value: '#9B59B6', bg: 'bg-purple-500' },
  { name: 'بنفسجي فاتح', value: '#A29BFE', bg: 'bg-purple-400' },
  { name: 'وردي', value: '#E91E63', bg: 'bg-pink-500' },
  { name: 'وردي فاتح', value: '#FF69B4', bg: 'bg-pink-400' },
  { name: 'فيروزي', value: '#1ABC9C', bg: 'bg-cyan-500' },
  { name: 'فيروزي فاتح', value: '#00CED1', bg: 'bg-cyan-400' },
  { name: 'بني', value: '#8B4513', bg: 'bg-amber-700' },
  { name: 'بني فاتح', value: '#CD853F', bg: 'bg-amber-600' },
  { name: 'رمادي', value: '#95A5A6', bg: 'bg-gray-500' },
  { name: 'رمادي فاتح', value: '#BDC3C7', bg: 'bg-gray-400' },
  { name: 'كحلي', value: '#2C3E50', bg: 'bg-slate-700' },
  { name: 'زهري داكن', value: '#C0392B', bg: 'bg-rose-600' },
  { name: 'زهري', value: '#E74C3C', bg: 'bg-rose-500' },
  { name: 'لايم', value: '#32CD32', bg: 'bg-lime-500' },
  { name: 'نعناعي', value: '#00FF7F', bg: 'bg-emerald-400' },
  { name: 'سماوي', value: '#87CEEB', bg: 'bg-sky-400' },
  { name: 'بحري', value: '#1E90FF', bg: 'bg-blue-600' },
  { name: 'أرجواني', value: '#8A2BE2', bg: 'bg-violet-600' },
  { name: 'مرجاني', value: '#FF7F50', bg: 'bg-orange-400' }
];

export default function UsernameColorPicker({ currentUser, onColorUpdate }: UsernameColorPickerProps) {
  const [selectedColor, setSelectedColor] = useState(currentUser.usernameColor || '#000000');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleColorSelect = async (color: string) => {
    setSelectedColor(color);
    setIsLoading(true);

    try {
      const result = await apiRequest(`/api/users/${currentUser.id}`, {
        method: 'PUT',
        body: { usernameColor: color }
      });

      const updated = (result as any)?.user ?? result;
      onColorUpdate((updated as any)?.usernameColor || color);
      
      toast({
        title: "تم بنجاح",
        description: "تم تحديث لون اسم المستخدم",
        variant: "default",
      });

    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "فشل في تحديث لون الاسم",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-gray-900/95 border-gray-700">
      <CardHeader>
        <CardTitle className="text-xl text-gray-100 flex items-center gap-2">
          🎨 لون اسم المستخدم
        </CardTitle>
        <div className="text-gray-400 text-sm">
          معاينة: <span style={{ color: selectedColor, fontWeight: 'bold' }}>{currentUser.username}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 gap-3 max-h-80 overflow-y-auto">
          {USERNAME_COLORS.map((colorOption) => (
            <Button
              key={colorOption.value}
              className={`
                h-12 w-full flex flex-col items-center justify-center p-2 text-xs
                ${selectedColor === colorOption.value 
                  ? 'ring-2 ring-primary ring-offset-2 ring-offset-gray-900' 
                  : 'hover:ring-1 hover:ring-gray-400'
                }
                transition-all duration-200
              `}
              style={{ 
                backgroundColor: colorOption.value,
                color: colorOption.value === '#FFFFFF' || colorOption.value === '#F1C40F' || colorOption.value === '#FFD700' ? '#000' : '#FFF'
              }}
              onClick={() => handleColorSelect(colorOption.value)}
              disabled={isLoading}
              title={colorOption.name}
            >
              <div className="font-bold text-xs">{colorOption.name}</div>
              {selectedColor === colorOption.value && (
                <div className="text-xs">✓</div>
              )}
            </Button>
          ))}
        </div>
        
        <div className="mt-4 p-3 bg-gray-800 rounded-lg">
          <div className="text-sm text-gray-300 mb-2">لون مخصص:</div>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
              className="w-12 h-8 rounded border border-gray-600"
            />
            <Button
              size="sm"
              onClick={() => handleColorSelect(selectedColor)}
              disabled={isLoading}
              className="glass-effect"
            >
              {isLoading ? 'جاري التحديث...' : 'تطبيق'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
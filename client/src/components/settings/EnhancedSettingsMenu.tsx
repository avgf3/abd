/**
 * قائمة إعدادات محسنة ومطورة مع إدارة أفضل للأخطاء والحالة
 */

import React, { useState, useEffect } from 'react';
import { User, Home, Moon, Shield, LogOut, Settings, Palette, Brush, Download, Upload, RotateCcw, Info } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { settingsManager, getSettings } from '@/utils/settingsManager';
import { getFinalUsernameColor, getUserListItemStyles } from '@/utils/themeUtils';

interface EnhancedSettingsMenuProps {
  onOpenProfile: () => void;
  onLogout: () => void;
  onClose: () => void;
  onOpenReports?: () => void;
  onOpenThemeSelector?: () => void;
  onOpenUsernameColorPicker?: () => void;
  onOpenIgnoredUsers?: () => void;
  currentUser?: any;
  className?: string;
}

export default function EnhancedSettingsMenu({
  onOpenProfile,
  onLogout,
  onClose,
  onOpenReports,
  onOpenThemeSelector,
  onOpenUsernameColorPicker,
  onOpenIgnoredUsers,
  currentUser,
  className = '',
}: EnhancedSettingsMenuProps) {
  const [settings, setSettings] = useState(getSettings());
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  // تحديث الإعدادات عند تغيير settingsManager
  useEffect(() => {
    const updateSettings = () => {
      setSettings(getSettings());
    };

    // تحديث فوري
    updateSettings();

    // يمكن إضافة مستمع للأحداث هنا إذا كان متاحاً في settingsManager
    const interval = setInterval(updateSettings, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    if (confirm('🤔 هل أنت متأكد من تسجيل الخروج؟')) {
      onLogout();
    }
  };

  const handleExportSettings = async () => {
    setIsExporting(true);
    try {
      const settingsJson = settingsManager.exportSettings();
      
      // إنشاء ملف للتحميل
      const blob = new Blob([settingsJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: '✅ تم التصدير',
        description: 'تم تصدير الإعدادات بنجاح',
      });
    } catch (error) {
      console.error('خطأ في تصدير الإعدادات:', error);
      toast({
        title: '❌ خطأ في التصدير',
        description: 'فشل في تصدير الإعدادات',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportSettings = async () => {
    setIsImporting(true);
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const text = await file.text();
        const success = settingsManager.importSettings(text);
        
        if (success) {
          setSettings(getSettings());
          toast({
            title: '✅ تم الاستيراد',
            description: 'تم استيراد الإعدادات بنجاح',
          });
        } else {
          toast({
            title: '❌ خطأ في الاستيراد',
            description: 'فشل في استيراد الإعدادات - تحقق من صحة الملف',
            variant: 'destructive',
          });
        }
      };

      input.click();
    } catch (error) {
      console.error('خطأ في استيراد الإعدادات:', error);
      toast({
        title: '❌ خطأ في الاستيراد',
        description: 'فشل في استيراد الإعدادات',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleResetSettings = () => {
    if (confirm('🚨 هل أنت متأكد من إعادة تعيين جميع الإعدادات؟ سيتم فقدان جميع التخصيصات الحالية.')) {
      const success = settingsManager.resetSettings();
      if (success) {
        setSettings(getSettings());
        toast({
          title: '✅ تم إعادة التعيين',
          description: 'تم إعادة تعيين جميع الإعدادات للقيم الافتراضية',
        });
      } else {
        toast({
          title: '❌ خطأ في إعادة التعيين',
          description: 'فشل في إعادة تعيين الإعدادات',
          variant: 'destructive',
        });
      }
    }
  };

  return (
    <Card className={`fixed top-20 right-4 z-50 shadow-2xl animate-fade-in w-72 bg-card/95 backdrop-blur-md border-accent ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="w-5 h-5 text-primary" />
          الإعدادات
          <Badge variant="outline" className="text-xs">
            v2.0
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* معلومات المستخدم */}
        {currentUser && (
          <div className="p-3 border-b border-border" style={getUserListItemStyles(currentUser)}>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" style={{ color: getFinalUsernameColor(currentUser) }} />
              <span className="font-semibold" style={{ color: getFinalUsernameColor(currentUser) }}>
                {currentUser.username}
              </span>
              <Badge variant="secondary" className="text-xs">
                {currentUser.userType === 'owner' ? 'مالك' : 
                 currentUser.userType === 'admin' ? 'مشرف' : 'عضو'}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              الجهاز: {settings.deviceId.split('-').pop()}
            </div>
          </div>
        )}

        {/* القسم الأول - الملف الشخصي */}
        <div className="p-3 border-b border-border">
          <Button
            onClick={onOpenProfile}
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3 h-9 hover:bg-accent/50 text-foreground"
          >
            <User className="w-4 h-4 text-primary" />
            الملف الشخصي
          </Button>
        </div>

        {/* القسم الثاني - الإعدادات العامة */}
        <div className="p-3 border-b border-border space-y-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3 h-9 hover:bg-accent/50 text-foreground"
          >
            <Home className="w-4 h-4 text-primary" />
            الغرف
          </Button>

          {currentUser?.userType === 'owner' && (
            <Button
              onClick={onOpenThemeSelector}
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-3 h-9 hover:bg-accent/50 text-foreground"
            >
              <Palette className="w-4 h-4 text-primary" />
              اختيار الثيم
              <Badge variant="outline" className="ml-auto text-xs">
                {settings.theme}
              </Badge>
            </Button>
          )}

          <Button
            onClick={onOpenUsernameColorPicker}
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3 h-9 hover:bg-accent/50 text-foreground"
          >
            <Brush className="w-4 h-4 text-primary" />
            لون الاسم
          </Button>

          <Button
            onClick={onOpenIgnoredUsers}
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3 h-9 hover:bg-accent/50 text-foreground"
          >
            <Shield className="w-4 h-4 text-primary" />
            قائمة المتجاهلين
          </Button>
        </div>

        {/* القسم الثالث - إدارة الإعدادات */}
        <div className="p-3 border-b border-border space-y-1">
          <div className="text-xs text-muted-foreground mb-2 px-1">إدارة الإعدادات</div>
          
          <Button
            onClick={handleExportSettings}
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3 h-9 hover:bg-accent/50 text-foreground"
            disabled={isExporting}
          >
            <Download className="w-4 h-4 text-green-600" />
            تصدير الإعدادات
            {isExporting && <div className="ml-auto w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />}
          </Button>

          <Button
            onClick={handleImportSettings}
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3 h-9 hover:bg-accent/50 text-foreground"
            disabled={isImporting}
          >
            <Upload className="w-4 h-4 text-blue-600" />
            استيراد الإعدادات
            {isImporting && <div className="ml-auto w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />}
          </Button>

          <Button
            onClick={handleResetSettings}
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3 h-9 hover:bg-destructive/10 text-destructive hover:text-destructive"
          >
            <RotateCcw className="w-4 h-4" />
            إعادة تعيين الإعدادات
          </Button>
        </div>

        {/* القسم الرابع - الإدارة (للمشرفين فقط) */}
        {currentUser?.userType === 'owner' && onOpenReports && (
          <div className="p-3 border-b border-border">
            <Button
              onClick={onOpenReports}
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-3 h-9 hover:bg-accent/50 text-foreground"
            >
              <Shield className="w-4 h-4 text-primary" />
              إدارة التبليغات
            </Button>
          </div>
        )}

        {/* معلومات النظام */}
        <div className="p-3 border-b border-border">
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>اللغة:</span>
              <span>{settings.language.toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span>الثيم:</span>
              <span>{settings.theme}</span>
            </div>
            <div className="flex justify-between">
              <span>الإشعارات:</span>
              <span>{settings.notifications ? '✅' : '❌'}</span>
            </div>
          </div>
        </div>

        {/* القسم الأخير - تسجيل الخروج */}
        <div className="p-3">
          <Button
            onClick={handleLogout}
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3 h-9 hover:bg-destructive/10 text-destructive hover:text-destructive"
          >
            <LogOut className="w-4 h-4" />
            تسجيل الخروج
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
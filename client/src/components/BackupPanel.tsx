import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface BackupPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BackupPanel({ isOpen, onClose }: BackupPanelProps) {
  const [loading, setLoading] = useState(false);
  const [backupHistory, setBackupHistory] = useState<string[]>([]);
  const { toast } = useToast();

  const createBackup = async (type: 'full' | 'code') => {
    setLoading(true);
    try {
      const endpoint = type === 'full' ? '/api/backup/create' : '/api/backup/create-code';
      const response = await apiRequest(endpoint);
      
      if (response.success) {
        toast({
          title: "تم إنشاء النسخة الاحتياطية",
          description: `تم إنشاء نسخة احتياطية ${type === 'full' ? 'كاملة' : 'للكود فقط'} بنجاح`,
        });
        
        // تحميل الملف تلقائياً
        const link = document.createElement('a');
        link.href = response.downloadUrl;
        link.download = response.backupPath.split('/').pop() || 'backup.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // تحديث قائمة النسخ الاحتياطية
        loadBackupHistory();
      }
    } catch (error) {
      toast({
        title: "خطأ في إنشاء النسخة الاحتياطية",
        description: "حدث خطأ أثناء إنشاء النسخة الاحتياطية",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadBackupHistory = async () => {
    try {
      const response = await apiRequest('/api/backup/list');
      setBackupHistory(response.backups || []);
    } catch (error) {
      console.error('خطأ في تحميل قائمة النسخ الاحتياطية:', error);
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      loadBackupHistory();
    }
  }, [isOpen]);

  const downloadBackup = (filename: string) => {
    const link = document.createElement('a');
    link.href = `/api/backup/download/${filename}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 text-white border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center mb-4">
            💾 نظام النسخ الاحتياطي
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* إنشاء نسخة احتياطية جديدة */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4 text-green-400">إنشاء نسخة احتياطية جديدة</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-blue-400">نسخة احتياطية كاملة</h4>
                <p className="text-sm text-gray-300">تشمل جميع الملفات والمجلدات</p>
                <Button
                  onClick={() => createBackup('full')}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? '🔄 جاري الإنشاء...' : '📦 إنشاء نسخة كاملة'}
                </Button>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-purple-400">نسخة الكود فقط</h4>
                <p className="text-sm text-gray-300">تشمل ملفات الكود الأساسية فقط</p>
                <Button
                  onClick={() => createBackup('code')}
                  disabled={loading}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {loading ? '🔄 جاري الإنشاء...' : '💻 إنشاء نسخة الكود'}
                </Button>
              </div>
            </div>
          </div>

          {/* قائمة النسخ الاحتياطية */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4 text-yellow-400">النسخ الاحتياطية المتاحة</h3>
            {backupHistory.length > 0 ? (
              <div className="space-y-2">
                {backupHistory.map((backup, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">
                        {backup.includes('code') ? '💻' : '📦'}
                      </span>
                      <div>
                        <p className="font-medium">{backup}</p>
                        <p className="text-sm text-gray-400">
                          {backup.includes('code') ? 'نسخة الكود فقط' : 'نسخة احتياطية كاملة'}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => downloadBackup(backup)}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      ⬇️ تحميل
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-4">لا توجد نسخ احتياطية حالياً</p>
            )}
          </div>

          {/* معلومات إضافية */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-cyan-400">📋 معلومات مهمة</h3>
            <div className="space-y-2 text-sm text-gray-300">
              <p>• <strong>النسخة الكاملة:</strong> تشمل جميع ملفات المشروع وإعدادات التكوين</p>
              <p>• <strong>نسخة الكود:</strong> تشمل ملفات الكود الأساسية فقط (أسرع وأصغر حجماً)</p>
              <p>• <strong>التنسيق:</strong> جميع النسخ الاحتياطية بتنسيق ZIP مضغوط</p>
              <p>• <strong>الحفظ:</strong> يتم حفظ النسخ تلقائياً على جهازك</p>
              <p>• <strong>الاستعادة:</strong> فك الضغط ورفع الملفات لاستعادة المشروع</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose} variant="outline" className="border-gray-600">
            إغلاق
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
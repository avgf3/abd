import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface ProfileEditDialogProps {
  type: string;
  value: string;
  onChange: (value: string) => void;
  onSave: (type: string, value: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const fieldTitles: Record<string, string> = {
  displayName: 'الاسم المعروض',
  bio: 'النبذة الشخصية',
};

export function ProfileEditDialog({
  type,
  value,
  onChange,
  onSave,
  onCancel,
  isLoading,
}: ProfileEditDialogProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(type, value);
  };

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>تعديل {fieldTitles[type] || type}</DialogTitle>
            <DialogDescription>
              قم بتعديل {fieldTitles[type] || type} الخاص بك
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor={type}>
                {fieldTitles[type] || type}
              </Label>
              {type === 'bio' ? (
                <Textarea
                  id={type}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder={`أدخل ${fieldTitles[type] || type}`}
                  maxLength={500}
                  rows={4}
                  disabled={isLoading}
                />
              ) : (
                <Input
                  id={type}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder={`أدخل ${fieldTitles[type] || type}`}
                  maxLength={50}
                  disabled={isLoading}
                />
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={isLoading}>
              حفظ التغييرات
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
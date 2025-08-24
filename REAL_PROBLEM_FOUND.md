# المشكلة الحقيقية في تبويب إدارة المالك

## 🎯 المشكلة المكتشفة
**AlertDialog لإزالة المشرف لا يُغلق تلقائياً بعد تنفيذ العملية!**

## 📋 التفاصيل
عند النقر على "تأكيد الإزالة" في AlertDialog:
1. يتم تنفيذ `handleDemoteUser` بنجاح
2. المشرف يُزال من قاعدة البيانات
3. القائمة تُحدث
4. **لكن** AlertDialog يبقى مفتوحاً! ❌

## 🐛 السبب
AlertDialog الحالي لا يحتوي على:
- متغير حالة للتحكم في فتح/إغلاق النافذة
- خاصية `open` 
- خاصية `onOpenChange`

## ✅ الحل المطلوب
إضافة إدارة حالة لـ AlertDialog:

```tsx
// 1. إضافة state
const [demoteDialogOpen, setDemoteDialogOpen] = useState<number | null>(null);

// 2. تعديل AlertDialog
<AlertDialog 
  open={demoteDialogOpen === staff.id}
  onOpenChange={(open) => {
    if (!open) setDemoteDialogOpen(null);
  }}
>
  <AlertDialogTrigger asChild>
    <Button onClick={() => setDemoteDialogOpen(staff.id)}>
      إزالة الإشراف
    </Button>
  </AlertDialogTrigger>
  
  <AlertDialogAction
    onClick={async () => {
      await handleDemoteUser(staff);
      setDemoteDialogOpen(null); // إغلاق النافذة
    }}
  >
    تأكيد الإزالة
  </AlertDialogAction>
</AlertDialog>
```

## 🎉 النتيجة المتوقعة
- AlertDialog سيُغلق فور نجاح العملية
- تجربة مستخدم سلسة وطبيعية
- لا مزيد من "السلوك الغريب"
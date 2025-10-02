import { getLevelInfo } from '../../shared/points-system';

export type RoomEventAction = 'join' | 'leave' | 'switch' | 'site_leave';

function getArabicRole(userType?: string): string {
  switch ((userType || '').toLowerCase()) {
    case 'bot':
      // عومل كبقية الأعضاء في رسائل النظام
      return 'عضو';
    case 'guest':
      return 'زائر';
    case 'member':
      return 'عضو';
    case 'moderator':
      return 'moderator';
    case 'admin':
      return 'admin';
    case 'owner':
      return 'owner';
    default:
      return userType || 'عضو';
  }
}

/**
 * إنشاء نص رسالة نظام عربية موحّدة لأحداث الغرفة
 */
export function formatRoomEventMessage(
  action: RoomEventAction,
  user: { username?: string; userType?: string; level?: number },
  extra?: { fromRoomName?: string | null; toRoomName?: string | null }
): string {
  const username = user?.username || 'مستخدم';
  // تطبيع نوع المستخدم: اعتبر "bot" كـ "member" لعرضه كعضو عادي
  const rawType = (user?.userType || '').toLowerCase();
  const normalizedType = rawType === 'bot' ? 'member' : rawType;
  const roleAr = getArabicRole(normalizedType);
  const levelNum = typeof user?.level === 'number' && user.level ? user.level : undefined;
  const levelTitle = levelNum ? getLevelInfo(levelNum)?.title : undefined;

  // بناء الميتاداتا داخل القوسين - مبسط
  // زائر => "# زائر #" (بدون تغيير)
  // عضو => "# عضو رتبة {level} #" (فقط الرتبة)
  // إداري/مالك/مشرف => "# {roleAr} #" (فقط الدور)
  const meta = (() => {
    if (normalizedType === 'guest') {
      return `# ${roleAr} #`;
    }
    if (normalizedType === 'member') {
      if (levelNum) {
        return `# ${roleAr} رتبة ${levelNum} #`;
      }
      return `# ${roleAr} #`;
    }
    // مشرف/إداري/مالك - فقط اسم الدور
    return `# ${roleAr} #`;
  })();

  if (action === 'join') {
    return `انضم للغرفة (${meta})`;
  }
  if (action === 'leave') {
    return `غادر الغرفة (${meta})`;
  }
  if (action === 'site_leave') {
    return `المستخدم غادر الموقع (${meta})`;
  }
  // switch
  const fromName = extra?.fromRoomName || 'غرفة سابقة';
  const toName = extra?.toRoomName || 'غرفة جديدة';
  return `انتقل من ${fromName} إلى ${toName} (${meta})`;
}


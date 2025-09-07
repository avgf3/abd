import { getLevelInfo } from '../../shared/points-system';

export type RoomEventAction = 'join' | 'leave' | 'switch';

function getArabicRole(userType?: string): string {
  switch ((userType || '').toLowerCase()) {
    case 'guest':
      return 'زائر';
    case 'member':
      return 'عضو';
    case 'moderator':
      return 'مشرف';
    case 'admin':
      return 'إداري';
    case 'owner':
      return 'مالك';
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
  const roleAr = getArabicRole(user?.userType);
  const levelNum = typeof user?.level === 'number' && user.level ? user.level : undefined;
  const levelTitle = levelNum ? getLevelInfo(levelNum)?.title : undefined;

  // بناء الميتاداتا داخل القوسين
  // زائر => "# زائر #"
  // عضو => "# عضو — لقب: {title} — رتبة {level} #"
  // إداري/مالك/مشرف => "# {roleAr}{levelTitle ? ` — لقب: ${levelTitle}` : ''} #"
  const meta = (() => {
    if ((user?.userType || '').toLowerCase() === 'guest') {
      return `# ${roleAr} #`;
    }
    if ((user?.userType || '').toLowerCase() === 'member') {
      if (levelNum && levelTitle) {
        return `# ${roleAr} — لقب: ${levelTitle} — رتبة ${levelNum} #`;
      }
      return `# ${roleAr} #`;
    }
    // مشرف/إداري/مالك
    return `# ${roleAr}${levelTitle ? ` — لقب: ${levelTitle}` : ''} #`;
  })();

  if (action === 'join') {
    return `انضم للغرفة (${meta})`;
  }
  if (action === 'leave') {
    return `غادر الغرفة (${meta})`;
  }
  // switch
  const fromName = extra?.fromRoomName || 'غرفة سابقة';
  const toName = extra?.toRoomName || 'غرفة جديدة';
  return `انتقل من ${fromName} إلى ${toName} (${meta})`;
}


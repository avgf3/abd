// دوال تنسيق الوقت الموحدة - لتجنب التكرار في المكونات

export function formatTimeAgo(input: string | Date): string {
  const date = input instanceof Date ? input : new Date(input);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return 'الآن';
  if (minutes < 60) return `قبل ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `قبل ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `قبل ${days} يوم`;
}

export function formatTime(date?: Date | string | number): string {
  if (date == null) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString('ar-SA');
}

export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// "26/09 03:22 PM" style like screenshot
export function formatTimeWithDate(date?: Date | string | number): string {
  if (date == null) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${day}/${month} ${time}`;
}

export function formatCountdownTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function getStatusColor(status?: string): string {
  switch (status) {
    case 'online':
      return 'bg-green-500';
    case 'away':
      return 'bg-yellow-500';
    case 'offline':
      return 'bg-gray-400';
    default:
      return 'bg-gray-400';
  }
}

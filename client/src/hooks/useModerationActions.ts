import { apiRequest } from '@/lib/queryClient';

interface ModerationParams {
  moderatorId: number;
  targetUserId: number;
  reason: string;
}

export function useModerationActions() {
  const getOrCreateDeviceId = (): string => {
    try {
      const existing = localStorage.getItem('deviceId');
      if (existing) return existing;
      const id = 'web-' + Math.random().toString(36).slice(2);
      localStorage.setItem('deviceId', id);
      return id;
    } catch {
      return 'unknown';
    }
  };

  const muteUser = async (params: ModerationParams & { duration: number }) => {
    const { moderatorId, targetUserId, reason, duration } = params;
    await apiRequest('/api/moderation/mute', {
      method: 'POST',
      body: { moderatorId, targetUserId, reason, duration },
    });
  };

  const kickUser = async (params: ModerationParams & { duration: number }) => {
    const { moderatorId, targetUserId, reason, duration } = params;
    await apiRequest('/api/moderation/ban', {
      method: 'POST',
      body: { moderatorId, targetUserId, reason, duration },
    });
  };

  const blockUser = async (params: ModerationParams) => {
    const { moderatorId, targetUserId, reason } = params;
    const deviceId = getOrCreateDeviceId();
    await apiRequest('/api/moderation/block', {
      method: 'POST',
      headers: { 'x-device-id': deviceId },
      body: { moderatorId, targetUserId, reason, deviceId },
    });
  };

  return { muteUser, kickUser, blockUser, getOrCreateDeviceId };
}


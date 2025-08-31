import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest } from '@/lib/queryClient';

export interface StoryItem {
  id: number;
  userId: number;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  durationSec: number;
  expiresAt: string;
  createdAt?: string;
}

interface UseStoriesOptions {
  autoRefresh?: boolean;
  refreshIntervalMs?: number;
}

export function useStories(options: UseStoriesOptions = {}) {
  const { autoRefresh = true, refreshIntervalMs = 15000 } = options;

  const [feed, setFeed] = useState<StoryItem[]>([]);
  const [myStories, setMyStories] = useState<StoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const fetchFeed = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiRequest<{ success: boolean; stories: StoryItem[] }>('/api/stories/feed');
      setFeed(res.stories || []);
    } catch (e: any) {
      setError(e?.message || 'فشل في جلب الحالات');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMine = useCallback(async () => {
    try {
      const res = await apiRequest<{ success: boolean; stories: StoryItem[] }>('/api/stories/my');
      setMyStories(res.stories || []);
    } catch {
      // ignore
    }
  }, []);

  const markViewed = useCallback(async (storyId: number) => {
    try {
      await apiRequest(`/api/stories/${storyId}/view`, { method: 'POST' });
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchFeed();
    fetchMine();
  }, [fetchFeed, fetchMine]);

  useEffect(() => {
    if (!autoRefresh) return;
    timerRef.current = window.setInterval(() => {
      fetchFeed();
    }, Math.max(5000, refreshIntervalMs));
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [autoRefresh, refreshIntervalMs, fetchFeed]);

  return {
    feed,
    myStories,
    loading,
    error,
    fetchFeed,
    fetchMine,
    markViewed,
  } as const;
}


import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Heart, ThumbsUp, ThumbsDown, Send } from 'lucide-react';
import { useStories, StoryItem } from '@/hooks/useStories';
import { apiRequest } from '@/lib/queryClient';

interface StoryViewerProps {
  initialUserId?: number;
  onClose: () => void;
}

export default function StoryViewer({ initialUserId, onClose }: StoryViewerProps) {
  const { feed, markViewed, fetchFeed, react: reactToStory } = useStories({ autoRefresh: false });
  const [activeIndex, setActiveIndex] = useState(0);
  const progressRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const stories = useMemo(() => {
    if (initialUserId) {
      const userStories = feed.filter((s) => s.userId === initialUserId);
      if (userStories.length > 0) return userStories;
    }
    return feed;
  }, [feed, initialUserId]);

  const active = stories[activeIndex];

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  useEffect(() => {
    if (!active) return;
    progressRef.current = 0;
    markViewed(active.id);
    const duration = Math.max(3, Math.min(30, active.durationSec || (active.mediaType === 'image' ? 7 : 30)));
    const start = Date.now();
    const tick = () => {
      const elapsed = (Date.now() - start) / 1000;
      progressRef.current = Math.min(1, elapsed / duration);
      if (progressRef.current >= 1) {
        setActiveIndex((i) => (i + 1 < stories.length ? i + 1 : 0));
        return;
      }
      timerRef.current = window.setTimeout(tick, 50);
    };
    tick();
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [active?.id]);

  if (!active) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={onClose}>
        <div className="text-white">لا توجد حالات</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50" onClick={onClose}>
      <div className="absolute top-4 right-4">
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="text-white/90 hover:text-white"
          aria-label="إغلاق"
        >
          <X size={28} />
        </button>
      </div>

      <div className="w-full max-w-[520px] aspect-[9/16] max-h-[75vh] bg-black relative overflow-hidden rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="absolute top-0 left-0 h-1 bg-white/20 w-full">
          <div
            className="h-full bg-white"
            style={{ width: `${Math.round((progressRef.current || 0) * 100)}%`, transition: 'width 50ms linear' }}
          />
        </div>

        {active.mediaType === 'video' ? (
          <video
            src={active.mediaUrl}
            className="w-full h-full object-contain bg-black"
            autoPlay
            muted
            playsInline
            controls={false}
            onLoadedMetadata={(e) => {
              const vid = e.currentTarget;
              if (vid && vid.duration && isFinite(vid.duration)) {
                // If actual duration shorter, speed progress accordingly
              }
            }}
          />
        ) : (
          <img src={active.mediaUrl} alt="story" className="w-full h-full object-cover" />
        )}

        {/* Reactions + Reply */}
        <div className="absolute inset-x-0 bottom-0 p-3">
          <div className="flex items-end gap-3">
            {/* Vertical reactions on the left */}
            <div className="flex flex-col gap-2">
              <button
                className={`rounded-full px-3 py-2 text-sm transition ${active.myReaction === 'like' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  reactToStory(active.id, active.myReaction === 'like' ? null : 'like');
                }}
              >
                <span className="inline-flex items-center gap-1"><ThumbsUp size={16} /> لايك</span>
              </button>
              <button
                className={`rounded-full px-3 py-2 text-sm transition ${active.myReaction === 'heart' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  reactToStory(active.id, active.myReaction === 'heart' ? null : 'heart');
                }}
              >
                <span className="inline-flex items-center gap-1"><Heart size={16} /> قلب</span>
              </button>
              <button
                className={`rounded-full px-3 py-2 text-sm transition ${active.myReaction === 'dislike' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  reactToStory(active.id, active.myReaction === 'dislike' ? null : 'dislike');
                }}
              >
                <span className="inline-flex items-center gap-1"><ThumbsDown size={16} /> ديسلايك</span>
              </button>
            </div>

            {/* Reply input like WhatsApp */}
            <form
              className="flex-1 flex items-center gap-2 bg-white/10 rounded-full px-3 py-2"
              onSubmit={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const text = replyText.trim();
                if (!text) return;
                if (isSending) return;
                try {
                  setIsSending(true);
                  await apiRequest('/api/private-messages/send', {
                    method: 'POST',
                    body: { receiverId: active.userId, content: text, messageType: 'text' },
                  });
                  setReplyText('');
                } catch (err) {
                  // silent
                } finally {
                  setIsSending(false);
                }
              }}
            >
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="اكتب ردك على الحالة..."
                className="flex-1 bg-transparent outline-none text-white placeholder-white/60 text-sm"
              />
              <button
                type="submit"
                disabled={isSending || !replyText.trim()}
                className="disabled:opacity-50 text-white hover:text-white/90"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>

        {active.caption && (
          <div className="absolute bottom-24 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent text-white text-sm">
            {active.caption}
          </div>
        )}
      </div>
    </div>
  );
}


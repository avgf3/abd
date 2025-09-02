import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
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
  const containerRef = useRef<HTMLDivElement | null>(null);

  const stories = useMemo(() => {
    if (initialUserId) {
      const userStories = feed.filter((s) => s.userId === initialUserId);
      return userStories; // نرجع القائمة حتى لو كانت فارغة
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

  // التنقل يمين/يسار مثل واتساب
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!stories.length) return;
      if (e.key === 'ArrowRight') {
        setActiveIndex((i) => (i + 1 < stories.length ? i + 1 : 0));
      } else if (e.key === 'ArrowLeft') {
        setActiveIndex((i) => (i - 1 >= 0 ? i - 1 : stories.length - 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stories.length]);

  if (!active) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={onClose}>
        <div className="text-center">
          <div className="text-white text-lg mb-2">
            {initialUserId ? 'لا توجد حالات لهذا المستخدم' : 'لا توجد حالات متاحة'}
          </div>
          <button 
            onClick={onClose}
            className="text-white/70 hover:text-white text-sm underline"
          >
            اضغط للإغلاق
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[13000]" onClick={onClose}>
      <div className="absolute top-4 right-4">
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="text-white/90 hover:text-white"
          aria-label="إغلاق"
        >
          <X size={28} />
        </button>
      </div>

      <div ref={containerRef} className="w-full max-w-[520px] aspect-[9/16] max-h-[75vh] bg-black relative overflow-hidden rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* شريط تقدم مجزأ */}
        <div className="absolute top-0 left-0 right-0 p-2 flex gap-1">
          {stories.map((_, idx) => (
            <div key={idx} className="flex-1 h-1 bg-white/20 overflow-hidden rounded">
              <div
                className="h-full bg-white"
                style={{
                  width:
                    idx < activeIndex
                      ? '100%'
                      : idx === activeIndex
                      ? `${Math.round((progressRef.current || 0) * 100)}%`
                      : '0%'
                }}
              />
            </div>
          ))}
        </div>

        <motion.div layoutId={`story-${active.id}`} className="absolute inset-0">
          {active.mediaType === 'video' ? (
            <video
              src={active.mediaUrl}
              className="w-full h-full object-contain bg-black"
              autoPlay
              muted
              playsInline
              controls={false}
              title="فيديو القصة"
            >
              <track kind="captions" src="data:text/vtt,WEBVTT" srcLang="ar" label="ترجمة" default />
            </video>
          ) : (
            <img src={active.mediaUrl} alt="story" className="w-full h-full object-cover" />
          )}
        </motion.div>

        {/* Reactions + Reply (separated bar with persistent background) */}
        <div className="absolute inset-x-0 bottom-2 px-3">
          <div className="mx-0 bg-black/45 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl p-2">
            <div className="flex items-center gap-2">
              {/* Reply input */}
              <form
                className="flex-1 flex items-center gap-2 bg-white/5 rounded-full px-3 py-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const text = replyText.trim();
                  if (!text) return;
                  if (isSending) return;
                  try {
                    setIsSending(true);
                    await apiRequest(`/api/stories/${active.id}/reply`, {
                      method: 'POST',
                      body: { content: text },
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
                  className="flex-1 bg-transparent outline-none text-white placeholder-white/70 text-sm"
                />
                <button
                  type="submit"
                  disabled={isSending || !replyText.trim()}
                  className="disabled:opacity-50 text-white hover:text-white/90"
                  title="إرسال الرد"
                >
                  <Send size={18} />
                </button>
              </form>

              {/* Reactions beside the input */}
              <div className="flex items-center gap-1">
                <button
                  className={`w-9 h-9 rounded-full grid place-items-center transition border ${active.myReaction === 'like' ? 'bg-white text-black border-white/60' : 'bg-white/10 text-white hover:bg-white/20 border-white/20'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    reactToStory(active.id, active.myReaction === 'like' ? null : 'like');
                  }}
                  title="لايك"
                  aria-label="لايك"
                >
                  <ThumbsUp size={16} />
                </button>
                <button
                  className={`w-9 h-9 rounded-full grid place-items-center transition border ${active.myReaction === 'heart' ? 'bg-white text-black border-white/60' : 'bg-white/10 text-white hover:bg-white/20 border-white/20'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    reactToStory(active.id, active.myReaction === 'heart' ? null : 'heart');
                  }}
                  title="قلب"
                  aria-label="قلب"
                >
                  <Heart size={16} />
                </button>
                <button
                  className={`w-9 h-9 rounded-full grid place-items-center transition border ${active.myReaction === 'dislike' ? 'bg-white text-black border-white/60' : 'bg-white/10 text-white hover:bg-white/20 border-white/20'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    reactToStory(active.id, active.myReaction === 'dislike' ? null : 'dislike');
                  }}
                  title="ديسلايك"
                  aria-label="ديسلايك"
                >
                  <ThumbsDown size={16} />
                </button>
              </div>
            </div>
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


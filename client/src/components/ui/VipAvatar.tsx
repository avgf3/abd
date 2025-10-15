/* @jsxRuntime classic */
/* @jsx React.createElement */
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';

interface VipAvatarProps {
  src: string;
  alt?: string;
  size?: number; // pixels
  frame?: number;
  className?: string;
}

export default function VipAvatar({
  src,
  alt = '',
  size = 48,
  frame = 1,
  className = '',
}: VipAvatarProps) {
  // تعطيل الحركة نهائياً (المطلوب نسخة ثابتة)
  const duration = useMemo(() => '0s', []);

  // الصورة تحتفظ بحجمها الأصلي المطلوب
  const imageSize = size;
  // الإطار (الحاوية) يتكيف ليكون أكبر من الصورة بنسبة كافية لاستيعاب الإطار بالكامل
  const frameSize = imageSize * 1.35; // الإطار أكبر بـ 35% لضمان احتواء الإطار بالكامل داخل الحاوية

  // إلغاء أي تكبير إضافي في جميع السياقات لتوحيد القياس عبر كل الواجهات
  const overlayScale = useMemo(() => 1, []);

  const containerStyle: React.CSSProperties & { ['--vip-spin-duration']?: string } = {
    width: frameSize,
    height: frameSize,
    contain: 'layout paint style',
    isolation: 'isolate',
    backfaceVisibility: 'hidden',
    transform: 'translateZ(0)',
    // تمرير مدة الدوران عبر متغير CSS
    ['--vip-spin-duration']: duration,
  };

  const imgStyle: React.CSSProperties = {
    width: imageSize,
    height: imageSize,
    willChange: 'transform',
    backfaceVisibility: 'hidden',
    transform: 'translateZ(0)',
  };

  // Normalize frame number and prepare overlay source with extension fallback (.webp -> .png -> .jpg -> .jpeg)
  const hasValidFrame = Number.isFinite(frame as number) && (frame as number) > 0;
  const normalizedFrame = hasValidFrame
    ? Math.max(1, Math.min(50, Math.floor(frame as number)))
    : undefined;

  const overlayBase = normalizedFrame ? `/frames/frame${normalizedFrame}` : undefined;
  const [overlaySrc, setOverlaySrc] = useState<string | undefined>(
    overlayBase ? `${overlayBase}.webp` : undefined
  );
  const [fallbackStep, setFallbackStep] = useState<number>(0);

  useEffect(() => {
    setOverlaySrc(overlayBase ? `${overlayBase}.webp` : undefined);
    setFallbackStep(0);
  }, [overlayBase]);

  const hasImageOverlay = Boolean(overlaySrc);

  // Refs for GSAP animations (frame10 only)
  const overlayRef = useRef<HTMLImageElement | null>(null);
  const shineRef = useRef<HTMLDivElement | null>(null);

  // Animate frame10 with subtle float and a shine sweep
  useEffect(() => {
    if (normalizedFrame !== 10) return;
    const overlayEl = overlayRef.current;
    const shineEl = shineRef.current;
    const tweens: gsap.core.Tween[] = [];

    if (overlayEl) {
      tweens.push(
        gsap.to(overlayEl, {
          y: 1.2,
          rotation: 0.25,
          duration: 1.8,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        })
      );
    }

    if (shineEl) {
      gsap.set(shineEl, { x: '-140%', rotate: 20, opacity: 0.0 });
      tweens.push(
        gsap.to(shineEl, {
          x: '140%',
          opacity: 0.45,
          duration: 1.2,
          ease: 'power2.out',
          repeat: -1,
          repeatDelay: 1.6,
          yoyo: false,
          onRepeat: () => gsap.set(shineEl, { x: '-140%', opacity: 0.0 }),
        })
      );
    }

    return () => {
      tweens.forEach((t) => t.kill());
    };
  }, [normalizedFrame, overlaySrc]);

  // Animate frame13 with wing flapping motion (vertical stretching)
  useEffect(() => {
    if (normalizedFrame !== 13) return;
    const overlayEl = overlayRef.current;
    const tweens: gsap.core.Tween[] = [];

    if (overlayEl) {
      // حركة رفرفة الأجنحة - تمدد طولي (عمودي)
      tweens.push(
        gsap.to(overlayEl, {
          scaleY: 1.08, // تمدد عمودي خفيف
          scaleX: 0.98, // انكماش أفقي طفيف لمحاكاة الرفرفة
          duration: 0.6,
          ease: 'power2.inOut',
          yoyo: true,
          repeat: -1,
        })
      );

      // حركة إضافية للوميض الخفيف
      tweens.push(
        gsap.to(overlayEl, {
          opacity: 0.85,
          duration: 1.2,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        })
      );
    }

    return () => {
      tweens.forEach((t) => t.kill());
    };
  }, [normalizedFrame, overlaySrc]);

  return (
    <div
      className={`vip-frame base ${hasImageOverlay ? 'with-image' : ''} ${
        normalizedFrame ? `vip-frame-${normalizedFrame}` : ''
      } ${className}`}
      style={containerStyle}
    >
      <div className="vip-frame-inner">
        <img src={src} alt={alt} className="vip-frame-img" style={imgStyle} />
        {overlaySrc && (
          <img
            ref={overlayRef}
            src={overlaySrc}
            alt="frame"
            className="vip-frame-overlay"
            style={{ transform: overlayScale === 1 ? 'scale(1)' : `scale(${overlayScale})` }}
            onError={(e) => {
              try {
                const cur = overlaySrc || '';
                if (fallbackStep === 0 && /\.webp(\?.*)?$/i.test(cur)) {
                  setOverlaySrc(cur.replace(/\.webp(\?.*)?$/i, '.png$1'));
                  setFallbackStep(1);
                  return;
                }
                if (fallbackStep === 1 && /\.png(\?.*)?$/i.test(cur)) {
                  setOverlaySrc(cur.replace(/\.png(\?.*)?$/i, '.jpg$1'));
                  setFallbackStep(2);
                  return;
                }
                if (fallbackStep === 2 && /\.jpg(\?.*)?$/i.test(cur)) {
                  setOverlaySrc(cur.replace(/\.jpg(\?.*)?$/i, '.jpeg$1'));
                  setFallbackStep(3);
                  return;
                }
                // Hide overlay if all fallbacks fail
                (e.currentTarget as HTMLImageElement).style.display = 'none';
                setOverlaySrc(undefined);
              } catch {}
            }}
          />
        )}
        {normalizedFrame === 10 && (
          <div ref={shineRef} className="vip-frame-shine" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}

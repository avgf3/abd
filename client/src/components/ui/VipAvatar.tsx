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

  // مقياس تلقائي لطبقة صورة الإطار بناءً على مساحة المحتوى الفعلية داخل الصورة
  const [overlayScale, setOverlayScale] = useState<number>(1);

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

  // قياس تلقائي لمحتوى صورة الإطار (يحاول تكبير/تصغير الإطار بحيث يغطي المحتوى تقريباً كامل الحاوية)
  const computeAutoOverlayScale = (img: HTMLImageElement | null) => {
    try {
      if (!img || !img.naturalWidth || !img.naturalHeight) {
        setOverlayScale(1);
        return;
      }

      // Canvas مربع يحاكي object-fit: contain داخل حاوية مربعة
      const sampleSize = 128; // عيّنة كافية وخفيفة الأداء
      const canvas = document.createElement('canvas');
      canvas.width = sampleSize;
      canvas.height = sampleSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setOverlayScale(1);
        return;
      }

      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;
      const baseScale = sampleSize / Math.max(naturalWidth, naturalHeight);
      const drawWidth = Math.max(1, Math.round(naturalWidth * baseScale));
      const drawHeight = Math.max(1, Math.round(naturalHeight * baseScale));
      const dx = Math.floor((sampleSize - drawWidth) / 2);
      const dy = Math.floor((sampleSize - drawHeight) / 2);

      // ارسم الصورة بالحجم/الموضع الذي يطابق العرض الفعلي داخل الحاوية المربعة
      ctx.clearRect(0, 0, sampleSize, sampleSize);
      ctx.drawImage(img, dx, dy, drawWidth, drawHeight);

      const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
      const data = imageData.data;

      // ابحث عن صندوق إحاطة البكسلات غير الشفافة (تجاهل التوهجات الضعيفة جداً)
      const alphaThreshold = 24; // 0..255
      let left = sampleSize;
      let right = -1;
      let top = sampleSize;
      let bottom = -1;

      // مسح كامل العينة (128x128 ~ 16k بكسل)
      for (let y = 0; y < sampleSize; y++) {
        const rowOffset = y * sampleSize * 4;
        for (let x = 0; x < sampleSize; x++) {
          const a = data[rowOffset + x * 4 + 3];
          if (a >= alphaThreshold) {
            if (x < left) left = x;
            if (x > right) right = x;
            if (y < top) top = y;
            if (y > bottom) bottom = y;
          }
        }
      }

      if (right < 0 || bottom < 0) {
        // لا محتوى يمكن قياسه (صورة شفافة بالكامل؟) — اترك المقياس 1
        setOverlayScale(1);
        return;
      }

      const contentWidth = Math.max(1, right - left + 1);
      const contentHeight = Math.max(1, bottom - top + 1);
      const widthCoverage = contentWidth / sampleSize; // تغطية المحتوى داخل الحاوية المربعة (0..1)
      const heightCoverage = contentHeight / sampleSize;

      // غطِّ الحاوية تقريباً بالكامل مع هامش أمان بسيط
      const targetCoverage = 0.96; // 96% من البعد
      const scaleForWidth = targetCoverage / widthCoverage;
      const scaleForHeight = targetCoverage / heightCoverage;
      let desiredScale = Math.max(scaleForWidth, scaleForHeight);

      // حدود قصوى/دنيا لتجنب تغييرات مبالغ فيها
      const MIN_SCALE = 0.9;
      const MAX_SCALE = 1.15;
      if (!Number.isFinite(desiredScale)) desiredScale = 1;
      desiredScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, desiredScale));

      // تقريب خفيف لتفادي jitter العشري
      setOverlayScale(parseFloat(desiredScale.toFixed(3)));
    } catch {
      setOverlayScale(1);
    }
  };

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
            onLoad={(e) => computeAutoOverlayScale(e.currentTarget as HTMLImageElement)}
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

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Particle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  delay: number;
}

interface ReactionEffectsProps {
  type: 'heart' | 'like' | 'dislike';
  trigger: number; // timestamp to trigger animation
}

export function ReactionEffects({ type, trigger }: ReactionEffectsProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [showEffect, setShowEffect] = useState(false);

  useEffect(() => {
    if (trigger === 0) return;

    // إنشاء 8-12 جزيئات فقط (خفيف على الأداء)
    const particleCount = type === 'heart' ? 12 : 8;
    const newParticles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      newParticles.push({
        id: Date.now() + i,
        x: (Math.random() - 0.5) * 100, // انتشار أفقي
        y: -50 - Math.random() * 80, // طيران للأعلى
        rotation: Math.random() * 360,
        scale: 0.5 + Math.random() * 0.5,
        delay: i * 0.05, // تأخير تدريجي بسيط
      });
    }

    setParticles(newParticles);
    setShowEffect(true);

    // تنظيف التأثير بعد الانتهاء (1.5 ثانية فقط)
    const timer = setTimeout(() => {
      setShowEffect(false);
      setParticles([]);
    }, 1500);

    return () => clearTimeout(timer);
  }, [trigger, type]);

  if (!showEffect || particles.length === 0) return null;

  const getEmoji = () => {
    switch (type) {
      case 'heart':
        return '❤️';
      case 'like':
        return '👍';
      case 'dislike':
        return '👎';
      default:
        return '❤️';
    }
  };

  const getColors = () => {
    switch (type) {
      case 'heart':
        return ['#FF6B9D', '#C44569', '#FF0080', '#FF1493'];
      case 'like':
        return ['#4CAF50', '#8BC34A', '#00E676', '#69F0AE'];
      case 'dislike':
        return ['#FF5722', '#F44336', '#FF6347', '#E91E63'];
      default:
        return ['#FF6B9D'];
    }
  };

  const emoji = getEmoji();
  const colors = getColors();

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <AnimatePresence>
        {particles.map((particle, index) => (
          <motion.div
            key={particle.id}
            className="absolute text-2xl"
            initial={{
              x: '50%',
              y: '50%',
              scale: 0,
              opacity: 1,
              rotate: 0,
            }}
            animate={{
              x: `calc(50% + ${particle.x}px)`,
              y: `calc(50% + ${particle.y}px)`,
              scale: particle.scale,
              opacity: 0,
              rotate: particle.rotation,
            }}
            transition={{
              duration: 1.2,
              delay: particle.delay,
              ease: [0.22, 1, 0.36, 1], // easeOutCubic - سلس جداً
            }}
            style={{
              filter: `drop-shadow(0 0 4px ${colors[index % colors.length]})`,
            }}
          >
            {emoji}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* تأثير موجة دائرية */}
      {type === 'heart' && (
        <motion.div
          className="absolute inset-0 rounded-full border-4 border-pink-400"
          initial={{ scale: 0, opacity: 0.6 }}
          animate={{ scale: 3, opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      )}

      {/* كونفيتي للايك/ديسلايك */}
      {(type === 'like' || type === 'dislike') && (
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 1 }}
        >
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                backgroundColor: colors[i % colors.length],
                left: '50%',
                top: '50%',
              }}
              initial={{ scale: 0, x: 0, y: 0 }}
              animate={{
                scale: [1, 0],
                x: Math.cos((i * Math.PI * 2) / 6) * 60,
                y: Math.sin((i * Math.PI * 2) / 6) * 60,
              }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
}

// Hook لتشغيل صوت بسيط (اختياري)
export function playReactionSound(type: 'heart' | 'like' | 'dislike') {
  try {
    // استخدام Web Audio API لصوت خفيف جداً
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // ترددات مختلفة لكل نوع
    const frequency = type === 'heart' ? 800 : type === 'like' ? 600 : 400;
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    // صوت خفيف جداً
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch (e) {
    // تجاهل الأخطاء (الصوت اختياري)
  }
}

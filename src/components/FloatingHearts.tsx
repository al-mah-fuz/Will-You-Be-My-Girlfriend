import React, { useMemo } from 'react';
import { motion } from 'motion/react';

interface FloatingHeartItem {
  id: number;
  size: number;
  left: number;
  duration: number;
  delay: number;
  opacity: number;
}

export const FloatingHearts: React.FC = () => {
  const hearts = useMemo<FloatingHeartItem[]>(() => {
    return Array.from({ length: 18 }).map((_, i) => ({
      id: i,
      size: Math.floor(Math.random() * 20) + 12,
      left: Math.floor(Math.random() * 96) + 2,
      duration: Math.floor(Math.random() * 12) + 14,
      delay: Math.random() * 10,
      opacity: Math.random() * 0.35 + 0.15,
    }));
  }, []);

  return (
    <div
      id="floating-hearts-bg"
      className="fixed inset-0 pointer-events-none overflow-hidden z-0"
      aria-hidden="true"
    >
      {hearts.map((heart) => (
        <motion.div
          key={heart.id}
          className="absolute text-rose-300 select-none"
          style={{
            left: `${heart.left}%`,
            bottom: '-40px',
            opacity: heart.opacity,
          }}
          animate={{
            y: ['0vh', '-110vh'],
            x: [0, (heart.id % 2 === 0 ? 30 : -30), 0],
            rotate: [0, heart.id % 2 === 0 ? 45 : -45, 0],
          }}
          transition={{
            duration: heart.duration,
            repeat: Infinity,
            delay: heart.delay,
            ease: 'linear',
          }}
        >
          <svg
            width={heart.size}
            height={heart.size}
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </motion.div>
      ))}
    </div>
  );
};

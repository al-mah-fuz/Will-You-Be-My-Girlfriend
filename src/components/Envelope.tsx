import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Sparkles } from 'lucide-react';

interface EnvelopeProps {
  recipientName: string;
  onOpened: () => void;
}

interface BurstHeart {
  id: number;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export const Envelope: React.FC<EnvelopeProps> = ({ recipientName, onOpened }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [burstHearts, setBurstHearts] = useState<BurstHeart[]>([]);

  const handleOpen = () => {
    if (isOpen) return;
    setIsOpen(true);

    // Create heart burst animation
    const hearts: BurstHeart[] = Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 220,
      y: -(Math.random() * 180 + 60),
      scale: Math.random() * 0.7 + 0.6,
      rotation: (Math.random() - 0.5) * 60,
    }));
    setBurstHearts(hearts);

    // Give time for envelope opening animation + letter slide up before transitioning
    setTimeout(() => {
      onOpened();
    }, 1200);
  };

  return (
    <div id="envelope-interactive-view" className="w-full max-w-lg mx-auto flex flex-col items-center text-center px-4 py-6 sm:py-10">
      {/* Personalized Greeting */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-3"
      >
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-semibold uppercase tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5 text-rose-500" />
          A message just for you
        </div>
        <h1 className="font-romantic text-3xl sm:text-5xl font-bold text-rose-950 tracking-tight">
          Hey {recipientName} <span className="text-rose-500">💗</span>
        </h1>
      </motion.div>

      {/* Instruction */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-sm sm:text-base text-rose-800/80 mb-8 font-medium"
      >
        Tap the envelope 💌
      </motion.p>

      {/* Envelope Container */}
      <div className="relative w-72 sm:w-96 h-52 sm:h-64 cursor-pointer select-none perspective-1000 my-4" onClick={handleOpen}>
        {/* Heart Burst Particles */}
        <AnimatePresence>
          {isOpen &&
            burstHearts.map((h) => (
              <motion.div
                key={h.id}
                initial={{ opacity: 1, x: 0, y: 0, scale: 0.2, rotate: 0 }}
                animate={{
                  opacity: [1, 1, 0],
                  x: h.x,
                  y: h.y,
                  scale: h.scale,
                  rotate: h.rotation,
                }}
                transition={{ duration: 1.1, ease: 'easeOut' }}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none text-rose-400"
              >
                <Heart className="w-6 h-6 fill-rose-500" />
              </motion.div>
            ))}
        </AnimatePresence>

        {/* Letter Peeking / Sliding Out */}
        <motion.div
          id="sliding-letter"
          className="absolute left-4 right-4 bg-gradient-to-b from-[#FFFDF9] to-[#FFF5F7] rounded-t-xl border border-rose-200/90 shadow-letter p-4 z-10 text-left flex flex-col justify-start"
          initial={{ y: 20, height: '80%' }}
          animate={
            isOpen
              ? {
                  y: -90,
                  height: '92%',
                  transition: { duration: 0.8, delay: 0.3, ease: 'easeInOut' },
                }
              : { y: 20, height: '80%' }
          }
        >
          <div className="w-12 h-1 bg-rose-200 rounded-full mb-3" />
          <p className="font-romantic text-rose-900 font-bold text-sm sm:text-base">
            Dear {recipientName},
          </p>
          <div className="space-y-1.5 mt-2">
            <div className="w-11/12 h-2 bg-rose-100 rounded-full" />
            <div className="w-4/5 h-2 bg-rose-100 rounded-full" />
            <div className="w-3/4 h-2 bg-rose-100 rounded-full" />
          </div>
        </motion.div>

        {/* Envelope Back Wall */}
        <div className="absolute inset-0 bg-[#FBCFE8] rounded-2xl border border-rose-300 shadow-pink-soft z-0" />

        {/* Envelope Pocket Body (Bottom and Sides) */}
        <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden rounded-2xl">
          {/* Left fold triangle */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, #F472B6 0%, #FB7185 100%)',
              clipPath: 'polygon(0% 0%, 50% 50%, 0% 100%)',
              opacity: 0.9,
            }}
          />
          {/* Right fold triangle */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(225deg, #F472B6 0%, #FB7185 100%)',
              clipPath: 'polygon(100% 0%, 50% 50%, 100% 100%)',
              opacity: 0.9,
            }}
          />
          {/* Bottom fold triangle */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(0deg, #F43F5E 0%, #FB7185 100%)',
              clipPath: 'polygon(0% 100%, 50% 48%, 100% 100%)',
              boxShadow: '0 -4px 15px rgba(190, 24, 93, 0.15)',
            }}
          />
        </div>

        {/* Envelope Flap (Top Triangle with Wax Seal) */}
        <motion.div
          id="envelope-top-flap"
          className="absolute top-0 left-0 right-0 h-1/2 z-30 origin-top transform-style-3d"
          animate={
            isOpen
              ? {
                  rotateX: 180,
                  zIndex: 5,
                  transition: { duration: 0.6, ease: 'easeInOut' },
                }
              : { rotateX: 0, zIndex: 30 }
          }
        >
          {/* Triangular flap shape */}
          <div
            className="w-full h-full"
            style={{
              background: 'linear-gradient(180deg, #FB7185 0%, #F43F5E 100%)',
              clipPath: 'polygon(0% 0%, 100% 0%, 50% 100%)',
              filter: 'drop-shadow(0 4px 8px rgba(190, 24, 93, 0.2))',
            }}
          />

          {/* Romantic Wax Seal Badge */}
          {!isOpen && (
            <motion.div
              id="wax-seal-badge"
              className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 z-40 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-gradient-to-br from-rose-700 via-rose-600 to-rose-800 border-2 border-rose-300 shadow-pink-glow flex items-center justify-center text-white cursor-pointer hover:scale-110 active:scale-95 transition-transform"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
            >
              <Heart className="w-5 h-5 sm:w-6 sm:h-6 fill-white drop-shadow-sm" />
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Tap prompt reminder */}
      <motion.div
        animate={{ y: [0, 4, 0] }}
        transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
        className="mt-6 flex items-center gap-2 text-xs font-semibold text-rose-600 bg-rose-100/70 border border-rose-200 px-3.5 py-1.5 rounded-full"
      >
        <span>Click or tap to open</span>
        <Heart className="w-3.5 h-3.5 fill-rose-500" />
      </motion.div>
    </div>
  );
};

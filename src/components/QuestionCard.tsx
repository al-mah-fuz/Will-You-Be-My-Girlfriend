import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Heart, Loader2 } from 'lucide-react';
import { PublicInvitation } from '../types';

interface QuestionCardProps {
  invitation: PublicInvitation;
  onAccept: () => void;
  isSubmitting: boolean;
}

const PLAYFUL_NO_PHRASES = [
  'No',
  'Wait, really? 🥺',
  'Are you sure? 👀',
  'Think again! 💭',
  'Wrong button! 😉',
  'Nice try! 🏃‍♀️',
  'Almost! 💖',
  'Reconsidering? 🌸',
  'Not an option! 💕',
];

export const QuestionCard: React.FC<QuestionCardProps> = ({
  invitation,
  onAccept,
  isSubmitting,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const yesButtonRef = useRef<HTMLButtonElement>(null);
  const [noPosition, setNoPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [noPhraseIndex, setNoPhraseIndex] = useState(0);
  const [hasMoved, setHasMoved] = useState(false);

  // Relocate the NO button safely within the play area
  const dodgeNoButton = () => {
    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const padding = 24;
    const buttonWidth = 140;
    const buttonHeight = 52;

    // Available bounds relative to center of container
    const maxRangeX = Math.max(80, (containerRect.width - buttonWidth) / 2 - padding);
    const maxRangeY = Math.max(70, 110); // keep in bounds vertically

    // Pick random spot avoiding center where YES button is
    let newX = (Math.random() - 0.5) * 2 * maxRangeX;
    let newY = (Math.random() - 0.5) * 2 * maxRangeY;

    // Ensure it doesn't land directly on top of YES button (which is at center-left or center)
    if (Math.abs(newX) < 70 && Math.abs(newY) < 50) {
      newX = newX >= 0 ? newX + 80 : newX - 80;
      newY = newY >= 0 ? newY + 60 : newY - 60;
    }

    setNoPosition({ x: newX, y: newY });
    setHasMoved(true);
    setNoPhraseIndex((prev) => (prev + 1) % PLAYFUL_NO_PHRASES.length);
  };

  return (
    <motion.div
      id="question-card-container"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-xl mx-auto px-4 py-6 sm:py-10 text-center"
    >
      <div
        ref={containerRef}
        className="relative bg-white/95 backdrop-blur-md rounded-3xl border border-rose-100 p-6 sm:p-12 shadow-pink-glow min-h-[440px] flex flex-col justify-between overflow-hidden"
      >
        {/* Top heading */}
        <div className="relative z-10">
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
            className="w-16 h-16 rounded-full bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-5 shadow-sm"
          >
            <Heart className="w-8 h-8 fill-rose-500" />
          </motion.div>

          <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-rose-500 mb-2">
            The Big Question
          </p>

          <h1 className="font-romantic text-3xl sm:text-5xl font-bold text-rose-950 tracking-tight leading-tight mb-4">
            Will You Be My Girlfriend? <span className="text-rose-500">💗</span>
          </h1>

          <p className="text-sm sm:text-base text-rose-800/80 max-w-md mx-auto">
            {invitation.creatorName} is asking you to start something special together.
          </p>
        </div>

        {/* Buttons Playground Area */}
        <div className="relative z-20 py-8 flex items-center justify-center gap-6 flex-wrap">
          {/* Stationary YES Button */}
          <motion.button
            ref={yesButtonRef}
            id="question-yes-btn"
            type="button"
            disabled={isSubmitting}
            onClick={onAccept}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.96 }}
            className="px-8 sm:px-12 py-4 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xl sm:text-2xl shadow-pink-glow hover:shadow-xl transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Answering...</span>
              </>
            ) : (
              <>
                <span>YES</span>
                <Heart className="w-6 h-6 fill-white drop-shadow-sm" />
              </>
            )}
          </motion.button>

          {/* Playful Runaway NO Button */}
          <motion.button
            id="question-no-btn"
            type="button"
            onMouseEnter={dodgeNoButton}
            onTouchStart={dodgeNoButton}
            onPointerDown={dodgeNoButton}
            animate={
              hasMoved
                ? {
                    x: noPosition.x,
                    y: noPosition.y,
                  }
                : { x: 0, y: 0 }
            }
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 25,
            }}
            className="px-6 py-3.5 rounded-2xl bg-rose-100 hover:bg-rose-200 border border-rose-300 text-rose-700 font-semibold text-base sm:text-lg shadow-sm cursor-pointer select-none transition-colors"
          >
            {PLAYFUL_NO_PHRASES[noPhraseIndex]}
          </motion.button>
        </div>

        {/* Bottom subtle playful note */}
        <div className="relative z-10 pt-4 border-t border-rose-100 text-xs text-rose-700/60">
          Tip: Some questions only have one right answer 😉
        </div>
      </div>
    </motion.div>
  );
};

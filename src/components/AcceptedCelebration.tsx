import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { Heart, Sparkles, CheckCircle2 } from 'lucide-react';
import { PublicInvitation } from '../types';

interface AcceptedCelebrationProps {
  invitation: PublicInvitation;
  emailStatus?: {
    sent: boolean;
    provider?: string;
    error?: string;
    code?: string;
  };
  emailPreviewUrl?: string;
  onRevisitLetter?: () => void;
}

export const AcceptedCelebration: React.FC<AcceptedCelebrationProps> = ({
  invitation,
  emailStatus,
  emailPreviewUrl,
  onRevisitLetter,
}) => {
  useEffect(() => {
    // Fire festive celebration confetti
    const duration = 3.5 * 1000;
    const animationEnd = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ['#F43F5E', '#FB7185', '#FDA4AF', '#F472B6', '#FCD34D', '#FFF1F2'],
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ['#F43F5E', '#FB7185', '#FDA4AF', '#F472B6', '#FCD34D', '#FFF1F2'],
      });

      if (Date.now() < animationEnd) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }, []);

  const formatRespondedDate = (iso?: string | null) => {
    if (!iso) return 'Just now';
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <motion.div
      id="accepted-celebration-container"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="w-full max-w-xl mx-auto px-4 py-8 sm:py-12 text-center"
    >
      <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-rose-200 p-6 sm:p-12 shadow-pink-glow relative overflow-hidden">
        {/* Glow backdrop behind badge */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-rose-200/40 blur-3xl pointer-events-none" />

        {/* Big Celebration Icon */}
        <motion.div
          animate={{ scale: [1, 1.15, 1], rotate: [0, -3, 3, 0] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
          className="w-20 h-20 rounded-full bg-gradient-to-tr from-rose-500 to-rose-400 text-white flex items-center justify-center mx-auto mb-6 shadow-pink-glow"
        >
          <Heart className="w-10 h-10 fill-white drop-shadow-md" />
        </motion.div>

        {/* Main headline */}
        <h1 className="font-romantic text-3xl sm:text-5xl font-bold text-rose-950 tracking-tight mb-4">
          IT&apos;S A YES! <span className="text-rose-500">💗</span>
        </h1>

        {/* Romantic appreciation message */}
        <p className="text-lg sm:text-xl font-semibold text-rose-800 mb-4">
          You just made {invitation.creatorName}&apos;s heart very happy. 💕
        </p>

        <p className="text-sm sm:text-base text-rose-800/80 max-w-md mx-auto leading-relaxed mb-6">
          Thank you for saying yes. Here&apos;s to something beautiful, exciting, and unforgettable together.
        </p>

        {/* Congratulations Banner */}
        <div className="inline-block py-2 px-6 rounded-2xl bg-rose-100/90 border border-rose-200 text-rose-800 font-romantic text-lg sm:text-xl font-bold mb-8 shadow-sm">
          💕 Congratulations! 💕
        </div>

        {/* Notification confirmation badge */}
        <div className="bg-rose-50/80 border border-rose-100 rounded-2xl p-4 text-xs sm:text-sm text-rose-800 flex items-center justify-center gap-2.5 mb-6 text-left">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <div>
            <p className="font-semibold text-rose-900">
              {emailStatus && !emailStatus.sent
                ? `Answer saved for ${invitation.creatorName} 💕`
                : `Notification sent to ${invitation.creatorName} 💕`}
            </p>
            <p className="text-rose-700/80">
              Answered on {formatRespondedDate(invitation.respondedAt)}
            </p>
          </div>
        </div>

        {/* Test preview email URL if running in test environment */}
        {emailPreviewUrl && (
          <div className="mb-6 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 text-left">
            <span className="font-bold">Test Email Generated: </span>
            <a
              href={emailPreviewUrl}
              target="_blank"
              rel="noreferrer"
              className="text-rose-600 underline font-semibold hover:text-rose-800 break-all"
            >
              Open Ethereal Test Email Preview ↗
            </a>
          </div>
        )}

        {/* Secondary action */}
        {onRevisitLetter && (
          <button
            type="button"
            onClick={onRevisitLetter}
            className="text-xs sm:text-sm font-semibold text-rose-600 hover:text-rose-800 cursor-pointer transition-colors"
          >
            ← Re-read {invitation.creatorName}&apos;s letter
          </button>
        )}
      </div>
    </motion.div>
  );
};

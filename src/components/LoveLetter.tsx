import React from 'react';
import { motion } from 'motion/react';
import { Heart, ArrowRight } from 'lucide-react';
import { PublicInvitation } from '../types';

interface LoveLetterProps {
  invitation: PublicInvitation;
  onNext: () => void;
}

const DEFAULT_ROMANTIC_MESSAGE =
  "There's something I've been wanting to ask you. I really enjoy having you in my life, and I'd love the chance to make something special out of it. So, I have one little question for you... 💗";

export const LoveLetter: React.FC<LoveLetterProps> = ({ invitation, onNext }) => {
  const displayMessage = invitation.personalMessage?.trim() || DEFAULT_ROMANTIC_MESSAGE;

  return (
    <motion.div
      id="love-letter-container"
      initial={{ opacity: 0, scale: 0.94, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94, y: -20 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="w-full max-w-xl mx-auto px-4 py-6 sm:py-10"
    >
      <div className="relative bg-[#FFFDFB] border-2 border-rose-200 rounded-3xl p-6 sm:p-12 shadow-letter overflow-hidden">
        {/* Decorative corner flourishes */}
        <div className="absolute top-4 left-4 text-rose-200 pointer-events-none">
          <Heart className="w-5 h-5 fill-rose-100" />
        </div>
        <div className="absolute top-4 right-4 text-rose-200 pointer-events-none">
          <Heart className="w-5 h-5 fill-rose-100" />
        </div>
        <div className="absolute bottom-4 left-4 text-rose-200 pointer-events-none">
          <Heart className="w-5 h-5 fill-rose-100" />
        </div>
        <div className="absolute bottom-4 right-4 text-rose-200 pointer-events-none">
          <Heart className="w-5 h-5 fill-rose-100" />
        </div>

        {/* Romantic Letter Content */}
        <div className="relative z-10">
          <div className="text-center mb-6">
            <span className="inline-block px-3 py-1 rounded-full bg-rose-50 text-rose-600 text-xs font-semibold tracking-wider uppercase border border-rose-100">
              A Letter For You
            </span>
          </div>

          <h2 className="font-romantic text-2xl sm:text-3xl font-bold text-rose-950 mb-6 tracking-tight">
            Dear {invitation.recipientName},
          </h2>

          <div className="my-6 space-y-4">
            <p className="font-serif-romantic text-rose-900/90 text-lg sm:text-xl leading-relaxed whitespace-pre-wrap font-normal italic">
              &ldquo;{displayMessage}&rdquo;
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-rose-100">
            <p className="font-romantic text-base sm:text-lg font-semibold text-rose-800 mb-2">
              Will you go on this journey with me? 💕
            </p>
            <p className="text-sm font-medium text-rose-600">
              — With love, {invitation.creatorName}
            </p>
          </div>

          {/* Next Button */}
          <div className="mt-10 flex justify-end">
            <button
              id="letter-next-button"
              type="button"
              onClick={onNext}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-semibold text-base shadow-pink-glow transition-all flex items-center justify-center gap-2 cursor-pointer group"
            >
              <span>Next</span>
              <ArrowRight className="w-4 h-4 text-rose-200 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

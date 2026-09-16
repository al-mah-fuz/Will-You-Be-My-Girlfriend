import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Check, Copy, Share2, ExternalLink, Heart, PlusCircle } from 'lucide-react';
import { PublicInvitation } from '../types';

interface SuccessPageProps {
  invitation: PublicInvitation;
  shareUrl: string;
  onPreview: (id: string) => void;
  onCreateAnother: () => void;
}

export const SuccessPage: React.FC<SuccessPageProps> = ({
  invitation,
  shareUrl,
  onPreview,
  onCreateAnother,
}) => {
  const [copied, setCopied] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = shareUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Will You Be My Girlfriend? 💗',
          text: `Hey ${invitation.recipientName}, someone sent you a special surprise!`,
          url: shareUrl,
        });
        setShareFeedback('Shared successfully! 💕');
        setTimeout(() => setShareFeedback(null), 3000);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          handleCopy();
        }
      }
    } else {
      handleCopy();
    }
  };

  return (
    <motion.div
      id="invitation-success-container"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-xl mx-auto px-4 py-8 sm:py-12"
    >
      <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-rose-100 p-6 sm:p-10 shadow-pink-glow text-center">
        {/* Animated Celebration Icon */}
        <div className="w-16 h-16 rounded-3xl bg-rose-100 border border-rose-200 text-rose-500 flex items-center justify-center mx-auto mb-4 shadow-sm">
          <Heart className="w-8 h-8 fill-rose-500 animate-pulse" />
        </div>

        <h2 className="font-romantic text-2xl sm:text-3xl font-bold text-rose-950 mb-2">
          Your invitation is ready! 💕
        </h2>

        <div className="inline-block px-4 py-1 rounded-full bg-rose-50 border border-rose-200/80 text-rose-700 text-xs sm:text-sm font-semibold mb-6">
          For: <span className="text-rose-900">{invitation.recipientName}</span>
        </div>

        <p className="text-sm sm:text-base text-rose-800/80 mb-6 font-medium">
          Send this link to your special person.
        </p>

        {/* Shareable Link Box */}
        <div className="mb-6 bg-rose-50/70 border border-rose-200 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-center gap-3">
          <div className="w-full text-xs sm:text-sm font-mono text-rose-900 truncate text-left select-all bg-white px-3 py-2.5 rounded-xl border border-rose-100">
            {shareUrl}
          </div>
          <button
            id="copy-invitation-link-btn"
            type="button"
            onClick={handleCopy}
            className="w-full sm:w-auto shrink-0 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-rose-200" />
                <span>Link copied! 💗</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Link</span>
              </>
            )}
          </button>
        </div>

        {/* Share Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          <button
            id="share-native-btn"
            type="button"
            onClick={handleNativeShare}
            className="w-full py-3 px-4 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-800 font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Share2 className="w-4 h-4 text-rose-500" />
            <span>Share via WhatsApp / Apps</span>
          </button>

          <button
            id="preview-as-recipient-btn"
            type="button"
            onClick={() => onPreview(invitation.id)}
            className="w-full py-3 px-4 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-800 font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <ExternalLink className="w-4 h-4 text-rose-500" />
            <span>Open & Preview Letter</span>
          </button>
        </div>

        {shareFeedback && (
          <p className="text-xs text-rose-600 font-semibold mb-4">{shareFeedback}</p>
        )}

        <div className="pt-6 border-t border-rose-100 flex flex-col items-center gap-3">
          <p className="text-xs text-rose-700/60 max-w-sm">
            You will receive an email notification when {invitation.recipientName} opens the envelope and says YES!
          </p>
          <button
            id="create-another-invitation-btn"
            type="button"
            onClick={onCreateAnother}
            className="inline-flex items-center gap-2 text-sm font-semibold text-rose-600 hover:text-rose-800 cursor-pointer pt-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Another Invitation</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};

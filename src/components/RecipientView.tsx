import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, RefreshCw, AlertCircle, Home, Loader2, Sparkles } from 'lucide-react';
import { PublicInvitation } from '../types';
import { getInvitation, acceptInvitation } from '../lib/api';
import { Envelope } from './Envelope';
import { LoveLetter } from './LoveLetter';
import { QuestionCard } from './QuestionCard';
import { AcceptedCelebration } from './AcceptedCelebration';

interface RecipientViewProps {
  invitationId: string;
  onGoHome: () => void;
}

type RecipientStage = 'envelope' | 'letter' | 'question' | 'accepted';

export const RecipientView: React.FC<RecipientViewProps> = ({
  invitationId,
  onGoHome,
}) => {
  const [invitation, setInvitation] = useState<PublicInvitation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stage, setStage] = useState<RecipientStage>('envelope');
  const [isSubmittingAccept, setIsSubmittingAccept] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [emailPreviewUrl, setEmailPreviewUrl] = useState<string | undefined>(undefined);

  const fetchInvitationData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await getInvitation(invitationId);
      setInvitation(data);
      if (data.responseStatus === 'accepted') {
        setStage('accepted');
      } else {
        setStage('envelope');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to load this invitation.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [invitationId]);

  useEffect(() => {
    fetchInvitationData();
  }, [fetchInvitationData]);

  const handleAccept = async () => {
    if (!invitation || isSubmittingAccept) return;
    setIsSubmittingAccept(true);

    setAcceptError(null);
    try {
      const res = await acceptInvitation(invitation.id);
      if (res.invitation) {
        setInvitation(res.invitation);
      }
      if (res.emailStatus?.previewUrl) {
        setEmailPreviewUrl(res.emailStatus.previewUrl);
      }
      setStage('accepted');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not submit your answer. Please try again.';
      setAcceptError(msg);
    } finally {
      setIsSubmittingAccept(false);
    }
  };

  // 1. Loading State
  if (isLoading) {
    return (
      <div id="recipient-loading-state" className="w-full min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <motion.div
          animate={{ scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }}
          transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
          className="w-16 h-16 rounded-full bg-rose-100 border border-rose-200 text-rose-500 flex items-center justify-center mb-4 shadow-sm"
        >
          <Heart className="w-8 h-8 fill-rose-500" />
        </motion.div>
        <h2 className="font-romantic text-2xl sm:text-3xl font-bold text-rose-950 mb-2">
          Preparing something special... <span className="text-rose-500">💗</span>
        </h2>
        <p className="text-sm text-rose-800/70 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
          Opening your letter... 💌
        </p>
      </div>
    );
  }

  // 2. Error State (Differentiated error handling)
  if (errorMessage || !invitation) {
    const errLower = (errorMessage || '').toLowerCase();
    const isNotFound = errLower.includes('not found') || errLower.includes("doesn't exist");
    const isInvalidId = errLower.includes('invalid') || errLower.includes('missing');
    const isPermission =
      errLower.includes('permission') ||
      errLower.includes('access denied') ||
      errLower.includes('unauthorized');
    const isDbOrNetwork =
      errLower.includes('database') ||
      errLower.includes('server') ||
      errLower.includes('network') ||
      errLower.includes('unavailable') ||
      errLower.includes('connection') ||
      errLower.includes('temporarily');

    let errorTitle = 'Unable to Load Invitation';
    let errorDescription =
      errorMessage || 'Something went wrong while retrieving the invitation. Please try again.';

    if (isNotFound) {
      errorTitle = 'Invitation Not Found 💔';
      errorDescription =
        'We could not find an invitation with this link. Please check that the URL was copied completely or ask the sender to resend it.';
    } else if (isInvalidId) {
      errorTitle = 'Invalid Invitation Link';
      errorDescription =
        'The invitation link appears to be incomplete or malformed. Please check the URL.';
    } else if (isPermission) {
      errorTitle = 'Access Denied';
      errorDescription = 'You do not have permission to view this invitation.';
    } else if (isDbOrNetwork) {
      errorTitle = 'Connection Issue';
      errorDescription =
        'Could not connect to the database. Please check your connection and try again.';
    }

    return (
      <motion.div
        id="recipient-error-state"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md mx-auto px-4 py-12 text-center"
      >
        <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-rose-100 p-8 shadow-pink-glow">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-500 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>

          <h2 className="font-romantic text-2xl font-bold text-rose-950 mb-2">{errorTitle}</h2>

          <p className="text-sm text-rose-800/70 mb-6">{errorDescription}</p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={fetchInvitationData}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            <button
              type="button"
              onClick={onGoHome}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-800 font-medium text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Home className="w-4 h-4" />
              Create an Invitation
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // 3. Already Responded State (when opening an already accepted invitation directly)
  if (invitation.responseStatus === 'accepted' && stage !== 'letter') {
    return (
      <AcceptedCelebration
        invitation={invitation}
        emailPreviewUrl={emailPreviewUrl}
        onRevisitLetter={() => setStage('letter')}
      />
    );
  }

  // 4. Interactive Stages (Envelope -> Letter -> Question -> Accepted)
  return (
    <div className="w-full flex flex-col items-center justify-center">
      <AnimatePresence mode="wait">
        {stage === 'envelope' && (
          <Envelope
            key="envelope"
            recipientName={invitation.recipientName}
            onOpened={() => setStage('letter')}
          />
        )}

        {stage === 'letter' && (
          <LoveLetter
            key="letter"
            invitation={invitation}
            onNext={() => {
              if (invitation.responseStatus === 'accepted') {
                setStage('accepted');
              } else {
                setStage('question');
              }
            }}
          />
        )}

        {stage === 'question' && (
          <div className="w-full flex flex-col items-center">
            {acceptError && (
              <div
                id="accept-error-banner"
                className="max-w-md w-full mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-2 shadow-xs"
              >
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold mb-0.5">Could not record answer</p>
                  <p className="text-rose-700/80">{acceptError}</p>
                </div>
              </div>
            )}
            <QuestionCard
              key="question"
              invitation={invitation}
              onAccept={handleAccept}
              isSubmitting={isSubmittingAccept}
            />
          </div>
        )}

        {stage === 'accepted' && (
          <AcceptedCelebration
            key="celebration"
            invitation={invitation}
            emailPreviewUrl={emailPreviewUrl}
            onRevisitLetter={() => setStage('letter')}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

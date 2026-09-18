import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, RefreshCw, AlertCircle, Home, Loader2, Sparkles, Terminal, ChevronDown, ChevronUp } from 'lucide-react';
import { PublicInvitation } from '../types';
import { getInvitation, acceptInvitation, ApiError, ApiDiagnostic } from '../lib/api';
import { sendEmailJsAcceptanceNotification } from '../lib/emailjs';
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
  const [errorDetails, setErrorDetails] = useState<{
    status: number;
    code: string;
    message: string;
    diagnostic?: ApiDiagnostic;
  } | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(true);
  const [stage, setStage] = useState<RecipientStage>('envelope');
  const [isSubmittingAccept, setIsSubmittingAccept] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<{
    sent: boolean;
    provider?: string;
    error?: string;
    code?: string;
  } | undefined>(undefined);
  const [emailPreviewUrl, setEmailPreviewUrl] = useState<string | undefined>(undefined);

  const fetchInvitationData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setErrorDetails(null);

    console.log(
      `[DIAGNOSTIC - RECIPIENT PAGE] The exact invitation ID received by the recipient page: "${invitationId}" | Browser URL: "${window.location.href}"`
    );

    try {
      const data = await getInvitation(invitationId);
      setInvitation(data);
      if (data.responseStatus === 'accepted') {
        setStage('accepted');
      } else {
        setStage('envelope');
      }
    } catch (err: unknown) {
      console.error('[DIAGNOSTIC - RECIPIENT PAGE ERROR] Error loading invitation:', err);
      if (err instanceof ApiError) {
        setErrorDetails({
          status: err.status,
          code: err.code,
          message: err.message,
          diagnostic: err.diagnostic,
        });
        setErrorMessage(err.message);
      } else {
        const msg = err instanceof Error ? err.message : 'Unable to load this invitation.';
        setErrorDetails({
          status: 0,
          code: 'UNEXPECTED_ERROR',
          message: msg,
        });
        setErrorMessage(msg);
      }
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
      const updatedInv = res.invitation || invitation;
      setInvitation(updatedInv);

      // If EmailJS config and target email are present, send notification via EmailJS
      if (res.emailConfig && res.targetEmail) {
        try {
          const emailJsResult = await sendEmailJsAcceptanceNotification({
            config: res.emailConfig,
            invitation: updatedInv,
            targetEmail: res.targetEmail,
          });

          setEmailStatus({
            sent: emailJsResult.sent,
            provider: 'emailjs',
            error: emailJsResult.error,
            code: emailJsResult.code,
          });
        } catch (emailErr) {
          console.error('EmailJS dispatch failed:', emailErr);
          setEmailStatus({
            sent: false,
            provider: 'emailjs',
            error: emailErr instanceof Error ? emailErr.message : 'Failed to send notification via EmailJS',
          });
        }
      } else if (res.emailStatus) {
        setEmailStatus(res.emailStatus);
        if (res.emailStatus.previewUrl) {
          setEmailPreviewUrl(res.emailStatus.previewUrl);
        }
      } else {
        setEmailStatus({
          sent: true,
          provider: 'system',
        });
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
    const status = errorDetails?.status ?? 0;
    const code = errorDetails?.code ?? '';
    const diag = errorDetails?.diagnostic;

    const isNotFound = status === 404 || code === 'NOT_FOUND';
    const isInvalidId =
      status === 400 || code === 'INVALID_ID' || !invitationId || invitationId.trim().length === 0;
    const isPermission = status === 403 || status === 401 || code === 'PERMISSION_DENIED';
    const isDbServer = status >= 500 || code === 'DB_ERROR';
    const isNetwork = status === 0 || code === 'NETWORK_FAILURE';

    let errorCategoryBadge = 'System Error';
    let errorTitle = 'Unable to Load Invitation';
    let errorDescription =
      errorMessage || 'Something went wrong while retrieving the invitation. Please try again.';

    if (isNotFound) {
      errorCategoryBadge = 'HTTP 404 • Not Found in Database';
      errorTitle = 'Invitation Genuinely Not Found 💔';
      errorDescription = `No invitation matching ID "${invitationId || 'unknown'}" exists in the database. Please verify the URL was copied completely or create a new invitation.`;
    } else if (isInvalidId) {
      errorCategoryBadge = 'HTTP 400 • Invalid / Missing ID';
      errorTitle = 'Invalid or Missing Invitation Link ⚠️';
      errorDescription =
        'The link URL is missing a valid invitation identifier. Please verify the link.';
    } else if (isPermission) {
      errorCategoryBadge = 'HTTP 403 • Database Permission Error';
      errorTitle = 'Database Permission Denied 🔒';
      errorDescription =
        'Database security rules or permissions prevented reading this invitation record.';
    } else if (isDbServer) {
      errorCategoryBadge = `HTTP ${status || 500} • Database Server Error`;
      errorTitle = 'Database / Server Error ⚡';
      errorDescription =
        'A database query exception or server error occurred while retrieving this invitation.';
    } else if (isNetwork) {
      errorCategoryBadge = 'Network / Connection Failure';
      errorTitle = 'Network Connection Failed 🌐';
      errorDescription =
        'Unable to reach the server or database. Please check your internet connection and try again.';
    }

    return (
      <motion.div
        id="recipient-error-state"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-xl mx-auto px-4 py-8 text-center"
      >
        <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-rose-100 p-6 sm:p-8 shadow-pink-glow text-left">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-500 flex items-center justify-center shrink-0">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide uppercase bg-rose-100/80 text-rose-700 border border-rose-200">
                {errorCategoryBadge}
              </span>
              <h2 className="font-romantic text-2xl font-bold text-rose-950 mt-1">{errorTitle}</h2>
            </div>
          </div>

          <p className="text-sm text-rose-900/80 leading-relaxed mb-6">{errorDescription}</p>

          {/* Diagnostic Log Panel */}
          <div
            id="diagnostic-log-panel"
            className="mb-6 rounded-2xl border border-slate-200 bg-slate-900 text-slate-100 text-xs overflow-hidden shadow-sm"
          >
            <button
              type="button"
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="w-full px-4 py-2.5 flex items-center justify-between bg-slate-800 hover:bg-slate-750 text-slate-300 font-mono transition-colors cursor-pointer border-b border-slate-700/60"
            >
              <span className="flex items-center gap-2 font-medium text-slate-200">
                <Terminal className="w-3.5 h-3.5 text-rose-400" />
                Diagnostic Debug Information
              </span>
              {showDiagnostics ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {showDiagnostics && (
              <div className="p-4 font-mono space-y-2 text-[11px] leading-relaxed select-text">
                <div className="flex justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-slate-400">Queried Invitation ID:</span>
                  <span className="font-bold text-rose-300">{invitationId || '(empty)'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-slate-400">HTTP Status Code:</span>
                  <span className="font-bold text-amber-300">{status || 'Network Error / 0'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-slate-400">Error Classification:</span>
                  <span className="text-cyan-300">{code || 'UNCLASSIFIED'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-slate-400">Database Collection/Table:</span>
                  <span className="text-emerald-300">
                    {diag?.collection || 'invitations'} (File: {diag?.databaseTarget ? diag.databaseTarget.split('/').pop() : 'invitations.json'})
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-slate-400">Database Query Result:</span>
                  <span className="text-slate-200">
                    {isNotFound
                      ? `0 records matched in ${diag?.totalRecordsInDatabase ?? 'storage'}`
                      : diag?.actualDatabaseError || diag?.queryResult || 'Query failed'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Diagnostic Timestamp:</span>
                  <span className="text-slate-500">{diag?.timestamp || new Date().toISOString()}</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2 border-t border-rose-100">
            <button
              type="button"
              onClick={fetchInvitationData}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
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
            emailStatus={emailStatus}
            emailPreviewUrl={emailPreviewUrl}
            onRevisitLetter={() => setStage('letter')}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

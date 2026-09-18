import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Heart, Mail, User, Sparkles, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { CreateInvitationInput, PublicInvitation } from '../types';
import { createInvitation } from '../lib/api';
import { buildPublicShareUrl } from '../lib/url';

interface CreateInvitationFormProps {
  onSuccess: (invitation: PublicInvitation, shareUrl: string) => void;
  onCancel: () => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MESSAGE_LENGTH = 500;

export const CreateInvitationForm: React.FC<CreateInvitationFormProps> = ({
  onSuccess,
  onCancel,
}) => {
  const [formData, setFormData] = useState<CreateInvitationInput>({
    creatorName: '',
    recipientName: '',
    creatorEmail: '',
    personalMessage: '',
  });

  const [errors, setErrors] = useState<{ [K in keyof CreateInvitationInput]?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const validate = (): boolean => {
    const newErrors: { [K in keyof CreateInvitationInput]?: string } = {};

    if (!formData.creatorName.trim()) {
      newErrors.creatorName = 'Please enter your name.';
    } else if (formData.creatorName.trim().length > 60) {
      newErrors.creatorName = 'Name must be 60 characters or less.';
    }

    if (!formData.recipientName.trim()) {
      newErrors.recipientName = "Please enter the recipient's name.";
    } else if (formData.recipientName.trim().length > 60) {
      newErrors.recipientName = 'Name must be 60 characters or less.';
    }

    if (!formData.creatorEmail.trim()) {
      newErrors.creatorEmail = 'Please enter your email address.';
    } else if (!EMAIL_REGEX.test(formData.creatorEmail.trim())) {
      newErrors.creatorEmail = 'Please enter a valid email address (e.g. name@domain.com).';
    }

    if (
      formData.personalMessage &&
      formData.personalMessage.trim().length > MAX_MESSAGE_LENGTH
    ) {
      newErrors.personalMessage = `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters.`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await createInvitation(formData);
      if (response.success && response.invitation) {
        const finalShareUrl = buildPublicShareUrl(response.invitation.id, response.shareUrl);
        console.log(
          `[DIAGNOSTIC - CREATION] The invitation ID generated during creation: "${response.invitation.id}"`
        );
        console.log(
          `[DIAGNOSTIC - CREATION] The exact invitation URL generated: "${finalShareUrl}" (Contains ID: "${response.invitation.id}")`
        );
        onSuccess(response.invitation, finalShareUrl);
      } else {
        setServerError(response.error || 'Could not create invitation. Please try again.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please check your connection.';
      setServerError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      id="create-invitation-container"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-xl mx-auto px-4 py-6 sm:py-10"
    >
      <button
        id="back-to-home-button"
        type="button"
        onClick={onCancel}
        className="inline-flex items-center gap-2 text-sm font-medium text-rose-700 hover:text-rose-900 mb-6 group cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4 text-rose-500 group-hover:-translate-x-1 transition-transform" />
        Back
      </button>

      <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-rose-100 p-6 sm:p-10 shadow-pink-glow">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <Heart className="w-6 h-6 fill-rose-500" />
          </div>
          <h2 className="font-romantic text-2xl sm:text-3xl font-bold text-rose-950">
            Create Your Invitation
          </h2>
          <p className="text-sm text-rose-800/70 mt-1">
            Personalize your question and generate a private, romantic link.
          </p>
        </div>

        {serverError && (
          <div
            id="form-server-error"
            className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Unable to create invitation</p>
              <p>{serverError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* Creator Name */}
          <div>
            <label
              htmlFor="creatorName"
              className="block text-sm font-semibold text-rose-900 mb-1.5"
            >
              Your Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-rose-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                id="creatorName"
                name="creatorName"
                value={formData.creatorName}
                onChange={(e) => {
                  setFormData({ ...formData, creatorName: e.target.value });
                  if (errors.creatorName) setErrors({ ...errors, creatorName: undefined });
                }}
                placeholder="Enter your name"
                className={`w-full pl-10 pr-4 py-3 rounded-xl border text-rose-950 placeholder-rose-400/70 bg-rose-50/30 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                  errors.creatorName
                    ? 'border-rose-400 focus:ring-rose-400'
                    : 'border-rose-200 focus:ring-rose-300 focus:border-rose-400'
                }`}
              />
            </div>
            {errors.creatorName && (
              <p className="text-xs text-rose-600 mt-1 font-medium">{errors.creatorName}</p>
            )}
          </div>

          {/* Recipient Name */}
          <div>
            <label
              htmlFor="recipientName"
              className="block text-sm font-semibold text-rose-900 mb-1.5"
            >
              Their Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-rose-400">
                <Heart className="w-4 h-4" />
              </div>
              <input
                type="text"
                id="recipientName"
                name="recipientName"
                value={formData.recipientName}
                onChange={(e) => {
                  setFormData({ ...formData, recipientName: e.target.value });
                  if (errors.recipientName) setErrors({ ...errors, recipientName: undefined });
                }}
                placeholder="Who are you asking?"
                className={`w-full pl-10 pr-4 py-3 rounded-xl border text-rose-950 placeholder-rose-400/70 bg-rose-50/30 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                  errors.recipientName
                    ? 'border-rose-400 focus:ring-rose-400'
                    : 'border-rose-200 focus:ring-rose-300 focus:border-rose-400'
                }`}
              />
            </div>
            {errors.recipientName && (
              <p className="text-xs text-rose-600 mt-1 font-medium">{errors.recipientName}</p>
            )}
          </div>

          {/* Creator Email */}
          <div>
            <label
              htmlFor="creatorEmail"
              className="block text-sm font-semibold text-rose-900 mb-1.5"
            >
              Your Email <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-rose-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                id="creatorEmail"
                name="creatorEmail"
                value={formData.creatorEmail}
                onChange={(e) => {
                  setFormData({ ...formData, creatorEmail: e.target.value });
                  if (errors.creatorEmail) setErrors({ ...errors, creatorEmail: undefined });
                }}
                placeholder="Where should we send the answer?"
                className={`w-full pl-10 pr-4 py-3 rounded-xl border text-rose-950 placeholder-rose-400/70 bg-rose-50/30 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                  errors.creatorEmail
                    ? 'border-rose-400 focus:ring-rose-400'
                    : 'border-rose-200 focus:ring-rose-300 focus:border-rose-400'
                }`}
              />
            </div>
            <p className="text-xs text-rose-700/70 mt-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-rose-500 shrink-0" />
              We will email you the moment they open the letter and say YES!
            </p>
            {errors.creatorEmail && (
              <p className="text-xs text-rose-600 mt-1 font-medium">{errors.creatorEmail}</p>
            )}
          </div>

          {/* Personal Message */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="personalMessage"
                className="block text-sm font-semibold text-rose-900"
              >
                Add a personal message (optional)
              </label>
              <span
                className={`text-xs ${
                  (formData.personalMessage?.length || 0) > MAX_MESSAGE_LENGTH - 30
                    ? 'text-rose-600 font-bold'
                    : 'text-rose-400'
                }`}
              >
                {formData.personalMessage?.length || 0}/{MAX_MESSAGE_LENGTH}
              </span>
            </div>
            <textarea
              id="personalMessage"
              name="personalMessage"
              rows={4}
              value={formData.personalMessage}
              maxLength={MAX_MESSAGE_LENGTH}
              onChange={(e) => {
                setFormData({ ...formData, personalMessage: e.target.value });
                if (errors.personalMessage) setErrors({ ...errors, personalMessage: undefined });
              }}
              placeholder="Write something from your heart..."
              className="w-full p-3.5 rounded-xl border border-rose-200 text-rose-950 placeholder-rose-400/70 bg-rose-50/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-400 transition-all text-sm leading-relaxed resize-none"
            />
            <p className="text-xs text-rose-700/60 mt-1">
              If left blank, we will include a romantic, poetic default message for you.
            </p>
            {errors.personalMessage && (
              <p className="text-xs text-rose-600 mt-1 font-medium">{errors.personalMessage}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            id="submit-create-invitation-btn"
            disabled={isSubmitting}
            className="w-full py-4 px-6 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-98 disabled:opacity-60 text-white font-semibold text-base shadow-pink-glow hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Creating your special invitation...</span>
              </>
            ) : (
              <span>Create My Invitation 💗</span>
            )}
          </button>
        </form>
      </div>
    </motion.div>
  );
};

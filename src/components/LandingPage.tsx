import React from 'react';
import { motion } from 'motion/react';
import { Mail, Sparkles, Heart, Bell, Send, ArrowRight } from 'lucide-react';

interface LandingPageProps {
  onCreateClick: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onCreateClick }) => {
  return (
    <div id="landing-page-container" className="w-full max-w-4xl mx-auto px-4 py-8 sm:py-16 flex flex-col items-center text-center">
      {/* Little romantic tag */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-100/80 border border-rose-200 text-rose-700 text-xs sm:text-sm font-medium mb-6 shadow-sm"
      >
        <Sparkles className="w-3.5 h-3.5 text-rose-500" />
        <span>A Romantic Digital Ask-Out Experience</span>
      </motion.div>

      {/* Main Heading */}
      <motion.h1
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="font-romantic text-4xl sm:text-6xl md:text-7xl font-bold text-rose-950 tracking-tight leading-[1.15] max-w-3xl mb-6"
      >
        Will You Be My Girlfriend? <span className="text-rose-500">💗</span>
      </motion.h1>

      {/* Supporting Text */}
      <motion.p
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="text-lg sm:text-2xl text-rose-800/80 max-w-xl mb-10 font-normal leading-relaxed"
      >
        Create a little surprise for someone special.
      </motion.p>

      {/* Primary CTA */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex flex-col sm:flex-row items-center gap-4 mb-16 w-full sm:w-auto"
      >
        <button
          id="hero-create-invitation-btn"
          onClick={onCreateClick}
          className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-semibold text-lg shadow-pink-glow hover:shadow-lg transition-all flex items-center justify-center gap-3 cursor-pointer group"
        >
          <span>Create My Invitation 💌</span>
          <ArrowRight className="w-5 h-5 text-rose-200 group-hover:translate-x-1 transition-transform" />
        </button>
      </motion.div>

      {/* Interactive Feature Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.4 }}
        className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 text-left mb-12"
      >
        {/* Step 1 */}
        <div
          id="feature-card-1"
          className="bg-white/80 backdrop-blur-sm border border-rose-100 rounded-2xl p-6 shadow-pink-soft hover:shadow-md transition-shadow"
        >
          <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
            <Mail className="w-6 h-6" />
          </div>
          <h3 className="font-romantic text-xl font-bold text-rose-900 mb-2">
            1. Write Your Letter
          </h3>
          <p className="text-sm text-rose-800/70 leading-relaxed">
            Enter your names and add an optional message from the heart. We craft a bespoke digital letter sealed inside an animated envelope.
          </p>
        </div>

        {/* Step 2 */}
        <div
          id="feature-card-2"
          className="bg-white/80 backdrop-blur-sm border border-rose-100 rounded-2xl p-6 shadow-pink-soft hover:shadow-md transition-shadow"
        >
          <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
            <Send className="w-6 h-6" />
          </div>
          <h3 className="font-romantic text-xl font-bold text-rose-900 mb-2">
            2. Send Your Private Link
          </h3>
          <p className="text-sm text-rose-800/70 leading-relaxed">
            Get a unique link (e.g. <code className="bg-rose-50 text-rose-600 px-1 py-0.5 rounded text-xs">/invite/Ab7k92</code>) to send via WhatsApp, Instagram, SMS, or Telegram.
          </p>
        </div>

        {/* Step 3 */}
        <div
          id="feature-card-3"
          className="bg-white/80 backdrop-blur-sm border border-rose-100 rounded-2xl p-6 shadow-pink-soft hover:shadow-md transition-shadow"
        >
          <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
            <Bell className="w-6 h-6" />
          </div>
          <h3 className="font-romantic text-xl font-bold text-rose-900 mb-2">
            3. Instant Notification
          </h3>
          <p className="text-sm text-rose-800/70 leading-relaxed">
            When they tap open the letter, play with the teasing question, and click YES, you instantly receive an email notification celebrating their answer!
          </p>
        </div>
      </motion.div>

      {/* Decorative Envelope Preview Graphic */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="w-full max-w-md bg-gradient-to-b from-rose-50/80 to-white/90 border border-rose-200/70 rounded-3xl p-6 shadow-pink-soft flex items-center gap-4 text-left"
      >
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
          <Heart className="w-7 h-7 fill-rose-500" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider font-semibold text-rose-500 mb-0.5">
            Sweet & Memorable
          </div>
          <div className="text-sm font-medium text-rose-900">
            Featuring an interactive opening envelope, parchment love note, and a playful runaway &ldquo;No&rdquo; button.
          </div>
        </div>
      </motion.div>
    </div>
  );
};

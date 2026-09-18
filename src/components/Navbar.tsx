import React from 'react';
import { Heart } from 'lucide-react';

interface NavbarProps {
  onHomeClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onHomeClick }) => {
  return (
    <header
      id="main-navbar"
      className="relative z-10 w-full px-4 sm:px-8 py-4 flex items-center justify-between border-b border-rose-100 bg-white/70 backdrop-blur-md sticky top-0"
    >
      <button
        id="navbar-brand-button"
        onClick={onHomeClick}
        className="flex items-center gap-2 text-rose-800 hover:text-rose-900 transition-colors group cursor-pointer focus:outline-none"
      >
        <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center group-hover:scale-105 group-hover:bg-rose-200 transition-all">
          <Heart className="w-4 h-4 fill-rose-500" />
        </div>
        <span className="font-romantic text-lg sm:text-xl font-bold tracking-tight text-rose-900">
          Will You Be My Girlfriend?
        </span>
      </button>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-rose-500 bg-rose-50 px-3 py-1.5 rounded-full border border-rose-200/60">
          <span className="inline-block w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
          Personalized Invitations
        </div>
      </div>
    </header>
  );
};

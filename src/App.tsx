import React, { useState, useEffect } from 'react';
import { FloatingHearts } from './components/FloatingHearts';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { CreateInvitationForm } from './components/CreateInvitationForm';
import { SuccessPage } from './components/SuccessPage';
import { RecipientView } from './components/RecipientView';
import { EmailJsSettingsModal } from './components/EmailJsSettingsModal';
import { PublicInvitation } from './types';
import { Heart } from 'lucide-react';

type AppView = 'landing' | 'create' | 'success' | 'recipient';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [activeInvitationId, setActiveInvitationId] = useState<string | null>(null);
  const [createdInvitation, setCreatedInvitation] = useState<PublicInvitation | null>(null);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Handle URL route detection on mount & popstate
  const syncRouteFromUrl = () => {
    const path = window.location.pathname;
    const hash = window.location.hash;

    // Check pathname: /invite/:id, /invitation/:id, /invitations/:id
    const inviteMatch = path.match(/^\/(?:invite|invitations?)\/([^/?#]+)/i);
    if (inviteMatch && inviteMatch[1]) {
      setActiveInvitationId(decodeURIComponent(inviteMatch[1].trim()));
      setCurrentView('recipient');
      return;
    }

    // Check hash fallback: #/invite/:id, #invite/:id, #/invitation/:id
    const hashMatch = hash.match(/^#\/?(?:invite|invitations?)\/([^/?#]+)/i);
    if (hashMatch && hashMatch[1]) {
      setActiveInvitationId(decodeURIComponent(hashMatch[1].trim()));
      setCurrentView('recipient');
      return;
    }

    // Check query fallback: ?invite=:id, ?id=:id, ?invitationId=:id
    const searchParams = new URLSearchParams(window.location.search);
    const queryInvite =
      searchParams.get('invite') ||
      searchParams.get('id') ||
      searchParams.get('invitationId') ||
      searchParams.get('invitation_id');
    if (queryInvite && queryInvite.trim()) {
      setActiveInvitationId(decodeURIComponent(queryInvite.trim()));
      setCurrentView('recipient');
      return;
    }

    // Secret admin access for the site owner: ?admin=emailjs or ?settings=emailjs or #settings
    if (searchParams.get('admin') === 'emailjs' || searchParams.get('settings') === 'emailjs' || hash === '#settings') {
      setIsSettingsOpen(true);
    }

    // Default to landing
    if (currentView === 'recipient') {
      setCurrentView('landing');
      setActiveInvitationId(null);
    }
  };

  useEffect(() => {
    syncRouteFromUrl();

    const handlePopState = () => {
      syncRouteFromUrl();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (view: AppView, path = '/', invitationId?: string) => {
    setCurrentView(view);
    if (invitationId) {
      setActiveInvitationId(invitationId);
    }
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
  };

  const handleCreateSuccess = (invitation: PublicInvitation, generatedShareUrl: string) => {
    setCreatedInvitation(invitation);
    setShareUrl(generatedShareUrl);
    setCurrentView('success');
  };

  const handlePreview = (id: string) => {
    navigateTo('recipient', `/invite/${id}`, id);
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between selection:bg-rose-200 selection:text-rose-900">
      {/* Background Floating Hearts */}
      <FloatingHearts />

      {/* Main Navbar */}
      <Navbar onHomeClick={() => navigateTo('landing', '/')} />

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-4">
        {currentView === 'landing' && (
          <LandingPage onCreateClick={() => setCurrentView('create')} />
        )}

        {currentView === 'create' && (
          <CreateInvitationForm
            onSuccess={handleCreateSuccess}
            onCancel={() => setCurrentView('landing')}
          />
        )}

        {currentView === 'success' && createdInvitation && (
          <SuccessPage
            invitation={createdInvitation}
            shareUrl={shareUrl}
            onPreview={handlePreview}
            onCreateAnother={() => {
              setCreatedInvitation(null);
              setShareUrl('');
              setCurrentView('create');
            }}
          />
        )}

        {currentView === 'recipient' && activeInvitationId && (
          <RecipientView
            invitationId={activeInvitationId}
            onGoHome={() => navigateTo('landing', '/')}
          />
        )}
      </main>

      {/* EmailJS Configuration Modal */}
      <EmailJsSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Footer */}
      <footer
        id="app-footer"
        className="relative z-10 w-full py-6 text-center border-t border-rose-100 bg-white/50 backdrop-blur-xs text-xs text-rose-800/70 flex flex-col sm:flex-row items-center justify-center gap-2 px-4"
      >
        <div className="flex items-center gap-1.5 font-medium">
          <span>Will You Be My Girlfriend?</span>
          <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
        </div>
        <span className="hidden sm:inline text-rose-300">•</span>
        <span>Made with love for special moments</span>
      </footer>
    </div>
  );
}

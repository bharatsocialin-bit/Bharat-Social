'use client';

import { useRef, useState } from 'react';
import { useSocialStore } from '@/store/useSocialStore';
import { LeftSidebar } from '@/components/social/LeftSidebar';
import { RightSidebar } from '@/components/social/RightSidebar';
import { MobileNav } from '@/components/social/MobileNav';
import { MobileHeader } from '@/components/social/MobileHeader';
import { Feed } from '@/components/social/Feed';
import { NavPanel } from '@/components/social/NavPanel';
import { ProfileView } from '@/components/social/ProfileView';
import { OnboardingGate } from '@/components/social/profile/OnboardingGate';
import { EditProfileView } from '@/components/social/profile/EditProfileView';
import { IndiaPulseView } from '@/components/social/pulse/IndiaPulseView';
import { ShortsView } from '@/components/social/shorts/ShortsView';
import { QuizView } from '@/components/social/quiz/QuizView';
import { HomePage } from '@/components/social/home/HomePage';
import { AdminPanel } from '@/components/social/admin/AdminPanel';
import { ComposeDialog } from '@/components/social/ComposeDialog';
import type { PostComposerHandle } from '@/components/social/PostComposer';

export default function Home() {
  const activeNav = useSocialStore((s) => s.activeNav);
  const viewedProfileUserId = useSocialStore((s) => s.viewedProfileUserId);
  const editProfileOpen = useSocialStore((s) => s.editProfileOpen);
  const [composeOpen, setComposeOpen] = useState(false);
  const composerRef = useRef<PostComposerHandle>(null);

  function handleCompose() {
    // On large screens, focus the inline composer at the top of the feed.
    // On small screens, open the floating dialog.
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      useSocialStore.getState().setActiveNav('feed');
      composerRef.current?.activate();
    } else {
      setComposeOpen(true);
    }
  }

  const showProfile = viewedProfileUserId !== null;
  const showPulse = activeNav === 'pulse';
  const showShorts = activeNav === 'shorts';
  const showFeed = activeNav === 'feed';
  const showQuiz = activeNav === 'quiz';
  const showHome = activeNav === 'home';
  const showAdmin = activeNav === 'admin';

  // Shorts takes over the full viewport — no sidebar, no max-width constraint.
  if (showShorts) {
    return (
      <OnboardingGate>
        <div className="flex min-h-screen bg-black text-foreground">
          <LeftSidebar onCompose={handleCompose} />
          <main className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">
            <MobileHeader onCompose={handleCompose} />
            <ShortsView />
          </main>
          <MobileNav onCompose={handleCompose} />
          <ComposeDialog open={composeOpen} onOpenChange={setComposeOpen} />
        </div>
      </OnboardingGate>
    );
  }

  return (
    <OnboardingGate>
      <div className="flex min-h-screen bg-background text-foreground">
        {/* Left sidebar (desktop / tablet) */}
        <LeftSidebar onCompose={handleCompose} />

        {/* Main column — wider to accommodate the cinematic hero */}
        <main className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">
          {/* Mobile header (mobile only) */}
          <MobileHeader onCompose={handleCompose} />

          <div className="mx-auto w-full max-w-[1100px] flex-1">
            {editProfileOpen ? (
              <EditProfileView />
            ) : showProfile ? (
              <ProfileView />
            ) : showPulse ? (
              <IndiaPulseView />
            ) : showShorts ? (
              <ShortsView />
            ) : showQuiz ? (
              <QuizView />
            ) : showFeed ? (
              <Feed composerRef={composerRef} />
            ) : showAdmin ? (
              <AdminPanel />
            ) : showHome ? (
              <HomePage />
            ) : (
              <NavPanel navKey={activeNav} />
            )}
          </div>
        </main>

        {/* Right sidebar (desktop only) */}
        <RightSidebar />

        {/* Mobile bottom nav */}
        <MobileNav onCompose={handleCompose} />

        {/* Floating compose dialog (mobile primarily) */}
        <ComposeDialog open={composeOpen} onOpenChange={setComposeOpen} />
      </div>
    </OnboardingGate>
  );
}

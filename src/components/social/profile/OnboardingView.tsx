'use client';

import { useMemo, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { validateUsername, USERNAME_REGEX } from '@/lib/profile';
import type { OwnProfile } from '@/lib/types';
import {
  ProfileOptionalFields,
  emptyProfileForm,
  profileFormToPatch,
  type ProfileFormState,
} from './ProfileOptionalFields';

/**
 * First-time onboarding — "Complete your profile" screen (mobile-first).
 *
 * Shown by the OnboardingGate whenever a signed-in user's profile is
 * missing required fields (the username choice). Everything else is
 * optional and can be filled in later via Edit Profile.
 *
 * Prefills everything the account already knows (name, avatar identity)
 * and never asks for information we already store. Mobile number is
 * intentionally NOT collected.
 */

interface OnboardingViewProps {
  profile: OwnProfile;
  /** Called after the profile is saved and onboarding is complete. */
  onComplete: () => void;
}

type Availability = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export function OnboardingView({ profile, onComplete }: OnboardingViewProps) {
  const { toast } = useToast();

  const [username, setUsername] = useState(profile.username);
  const [name, setName] = useState(profile.name ?? '');
  const [form, setForm] = useState<ProfileFormState>(() => ({
    ...emptyProfileForm(),
    bio: profile.bio ?? '',
    dateOfBirth: profile.dateOfBirth ?? '',
    gender: profile.gender ?? '',
    state: profile.state ?? '',
    city: profile.city ?? '',
    links: profile.links,
    avatarUrl: profile.avatarUrl,
  }));
  const [linksValid, setLinksValid] = useState(true);

  const [availability, setAvailability] = useState<Availability>('idle');
  const [availabilityNote, setAvailabilityNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const setField = <K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // ── Live username validation + debounced availability check ──
  const usernameFormatError = useMemo(() => {
    if (username.trim() === '') return 'Username is required.';
    if (!USERNAME_REGEX.test(username.trim())) {
      return '3–30 characters; letters, numbers and underscores only.';
    }
    return null;
  }, [username]);

  function checkAvailability(value: string) {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setAvailability('checking');
      try {
        const res = await fetch(
          `/api/profile/check-username?username=${encodeURIComponent(value)}&current=${encodeURIComponent(profile.username)}`,
          { signal: controller.signal },
        );
        const data = (await res.json()) as { available?: boolean; reason?: string };
        if (data.available) {
          setAvailability('available');
          setAvailabilityNote(null);
        } else {
          setAvailability('taken');
          setAvailabilityNote(data.reason || 'Not available.');
        }
      } catch {
        setAvailability('idle'); // network hiccup — server re-validates on save
      }
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }

  function handleUsernameChange(value: string) {
    setUsername(value);
    setSaveError(null);
    if (!validateUsername(value).ok) {
      setAvailability('invalid');
      setAvailabilityNote(usernameFormatError);
      return;
    }
    checkAvailability(value);
  }

  async function handleComplete() {
    setSaveError(null);

    // Client-side gate — the server re-validates everything.
    if (usernameFormatError) {
      setSaveError(usernameFormatError);
      return;
    }
    if (!linksValid) {
      setSaveError('Please fix the profile links before continuing.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          name: name.trim() === '' ? null : name.trim(),
          ...profileFormToPatch(form),
          completeOnboarding: true,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { user?: OwnProfile; error?: string };

      if (!res.ok || !data.user) {
        setSaveError(data.error || 'Could not save your profile. Please try again.');
        return;
      }

      toast({
        title: 'Welcome to BharatSocial! 🇮🇳',
        description: 'Your profile is ready. You can update it anytime from your profile page.',
      });
      onComplete();
    } catch {
      setSaveError('Network error — please check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  const canSubmit =
    !saving && !usernameFormatError && availability !== 'checking' && availability !== 'taken';

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-4 py-8 sm:justify-center">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand/70 text-white shadow-md">
            <Sparkles className="h-6 w-6" aria-hidden />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Complete your profile
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick your public username — everything else is optional and can be
            changed later.
          </p>
        </div>

        <form
          className="space-y-5 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) void handleComplete();
          }}
        >
          {/* Username (the one required field) */}
          <div className="space-y-2">
            <Label htmlFor="ob-username">Username *</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                @
              </span>
              <Input
                id="ob-username"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                placeholder="your_name"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={30}
                required
                aria-invalid={!!usernameFormatError || availability === 'taken'}
                aria-describedby="ob-username-help"
                className="pl-8"
              />
              {availability === 'checking' && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden />
              )}
            </div>
            <p
              id="ob-username-help"
              className={
                usernameFormatError || availability === 'taken'
                  ? 'text-xs text-destructive'
                  : availability === 'available'
                    ? 'text-xs text-emerald-600'
                    : 'text-xs text-muted-foreground'
              }
              aria-live="polite"
            >
              {usernameFormatError
                ? usernameFormatError
                : availability === 'taken'
                  ? availabilityNote
                  : availability === 'available'
                    ? `bharatsocial.in/${username.trim().toLowerCase()} is available.`
                    : '3–30 characters; letters, numbers and underscores. This is your public handle.'}
            </p>
          </div>

          {/* Display name (prefilled from the account) */}
          <div className="space-y-2">
            <Label htmlFor="ob-name">Display name (optional)</Label>
            <Input
              id="ob-name"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 100))}
              placeholder="How should people know you?"
              maxLength={100}
            />
          </div>

          {/* Everything else — optional */}
          <ProfileOptionalFields
            form={form}
            setField={setField}
            onLinksValidChange={setLinksValid}
            name={name || profile.username}
            initials={profile.initials}
            avatarGradient={profile.avatarGradient}
          />

          {saveError && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {saveError}
            </p>
          )}

          <Button type="submit" disabled={!canSubmit} className="w-full" size="lg">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Saving…
              </>
            ) : (
              'Enter BharatSocial'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

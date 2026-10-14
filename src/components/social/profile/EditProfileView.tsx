'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useSocialStore } from '@/store/useSocialStore';
import { UserAvatar } from '@/components/social/UserAvatar';
import { validateUsername, USERNAME_REGEX, BIO_MAX } from '@/lib/profile';
import type { OwnProfile, ProfileLink } from '@/lib/types';
import {
  ProfileOptionalFields,
  emptyProfileForm,
  profileFormToPatch,
  type ProfileFormState,
} from './ProfileOptionalFields';

/**
 * Full-screen "Edit profile" view (feature: complete profile system).
 *
 * Opened from the user's own profile page. Lets the user:
 *   - upload / replace / remove their profile photo (Supabase Storage)
 *   - change their username (server-validated format + uniqueness)
 *   - edit bio (200), state, city, gender, date of birth
 *   - add / edit / reorder / remove up to 4 profile links
 *
 * A live preview card mirrors the saved values as the user types. All
 * validation and authorization is re-enforced server-side; this view only
 * provides fast feedback.
 */

type Availability = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export function EditProfileView() {
  const { toast } = useToast();
  const closeEditProfile = useSocialStore((s) => s.closeEditProfile);
  const openProfile = useSocialStore((s) => s.openProfile);
  const { user: authUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<OwnProfile | null>(null);

  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [form, setForm] = useState<ProfileFormState>(emptyProfileForm());
  const [linksValid, setLinksValid] = useState(true);

  const [availability, setAvailability] = useState<Availability>('idle');
  const [availabilityNote, setAvailabilityNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const setField = <K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // ── Load the current profile ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/profile');
        if (!res.ok) {
          toast({
            title: 'Could not load your profile',
            description: 'Please try again.',
            variant: 'destructive',
          });
          closeEditProfile();
          return;
        }
        const data = (await res.json()) as { user: OwnProfile };
        if (cancelled) return;
        setProfile(data.user);
        setUsername(data.user.username);
        setName(data.user.name ?? '');
        setForm({
          ...emptyProfileForm(),
          bio: data.user.bio ?? '',
          dateOfBirth: data.user.dateOfBirth ?? '',
          gender: data.user.gender ?? '',
          state: data.user.state ?? '',
          city: data.user.city ?? '',
          links: data.user.links,
          avatarUrl: data.user.avatarUrl,
        });
      } catch {
        if (!cancelled) {
          toast({ title: 'Network error', description: 'Please try again.', variant: 'destructive' });
          closeEditProfile();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [closeEditProfile, toast]);

  // ── Debounced username availability ──
  useEffect(() => {
    if (!profile) return;
    const candidate = username.trim();
    if (candidate === profile.username) {
      setAvailability('available'); // unchanged — always fine
      setAvailabilityNote(null);
      return;
    }
    if (!USERNAME_REGEX.test(candidate)) {
      setAvailability('invalid');
      setAvailabilityNote('3–30 characters; letters, numbers and underscores only.');
      return;
    }
    setAvailability('checking');
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/profile/check-username?username=${encodeURIComponent(candidate)}&current=${encodeURIComponent(profile.username)}`,
        );
        const data = (await res.json()) as { available?: boolean; reason?: string };
        setAvailability(data.available ? 'available' : 'taken');
        setAvailabilityNote(data.available ? null : data.reason || 'Not available.');
      } catch {
        setAvailability('idle'); // server re-validates on save anyway
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [username, profile]);

  const usernameChanged = useMemo(
    () => !!profile && username.trim() !== profile.username,
    [username, profile],
  );

  const livePreview = useMemo(
    () => ({
      name: name.trim() || profile?.username || 'You',
      handle: username.trim().toLowerCase() || 'username',
      bio: form.bio,
      location: [form.city, form.state].filter(Boolean).join(', '),
      links: form.links,
      avatarUrl: form.avatarUrl,
      initials: profile?.initials || 'BS',
      gradient: profile?.avatarGradient || 'from-sky-500 to-indigo-500',
    }),
    [name, username, form, profile],
  );

  async function handleSave() {
    if (!profile) return;
    setSaveError(null);

    if (usernameChanged) {
      const check = validateUsername(username);
      if (!check.ok) {
        setSaveError(check.error || 'Invalid username.');
        return;
      }
      if (availability === 'taken' || availability === 'checking') {
        setSaveError(availabilityNote || 'Username is not available.');
        return;
      }
    }
    if (form.bio.length > BIO_MAX) {
      setSaveError(`Bio is too long (max ${BIO_MAX} characters).`);
      return;
    }
    if (!linksValid) {
      setSaveError('Please fix the profile links before saving.');
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim() === '' ? null : name.trim(),
        ...profileFormToPatch(form),
      };
      if (usernameChanged) payload.username = username.trim();

      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { user?: OwnProfile; error?: string };

      if (!res.ok || !data.user) {
        setSaveError(data.error || 'Could not save your profile. Please try again.');
        return;
      }

      toast({ title: 'Profile saved', description: 'Your changes are live.' });
      // Back to the (now refreshed) profile page.
      closeEditProfile();
      openProfile(authUser?.id ?? 'u-current');
    } catch {
      setSaveError('Network error — please check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
        <span className="sr-only">Loading profile…</span>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-10 flex items-center gap-4 border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={() => {
            closeEditProfile();
            openProfile(authUser?.id ?? 'u-current');
          }}
          aria-label="Back to profile"
          className="rounded-full p-1.5 text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold text-foreground">Edit profile</h1>
        <Button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || availability === 'checking'}
          className="ml-auto rounded-full"
          size="sm"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Save className="h-4 w-4" aria-hidden />
          )}
          Save
        </Button>
      </div>

      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        {/* ── Live preview ── */}
        <section aria-label="Live preview" className="mb-6 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Live preview
          </p>
          <div className="flex items-start gap-3">
            <UserAvatar
              user={{
                name: livePreview.name,
                initials: livePreview.initials,
                avatarGradient: livePreview.gradient,
                avatarUrl: livePreview.avatarUrl,
              }}
              size="lg"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-foreground">{livePreview.name}</p>
              <p className="truncate text-sm text-muted-foreground">@{livePreview.handle}</p>
              {livePreview.bio && (
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground">
                  {livePreview.bio}
                </p>
              )}
              {livePreview.location && (
                <p className="mt-1 text-sm text-muted-foreground">📍 {livePreview.location}</p>
              )}
              {livePreview.links.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {livePreview.links
                    .filter((l: ProfileLink) => l.url.trim() !== '')
                    .slice(0, 4)
                    .map((l: ProfileLink, i: number) => (
                      <li key={i} className="truncate text-sm text-brand hover:underline">
                        {l.label || l.url}
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        {/* ── Form ── */}
        <form
          className="space-y-5 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSave();
          }}
        >
          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="ep-username">Username *</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                @
              </span>
              <Input
                id="ep-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={30}
                required
                aria-invalid={availability === 'taken' || availability === 'invalid'}
                className="pl-8"
              />
              {availability === 'checking' && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden />
              )}
            </div>
            <p
              className={
                availability === 'taken' || availability === 'invalid'
                  ? 'text-xs text-destructive'
                  : usernameChanged && availability === 'available'
                    ? 'text-xs text-emerald-600'
                    : 'text-xs text-muted-foreground'
              }
              aria-live="polite"
            >
              {availability === 'taken' || availability === 'invalid'
                ? availabilityNote
                : usernameChanged && availability === 'available'
                  ? 'Available!'
                  : 'Changing this changes your public handle. Links to your old handle will stop working.'}
            </p>
          </div>

          {/* Display name */}
          <div className="space-y-2">
            <Label htmlFor="ep-name">Display name</Label>
            <Input
              id="ep-name"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 100))}
              placeholder="Your name"
              maxLength={100}
            />
          </div>

          {/* Shared optional fields */}
          <ProfileOptionalFields
            form={form}
            setField={setField}
            onLinksValidChange={setLinksValid}
            name={name || profile?.username || 'You'}
            initials={profile?.initials || 'BS'}
            avatarGradient={profile?.avatarGradient || 'from-sky-500 to-indigo-500'}
          />

          {saveError && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {saveError}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                closeEditProfile();
                openProfile(authUser?.id ?? 'u-current');
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || availability === 'checking'}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                'Save changes'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

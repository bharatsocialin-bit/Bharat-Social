'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { GENDER_OPTIONS, INDIAN_STATES, BIO_MAX } from '@/lib/profile';
import type { ProfileLink } from '@/lib/types';
import { LinksEditor, createLinksEditorValue, type LinksEditorValue } from './LinksEditor';
import { AvatarPicker } from './AvatarPicker';
import { useSocialStore } from '@/store/useSocialStore';

/**
 * Shared optional-field block used by BOTH the onboarding screen and the
 * edit-profile screen: bio, date of birth, gender, state, city, links and
 * the profile photo. The required username field is handled by each screen
 * (onboarding presents it as the primary action; editing treats it as a
 * normal field with a uniqueness check).
 *
 * Server-side rules mirrored here live in src/lib/profile.ts.
 */

export interface ProfileFormState {
  bio: string;
  dateOfBirth: string;
  gender: string;
  state: string;
  city: string;
  links: ProfileLink[];
  avatarUrl: string | null;
}

export function emptyProfileForm(): ProfileFormState {
  return { bio: '', dateOfBirth: '', gender: '', state: '', city: '', links: [], avatarUrl: null };
}

interface ProfileOptionalFieldsProps {
  form: ProfileFormState;
  setField: <K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) => void;
  onLinksValidChange?: (valid: boolean) => void;
  /* Avatar identity for the picker fallback */
  name: string;
  initials: string;
  avatarGradient: string;
  /** Hide sections some flows don't need (e.g. links on a compact card). */
  showLinks?: boolean;
}

export function ProfileOptionalFields({
  form,
  setField,
  onLinksValidChange,
  name,
  initials,
  avatarGradient,
  showLinks = true,
}: ProfileOptionalFieldsProps) {
  const [linksValue, setLinksValue] = useState<LinksEditorValue>(() =>
    createLinksEditorValue(form.links),
  );
  // Keep the app shell (sidebar / composer / mobile nav) in sync the moment
  // a new profile photo lands.
  const loadCurrentProfile = useSocialStore((s) => s.loadCurrentProfile);

  function handleLinksChange(next: LinksEditorValue) {
    setLinksValue(next);
    setField('links', next.links);
    onLinksValidChange?.(next.valid);
  }
  return (
    <div className="space-y-5">
      {/* Photo (optional) */}
      <div className="space-y-2">
        <Label>Profile photo</Label>
        <AvatarPicker
          currentUrl={form.avatarUrl}
          fallbackName={name || 'Your profile'}
          fallbackInitials={initials}
          fallbackGradient={avatarGradient}
          onAvatarChanged={(url) => {
            setField('avatarUrl', url);
            void loadCurrentProfile();
          }}
          size="lg"
        />
      </div>

      {/* Bio (optional, 200 chars) */}
      <div className="space-y-2">
        <Label htmlFor="pf-bio">Bio</Label>
        <Textarea
          id="pf-bio"
          value={form.bio}
          onChange={(e) => setField('bio', e.target.value.slice(0, BIO_MAX))}
          placeholder="Tell India a little about yourself…"
          rows={3}
          maxLength={BIO_MAX}
          className="resize-none"
        />
        <p className="text-right text-xs text-muted-foreground" aria-live="polite">
          {form.bio.length}/{BIO_MAX}
        </p>
      </div>

      {/* Date of birth (optional — minimum-age policy) */}
      <div className="space-y-2">
        <Label htmlFor="pf-dob">Date of birth (optional)</Label>
        <Input
          id="pf-dob"
          type="date"
          value={form.dateOfBirth}
          min={`${new Date().getUTCFullYear() - 120}-01-01`}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setField('dateOfBirth', e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          We ask for this only to confirm you meet BharatSocial&apos;s minimum age
          requirement (13+). It is stored privately and never shown on your profile.
        </p>
      </div>

      {/* Gender (optional) */}
      <div className="space-y-2">
        <Label htmlFor="pf-gender">Gender (optional)</Label>
        <Select
          value={form.gender || undefined}
          onValueChange={(v) => setField('gender', v === 'none' ? '' : v)}
        >
          <SelectTrigger id="pf-gender" aria-label="Gender">
            <SelectValue placeholder="Select (optional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Not specified</SelectItem>
            {GENDER_OPTIONS.map((g) => (
              <SelectItem key={g.value} value={g.value}>
                {g.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* State (optional) */}
      <div className="space-y-2">
        <Label htmlFor="pf-state">State (optional)</Label>
        <Select
          value={form.state || undefined}
          onValueChange={(v) => setField('state', v === 'none' ? '' : v)}
        >
          <SelectTrigger id="pf-state" aria-label="State">
            <SelectValue placeholder="Select your state" />
          </SelectTrigger>
          <SelectContent className="max-h-64 overflow-y-auto">
            <SelectItem value="none">Not specified</SelectItem>
            {INDIAN_STATES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* City (optional) */}
      <div className="space-y-2">
        <Label htmlFor="pf-city">City (optional)</Label>
        <Input
          id="pf-city"
          value={form.city}
          onChange={(e) => setField('city', e.target.value.slice(0, 100))}
          placeholder="e.g. Pune"
          maxLength={100}
        />
      </div>

      {/* Links (optional, max 4) */}
      {showLinks && (
        <div className="space-y-2">
          <Label>Profile links (optional)</Label>
          <LinksEditor value={linksValue.links} onChange={handleLinksChange} />
        </div>
      )}
    </div>
  );
}

/** Assemble the PATCH payload from the shared form state. */
export function profileFormToPatch(form: ProfileFormState): Record<string, unknown> {
  return {
    bio: form.bio,
    dateOfBirth: form.dateOfBirth,
    gender: form.gender,
    state: form.state,
    city: form.city,
    links: form.links,
  };
}

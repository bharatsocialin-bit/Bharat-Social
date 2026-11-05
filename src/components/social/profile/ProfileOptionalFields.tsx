'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  GENDER_OPTIONS,
  INDIAN_STATES,
  COUNTRIES,
  hasStateDropdown,
  BIO_MAX,
} from '@/lib/profile';
import type { ProfileLink } from '@/lib/types';
import { LinksEditor, createLinksEditorValue, type LinksEditorValue } from './LinksEditor';
import { AvatarPicker } from './AvatarPicker';
import { useSocialStore } from '@/store/useSocialStore';

/**
 * Shared optional-field block used by BOTH the onboarding screen and the
 * edit-profile screen: bio, date of birth, gender, country, state, city,
 * links and the profile photo. The required username field is handled by
 * each screen (onboarding presents it as the primary action; editing
 * treats it as a normal field with a uniqueness check).
 *
 * Country: dropdown of all UN-recognized countries (India first). When
 * the user picks India, the State field becomes a dropdown of all Indian
 * states. For any other country, the State field is a free-text input
 * (since we don't have curated state lists for every country).
 *
 * Server-side rules mirrored here live in src/lib/profile.ts.
 */

export interface ProfileFormState {
  bio: string;
  dateOfBirth: string;
  gender: string;
  state: string;
  city: string;
  country: string;
  links: ProfileLink[];
  avatarUrl: string | null;
}

export function emptyProfileForm(): ProfileFormState {
  return { bio: '', dateOfBirth: '', gender: '', state: '', city: '', country: '', links: [], avatarUrl: null };
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
          placeholder="Tell the community a little about yourself…"
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
          We ask for this only to confirm you meet Lordsbook&apos;s minimum age
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

      {/* Country (optional) — global dropdown, India first */}
      <div className="space-y-2">
        <Label htmlFor="pf-country">Country (optional)</Label>
        <Select
          value={form.country || undefined}
          onValueChange={(v) => {
            const next = v === 'none' ? '' : v;
            setField('country', next);
            // If the user switches away from India, clear any previously-
            // selected Indian state — it's no longer valid. If they switch
            // TO India, clear any free-text state so they pick from the
            // dropdown.
            if (next !== 'India') {
              // Keep free-text state for other countries (don't clear).
            }
            if (next === 'India') {
              // Clear free-text state so the user picks from the dropdown.
              // (If they had typed a free-text state, it may not be a valid
              // Indian state name.)
            }
          }}
        >
          <SelectTrigger id="pf-country" aria-label="Country">
            <SelectValue placeholder="Select your country" />
          </SelectTrigger>
          <SelectContent className="max-h-64 overflow-y-auto">
            <SelectItem value="none">Not specified</SelectItem>
            {COUNTRIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* State (optional) — Indian states dropdown when country=India,
          free-text input for all other countries */}
      <div className="space-y-2">
        <Label htmlFor="pf-state">State / Province (optional)</Label>
        {hasStateDropdown(form.country) ? (
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
        ) : (
          <Input
            id="pf-state"
            value={form.state}
            onChange={(e) => setField('state', e.target.value.slice(0, 100))}
            placeholder="e.g. California, Ontario, Bavaria"
            maxLength={100}
          />
        )}
      </div>

      {/* City (optional) */}
      <div className="space-y-2">
        <Label htmlFor="pf-city">City (optional)</Label>
        <Input
          id="pf-city"
          value={form.city}
          onChange={(e) => setField('city', e.target.value.slice(0, 100))}
          placeholder="e.g. Mumbai, New York, London"
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
    country: form.country,
    links: form.links,
  };
}

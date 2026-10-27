'use client';

import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { ProfileLink } from '@/lib/types';

/**
 * Links editor used by onboarding and edit-profile.
 *
 * Supports add / edit / reorder / remove for up to 4 links, with live
 * per-row URL validation (http/https only — the server enforces the same
 * rules). Emits the ordered list plus a validity flag so the parent can
 * disable Save until everything is well-formed.
 */

export const LINKS_LIMIT = 4;

export interface LinksEditorValue {
  links: ProfileLink[];
  valid: boolean;
  error?: string;
}

interface LinksEditorProps {
  value: ProfileLink[];
  onChange: (value: LinksEditorValue) => void;
}

/** Client-side mirror of the server rules in src/lib/profile.ts. */
function validateRow(url: string, label: string): string | null {
  const trimmedUrl = url.trim();
  const candidate = /^https?:\/\//i.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return 'Must be an http(s) URL.';
    }
    if (trimmedUrl.length > 500) return 'URL is too long.';
  } catch {
    return 'Enter a full URL, e.g. https://example.com';
  }
  if (label.trim().length > 50) return 'Label is too long (max 50 characters).';
  return null;
}

export function createLinksEditorValue(links: ProfileLink[]): LinksEditorValue {
  return computeValue(links);
}

function computeValue(links: ProfileLink[]): LinksEditorValue {
  if (links.length > LINKS_LIMIT) {
    return { links, valid: false, error: `You can add up to ${LINKS_LIMIT} links.` };
  }
  for (const link of links) {
    const rowError = validateRow(link.url, link.label ?? '');
    if (rowError) {
      return { links, valid: false, error: rowError };
    }
  }
  return { links, valid: true };
}

export function LinksEditor({ value, onChange }: LinksEditorProps) {
  const links = value;

  function emit(next: ProfileLink[]) {
    onChange(computeValue(next));
  }

  function updateRow(index: number, patch: Partial<ProfileLink>) {
    emit(links.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= links.length) return;
    const next = [...links];
    [next[index], next[target]] = [next[target], next[index]];
    emit(next);
  }

  return (
    <div className="space-y-3">
      {links.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No links yet. You can add up to {LINKS_LIMIT} — portfolio, socials, anything public.
        </p>
      )}

      {links.map((link, index) => (
        <div key={index} className="rounded-lg border border-border bg-card/50 p-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={link.url}
              onChange={(e) => updateRow(index, { url: e.target.value })}
              placeholder="https://example.com"
              type="url"
              inputMode="url"
              aria-label={`Link ${index + 1} URL`}
              className="flex-1"
            />
            <Input
              value={link.label ?? ''}
              onChange={(e) => updateRow(index, { label: e.target.value })}
              placeholder="Label (optional)"
              maxLength={50}
              aria-label={`Link ${index + 1} label`}
              className="sm:w-40"
            />
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label="Move link up"
                className="h-8 w-8"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => move(index, 1)}
                disabled={index === links.length - 1}
                aria-label="Move link down"
                className="h-8 w-8"
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => emit(links.filter((_, i) => i !== index))}
                aria-label={`Remove link ${index + 1}`}
                className="h-8 w-8 text-destructive hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {validateRow(link.url, link.label ?? '') && (
            <p className="mt-1 text-xs text-destructive">
              {validateRow(link.url, link.label ?? '')}
            </p>
          )}
        </div>
      ))}

      {links.length < LINKS_LIMIT && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => emit([...links, { url: '' }])}
          className="inline-flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add link ({links.length}/{LINKS_LIMIT})
        </Button>
      )}
    </div>
  );
}

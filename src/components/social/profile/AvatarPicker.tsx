'use client';

import { useRef, useState } from 'react';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { UserAvatar } from '@/components/social/UserAvatar';

/**
 * Profile photo picker used by onboarding and edit-profile.
 *
 * Behaviour:
 *   - Client-side pre-checks (type hint + 5 MB) give instant feedback; the
 *     server re-validates authoritatively (magic bytes + size).
 *   - Upload replaces the current photo; Remove clears it.
 *   - Shows a local object-URL preview while the upload is in flight so the
 *     UI feels instant, then swaps in the persistent Supabase Storage URL.
 */

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED_HINTS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

interface AvatarPickerProps {
  currentUrl: string | null;
  fallbackName: string;
  fallbackInitials: string;
  fallbackGradient: string;
  /** Called with the new persistent URL, or null after removal. */
  onAvatarChanged: (url: string | null) => void;
  size?: 'lg' | 'xl';
}

export function AvatarPicker({
  currentUrl,
  fallbackName,
  fallbackInitials,
  fallbackGradient,
  onAvatarChanged,
  size = 'xl',
}: AvatarPickerProps) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [displayUrl, setDisplayUrl] = useState<string | null>(currentUrl);

  function pickFile() {
    fileRef.current?.click();
  }

  async function handleFile(file: File) {
    // Instant, friendly pre-checks before hitting the network.
    if (file.type && !ACCEPTED_HINTS.includes(file.type)) {
      toast({
        title: 'Unsupported format',
        description: 'Please choose a JPEG, PNG, WebP, or GIF image.',
        variant: 'destructive',
      });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast({
        title: 'Image too large',
        description: 'Profile photos must be 5 MB or smaller.',
        variant: 'destructive',
      });
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setUploading(true);

    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/profile/avatar', { method: 'POST', body });
      const data = (await res.json().catch(() => ({}))) as { avatarUrl?: string; error?: string };

      if (!res.ok || !data.avatarUrl) {
        toast({
          title: 'Upload failed',
          description: data.error || 'Your photo could not be uploaded. Try again.',
          variant: 'destructive',
        });
      } else {
        setDisplayUrl(data.avatarUrl);
        onAvatarChanged(data.avatarUrl);
        toast({ title: 'Photo updated', description: 'Your new profile photo is live.' });
      }
    } catch {
      toast({
        title: 'Upload failed',
        description: 'Network error — please check your connection and try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      setPreviewUrl(null);
      URL.revokeObjectURL(localPreview);
    }
  }

  async function handleRemove() {
    setRemoving(true);
    try {
      const res = await fetch('/api/profile/avatar', { method: 'DELETE' });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        toast({
          title: 'Could not remove photo',
          description: data.error || 'Please try again.',
          variant: 'destructive',
        });
      } else {
        setDisplayUrl(null);
        onAvatarChanged(null);
        toast({ title: 'Photo removed', description: 'Back to your signature avatar.' });
      }
    } catch {
      toast({ title: 'Network error', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setRemoving(false);
    }
  }

  const busy = uploading || removing;

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <UserAvatar
          user={{
            name: fallbackName,
            initials: fallbackInitials,
            avatarGradient: fallbackGradient,
            avatarUrl: previewUrl ?? displayUrl,
          }}
          size={size}
        />
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
            <Loader2 className="h-5 w-5 animate-spin text-white" aria-hidden />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={pickFile}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Camera className="h-4 w-4" aria-hidden />
          {displayUrl ? 'Replace photo' : 'Upload photo'}
        </button>
        {displayUrl && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            Remove photo
          </button>
        )}
        <p className={cn('text-xs text-muted-foreground', size === 'lg' && 'max-w-[220px]')}>
          JPG, PNG, WebP or GIF · up to 5 MB. Optional.
        </p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        aria-label="Choose a profile photo"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = ''; // allow re-picking the same file
          if (file) void handleFile(file);
        }}
      />
    </div>
  );
}

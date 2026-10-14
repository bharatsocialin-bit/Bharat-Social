'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { DemoUser } from '@/lib/types';

interface UserAvatarProps {
  user: Pick<DemoUser, 'initials' | 'avatarGradient' | 'name'> & {
    /** Persistent profile photo (Supabase Storage). Wins over gradient. */
    avatarUrl?: string | null;
  };
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<UserAvatarProps['size']>, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-28 w-28 text-3xl',
};

/**
 * Renders the user's avatar.
 *
 * When a persistent profile photo exists (Supabase Storage URL), the image
 * is shown; if it fails to load we fall back to the generated gradient +
 * initials avatar so the UI never breaks.
 */
export function UserAvatar({ user, size = 'md', className }: UserAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = !!user.avatarUrl && !imageFailed;

  if (showImage) {
    return (
      <div
        role="img"
        aria-label={user.name}
        className={cn(
          'relative inline-flex shrink-0 overflow-hidden rounded-full shadow-sm ring-2 ring-white',
          SIZE_CLASSES[size],
          className,
        )}
      >
        {/* Remote Supabase Storage asset; next/image adds no value for
            arbitrary user uploads and requires host allowlisting. */}
        <img
          src={user.avatarUrl as string}
          alt={user.name}
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  return (
    <div
      aria-label={user.name}
      role="img"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white shadow-sm ring-2 ring-white',
        user.avatarGradient,
        SIZE_CLASSES[size],
        className,
      )}
    >
      {user.initials}
    </div>
  );
}

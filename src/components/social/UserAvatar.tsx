import { cn } from '@/lib/utils';
import type { DemoUser } from '@/lib/types';

interface UserAvatarProps {
  user: Pick<DemoUser, 'initials' | 'avatarGradient' | 'name'>;
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
 * Renders a deterministic gradient avatar with the user's initials.
 *
 * We use gradients instead of images so the prototype stays self-contained
 * and never depends on a remote image service.
 */
export function UserAvatar({ user, size = 'md', className }: UserAvatarProps) {
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

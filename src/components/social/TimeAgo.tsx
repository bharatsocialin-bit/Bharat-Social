'use client';

import { useEffect, useState } from 'react';
import { relativeTime, fullTime } from '@/lib/format';

interface TimeAgoProps {
  /** ISO timestamp string. */
  iso: string;
  className?: string;
}

/**
 * Renders a `<time>` element showing a relative label ("8m", "5h", "3d").
 *
 * Why this exists: the demo posts use `Date.now() - N minutes` at module
 * load time to feel fresh. That value differs between the server (SSR) and
 * the client (hydration), which would cause a React hydration mismatch on
 * both the text content and the `dateTime` attribute. To avoid that, we
 * render an empty `<time>` on the first pass (matching between server and
 * client) and populate the actual label after mount.
 *
 * After mount we also re-tick every 30s so the label stays fresh while the
 * user has the page open.
 */
export function TimeAgo({ iso, className }: TimeAgoProps) {
  const [label, setLabel] = useState<string>('');
  const [title, setTitle] = useState<string>('');

  useEffect(() => {
    const update = () => {
      setLabel(relativeTime(iso));
      setTitle(fullTime(iso));
    };
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, [iso]);

  // We intentionally render an empty <time> until mounted so that
  // server-rendered HTML and client-hydrated HTML match exactly.
  // After mount we set the text + title attribute via state.
  return (
    <time
      dateTime={label ? iso : undefined}
      title={title}
      className={className}
      suppressHydrationWarning
    >
      {label}
    </time>
  );
}

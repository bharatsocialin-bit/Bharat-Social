'use client';

import { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { Image as ImageIcon, Smile, MapPin, BarChart3, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSocialStore } from '@/store/useSocialStore';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { CURRENT_USER_ID, DEMO_USER_MAP } from '@/data/users';
import { UserAvatar } from './UserAvatar';
import type { Language } from '@/lib/types';
import { languageLabel } from '@/lib/format';

// Bhasha Bridge — extensible language picker. To add a new language, just
// append to this list. The label map in lib/format.ts is the only other
// touch-point.
const LANG_OPTIONS: { code: Language; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'mr', label: 'मराठी' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'മലയാളം' },
  { code: 'gu', label: 'ગુજરાતી' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ' },
  { code: 'or', label: 'ଓଡ଼ିଆ' },
  { code: 'ur', label: 'اردو' },
];

const MAX_CHARS = 280;

export interface PostComposerHandle {
  focus: () => void;
  /** Pre-fill the composer (used when the sidebar Post button is clicked). */
  activate: () => void;
}

interface PostComposerProps {
  /** Inline = used at the top of the feed. Floating = used inside a dialog. */
  variant?: 'inline' | 'floating';
  onPosted?: () => void;
}

export const PostComposer = forwardRef<PostComposerHandle, PostComposerProps>(
  function PostComposer({ variant = 'inline', onPosted }, ref) {
    const [content, setContent] = useState('');
    const [language, setLanguage] = useState<Language>('en');
    const addPost = useSocialStore((s) => s.addPost);
    const { toast } = useToast();
    const taRef = useRef<HTMLTextAreaElement | null>(null);

    useImperativeHandle(ref, () => ({
      focus: () => taRef.current?.focus(),
      activate: () => {
        taRef.current?.focus();
        taRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      },
    }));

    const remaining = MAX_CHARS - content.length;
    const over = remaining < 0;
    const canPost = content.trim().length > 0 && !over;
    const { isAuthenticated } = useAuth();

    async function handleSubmit() {
      if (!canPost) return;

      if (isAuthenticated) {
        // Save to real database via API
        try {
          const res = await fetch('/api/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, language }),
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Failed to post');
          }
          toast({
            title: 'Your post is live',
            description: `Posted in ${languageLabel(language)}.`,
          });
          setContent('');
          onPosted?.();
          // Reload the feed to show the new post
          window.location.reload();
        } catch (err) {
          toast({
            title: 'Error',
            description: err instanceof Error ? err.message : 'Failed to post',
            variant: 'destructive',
          });
        }
      } else {
        // Demo mode — save to Zustand store only
        addPost(content, language);
        toast({
          title: 'Your post is live',
          description: `Posted in ${languageLabel(language)}. This is demonstration data — it is not saved to a database. Log in to save posts permanently.`,
        });
        setContent('');
        onPosted?.();
      }
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
      // Cmd/Ctrl + Enter to post — handy on desktop.
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    }

    const currentUser = DEMO_USER_MAP[CURRENT_USER_ID];

    return (
      <div
        className={cn(
          'flex gap-3 border-b border-border p-4',
          variant === 'floating' && 'rounded-2xl border bg-card p-5 shadow-sm',
        )}
      >
        <UserAvatar user={currentUser} size="md" className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <textarea
            ref={taRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What’s happening around you?"
            rows={variant === 'floating' ? 5 : 3}
            aria-label="Post content"
            maxLength={MAX_CHARS + 50}
            className="w-full resize-none bg-transparent text-[17px] leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none"
          />

          {/* Language picker */}
          <div className="mb-3 mt-2 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Globe className="h-3.5 w-3.5" />
              Post in
            </span>
            {LANG_OPTIONS.map((opt) => {
              const active = language === opt.code;
              return (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => setLanguage(opt.code)}
                  className={cn(
                    'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                    active
                      ? 'bg-saffron text-white'
                      : 'bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground',
                  )}
                  aria-pressed={active}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3">
            {/* Attachment affordances — visual only for this prototype */}
            <div className="flex items-center gap-1 text-saffron">
              {[
                { icon: ImageIcon, label: 'Add image' },
                { icon: BarChart3, label: 'Add poll' },
                { icon: Smile, label: 'Add emoji' },
                { icon: MapPin, label: 'Add location' },
              ].map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  type="button"
                  aria-label={label}
                  className="rounded-full p-2 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Icon className="h-[18px] w-[18px]" />
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              {content.length > 0 && (
                <span
                  className={cn(
                    'text-xs tabular-nums',
                    over ? 'text-destructive' : 'text-muted-foreground',
                  )}
                  aria-live="polite"
                >
                  {remaining}
                </span>
              )}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canPost}
                className={cn(
                  'rounded-full bg-saffron px-5 py-2 text-sm font-semibold text-white shadow-soft transition-all',
                  'hover:brightness-105 active:scale-[0.98]',
                  'disabled:cursor-not-allowed disabled:opacity-40',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                )}
              >
                Post
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

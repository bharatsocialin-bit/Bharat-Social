'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { CURRENT_USER_ID, DEMO_USER_MAP } from '@/data/users';
import { UserAvatar } from './UserAvatar';
import { languageLabel } from '@/lib/format';
import { TimeAgo } from './TimeAgo';
import type { DemoReply, Language } from '@/lib/types';

const LANG_OPTIONS: { code: Language; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'hi', label: 'हि' },
  { code: 'te', label: 'తె' },
  { code: 'ta', label: 'த' },
  { code: 'bn', label: 'বা' },
  { code: 'mr', label: 'म' },
  { code: 'kn', label: 'ಕ' },
  { code: 'ml', label: 'മ' },
  { code: 'gu', label: 'ગુ' },
  { code: 'pa', label: 'ਪੰ' },
  { code: 'or', label: 'ଓ' },
  { code: 'ur', label: 'اردو' },
];

interface ReplyPanelProps {
  postId: string;
  replies: DemoReply[];
  onSubmit: (content: string, language: Language) => void;
  onCancel: () => void;
}

export function ReplyPanel({ postId, replies, onSubmit, onCancel }: ReplyPanelProps) {
  const [content, setContent] = useState('');
  const [language, setLanguage] = useState<Language>('en');
  const currentUser = DEMO_USER_MAP[CURRENT_USER_ID];

  const canSubmit = content.trim().length > 0;

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit(content, language);
    setContent('');
  }

  return (
    <div className="mt-3 rounded-2xl border border-border bg-muted/30 p-3" aria-label={`Replies for post ${postId}`}>
      {/* Existing replies */}
      {replies.length > 0 && (
        <ul className="mb-3 space-y-3">
          {replies.map((r) => {
            const author = DEMO_USER_MAP[r.authorId];
            if (!author) return null;
            return (
              <li key={r.id} className="flex gap-2.5">
                <UserAvatar user={author} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-[13px]">
                    <span className="font-semibold text-foreground">{author.name}</span>
                    <span className="text-muted-foreground">@{author.handle}</span>
                    <span className="text-muted-foreground">·</span>
                    <TimeAgo
                      iso={r.createdAt}
                      className="text-muted-foreground"
                    />
                    {r.language !== 'en' && (
                      <span className="ml-1 rounded-full bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {languageLabel(r.language)}
                      </span>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed text-foreground">
                    {r.content}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {replies.length === 0 && (
        <p className="mb-3 text-[13px] text-muted-foreground">
          Be the first to reply — keep it kind.
        </p>
      )}

      {/* Composer */}
      <div className="flex gap-2.5">
        <UserAvatar user={currentUser} size="sm" />
        <div className="min-w-0 flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Post your reply"
            rows={2}
            aria-label="Reply text"
            className="w-full resize-none rounded-xl bg-background px-3 py-2 text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-1">
              {LANG_OPTIONS.map((opt) => {
                const active = language === opt.code;
                return (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => setLanguage(opt.code)}
                    aria-pressed={active}
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors',
                      active
                        ? 'bg-brand text-brand-foreground'
                        : 'bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-brand-foreground transition-all hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Reply
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

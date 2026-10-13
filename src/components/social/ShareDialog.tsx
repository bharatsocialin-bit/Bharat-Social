'use client';

import { Copy, Check, Link as LinkIcon, Send } from 'lucide-react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import type { DemoPost } from '@/lib/types';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: DemoPost;
}

/**
 * Local-only "share" surface. No real outbound sharing happens —
 * this is a safe demonstration interaction only.
 */
export function ShareDialog({ open, onOpenChange, post }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  // Build a fake share URL — it points back at the prototype root so it
  // never leaves the demo context.
  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?post=${post.id}`
      : `https://india-social.example/?post=${post.id}`;

  function handleCopy() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).catch(() => {});
    }
    setCopied(true);
    toast({
      title: 'Link copied',
      description: 'A shareable link for this post is on your clipboard (demonstration only).',
    });
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share this post</DialogTitle>
          <DialogDescription>
            Pick how you’d like to share. This is a safe, local demonstration —
            no message is actually sent to anyone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Share targets — visual only */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'WhatsApp', color: 'bg-emerald-500' },
              { label: 'Telegram', color: 'bg-sky-500' },
              { label: 'Email', color: 'bg-amber-500' },
            ].map(({ label, color }) => (
              <button
                key={label}
                type="button"
                onClick={() =>
                  toast({
                    title: `${label} — demonstration only`,
                    description:
                      'In a production build this would open the platform’s share sheet. Nothing is sent.',
                  })
                }
                className="flex flex-col items-center gap-2 rounded-xl p-3 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${color} text-white`}
                >
                  <Send className="h-4 w-4" />
                </span>
                <span className="text-xs font-medium text-foreground">{label}</span>
              </button>
            ))}
          </div>

          {/* Copy link */}
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <LinkIcon className="h-3.5 w-3.5" />
              Shareable link
            </div>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={shareUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="min-w-0 flex-1 truncate rounded-lg bg-background px-2.5 py-1.5 text-xs text-muted-foreground"
                aria-label="Shareable link"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground transition-colors hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

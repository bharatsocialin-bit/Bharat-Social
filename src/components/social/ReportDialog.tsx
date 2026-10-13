'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Loader2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId?: string;
  shortId?: string;
  reportedUserId?: string;
  reportedName?: string;
}

const REPORT_REASONS = [
  'Spam or misleading',
  'Harassment or bullying',
  'Hate speech',
  'Violence or dangerous content',
  'False information',
  'Other (specify below)',
];

export function ReportDialog({
  open,
  onOpenChange,
  postId,
  shortId,
  reportedUserId,
  reportedName,
}: ReportDialogProps) {
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const finalReason = reason === 'Other (specify below)' ? customReason : reason;
    if (!finalReason || finalReason.trim().length < 3) {
      toast({
        title: 'Invalid reason',
        description: 'Please provide a reason (at least 3 characters).',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: postId || undefined,
          shortId: shortId || undefined,
          reportedUserId: reportedUserId || undefined,
          reason: finalReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit report');
      }

      toast({
        title: 'Report submitted',
        description: 'Thank you. Our team will review it.',
      });
      setReason('');
      setCustomReason('');
      onOpenChange(false);
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to submit report',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border bg-card p-0 sm:rounded-2xl">
        <DialogTitle className="sr-only">Report content</DialogTitle>
        <DialogDescription className="sr-only">
          Submit a report for review by our moderation team
        </DialogDescription>

        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-bold text-white">
            Report {reportedName ? `@${reportedName}` : 'this post'}
          </h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <p className="text-sm text-muted-foreground">
            Why are you reporting this? Your report will be reviewed by our team.
            Your identity is not shared with the reported user.
          </p>

          <div className="space-y-2">
            {REPORT_REASONS.map((r) => (
              <label
                key={r}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-saffron-soft/20"
              >
                <input
                  type="radio"
                  name="reason"
                  value={r}
                  checked={reason === r}
                  onChange={(e) => setReason(e.target.value)}
                  className="h-4 w-4 accent-saffron"
                />
                <span className="text-sm text-white">{r}</span>
              </label>
            ))}
          </div>

          {reason === 'Other (specify below)' && (
            <div>
              <Label htmlFor="custom-reason" className="text-muted-foreground">
                Please specify
              </Label>
              <textarea
                id="custom-reason"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Describe the issue..."
                className="mt-1 w-full resize-none rounded-xl bg-background border border-border px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:border-saffron focus:outline-none focus:ring-2 focus:ring-saffron/20"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !reason}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-destructive px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Report'
            )}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { PostComposer } from './PostComposer';

interface ComposeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Mobile / floating post composer. Wraps PostComposer in a dialog. */
export function ComposeDialog({ open, onOpenChange }: ComposeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl gap-0 p-0 sm:rounded-2xl">
        {/* Accessible title/description — visually hidden but available to SRs. */}
        <DialogTitle className="sr-only">Compose a new post</DialogTitle>
        <DialogDescription className="sr-only">
          Write what’s happening. Posts in this prototype are demonstration only.
        </DialogDescription>
        <PostComposer variant="floating" onPosted={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

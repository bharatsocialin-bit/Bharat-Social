'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Download, Copy, Link2, Share2, MessageCircle, Facebook, Instagram,
  Loader2, Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface LoadedChapter {
  translation: string;
  book: string;
  bookName: string;
  chapter: number;
}

interface Verse {
  verse: number;
  text: string;
}

interface VerseShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapter: LoadedChapter | null;
  verse: Verse | null;
}

// ── Size presets ───────────────────────────────────────────────────────────

type SizeKey = 'square' | 'story' | 'portrait';

const SIZES: Record<SizeKey, { w: number; h: number; label: string }> = {
  square: { w: 1080, h: 1080, label: 'Square 1:1' },
  story: { w: 1080, h: 1920, label: 'Story 9:16' },
  portrait: { w: 1080, h: 1350, label: 'Portrait 4:5' },
};

// ── Background gradients ───────────────────────────────────────────────────

const GRADIENTS = [
  { name: 'Royal Blue', from: '#0B2545', via: '#1B3B6F', to: '#2563EB' },
  { name: 'Midnight', from: '#0a0a0f', via: '#1a1a2e', to: '#16213e' },
  { name: 'Saffron Gold', from: '#1a1a2e', via: '#3d2c1e', to: '#FF9933' },
  { name: 'Forest', from: '#0a1a0a', via: '#1a3a1a', to: '#138808' },
  { name: 'Sunset', from: '#2d1b4e', via: '#6b2d5c', to: '#FF6B35' },
  { name: 'Ocean', from: '#0a1929', via: '#0d3b66', to: '#1d6fa5' },
];

// ── Component ──────────────────────────────────────────────────────────────

export function VerseShareDialog({
  open,
  onOpenChange,
  chapter,
  verse,
}: VerseShareDialogProps) {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sizeKey, setSizeKey] = useState<SizeKey>('square');
  const [gradientIdx, setGradientIdx] = useState(0);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const reference = chapter && verse
    ? `${chapter.bookName} ${chapter.chapter}:${verse.verse}`
    : '';
  const translationLabel = chapter?.translation || 'KJV';

  // ── Generate the verse image on canvas ──
  const generateImage = useCallback(async () => {
    if (!chapter || !verse || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const { w, h } = SIZES[sizeKey];
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setGenerating(true);

    try {
      // Draw gradient background
      const gradient = GRADIENTS[gradientIdx];
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, gradient.from);
      grad.addColorStop(0.5, gradient.via);
      grad.addColorStop(1, gradient.to);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Add subtle radial glow in center-top
      const radial = ctx.createRadialGradient(w / 2, h * 0.3, 0, w / 2, h * 0.3, w * 0.6);
      radial.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
      radial.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = radial;
      ctx.fillRect(0, 0, w, h);

      // Padding
      const padding = w * 0.08;

      // ── Top: "BIBLE VERSE • TRANSLATION" eyebrow text ──
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = `600 ${w * 0.022}px Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const eyebrow = `BIBLE VERSE • ${translationLabel.toUpperCase()}`;
      // Letter-spacing simulation
      drawSpacedText(ctx, eyebrow, w / 2, padding + h * 0.05, w * 0.008);

      // ── Reference (large bold) ──
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${w * 0.052}px Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.fillText(reference, w / 2, padding + h * 0.09);

      // ── Verse text (wrapped, centered vertically) ──
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      const fontSize = w * 0.038;
      ctx.font = `${fontSize}px Georgia, serif`;
      ctx.textAlign = 'center';

      // Wrap text
      const maxWidth = w - padding * 2;
      const verseText = `${verse.verse} ${verse.text}`;
      const lines = wrapText(ctx, verseText, maxWidth);
      const lineHeight = fontSize * 1.6;
      const totalHeight = lines.length * lineHeight;
      const startY = h / 2 - totalHeight / 2 + h * 0.02;

      lines.forEach((line, i) => {
        ctx.fillText(line, w / 2, startY + i * lineHeight);
      });

      // ── Bottom: "lordsbook.com" pill badge ──
      const pillText = 'lordsbook.com';
      ctx.font = `600 ${w * 0.025}px Arial, sans-serif`;
      const pillWidth = ctx.measureText(pillText).width + w * 0.06;
      const pillHeight = h * 0.045;
      const pillX = w / 2 - pillWidth / 2;
      const pillY = h - padding - h * 0.05;

      // Pill background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      roundRect(ctx, pillX, pillY, pillWidth, pillHeight, pillHeight / 2);
      ctx.fill();

      // Pill text
      ctx.fillStyle = gradient.from;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pillText, w / 2, pillY + pillHeight / 2);

      // Convert to blob URL
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/png', 0.95);
      });
      if (blob) {
        if (imageUrl) URL.revokeObjectURL(imageUrl);
        setImageUrl(URL.createObjectURL(blob));
      }
    } catch (err) {
      console.error('Image generation failed:', err);
    } finally {
      setGenerating(false);
    }
  }, [chapter, verse, sizeKey, gradientIdx, imageUrl, reference, translationLabel]);

  // ── Regenerate image when inputs change ──
  useEffect(() => {
    if (open && chapter && verse) {
      void generateImage();
    }
  }, [open, sizeKey, gradientIdx, chapter, verse]);

  // ── Actions ──
  function handleDownload() {
    if (!imageUrl) return;
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `${reference.replace(/[:\s]/g, '_')}_lordsbook.png`;
    a.click();
  }

  function handleCopyText() {
    if (!chapter || !verse) return;
    const text = `"${verse.text}" — ${reference} (${translationLabel})`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    });
  }

  function handleCopyLink() {
    if (!chapter || !verse) return;
    const link = `${window.location.origin}/?nav=bible&translation=${chapter.translation}&book=${chapter.book}&chapter=${chapter.chapter}&verse=${verse.verse}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  }

  function handleShareNative() {
    if (!chapter || !verse) return;
    const text = `"${verse.text}" — ${reference} (${translationLabel})`;
    if (navigator.share) {
      navigator.share({ text, title: reference }).catch(() => {});
    } else {
      handleCopyText();
    }
  }

  function handleWhatsApp() {
    if (!chapter || !verse) return;
    const text = encodeURIComponent(`"${verse.text}" — ${reference} (${translationLabel})`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  function handleFacebook() {
    if (!chapter || !verse) return;
    const url = encodeURIComponent(window.location.origin);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
  }

  function handleInstagram() {
    if (!imageUrl) return;
    // Download the image — Instagram doesn't support direct URL sharing via web
    handleDownload();
    toast({
      title: 'Image downloaded',
      description: 'Open Instagram and upload the downloaded image.',
    });
  }

  // ── Render ──
  if (!chapter || !verse) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border bg-[#1a1a1e] p-0 sm:rounded-2xl">
        <DialogTitle className="sr-only">Share {reference}</DialogTitle>

        {/* Hidden canvas for image generation */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="flex items-center gap-2 text-sm font-bold text-white">
            <Share2 className="h-4 w-4 text-saffron" />
            {reference} ({translationLabel})
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Size selector */}
        <div className="flex gap-2 px-5 py-3">
          {(Object.keys(SIZES) as SizeKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setSizeKey(key)}
              className={cn(
                'flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                sizeKey === key
                  ? 'bg-saffron text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10',
              )}
            >
              {SIZES[key].label}
            </button>
          ))}
        </div>

        {/* Gradient selector */}
        <div className="flex gap-2 px-5 pb-3">
          {GRADIENTS.map((g, i) => (
            <button
              key={g.name}
              onClick={() => setGradientIdx(i)}
              className={cn(
                'h-8 w-8 rounded-full ring-2 ring-offset-2 ring-offset-[#1a1a1e] transition-all',
                gradientIdx === i ? 'ring-white' : 'ring-transparent',
              )}
              style={{
                background: `linear-gradient(135deg, ${g.from}, ${g.via}, ${g.to})`,
              }}
              aria-label={g.name}
            />
          ))}
        </div>

        {/* Preview */}
        <div className="px-5 py-3">
          {generating ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-saffron" />
            </div>
          ) : imageUrl ? (
            <div className="flex justify-center">
              <img
                src={imageUrl}
                alt={`${reference} share image`}
                className="max-h-72 rounded-xl object-contain"
              />
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-white/40">
              Image will appear here
            </div>
          )}
        </div>

        {/* Share buttons */}
        <div className="grid grid-cols-2 gap-2 px-5 py-3">
          <button
            onClick={handleShareNative}
            className="flex items-center justify-center gap-2 rounded-lg bg-saffron px-4 py-2.5 text-sm font-medium text-white transition-colors hover:brightness-110"
          >
            <Share2 className="h-4 w-4" />
            Share Image
          </button>
          <button
            onClick={handleWhatsApp}
            className="flex items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:brightness-110"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </button>
          <button
            onClick={handleFacebook}
            className="flex items-center justify-center gap-2 rounded-lg bg-[#1877F2] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:brightness-110"
          >
            <Facebook className="h-4 w-4" />
            Facebook
          </button>
          <button
            onClick={handleInstagram}
            className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#E1306C] to-[#F77737] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:brightness-110"
          >
            <Instagram className="h-4 w-4" />
            Instagram
          </button>
          <button
            onClick={handleDownload}
            disabled={!imageUrl}
            className="flex items-center justify-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/20 disabled:opacity-40"
          >
            <Download className="h-4 w-4" />
            Download Image
          </button>
          <button
            onClick={handleCopyText}
            className="flex items-center justify-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/20"
          >
            {copiedText ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
            Copy Text
          </button>
          <button
            onClick={handleCopyLink}
            className="col-span-2 flex items-center justify-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/20"
          >
            {copiedLink ? <Check className="h-4 w-4 text-green-400" /> : <Link2 className="h-4 w-4" />}
            Copy Link
          </button>
        </div>

        {/* Footer note */}
        <div className="px-5 py-3 text-center">
          <p className="text-[11px] text-white/30">
            Links open the content on lordsbook.com
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Canvas helpers ─────────────────────────────────────────────────────────

/** Draw text with letter spacing on canvas. */
function drawSpacedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  spacing: number,
) {
  const chars = text.split('');
  const widths = chars.map((c) => ctx.measureText(c).width);
  const totalWidth = widths.reduce((sum, w) => sum + w, 0) + spacing * (chars.length - 1);
  let curX = x - totalWidth / 2;
  chars.forEach((c, i) => {
    ctx.textAlign = 'left';
    ctx.fillText(c, curX, y);
    curX += widths[i] + spacing;
  });
  ctx.textAlign = 'center';
}

/** Wrap text into lines that fit within maxWidth. */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

/** Draw a rounded rectangle. */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

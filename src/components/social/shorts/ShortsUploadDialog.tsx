'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Upload,
  Film,
  X,
  Check,
  AlertCircle,
  Loader2,
  Globe,
  Hash,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { Language } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface ShortsUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded?: () => void;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB — must match server's MAX_SHORT_FILE_SIZE
const MAX_DURATION = 180; // 3 minutes — must match server's MAX_SHORT_DURATION_SECONDS
const ACCEPTED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ACCEPTED_EXTENSIONS = '.mp4,.webm,.mov';

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

type UploadPhase = 'select' | 'validating' | 'preview' | 'uploading' | 'success' | 'error';

export function ShortsUploadDialog({ open, onOpenChange, onUploaded }: ShortsUploadDialogProps) {
  const [phase, setPhase] = useState<UploadPhase>('select');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [duration, setDuration] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [caption, setCaption] = useState('');
  const [hashtagInput, setHashtagInput] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [language, setLanguage] = useState<Language>('en');
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();

  function reset() {
    setPhase('select');
    setVideoFile(null);
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl('');
    setDuration(0);
    setErrorMsg('');
    setCaption('');
    setHashtagInput('');
    setHashtags([]);
    setLanguage('en');
    setUploadProgress(0);
  }

  function handleClose(open: boolean) {
    if (!open) {
      reset();
    }
    onOpenChange(open);
  }

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg('');

    // Basic client-side type check (the server does its own magic-byte check;
    // this is just a friendlier early failure).
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const looksValid =
      ACCEPTED_TYPES.includes(file.type) ||
      ['mp4', 'webm', 'mov'].includes(extension);
    if (!looksValid) {
      setErrorMsg(
        `Unsupported file type: ${file.type || 'unknown'}. Please use MP4, WebM, or MOV.`,
      );
      setPhase('error');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setErrorMsg(
        `File is too large: ${(file.size / 1024 / 1024).toFixed(1)} MB. Maximum is ${MAX_FILE_SIZE / 1024 / 1024} MB.`,
      );
      setPhase('error');
      return;
    }

    setPhase('validating');
    const url = URL.createObjectURL(file);
    setVideoFile(file);
    setVideoUrl(url);

    // Check duration client-side. The server enforces this too if we
    // pass `duration` in the upload payload.
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const dur = video.duration;
      setDuration(dur);
      if (dur > MAX_DURATION) {
        setErrorMsg(
          `Video is ${Math.round(dur)}s long. Maximum duration is ${MAX_DURATION}s (3 minutes).`,
        );
        URL.revokeObjectURL(url);
        setVideoUrl('');
        setVideoFile(null);
        setPhase('error');
      } else {
        setPhase('preview');
      }
    };
    video.onerror = () => {
      setErrorMsg('Could not read the video file. It may be corrupted or in an unsupported format.');
      URL.revokeObjectURL(url);
      setVideoUrl('');
      setVideoFile(null);
      setPhase('error');
    };
    video.src = url;
  }, []);

  function addHashtag() {
    const tag = hashtagInput.trim().replace(/^#/, '').replace(/\s+/g, '-').toLowerCase();
    if (tag && !hashtags.includes(tag) && hashtags.length < 10) {
      setHashtags([...hashtags, tag]);
      setHashtagInput('');
    }
  }

  function handleHashtagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addHashtag();
    }
  }

  function removeHashtag(tag: string) {
    setHashtags(hashtags.filter((t) => t !== tag));
  }

  async function handlePublish() {
    if (!videoFile) return;
    if (!caption.trim()) {
      setErrorMsg('Caption cannot be empty.');
      setPhase('error');
      return;
    }
    setPhase('uploading');
    setUploadProgress(0);

    // Build the multipart form. We send JSON-encoded fields plus the file.
    // The server validates the file (magic bytes + size) and stores it
    // under public/uploads/shorts/ with a random filename.
    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('caption', caption.trim());
    formData.append('hashtags', JSON.stringify(hashtags));
    formData.append('language', language);
    if (duration > 0) formData.append('duration', String(duration));

    // Use XMLHttpRequest so we can show real upload progress.
    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(pct);
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            let msg = 'Upload failed';
            try {
              const data = JSON.parse(xhr.responseText);
              msg = data.error || msg;
            } catch {
              // keep default msg
            }
            reject(new Error(msg));
          }
        };
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.open('POST', '/api/shorts');
        xhr.send(formData);
      });

      setPhase('success');
      toast({
        title: 'Short published!',
        description: 'Your short is now live in the Desily feed.',
      });
      onUploaded?.();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Upload failed');
      setPhase('error');
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0 sm:rounded-2xl border-white/10 bg-slate-900 text-white">
        <DialogTitle className="sr-only">Upload a Short</DialogTitle>
        <DialogDescription className="sr-only">
          Select a vertical video, add a caption and hashtags, then publish.
          The video is uploaded to the server and stored under public/uploads/shorts/.
        </DialogDescription>

        {/* Header */}
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <Upload className="h-5 w-5 text-saffron" />
          <h2 className="text-base font-semibold">Upload Short</h2>
          <button
            type="button"
            onClick={() => handleClose(false)}
            className="ml-auto rounded-full p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto scrollbar-thin">
          {/* ── Phase: select ─────────────────────────────────────────── */}
          {phase === 'select' && (
            <div className="p-6">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-white/15 bg-white/5 p-8 text-center transition-colors hover:border-saffron hover:bg-saffron/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-saffron/20 text-saffron">
                  <Upload className="h-7 w-7" />
                </span>
                <span className="text-sm font-medium">Select a video to upload</span>
                <span className="text-xs text-white/50">
                  MP4, WebM or MOV · up to {MAX_FILE_SIZE / 1024 / 1024} MB · max {MAX_DURATION}s
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_EXTENSIONS}
                onChange={handleFileSelect}
                className="hidden"
                aria-label="Select video file"
              />
              <div className="mt-4 rounded-xl bg-amber-500/10 px-3 py-2 ring-1 ring-amber-500/30">
                <p className="text-xs text-amber-200">
                  <strong>Development-only storage:</strong> files are saved to{' '}
                  <code className="rounded bg-black/30 px-1 py-0.5 text-[10px]">public/uploads/shorts/</code>{' '}
                  on the local server. The server validates file type via magic bytes — never trust
                  the filename. For production, swap in S3 / Supabase Storage / a CDN.
                </p>
              </div>
            </div>
          )}

          {/* ── Phase: validating ────────────────────────────────────── */}
          {phase === 'validating' && (
            <div className="flex flex-col items-center gap-3 p-8">
              <Loader2 className="h-8 w-8 animate-spin text-saffron" />
              <p className="text-sm text-white/70">Validating video…</p>
            </div>
          )}

          {/* ── Phase: preview / uploading ───────────────────────────── */}
          {(phase === 'preview' || phase === 'uploading') && (
            <div className="space-y-4 p-4">
              {/* Video preview */}
              <div className="relative mx-auto aspect-[9/16] max-h-[50vh] overflow-hidden rounded-xl bg-black">
                <video
                  src={videoUrl}
                  className="h-full w-full object-contain"
                  controls
                  playsInline
                />
                <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
                  {Math.round(duration)}s
                </span>
              </div>

              {/* Caption */}
              <div>
                <label htmlFor="short-caption" className="mb-1 block text-xs font-medium">
                  Caption
                </label>
                <textarea
                  id="short-caption"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Write a caption…"
                  rows={2}
                  maxLength={280}
                  disabled={phase === 'uploading'}
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-saffron focus:outline-none focus:ring-2 focus:ring-saffron/20 disabled:opacity-50"
                />
                <span className="mt-0.5 block text-right text-[11px] text-white/40">
                  {caption.length}/280
                </span>
              </div>

              {/* Hashtags */}
              <div>
                <label htmlFor="short-hashtags" className="mb-1 block text-xs font-medium">
                  Hashtags
                </label>
                <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  <Hash className="h-4 w-4 text-white/40" />
                  <input
                    id="short-hashtags"
                    value={hashtagInput}
                    onChange={(e) => setHashtagInput(e.target.value)}
                    onKeyDown={handleHashtagKeyDown}
                    placeholder="Add a hashtag and press Enter"
                    disabled={phase === 'uploading'}
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={addHashtag}
                    disabled={phase === 'uploading' || !hashtagInput.trim()}
                    className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium hover:bg-white/20 disabled:opacity-40"
                  >
                    Add
                  </button>
                </div>
                {hashtags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {hashtags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full bg-saffron/15 px-2.5 py-0.5 text-xs font-medium text-saffron"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() => removeHashtag(tag)}
                          disabled={phase === 'uploading'}
                          className="ml-0.5 rounded-full hover:bg-saffron/20"
                          aria-label={`Remove hashtag ${tag}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Language picker */}
              <div>
                <label className="mb-1 flex items-center gap-1 text-xs font-medium">
                  <Globe className="h-3 w-3" />
                  Post language
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {LANG_OPTIONS.map((opt) => (
                    <button
                      key={opt.code}
                      type="button"
                      onClick={() => setLanguage(opt.code)}
                      disabled={phase === 'uploading'}
                      className={cn(
                        'rounded-full px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50',
                        language === opt.code
                          ? 'bg-saffron text-white'
                          : 'bg-white/10 text-white hover:bg-white/20',
                      )}
                      aria-pressed={language === opt.code}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload progress */}
              {phase === 'uploading' && (
                <div className="rounded-xl bg-white/5 p-3">
                  <div className="mb-1.5 flex items-center gap-2 text-xs text-white/70">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Uploading… {uploadProgress}%
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full bg-saffron transition-[width] duration-150"
                      style={{ width: `${uploadProgress}%` }}
                      role="progressbar"
                      aria-valuenow={uploadProgress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    />
                  </div>
                </div>
              )}

              {/* Publish button */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleClose(false)}
                  disabled={phase === 'uploading'}
                  className="flex-1 rounded-full border border-white/15 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={phase === 'uploading'}
                  className="flex-1 rounded-full bg-saffron px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {phase === 'uploading' ? 'Publishing…' : 'Publish'}
                </button>
              </div>
            </div>
          )}

          {/* ── Phase: success ───────────────────────────────────────── */}
          {phase === 'success' && (
            <div className="flex flex-col items-center gap-3 p-8 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30">
                <Check className="h-7 w-7" />
              </span>
              <h3 className="text-base font-semibold">Short published!</h3>
              <p className="text-sm text-white/60">
                Your short is now live in the Desily Shorts feed.
              </p>
              <button
                type="button"
                onClick={() => handleClose(false)}
                className="mt-2 rounded-full bg-saffron px-5 py-2 text-sm font-semibold text-white hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
              >
                Done
              </button>
            </div>
          )}

          {/* ── Phase: error ─────────────────────────────────────────── */}
          {phase === 'error' && (
            <div className="flex flex-col items-center gap-3 p-8 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30">
                <AlertCircle className="h-7 w-7" />
              </span>
              <h3 className="text-base font-semibold">Upload failed</h3>
              <p className="text-sm text-white/60">{errorMsg}</p>
              <button
                type="button"
                onClick={() => setPhase('select')}
                className="mt-2 rounded-full bg-saffron px-5 py-2 text-sm font-semibold text-white hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

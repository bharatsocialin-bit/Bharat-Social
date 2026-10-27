'use client';

import { useState, useRef, useCallback } from 'react';
import { X, Type, Image as ImageIcon, Video, Link2, Loader2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSocialStore } from '@/store/useSocialStore';
import {
  STORY_BG_GRADIENT,
  STORY_BG_PALETTE,
  STORY_TEXT_MAX,
  type StoryBgKey,
  type StoryKind,
} from '@/lib/pulse/user-stories';

// ============================================================================
// StoryCreator — full-screen composer for the four story kinds:
//   Text / Photo / Video / Link
//
// Submits via /api/pulse/stories/user (multipart for photo/video, JSON for
// text/link). On success: closes the composer and opens the viewer at the
// creator's group.
// ============================================================================

type Tab = StoryKind;

const TABS: Array<{ key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: 'text', label: 'Text', icon: Type },
  { key: 'photo', label: 'Photo', icon: ImageIcon },
  { key: 'video', label: 'Video', icon: Video },
  { key: 'link', label: 'Link', icon: Link2 },
];

export function StoryCreator() {
  const open = useSocialStore((s) => s.storyCreatorOpen);
  const setOpen = useSocialStore((s) => s.setStoryCreatorOpen);
  const openStoryViewer = useSocialStore((s) => s.openStoryViewer);

  const [tab, setTab] = useState<Tab>('text');
  const [textContent, setTextContent] = useState('');
  const [caption, setCaption] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [bgColor, setBgColor] = useState<StoryBgKey>('saffron');
  const [textColor, setTextColor] = useState<'white' | 'black'>('white');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setTextContent('');
    setCaption('');
    setLinkUrl('');
    setBgColor('saffron');
    setTextColor('white');
    setPhotoFile(null);
    setPhotoPreview(null);
    setVideoFile(null);
    setVideoPreview(null);
    setError(null);
    setTab('text');
  }, []);

  const close = useCallback(() => {
    if (submitting) return;
    setOpen(false);
    // Defer reset so the close animation doesn't flash empty state.
    setTimeout(reset, 200);
  }, [submitting, setOpen, reset]);

  if (!open) return null;

  // ── File handlers ──
  const onPhotoPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      setError('Photo is too large. Maximum size is 10 MB.');
      return;
    }
    setError(null);
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
  };
  const onVideoPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 50 * 1024 * 1024) {
      setError('Video is too large. Maximum size is 50 MB.');
      return;
    }
    setError(null);
    setVideoFile(f);
    setVideoPreview(URL.createObjectURL(f));
  };

  // ── Submit ──
  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      let r: Response;
      if (tab === 'text') {
        r = await fetch('/api/pulse/stories/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kind: 'text',
            textContent,
            backgroundColor: bgColor,
            textColor,
          }),
        });
      } else if (tab === 'link') {
        r = await fetch('/api/pulse/stories/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kind: 'link',
            linkUrl,
            caption: caption || undefined,
            backgroundColor: bgColor,
            textColor,
          }),
        });
      } else if (tab === 'photo') {
        if (!photoFile) {
          setError('Please choose a photo.');
          setSubmitting(false);
          return;
        }
        const form = new FormData();
        form.append('kind', 'photo');
        form.append('photo', photoFile);
        if (caption) form.append('caption', caption);
        r = await fetch('/api/pulse/stories/user', { method: 'POST', body: form });
      } else {
        // video
        if (!videoFile) {
          setError('Please choose a video.');
          setSubmitting(false);
          return;
        }
        const form = new FormData();
        form.append('kind', 'video');
        form.append('video', videoFile);
        if (caption) form.append('caption', caption);
        r = await fetch('/api/pulse/stories/user', { method: 'POST', body: form });
      }

      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setError(d.error || 'Failed to post story.');
        setSubmitting(false);
        return;
      }
      const data = await r.json();
      // Open the viewer at the new story.
      if (data?.story?.author?.id) {
        openStoryViewer(data.story.author.id, 0);
      } else {
        setOpen(false);
      }
      reset();
    } catch (err) {
      console.error('Story submit error:', err);
      setError('Failed to post story. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit =
    !submitting &&
    ((tab === 'text' && textContent.trim().length > 0) ||
      (tab === 'photo' && photoFile) ||
      (tab === 'video' && videoFile) ||
      (tab === 'link' && linkUrl.trim().length > 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur">
      <div className="relative flex h-full w-full max-w-md flex-col bg-background text-foreground">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <button
            onClick={close}
            disabled={submitting}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-accent disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
          <h2 className="text-sm font-semibold">New Story</h2>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex items-center gap-1.5 rounded-full bg-saffron px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Post
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors',
                tab === key ? 'border-b-2 border-saffron text-saffron' : 'text-muted-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </div>
          )}

          {tab === 'text' && (
            <div className="space-y-4">
              <div
                className={cn(
                  'flex min-h-[200px] items-center justify-center rounded-2xl bg-gradient-to-br p-6',
                  STORY_BG_GRADIENT[bgColor],
                )}
              >
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value.slice(0, STORY_TEXT_MAX))}
                  placeholder="Type your story…"
                  rows={4}
                  className={cn(
                    'w-full resize-none bg-transparent text-center text-xl font-semibold outline-none placeholder:opacity-50',
                    textColor === 'black' ? 'text-black' : 'text-white',
                  )}
                  style={{ caretColor: textColor === 'black' ? 'black' : 'white' }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{textContent.length} / {STORY_TEXT_MAX}</span>
              </div>
              <StyleControls
                bgColor={bgColor}
                setBgColor={setBgColor}
                textColor={textColor}
                setTextColor={setTextColor}
              />
            </div>
          )}

          {tab === 'photo' && (
            <div className="space-y-4">
              <div className="flex min-h-[200px] items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Photo preview"
                    className="max-h-[300px] w-full rounded-xl object-contain"
                  />
                ) : (
                  <button
                    onClick={() => photoInputRef.current?.click()}
                    className="flex flex-col items-center gap-2 p-8 text-muted-foreground hover:text-foreground"
                  >
                    <ImageIcon className="h-10 w-10" />
                    <span className="text-sm">Tap to choose a photo</span>
                    <span className="text-[11px]">JPEG, PNG, or WebP · max 10 MB</span>
                  </button>
                )}
              </div>
              {photoPreview && (
                <button
                  onClick={() => photoInputRef.current?.click()}
                  className="text-xs text-saffron hover:underline"
                >
                  Change photo
                </button>
              )}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={onPhotoPick}
                className="hidden"
              />
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value.slice(0, STORY_TEXT_MAX))}
                placeholder="Add a caption (optional)…"
                rows={2}
                className="w-full resize-none rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-saffron"
              />
              <p className="text-[11px] text-muted-foreground">
                {caption.length} / {STORY_TEXT_MAX}
              </p>
            </div>
          )}

          {tab === 'video' && (
            <div className="space-y-4">
              <div className="flex min-h-[200px] items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card">
                {videoPreview ? (
                  <video
                    src={videoPreview}
                    className="max-h-[300px] w-full rounded-xl object-contain"
                    controls
                    muted
                  />
                ) : (
                  <button
                    onClick={() => videoInputRef.current?.click()}
                    className="flex flex-col items-center gap-2 p-8 text-muted-foreground hover:text-foreground"
                  >
                    <Video className="h-10 w-10" />
                    <span className="text-sm">Tap to choose a video</span>
                    <span className="text-[11px]">MP4, WebM, or MOV · max 50 MB</span>
                  </button>
                )}
              </div>
              {videoPreview && (
                <button
                  onClick={() => videoInputRef.current?.click()}
                  className="text-xs text-saffron hover:underline"
                >
                  Change video
                </button>
              )}
              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={onVideoPick}
                className="hidden"
              />
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value.slice(0, STORY_TEXT_MAX))}
                placeholder="Add a caption (optional)…"
                rows={2}
                className="w-full resize-none rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-saffron"
              />
              <p className="text-[11px] text-muted-foreground">
                {caption.length} / {STORY_TEXT_MAX}
              </p>
            </div>
          )}

          {tab === 'link' && (
            <div className="space-y-4">
              <input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com/article"
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-saffron"
              />
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value.slice(0, STORY_TEXT_MAX))}
                placeholder="Add a note about this link (optional)…"
                rows={3}
                className="w-full resize-none rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-saffron"
              />
              <p className="text-[11px] text-muted-foreground">
                We'll fetch a preview card automatically. {caption.length} / {STORY_TEXT_MAX}
              </p>
              <StyleControls
                bgColor={bgColor}
                setBgColor={setBgColor}
                textColor={textColor}
                setTextColor={setTextColor}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Style controls (background + text color) ──────────────────────────────

function StyleControls({
  bgColor,
  setBgColor,
  textColor,
  setTextColor,
}: {
  bgColor: StoryBgKey;
  setBgColor: (c: StoryBgKey) => void;
  textColor: 'white' | 'black';
  setTextColor: (c: 'white' | 'black') => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Background</p>
        <div className="flex flex-wrap gap-2">
          {STORY_BG_PALETTE.map((key) => (
            <button
              key={key}
              onClick={() => setBgColor(key)}
              aria-label={`Background ${key}`}
              className={cn(
                'h-9 w-9 rounded-full bg-gradient-to-br ring-2 ring-offset-2 ring-offset-background',
                STORY_BG_GRADIENT[key],
                bgColor === key ? 'ring-white' : 'ring-transparent',
              )}
            />
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Text color</p>
        <div className="flex gap-2">
          <button
            onClick={() => setTextColor('white')}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-full bg-white text-xs font-bold text-black ring-2 ring-offset-2 ring-offset-background',
              textColor === 'white' ? 'ring-saffron' : 'ring-transparent',
            )}
          >
            A
          </button>
          <button
            onClick={() => setTextColor('black')}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-full bg-black text-xs font-bold text-white ring-2 ring-offset-2 ring-offset-background',
              textColor === 'black' ? 'ring-saffron' : 'ring-transparent',
            )}
          >
            A
          </button>
        </div>
      </div>
    </div>
  );
}

import type { VideoPost } from '@/lib/types';

// ───────────────────────────────────────────────────────────────────────────
// DEMONSTRATION DATA — fictional short videos used only by the BharatSocial
// Shorts prototype. None of these represent real creators or real videos.
//
// The `videoUrl` field points at publicly available sample videos commonly
// used for HTML5 video testing. If a URL is unreachable in the user's
// network, the ShortCard falls back to a gradient poster automatically.
//
// In production, these URLs would come from a configurable storage provider
// (Supabase Storage, S3, CDN, etc.) — we never store video binaries in the
// database itself.
// ───────────────────────────────────────────────────────────────────────────

const minutes = (n: number) => new Date(Date.now() - n * 60_000).toISOString();
const hours = (n: number) => new Date(Date.now() - n * 60 * 60_000).toISOString();
const days = (n: number) => new Date(Date.now() - n * 24 * 60 * 60_000).toISOString();

// Public sample video URLs — widely used for HTML5 testing.
// These are small, royalty-free clips hosted on Google's public CDN.
const SAMPLE_VIDEO_1 =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBigBuckBunny.mp4';
const SAMPLE_VIDEO_2 =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4';
const SAMPLE_VIDEO_3 =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
const SAMPLE_VIDEO_4 =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4';
const SAMPLE_VIDEO_5 =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4';
const SAMPLE_VIDEO_6 =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4';

export const DEMO_SHORTS: VideoPost[] = [
  {
    id: 'v-001',
    authorId: 'u-vikram',
    caption:
      'Golden hour over Marine Drive. The waves never disappoint. 📷 Swipe up for more.',
    hashtags: ['mumbai', 'sunset', 'marine-drive', 'photography'],
    language: 'en',
    videoUrl: SAMPLE_VIDEO_1,
    posterGradient: 'from-amber-500 via-orange-500 to-rose-600',
    audioTitle: 'Original audio — ocean waves',
    createdAt: minutes(45),
    likes: 12400,
    comments: 312,
    shares: 890,
  },
  {
    id: 'v-002',
    authorId: 'u-meera',
    caption:
      'మధురైలో జిలేబీ తయారీ ప్రక్రియ. ఎంతో ఓపికగా చేసే ముత్యాలు! 🍮',
    hashtags: ['madurai', 'food', 'jalebi', 'telugu'],
    language: 'te',
    translationPreview:
      '[Demonstration translation] The jalebi-making process in Madurai. The pearls are made with so much patience! 🍮',
    videoUrl: SAMPLE_VIDEO_2,
    posterGradient: 'from-yellow-400 via-amber-500 to-orange-600',
    audioTitle: 'Original audio — kitchen ambient',
    createdAt: hours(3),
    likes: 8700,
    comments: 156,
    shares: 423,
  },
  {
    id: 'v-003',
    authorId: 'u-arjun',
    caption:
      'Day 2 of the Spiti Valley trek. The silence up here is something else.',
    hashtags: ['spiti', 'trek', 'himalaya', 'travel'],
    language: 'en',
    videoUrl: SAMPLE_VIDEO_3,
    posterGradient: 'from-sky-400 via-cyan-500 to-blue-600',
    audioTitle: 'Original audio — wind and birds',
    createdAt: hours(8),
    likes: 18900,
    comments: 445,
    shares: 1230,
  },
  {
    id: 'v-004',
    authorId: 'u-sara',
    caption:
      'ਅੰਮ੍ਰਿਤਸਰ ਦਾ ਸੁਨਹਿਰੀ ਮੰਦਰ ਸ਼ਾਮ ਵੇਲੇ. ਇਹ ਨਜ਼ਾਰਾ ਹਮੇਸ਼ਾ ਨਵਾਂ ਲੱਗਦਾ ਹੈ.',
    hashtags: ['amritsar', 'goldentemple', 'punjab', 'punjabi'],
    language: 'pa',
    translationPreview:
      '[Demonstration translation] The Golden Temple in Amritsar at sunset. This view always feels new.',
    videoUrl: SAMPLE_VIDEO_4,
    posterGradient: 'from-amber-300 via-yellow-500 to-amber-700',
    audioTitle: 'Original audio — temple bells',
    createdAt: hours(12),
    likes: 24300,
    comments: 678,
    shares: 1890,
  },
  {
    id: 'v-005',
    authorId: 'u-karthik',
    caption:
      'IPL practice session highlights. The bowling unit looks sharp this season! 🏏',
    hashtags: ['ipl', 'cricket', 'practice', 'hyderabad'],
    language: 'en',
    videoUrl: SAMPLE_VIDEO_5,
    posterGradient: 'from-emerald-400 via-teal-500 to-cyan-600',
    audioTitle: 'Original audio — stadium ambient',
    createdAt: hours(20),
    likes: 31200,
    comments: 892,
    shares: 2100,
  },
  {
    id: 'v-006',
    authorId: 'u-ananya',
    caption:
      'कोलकाता की गलियों में एक शाम — चाय, चर्चा और बारिश की गंध.',
    hashtags: ['kolkata', 'rain', 'evening', 'hindi'],
    language: 'hi',
    translationPreview:
      '[Demonstration translation] An evening in the streets of Kolkata — tea, conversation and the smell of rain.',
    videoUrl: SAMPLE_VIDEO_6,
    posterGradient: 'from-slate-500 via-indigo-600 to-purple-700',
    audioTitle: 'Original audio — rain and street ambient',
    createdAt: days(1),
    likes: 15600,
    comments: 367,
    shares: 980,
  },
  {
    id: 'v-007',
    authorId: 'u-priya',
    caption:
      'மரகத மணி பாடல் — ஒரு சிறிய வாசிப்பு. 🎶',
    hashtags: ['music', 'tamil', 'classical', 'chennai'],
    language: 'ta',
    translationPreview:
      '[Demonstration translation] A song from Maragatha Mani — a small reading. 🎶',
    videoUrl: '',
    posterGradient: 'from-violet-500 via-purple-600 to-fuchsia-700',
    audioTitle: 'Original audio — vocal + tanpura',
    createdAt: days(1),
    likes: 9800,
    comments: 234,
    shares: 567,
  },
  {
    id: 'v-008',
    authorId: 'u-rohan',
    caption:
      'Building a startup from Mumbai — 3 lessons from year one.',
    hashtags: ['startup', 'mumbai', 'founder', 'business'],
    language: 'en',
    videoUrl: '',
    posterGradient: 'from-teal-500 via-emerald-600 to-green-700',
    audioTitle: 'Original audio — voiceover',
    createdAt: days(2),
    likes: 13400,
    comments: 521,
    shares: 1340,
  },
];

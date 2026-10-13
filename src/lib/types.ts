// Core type definitions for the BharatSocial prototype.
// All types here describe DEMONSTRATION data only — no real backend is involved.

/**
 * Indian languages supported by Bhasha Bridge.
 *
 * The list is intentionally extensible — adding a new language is just a
 * matter of appending a code here, adding its label to `languageLabel` in
 * `lib/format.ts`, and (optionally) supplying a demonstration translation
 * on a post. No other wiring is required.
 */
export type Language =
  | 'en' // English
  | 'hi' // हिन्दी  — Hindi (Devanagari)
  | 'te' // తెలుగు  — Telugu
  | 'ta' // தமிழ்   — Tamil
  | 'bn' // বাংলা   — Bengali
  | 'mr' // मराठी   — Marathi
  | 'kn' // ಕನ್ನಡ   — Kannada
  | 'ml' // മലയാളം — Malayalam
  | 'gu' // ગુજરાતી — Gujarati
  | 'pa' // ਪੰਜਾਬੀ  — Punjabi (Gurmukhi)
  | 'or' // ଓଡ଼ିଆ   — Odia
  | 'ur'; // اردو   — Urdu (Arabic script)

export interface DemoUser {
  id: string;
  name: string;
  handle: string;
  /** Two-letter initials used to render the gradient avatar. */
  initials: string;
  /** Tailwind gradient classes for the avatar background, e.g. "from-rose-400 to-orange-400". */
  avatarGradient: string;
  bio: string;
  location?: string;
  verified?: boolean;
  followers: number;
  following: number;
  /** Whether the current demo viewer follows this user. */
  isFollowing?: boolean;
}

export interface DemoReply {
  id: string;
  authorId: string;
  content: string;
  language: Language;
  /** ISO timestamp string. */
  createdAt: string;
}

export interface DemoPost {
  id: string;
  authorId: string;
  content: string;
  language: Language;
  createdAt: string;
  likes: number;
  reposts: number;
  replies: DemoReply[];
  liked?: boolean;
  reposted?: boolean;
  /** Optional bookmark state for the current viewer. */
  bookmarked?: boolean;
  /**
   * Optional demonstration translation into English.
   *
   * NOTE: This is hand-written demonstration text used only to show how the
   * Bhasha Bridge "Translate" UI behaves. It is NOT the output of a real
   * translation service. When no real translation API is configured, the
   * UI clearly tells the user that translations are demonstration only.
   */
  translationPreview?: string;
}

export interface TrendingTopic {
  id: string;
  category: string;
  title: string;
  postsCount: number;
}

export interface SuggestedAccount {
  userId: string;
  reason: string;
}

export type NavKey =
  | 'home'
  | 'explore'
  | 'pulse'
  | 'feed'
  | 'shorts'
  | 'quiz'
  | 'notifications'
  | 'messages'
  | 'bookmarks'
  | 'profile'
  | 'settings'
  | 'admin';

export type FeedTab = 'for-you' | 'following';

// ─────────────────────────────────────────────────────────────────────────────
// Shorts — vertical video social network
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A short-form vertical video post (Instagram Reels-style).
 *
 * NOTE: The `videoUrl` and `thumbnailUrl` fields below point at demonstration
 * assets only. In production these would come from a configurable storage
 * provider (Supabase Storage, S3, etc.) — we never store large video
 * binaries directly in the database.
 */
export interface VideoPost {
  id: string;
  authorId: string;
  caption: string;
  hashtags: string[];
  language: Language;
  /** Demonstration video URL — points at a public sample video or empty for a placeholder. */
  videoUrl: string;
  /** Gradient classes used as the poster/placeholder when no video URL is available. */
  posterGradient: string;
  /** Optional audio title for the "original audio" attribution. */
  audioTitle?: string;
  /** ISO timestamp. */
  createdAt: string;
  likes: number;
  comments: number;
  shares: number;
  liked?: boolean;
  saved?: boolean;
  /** Optional demonstration translation into English for Bhasha Bridge. */
  translationPreview?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// India Pulse — signature feature types
// ─────────────────────────────────────────────────────────────────────────────

/** India Pulse top-level tabs. */
export type PulseTab = 'city' | 'stories' | 'about';

/**
 * Community Signal — the transparent verification status of a city report.
 *
 * Importantly, popularity (likes, reposts) is NEVER used to upgrade a
 * report's status. The three tiers are:
 *
 *  - `unverified`             — community report, no independent corroboration yet
 *  - `corroborated`           — at least one independent account / reporter
 *                               has surfaced the same issue, but no official
 *                               source has confirmed it
 *  - `confirmed-by-source`    — a named official source (government, civic
 *                               authority, verified journalist, etc.) has
 *                               confirmed the report
 */
export type ReportStatus = 'unverified' | 'corroborated' | 'confirmed-by-source';

/** A piece of evidence supporting a report's status. */
export interface ReportEvidence {
  id: string;
  /** Short label, e.g. "BBMP rain alert", "Press release", "Independent reporter @…". */
  label: string;
  /** Why this evidence supports the assigned status. */
  note: string;
  /** Demonstration-only URL — points back at this prototype. */
  href?: string;
  /**
   * Marks this evidence as coming from an official source (civic authority,
   * government, etc.) so we can visually distinguish official confirmation
   * from community corroboration.
   */
  official?: boolean;
}

/** A city-level public report surfaced by India Pulse. */
export interface CityReport {
  id: string;
  cityId: string;
  /** Visual category chip — e.g. "Civic issue", "Public event", "Community", "Transport". */
  category: string;
  title: string;
  summary: string;
  /** Long-form body, supports plain text + line breaks. */
  body: string;
  language: Language;
  /** ISO timestamp for "reported at". */
  createdAt: string;
  status: ReportStatus;
  /** Why this status was assigned. Shown alongside the badge. */
  statusReason: string;
  evidence: ReportEvidence[];
  /** Number of community members who have surfaced the same issue (demo number). */
  communityReports: number;
  /** Optional demonstration translation into English for Bhasha Bridge. */
  translationPreview?: string;
}

/** A city available in India Pulse. */
export interface PulseCity {
  id: string;
  name: string;
  state: string;
  /** Broad region tag used by the "Stories" view for grouping. */
  region: 'North' | 'South' | 'East' | 'West' | 'Central';
  /** Short marketing blurb shown in the city chooser. */
  blurb: string;
  /** Tailwind gradient for the city tile / banner. */
  gradient: string;
}

/**
 * One Story, Many Perspectives — a manually-grouped topic that brings
 * related posts together across languages and regions.
 *
 * NOTE: Topic grouping is performed by hand for this prototype. We do NOT
 * claim that automatic topic detection is implemented. The `manuallyCurated`
 * flag is here to make that explicit in code.
 */
export interface PulseTopic {
  id: string;
  title: string;
  /** One-line summary shown on the topic card. */
  summary: string;
  /** ISO timestamp for when the topic was curated. */
  createdAt: string;
  /** Cities / regions represented by the topic. */
  regions: string[];
  /** Languages represented by the related posts. */
  languages: Language[];
  /** IDs of DemoPosts that are grouped into this topic. */
  postIds: string[];
  /** Optional supporting sources — links / labels. */
  sources: ReportEvidence[];
  /** Always true for now — topics are manually curated in the prototype. */
  manuallyCurated: true;
  /** Optional demonstration translation of title+summary into English. */
  translationPreview?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// India Quiz — trivia feature types
// ─────────────────────────────────────────────────────────────────────────────

/** Top-level tabs inside the India Quiz view. */
export type QuizTab = 'play' | 'daily' | 'leaderboard' | 'achievements';

/** A selectable quiz category. */
export interface QuizCategory {
  id: string;
  /** Tailwind gradient classes for the category tile. */
  gradient: string;
  /** Lucide icon name (we map it in the component). */
  icon: string;
  /** English label (also the fallback if a translation is missing). */
  label: string;
  /** Native-script labels per language. Missing entries fall back to `label`. */
  labels?: Partial<Record<Language, string>>;
  /** Short description shown on the category card. */
  description: string;
}

/** A single answer option for a quiz question. */
export interface QuizOption {
  id: string;
  /** English text — always present and used as the fallback. */
  text: string;
  /** Native-script translations per language. */
  translations?: Partial<Record<Language, string>>;
}

/**
 * A single quiz question.
 *
 * SECURITY NOTE: In a production backend, the `correctOptionId` MUST be
 * stored server-side and never exposed in public question queries before
 * the user submits an answer. In this demonstration prototype we keep the
 * correct answer in the client data (clearly labeled as demo), but the
 * architecture is designed so it can move server-side without UI changes.
 */
export interface QuizQuestion {
  id: string;
  categoryId: string;
  /** English text — always present. */
  text: string;
  /** Native-script translations per language. Missing entries fall back to `text`. */
  translations?: Partial<Record<Language, string>>;
  options: QuizOption[];
  /** ID of the correct option. */
  correctOptionId: string;
  /** Short explanation shown after answering. */
  explanation: string;
  /** Optional translations of the explanation. */
  explanationTranslations?: Partial<Record<Language, string>>;
  /** Optional source reference / note for factual questions. */
  source?: string;
  /** Suggested time limit in seconds (0 = no timer). */
  timeLimitSeconds?: number;
}

/** The result of a single answered question, kept in the attempt history. */
export interface QuizAnswerRecord {
  questionId: string;
  selectedOptionId: string;
  correct: boolean;
  /** Points awarded for this answer (0 if incorrect). */
  points: number;
  /** Time taken to answer, in seconds (for future tie-breaking). */
  timeTakenSeconds?: number;
}

/** A complete quiz attempt — one play-through of a category or daily set. */
export interface QuizAttempt {
  id: string;
  /** 'category' for a regular quiz, 'daily' for the daily challenge. */
  type: 'category' | 'daily';
  /** Category id, or the daily challenge date (YYYY-MM-DD). */
  refId: string;
  /** ISO timestamp when the attempt started. */
  startedAt: string;
  /** ISO timestamp when the attempt finished. */
  finishedAt: string;
  /** The language the user played in. */
  language: Language;
  /** Per-question results. */
  answers: QuizAnswerRecord[];
  /** Total points for this attempt. */
  totalPoints: number;
  /** Number of correct answers. */
  correctCount: number;
  /** Total number of questions. */
  totalQuestions: number;
}

/** A daily challenge — a fixed set of questions for a specific date. */
export interface DailyChallenge {
  /** Date in YYYY-MM-DD format (interpreted in IST). */
  date: string;
  /** Question IDs included in today's challenge. */
  questionIds: string[];
  /** Display title. */
  title: string;
  /** Optional translations. */
  titleTranslations?: Partial<Record<Language, string>>;
}

/** An achievement badge the user can earn. */
export interface QuizAchievement {
  id: string;
  /** English name. */
  name: string;
  /** Native-script translations. */
  nameTranslations?: Partial<Record<Language, string>>;
  /** English description. */
  description: string;
  descriptionTranslations?: Partial<Record<Language, string>>;
  /** Lucide icon name. */
  icon: string;
  /** Tailwind gradient for the badge. */
  gradient: string;
  /** How the achievement is earned — checked client-side in demo mode. */
  criteria: {
    type: 'first-quiz' | 'perfect-score' | 'seven-day-streak' | 'category-expert' | 'daily-player';
    /** For category-expert: minimum number of perfect scores in this category. */
    categoryId?: string;
    /** For category-expert: minimum perfect-score count required. */
    minPerfectScores?: number;
  };
}

/** A leaderboard entry — combines a demo user with their quiz score. */
export interface QuizLeaderboardEntry {
  userId: string;
  totalPoints: number;
  quizzesPlayed: number;
  bestAccuracy: number;
}

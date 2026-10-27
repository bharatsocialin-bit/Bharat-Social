import type { DemoUser } from '@/lib/types';

// ───────────────────────────────────────────────────────────────────────────
// DEMONSTRATION DATA — do not treat as real user accounts.
// These are fictional personas used only to make the prototype feel alive.
// ───────────────────────────────────────────────────────────────────────────

export const DEMO_USERS: DemoUser[] = [
  {
    id: 'u-current',
    name: 'You',
    handle: 'you',
    initials: 'Yo',
    avatarGradient: 'from-sky-500 to-indigo-500',
    bio: 'Exploring Desily — a fresh place to share what matters.',
    location: 'Bengaluru, India',
    verified: false,
    followers: 128,
    following: 312,
    isFollowing: false,
  },
  {
    id: 'u-aarav',
    name: 'Aarav Sharma',
    handle: 'aarav_codes',
    initials: 'AS',
    avatarGradient: 'from-rose-400 to-orange-400',
    bio: 'Building things with code. Coffee, cricket and clean architecture, in that order.',
    location: 'Bengaluru',
    verified: true,
    followers: 18420,
    following: 245,
  },
  {
    id: 'u-priya',
    name: 'Priya Iyer',
    handle: 'priyawrites',
    initials: 'Pr',
    avatarGradient: 'from-fuchsia-500 to-pink-500',
    bio: 'Writer. Translator. Forever chasing the perfect cup of filter coffee.',
    location: 'Chennai',
    verified: false,
    followers: 7320,
    following: 412,
  },
  {
    id: 'u-rohan',
    name: 'Rohan Mehta',
    handle: 'rohanmehta',
    initials: 'Ro',
    avatarGradient: 'from-emerald-400 to-teal-500',
    bio: 'Startup founder. Sharing notes on building in public from Mumbai.',
    location: 'Mumbai',
    verified: true,
    followers: 42100,
    following: 188,
  },
  {
    id: 'u-ananya',
    name: 'Ananya Reddy',
    handle: 'ananya_reddy',
    initials: 'An',
    avatarGradient: 'from-amber-400 to-rose-500',
    bio: 'Engineering student in Hyderabad. Loves math, music and a good biryani debate.',
    location: 'Hyderabad',
    verified: false,
    followers: 2190,
    following: 540,
  },
  {
    id: 'u-vikram',
    name: 'Vikram Nair',
    handle: 'vikramframes',
    initials: 'Vi',
    avatarGradient: 'from-cyan-400 to-blue-500',
    bio: 'Photographer chasing light across India. 35mm enthusiast.',
    location: 'Kochi',
    verified: false,
    followers: 9870,
    following: 612,
  },
  {
    id: 'u-meera',
    name: 'Meera Krishnan',
    handle: 'meera_k',
    initials: 'Me',
    avatarGradient: 'from-violet-500 to-purple-500',
    bio: 'Food blogger. Trying every regional thali, one state at a time.',
    location: 'Madurai',
    verified: true,
    followers: 31200,
    following: 230,
  },
  {
    id: 'u-karthik',
    name: 'Karthik Rao',
    handle: 'karthikrao',
    initials: 'Ka',
    avatarGradient: 'from-lime-400 to-emerald-500',
    bio: 'Cricket nerd. Stats > opinions. IPL is a yearly festival in my house.',
    location: 'Hyderabad',
    verified: false,
    followers: 5640,
    following: 401,
  },
  {
    id: 'u-sara',
    name: 'Sara D’Souza',
    handle: 'sara_creates',
    initials: 'Sa',
    avatarGradient: 'from-pink-400 to-rose-500',
    bio: 'Indie designer. Type, posters, and tiny side projects.',
    location: 'Goa',
    verified: false,
    followers: 4120,
    following: 287,
  },
  {
    id: 'u-arjun',
    name: 'Arjun Singh',
    handle: 'arjun_trek',
    initials: 'Ar',
    avatarGradient: 'from-orange-400 to-amber-500',
    bio: 'Mountain person. Trail reviews, gear notes, and sunrise photos.',
    location: 'Manali',
    verified: false,
    followers: 8730,
    following: 198,
  },
];

export const DEMO_USER_MAP: Record<string, DemoUser> = DEMO_USERS.reduce(
  (acc, u) => {
    acc[u.id] = u;
    return acc;
  },
  {} as Record<string, DemoUser>,
);

/** The user that represents the current viewer of the prototype. */
export const CURRENT_USER_ID = 'u-current';

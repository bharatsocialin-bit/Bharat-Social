import type { QuizCategory } from '@/lib/types';

// ───────────────────────────────────────────────────────────────────────────
// DEMONSTRATION DATA — quiz categories for the India Quiz prototype.
// ───────────────────────────────────────────────────────────────────────────

export const QUIZ_CATEGORIES: QuizCategory[] = [
  {
    id: 'cat-gk',
    gradient: 'from-teal-500 to-emerald-600',
    icon: 'lightbulb',
    label: 'India General Knowledge',
    labels: {
      hi: 'भारत सामान्य ज्ञान',
      te: 'భారత సాధారణ జ్ఞానం',
    },
    description: 'Facts about India — landmarks, symbols, firsts and more.',
  },
  {
    id: 'cat-history',
    gradient: 'from-amber-500 to-orange-600',
    icon: 'scroll',
    label: 'Indian History',
    labels: {
      hi: 'भारतीय इतिहास',
      te: 'భారత చరిత్ర',
    },
    description: 'From ancient empires to independence — test your history.',
  },
  {
    id: 'cat-geography',
    gradient: 'from-sky-500 to-blue-600',
    icon: 'map',
    label: 'Geography and Indian States',
    labels: {
      hi: 'भूगोल और भारतीय राज्य',
      te: 'భూగోళం మరియు భారత రాష్ట్రాలు',
    },
    description: 'Rivers, mountains, capitals and state trivia.',
  },
  {
    id: 'cat-science',
    gradient: 'from-violet-500 to-purple-600',
    icon: 'flask-conical',
    label: 'Science and Technology',
    labels: {
      hi: 'विज्ञान और प्रौद्योगिकी',
      te: 'విజ్ఞానం మరియు సాంకేతికత',
    },
    description: 'ISRO, scientists, inventions and space missions.',
  },
  {
    id: 'cat-sports',
    gradient: 'from-lime-500 to-green-600',
    icon: 'trophy',
    label: 'Cricket and Sports',
    labels: {
      hi: 'क्रिकेट और खेल',
      te: 'క్రికెట్ మరియు క్రీడలు',
    },
    description: 'Cricket legends, Olympics, records and Indian athletes.',
  },
  {
    id: 'cat-cinema',
    gradient: 'from-rose-500 to-pink-600',
    icon: 'film',
    label: 'Indian Cinema and Entertainment',
    labels: {
      hi: 'भारतीय सिनेमा और मनोरंजन',
      te: 'భారతీయ సినిమా మరియు వినోదం',
    },
    description: 'Bollywood, regional cinema, music and legends of the screen.',
  },
  {
    id: 'cat-culture',
    gradient: 'from-saffron to-amber-600',
    icon: 'sparkles',
    label: 'Food, Culture and Festivals',
    labels: {
      hi: 'खाना, संस्कृति और त्योहार',
      te: 'ఆహారం, సంస్కృతి మరియు పండుగలు',
    },
    description: 'Festivals, cuisines, dance forms and cultural traditions.',
  },
  {
    id: 'cat-current',
    gradient: 'from-cyan-500 to-teal-600',
    icon: 'newspaper',
    label: 'Current Affairs',
    labels: {
      hi: 'सामयिकी',
      te: 'సమకాలీన విషయాలు',
    },
    description: 'Recent milestones and widely-reported public events.',
  },
  {
    id: 'cat-edu',
    gradient: 'from-indigo-500 to-violet-600',
    icon: 'graduation-cap',
    label: 'Education and Competitive Exam Practice',
    labels: {
      hi: 'शिक्षा और प्रतियोगी परीक्षा अभ्यास',
      te: 'విద్య మరియు పోటీ పరీక్షల సాధన',
    },
    description: 'Practice questions modelled on competitive exam patterns.',
  },
];

export const QUIZ_CATEGORY_MAP: Record<string, QuizCategory> = QUIZ_CATEGORIES.reduce(
  (acc, c) => {
    acc[c.id] = c;
    return acc;
  },
  {} as Record<string, QuizCategory>,
);

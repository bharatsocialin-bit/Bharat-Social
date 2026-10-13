import type { DemoPost } from '@/lib/types';

// ───────────────────────────────────────────────────────────────────────────
// DEMONSTRATION DATA — fictional posts written in English, Hindi (Devanagari)
// and Telugu scripts. None of these represent real users or real events.
// ───────────────────────────────────────────────────────────────────────────

// Times are stored relative to "now" using a small helper at the bottom of this
// file so the feed always feels fresh without manual upkeep.

const minutes = (n: number) => new Date(Date.now() - n * 60_000).toISOString();
const hours = (n: number) => new Date(Date.now() - n * 60 * 60_000).toISOString();
const days = (n: number) => new Date(Date.now() - n * 24 * 60 * 60_000).toISOString();

export const DEMO_POSTS: DemoPost[] = [
  {
    id: 'p-001',
    authorId: 'u-aarav',
    language: 'en',
    content:
      'Spent the morning debugging a flaky test suite. Turned out to be a timezone bug in a mock — classic. Reminder: always set your server clock to UTC and let the UI format for humans. ☕',
    createdAt: minutes(8),
    likes: 142,
    reposts: 12,
    replies: [
      {
        id: 'r-001-a',
        authorId: 'u-ananya',
        language: 'en',
        content: 'Oof, timezone bugs are the worst. Glad you found it!',
        createdAt: minutes(5),
      },
    ],
  },
  {
    id: 'p-002',
    authorId: 'u-priya',
    language: 'hi',
    content:
      'आज सुबह की सैर के दौरान एक नई किताब देखी — प्रेमचंद की ‘गोदान’। बारिश की गंध और अच्छी कहानी, ज़िंदगी के छोटे-छोटे सुख। पढ़ने की आदत डालिए, दुनिया खुद-ब-खुद थोड़ी सुंदर लगने लगेगी।',
    translationPreview:
      '[Demonstration translation] Spotted a new book on my morning walk — Premchand’s ‘Godan’. The smell of rain and a good story, life’s small joys. Cultivate the habit of reading; the world will start to feel a little more beautiful on its own.',
    createdAt: minutes(34),
    likes: 89,
    reposts: 7,
    replies: [],
  },
  {
    id: 'p-003',
    authorId: 'u-karthik',
    language: 'te',
    content:
      'ఈ సీజన్‌లో మన బౌలింగ్ చాలా బలంగా ఉంది. ముఖ్యంగా పవర్‌ప్లేలో వికెట్లు తీయడం పట్టుబడింది. ఫైనల్స్ చూడాలని ఉంది! 🏏',
    translationPreview:
      '[Demonstration translation] Our bowling has been very strong this season. Taking wickets in the powerplay has especially come together. Can’t wait for the finals! 🏏',
    createdAt: minutes(52),
    likes: 210,
    reposts: 28,
    replies: [],
  },
  {
    id: 'p-004',
    authorId: 'u-rohan',
    language: 'en',
    content:
      'Hot take after 4 years of building: most “growth problems” are actually onboarding problems. If your week-1 retention is broken, no amount of paid acquisition will save you. Fix the first-run experience first.',
    createdAt: hours(2),
    likes: 540,
    reposts: 96,
    replies: [
      {
        id: 'r-004-a',
        authorId: 'u-aarav',
        language: 'en',
        content: '100%. We rebuilt onboarding last quarter and DAU jumped 18%.',
        createdAt: hours(1),
      },
      {
        id: 'r-004-b',
        authorId: 'u-sara',
        language: 'en',
        content: 'Would love to read a longer post about what you changed.',
        createdAt: minutes(58),
      },
    ],
  },
  {
    id: 'p-005',
    authorId: 'u-ananya',
    language: 'te',
    content:
      'హైదరాబాద్‌లో నేడు వర్షం! బిర్యానీ తిని, ఒక మంచి పుస్తకం చదవడం — అదే ఒక పర్ఫెక్ట్ రోజు. అందరికీ మంచి రోజు కావాలని కోరుకుంటున్నాను.',
    translationPreview:
      '[Demonstration translation] Rain in Hyderabad today! Eating biryani, reading a good book — that’s a perfect day. Wishing everyone a good day.',
    createdAt: hours(3),
    likes: 76,
    reposts: 4,
    replies: [],
  },
  {
    id: 'p-006',
    authorId: 'u-vikram',
    language: 'en',
    content:
      'Golden hour at Marine Drive yesterday. The light bounced off every wave like it was rehearsed. Sometimes the best gear is just showing up at the right time. 📷',
    createdAt: hours(5),
    likes: 318,
    reposts: 41,
    replies: [],
  },
  {
    id: 'p-007',
    authorId: 'u-meera',
    language: 'hi',
    content:
      'आज घर पर रवा इडली बनाई, और साथ में नारियल चटनी और सांभर। एक साधारण सी दक्षिण भारतीय सुबह, जो हर बार नई महसूस होती है। खाना सिर्फ पेट नहीं भरता, यादें भी बनाता है।',
    translationPreview:
      '[Demonstration translation] Made rava idli at home today, with coconut chutney and sambar. An ordinary South Indian morning that feels new every time. Food doesn’t just fill the stomach — it makes memories.',
    createdAt: hours(7),
    likes: 264,
    reposts: 18,
    replies: [
      {
        id: 'r-007-a',
        authorId: 'u-priya',
        language: 'hi',
        content: 'इडली की तुलना किसी से नहीं होती! बढ़िया लग रही।',
        createdAt: hours(6),
      },
    ],
  },
  {
    id: 'p-008',
    authorId: 'u-sara',
    language: 'en',
    content:
      'Tip for indie designers: keep a “parking lot” Figma file. Every random idea, half-baked logo, or color study goes there. Once a month, mine it. You’ll be surprised how many usable things were quietly waiting.',
    createdAt: hours(10),
    likes: 198,
    reposts: 33,
    replies: [],
  },
  {
    id: 'p-009',
    authorId: 'u-arjun',
    language: 'en',
    content:
      'Day 3 of the Hamta Pass trek. The valley opens up around you like a slow exhale. Carrying only 7kg this time and it’s changing how I think about every step. Lighter packs make longer conversations with yourself possible.',
    createdAt: hours(13),
    likes: 432,
    reposts: 64,
    replies: [],
  },
  {
    id: 'p-010',
    authorId: 'u-ananya',
    language: 'en',
    content:
      'Three things that helped me survive engineering exams: spaced repetition flashcards, the Feynman technique, and sleeping 7 hours. That last one is the most underrated. Don’t let anyone tell you sleep is optional.',
    createdAt: days(1),
    likes: 612,
    reposts: 88,
    replies: [],
  },
  {
    id: 'p-011',
    authorId: 'u-priya',
    language: 'hi',
    content:
      'अनुवाद करना सिर्फ शब्दों को बदलना नहीं है — यह एक संस्कृति को दूसरी भाषा में साँस लेना है। आज एक तमिल कविता का हिंदी रूपांतरण कर रही थी। कुछ पंक्तियाँ दोनों भाषाओं में एक जैसी खूबसूरत लगीं।',
    translationPreview:
      '[Demonstration translation] Translation isn’t just swapping words — it’s letting one culture breathe in another language. Was working on a Hindi rendering of a Tamil poem today. Some lines felt equally beautiful in both languages.',
    createdAt: days(1),
    likes: 145,
    reposts: 21,
    replies: [],
  },
  {
    id: 'p-012',
    authorId: 'u-rohan',
    language: 'en',
    content:
      'If you’re hiring, write the offer letter first. It forces clarity on comp, role, and what success looks like in 90 days. Way better than figuring out these things after the candidate has already done 5 rounds.',
    createdAt: days(1),
    likes: 287,
    reposts: 52,
    replies: [],
  },
  {
    id: 'p-013',
    authorId: 'u-karthik',
    language: 'en',
    content:
      'Reminder that stats don’t tell the whole story. A bowler who gives 40 runs but takes two key wickets in the death overs is often more valuable than one with a flashy economy rate in the powerplay. Context, always.',
    createdAt: days(2),
    likes: 173,
    reposts: 19,
    replies: [],
  },
  {
    id: 'p-014',
    authorId: 'u-meera',
    language: 'te',
    content:
      'మధురైలో జరిగిన ఒక చిన్న వంటకళా కార్యక్రమంలో పాల్గొన్నాను. స్థానిక ముత్యాలు, జిలేబీ, మరియు కుటుంబంలా అనిపించే ఆతిథ్యం — ఇవన్నీ కలిసి అద్భుతమైన రోజును చేశాయి.',
    translationPreview:
      '[Demonstration translation] Took part in a small culinary event in Madurai. Local mutyalu (pearls of dish), jalebi, and hospitality that felt like family — together they made an amazing day.',
    createdAt: days(2),
    likes: 312,
    reposts: 27,
    replies: [],
  },
  {
    id: 'p-015',
    authorId: 'u-arjun',
    language: 'hi',
    content:
      'पहाड़ों में सुबह की पहली किरण देखना हमेशा एक जैसा महसूस नहीं होता। हर बार कुछ नया, कुछ अलग। शायद यही सफर का सार है — पहुँचना नहीं, बल्कि हर कदम को महसूस करना।',
    translationPreview:
      '[Demonstration translation] Watching the first ray of sun in the mountains never feels the same. Every time, something new, something different. Maybe that’s the essence of travel — not arriving, but feeling every step.',
    createdAt: days(3),
    likes: 521,
    reposts: 78,
    replies: [],
  },
];

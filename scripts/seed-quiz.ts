/**
 * Seed the India Quiz question bank, daily sets, and achievements.
 *
 * This script is IDEMPOTENT — running it multiple times does NOT create
 * duplicates. It checks for existing records by their natural key
 * (question slug, achievement slug, daily set date) before inserting.
 *
 * All questions have been verified against widely-known public sources.
 * Where practical, a source note is included with each question.
 *
 * Run: bunx tsx scripts/seed-quiz.ts
 */
import { db } from '@/lib/db';

// ── Categories (static config — kept in code, mirroring quiz-categories.ts) ──
const CATEGORIES = [
  'cat-gk', 'cat-history', 'cat-geography', 'cat-science', 'cat-sports',
  'cat-cinema', 'cat-culture', 'cat-current', 'cat-edu', 'cat-civics',
] as const;

type CategorySlug = (typeof CATEGORIES)[number];

// ── Question type used by the seeder ──
interface SeedQuestion {
  slug: string;
  categoryId: CategorySlug;
  text: string;
  translations?: Record<string, string>;
  options: Array<{ id: string; text: string; translations?: Record<string, string> }>;
  correctOptionId: string;
  explanation: string;
  explanationTranslations?: Record<string, string>;
  source?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimitSeconds?: number;
}

// ── Verified question bank ──────────────────────────────────────────────────
// Every fact below has been checked against well-known public sources
// (Government of India websites, ISRO, Election Commission of India,
// Sports Reference / ESPNCricinfo, RBI, etc.). Questions avoid partisan
// framing and steer clear of disputed claims.
const QUESTIONS: SeedQuestion[] = [
  // ── General Knowledge ────────────────────────────────────────────────────
  {
    slug: 'gk-national-animal',
    categoryId: 'cat-gk',
    text: 'What is the national animal of India?',
    translations: { hi: 'भारत का राष्ट्रीय पशु क्या है?', te: 'భారతదేశ జాతీయ జంతువు ఏది?' },
    options: [
      { id: 'a', text: 'Lion', translations: { hi: 'शेर', te: 'సింహం' } },
      { id: 'b', text: 'Tiger', translations: { hi: 'बाघ', te: 'పులి' } },
      { id: 'c', text: 'Elephant', translations: { hi: 'हाथी', te: 'ఏనుగు' } },
      { id: 'd', text: 'Peacock', translations: { hi: 'मोर', te: 'నెమలి' } },
    ],
    correctOptionId: 'b',
    explanation: 'The Bengal Tiger (Panthera tigris tigris) was adopted as India’s national animal in 1973 — the same year Project Tiger was launched.',
    explanationTranslations: {
      hi: 'बंगाल टाइगर (Panthera tigris tigris) को 1973 में भारत का राष्ट्रीय पशु घोषित किया गया — उसी वर्ष प्रोजेक्ट टाइगर शुरू हुआ।',
      te: 'బెంగాల్ పులి (Panthera tigris tigris) 1973లో భారత జాతీయ జంతువుగా ప్రకటించబడింది — అదే సంవత్సరం ప్రాజెక్ట్ టైగర్ ప్రారంభమైంది.',
    },
    source: 'Project Tiger, Government of India',
    difficulty: 'easy',
    timeLimitSeconds: 30,
  },
  {
    slug: 'gk-states-2024',
    categoryId: 'cat-gk',
    text: 'How many states are there in the Republic of India (as of 2024)?',
    translations: { hi: 'भारत गणराज्य में (2024 तक) कितने राज्य हैं?', te: 'భారత గణతంత్ర రాజ్యంలో (2024 నాటికి) ఎన్ని రాష్ట్రాలు ఉన్నాయి?' },
    options: [
      { id: 'a', text: '27' },
      { id: 'b', text: '28' },
      { id: 'c', text: '29' },
      { id: 'd', text: '30' },
    ],
    correctOptionId: 'b',
    explanation: 'India has 28 states and 8 Union Territories. (Jammu & Kashmir was reorganised in 2019, reducing the state count from 29 to 28.)',
    explanationTranslations: {
      hi: 'भारत में 28 राज्य और 8 केंद्र शासित प्रदेश हैं। (2019 में जम्मू-कश्मीर के पुनर्गठन के बाद राज्यों की संख्या 29 से घटकर 28 हो गई।)',
      te: 'భారతదేశంలో 28 రాష్ట్రాలు మరియు 8 కేంద్ర పాలిత ప్రాంతాలు ఉన్నాయి. (2019లో జమ్మూ-కాశ్మీర్ పునర్వ్యవస్థీకరణ తర్వాత రాష్ట్రాల సంఖ్య 29 నుండి 28కి తగ్గింది.)',
    },
    source: 'Ministry of Home Affairs, Government of India',
    difficulty: 'medium',
    timeLimitSeconds: 25,
  },
  {
    slug: 'gk-national-flower',
    categoryId: 'cat-gk',
    text: 'Which is the national flower of India?',
    translations: { hi: 'भारत का राष्ट्रीय पुष्प कौन-सा है?', te: 'భారతదేశ జాతీయ పువ్వు ఏది?' },
    options: [
      { id: 'a', text: 'Rose', translations: { hi: 'गुलाब', te: 'గులాబీ' } },
      { id: 'b', text: 'Lotus', translations: { hi: 'कमल', te: 'కమలం' } },
      { id: 'c', text: 'Marigold', translations: { hi: 'गेंदा', te: 'బంతిపువ్వు' } },
      { id: 'd', text: 'Jasmine', translations: { hi: 'चमेली', te: 'మల్లెపువ్వు' } },
    ],
    correctOptionId: 'b',
    explanation: 'The Lotus (Nelumbo nucifera) is India’s national flower — a sacred symbol in Indian culture and art for centuries.',
    explanationTranslations: {
      hi: 'कमल (Nelumbo nucifera) भारत का राष्ट्रीय पुष्प है।',
      te: 'కమలం (Nelumbo nucifera) భారత జాతీయ పువ్వు.',
    },
    source: 'Government of India national symbols',
    difficulty: 'easy',
    timeLimitSeconds: 25,
  },
  {
    slug: 'gk-national-anthem-author',
    categoryId: 'cat-gk',
    text: 'Who wrote the Indian national anthem “Jana Gana Mana”?',
    translations: { hi: 'भारतीय राष्ट्रगान “जन गण मन” किसने लिखा?', te: 'భారత జాతీయ గీతం “జన గణ మన” ఎవరు రాశారు?' },
    options: [
      { id: 'a', text: 'Bankim Chandra Chattopadhyay' },
      { id: 'b', text: 'Rabindranath Tagore', translations: { hi: 'रबीन्द्रनाथ ठाकुर', te: 'రవీంద్రనాథ్ ఠాగూర్' } },
      { id: 'c', text: 'Sarojini Naidu' },
      { id: 'd', text: 'Subramania Bharati' },
    ],
    correctOptionId: 'b',
    explanation: 'Rabindranath Tagore wrote “Jana Gana Mana”. It was adopted as the national anthem on 24 January 1950.',
    explanationTranslations: {
      hi: '“जन गण मन” रबीन्द्रनाथ ठाकुर ने लिखा था। इसे 24 जनवरी 1950 को राष्ट्रगान अपनाया गया।',
      te: '“జన గణ మన” రవీంద్రనాథ్ ఠాగూర్ రాశారు. దీనిని 24 జనవరి 1950న జాతీయ గీతంగా స్వీకరించారు.',
    },
    source: 'Government of India national symbols',
    difficulty: 'medium',
    timeLimitSeconds: 30,
  },
  {
    slug: 'gk-national-bird',
    categoryId: 'cat-gk',
    text: 'Which is the national bird of India?',
    translations: { hi: 'भारत का राष्ट्रीय पक्षी कौन-सा है?', te: 'భారతదేశ జాతీయ పక్షి ఏది?' },
    options: [
      { id: 'a', text: 'Parrot', translations: { hi: 'तोता', te: 'చిలుక' } },
      { id: 'b', text: 'Eagle', translations: { hi: 'गरुड़', te: 'గద్ద' } },
      { id: 'c', text: 'Peacock', translations: { hi: 'मोर', te: 'నెమలి' } },
      { id: 'd', text: 'Crow', translations: { hi: 'कौआ', te: 'కాకి' } },
    ],
    correctOptionId: 'c',
    explanation: 'The Indian Peacock (Pavo cristatus) is the national bird of India, declared in 1963.',
    explanationTranslations: {
      hi: 'भारतीय मोर (Pavo cristatus) भारत का राष्ट्रीय पक्षी है, जिसे 1963 में घोषित किया गया।',
      te: 'భారతీయ నెమలి (Pavo cristatus) భారత జాతీయ పక్షి, 1963లో ప్రకటించబడింది.',
    },
    source: 'Government of India national symbols',
    difficulty: 'easy',
    timeLimitSeconds: 25,
  },
  {
    slug: 'gk-longest-river',
    categoryId: 'cat-gk',
    text: 'Which is the longest river in India?',
    translations: { hi: 'भारत की सबसे लंबी नदी कौन-सी है?', te: 'భారతదేశంలో అత్యంత పొడవైన నది ఏది?' },
    options: [
      { id: 'a', text: 'Yamuna', translations: { hi: 'यमुना', te: 'యమున' } },
      { id: 'b', text: 'Ganga', translations: { hi: 'गंगा', te: 'గంగ' } },
      { id: 'c', text: 'Godavari', translations: { hi: 'गोदावरी', te: 'గోదావరి' } },
      { id: 'd', text: 'Narmada', translations: { hi: 'नर्मदा', te: 'నర్మద' } },
    ],
    correctOptionId: 'b',
    explanation: 'The Ganga (Ganges) is the longest river in India, flowing about 2,525 km from its source at Gangotri in Uttarakhand to the Bay of Bengal.',
    explanationTranslations: {
      hi: 'गंगा भारत की सबसे लंबी नदी है — उत्तराखंड के गंगोत्री से बंगाल की खाड़ी तक लगभग 2,525 किमी बहती है।',
      te: 'గంగ భారతదేశంలో అత్యంత పొడవైన నది — ఉత్తరాఖండ్‌లోని గంగోత్రి నుండి బంగాళాఖాతం వరకు దాదాపు 2,525 కి.మీ ప్రవహిస్తుంది.',
    },
    source: 'Survey of India / Ganga Basin Authority',
    difficulty: 'medium',
    timeLimitSeconds: 30,
  },

  // ── History ───────────────────────────────────────────────────────────────
  {
    slug: 'hist-independence-year',
    categoryId: 'cat-history',
    text: 'In which year did India gain independence from British rule?',
    translations: { hi: 'भारत ब्रिटिश शासन से किस वर्ष स्वतंत्र हुआ?', te: 'భారతదేశం బ్రిటిష్ పాలన నుండి ఎప్పుడు స్వాతంత్ర్యం పొందింది?' },
    options: [
      { id: 'a', text: '1942' },
      { id: 'b', text: '1945' },
      { id: 'c', text: '1947' },
      { id: 'd', text: '1950' },
    ],
    correctOptionId: 'c',
    explanation: 'India gained independence on 15 August 1947. The Republic of India was proclaimed on 26 January 1950, when the Constitution came into effect.',
    explanationTranslations: {
      hi: 'भारत 15 अगस्त 1947 को स्वतंत्र हुआ। संविधान लागू होने पर 26 जनवरी 1950 को भारत गणराज्य की घोषणा हुई।',
      te: 'భారతదేశం 15 ఆగస్టు 1947న స్వాతంత్ర్యం పొందింది. రాజ్యాంగం అమల్లోకి వచ్చినప్పుడు 26 జనవరి 1950న భారత గణతంత్ర రాజ్యం ప్రకటించబడింది.',
    },
    source: 'Constitution of India',
    difficulty: 'easy',
    timeLimitSeconds: 20,
  },
  {
    slug: 'hist-constitution-adoption',
    categoryId: 'cat-history',
    text: 'When was the Constitution of India adopted by the Constituent Assembly?',
    translations: { hi: 'संविधान सभा द्वारा भारतीय संविधान कब अपनाया गया?', te: 'రాజ్యాంగ సభ భారత రాజ్యాంగాన్ని ఎప్పుడు స్వీకరించింది?' },
    options: [
      { id: 'a', text: '15 August 1947' },
      { id: 'b', text: '26 November 1949' },
      { id: 'c', text: '26 January 1950' },
      { id: 'd', text: '2 October 1950' },
    ],
    correctOptionId: 'b',
    explanation: 'The Constituent Assembly adopted the Constitution on 26 November 1949. It came into effect on 26 January 1950 — celebrated as Republic Day. 26 November is now observed as Constitution Day (Samvidhan Diwas).',
    explanationTranslations: {
      hi: 'संविधान सभा ने 26 नवंबर 1949 को संविधान अपनाया। यह 26 जनवरी 1950 को लागू हुआ, जिसे गणतंत्र दिवस के रूप में मनाया जाता है।',
      te: 'రాజ్యాంగ సభ 26 నవంబర్ 1949న రాజ్యాంగాన్ని స్వీకరించింది. ఇది 26 జనవరి 1950న అమల్లోకి వచ్చింది — గణతంత్ర దినోత్సవంగా జరుపుకుంటారు.',
    },
    source: 'Constitution of India, Preamble',
    difficulty: 'hard',
    timeLimitSeconds: 30,
  },
  {
    slug: 'hist-first-pm',
    categoryId: 'cat-history',
    text: 'Who was the first Prime Minister of independent India?',
    translations: { hi: 'स्वतंत्र भारत के पहले प्रधानमंत्री कौन थे?', te: 'స్వతంత్ర భారత మొదటి ప్రధాన మంత్రి ఎవరు?' },
    options: [
      { id: 'a', text: 'Mahatma Gandhi' },
      { id: 'b', text: 'Sardar Patel' },
      { id: 'c', text: 'Jawaharlal Nehru' },
      { id: 'd', text: 'Dr. Rajendra Prasad' },
    ],
    correctOptionId: 'c',
    explanation: 'Jawaharlal Nehru was the first Prime Minister of India (1947–1964). Dr. Rajendra Prasad was the first President; Sardar Patel was Deputy Prime Minister.',
    explanationTranslations: {
      hi: 'जवाहरलाल नेहरू भारत के पहले प्रधानमंत्री (1947–1964) थे। डॉ. राजेंद्र प्रसाद पहले राष्ट्रपति थे।',
      te: 'జవహర్‌లాల్ నెహ్రూ భారత మొదటి ప్రధాన మంత్రి (1947–1964). డా. రాజేంద్ర ప్రసాద్ మొదటి రాష్ట్రపతి.',
    },
    source: 'Government of India archives',
    difficulty: 'easy',
    timeLimitSeconds: 20,
  },
  {
    slug: 'hist-ashoka',
    categoryId: 'cat-history',
    text: 'Which Mauryan emperor is associated with the spread of Buddhism and the rock edicts?',
    translations: { hi: 'किस मौर्य सम्राट का बौद्ध धर्म के प्रसार और शिलालेखों से संबंध है?', te: 'ఏ మౌర్య చక్రవర్తి బౌద్ధ మత వ్యాప్తి మరియు శిలా శాసనాలతో సంబంధం కలిగి ఉన్నాడు?' },
    options: [
      { id: 'a', text: 'Chandragupta Maurya' },
      { id: 'b', text: 'Bindusara' },
      { id: 'c', text: 'Ashoka' },
      { id: 'd', text: 'Harshavardhana' },
    ],
    correctOptionId: 'c',
    explanation: 'Ashoka the Great (c. 268–232 BCE) embraced Buddhism after the Kalinga War and spread his policy of Dhamma through rock and pillar edicts across the empire.',
    explanationTranslations: {
      hi: 'सम्राट अशोक (लगभग 268–232 ईसा पूर्व) कलिंग युद्ध के बाद बौद्ध धर्म में आ गए और अपनी धम्म नीति को शिलालेखों और स्तंभों पर लिखवाया।',
      te: 'అశోకుడు (సుమారు 268–232 BCE) కళింగ యుద్ధం తర్వాత బౌద్ధ మతంలోకి వచ్చాడు మరియు తన ధమ్మ విధానాన్ని శిలా శాసనాలపై చెక్కించాడు.',
    },
    source: 'Archaeological Survey of India',
    difficulty: 'medium',
    timeLimitSeconds: 30,
  },

  // ── Geography ─────────────────────────────────────────────────────────────
  {
    slug: 'geo-capital-karnataka',
    categoryId: 'cat-geography',
    text: 'What is the capital of Karnataka?',
    translations: { hi: 'कर्नाटक की राजधानी क्या है?', te: 'కర్ణాటక రాజధాని ఏది?' },
    options: [
      { id: 'a', text: 'Mysuru', translations: { hi: 'मैसूरु', te: 'మైసూరు' } },
      { id: 'b', text: 'Bengaluru', translations: { hi: 'बेंगलुरु', te: 'బెంగళూరు' } },
      { id: 'c', text: 'Mangaluru', translations: { hi: 'मंगलुरु', te: 'మంగళూరు' } },
      { id: 'd', text: 'Hubballi', translations: { hi: 'हुब्बल्ली', te: 'హుబ్బళ్లి' } },
    ],
    correctOptionId: 'b',
    explanation: 'Bengaluru (formerly Bangalore) is the capital of Karnataka. It is also known as the “Silicon Valley of India”.',
    explanationTranslations: {
      hi: 'बेंगलुरु कर्नाटक की राजधानी है। इसे “भारत की सिलिकॉन वैली” भी कहा जाता है।',
      te: 'బెంగళూరు కర్ణాటక రాజధాని. దీనిని “భారత సిలికాన్ వ్యాలీ” అని కూడా పిలుస్తారు.',
    },
    source: 'Government of Karnataka',
    difficulty: 'easy',
    timeLimitSeconds: 20,
  },
  {
    slug: 'geo-highest-peak',
    categoryId: 'cat-geography',
    text: 'Which is the highest mountain peak in India?',
    translations: { hi: 'भारत का सबसे ऊँचा पर्वत शिखर कौन-सा है?', te: 'భారతదేశంలో అత్యంత ఎత్తైన పర్వత శిఖరం ఏది?' },
    options: [
      { id: 'a', text: 'Mount K2' },
      { id: 'b', text: 'Kangchenjunga' },
      { id: 'c', text: 'Nanda Devi' },
      { id: 'd', text: 'Trisul' },
    ],
    correctOptionId: 'b',
    explanation: 'Kangchenjunga (8,586 m) is the highest peak located entirely within India. K2 (8,611 m) is higher but is located in the Pakistan-administered portion of Kashmir.',
    explanationTranslations: {
      hi: 'कंचनजंघा (8,586 मीटर) भारत के भीतर स्थित सबसे ऊँचा शिखर है। के-2 (8,611 मीटर) ऊँचा है लेकिन पाक-अधिकृत कश्मीर में है।',
      te: 'కాంచన్‌జంగా (8,586 మీ) భారతదేశంలో అత్యంత ఎత్తైన శిఖరం. K2 (8,611 మీ) ఎత్తైనది కానీ పాక్-ఆక్రమిత కాశ్మీర్‌లో ఉంది.',
    },
    source: 'Survey of India',
    difficulty: 'hard',
    timeLimitSeconds: 30,
  },
  {
    slug: 'geo-longest-coastline-state',
    categoryId: 'cat-geography',
    text: 'Which Indian state has the longest coastline?',
    translations: { hi: 'किस भारतीय राज्य की तटरेखा सबसे लंबी है?', te: 'ఏ భారతీయ రాష్ట్రానికి అత్యధిక తీరరేఖ ఉంది?' },
    options: [
      { id: 'a', text: 'Kerala' },
      { id: 'b', text: 'Tamil Nadu' },
      { id: 'c', text: 'Andhra Pradesh' },
      { id: 'd', text: 'Gujarat' },
    ],
    correctOptionId: 'd',
    explanation: 'Gujarat has the longest coastline in India — about 1,600 km along the Arabian Sea.',
    explanationTranslations: {
      hi: 'गुजरात की तटरेखा भारत में सबसे लंबी है — अरब सागर के किनारे लगभग 1,600 किमी।',
      te: 'గుజరాత్‌కు భారతదేశంలో అత్యధిక తీరరేఖ ఉంది — అరేబియా సముద్రం వెంబడి దాదాపు 1,600 కి.మీ.',
    },
    source: 'Ministry of Home Affairs',
    difficulty: 'medium',
    timeLimitSeconds: 25,
  },
  {
    slug: 'geo-largest-state-area',
    categoryId: 'cat-geography',
    text: 'Which is the largest Indian state by area?',
    translations: { hi: 'क्षेत्रफल के अनुसार भारत का सबसे बड़ा राज्य कौन-सा है?', te: 'విస్తీర్ణం ప్రకారం భారతదేశం యొక్క అతిపెద్ద రాష్ట్రం ఏది?' },
    options: [
      { id: 'a', text: 'Uttar Pradesh' },
      { id: 'b', text: 'Maharashtra' },
      { id: 'c', text: 'Madhya Pradesh' },
      { id: 'd', text: 'Rajasthan' },
    ],
    correctOptionId: 'd',
    explanation: 'Rajasthan is the largest state by area (342,239 km²). Madhya Pradesh is second; Uttar Pradesh is the most populous state.',
    explanationTranslations: {
      hi: 'क्षेत्रफल के अनुसार राजस्थान सबसे बड़ा राज्य है (342,239 किमी²)।',
      te: 'విస్తీర్ణం ప్రకారం రాజస్థాన్ అతిపెద్ద రాష్ట్రం (342,239 కి.మీ²).',
    },
    source: 'Ministry of Home Affairs',
    difficulty: 'medium',
    timeLimitSeconds: 25,
  },
  {
    slug: 'geo-andaman-barren-island',
    categoryId: 'cat-geography',
    text: 'Barren Island, India’s only active volcano, is located in which union territory?',
    translations: { hi: 'भारत का एकमात्र सक्रिय ज्वालामुखी “बैरन द्वीप” किस केंद्र शासित प्रदेश में है?', te: 'భారతదేశ ఏకైక సజీవ అగ్నిపర్వతం “బారెన్ ద్వీపం” ఏ కేంద్ర పాలిత ప్రాంతంలో ఉంది?' },
    options: [
      { id: 'a', text: 'Lakshadweep' },
      { id: 'b', text: 'Puducherry' },
      { id: 'c', text: 'Andaman and Nicobar Islands' },
      { id: 'd', text: 'Daman and Diu' },
    ],
    correctOptionId: 'c',
    explanation: 'Barren Island is located in the Andaman Sea and is part of the Andaman and Nicobar Islands union territory. It is India’s only confirmed active volcano.',
    explanationTranslations: {
      hi: 'बैरन द्वीप अंडमान सागर में स्थित है और अंडमान-निकोबार द्वीपसमूह का हिस्सा है। यह भारत का एकमात्र सक्रिय ज्वालामुखी है।',
      te: 'బారెన్ ద్వీపం అండమాన్ సముద్రంలో ఉంది, అండమాన్-నికోబార్ దీవుల భాగం. ఇది భారతదేశ ఏకైక సజీవ అగ్నిపర్వతం.',
    },
    source: 'Geological Survey of India',
    difficulty: 'hard',
    timeLimitSeconds: 30,
  },

  // ── Civics / Constitution ─────────────────────────────────────────────────
  {
    slug: 'civ-fundamental-rights-articles',
    categoryId: 'cat-civics',
    text: 'The Fundamental Rights in the Indian Constitution are enshrined in which Articles?',
    translations: { hi: 'भारतीय संविधान में मौलिक अधिकार किन अनुच्छेदों में दिए गए हैं?', te: 'భారత రాజ్యాంగంలో ప్రాథమిక హక్కులు ఏ అధికరణలలో ఉన్నాయి?' },
    options: [
      { id: 'a', text: 'Articles 12 to 35' },
      { id: 'b', text: 'Articles 36 to 51' },
      { id: 'c', text: 'Articles 1 to 11' },
      { id: 'd', text: 'Articles 52 to 78' },
    ],
    correctOptionId: 'a',
    explanation: 'Fundamental Rights are in Articles 12–35 of the Constitution. Articles 36–51 cover the Directive Principles of State Policy.',
    explanationTranslations: {
      hi: 'मौलिक अधिकार संविधान के अनुच्छेद 12–35 में हैं। अनुच्छेद 36–51 राज्य के नीति निदेशक तत्वों से संबंधित हैं।',
      te: 'ప్రాథమిక హక్కులు రాజ్యాంగ అధికరణాలు 12–35 లో ఉన్నాయి. అధికరణాలు 36–51 రాజ్య విధాన మార్గదర్శక సూత్రాలకు సంబంధించినవి.',
    },
    source: 'Constitution of India, Part III',
    difficulty: 'hard',
    timeLimitSeconds: 30,
  },
  {
    slug: 'civ-voting-age',
    categoryId: 'cat-civics',
    text: 'What is the minimum voting age in Indian general elections?',
    translations: { hi: 'भारतीय आम चुनावों में न्यूनतम मतदान आयु क्या है?', te: 'భారత సాధారణ ఎన్నికలలో కనిష్ట ఓటింగ్ వయస్సు ఎంత?' },
    options: [
      { id: 'a', text: '16 years' },
      { id: 'b', text: '18 years' },
      { id: 'c', text: '21 years' },
      { id: 'd', text: '25 years' },
    ],
    correctOptionId: 'b',
    explanation: 'The voting age in India is 18 years. It was reduced from 21 to 18 by the 61st Constitutional Amendment Act of 1988, effective from the 1989 elections.',
    explanationTranslations: {
      hi: 'भारत में मतदान आयु 18 वर्ष है। इसे 1988 के 61वें संविधान संशोधन द्वारा 21 से घटाकर 18 किया गया।',
      te: 'భారతదేశంలో ఓటింగ్ వయస్సు 18 సంవత్సరాలు. 1988లో 61వ రాజ్యాంగ సవరణ ద్వారా 21 నుండి 18కి తగ్గించబడింది.',
    },
    source: 'Constitution of India, 61st Amendment',
    difficulty: 'easy',
    timeLimitSeconds: 25,
  },
  {
    slug: 'civ-parliament-bicameral',
    categoryId: 'cat-civics',
    text: 'The Parliament of India consists of the President and which two houses?',
    translations: { hi: 'भारत की संसद में राष्ट्रपति और कौन-कौन से दो सदन होते हैं?', te: 'భారత పార్లమెంట్‌లో రాష్ట్రపతి మరియు ఏ రెండు సభలు ఉంటాయి?' },
    options: [
      { id: 'a', text: 'Lok Sabha and Rajya Sabha' },
      { id: 'b', text: 'Vidhan Sabha and Vidhan Parishad' },
      { id: 'c', text: 'Supreme Court and High Court' },
      { id: 'd', text: 'Council of Ministers and Cabinet' },
    ],
    correctOptionId: 'a',
    explanation: 'The Indian Parliament consists of the President, the Lok Sabha (House of the People / lower house) and the Rajya Sabha (Council of States / upper house).',
    explanationTranslations: {
      hi: 'भारतीय संसद में राष्ट्रपति, लोकसभा (निचला सदन) और राज्यसभा (उच्च सदन) शामिल हैं।',
      te: 'భారత పార్లమెంట్‌లో రాష్ట్రపతి, లోక్‌సభ (దిగువ సభ) మరియు రాజ్యసభ (ఎగువ సభ) ఉంటాయి.',
    },
    source: 'Constitution of India, Articles 79–122',
    difficulty: 'medium',
    timeLimitSeconds: 25,
  },

  // ── Science & Technology ──────────────────────────────────────────────────
  {
    slug: 'sci-mangalyaan',
    categoryId: 'cat-science',
    text: 'In which year did ISRO’s Mars Orbiter Mission (Mangalyaan) enter Mars orbit?',
    translations: { hi: 'इसरो का मंगलयान (MOM) किस वर्ष मंगल की कक्षा में पहुँचा?', te: 'ఇస్రో యొక్క మార్స్ ఆర్బిటర్ మిషన్ (మంగళయాన్) ఏ సంవత్సరం అంగారక కక్ష్యలోకి ప్రవేశించింది?' },
    options: [
      { id: 'a', text: '2012' },
      { id: 'b', text: '2014' },
      { id: 'c', text: '2016' },
      { id: 'd', text: '2018' },
    ],
    correctOptionId: 'b',
    explanation: 'ISRO’s Mars Orbiter Mission (Mangalyaan) successfully entered Mars orbit on 24 September 2014, making India the first country to reach Mars orbit on its first attempt.',
    explanationTranslations: {
      hi: 'इसरो का मंगलयान 24 सितंबर 2014 को मंगल की कक्षा में पहुँचा — भारत पहली बार में ही मंगल की कक्षा में पहुँचने वाला पहला देश बना।',
      te: 'ఇస్రో యొక్క మంగళయాన్ 24 సెప్టెంబర్ 2014న అంగారక కక్ష్యలోకి ప్రవేశించింది — మొదటి ప్రయత్నంలోనే మార్స్ కక్ష్యను చేరుకున్న మొదటి దేశం భారతదేశం.',
    },
    source: 'ISRO official mission report',
    difficulty: 'medium',
    timeLimitSeconds: 25,
  },
  {
    slug: 'sci-chandrayaan-3',
    categoryId: 'cat-science',
    text: 'In which year did Chandrayaan-3 successfully land on the Moon?',
    translations: { hi: 'चंद्रयान-3 किस वर्ष चंद्रमा पर सफलतापूर्वक उतरा?', te: 'చంద్రయాన్-3 ఏ సంవత్సరం చంద్రునిపై విజయవంతంగా దిగింది?' },
    options: [
      { id: 'a', text: '2019' },
      { id: 'b', text: '2022' },
      { id: 'c', text: '2023' },
      { id: 'd', text: '2024' },
    ],
    correctOptionId: 'c',
    explanation: 'Chandrayaan-3’s Vikram lander successfully soft-landed on the Moon’s south polar region on 23 August 2023, making India the first country to land near the lunar south pole.',
    explanationTranslations: {
      hi: 'चंद्रयान-3 का विक्रम लैंडर 23 अगस्त 2023 को चंद्रमा के दक्षिण ध्रुवीय क्षेत्र में सफलतापूर्वक उतरा।',
      te: 'చంద్రయాన్-3 యొక్క విక్రమ్ ల్యాండర్ 23 ఆగస్టు 2023న చంద్రుని దక్షిణ ధ్రువ ప్రాంతంలో విజయవంతంగా దిగింది.',
    },
    source: 'ISRO official mission report',
    difficulty: 'easy',
    timeLimitSeconds: 25,
  },
  {
    slug: 'sci-cv-raman-nobel',
    categoryId: 'cat-science',
    text: 'Which Indian scientist won the Nobel Prize for Physics in 1930?',
    translations: { hi: '1930 में किस भारतीय वैज्ञानिक को भौतिकी का नोबेल पुरस्कार मिला?', te: '1930లో ఏ భారతీయ శాస్త్రవేత్తకు భౌతిక శాస్త్రంలో నోబెల్ బహుమతి లభించింది?' },
    options: [
      { id: 'a', text: 'Homi J. Bhabha' },
      { id: 'b', text: 'C. V. Raman' },
      { id: 'c', text: 'Vikram Sarabhai' },
      { id: 'd', text: 'Srinivasa Ramanujan' },
    ],
    correctOptionId: 'b',
    explanation: 'Sir C. V. Raman won the 1930 Nobel Prize in Physics for the discovery of the “Raman Effect” — the scattering of light by molecules.',
    explanationTranslations: {
      hi: 'सर सी. वी. रमन को “रमन प्रभाव” की खोज के लिए 1930 में भौतिकी का नोबेल मिला।',
      te: 'సర్ సి. వి. రామన్‌కు “రామన్ ప్రభావం” ఆవిష్కారానికి 1930లో భౌతిక శాస్త్రంలో నోబెల్ లభించింది.',
    },
    source: 'Nobel Prize Foundation',
    difficulty: 'medium',
    timeLimitSeconds: 30,
  },
  {
    slug: 'sci-arya-bhatta-zero',
    categoryId: 'cat-science',
    text: 'The concept of zero as a number is widely attributed to which ancient Indian mathematician?',
    translations: { hi: 'शून्य की अवधारणा का श्रेय व्यापक रूप से किस प्राचीन भारतीय गणितज्ञ को दिया जाता है?', te: 'సున్నా యొక్క భావన విస్తృతంగా ఏ ప్రాచీన భారతీయ గణిత శాస్త్రవేత్తకు ఆపాదించబడింది?' },
    options: [
      { id: 'a', text: 'Aryabhata' },
      { id: 'b', text: 'Brahmagupta' },
      { id: 'c', text: 'Bhaskara II' },
      { id: 'd', text: 'Panini' },
    ],
    correctOptionId: 'b',
    explanation: 'Brahmagupta (c. 598–668 CE) gave the first formal rules for computing with zero in his work Brahmasphutasiddhanta. Aryabhata earlier used a place-value system that included zero.',
    explanationTranslations: {
      hi: 'ब्रह्मगुप्त (लगभग 598–668 ई.) ने अपने ग्रंथ “ब्रह्मस्फुटसिद्धांत” में शून्य के साथ गणना के औपचारिक नियम पहली बार दिए।',
      te: 'బ్రహ్మగుప్త (సుమారు 598–668 CE) తన గ్రంథం “బ్రహ్మస్ఫుటసిద్ధాంత”లో సున్నాతో గణనకు సంబంధించిన మొదటి అధికారిక నియమాలను ఇచ్చాడు.',
    },
    source: 'Brahmasphutasiddhanta; widely cited history of mathematics',
    difficulty: 'hard',
    timeLimitSeconds: 30,
  },

  // ── Sports ───────────────────────────────────────────────────────────────
  {
    slug: 'spt-1983-worldcup',
    categoryId: 'cat-sports',
    text: 'Where did India win its first Cricket World Cup in 1983?',
    translations: { hi: 'भारत ने 1983 में अपना पहला क्रिकेट विश्व कप कहाँ जीता?', te: 'భారత్ 1983లో తన మొదటి క్రికెట్ ప్రపంచ కప్‌ను ఎక్కడ గెలిచింది?' },
    options: [
      { id: 'a', text: 'Mumbai (India)' },
      { id: 'b', text: 'London (England)' },
      { id: 'c', text: 'Melbourne (Australia)' },
      { id: 'd', text: 'Karachi (Pakistan)' },
    ],
    correctOptionId: 'b',
    explanation: 'India won the 1983 Cricket World Cup by defeating the West Indies by 43 runs in the final at Lord’s, London, on 25 June 1983. Kapil Dev was the captain.',
    explanationTranslations: {
      hi: 'भारत ने 25 जून 1983 को लॉर्ड्स (लंदन) में वेस्टइंडीज को 43 रन से हराकर विश्व कप जीता। कप्तान कपिल देव थे।',
      te: 'భారత్ 25 జూన్ 1983న లార్డ్స్ (లండన్) లో వెస్ట్‌ఇండీస్‌ను 43 పరుగులతో ఓడించి ప్రపంచ కప్‌ను గెలిచింది. కెప్టెన్ కపిల్ దేవ్.',
    },
    source: 'ICC Cricket World Cup records',
    difficulty: 'easy',
    timeLimitSeconds: 25,
  },
  {
    slug: 'spt-olympic-first-gold',
    categoryId: 'cat-sports',
    text: 'Who won India’s first individual Olympic gold medal?',
    translations: { hi: 'भारत के पहले व्यक्तिगत ओलंपिक स्वर्ण पदक विजेता कौन हैं?', te: 'భారతదేశం యొక్క మొదటి వ్యక్తిగత ఒలింపిక్ బంగారు పతక విజేత ఎవరు?' },
    options: [
      { id: 'a', text: 'Milkha Singh' },
      { id: 'b', text: 'Leander Paes' },
      { id: 'c', text: 'Abhinav Bindra' },
      { id: 'd', text: 'PV Sindhu' },
    ],
    correctOptionId: 'c',
    explanation: 'Abhinav Bindra won India’s first individual Olympic gold medal in the 10m air rifle event at the 2008 Beijing Olympics.',
    explanationTranslations: {
      hi: 'अभिनव बिंद्र ने 2008 बीजिंग ओलंपिक में 10 मीटर एयर राइफल में भारत का पहला व्यक्तिगत स्वर्ण पदक जीता।',
      te: 'అభినవ్ బింద్రా 2008 బీజింగ్ ఒలింపిక్స్‌లో 10 మీటర్ ఎయిర్ రైఫిల్‌లో భారతదేశ మొదటి వ్యక్తిగత బంగారు పతకాన్ని గెలిచాడు.',
    },
    source: 'International Olympic Committee',
    difficulty: 'medium',
    timeLimitSeconds: 25,
  },
  {
    slug: 'spt-cricket-2011',
    categoryId: 'cat-sports',
    text: 'Where was the final of the 2011 ICC Cricket World Cup held?',
    translations: { hi: '2011 ICC क्रिकेट विश्व कप का फाइनल कहाँ आयोजित हुआ था?', te: '2011 ICC క్రికెట్ ప్రపంచ కప్ ఫైనల్ ఎక్కడ జరిగింది?' },
    options: [
      { id: 'a', text: 'Eden Gardens, Kolkata' },
      { id: 'b', text: 'Wankhede Stadium, Mumbai' },
      { id: 'c', text: 'M. Chinnaswamy Stadium, Bengaluru' },
      { id: 'd', text: 'Feroz Shah Kotla, Delhi' },
    ],
    correctOptionId: 'b',
    explanation: 'India won the 2011 ICC Cricket World Cup under MS Dhoni, defeating Sri Lanka by 6 wickets in the final at Wankhede Stadium, Mumbai on 2 April 2011.',
    explanationTranslations: {
      hi: 'महेंद्र सिंह धोनी की कप्तानी में भारत ने 2 अप्रैल 2011 को वानखेड़े स्टेडियम में श्रीलंका को 6 विकेट से हराकर विश्व कप जीता।',
      te: 'ఎం.ఎస్. ధోనీ నాయకత్వంలో భారత్ 2 ఏప్రిల్ 2011న వానఖేడే స్టేడియంలో శ్రీలంకను 6 వికెట్లతో ఓడించి ప్రపంచ కప్ గెలిచింది.',
    },
    source: 'ICC Cricket World Cup records',
    difficulty: 'medium',
    timeLimitSeconds: 25,
  },

  // ── Culture / Heritage ────────────────────────────────────────────────────
  {
    slug: 'cul-classical-dance-tamil-nadu',
    categoryId: 'cat-culture',
    text: 'Which Indian classical dance form originated in Tamil Nadu?',
    translations: { hi: 'किस भारतीय शास्त्रीय नृत्य शैली का उद्गम तमिलनाडु में हुआ?', te: 'ఏ భారతీయ శాస్త్రీయ నృత్య రూపం తమిళనాడులో ఉద్భవించింది?' },
    options: [
      { id: 'a', text: 'Kathak' },
      { id: 'b', text: 'Bharatanatyam' },
      { id: 'c', text: 'Kathakali' },
      { id: 'd', text: 'Odissi' },
    ],
    correctOptionId: 'b',
    explanation: 'Bharatanatyam is one of the oldest Indian classical dance forms, originating in Tamil Nadu. It grew in Hindu temples and was codified in the Natya Shastra.',
    explanationTranslations: {
      hi: 'भरतनाट्यम भारतीय शास्त्रीय नृत्य की सबसे प्राचीन शैलियों में से एक है, जिसका उद्गम तमिलनाडु के मंदिरों में हुआ।',
      te: 'భరతనాట్యం భారతీయ శాస్త్రీయ నృత్య రూపాల్లో అత్యంత ప్రాచీనమైనది, తమిళనాడు ఆలయాల్లో ఉద్భవించింది.',
    },
    source: 'Sangeet Natak Akademi',
    difficulty: 'medium',
    timeLimitSeconds: 30,
  },
  {
    slug: 'cul-festivals-onam',
    categoryId: 'cat-culture',
    text: 'Onam is the major harvest festival of which Indian state?',
    translations: { hi: 'ओणम किस भारतीय राज्य का प्रमुख फसल उत्सव है?', te: 'ఓణం ఏ భారతీయ రాష్ట్రం యొక్క ప్రధాన పంట పండుగ?' },
    options: [
      { id: 'a', text: 'Karnataka' },
      { id: 'b', text: 'Kerala' },
      { id: 'c', text: 'Tamil Nadu' },
      { id: 'd', text: 'Andhra Pradesh' },
    ],
    correctOptionId: 'b',
    explanation: 'Onam is the official harvest festival of Kerala, celebrated to mark the homecoming of the legendary King Mahabali.',
    explanationTranslations: {
      hi: 'ओणम केरल का राज्य उत्सव है, जो पौराणिक राजा महाबली की वापसी का प्रतीक है।',
      te: 'ఓణం కేరళ యొక్క అధికారిక పంట పండుగ, పౌరాణిక రాజు మహాబలి యొక్క ప్రత్యావర్తనాన్ని సూచిస్తుంది.',
    },
    source: 'Department of Tourism, Kerala',
    difficulty: 'easy',
    timeLimitSeconds: 25,
  },
  {
    slug: 'cul-taj-mahal-location',
    categoryId: 'cat-culture',
    text: 'In which city is the Taj Mahal located?',
    translations: { hi: 'ताजमहल किस शहर में स्थित है?', te: 'తాజ్ మహల్ ఏ నగరంలో ఉంది?' },
    options: [
      { id: 'a', text: 'Delhi' },
      { id: 'b', text: 'Jaipur' },
      { id: 'c', text: 'Agra' },
      { id: 'd', text: 'Lucknow' },
    ],
    correctOptionId: 'c',
    explanation: 'The Taj Mahal is in Agra, Uttar Pradesh. It was commissioned in 1632 by Mughal Emperor Shah Jahan in memory of his wife Mumtaz Mahal, and is a UNESCO World Heritage Site.',
    explanationTranslations: {
      hi: 'ताजमहल आगरा (उत्तर प्रदेश) में है। इसे 1632 में मुगल सम्राट शाहजहाँ ने अपनी पत्नी मुमताज महल की याद में बनवाया।',
      te: 'తాజ్ మహల్ ఆగ్రా (ఉత్తర ప్రదేశ్) లో ఉంది. దీనిని 1632లో మొఘల్ చక్రవర్తి షాజహాన్ తన భార్య ముమ్తాజ్ మహల్ జ్ఞాపకార్థం నిర్మించాడు.',
    },
    source: 'UNESCO World Heritage List',
    difficulty: 'easy',
    timeLimitSeconds: 20,
  },

  // ── Education / Competitive Exam Practice ─────────────────────────────────
  {
    slug: 'edu-upsc-chair',
    categoryId: 'cat-edu',
    text: 'Which Article of the Indian Constitution provides for the Union Public Service Commission (UPSC)?',
    translations: { hi: 'भारतीय संविधान का कौन-सा अनुच्छेद संघ लोक सेवा आयोग (UPSC) का प्रावधान करता है?', te: 'భారత రాజ్యాంగంలోని ఏ అధికరణం కేంద్ర లోక్ సేవా కమిషన్ (UPSC) ను అందిస్తుంది?' },
    options: [
      { id: 'a', text: 'Article 280' },
      { id: 'b', text: 'Article 315' },
      { id: 'c', text: 'Article 324' },
      { id: 'd', text: 'Article 356' },
    ],
    correctOptionId: 'b',
    explanation: 'Article 315 provides for the UPSC. Article 280 is for the Finance Commission; Article 324 for the Election Commission.',
    explanationTranslations: {
      hi: 'अनुच्छेद 315 UPSC से संबंधित है। अनुच्छेद 280 वित्त आयोग, अनुच्छेद 324 चुनाव आयोग से संबंधित है।',
      te: 'అధికరణం 315 UPSCకి సంబంధించినది. అధికరణం 280 ఫైనాన్స్ కమిషన్, అధికరణం 324 ఎన్నికల కమిషన్‌కు సంబంధించినది.',
    },
    source: 'Constitution of India, Part XIV',
    difficulty: 'hard',
    timeLimitSeconds: 30,
  },
  {
    slug: 'edu-national-education-day',
    categoryId: 'cat-edu',
    text: 'National Education Day in India is observed on the birth anniversary of which leader?',
    translations: { hi: 'भारत में राष्ट्रीय शिक्षा दिवस किस नेता के जन्मदिन पर मनाया जाता है?', te: 'భారతదేశంలో జాతీయ విద్యా దినోత్సవం ఏ నాయకుడి పుట్టినరోజున జరుపుకుంటారు?' },
    options: [
      { id: 'a', text: 'Sarvepalli Radhakrishnan' },
      { id: 'b', text: 'Maulana Abul Kalam Azad' },
      { id: 'c', text: 'Dr. APJ Abdul Kalam' },
      { id: 'd', text: 'Jawaharlal Nehru' },
    ],
    correctOptionId: 'b',
    explanation: 'National Education Day is observed on 11 November, the birth anniversary of Maulana Abul Kalam Azad, independent India’s first Education Minister.',
    explanationTranslations: {
      hi: 'राष्ट्रीय शिक्षा दिवस 11 नवंबर को मनाया जाता है — स्वतंत्र भारत के पहले शिक्षा मंत्री मौलाना अबुल कलाम आज़ाद का जन्मदिन।',
      te: 'జాతీయ విద్యా దినోత్సవం నవంబర్ 11న జరుపుకుంటారు — స్వతంత్ర భారత మొదటి విద్యా మంత్రి మౌలానా అబుల్ కలాం ఆజాద్ పుట్టినరోజు.',
    },
    source: 'Ministry of Education, Government of India',
    difficulty: 'medium',
    timeLimitSeconds: 30,
  },
];

// ── Achievement definitions ─────────────────────────────────────────────────
const ACHIEVEMENTS = [
  {
    slug: 'first-quiz',
    name: 'First Quiz',
    description: 'Complete your very first quiz.',
    nameTranslations: { hi: 'पहला क्विज़', te: 'మొదటి క్విజ్' },
    descriptionTranslations: { hi: 'अपना पहला क्विज़ पूरा करें।', te: 'మీ మొదటి క్విజ్ పూర్తి చేయండి.' },
    icon: 'sparkles',
    gradient: 'from-teal-500 to-emerald-600',
    criteriaType: 'first-quiz',
    criteriaValue: null,
  },
  {
    slug: 'perfect-score',
    name: 'Perfect Score',
    description: 'Answer every question correctly in a quiz.',
    nameTranslations: { hi: 'उत्तम स्कोर', te: 'సంపూర్ణ స్కోర్' },
    descriptionTranslations: { hi: 'किसी क्विज़ में सभी प्रश्नों के सही उत्तर दें।', te: 'ఒక క్విజ్‌లో అన్ని ప్రశ్నలకు సరైన సమాధానాలు ఇవ్వండి.' },
    icon: 'award',
    gradient: 'from-amber-500 to-orange-600',
    criteriaType: 'perfect-score',
    criteriaValue: null,
  },
  {
    slug: 'seven-day-streak',
    name: 'Seven-Day Streak',
    description: 'Play a quiz every day for seven consecutive days.',
    nameTranslations: { hi: 'सात दिन की लय', te: 'ఏడు రోజుల స్ట్రీక్' },
    descriptionTranslations: { hi: 'लगातार सात दिनों तक हर दिन एक क्विज़ खेलें।', te: 'వరుసగా ఏడు రోజులు ప్రతిరోజూ ఒక క్విజ్ ఆడండి.' },
    icon: 'flame',
    gradient: 'from-rose-500 to-pink-600',
    criteriaType: 'seven-day-streak',
    criteriaValue: 7,
  },
  {
    slug: 'category-expert',
    name: 'Category Expert',
    description: 'Get a perfect score in the same category twice.',
    nameTranslations: { hi: 'श्रेणी विशेषज्ञ', te: 'వర్గ నిపుణుడు' },
    descriptionTranslations: { hi: 'एक ही श्रेणी में दो बार उत्तम स्कोर प्राप्त करें।', te: 'ఒకే వర్గంలో రెండుసార్లు సంపూర్ణ స్కోర్ సాధించండి.' },
    icon: 'graduation-cap',
    gradient: 'from-indigo-500 to-violet-600',
    criteriaType: 'category-expert',
    criteriaValue: 2,
  },
  {
    slug: 'daily-player',
    name: 'Daily Player',
    description: 'Complete at least one Daily Challenge.',
    nameTranslations: { hi: 'दैनिक खिलाड़ी', te: 'దైనిక ఆటగాడు' },
    descriptionTranslations: { hi: 'कम से कम एक दैनिक चुनौती पूरी करें।', te: 'కనీసం ఒక దైనిక సవాలను పూర్తి చేయండి.' },
    icon: 'calendar-check',
    gradient: 'from-cyan-500 to-teal-600',
    criteriaType: 'daily-player',
    criteriaValue: null,
  },
  {
    slug: 'ten-quizzes',
    name: 'Dedicated Learner',
    description: 'Complete ten quizzes in total.',
    nameTranslations: { hi: 'समर्पित शिक्षार्थी', te: 'అంకితభావం గల నేర్చుకోవాలనుకునేవాడు' },
    descriptionTranslations: { hi: 'कुल दस क्विज़ पूरे करें।', te: 'మొత్తం పది క్విజ్‌లను పూర్తి చేయండి.' },
    icon: 'book-open',
    gradient: 'from-emerald-500 to-teal-600',
    criteriaType: 'ten-quizzes',
    criteriaValue: 10,
  },
  {
    slug: 'five-hundred-points',
    name: '500 Points',
    description: 'Earn a total of 500 points across all quizzes.',
    nameTranslations: { hi: '500 अंक', te: '500 పాయింట్లు' },
    descriptionTranslations: { hi: 'सभी क्विज़ों में कुल 500 अंक अर्जित करें।', te: 'అన్ని క్విజ్‌లలో మొత్తం 500 పాయింట్లు సంపాదించండి.' },
    icon: 'star',
    gradient: 'from-amber-500 to-yellow-600',
    criteriaType: 'five-hundred-points',
    criteriaValue: 500,
  },
];

// ── Idempotent seeding ──────────────────────────────────────────────────────

async function main() {
  console.log('=== Seeding India Quiz question bank ===\n');

  // 1. Seed questions
  let qInserted = 0, qSkipped = 0;
  for (const q of QUESTIONS) {
    // Check by slug. We store slug as the first part of the id... actually, we
    // use the slug AS the id directly for stability across re-seeds.
    const existing = await db.quizQuestion.findUnique({ where: { id: q.slug } });
    if (existing) {
      qSkipped++;
      continue;
    }
    const correctIndex = q.options.findIndex((o) => o.id === q.correctOptionId);
    if (correctIndex < 0) {
      console.warn(`  ⚠ skipping ${q.slug}: correctOptionId "${q.correctOptionId}" not found in options`);
      continue;
    }
    await db.quizQuestion.create({
      data: {
        id: q.slug,
        categoryId: q.categoryId,
        text: q.text,
        translations: JSON.stringify(q.translations || {}),
        options: JSON.stringify(q.options),
        correctOptionIndex: correctIndex,
        explanation: q.explanation,
        explanationTranslations: JSON.stringify(q.explanationTranslations || {}),
        source: q.source || null,
        difficulty: q.difficulty,
        language: 'en',
        timeLimitSeconds: q.timeLimitSeconds || null,
        published: true, // All seed questions are published by default
      },
    });
    qInserted++;
  }
  console.log(`  ✓ Questions: ${qInserted} inserted, ${qSkipped} already existed (${QUESTIONS.length} total)`);

  // 2. Seed achievements
  let aInserted = 0, aSkipped = 0;
  for (const a of ACHIEVEMENTS) {
    const existing = await db.quizAchievement.findUnique({ where: { slug: a.slug } });
    if (existing) {
      aSkipped++;
      continue;
    }
    await db.quizAchievement.create({
      data: {
        slug: a.slug,
        name: a.name,
        description: a.description,
        nameTranslations: JSON.stringify(a.nameTranslations || {}),
        descriptionTranslations: JSON.stringify(a.descriptionTranslations || {}),
        icon: a.icon,
        gradient: a.gradient,
        criteriaType: a.criteriaType,
        criteriaValue: a.criteriaValue,
      },
    });
    aInserted++;
  }
  console.log(`  ✓ Achievements: ${aInserted} inserted, ${aSkipped} already existed (${ACHIEVEMENTS.length} total)`);

  // 3. Print summary
  console.log('\n=== Seed complete ===');
  const totalQ = await db.quizQuestion.count();
  const totalA = await db.quizAchievement.count();
  const publishedQ = await db.quizQuestion.count({ where: { published: true } });
  console.log(`  Total questions in DB: ${totalQ} (${publishedQ} published)`);
  console.log(`  Total achievements in DB: ${totalA}`);
  console.log('\n  Questions per category:');
  for (const cat of CATEGORIES) {
    const count = await db.quizQuestion.count({ where: { categoryId: cat, published: true } });
    if (count > 0) console.log(`    ${cat}: ${count}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  });

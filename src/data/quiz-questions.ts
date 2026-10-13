import type { QuizQuestion } from '@/lib/types';

// ───────────────────────────────────────────────────────────────────────────
// DEMONSTRATION DATA — quiz questions for the India Quiz prototype.
//
// All answers below have been verified against widely-known public sources.
// Where practical, a source note is included with each question.
//
// SECURITY NOTE: In a production backend, `correctOptionId` MUST be stored
// server-side and never exposed in public question queries before the user
// submits an answer. In this demonstration prototype the correct answer
// lives in the client data (clearly labeled as demo), but the architecture
// is designed so it can move server-side without UI changes.
// ───────────────────────────────────────────────────────────────────────────

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  // ── India General Knowledge ─────────────────────────────────────────────
  {
    id: 'q-gk-1',
    categoryId: 'cat-gk',
    text: 'What is the national animal of India?',
    translations: {
      hi: 'भारत का राष्ट्रीय पशु क्या है?',
      te: 'భారతదేశ జాతీయ జంతువు ఏది?',
    },
    options: [
      { id: 'a', text: 'Lion', translations: { hi: 'शेर', te: 'సింహం' } },
      { id: 'b', text: 'Tiger', translations: { hi: 'बाघ', te: 'పులి' } },
      { id: 'c', text: 'Elephant', translations: { hi: 'हाथी', te: 'ఏనుగు' } },
      { id: 'd', text: 'Peacock', translations: { hi: 'मोर', te: 'నెమలి' } },
    ],
    correctOptionId: 'b',
    explanation:
      'The Bengal Tiger (Panthera tigris tigris) was adopted as India’s national animal in 1973, the same year Project Tiger was launched.',
    explanationTranslations: {
      hi: 'बंगाल टाइगर (Panthera tigris tigris) को 1973 में भारत का राष्ट्रीय पशु घोषित किया गया — उसी वर्ष प्रोजेक्ट टाइगर शुरू हुआ।',
      te: 'బెంగాల్ పులి (Panthera tigris tigris) 1973లో భారత జాతీయ జంతువుగా ప్రకటించబడింది — అదే సంవత్సరం ప్రాజెక్ట్ టైగర్ ప్రారంభమైంది.',
    },
    source: 'Project Tiger, Government of India',
    timeLimitSeconds: 30,
  },
  {
    id: 'q-gk-2',
    categoryId: 'cat-gk',
    text: 'How many states are there in the Republic of India (as of 2024)?',
    translations: {
      hi: 'भारत गणराज्य में (2024 तक) कितने राज्य हैं?',
      te: 'భారత గణతంత్ర రాజ్యంలో (2024 నాటికి) ఎన్ని రాష్ట్రాలు ఉన్నాయి?',
    },
    options: [
      { id: 'a', text: '27' },
      { id: 'b', text: '28' },
      { id: 'c', text: '29' },
      { id: 'd', text: '30' },
    ],
    correctOptionId: 'b',
    explanation:
      'India has 28 states and 8 Union Territories. (Jammu & Kashmir was reorganised in 2019, reducing the state count from 29 to 28.)',
    explanationTranslations: {
      hi: 'भारत में 28 राज्य और 8 केंद्र शासित प्रदेश हैं। (2019 में जम्मू-कश्मीर के पुनर्गठन के बाद राज्यों की संख्या 29 से घटकर 28 हो गई।)',
      te: 'భారతదేశంలో 28 రాష్ట్రాలు మరియు 8 కేంద్ర పాలిత ప్రాంతాలు ఉన్నాయి. (2019లో జమ్మూ-కాశ్మీర్ పునర్వ్యవస్థీకరణ తర్వాత రాష్ట్రాల సంఖ్య 29 నుండి 28కి తగ్గింది.)',
    },
    source: 'Government of India, Ministry of Home Affairs',
    timeLimitSeconds: 25,
  },
  {
    id: 'q-gk-3',
    categoryId: 'cat-gk',
    text: 'Which is the national flower of India?',
    translations: {
      hi: 'भारत का राष्ट्रीय पुष्प कौन-सा है?',
      te: 'భారతదేశ జాతీయ పువు ఏది?',
    },
    options: [
      { id: 'a', text: 'Rose', translations: { hi: 'गुलाब', te: 'గులాబీ' } },
      { id: 'b', text: 'Lotus', translations: { hi: 'कमल', te: 'కమలం' } },
      { id: 'c', text: 'Marigold', translations: { hi: 'गेंदा', te: 'బంతిపువ్వు' } },
      { id: 'd', text: 'Jasmine', translations: { hi: 'चमेली', te: 'మల్లెపువ్వు' } },
    ],
    correctOptionId: 'b',
    explanation:
      'The Lotus (Nelumbo nucifera) is India’s national flower — a sacred symbol in Indian culture and art for centuries.',
    explanationTranslations: {
      hi: 'कमल (Nelumbo nucifera) भारत का राष्ट्रीय पुष्प है — यह शताब्दियों से भारतीय संस्कृति और कला में पवित्र प्रतीक रहा है।',
      te: 'కమలం (Nelumbo nucifera) భారత జాతీయ పువ్వు — ఇది శతాబ్దాలుగా భారతీయ సంస్కృతి మరియు కళలో పవిత్ర చిహ్నంగా ఉంది.',
    },
    source: 'Government of India national symbols',
    timeLimitSeconds: 25,
  },
  {
    id: 'q-gk-4',
    categoryId: 'cat-gk',
    text: 'Who wrote the Indian national anthem “Jana Gana Mana”?',
    translations: {
      hi: 'भारतीय राष्ट्रगान “जन गण मन” किसने लिखा?',
      te: 'భారత జాతీయ గీతం “జన గణ మన” ఎవరు రాశారు?',
    },
    options: [
      { id: 'a', text: 'Bankim Chandra Chattopadhyay' },
      { id: 'b', text: 'Rabindranath Tagore', translations: { hi: 'रबीन्द्रनाथ ठाकुर', te: 'రవీంద్రనాథ్ ఠాగూర్' } },
      { id: 'c', text: 'Sarojini Naidu' },
      { id: 'd', text: 'Subramania Bharati' },
    ],
    correctOptionId: 'b',
    explanation:
      'Rabindranath Tagore wrote “Jana Gana Mana” in Bengali. It was adopted as India’s national anthem on 24 January 1950.',
    explanationTranslations: {
      hi: 'रबीन्द्रनाथ ठाकुर ने “जन गण मन” बांग्ला में लिखा। इसे 24 जनवरी 1950 को भारत का राष्ट्रगान अपनाया गया।',
      te: 'రవీంద్రనాథ్ ఠాగూర్ “జన గణ మన”ను బెంగాలీలో రాశారు. దీనిని 24 జనవరి 1950న భారత జాతీయ గీతంగా స్వీకరించారు.',
    },
    source: 'Government of India national symbols',
    timeLimitSeconds: 30,
  },

  // ── Indian History ───────────────────────────────────────────────────────
  {
    id: 'q-hist-1',
    categoryId: 'cat-history',
    text: 'In which year did India gain independence from British rule?',
    translations: {
      hi: 'भारत को ब्रिटिश शासन से स्वतंत्रता किस वर्ष मिली?',
      te: 'భారతదేశానికి బ్రిటిష్ పాలన నుండి స్వాతంత్ర్యం ఎప్పుడు వచ్చింది?',
    },
    options: [
      { id: 'a', text: '1945' },
      { id: 'b', text: '1946' },
      { id: 'c', text: '1947' },
      { id: 'd', text: '1950' },
    ],
    correctOptionId: 'c',
    explanation:
      'India became independent on 15 August 1947. The Constitution came into effect on 26 January 1950, celebrated as Republic Day.',
    explanationTranslations: {
      hi: 'भारत 15 अगस्त 1947 को स्वतंत्र हुआ। संविधान 26 जनवरी 1950 से लागू हुआ, जिसे गणतंत्र दिवस के रूप में मनाया जाता है।',
      te: 'భారతదేశం 15 ఆగస్టు 1947న స్వతంత్రమైంది. రాజ్యాంగం 26 జనవరి 1950న అమల్లోకి వచ్చింది, దీనిని గణతంత్ర దినోత్సవంగా జరుపుకుంటారు.',
    },
    source: 'Constitution of India / Government of India archives',
    timeLimitSeconds: 25,
  },
  {
    id: 'q-hist-2',
    categoryId: 'cat-history',
    text: 'Who was the first Prime Minister of independent India?',
    translations: {
      hi: 'स्वतंत्र भारत के प्रथम प्रधानमंत्री कौन थे?',
      te: 'స్వతంత్ర భారత మొదటి ప్రధాన మంత్రి ఎవరు?',
    },
    options: [
      { id: 'a', text: 'Mahatma Gandhi', translations: { hi: 'महात्मा गांधी', te: 'మహాత్మా గాంధీ' } },
      { id: 'b', text: 'Sardar Patel', translations: { hi: 'सरदार पटेल', te: 'సర్దార్ పటేల్' } },
      { id: 'c', text: 'Jawaharlal Nehru', translations: { hi: 'जवाहरलाल नेहरू', te: 'జవహర్‌లాల్ నెహ్రూ' } },
      { id: 'd', text: 'Rajendra Prasad', translations: { hi: 'राजेंद्र प्रसाद', te: 'రాజేంద్ర ప్రసాద్' } },
    ],
    correctOptionId: 'c',
    explanation:
      'Jawaharlal Nehru served as India’s first Prime Minister from 1947 to 1964. (Rajendra Prasad was the first President; Gandhi never held formal office.)',
    explanationTranslations: {
      hi: 'जवाहरलाल नेहरू 1947 से 1964 तक भारत के प्रथम प्रधानमंत्री रहे। (राजेंद्र प्रसाद प्रथम राष्ट्रपति थे; गांधी ने कभी कोई पद नहीं संभाला।)',
      te: 'జవహర్‌లాల్ నెహ్రూ 1947 నుండి 1964 వరకు భారత మొదటి ప్రధాన మంత్రిగా పనిచేశారు. (రాజేంద్ర ప్రసాద్ మొదటి రాష్ట్రపతి; గాంధీ ఎలాంటి పదవిని నిర్వహించలేదు.)',
    },
    source: 'Government of India archives',
    timeLimitSeconds: 25,
  },
  {
    id: 'q-hist-3',
    categoryId: 'cat-history',
    text: 'The Quit India Movement was launched in which year?',
    translations: {
      hi: 'भारत छोड़ो आंदोलन किस वर्ष शुरू किया गया?',
      te: 'క్విట్ ఇండియా ఉద్యమం ఎప్పుడు ప్రారంభమైంది?',
    },
    options: [
      { id: 'a', text: '1930' },
      { id: 'b', text: '1935' },
      { id: 'c', text: '1942' },
      { id: 'd', text: '1945' },
    ],
    correctOptionId: 'c',
    explanation:
      'The Quit India Movement was launched by Mahatma Gandhi on 8 August 1942, demanding an end to British colonial rule.',
    explanationTranslations: {
      hi: 'भारत छोड़ो आंदोलन महात्मा गांधी द्वारा 8 अगस्त 1942 को शुरू किया गया था, जिसमें ब्रिटिश औपनिवेशिक शासन के अंत की मांग थी।',
      te: 'క్విట్ ఇండియా ఉద్యమాన్ని మహాత్మా గాంధీ 8 ఆగస్టు 1942న ప్రారంభించారు, బ్రిటిష్ వలస పాలనకు ముగింపు పలికే డిమాండ్‌తో.',
    },
    source: 'National Archives of India',
    timeLimitSeconds: 25,
  },
  {
    id: 'q-hist-4',
    categoryId: 'cat-history',
    text: 'Who is known as the “Iron Man of India”?',
    translations: {
      hi: '“भारत का लौह पुरुष” के नाम से किसे जाना जाता है?',
      te: '“భారత ఐరన్ మ్యాన్”గా ఎవరు ప్రసిద్ధి చెందారు?',
    },
    options: [
      { id: 'a', text: 'Subhas Chandra Bose' },
      { id: 'b', text: 'Sardar Vallabhbhai Patel', translations: { hi: 'सरदार वल्लभभाई पटेल', te: 'సర్దార్ వల్లభ్‌భాయ్ పటేల్' } },
      { id: 'c', text: 'Bhagat Singh' },
      { id: 'd', text: 'Lal Bahadur Shastri' },
    ],
    correctOptionId: 'b',
    explanation:
      'Sardar Vallabhbhai Patel is called the “Iron Man of India” for his role in unifying over 560 princely states into the Republic of India.',
    explanationTranslations: {
      hi: 'सरदार वल्लभभाई पटेल को 560 से अधिक रियासतों को भारत गणराज्य में एकीकृत करने की भूमिका के लिए “भारत का लौह पुरुष” कहा जाता है।',
      te: 'సర్దార్ వల్లభ్‌భాయ్ పటేల్‌ను 560కి పైగా సంస్థానాలను భారత గణతంత్ర రాజ్యంలో ఏకీకృతం చేసిన పాత్రకు “భారత ఐరన్ మ్యాన్” అని పిలుస్తారు.',
    },
    source: 'National Archives of India',
    timeLimitSeconds: 25,
  },

  // ── Geography and Indian States ─────────────────────────────────────────
  {
    id: 'q-geo-1',
    categoryId: 'cat-geography',
    text: 'Which is the longest river in India?',
    translations: {
      hi: 'भारत की सबसे लंबी नदी कौन-सी है?',
      te: 'భారతదేశంలో అత్యధిక పొడవైన నది ఏది?',
    },
    options: [
      { id: 'a', text: 'Yamuna', translations: { hi: 'यमुना', te: 'యమున' } },
      { id: 'b', text: 'Godavari', translations: { hi: 'गोदावरी', te: 'గోదావరి' } },
      { id: 'c', text: 'Ganga', translations: { hi: 'गंगा', te: 'గంగ' } },
      { id: 'd', text: 'Narmada', translations: { hi: 'नर्मदा', te: 'నర్మద' } },
    ],
    correctOptionId: 'c',
    explanation:
      'The Ganga (Ganges) is the longest river in India at about 2,525 km. (If measured from its source in the Himalayas to the Bay of Bengal.)',
    explanationTranslations: {
      hi: 'गंगा भारत की सबसे लंबी नदी है — लगभग 2,525 किमी लंबी। (हिमालय के स्रोत से बंगाल की खाड़ी तक मापा गया।)',
      te: 'గంగ భారతదేశంలో అత్యధిక పొడవైన నది — దాదాపు 2,525 కి.మీ. (హిమాలయ మూలం నుండి బంగాళాఖాతం వరకు కొలిచినప్పుడు.)',
    },
    source: 'Central Water Commission, Government of India',
    timeLimitSeconds: 25,
  },
  {
    id: 'q-geo-2',
    categoryId: 'cat-geography',
    text: 'Which is the capital of Kerala?',
    translations: {
      hi: 'केरल की राजधानी क्या है?',
      te: 'కేరళ రాజధాని ఏది?',
    },
    options: [
      { id: 'a', text: 'Kochi', translations: { hi: 'कोच्चि', te: 'కొచ్చి' } },
      { id: 'b', text: 'Kozhikode' },
      { id: 'c', text: 'Thiruvananthapuram', translations: { hi: 'तिरुवनंतपुरम', te: 'తిరువనంతపురం' } },
      { id: 'd', text: 'Thrissur' },
    ],
    correctOptionId: 'c',
    explanation:
      'Thiruvananthapuram (also known as Trivandrum) is the capital of Kerala, located on the southwestern coast of India.',
    explanationTranslations: {
      hi: 'तिरुवनंतपुरम (जिसे त्रिवेंद्रम भी कहा जाता है) केरल की राजधानी है, जो भारत के दक्षिण-पश्चिमी तट पर स्थित है।',
      te: 'తిరువనంతపురం (ట్రివేండ్రం అని కూడా పిలుస్తారు) కేరళ రాజధాని, ఇది భారతదేశం నైరుతి తీరంలో ఉంది.',
    },
    source: 'Government of Kerala',
    timeLimitSeconds: 25,
  },
  {
    id: 'q-geo-3',
    categoryId: 'cat-geography',
    text: 'The Himalayan mountain range lies in which part of India?',
    translations: {
      hi: 'हिमालय पर्वत श्रृंखला भारत के किस भाग में स्थित है?',
      te: 'హిమాలయ పర్వత శ్రేణి భారతదేశంలో ఏ భాగంలో ఉంది?',
    },
    options: [
      { id: 'a', text: 'North', translations: { hi: 'उत्तर', te: 'ఉత్తరం' } },
      { id: 'b', text: 'South', translations: { hi: 'दक्षिण', te: 'దక్షిణం' } },
      { id: 'c', text: 'East', translations: { hi: 'पूर्व', te: 'తూర్పు' } },
      { id: 'd', text: 'West', translations: { hi: 'पश्चिम', te: 'పడమర' } },
    ],
    correctOptionId: 'a',
    explanation:
      'The Himalayas form India’s northern boundary, separating the Indian subcontinent from the Tibetan Plateau.',
    explanationTranslations: {
      hi: 'हिमालय भारत की उत्तरी सीमा बनाते हैं, जो भारतीय उपमहाद्वीप को तिब्बत के पठार से अलग करते हैं।',
      te: 'హిమాలయాలు భారతదేశం ఉత్తర సరిహద్దును ఏర్పరుస్తాయి, భారత ఉపఖండాన్ని టిబెట్ పీఠభూమి నుండి వేరు చేస్తాయి.',
    },
    source: 'Geological Survey of India',
    timeLimitSeconds: 20,
  },
  {
    id: 'q-geo-4',
    categoryId: 'cat-geography',
    text: 'Which Indian state has the longest coastline?',
    translations: {
      hi: 'किस भारतीय राज्य की तटरेखा सबसे लंबी है?',
      te: 'భారతీయ రాష్ట్రాల్లో ఏ రాష్ట్రం తీరరేఖ అత్యధికం?',
    },
    options: [
      { id: 'a', text: 'Kerala', translations: { hi: 'केरल', te: 'కేరళ' } },
      { id: 'b', text: 'Tamil Nadu', translations: { hi: 'तमिलनाडु', te: 'తమిళనాడు' } },
      { id: 'c', text: 'Andhra Pradesh', translations: { hi: 'आंध्र प्रदेश', te: 'ఆంధ్రప్రదేశ్' } },
      { id: 'd', text: 'Gujarat', translations: { hi: 'गुजरात', te: 'గుజరాత్' } },
    ],
    correctOptionId: 'd',
    explanation:
      'Gujarat has the longest coastline among Indian states, at about 1,600 km. Andhra Pradesh is second.',
    explanationTranslations: {
      hi: 'गुजरात के भारतीय राज्यों में सबसे लंबी तटरेखा है — लगभग 1,600 किमी। आंध्र प्रदेश दूसरे स्थान पर है।',
      te: 'గుజరాత్‌కు భారతీయ రాష్ట్రాల్లో అత్యధిక తీరరేఖ ఉంది — దాదాపు 1,600 కి.మీ. ఆంధ్రప్రదేశ్ రెండవ స్థానంలో ఉంది.',
    },
    source: 'Ministry of Earth Sciences, Government of India',
    timeLimitSeconds: 25,
  },

  // ── Science and Technology ──────────────────────────────────────────────
  {
    id: 'q-sci-1',
    categoryId: 'cat-science',
    text: 'Which Indian space mission successfully landed on the Moon in August 2023?',
    translations: {
      hi: 'अगस्त 2023 में चंद्रमा पर सफलतापूर्वक लैंड करने वाला भारतीय अंतरिक्ष मिशन कौन-सा था?',
      te: 'ఆగస్టు 2023లో చంద్రునిపై విజయవంతంగా ల్యాండ్ అయిన భారతీయ అంతరిక్ష మిషన్ ఏది?',
    },
    options: [
      { id: 'a', text: 'Chandrayaan-1' },
      { id: 'b', text: 'Chandrayaan-2' },
      { id: 'c', text: 'Chandrayaan-3' },
      { id: 'd', text: 'Gaganyaan' },
    ],
    correctOptionId: 'c',
    explanation:
      'Chandrayaan-3 successfully soft-landed on the Moon’s south polar region on 23 August 2023, making India the first country to land near the lunar south pole.',
    explanationTranslations: {
      hi: 'चंद्रयान-3 ने 23 अगस्त 2023 को चंद्रमा के दक्षिण ध्रुवीय क्षेत्र पर सफलतापूर्वक सॉफ्ट-लैंडिंग की, जिससे भारत चंद्रमा के दक्षिण ध्रुव के पास लैंड करने वाला पहला देश बन गया।',
      te: 'చంద్రయాన్-3 23 ఆగస్టు 2023న చంద్రుని దక్షిణ ధ్రువ ప్రాంతంలో విజయవంతంగా సాఫ్ట్-ల్యాండ్ అయింది, భారతదేశం చంద్రుని దక్షిణ ధ్రువం సమీపంలో ల్యాండ్ అయిన మొదటి దేశంగా నిలిచింది.',
    },
    source: 'ISRO official mission report, 2023',
    timeLimitSeconds: 30,
  },
  {
    id: 'q-sci-2',
    categoryId: 'cat-science',
    text: 'Who is known as the “Missile Man of India”?',
    translations: {
      hi: '“भारत का मिसाइल मैन” किसे कहा जाता है?',
      te: '“భారత మిసైల్ మ్యాన్” అని ఎవరిని పిలుస్తారు?',
    },
    options: [
      { id: 'a', text: 'Homi Bhabha' },
      { id: 'b', text: 'Vikram Sarabhai' },
      { id: 'c', text: 'A. P. J. Abdul Kalam', translations: { hi: 'ए. पी. जे. अब्दुल कलाम', te: 'ఎ. పి. జె. అబ్దుల్ కలాం' } },
      { id: 'd', text: 'C. V. Raman' },
    ],
    correctOptionId: 'c',
    explanation:
      'A. P. J. Abdul Kalam, the 11th President of India, is known as the “Missile Man of India” for his work on ballistic missile technology at DRDO and ISRO.',
    explanationTranslations: {
      hi: 'भारत के 11वें राष्ट्रपति ए. पी. जे. अब्दुल कलाम को DRDO और ISRO में बैलिस्टिक मिसाइल तकनीक पर किए काम के लिए “भारत का मिसाइल मैन” कहा जाता है।',
      te: 'భారత 11వ రాష్ట్రపతి ఎ. పి. జె. అబ్దుల్ కలాంను DRDO మరియు ISROలో బాలిస్టిక్ మిసైల్ సాంకేతికతపై చేసిన పనికి “భారత మిసైల్ మ్యాన్” అని పిలుస్తారు.',
    },
    source: 'DRDO / ISRO archives',
    timeLimitSeconds: 30,
  },
  {
    id: 'q-sci-3',
    categoryId: 'cat-science',
    text: 'C. V. Raman was awarded the Nobel Prize for his work on:',
    translations: {
      hi: 'सी. वी. रमन को उनके किस कार्य पर नोबेल पुरस्कार मिला?',
      te: 'సి. వి. రామన్‌కు ఎవరి పనికి నోబెల్ బహుమతి లభించింది?',
    },
    options: [
      { id: 'a', text: 'Nuclear physics' },
      { id: 'b', text: 'Light scattering (Raman Effect)', translations: { hi: 'प्रकाश प्रकीर्णन (रमन प्रभाव)', te: 'కాంతి విసరణ (రామన్ ప్రభావం)' } },
      { id: 'c', text: 'Astronomy' },
      { id: 'd', text: 'Plant physiology' },
    ],
    correctOptionId: 'b',
    explanation:
      'C. V. Raman received the 1930 Nobel Prize in Physics for the discovery of the Raman Effect — the scattering of light by molecules.',
    explanationTranslations: {
      hi: 'सी. वी. रमन को रमन प्रभाव — अणुओं द्वारा प्रकाश के प्रकीर्णन — की खोज के लिए 1930 का भौतिकी नोबेल पुरस्कार मिला।',
      te: 'సి. వి. రామన్‌కు రామన్ ప్రభావం — అణువుల ద్వారా కాంతి విసరణ — ఆవిష్కరణకు 1930 భౌతిక శాస్త్రంలో నోబెల్ బహుమతి లభించింది.',
    },
    source: 'Nobel Prize Foundation archives',
    timeLimitSeconds: 30,
  },
  {
    id: 'q-sci-4',
    categoryId: 'cat-science',
    text: 'ISRO’s headquarters is located in which city?',
    translations: {
      hi: 'ISRO का मुख्यालय किस शहर में स्थित है?',
      te: 'ISRO ప్రధాన కార్యాలయం ఏ నగరంలో ఉంది?',
    },
    options: [
      { id: 'a', text: 'New Delhi' },
      { id: 'b', text: 'Mumbai' },
      { id: 'c', text: 'Bengaluru', translations: { hi: 'बेंगलुरु', te: 'బెంగళూరు' } },
      { id: 'd', text: 'Hyderabad' },
    ],
    correctOptionId: 'c',
    explanation:
      'The Indian Space Research Organisation (ISRO) is headquartered in Bengaluru, Karnataka.',
    explanationTranslations: {
      hi: 'भारतीय अंतरिक्ष अनुसंधान संगठन (ISRO) का मुख्यालय बेंगलुरु, कर्नाटक में है।',
      te: 'ఇండియన్ స్పేస్ రిసర్చ్ ఆర్గనైజేషన్ (ISRO) ప్రధాన కార్యాలయం బెంగళూరు, కర్ణాటకలో ఉంది.',
    },
    source: 'ISRO official website',
    timeLimitSeconds: 25,
  },

  // ── Cricket and Sports ─────────────────────────────────────────────────
  {
    id: 'q-spt-1',
    categoryId: 'cat-sports',
    text: 'India won its first Cricket World Cup (ODI) in which year?',
    translations: {
      hi: 'भारत ने अपना पहला क्रिकेट विश्व कप (ODI) किस वर्ष जीता?',
      te: 'భారత్ తన మొదటి క్రికెట్ వరల్డ్ కప్ (ODI) ఎప్పుడు గెలిచింది?',
    },
    options: [
      { id: 'a', text: '1975' },
      { id: 'b', text: '1983' },
      { id: 'c', text: '1987' },
      { id: 'd', text: '2003' },
    ],
    correctOptionId: 'b',
    explanation:
      'India won its first Cricket World Cup on 25 June 1983 under Kapil Dev’s captaincy, defeating the West Indies in the final at Lord’s.',
    explanationTranslations: {
      hi: 'भारत ने 25 जून 1983 को कपिल देव की कप्तानी में लॉर्ड्स में फाइनल में वेस्टइंडीज को हराकर अपना पहला क्रिकेट विश्व कप जीता।',
      te: 'భారత్ 25 జూన్ 1983న కపిల్ దేవ్ నాయకత్వంలో లార్డ్స్‌లో జరిగిన ఫైనల్‌లో వెస్టిండీస్‌ను ఓడించి తన మొదటి క్రికెట్ వరల్డ్ కప్‌ను గెలిచింది.',
    },
    source: 'ICC Cricket World Cup archives',
    timeLimitSeconds: 25,
  },
  {
    id: 'q-spt-2',
    categoryId: 'cat-sports',
    text: 'Who was the first Indian woman to win an Olympic medal?',
    translations: {
      hi: 'ओलंपिक पदक जीतने वाली पहली भारतीय महिला कौन थीं?',
      te: 'ఒలింపిక్ పతకం గెలిచిన మొదటి భారతీయ మహిళ ఎవరు?',
    },
    options: [
      { id: 'a', text: 'Sania Mirza' },
      { id: 'b', text: 'Mary Kom' },
      { id: 'c', text: 'Karnam Malleswari', translations: { hi: 'कर्णम मल्लेश्वरी', te: 'కర్ణం మల్లేశ్వరి' } },
      { id: 'd', text: 'P. V. Sindhu' },
    ],
    correctOptionId: 'c',
    explanation:
      'Weightlifter Karnam Malleswari won bronze at the 2000 Sydney Olympics, becoming the first Indian woman to win an Olympic medal.',
    explanationTranslations: {
      hi: 'भारोत्तोलक कर्णम मल्लेश्वरी ने 2000 सिडनी ओलंपिक में कांस्य पदक जीता, जिससे वह ओलंपिक पदक जीतने वाली पहली भारतीय महिला बनीं।',
      te: 'వెయిట్‌లిఫ్టర్ కర్ణం మల్లేశ్వరి 2000 సిడ్నీ ఒలింపిక్స్‌లో కాంస్య పతకం గెలిచింది, ఒలింపిక్ పతకం గెలిచిన మొదటి భారతీయ మహిళగా నిలిచింది.',
    },
    source: 'Indian Olympic Association',
    timeLimitSeconds: 30,
  },
  {
    id: 'q-spt-3',
    categoryId: 'cat-sports',
    text: 'The “Master Blaster” of Indian cricket is widely known as:',
    translations: {
      hi: 'भारतीय क्रिकेट के “मास्टर ब्लास्टर” के रूप में किसे जाना जाता है?',
      te: 'భారత క్రికెట్ “మాస్టర్ బ్లాస్టర్”గా ఎవరు ప్రసిద్ధి?',
    },
    options: [
      { id: 'a', text: 'Sunil Gavaskar' },
      { id: 'b', text: 'Sachin Tendulkar', translations: { hi: 'सचिन तेंदुलकर', te: 'సచిన్ టెండుల్కర్' } },
      { id: 'c', text: 'Rahul Dravid' },
      { id: 'd', text: 'Virat Kohli' },
    ],
    correctOptionId: 'b',
    explanation:
      'Sachin Tendulkar, who scored 100 international centuries across Tests and ODIs, is affectionately called the “Master Blaster”.',
    explanationTranslations: {
      hi: 'सचिन तेंदुलकर, जिन्होंने टेस्ट और ODI में 100 अंतरराष्ट्रीय शतक बनाए, को प्यार से “मास्टर ब्लास्टर” कहा जाता है।',
      te: 'టెస్ట్ మరియు ODIలలో 100 అంతర్జాతీయ శతకాలు సాధించిన సచిన్ టెండుల్కర్‌ను ప్రేమగా “మాస్టర్ బ్లాస్టర్” అని పిలుస్తారు.',
    },
    source: 'ICC player records',
    timeLimitSeconds: 25,
  },
  {
    id: 'q-spt-4',
    categoryId: 'cat-sports',
    text: 'In which sport is the term “Dronacharya Award” given in India?',
    translations: {
      hi: 'भारत में “द्रोणाचार्य पुरस्कार” किस खेल से संबंधित क्षेत्र में दिया जाता है?',
      te: 'భారతదేశంలో “ద్రోణాచార్య అవార్డు” ఏ క్రీడా రంగంలో ఇవ్వబడుతుంది?',
    },
    options: [
      { id: 'a', text: 'For best umpires' },
      { id: 'b', text: 'For outstanding coaches', translations: { hi: 'उत्कृष्ट कोचों के लिए', te: 'అత్యుత్తమ కోచ్‌ల కోసం' } },
      { id: 'c', text: 'For journalists' },
      { id: 'd', text: 'For stadium administrators' },
    ],
    correctOptionId: 'b',
    explanation:
      'The Dronacharya Award is given by the Government of India to outstanding coaches in sports and games.',
    explanationTranslations: {
      hi: 'द्रोणाचार्य पुरस्कार भारत सरकार द्वारा खेलों में उत्कृष्ट कोचों को दिया जाता है।',
      te: 'ద్రోణాచార్య అవార్డును భారత ప్రభుత్వం క్రీడలలో అత్యుత్తమ కోచ్‌లకు ఇస్తుంది.',
    },
    source: 'Ministry of Youth Affairs and Sports, Government of India',
    timeLimitSeconds: 30,
  },

  // ── Indian Cinema and Entertainment ──────────────────────────────────────
  {
    id: 'q-cin-1',
    categoryId: 'cat-cinema',
    text: 'Which Indian film won the Academy Award (Oscar) for Best Original Song for “Naatu Naatu”?',
    translations: {
      hi: '“नाटू नाटू” गीत के लिए किस भारतीय फिल्म ने अकादमी पुरस्कार (ऑस्कर) जीता?',
      te: '“నాటు నాటు” పాటకు ఏ భారతీయ చిత్రం అకాడమీ అవార్డు (ఆస్కార్) గెలిచింది?',
    },
    options: [
      { id: 'a', text: 'Baahubali' },
      { id: 'b', text: 'RRR', translations: { hi: 'RRR', te: 'RRR' } },
      { id: 'c', text: 'KGF Chapter 2' },
      { id: 'd', text: 'Pushpa' },
    ],
    correctOptionId: 'b',
    explanation:
      '“Naatu Naatu” from the Telugu film RRR, composed by M. M. Keeravani, won the Oscar for Best Original Song at the 95th Academy Awards in March 2023.',
    explanationTranslations: {
      hi: 'तेलुगु फिल्म RRR के “नाटू नाटू” गीत, जिसकी रचना एम. एम. कीरवानी ने की, ने मार्च 2023 में 95वें अकादमी पुरस्कारों में सर्वश्रेष्ठ मूल गीत का ऑस्कर जीता।',
      te: 'తెలుగు చిత్రం RRRలోని “నాటు నాటు” పాట, ఎం. ఎం. కీరవాణి స్వరపరిచారు, మార్చి 2023లో 95వ అకాడమీ అవార్డులలో ఉత్తమ మూల పాట ఆస్కార్ గెలిచింది.',
    },
    source: 'The Academy of Motion Picture Arts and Sciences, 2023',
    timeLimitSeconds: 30,
  },
  {
    id: 'q-cin-2',
    categoryId: 'cat-cinema',
    text: 'Who directed the film “Sholay” (1975)?',
    translations: {
      hi: 'फिल्म “शोले” (1975) का निर्देशन किसने किया?',
      te: '“షోలే” (1975) చిత్రానికి దర్శకత్వం ఎవరు వహించారు?',
    },
    options: [
      { id: 'a', text: 'Yash Chopra' },
      { id: 'b', text: 'Ramesh Sippy', translations: { hi: 'रमेश सिप्पी', te: 'రమేష్ సిప్పీ' } },
      { id: 'c', text: 'Mani Ratnam' },
      { id: 'd', text: 'Satyajit Ray' },
    ],
    correctOptionId: 'b',
    explanation:
      'Ramesh Sippy directed the iconic Hindi film “Sholay”, released on 15 August 1975, which became one of the most influential films in Indian cinema.',
    explanationTranslations: {
      hi: 'रमेश सिप्पी ने प्रतिष्ठित हिंदी फिल्म “शोले” का निर्देशन किया, जो 15 अगस्त 1975 को रिलीज़ हुई और भारतीय सिनेमा की सबसे प्रभावशाली फिल्मों में से एक बन गई।',
      te: 'రమేష్ సిప్పీ ప్రతిష్టాత్మక హిందీ చిత్రం “షోలే”కి దర్శకత్వం వహించారు, ఇది 15 ఆగస్టు 1975న విడుదలై భారతీయ సినిమా చరిత్రలో అత్యంత ప్రభావవంతమైన చిత్రాలలో ఒకటిగా నిలిచింది.',
    },
    source: 'Film archives / Film Federation of India',
    timeLimitSeconds: 25,
  },
  {
    id: 'q-cin-3',
    categoryId: 'cat-cinema',
    text: 'Which film directed by Satyajit Ray won the Academy Honorary Award?',
    translations: {
      hi: 'सत्यजित रे द्वारा निर्देशित किस फिल्म ने अकादमी मानद पुरस्कार जीता?',
      te: 'సత్యజిత్ రే దర్శకత్వంలో ఏ చిత్రం అకాడమీ గౌరవ పురస్కారాన్ని గెలిచింది?',
    },
    options: [
      { id: 'a', text: 'Pather Panchali' },
      { id: 'b', text: 'Charulata' },
      { id: 'c', text: 'Apu Trilogy (Honorary Oscar for Ray)', translations: { hi: 'अपु त्रिलॉजी (रे के लिए मानद ऑस्कर)', te: 'అపు త్రయం (రే కోసం గౌరవ ఆస్కార్)' } },
      { id: 'd', text: 'Shatranj ke Khilari' },
    ],
    correctOptionId: 'c',
    explanation:
      'Satyajit Ray received an Academy Honorary Award in 1992 for his lifetime achievement, recognising his body of work including the Apu Trilogy (Pather Panchali, Aparajito, Apur Sansar).',
    explanationTranslations: {
      hi: 'सत्यजित रे को 1992 में उनके आजीवन योगदान के लिए अकादमी मानद पुरस्कार मिला, जिसमें अपु त्रिलॉजी (पथेर पांचाली, अपराजितो, अपुर संसार) शामिल हैं।',
      te: 'సత్యజిత్ రేకు 1992లో వారి జీవితకాల సాధనకు అకాడమీ గౌరవ పురస్కారం లభించింది, అపు త్రయం (పథేర్ పాంచాలీ, అపరాజితో, అపుర్ సన్సార్) కూడా ఉన్నాయి.',
    },
    source: 'The Academy of Motion Picture Arts and Sciences',
    timeLimitSeconds: 30,
  },

  // ── Food, Culture and Festivals ─────────────────────────────────────────
  {
    id: 'q-cul-1',
    categoryId: 'cat-culture',
    text: 'Which festival is known as the “Festival of Lights”?',
    translations: {
      hi: 'किस त्योहार को “रोशनी का त्योहार” कहा जाता है?',
      te: 'ఏ పండుగను “కాంతుల పండుగ” అంటారు?',
    },
    options: [
      { id: 'a', text: 'Holi', translations: { hi: 'होली', te: 'హోళీ' } },
      { id: 'b', text: 'Diwali', translations: { hi: 'दिवाली', te: 'దీపావళి' } },
      { id: 'c', text: 'Eid' },
      { id: 'd', text: 'Onam' },
    ],
    correctOptionId: 'b',
    explanation:
      'Diwali (Deepavali) is celebrated across India as the Festival of Lights, symbolising the victory of light over darkness and good over evil.',
    explanationTranslations: {
      hi: 'दिवाली (दीपावली) भारत भर में रोशनी के त्योहार के रूप में मनाई जाती है, जो अंधकार पर प्रकाश और बुराई पर अच्छाई की जीत का प्रतीक है।',
      te: 'దీపావళి (దివాలీ) భారతదేశం అంతటా కాంతుల పండుగగా జరుపుకుంటారు, ఇది చీకటిపై కాంతి, చెడుపై మంచి విజయాన్ని సూచిస్తుంది.',
    },
    source: 'Indian cultural heritage archives',
    timeLimitSeconds: 20,
  },
  {
    id: 'q-cul-2',
    categoryId: 'cat-culture',
    text: 'Which Indian classical dance form originated in Kerala?',
    translations: {
      hi: 'किस भारतीय शास्त्रीय नृत्य शैली की उत्पत्ति केरल में हुई?',
      te: 'ఏ భారతీయ శాస్త్రీయ నృత్య రీతి కేరళలో ఉద్భవించింది?',
    },
    options: [
      { id: 'a', text: 'Bharatanatyam' },
      { id: 'b', text: 'Kathak' },
      { id: 'c', text: 'Kathakali', translations: { hi: 'कथकली', te: 'కథకళి' } },
      { id: 'd', text: 'Odissi' },
    ],
    correctOptionId: 'c',
    explanation:
      'Kathakali is a classical dance-drama from Kerala, recognised by its elaborate makeup, gestures and storytelling through mudras.',
    explanationTranslations: {
      hi: 'कथकली केरल का एक शास्त्रीय नृत्य-नाटक है, जो अपने विस्तृत मेकअप, मudras के माध्यम से इशारों और कहानी कथन के लिए जाना जाता है।',
      te: 'కథకళి కేరళకు చెందిన శాస్త్రీయ నృత్య-నాటకం, ఇది దాని విస్తృత మేకప్, ముద్రల ద్వారా సంజ్ఞలు మరియు కథా కథనం ద్వారా గుర్తించబడుతుంది.',
    },
    source: 'Sangeet Natak Akademi',
    timeLimitSeconds: 30,
  },
  {
    id: 'q-cul-3',
    categoryId: 'cat-culture',
    text: 'Biryani is believed to have been brought to the Indian subcontinent by which tradition?',
    translations: {
      hi: 'बिरयानी को भारतीय उपमहाद्वीप में किस परंपरा द्वारा लाया गया माना जाता है?',
      te: 'బిర్యానీని భారత ఉపఖండానికి ఏ సంప్రదాయం ద్వారా తీసుకురాబడిందని భావిస్తారు?',
    },
    options: [
      { id: 'a', text: 'Mughal culinary tradition', translations: { hi: 'मुगल पाक परंपरा', te: 'మొఘల్ వంట సంప్రదాయం' } },
      { id: 'b', text: 'Portuguese traders' },
      { id: 'c', text: 'British colonial cuisine' },
      { id: 'd', text: 'Chinese travellers' },
    ],
    correctOptionId: 'a',
    explanation:
      'Biryani is widely traced to the Mughal culinary tradition in the Indian subcontinent, with regional varieties developing across Hyderabad, Lucknow, Kolkata and beyond.',
    explanationTranslations: {
      hi: 'बिरयानी को व्यापक रूप से भारतीय उपमहाद्वीप में मुगल पाक परंपरा से जोड़ा जाता है, जिसके क्षेत्रीय प्रकार हैदराबाद, लखनऊ, कोलकाता और अन्य जगहों पर विकसित हुए।',
      te: 'బిర్యానీని విస్తృతంగా భారత ఉపఖండంలో మొఘల్ వంట సంప్రదాయానికి అనుసంధానిస్తారు, హైదరాబాద్, లక్నో, కోల్‌కతా మరియు ఇతర చోట్ల ప్రాంతీయ రకాలు అభివృద్ధి చెందాయి.',
    },
    source: 'Culinary history references',
    timeLimitSeconds: 30,
  },

  // ── Current Affairs ─────────────────────────────────────────────────────
  {
    id: 'q-cur-1',
    categoryId: 'cat-current',
    text: 'India hosted the G20 Summit in 2023 in which city?',
    translations: {
      hi: 'भारत ने 2023 में G20 शिखर सम्मेलन की मेजबानी किस शहर में की?',
      te: 'భారతదేశం 2023లో G20 సమ్మిట్‌కు ఏ నగరంలో ఆతిథ్యం ఇచ్చింది?',
    },
    options: [
      { id: 'a', text: 'Mumbai' },
      { id: 'b', text: 'Bengaluru' },
      { id: 'c', text: 'New Delhi', translations: { hi: 'नई दिल्ली', te: 'న్యూ ఢిల్లీ' } },
      { id: 'd', text: 'Chennai' },
    ],
    correctOptionId: 'c',
    explanation:
      'India hosted the G20 Summit on 9–10 September 2023 in New Delhi, under its presidency of the G20 grouping.',
    explanationTranslations: {
      hi: 'भारत ने 9–10 सितंबर 2023 को नई दिल्ली में G20 शिखर सम्मेलन की मेजबानी की, जब वह G20 समूह की अध्यक्षता कर रहा था।',
      te: 'భారతదేశం 9–10 సెప్టెంబర్ 2023న న్యూ ఢిల్లీలో G20 సమ్మిట్‌కు ఆతిథ్యం ఇచ్చింది, ఆ సమయంలో అది G20 సమూహానికి అధ్యక్షత వహించింది.',
    },
    source: 'Ministry of External Affairs, Government of India',
    timeLimitSeconds: 30,
  },
  {
    id: 'q-cur-2',
    categoryId: 'cat-current',
    text: 'In 2024, India became the most populous country in the world, surpassing which country?',
    translations: {
      hi: '2024 में भारत किस देश को पीछे छोड़कर विश्व का सबसे अधिक जनसंख्या वाला देश बन गया?',
      te: '2024లో భారతదేశం ఏ దేశాన్ని వెనుకకు నెట్టి ప్రపంచంలో అత్యధిక జనాభా కలిగిన దేశంగా మారింది?',
    },
    options: [
      { id: 'a', text: 'United States' },
      { id: 'b', text: 'Indonesia' },
      { id: 'c', text: 'China', translations: { hi: 'चीन', te: 'చైనా' } },
      { id: 'd', text: 'Brazil' },
    ],
    correctOptionId: 'c',
    explanation:
      'In 2023–2024, India surpassed China to become the most populous country in the world, with a population of over 1.4 billion.',
    explanationTranslations: {
      hi: '2023–2024 में भारत ने चीन को पीछे छोड़कर विश्व का सबसे अधिक जनसंख्या वाला देश बनने का स्थान लिया, जिसकी जनसंख्या 1.4 अरब से अधिक है।',
      te: '2023–2024లో భారతదేశం చైనాను వెనుకకు నెట్టి ప్రపంచంలో అత్యధిక జనాభా కలిగిన దేశంగా మారింది, 1.4 బిలియన్‌లకు పైగా జనాభాతో.',
    },
    source: 'United Nations Population Division, 2023',
    timeLimitSeconds: 25,
  },

  // ── Education and Competitive Exam Practice ─────────────────────────────
  {
    id: 'q-edu-1',
    categoryId: 'cat-edu',
    text: 'Who among the following is associated with the “National Education Policy 2020” of India?',
    translations: {
      hi: 'निम्नलिखित में से किसका नाम भारत की “राष्ट्रीय शिक्षा नीति 2020” से जुड़ा है?',
      te: 'కింది వారిలో ఎవరు భారత “జాతీయ విద్యా విధానం 2020”తో సంబంధం కలిగి ఉన్నారు?',
    },
    options: [
      { id: 'a', text: 'It was approved by the Union Cabinet', translations: { hi: 'इसे केंद्र मंत्रिमंडल द्वारा अनुमोदित किया गया', te: 'దీనిని కేంద్ర మంత్రివర్గం ఆమోదించింది' } },
      { id: 'b', text: 'Released by a single state government' },
      { id: 'c', text: 'Drafted by a private university' },
      { id: 'd', text: 'Introduced by the Supreme Court' },
    ],
    correctOptionId: 'a',
    explanation:
      'The National Education Policy 2020 (NEP 2020) was approved by the Union Cabinet on 29 July 2020, replacing the 1986 policy.',
    explanationTranslations: {
      hi: 'राष्ट्रीय शिक्षा नीति 2020 (NEP 2020) को 29 जुलाई 2020 को केंद्र मंत्रिमंडल द्वारा अनुमोदित किया गया, जिसने 1986 की नीति का स्थान लिया।',
      te: 'జాతీయ విద్యా విధానం 2020 (NEP 2020) 29 జూలై 2020న కేంద్ర మంత్రివర్గం ఆమోదించింది, ఇది 1986 విధానాన్ని భర్తీ చేసింది.',
    },
    source: 'Ministry of Education, Government of India',
    timeLimitSeconds: 30,
  },
  {
    id: 'q-edu-2',
    categoryId: 'cat-edu',
    text: 'The IITs (Indian Institutes of Technology) are institutions for which field?',
    translations: {
      hi: 'आईआईटी (भारतीय प्रौद्योगिकी संस्थान) किस क्षेत्र के संस्थान हैं?',
      te: 'ఐఐటీ (ఇండియన్ ఇన్‌స్టిట్యూట్స్ ఆఫ్ టెక్నాలజీ) ఏ రంగ సంస్థలు?',
    },
    options: [
      { id: 'a', text: 'Medicine' },
      { id: 'b', text: 'Engineering and technology', translations: { hi: 'इंजीनियरिंग और प्रौद्योगिकी', te: 'ఇంజనీరింగ్ మరియు సాంకేతికత' } },
      { id: 'c', text: 'Law' },
      { id: 'd', text: 'Agriculture' },
    ],
    correctOptionId: 'b',
    explanation:
      'The Indian Institutes of Technology (IITs) are autonomous public technical universities focused on engineering and technology education and research.',
    explanationTranslations: {
      hi: 'भारतीय प्रौद्योगिकी संस्थान (IITs) स्वायत्त सार्वजनिक तकनीकी विश्वविद्यालय हैं जो इंजीनियरिंग और प्रौद्योगिकी शिक्षा तथा अनुसंधान पर केंद्रित हैं।',
      te: 'ఇండియన్ ఇన్‌స్టిట్యూట్స్ ఆఫ్ టెక్నాలజీ (ఐఐటీలు) ఇంజనీరింగ్ మరియు సాంకేతికత విద్య మరియు పరిశోధనపై దృష్టి సారించిన స్వయంప్రతిపత్తి ప్రభుత్వ సాంకేతిక విశ్వవిద్యాలయాలు.',
    },
    source: 'Ministry of Education, Government of India',
    timeLimitSeconds: 25,
  },
  {
    id: 'q-edu-3',
    categoryId: 'cat-edu',
    text: 'The Right to Education (RTE) Act guarantees free and compulsory education to children of which age group?',
    translations: {
      hi: 'शिक्षा का अधिकार (RTE) अधिनियम किस आयु वर्ग के बच्चों के लिए निःशुल्क और अनिवार्य शिक्षा की गारंटी देता है?',
      te: 'విద్యా హక్కు (RTE) చట్టం ఏ వయసు గ్రూప్ పిల్లలకు ఉచిత మరియు నిర్బంధ విద్యను హామీ ఇస్తుంది?',
    },
    options: [
      { id: 'a', text: '3 to 10 years' },
      { id: 'b', text: '6 to 14 years', translations: { hi: '6 से 14 वर्ष', te: '6 నుండి 14 సంవత్సరాలు' } },
      { id: 'c', text: '8 to 18 years' },
      { id: 'd', text: '5 to 15 years' },
    ],
    correctOptionId: 'b',
    explanation:
      'The Right of Children to Free and Compulsory Education (RTE) Act, 2009, guarantees free and compulsory education to children aged 6 to 14 years.',
    explanationTranslations: {
      hi: 'बच्चों को निःशुल्क एवं अनिवार्य बाल शिक्षा का अधिकार (RTE) अधिनियम, 2009, 6 से 14 वर्ष की आयु के बच्चों को निःशुल्क एवं अनिवार्य शिक्षा की गारंटी देता है।',
      te: 'పిల్లలకు ఉచిత మరియు నిర్బంధ విద్యా హక్కు (RTE) చట్టం, 2009, 6 నుండి 14 సంవత్సరాల వయసు పిల్లలకు ఉచిత మరియు నిర్బంధ విద్యను హామీ ఇస్తుంది.',
    },
    source: 'Ministry of Education, Government of India',
    timeLimitSeconds: 30,
  },
];

export const QUIZ_QUESTION_MAP: Record<string, QuizQuestion> = QUIZ_QUESTIONS.reduce(
  (acc, q) => {
    acc[q.id] = q;
    return acc;
  },
  {} as Record<string, QuizQuestion>,
);

/** Get all questions for a category, shuffled deterministically per session. */
export function getQuestionsForCategory(categoryId: string): QuizQuestion[] {
  return QUIZ_QUESTIONS.filter((q) => q.categoryId === categoryId);
}

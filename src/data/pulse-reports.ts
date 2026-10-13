import type { CityReport } from '@/lib/types';

// ───────────────────────────────────────────────────────────────────────────
// DEMONSTRATION DATA — fictional city-level reports used only by the India
// Pulse prototype. None of these describe real events; statuses are
// assigned for demonstration of the Community Signal transparency model.
//
// Importantly, likes/popularity are NEVER used to upgrade a status. Statuses
// below were assigned by hand to show the three Community Signal tiers.
// ───────────────────────────────────────────────────────────────────────────

const minutes = (n: number) => new Date(Date.now() - n * 60_000).toISOString();
const hours = (n: number) => new Date(Date.now() - n * 60 * 60_000).toISOString();
const days = (n: number) => new Date(Date.now() - n * 24 * 60 * 60_000).toISOString();

export const PULSE_REPORTS: CityReport[] = [
  // ── Bengaluru ───────────────────────────────────────────────────────────
  {
    id: 'r-blr-1',
    cityId: 'c-bengaluru',
    category: 'Civic issue',
    title: 'Waterlogging on Outer Ring Road after overnight rain',
    summary:
      'Several stretches of ORR near Marathahalli reported knee-deep water during morning commute. Traffic crawls past Silk Board.',
    body:
      'Overnight rain left large stretches of Outer Ring Road waterlogged. Commuters report knee-deep water near Marathahalli junction, with traffic crawling past Silk Board. BMTC has rerouted three bus services. Many offices have asked employees to log in from home.\n\nThis is a recurring pattern on the ORR corridor during heavy rain — the same stretches flooded last monsoon and the civic authority had announced drain upgrades. As of now, no fresh advisory has been issued.',
    language: 'en',
    createdAt: hours(2),
    status: 'corroborated',
    statusReason:
      'Two independent community reporters posted photos from different stretches of the same corridor within an hour. No official civic statement yet.',
    evidence: [
      {
        id: 'e-blr-1-a',
        label: 'Reporter photo · Marathahalli junction',
        note: 'Independent commuter post tagged #BengaluruRains. Not an official source.',
        href: '#',
      },
      {
        id: 'e-blr-1-b',
        label: 'Reporter photo · Silk Board flyover',
        note: 'Second independent post, different photographer, same morning.',
        href: '#',
      },
    ],
    communityReports: 14,
  },
  {
    id: 'r-blr-2',
    cityId: 'c-bengaluru',
    category: 'Public event',
    title: 'Weekend lake cleanup drive at Kaikondrahalli',
    summary:
      'Community-led cleanup of Kaikondrahalli lake this Saturday morning. Volunteers welcome; bring reusable gloves.',
    body:
      'A residents’ collective is organising a weekend cleanup of Kaikondrahalli lake. The drive starts at 6:30am on Saturday and runs till about 10am. Volunteers are asked to bring reusable gloves and a water bottle. The group has been hosting similar drives every quarter and the lake trust usually joins for the final sorting.',
    language: 'en',
    createdAt: hours(9),
    status: 'confirmed-by-source',
    statusReason:
      'The lake trust posted the event on its official calendar and the residents’ collective shared the map and meeting point.',
    evidence: [
      {
        id: 'e-blr-2-a',
        label: 'Kaikondrahalli Lake Trust · official event page',
        note: 'Official source — civic / community trust calendar.',
        href: '#',
        official: true,
      },
      {
        id: 'e-blr-2-b',
        label: 'Residents’ collective · meeting point map',
        note: 'Community organiser; corroborates the official listing.',
        href: '#',
      },
    ],
    communityReports: 9,
  },
  {
    id: 'r-blr-3',
    cityId: 'c-bengaluru',
    category: 'Community',
    title: 'Indiranagar residents pitch cycle lanes to BBMP',
    summary:
      'A residents’ group has submitted a proposal for protected cycle lanes along 100 Feet Road. Discussion at the next ward meeting.',
    body:
      'A residents’ group from Indiranagar has submitted a proposal to the local civic body for protected cycle lanes along 100 Feet Road. The proposal argues that the corridor already sees heavy two-wheeler traffic and that separated lanes would improve safety for schoolchildren and delivery riders. The next ward committee meeting is expected to take it up.',
    language: 'en',
    createdAt: days(1),
    status: 'unverified',
    statusReason:
      'Single community report. No second source has surfaced yet, and the ward committee has not put the item on its published agenda.',
    evidence: [
      {
        id: 'e-blr-3-a',
        label: 'Residents’ group · proposal summary',
        note: 'Single source. Awaiting independent corroboration or official agenda listing.',
        href: '#',
      },
    ],
    communityReports: 3,
  },

  // ── Mumbai ────────────────────────────────────────────────────────────
  {
    id: 'r-bom-1',
    cityId: 'c-mumbai',
    category: 'Transport',
    title: 'Harbour line services delayed after signal snag at Vadala',
    summary:
      'Suburban Harbour line services running 15–20 minutes late during evening peak. CR has issued an advisory.',
    body:
      'Suburban Harbour line services are running 15–20 minutes behind schedule during the evening peak after a signal snag near Vadala Road. The railway has asked commuters to allow extra travel time and has deployed additional staff at crowded platforms.',
    language: 'en',
    createdAt: hours(1),
    status: 'confirmed-by-source',
    statusReason:
      'The railway’s official handle posted an advisory noting the signal snag and the expected delay window.',
    evidence: [
      {
        id: 'e-bom-1-a',
        label: 'Railway official advisory',
        note: 'Official source — posted by the railway’s verified handle.',
        href: '#',
        official: true,
      },
    ],
    communityReports: 21,
  },
  {
    id: 'r-bom-2',
    cityId: 'c-mumbai',
    category: 'Community',
    title: 'Marathi book reading circle resumes at Kala Ghoda',
    summary:
      'Sunday morning Marathi reading circle restarts outside the iconic Kala Ghoda statue. Open to all, free.',
    body:
      'A long-running Marathi reading circle is back at Kala Ghoda on Sunday mornings. The format is simple: each week a participant picks a short piece, reads it aloud, and the circle discusses it for half an hour. Open to all ages, free of cost, and you don’t need to have read the piece in advance.',
    language: 'mr',
    translationPreview:
      '[Demonstration translation] A long-running Marathi reading circle is back at Kala Ghoda on Sunday mornings. Each week a participant reads a short piece aloud and the circle discusses it for half an hour. Open to all ages, free of cost — you don’t need to have read the piece in advance.',
    createdAt: days(2),
    status: 'corroborated',
    statusReason:
      'Two independent community members posted about the same reading circle restarting, including one who attended the previous session last year.',
    evidence: [
      {
        id: 'e-bom-2-a',
        label: 'Community post · reading circle restart',
        note: 'Independent community member; not an official source.',
        href: '#',
      },
      {
        id: 'e-bom-2-b',
        label: 'Community post · previous session photo',
        note: 'Second independent member; corroborates timing and venue.',
        href: '#',
      },
    ],
    communityReports: 6,
  },

  // ── Delhi ─────────────────────────────────────────────────────────────
  {
    id: 'r-del-1',
    cityId: 'c-delhi',
    category: 'Civic issue',
    title: 'Air quality enters “very poor” zone, GRAP stage in review',
    summary:
      'AQI crossed 350 in several monitoring stations. The commission is reviewing whether to escalate graded response measures.',
    body:
      'Air quality slipped into the “very poor” category across several monitoring stations, with AQI readings crossing 350. The commission for air quality management is reviewing whether to escalate the graded response action plan (GRAP). Common advice being circulated: avoid morning outdoor runs, and keep N95 masks handy for children and the elderly.',
    language: 'en',
    createdAt: hours(4),
    status: 'confirmed-by-source',
    statusReason:
      'The air-quality commission’s official dashboard shows the AQI reading, and an official statement about a GRAP review has been picked up by major newsrooms.',
    evidence: [
      {
        id: 'e-del-1-a',
        label: 'Air quality commission · official dashboard',
        note: 'Official source — government dashboard.',
        href: '#',
        official: true,
      },
      {
        id: 'e-del-1-b',
        label: 'Press release · GRAP stage review',
        note: 'Official source — commission press release.',
        href: '#',
        official: true,
      },
    ],
    communityReports: 32,
  },

  // ── Chennai ───────────────────────────────────────────────────────────
  {
    id: 'r-maa-1',
    cityId: 'c-chennai',
    category: 'Public event',
    title: 'Margazhi music season announces kutcheri venues',
    summary:
      'The December music season kutcheri venues have been announced. Several sabhas are returning to in-person concerts this year.',
    body:
      'The sabhas have announced the venues and schedules for the December Margazhi music season. Several of them are returning to full in-person concerts after a few years of hybrid formats. Morning lec-dems and evening kutcheris are back on the calendar. Passes are typically available at the sabha counters and online.',
    language: 'ta',
    translationPreview:
      '[Demonstration translation] The sabhas have announced the venues and schedules for the December Margazhi music season. Several are returning to full in-person concerts after a few years of hybrid formats. Morning lec-dems and evening kutcheris are back on the calendar. Passes are typically available at the sabha counters and online.',
    createdAt: days(1),
    status: 'corroborated',
    statusReason:
      'Two sabhas independently announced their kutcheri schedules, and a long-time music season attendee has compiled the venues into a single community calendar.',
    evidence: [
      {
        id: 'e-maa-1-a',
        label: 'Sabha A · official kutcheri schedule',
        note: 'Independent source — sabha publication.',
        href: '#',
      },
      {
        id: 'e-maa-1-b',
        label: 'Sabha B · official kutcheri schedule',
        note: 'Independent source — sabha publication.',
        href: '#',
      },
      {
        id: 'e-maa-1-c',
        label: 'Community calendar · venues compiled',
        note: 'Community compilation; corroborates the two sabha listings.',
        href: '#',
      },
    ],
    communityReports: 11,
  },

  // ── Hyderabad ─────────────────────────────────────────────────────────
  {
    id: 'r-hyd-1',
    cityId: 'c-hyderabad',
    category: 'Community',
    title: 'Old city heritage walk this Sunday morning',
    summary:
      'A free heritage walk through the old city covering Charminar, Laad Bazaar and Chowmohalla. Meet at Charminar bus stop.',
    body:
      'A community-led heritage walk is being organised this Sunday morning through the old city. The route covers Charminar, Laad Bazaar, and Chowmohalla, with a short break at a local tea stall. The walk is free, about three kilometres long, and open to anyone who can comfortably walk that distance. Bring water and a hat.',
    language: 'te',
    translationPreview:
      '[Demonstration translation] A community-led heritage walk is being organised this Sunday morning through the old city. The route covers Charminar, Laad Bazaar and Chowmohalla, with a short break at a local tea stall. Free, about three kilometres, open to anyone who can comfortably walk that distance. Bring water and a hat.',
    createdAt: hours(14),
    status: 'unverified',
    statusReason:
      'Single community post; the organisers have not posted an official schedule and no second reporter has surfaced the same walk yet.',
    evidence: [
      {
        id: 'e-hyd-1-a',
        label: 'Community post · walk announcement',
        note: 'Single source. Awaiting second independent corroboration.',
        href: '#',
      },
    ],
    communityReports: 2,
  },

  // ── Kolkata ───────────────────────────────────────────────────────────
  {
    id: 'r-ccu-1',
    cityId: 'c-kolkata',
    category: 'Civic issue',
    title: 'Tram heritage corridor stretch under discussion',
    summary:
      'The future of the heritage tram corridor from Esplanade to Maidan is under discussion. Public inputs are being invited.',
    body:
      'The future of the heritage tram corridor running from Esplanade to Maidan is under public discussion. The transport authority has invited public inputs on whether to restore services along this corridor as a heritage experience. Public submissions can be sent in until the end of the month.',
    language: 'bn',
    translationPreview:
      '[Demonstration translation] The future of the heritage tram corridor running from Esplanade to Maidan is under public discussion. The transport authority has invited public inputs on whether to restore services along this corridor as a heritage experience. Public submissions can be sent until the end of the month.',
    createdAt: days(2),
    status: 'corroborated',
    statusReason:
      'A transport advocacy group has shared the public-input notice, and an independent reporter has confirmed the deadline through a separate post.',
    evidence: [
      {
        id: 'e-ccu-1-a',
        label: 'Transport advocacy group · public-input notice',
        note: 'Independent source — advocacy group publication.',
        href: '#',
      },
      {
        id: 'e-ccu-1-b',
        label: 'Independent reporter · submission deadline',
        note: 'Independent reporter; corroborates the deadline.',
        href: '#',
      },
    ],
    communityReports: 7,
  },

  // ── Pune ──────────────────────────────────────────────────────────────
  {
    id: 'r-pun-1',
    cityId: 'c-pune',
    category: 'Civic issue',
    title: 'Vetal Tekdi road-widening proposal opposed by residents',
    summary:
      'A road-widening proposal on Vetal Tekdi has been opposed by resident groups citing ecological concerns. Public hearing next week.',
    body:
      'A proposal to widen a road along Vetal Tekli has been opposed by resident groups who cite ecological concerns about the hill’s green cover. A public hearing has been scheduled for next week. Residents are asking that the alternative of a narrower, pedestrian-friendly alignment be evaluated before any tree-felling is approved.',
    language: 'en',
    createdAt: days(3),
    status: 'corroborated',
    statusReason:
      'Two resident groups have independently written to the civic body, and a third post citing the public hearing notice has been shared by a local journalist.',
    evidence: [
      {
        id: 'e-pun-1-a',
        label: 'Resident group A · letter to civic body',
        note: 'Independent source — resident group.',
        href: '#',
      },
      {
        id: 'e-pun-1-b',
        label: 'Resident group B · letter to civic body',
        note: 'Independent source — second resident group.',
        href: '#',
      },
      {
        id: 'e-pun-1-c',
        label: 'Local journalist · public hearing notice',
        note: 'Independent reporter; corroborates the hearing date.',
        href: '#',
      },
    ],
    communityReports: 12,
  },

  // ── Ahmedabad ────────────────────────────────────────────────────────
  {
    id: 'r-amd-1',
    cityId: 'c-ahmedabad',
    category: 'Public event',
    title: 'International Kite Festival returns in January',
    summary:
      'The annual international kite festival returns to the Sabarmati riverfront. International and local kite flyers are expected to take part.',
    body:
      'The annual international kite festival is back at the Sabarmati riverfront in January. International and local kite flyers are expected to take part, and the riverfront is being prepared for the public viewing decks. Timing is typically from early morning into the evening, with the best viewing hours in the late afternoon when the wind picks up.',
    language: 'gu',
    translationPreview:
      '[Demonstration translation] The annual international kite festival is back at the Sabarmati riverfront in January. International and local kite flyers are expected to take part, and the riverfront is being prepared for public viewing decks. Best viewing is typically late afternoon when the wind picks up.',
    createdAt: days(4),
    status: 'confirmed-by-source',
    statusReason:
      'The state tourism office posted the festival dates on its official calendar, and the riverfront authority confirmed the venue preparation.',
    evidence: [
      {
        id: 'e-amd-1-a',
        label: 'State tourism office · official festival calendar',
        note: 'Official source — government tourism calendar.',
        href: '#',
        official: true,
      },
      {
        id: 'e-amd-1-b',
        label: 'Sabarmati Riverfront Authority · venue preparation note',
        note: 'Official source — civic authority.',
        href: '#',
        official: true,
      },
    ],
    communityReports: 18,
  },

  // ── Jaipur ────────────────────────────────────────────────────────────
  {
    id: 'r-jai-1',
    cityId: 'c-jaipur',
    category: 'Community',
    title: 'Craft bazaar returns to Jawahar Kala Kendra grounds',
    summary:
      'A weekend craft bazaar at Jawahar Kala Kendra grounds features block-printers, blue-pottery and mojari makers. Open Saturday and Sunday.',
    body:
      'A weekend craft bazaar is back at the Jawahar Kala Kendra grounds. The market features block-printers from Sanganer, blue-pottery artists and mojari makers from nearby towns. Open Saturday and Sunday, from late morning to early evening. The organisers are encouraging visitors to bring cash for the smaller stalls, though most accept UPI.',
    language: 'en',
    createdAt: days(1),
    status: 'corroborated',
    statusReason:
      'Jawahar Kala Kendra has listed the bazaar in its weekend calendar, and an independent visitors’ post from the previous edition of the bazaar is online.',
    evidence: [
      {
        id: 'e-jai-1-a',
        label: 'Jawahar Kala Kendra · weekend calendar listing',
        note: 'Independent source — cultural institution listing.',
        href: '#',
      },
      {
        id: 'e-jai-1-b',
        label: 'Visitors’ post · previous edition photos',
        note: 'Independent visitor post; corroborates the venue.',
        href: '#',
      },
    ],
    communityReports: 5,
  },

  // ── Kochi ─────────────────────────────────────────────────────────────
  {
    id: 'r-cok-1',
    cityId: 'c-kochi',
    category: 'Civic issue',
    title: 'Backwater ferry service timing revision under review',
    summary:
      'A proposal to revise backwater ferry timings to better serve shift workers is under review. Public inputs invited.',
    body:
      'A proposal to revise the backwater ferry timings so that early-morning and late-evening shift workers have better connectivity is under review. The water transport authority has invited public inputs. The current first service is after 7am and the last service is before 8pm, which leaves shift workers dependent on road transport.',
    language: 'en',
    createdAt: days(2),
    status: 'unverified',
    statusReason:
      'Single community report; the water transport authority has not yet posted a public-input notice on its official page.',
    evidence: [
      {
        id: 'e-cok-1-a',
        label: 'Community post · shift-worker ferry request',
        note: 'Single source. Awaiting official confirmation of the public-input window.',
        href: '#',
      },
    ],
    communityReports: 4,
  },
];

export const PULSE_REPORTS_BY_CITY: Record<string, CityReport[]> = PULSE_REPORTS.reduce(
  (acc, r) => {
    if (!acc[r.cityId]) acc[r.cityId] = [];
    acc[r.cityId].push(r);
    return acc;
  },
  {} as Record<string, CityReport[]>,
);

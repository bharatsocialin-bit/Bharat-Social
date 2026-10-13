import type { PulseCity } from '@/lib/types';

// ───────────────────────────────────────────────────────────────────────────
// DEMONSTRATION DATA — fictional cities and metadata used only by the India
// Pulse prototype. None of these represent live data sources.
// ───────────────────────────────────────────────────────────────────────────

export const PULSE_CITIES: PulseCity[] = [
  {
    id: 'c-bengaluru',
    name: 'Bengaluru',
    state: 'Karnataka',
    region: 'South',
    blurb: 'India’s tech capital — potholes in monsoon, startups in winter.',
    gradient: 'from-sky-500 to-indigo-500',
  },
  {
    id: 'c-mumbai',
    name: 'Mumbai',
    state: 'Maharashtra',
    region: 'West',
    blurb: 'Local trains, sea link, and a city that never stops moving.',
    gradient: 'from-amber-400 to-rose-500',
  },
  {
    id: 'c-delhi',
    name: 'Delhi',
    state: 'NCT of Delhi',
    region: 'North',
    blurb: 'Monuments and metros — winter air quality is the annual story.',
    gradient: 'from-emerald-400 to-teal-500',
  },
  {
    id: 'c-chennai',
    name: 'Chennai',
    state: 'Tamil Nadu',
    region: 'South',
    blurb: 'Filter coffee, classical music, and the steady rhythm of the Bay.',
    gradient: 'from-fuchsia-500 to-pink-500',
  },
  {
    id: 'c-hyderabad',
    name: 'Hyderabad',
    state: 'Telangana',
    region: 'South',
    blurb: 'Biryani, biotech, and an old city that keeps surprising you.',
    gradient: 'from-orange-400 to-amber-500',
  },
  {
    id: 'c-kolkata',
    name: 'Kolkata',
    state: 'West Bengal',
    region: 'East',
    blurb: 'Book fairs, trams, and the loudest monsoon thunder you’ll hear.',
    gradient: 'from-lime-400 to-emerald-500',
  },
  {
    id: 'c-pune',
    name: 'Pune',
    state: 'Maharashtra',
    region: 'West',
    blurb: 'Hills, colleges, and weekend traffic to Lonavala.',
    gradient: 'from-violet-500 to-purple-500',
  },
  {
    id: 'c-ahmedabad',
    name: 'Ahmedabad',
    state: 'Gujarat',
    region: 'West',
    blurb: 'Heritage pols, kite festivals, and Sabarmati evenings.',
    gradient: 'from-cyan-400 to-blue-500',
  },
  {
    id: 'c-jaipur',
    name: 'Jaipur',
    state: 'Rajasthan',
    region: 'North',
    blurb: 'Pink walls, craft bazaars, and the slow heat of the Thar.',
    gradient: 'from-rose-400 to-pink-500',
  },
  {
    id: 'c-kochi',
    name: 'Kochi',
    state: 'Kerala',
    region: 'South',
    blurb: 'Backwaters, Chinese fishing nets, and monsoon postcards.',
    gradient: 'from-teal-400 to-cyan-500',
  },
  {
    id: 'c-bhubaneswar',
    name: 'Bhubaneswar',
    state: 'Odisha',
    region: 'East',
    blurb: 'Temple town turned smart city — temples meet tech parks.',
    gradient: 'from-amber-400 to-orange-500',
  },
  {
    id: 'c-chandigarh',
    name: 'Chandigarh',
    state: 'Chandigarh UT',
    region: 'North',
    blurb: 'Le Corbusier’s grid, rock garden, and clean wide roads.',
    gradient: 'from-emerald-400 to-cyan-500',
  },
];

export const PULSE_CITY_MAP: Record<string, PulseCity> = PULSE_CITIES.reduce(
  (acc, c) => {
    acc[c.id] = c;
    return acc;
  },
  {} as Record<string, PulseCity>,
);

/** Default city shown when the user opens India Pulse for the first time. */
export const DEFAULT_PULSE_CITY_ID = 'c-bengaluru';

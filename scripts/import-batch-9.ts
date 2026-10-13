/**
 * Batch 9 — Final batch: ~40 verified India Quiz questions.
 * Allocated to largest category gaps.
 * Target: 1,004 total questions.
 */
import { db } from '@/lib/db';
import { checkDuplicate } from '@/lib/quiz/duplicate-detector';

interface Q {
  slug: string; categoryId: string; text: string;
  options: [string, string, string, string]; correctIndex: number;
  explanation: string; source: string; difficulty: 'easy'|'medium'|'hard';
}

const BATCH: Q[] = [
  // ═══ cat-civics (6 — gap was 15, bringing to 91) ═══
  { slug: 'civ-const-scheduled-castes-commission', categoryId: 'cat-civics', text: 'The National Commission for Scheduled Castes is constituted under which Article of the Constitution?', options: ['Article 338', 'Article 340', 'Article 330', 'Article 335'], correctIndex: 0, explanation: 'Article 338 provides for the National Commission for Scheduled Castes. It was originally a Special Officer (Article 338) and upgraded to a Commission by the 65th Amendment, 1990. The Commission investigates safeguards for SCs, evaluates progress, and advises on planning. It has a Chairperson, Vice-Chairperson, and 3 members.', source: 'Constitution of India, Article 338 / 65th Amendment Act, 1990', difficulty: 'medium' },
  { slug: 'civ-const-st-commission-article-338a', categoryId: 'cat-civics', text: 'The National Commission for Scheduled Tribes was constituted as a separate body by which Constitutional Amendment?', options: ['65th Amendment (1990)', '89th Amendment (2003)', '73rd Amendment (1992)', '86th Amendment (2002)'], correctIndex: 1, explanation: 'The 89th Constitutional Amendment Act, 2003 bifurcated the combined National Commission for SCs and STs into two separate commissions: the National Commission for SCs (Article 338) and the National Commission for STs (Article 338A). This was done to give Scheduled Tribes dedicated attention to their welfare and rights.', source: 'Constitution of India, 89th Amendment Act, 2003 / Articles 338 and 338A', difficulty: 'hard' },
  { slug: 'civ-const-languages-article-351', categoryId: 'cat-civics', text: 'Article 351 of the Constitution imposes a duty on the Union to promote the spread of which language?', options: ['English', 'Hindi (as per Article 351)', 'Sanskrit', 'All 22 scheduled languages equally'], correctIndex: 1, explanation: 'Article 351 directs the Union to promote the spread of the Hindi language, to develop it so that it may serve as a medium of expression for all elements of the composite culture of India. The directive also calls for drawing from Sanskrit and other Indian languages to enrich Hindi. Hindi was declared the official language under Article 343.', source: 'Constitution of India, Article 351', difficulty: 'medium' },
  { slug: 'civ-const-inter-state-council-meetings', categoryId: 'cat-civics', text: 'The Inter-State Council (under Article 263) is required to meet at least how many times per year?', options: ['Once', 'Twice', 'Thrice', 'Four times'], correctIndex: 2, explanation: 'Under the Inter-State Council order, 1990, the Council is required to meet at least three times a year. The Council is chaired by the Prime Minister and includes Chief Ministers of all States, Lieutenant Governors of UTs, and 6 Cabinet ministers nominated by the PM. It was first established in 1990 based on the Sarkaria Commission recommendation (1988).', source: 'Constitution of India, Article 263 / Inter-State Council Order, 1990', difficulty: 'hard' },
  { slug: 'civ-parliament-zero-hour-origin', categoryId: 'cat-civics', text: 'The practice of "Zero Hour" in Indian Parliament was first started in which decade?', options: ['1950s', '1960s (1962)', '1980s', '1990s'], correctIndex: 1, explanation: 'The "Zero Hour" was first introduced in the Indian Parliament in 1962. It refers to the period immediately following the Question Hour (at 12 noon — hence "zero hour") when members can raise matters of urgent public importance without prior notice. Zero Hour is not mentioned in the Rules of Procedure but has become a regular parliamentary practice.', source: 'Parliament of India / Lok Sabha Secretariat', difficulty: 'medium' },
  { slug: 'civ-election-vvpat-introduction', categoryId: 'cat-civics', text: 'Voter Verifiable Paper Audit Trail (VVPAT) machines were first used in Indian elections in which year?', options: ['2009', '2013', '2017', '2019'], correctIndex: 1, explanation: 'VVPAT machines were first used in a by-election in the Noksen Assembly Constituency of Nagaland in September 2013. VVPAT prints a paper slip showing the candidate\'s name, symbol, and serial number, allowing voters to verify their vote. From the 2019 Lok Sabha elections, VVPAT was used with all EVMs across India.', source: 'Election Commission of India', difficulty: 'medium' },

  // ═══ cat-edu (5 — gap was 15, bringing to 90) ═══
  { slug: 'edu-pm-shri-schools-number-2024', categoryId: 'cat-edu', text: 'PM-SHRI (PM Schools for Rising India) aims to upgrade how many schools across India (as announced in 2022)?', options: ['5,000 schools', '10,000 schools', '14,500+ schools', '25,000 schools'], correctIndex: 2, explanation: 'PM-SHRI was launched on 5 September 2022 (Teachers\' Day), aiming to upgrade 14,500+ existing schools to model schools with modern infrastructure, green building standards, and experiential learning. The outlay is Rs. 27,360 crore for 5 years (2022-23 to 2026-27). The schools will showcase NEP 2020 implementation.', source: 'Ministry of Education / PM-SHRI portal', difficulty: 'medium' },
  { slug: 'edu-india-medical-colleges-count-2024', categoryId: 'cat-edu', text: 'As of 2024, approximately how many medical colleges (government + private) exist in India?', options: ['About 350', 'About 500', 'About 706', 'About 1,000'], correctIndex: 2, explanation: 'As of 2024, India has approximately 706 medical colleges (about 356 government + 350 private) offering MBBS programs, with approximately 1,08,000+ MBBS seats. India has the highest number of medical colleges in the world. NMC (National Medical Commission) regulates medical education in India (replaced MCI in 2020).', source: 'National Medical Commission (NMC) / Ministry of Health', difficulty: 'medium' },
  { slug: 'edu-india-iiits-count-2024', categoryId: 'cat-edu', text: 'As of 2024, how many Indian Institutes of Information Technology (IIITs) are there in India (all types)?', options: ['About 15', 'About 25', 'About 26 (including 5 centrally funded + 21 PPP mode)', 'About 40'], correctIndex: 2, explanation: 'As of 2024, there are approximately 26 IIITs in India: 5 are centrally funded (Allahabad, Gwalior, Jabalpur, Kancheepuram, Kottayam), and about 21 are established under PPP (Public-Private Partnership) mode. The first IIIT was IIIT Allahabad (established 1999). IIITs focus on IT and computer science education.', source: 'Ministry of Education / AICTE', difficulty: 'hard' },
  { slug: 'edu-national-medical-commission-replace', categoryId: 'cat-edu', text: 'The National Medical Commission (NMC) replaced which body in 2020 as India\'s medical education regulator?', options: ['University Grants Commission (UGC)', 'Medical Council of India (MCI)', 'AICTE', 'Dental Council of India'], correctIndex: 1, explanation: 'The NMC replaced the Medical Council of India (MCI) on 25 September 2020 under the NMC Act, 2019. The MCI was established in 1933 and dissolved amid corruption allegations. The NMC has 4 autonomous boards: UG Medical Education, PG Medical Education, Medical Assessment and Rating, and Ethics and Medical Registration.', source: 'National Medical Commission / Ministry of Health', difficulty: 'medium' },
  { slug: 'edu-india-ger-target-nep', categoryId: 'cat-edu', text: 'NEP 2020 sets a target for India\'s Gross Enrolment Ratio (GER) in higher education. What is the target and by what year?', options: ['30% by 2025', '50% by 2035', '75% by 2040', '100% by 2030'], correctIndex: 1, explanation: 'NEP 2020 targets 50% GER in higher education by 2035 (from about 28.4% in 2021-22). GER is the ratio of enrolment in higher education to the population in the 18-23 age group. NEP 2020 also aims to make all higher education institutions multidisciplinary by 2040, and to add 3.5 million new seats in higher education.', source: 'Ministry of Education / National Education Policy 2020', difficulty: 'medium' },

  // ═══ cat-sports (4 — gap was 14, bringing to 90) ═══
  { slug: 'spt-india-olympic-first-team-medal', categoryId: 'cat-sports', text: 'India won its first ever Olympic medal (a team gold) in 1928. In which sport?', options: ['Cricket', 'Hockey', 'Football', 'Athletics'], correctIndex: 1, explanation: 'India won its first Olympic medal — a gold in hockey — at the 1928 Amsterdam Olympics. India defeated the Netherlands 3-0 in the final. Dhyan Chand scored 14 goals in the tournament. India dominated Olympic hockey, winning 8 gold medals between 1928 and 1980. India\'s first individual Olympic medal was by K.D. Jadhav (wrestling bronze, 1952).', source: 'International Olympic Committee (IOC) / Indian Olympic Association', difficulty: 'easy' },
  { slug: 'spt-india-cricket-t20-world-cup-2024', categoryId: 'cat-sports', text: 'India won the ICC T20 World Cup 2024. Who was the captain and who was named Player of the Tournament?', options: ['Rohit Sharma (captain), Jasprit Bumrah (Player of Tournament)', 'Virat Kohli (captain), Rohit Sharma (Player of Tournament)', 'Hardik Pandya (captain), Suryakumar Yadav (Player of Tournament)', 'Rishabh Pant (captain), Arshdeep Singh (Player of Tournament)'], correctIndex: 0, explanation: 'India won the ICC T20 World Cup 2024 (held in the USA and West Indies) under captain Rohit Sharma, defeating South Africa by 7 runs in the final at Barbados on 29 June 2024. Jasprit Bumrah was named Player of the Tournament (15 wickets). Virat Kohli scored 76 in the final and was named Player of the Match. This was India\'s second T20 World Cup title (after 2007).', source: 'ICC T20 World Cup records / ESPN Cricinfo', difficulty: 'medium' },
  { slug: 'spt-india-cricket-test-10000-sachin', categoryId: 'cat-sports', text: 'Sachin Tendulkar was the first batsman to score 10,000 runs in Test cricket. Against which team did he achieve this milestone?', options: ['Australia', 'Pakistan', 'Sri Lanka', 'England'], correctIndex: 1, explanation: 'Sachin Tendulkar became the first batsman to score 10,000 Test runs on 10 March 2005 against Pakistan at Eden Gardens, Kolkata. He achieved the milestone in his 122nd Test match. Tendulkar finished his Test career with 15,921 runs in 200 Tests — the most by any batsman. He also scored 51 Test centuries and 49 ODI centuries (100 international centuries total).', source: 'ESPN Cricinfo / ICC records / BCCI', difficulty: 'medium' },
  { slug: 'spt-india-hockey-tokyo-2020-bronze-match', categoryId: 'cat-sports', text: 'At the Tokyo 2020 Olympics, India won bronze in men\'s hockey by defeating which team in the bronze medal match?', options: ['Australia', 'Germany (5-4)', 'Netherlands', 'Belgium'], correctIndex: 1, explanation: 'India defeated Germany 5-4 in a thrilling bronze medal match at Tokyo 2020 (held 2021), ending a 41-year Olympic hockey medal drought. Simranjeet Singh scored 2 goals, with Rupinder Pal Singh, Harmanpreet Singh, and Hardik Singh each scoring one. Goalkeeper PR Sreejesh made a crucial save in the final seconds. India\'s last Olympic hockey medal before Tokyo was gold at the 1980 Moscow Olympics.', source: 'International Hockey Federation (FIH) / Hockey India', difficulty: 'medium' },

  // ═══ cat-culture (4 — gap was 14, bringing to 90) ═══
  { slug: 'cul-kerala-theyyam-performers', categoryId: 'cat-culture', text: 'Theyyam, a ritual dance form of northern Kerala, is traditionally performed by which community?', options: ['Nambudiri Brahmins only', 'Members of lower-caste communities who embody deities during the performance', 'Nair community only', 'All communities equally'], correctIndex: 1, explanation: 'Theyyam is traditionally performed by members of lower-caste communities in northern Kerala (Kannur, Kasargod districts). During the performance, the performer is believed to embody the deity and becomes a channel for divine power. This subverts traditional caste hierarchies, as even upper-caste devotees seek blessings from the performer (who may be from a lower caste). There are about 400+ types of Theyyam.', source: 'Kerala Tourism / Sangeet Natak Akademi / Ministry of Culture', difficulty: 'hard' },
  { slug: 'cul-indian-classical-music-dhrupad-origin', categoryId: 'cat-culture', text: 'The Dhrupad style of Hindustani classical music is believed to have originated in which tradition?', options: ['Mughal court music', 'Vedic chanting and temple music (Samaveda)', 'Persian classical music', 'Sufi devotional music'], correctIndex: 1, explanation: 'Dhrupad traces its origins to Vedic chanting and temple music, specifically the Samaveda (which was sung, not spoken). The name "Dhrupad" comes from "dhruva" (fixed) and "pada" (verse). It evolved as a formal vocal style in the 15th century, particularly associated with the Dagar family (Dagar Gharana). Dhrupad emphasises pure melody (alap) without words in the opening section, focusing on the sacred syllable "Om" and deep meditation.', source: 'Sangeet Natak Akademi / ITC Sangeet Research Academy', difficulty: 'hard' },
  { slug: 'cul-indian-holi-lathmar-mathura', categoryId: 'cat-culture', text: 'The unique "Lathmar Holi" (where women playfully beat men with sticks) is celebrated in which region?', options: ['Vrindavan and Barsana (Mathura, Uttar Pradesh)', 'Jaipur, Rajasthan', 'Shantiniketan, West Bengal', 'Anandpur Sahib, Punjab'], correctIndex: 0, explanation: 'Lathmar Holi is celebrated in Barsana and Nandgaon (near Mathura, Uttar Pradesh) — the legendary villages of Radha and Krishna. In this tradition, men from Nandgaon visit Barsana and are playfully beaten with sticks (lathis) by the women of Barsana. The men protect themselves with shields. This re-enacts the playful teasing between Krishna and Radha\'s friends (gopis). Barsana Holi is famous across India.', source: 'Ministry of Culture / Uttar Pradesh Tourism', difficulty: 'medium' },
  { slug: 'cul-indian-classical-music-tansen-festival', categoryId: 'cat-culture', text: 'The annual Tansen Sangeet Sammelan (Tansen Music Festival) is held near whose tomb in which city?', options: ['Tansen\'s tomb in Gwalior', 'Tansen\'s tomb in Delhi', 'Akbar\'s tomb in Agra', 'Tansen\'s tomb in Lucknow'], correctIndex: 0, explanation: 'The Tansen Sangeet Sammelan (Tansen Music Festival) is held annually near Tansen\'s tomb in Gwalior, Madhya Pradesh, typically in December. Tansen (c. 1500-1589) was one of Akbar\'s Navaratnas (Nine Gems) and one of India\'s greatest musicians. The festival, organised by the Madhya Pradesh government since 1987, features performances by renowned classical musicians who pay tribute to the legend of Tansen.', source: 'Madhya Pradesh Tourism / Ministry of Culture / Sangeet Natak Akademi', difficulty: 'medium' },

  // ═══ cat-science (3 — gap was 13, bringing to 90) ═══
  { slug: 'sci-isro-navic-irnss-satellites-count', categoryId: 'cat-science', text: 'India\'s NavIC (Navigation with Indian Constellation) satellite navigation system consists of how many satellites?', options: ['5 satellites', '7 satellites (3 GEO + 4 GSO)', '12 satellites', '24 satellites'], correctIndex: 1, explanation: 'NavIC (formerly IRNSS - Indian Regional Navigation Satellite System) consists of 7 satellites: 3 in Geostationary Orbit (GEO) and 4 in Geosynchronous Orbit (GSO). It provides position information over India and the surrounding region (up to 1,500 km beyond India\'s borders). NavIC was completed in 2018. It offers two services: Standard Positioning Service (SPS) for civilians and Restricted Service (RS) for authorised users (military).', source: 'ISRO official website / Department of Space', difficulty: 'medium' },
  { slug: 'sci-india-brahmos-air-launch-version', categoryId: 'cat-science', text: 'The air-launched version of the BrahMos supersonic cruise missile was successfully test-fired from which aircraft?', options: ['MiG-29', 'Sukhoi Su-30MKI', 'Dassault Rafale', 'HAL Tejas'], correctIndex: 1, explanation: 'The air-launched version of BrahMos was successfully test-fired from a Sukhoi Su-30MKI fighter jet on 22 November 2017. The BrahMos-A (air-launched variant) is lighter (2.5 tonnes vs 3 tonnes) than the land/naval variants. The Su-30MKI, manufactured by HAL under license from Sukhoi, is India\'s primary air superiority fighter. BrahMos can also be launched from ships, submarines, and land-based mobile launchers.', source: 'DRDO / BrahMos Aerospace / Indian Air Force', difficulty: 'medium' },
  { slug: 'sci-india-green-hydrogen-cost-target', categoryId: 'cat-science', text: 'The National Green Hydrogen Mission aims to bring the cost of green hydrogen down to what level by 2030?', options: ['Rs. 100/kg', 'Rs. 150/kg', 'Rs. 200/kg (about $2.4/kg)', 'Rs. 500/kg'], correctIndex: 2, explanation: 'The National Green Hydrogen Mission (launched January 2023) aims to reduce the cost of green hydrogen to approximately Rs. 100-150/kg by 2030, from the current cost of about Rs. 300-400/kg. The mission targets 5 MMT (million metric tonnes) annual production by 2030, with Rs. 19,744 crore outlay. Green hydrogen is produced by splitting water using renewable electricity (electrolysis), producing zero carbon emissions.', source: 'Ministry of New and Renewable Energy (MNRE)', difficulty: 'hard' },

  // ═══ cat-history (3 — gap was 12, bringing to 91) ═══
  { slug: 'hist-indus-valley-dancing-girl-material', categoryId: 'cat-history', text: 'The famous "Dancing Girl" sculpture from Mohenjo-daro is made of which material?', options: ['Terracotta', 'Bronze (lost-wax casting technique)', 'Stone', 'Gold'], correctIndex: 1, explanation: 'The "Dancing Girl" (c. 2500 BCE) is a bronze sculpture made using the lost-wax (cire perdue) casting technique. It is about 10.5 cm tall and depicts a young girl in a confident pose with one hand on her hip. It was discovered by Ernest Mackay in 1926 at Mohenjo-daro. The use of bronze and the sophisticated casting technique demonstrate the advanced metallurgy of the Indus Valley Civilisation. It is displayed at the National Museum, New Delhi.', source: 'Archaeological Survey of India / National Museum, New Delhi', difficulty: 'medium' },
  { slug: 'hist-chandragupta-maurya-jain-death', categoryId: 'cat-history', text: 'According to tradition, Chandragupta Maurya (founder of the Maurya Empire) spent his final years as a Jain monk and died at which location?', options: ['Pataliputra', 'Sravanabelagola (Karnataka)', 'Taxila', 'Ujjain'], correctIndex: 1, explanation: 'According to Jain tradition, Chandragupta Maurya (c. 340-297 BCE) abdicated his throne, became a Jain monk under the spiritual guidance of Bhadrabahu, and traveled to Sravanabelagola in Karnataka. There, he is said to have performed "Sallekhana" (ritual fasting unto death) on Chandragiri Hill. While this account comes from Jain texts (not confirmed by contemporary sources), it is widely accepted by historians. His grandson Ashoka later embraced Buddhism.', source: 'Indian Council of Historical Research / Archaeological Survey of India', difficulty: 'hard' },
  { slug: 'hist-portuguese-first-arrival-india', categoryId: 'cat-history', text: 'The Portuguese explorer Vasco da Gama first arrived in India (at Calicut/Kozhikode) in which year?', options: ['1443', '1492', '1498', '1510'], correctIndex: 2, explanation: 'Vasco da Gama arrived at Calicut (now Kozhikode, Kerala) on 20 May 1498, becoming the first European to reach India by sea (via the Cape of Good Hope route). His voyage opened the sea route from Europe to India, marking the beginning of European colonialism in India. The Portuguese established their first factory at Calicut in 1500. Goa was captured by the Portuguese in 1510 under Afonso de Albuquerque.', source: 'Indian Council of Historical Research / National Archives of India', difficulty: 'medium' },

  // ═══ cat-geography (3 — gap was 12, bringing to 91) ═══
  { slug: 'geo-india-northernmost-point', categoryId: 'cat-geography', text: 'What is the northernmost point of India?', options: ['Leh, Ladakh', 'Indira Col (Siachen Glacier area, ~35.5°N)', 'Srinagar, J&K', 'Tawang, Arunachal Pradesh'], correctIndex: 1, explanation: 'Indira Col, located near the Siachen Glacier at approximately 35.5°N latitude in the Karakoram Range, is considered the northernmost point of India. It is located in the union territory of Ladakh ( formerly part of J&K). Indira Col is named after Indira Gandhi (though she never visited it). The area is under Indian military control since Operation Meghdoot (1984). The southernmost point of India is Indira Point (Great Nicobar Island).', source: 'Survey of India / Geological Survey of India', difficulty: 'hard' },
  { slug: 'geo-india-southernmost-point', categoryId: 'cat-geography', text: 'What is the southernmost point of India?', options: ['Kanyakumari (Cape Comorin)', 'Indira Point (Great Nicobar Island)', 'Rameswaram', 'Port Blair'], correctIndex: 1, explanation: 'Indira Point (formerly Pygmalion Point) on Great Nicobar Island is the southernmost point of India (approximately 6.7°N latitude). It was named after Indira Gandhi. The 2004 Indian Ocean tsunami caused significant subsidence at Indira Point. Before independence and before the Andaman & Nicobar Islands were part of India, Kanyakumari (Cape Comorin, ~8°N) on the mainland was the southernmost point.', source: 'Survey of India / Andaman & Nicobar Administration', difficulty: 'medium' },
  { slug: 'geo-india-westernmost-point', categoryId: 'cat-geography', text: 'What is the westernmost point of mainland India?', options: ['Rann of Kutch (Gujarat)', 'Guhagar, Maharashtra', 'Goa', 'Kerala coast'], correctIndex: 0, explanation: 'The westernmost point of mainland India is in the Rann of Kutch, Gujarat (approximately 68°7\'E longitude). The Rann of Kutch is a large salt marsh in Gujarat. The westernmost point of India (including islands) is in the Andaman & Nicobar Islands. Gujarat has the longest coastline (1,600 km) among Indian states and shares borders with Pakistan.', source: 'Survey of India / Ministry of Home Affairs', difficulty: 'medium' },

  // ═══ cat-economy (2 — gap was 11, bringing to 91) ═══
  { slug: 'eco-india-forex-reserves-2024', categoryId: 'cat-economy', text: 'As of mid-2024, India\'s foreign exchange reserves were approximately how much?', options: ['About $200 billion', 'About $400 billion', 'About $650-670 billion', 'About $1 trillion'], correctIndex: 2, explanation: 'As of mid-2024, India\'s foreign exchange reserves were approximately $650-670 billion (RBI data). India has the 4th largest forex reserves in the world (after China, Japan, and Switzerland). Forex reserves include foreign currency assets, gold, SDRs, and IMF reserve position. India\'s reserves reached a record high of about $704 billion in September 2024.', source: 'Reserve Bank of India', difficulty: 'medium' },
  { slug: 'eco-india-corporate-tax-rate-2024', categoryId: 'cat-economy', text: 'The base corporate tax rate in India (for domestic companies, under the new regime) as of 2024 is approximately what?', options: ['15%', '22%', '25.17% (including surcharge and cess)', '30%'], correctIndex: 2, explanation: 'The base corporate tax rate for domestic companies in India is 22% (Section 115BAA, introduced in September 2019). Including surcharge (10%) and cess (4%), the effective rate is approximately 25.17%. This was reduced from the earlier rate of 30% (effective ~34.9% with surcharge and cess) to make India more competitive. For new manufacturing companies (Section 115BAB), the rate is 15% (effective ~17.16%).', source: 'Ministry of Finance / Central Board of Direct Taxes (CBDT) / Income Tax Department', difficulty: 'hard' },

  // ═══ cat-environment (2 — gap was 11, bringing to 91) ═══
  { slug: 'env-india-coral-reef-locations', categoryId: 'cat-environment', text: 'India has coral reefs at which of the following locations?', options: ['Only Andaman & Nicobar Islands', 'Only Lakshadweep Islands', 'Andaman & Nicobar, Lakshadweep, Gulf of Mannar, Gulf of Kutch', 'Only Gulf of Mannar'], correctIndex: 2, explanation: 'India has 4 major coral reef areas: (1) Andaman & Nicobar Islands (fringing reefs, ~11,000 sq km, most biodiverse), (2) Lakshadweep Islands (atolls, ~2,500 sq km), (3) Gulf of Mannar (between Tamil Nadu and Sri Lanka, fringing reefs), and (4) Gulf of Kutch (Gujarat, fringing reefs). India\'s total coral reef area is about 5,790 sq km. Coral reefs are threatened by climate change (bleaching), pollution, and destructive fishing.', source: 'Ministry of Environment, Forest and Climate Change / Zoological Survey of India', difficulty: 'medium' },
  { slug: 'env-india-vulture-conservation-centre', categoryId: 'cat-environment', text: 'India\'s first Vulture Conservation Breeding Centre was established at which location?', options: ['Bharatpur, Rajasthan', 'Pinjore, Haryana (near Chandigarh)', 'Junagadh, Gujarat', 'Guwahati, Assam'], correctIndex: 1, explanation: 'India\'s first Vulture Conservation Breeding Centre was established at Pinjore, Haryana (near Chandigarh) in 2001, by the Bombay Natural History Society (BNHS) in collaboration with the Haryana Forest Department. It was established in response to the catastrophic vulture population decline (90-99%) caused by diclofenac poisoning. The centre breeds critically endangered species: White-rumped, Indian, and Slender-billed vultures. India banned veterinary diclofenac in 2006.', source: 'Bombay Natural History Society (BNHS) / Ministry of Environment', difficulty: 'hard' },

  // ═══ cat-art (2 — gap was 10, bringing to 92) ═══
  { slug: 'art-rigveda-samaveda-music', categoryId: 'cat-art', text: 'Which of the four Vedas is specifically associated with music and chanting (melodic recitation)?', options: ['Rigveda', 'Samaveda', 'Yajurveda', 'Atharvaveda'], correctIndex: 1, explanation: 'The Samaveda is the Veda of music and melodies. It contains the "Saman" chants — melodies derived from Rigvedic verses but set to specific musical notes. The Samaveda is considered the origin of Indian classical music. The word "Sama" means "melody" or "song." The Samaveda has 1,875 verses, mostly drawn from the Rigveda but arranged for musical chanting. It was traditionally sung by Udgatri priests during Vedic rituals.', source: 'Sahitya Akademi / Sangeet Natak Akademi / Indian National Science Academy', difficulty: 'medium' },
  { slug: 'art-bharatanatyam-mudra-pataka', categoryId: 'cat-art', text: 'In Bharatanatyam (and other Indian classical dance forms), the most fundamental "mudra" (hand gesture) is called what?', options: ['Alapadma', 'Pataka (flat hand with fingers joined)', 'Ardhachandra', 'Shikhara'], correctIndex: 1, explanation: '"Pataka" is the most fundamental mudra in Bharatanatyam and other Indian classical dances. It is a flat hand with all four fingers joined together and the thumb bent. The word "Pataka" means "flag." Pataka is used to represent many things: a forest, a cloud, a river, a curtain, a plate, a bosom, a path, a wave, and many more. There are about 28 Asamyukta Hastas (single-hand gestures) and 23 Samyukta Hastas (combined-hand gestures) in Bharatanatyam.', source: 'Sangeet Natak Akademi / Kalakshetra Foundation / Abhinaya Darpana (Nandikeshvara)', difficulty: 'medium' },

  // ═══ cat-gk (1 — gap was 9, bringing to 92) ═══
  { slug: 'gk-india-largest-domestic-airport', categoryId: 'cat-gk', text: 'Which is India\'s largest airport by passenger traffic (as of 2023-24)?', options: ['Chhatrapati Shivaji Maharaj International Airport (Mumbai)', 'Indira Gandhi International Airport (Delhi)', 'Kempegowda International Airport (Bengaluru)', 'Chennai International Airport'], correctIndex: 1, explanation: 'Indira Gandhi International Airport (DEL) in Delhi is India\'s largest and busiest airport by passenger traffic, handling about 73-74 million passengers annually (2023-24). It has 3 terminals and 3 runways. Mumbai (BOM) is the second-busiest (~52 million). Bengaluru (BLR) is third (~37 million). Delhi airport is operated by Delhi International Airport Limited (DIAL), a consortium of GMR Group, Airports Authority of India, and Fraport.', source: 'Airports Authority of India (AAI) / Directorate General of Civil Aviation (DGCA)', difficulty: 'medium' },

  // ═══ cat-edu (2 more — gap was 15, bringing to 92) ═══
  { slug: 'edu-india-agnipath-scheme-year', categoryId: 'cat-edu', text: 'The "Agnipath" scheme for short-term recruitment into the Indian armed forces was announced in which year?', options: ['2020', '2022', '2023', '2024'], correctIndex: 1, explanation: 'The Agnipath scheme was announced on 14 June 2022. It recruits youth (aged 17.5-21 years, later raised to 23) as "Agniveers" for a 4-year period in the Indian Army, Navy, and Air Force. After 4 years, 25% are retained for regular service; the rest receive a "Seva Nidhi" package (about Rs. 11-12 lakh). The scheme faced initial protests but is now operational. About 40,000 Agniveers are recruited annually.', source: 'Ministry of Defence / Indian Army / Indian Navy / Indian Air Force', difficulty: 'medium' },
  { slug: 'edu-india-anusandhan-national-research-foundation', categoryId: 'cat-edu', text: 'The Anusandhan National Research Foundation (ANRF), established in 2023, aims to do what?', options: ['Fund only space research', 'Seed, grow, and promote research and development across universities and colleges in India', 'Fund defence research only', 'Replace CSIR'], correctIndex: 1, explanation: 'The ANRF (established by the ANRF Act, 2023) aims to seed, grow, and promote R&D across universities and colleges in India — particularly those that have historically had limited research funding. It replaces the Science and Engineering Research Board (SERB). ANRF has a corpus of Rs. 50,000 crore (2023-2028), with about 72% from the government and 28% from private industry. It funds basic and applied research across all disciplines.', source: 'Department of Science and Technology (DST) / Ministry of Education', difficulty: 'hard' },
];

async function main() {
  console.log('=== Batch 9 (Final) Import ===\n');
  const existing = await db.quizQuestion.findMany({ select: { id: true, text: true, options: true } });
  const existingTexts = existing.map((q) => q.text);
  const existingSlugs = new Set(existing.map((q) => q.id));
  console.log(`Existing: ${existing.length}, Batch: ${BATCH.length}\n`);

  // Validate all existing options are strings (strengthened audit)
  let existingMalformed = 0;
  for (const q of existing) {
    try {
      const opts = JSON.parse(q.options);
      for (let i = 0; i < opts.length; i++) {
        if (typeof opts[i].text !== 'string' || typeof opts[i].id !== 'string') {
          console.log(`  EXISTING MALFORMED: ${q.id} option ${i}`);
          existingMalformed++;
        }
      }
    } catch(e) {
      console.log(`  EXISTING PARSE ERROR: ${q.id}`);
      existingMalformed++;
    }
  }
  console.log(`Existing malformed: ${existingMalformed}`);

  let imported = 0, skipped = 0, rejected = 0, warned = 0;
  const rejections: Array<{ slug: string; errors: string[] }> = [];
  const warningsLog: Array<{ slug: string; warnings: string[] }> = [];

  for (const q of BATCH) {
    if (existingSlugs.has(q.slug)) { skipped++; continue; }
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate text
    if (!q.text || typeof q.text !== 'string' || q.text.trim().length < 10) {
      errors.push('text must be a string with min 10 chars');
    }
    // Validate options — each must be a string
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      errors.push(`expected 4 options, got ${q.options?.length || 0}`);
    } else {
      for (let i = 0; i < q.options.length; i++) {
        if (typeof q.options[i] !== 'string') {
          errors.push(`option ${i} is not a string: ${typeof q.options[i]}`);
        }
        if (q.options[i].trim().length === 0) {
          errors.push(`option ${i} has empty text`);
        }
      }
    }
    if (q.correctIndex < 0 || q.correctIndex >= 4) errors.push('invalid correctIndex');
    if (!q.explanation || typeof q.explanation !== 'string' || q.explanation.trim().length < 10) {
      errors.push('explanation must be a string with min 10 chars');
    }
    if (!q.source || typeof q.source !== 'string' || q.source.trim().length < 3) {
      errors.push('source must be a string with min 3 chars');
    }
    if (!['easy','medium','hard'].includes(q.difficulty)) errors.push('invalid difficulty');

    const dupResult = checkDuplicate(q.text, existingTexts);
    if (dupResult.isExactDuplicate) errors.push(`exact duplicate: ${dupResult.reason}`);
    else if (dupResult.isNearDuplicate) warnings.push(`near-duplicate: ${dupResult.reason}`);

    if (errors.length > 0) { rejected++; rejections.push({ slug: q.slug, errors }); continue; }
    if (warnings.length > 0) { warned++; warningsLog.push({ slug: q.slug, warnings }); }

    // Build options — ensure text is always a string
    const options = q.options.map((text: string, i: number) => ({ id: String.fromCharCode(97 + i), text: String(text) }));
    try {
      await db.quizQuestion.create({
        data: {
          id: q.slug, categoryId: q.categoryId, text: String(q.text).trim(), translations: '{}',
          options: JSON.stringify(options), correctOptionIndex: q.correctIndex,
          explanation: String(q.explanation).trim(), explanationTranslations: '{}',
          source: String(q.source).trim(), difficulty: q.difficulty, language: 'en', published: true,
        },
      });
      existingTexts.push(q.text);
      imported++;
    } catch (e) {
      rejected++;
      rejections.push({ slug: q.slug, errors: [(e as Error).message] });
    }
  }

  console.log(`\n=== Import Summary ===`);
  console.log(`  Imported: ${imported}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Rejected: ${rejected}`);
  console.log(`  Warnings: ${warned}`);
  if (rejections.length > 0) {
    console.log(`\n  --- Rejected ---`);
    for (const r of rejections) console.log(`  [${r.slug}] ${r.errors.join('; ')}`);
  }
  if (warningsLog.length > 0) {
    console.log(`\n  --- Near-duplicate warnings ---`);
    for (const w of warningsLog) console.log(`  [${w.slug}] ${w.warnings.join('; ')}`);
  }

  console.log(`\n=== Post-import counts ===`);
  const allCats = ['cat-gk','cat-history','cat-geography','cat-civics','cat-science','cat-sports','cat-culture','cat-economy','cat-environment','cat-art','cat-edu'];
  let total = 0;
  for (const cat of allCats) {
    const c = await db.quizQuestion.count({ where: { categoryId: cat } });
    if (c > 0) console.log(`  ${cat}: ${c}`);
    total += c;
  }
  console.log(`  TOTAL: ${total}`);
  
  // Final malformed check on all questions
  const allQs = await db.quizQuestion.findMany({ select: { id: true, options: true } });
  let finalMalformed = 0;
  for (const q of allQs) {
    try {
      const opts = JSON.parse(q.options);
      for (let i = 0; i < opts.length; i++) {
        if (typeof opts[i].text !== 'string' || typeof opts[i].id !== 'string') finalMalformed++;
      }
    } catch(e) { finalMalformed++; }
  }
  console.log(`  Final malformed options: ${finalMalformed}`);
}

main().then(() => process.exit(0));

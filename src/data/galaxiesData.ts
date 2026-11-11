export interface GalaxyInfo {
  id: string;
  name: string;
  catalogName: string;
  type: string; // e.g. "Barred Spiral", "Grand Design Spiral", "Lenticular"
  morphology: string; // Hubble classification like "SBbc", "SA(s)b"
  constellation: string;
  distanceLightYears: string;
  diameterLightYears: number; // e.g. 100,000 for Milky Way
  estimatedStars: string;
  blackHoleMass: string; // in solar masses
  accentColor: string;
  color: string;
  tagline: string;
  overview: string;
  keyFeatures: string[];
  scientificDetails: {
    armCount: number;
    rotationVelocity: string;
    stellarHalo: string;
    metallicity: string;
    mergerStatus: string;
  };
  funFacts: string[];
}

export const GALAXIES_DATA: Record<string, GalaxyInfo> = {
  'milky-way': {
    id: 'milky-way',
    name: 'The Milky Way',
    catalogName: 'Home Galaxy',
    type: 'Barred Spiral Galaxy',
    morphology: 'SBbc',
    constellation: 'Sagittarius (Galactic Center)',
    distanceLightYears: '0 ly (We live inside it!)',
    diameterLightYears: 100000,
    estimatedStars: '100 - 400 Billion',
    blackHoleMass: '4.3 Million M☉ (Sagittarius A*)',
    accentColor: '#38bdf8',
    color: '#0284c7',
    tagline: 'Our home island universe anchored by a radiant stellar bar and supermassive black hole',
    overview:
      'The Milky Way is our home galaxy, a barred spiral featuring two major spiral arms (Scutum-Centaurus and Perseus) and several minor spurs including the Orion-Cygnus Arm where our Solar System is nestled about 26,000 light-years from the core.',
    keyFeatures: [
      'Prominent central stellar bar spanning roughly 27,000 light-years.',
      'Supermassive black hole Sagittarius A* at the galactic gravitational center.',
      'Massive Fermi Bubbles extending 25,000 light-years above and below the galactic plane.',
      'Enclosed within a vast halo of ancient globular star clusters and dark matter.',
    ],
    scientificDetails: {
      armCount: 4,
      rotationVelocity: '220 km/s at Sun’s orbit (230 million year galactic year)',
      stellarHalo: 'Contains ~150 ancient globular clusters up to 13 billion years old',
      metallicity: 'Population I (metal-rich disc) & Population II (metal-poor halo)',
      mergerStatus: 'Currently cannibalizing the Sagittarius Dwarf; will merge with Andromeda in 4.5 Gyr',
    },
    funFacts: [
      'It takes our Solar System about 230 million Earth years to complete a single orbit around the Milky Way core.',
      'If the Milky Way were shrunk to the diameter of the continental United States, our entire Solar System would be smaller than a grain of sand.',
      'The galactic disk is not perfectly flat—it is warped like an oscillating frisbee due to gravitational tides from dwarf companion galaxies.',
    ],
  },

  andromeda: {
    id: 'andromeda',
    name: 'Andromeda Galaxy',
    catalogName: 'Messier 31 / NGC 224',
    type: 'Major Spiral Galaxy',
    morphology: 'SA(s)b',
    constellation: 'Andromeda',
    distanceLightYears: '2.537 Million ly',
    diameterLightYears: 220000,
    estimatedStars: '1 Trillion',
    blackHoleMass: '140 Million M☉ (Central SMBH)',
    accentColor: '#818cf8',
    color: '#6366f1',
    tagline: 'The closest major spiral galaxy to the Milky Way, speeding toward a cosmic collision',
    overview:
      'Andromeda is the largest member of our Local Group of galaxies. Containing approximately one trillion stars—more than double the Milky Way—it boasts a stunning double nucleus and a crowded halo of over 450 globular clusters.',
    keyFeatures: [
      'Over twice the diameter of the Milky Way, spanning 220,000 light-years.',
      'Approaching the Milky Way at roughly 110 kilometers per second (400,000 km/h).',
      'Double nucleus containing an eccentric disk of old red stars orbiting the primary black hole.',
      'Surrounded by a retinue of satellite galaxies including M32, M110, and NGC 185.',
    ],
    scientificDetails: {
      armCount: 2,
      rotationVelocity: '250 km/s outer disk rotation',
      stellarHalo: 'Enormous stellar halo extending nearly halfway to the Milky Way',
      metallicity: 'High metallicity core with ongoing star-forming rings',
      mergerStatus: 'Head-on collision course with the Milky Way to form "Milkdromeda"',
    },
    funFacts: [
      'Andromeda is the most distant celestial object visible to the human naked eye on a clear, dark night.',
      'In roughly 4.5 billion years, Andromeda and the Milky Way will merge, reshaping both galaxies into a giant elliptical galaxy.',
      'Due to its immense size, the gas halo of Andromeda already touches the halo of our own Milky Way galaxy!',
    ],
  },

  triangulum: {
    id: 'triangulum',
    name: 'Triangulum Galaxy',
    catalogName: 'Messier 33 / NGC 598',
    type: 'Flocculent Spiral Galaxy',
    morphology: 'SA(s)cd',
    constellation: 'Triangulum',
    distanceLightYears: '2.73 Million ly',
    diameterLightYears: 60000,
    estimatedStars: '40 Billion',
    blackHoleMass: '< 3,000 M☉ (No prominent central SMBH found)',
    accentColor: '#2dd4bf',
    color: '#0d9488',
    tagline: 'A luminous, unbarred spiral galaxy and hyperactive cosmic nursery',
    overview:
      'Triangulum is the third-largest member of the Local Group. It lacks a supermassive central black hole and a central bar, displaying loosely wound, feather-like (flocculent) spiral arms filled with sparkling blue star clusters and neon-pink hydrogen nebulae.',
    keyFeatures: [
      'Hosts NGC 604, one of the largest and most luminous star-forming H II regions known.',
      'Lacks a central bulge or evidence of a supermassive black hole at its core.',
      'Gravitationally bound to Andromeda, often regarded as its massive satellite or companion.',
      'Exhibits an extraordinarily high rate of star birth relative to its modest mass.',
    ],
    scientificDetails: {
      armCount: 2,
      rotationVelocity: '100 km/s disk rotation',
      stellarHalo: 'Gas-rich interstellar medium with low dust extinction',
      metallicity: 'Sub-solar metallicity, preserving pristine cosmic gas',
      mergerStatus: 'Likely orbiting Andromeda; may be involved in the future Milkdromeda merger',
    },
    funFacts: [
      'NGC 604 inside Triangulum is 40 times larger than the famous Orion Nebula and 6,300 times more luminous!',
      'Triangulum produces stars at a rate 4.5 times faster than the Andromeda galaxy despite having only 5% of its mass.',
      'It may be stripped of its outer stars and gas as it completes its close orbit around Andromeda.',
    ],
  },

  sombrero: {
    id: 'sombrero',
    name: 'Sombrero Galaxy',
    catalogName: 'Messier 104 / NGC 4594',
    type: 'Lenticular / Unbarred Spiral Galaxy',
    morphology: 'SA(s)a',
    constellation: 'Virgo',
    distanceLightYears: '31.1 Million ly',
    diameterLightYears: 50000,
    estimatedStars: '800 Billion',
    blackHoleMass: '1 Billion M☉ (Supermassive Monster)',
    accentColor: '#f59e0b',
    color: '#d97706',
    tagline: 'The iconic brimmed hat of the cosmos with a massive central bulge and dark dust ring',
    overview:
      'Viewed almost edge-on (just 6 degrees off the disk plane), the Sombrero Galaxy is legendary for its brilliant white bulbous core, an unusually large central bulge, and a striking, thick silhouette dust rim resembling a Mexican sombrero hat.',
    keyFeatures: [
      'Thick symmetrical rim of dark cosmic dust and cold hydrogen gas absorbing core light.',
      'Gigantic supermassive black hole weighing one billion solar masses—250 times heavier than Sagittarius A*.',
      'Over 2,000 globular clusters orbiting its halo—ten times more than our Milky Way.',
      'Hybrid characteristics between an elliptical galaxy and a tightly wound spiral.',
    ],
    scientificDetails: {
      armCount: 2,
      rotationVelocity: '380 km/s inner orbital velocities',
      stellarHalo: 'Immense spheroidal stellar halo resembling a giant elliptical galaxy',
      metallicity: 'Old Population II stars dominate the immense central bulge',
      mergerStatus: 'May have formed from a major merger between an elliptical and gas-rich spiral',
    },
    funFacts: [
      'The Sombrero’s central black hole is one of the most massive ever detected in our nearby universe.',
      'Measurements of its rotation in 1912 by Vesto Slipher provided the first observational clues that the universe is expanding.',
      'Its dust ring contains almost all of the galaxy’s cold gas, star-forming regions, and dust.',
    ],
  },

  whirlpool: {
    id: 'whirlpool',
    name: 'Whirlpool Galaxy',
    catalogName: 'Messier 51a / NGC 5194',
    type: 'Grand Design Spiral Galaxy',
    morphology: 'SA(s)bc pec',
    constellation: 'Canes Venatici',
    distanceLightYears: '23 Million ly',
    diameterLightYears: 76000,
    estimatedStars: '100 Billion',
    blackHoleMass: '20 Million M☉',
    accentColor: '#ec4899',
    color: '#db2777',
    tagline: 'The archetype of majestic spiral beauty locked in a gravitational cosmic dance',
    overview:
      'The Whirlpool Galaxy was the very first galaxy to have its spiral structure identified (by Lord Rosse in 1845). It displays pristine, arching spiral arms triggered by tidal gravitational interactions with its yellow dwarf companion galaxy, NGC 5195.',
    keyFeatures: [
      'Classic "Grand Design" two-arm spiral pattern with dramatic high-contrast dust lanes.',
      'Tidal gravitational bridge connecting the outer spiral arm to companion galaxy NGC 5195.',
      'Luminous pink clusters of hydrogen gas ignited by shock-wave induced star formation.',
      'Active Galactic Nucleus (Seyfert 2) harboring an obscured central black hole.',
    ],
    scientificDetails: {
      armCount: 2,
      rotationVelocity: '210 km/s',
      stellarHalo: 'Tidal stellar streams extending over 100,000 light-years',
      metallicity: 'High star-formation rate due to tidal compression waves',
      mergerStatus: 'Ongoing gravitational interaction; companion passed through main disk 500 Myr ago',
    },
    funFacts: [
      'Lord Rosse’s 1845 sketch of the Whirlpool using the 72-inch "Leviathan of Parsonstown" telescope inspired Vincent van Gogh’s swirling sky in The Starry Night!',
      'The companion galaxy passed directly through the main disk of M51, compressing gas clouds and triggering a firestorm of newborn stars.',
      'Three supernovae have been observed in the Whirlpool Galaxy in the last 30 years alone (1994, 2005, and 2011).',
    ],
  },

  cartwheel: {
    id: 'cartwheel',
    name: 'Cartwheel Galaxy',
    catalogName: 'ESO 350-40',
    type: 'Ring Galaxy',
    morphology: 'dpt ring pec',
    constellation: 'Sculptor',
    distanceLightYears: '500 Million ly',
    diameterLightYears: 150000,
    estimatedStars: '300 Billion',
    blackHoleMass: 'Multiple ultra-luminous X-ray black holes in outer ring',
    accentColor: '#a855f7',
    color: '#9333ea',
    tagline: 'A cosmic bullseye formed by a catastrophic high-speed galactic collision',
    overview:
      'The Cartwheel Galaxy was once a normal spiral until a smaller companion galaxy shot straight through its bullseye center roughly 200 million years ago. Like a pebble thrown into a cosmic pond, the impact generated an expanding supersonic shock wave of glowing gas and newborn stars.',
    keyFeatures: [
      'Outer luminous ring 150,000 light-years across, expanding outward at 217,000 km/h.',
      'Delicate spoke-like filaments connecting the bright inner ring to the outer expansion wave.',
      'Abundant in ultra-luminous X-ray sources (ULXs), including feeding stellar-mass black holes.',
      'Brilliant observations from both Hubble and the James Webb Space Telescope revealing newborn clusters.',
    ],
    scientificDetails: {
      armCount: 0,
      rotationVelocity: 'Radial expansion velocity: 60 km/s outward ripple',
      stellarHalo: 'Surrounded by tidal debris and two companion galaxies',
      metallicity: 'Gas-rich ring enriched by hundreds of thousands of supernova explosions',
      mergerStatus: 'Post-collision shock recovery; outer ring will eventually dissipate over 300 Myr',
    },
    funFacts: [
      'The outer ring is so large that our entire Milky Way galaxy could fit completely inside its hollow perimeter!',
      'The cosmic collision produced billions of new stars in a single shockwave ring.',
      'JWST’s infrared cameras pierced through the thick dust veil to reveal hidden individual stars and star clusters forming inside the spokes.',
    ],
  },

  cigar: {
    id: 'cigar',
    name: 'Cigar Galaxy',
    catalogName: 'Messier 82 / NGC 3034',
    type: 'Starburst Galaxy',
    morphology: 'I0 / SB(s)m pec',
    constellation: 'Ursa Major',
    distanceLightYears: '12 Million ly',
    diameterLightYears: 37000,
    estimatedStars: '30 Billion',
    blackHoleMass: '30 Million M☉ + Intermediate Mass BH (400 M☉)',
    accentColor: '#ef4444',
    color: '#dc2626',
    tagline: 'A cosmic firestorm of starburst activity venting glowing red hydrogen superwinds',
    overview:
      'Messier 82 is undergoing an intense starburst episode triggered by gravitational interactions with nearby galaxy M81. In its core, young massive stars are forming ten times faster than in the entire Milky Way, generating colossal galactic superwinds venting red hydrogen gas into intergalactic space.',
    keyFeatures: [
      'Dramatic perpendicular jets of glowing red ionized hydrogen gas extending 20,000 light-years.',
      'Star formation rate 10x higher than the Milky Way, fueled by tidal compression from M81.',
      'Site of frequent supernovae and intense cosmic ray production.',
      'Contains candidate intermediate-mass black holes (M82 X-1) bridging the gap between stellar and supermassive black holes.',
    ],
    scientificDetails: {
      armCount: 0,
      rotationVelocity: 'Chaotic outflow driven by stellar winds at over 1,000 km/s',
      stellarHalo: 'Bipolar outflow of hot gas creating massive X-ray and infrared lobes',
      metallicity: 'High supernova ejecta enrichment in carbon, nitrogen, and oxygen',
      mergerStatus: 'Tidally disturbed by M81 encounter 100 million years ago',
    },
    funFacts: [
      'The galactic superwinds shoot hot gas out of the galaxy at speeds exceeding 1.6 million kilometers per hour!',
      'Because of intense infrared emission from warm cosmic dust, M82 shines brighter in the infrared spectrum than in visible light.',
      'Supernova SN 2014J in M82 was the closest Type Ia supernova observed in over four decades.',
    ],
  },

  'large-magellanic-cloud': {
    id: 'large-magellanic-cloud',
    name: 'Large Magellanic Cloud',
    catalogName: 'LMC / ESO 56-115',
    type: 'Magellanic Spiral / Dwarf Galaxy',
    morphology: 'SB(s)m',
    constellation: 'Dorado / Mensa',
    distanceLightYears: '163,000 ly',
    diameterLightYears: 14000,
    estimatedStars: '20 Billion',
    blackHoleMass: 'No central SMBH detected',
    accentColor: '#f97316',
    color: '#ea580c',
    tagline: 'The vibrant satellite galaxy visible in the Southern skies, home to the Tarantula Nebula',
    overview:
      'The Large Magellanic Cloud is a prominent satellite galaxy orbiting the Milky Way. Disrupted by galactic tides, it features an off-center bar and houses 30 Doradus (the Tarantula Nebula), the most active and massive starburst region in our entire Local Group.',
    keyFeatures: [
      'The fourth-largest galaxy in the Local Group and the closest major satellite of the Milky Way.',
      'Home to the Tarantula Nebula, containing some of the most massive stars known (e.g. R136a1, 250+ M☉).',
      'Site of Supernova 1987A, the first naked-eye supernova observed since 1604.',
      'Trailing the Magellanic Stream, a giant bridge of hydrogen gas stripped by Milky Way gravity.',
    ],
    scientificDetails: {
      armCount: 1,
      rotationVelocity: '70 km/s gentle disk rotation',
      stellarHalo: 'Extended halo undergoing tidal stripping by the Milky Way',
      metallicity: 'Roughly half the solar metallicity',
      mergerStatus: 'On its first close passage around the Milky Way; may fully merge in 2.4 Gyr',
    },
    funFacts: [
      'Named after explorer Ferdinand Magellan, who recorded it during his voyage around the world in 1519.',
      'If the Tarantula Nebula inside the LMC were as close as the Orion Nebula, it would cast visible shadows on Earth at night!',
      'Star R136a1 inside the LMC is over 250 times more massive than our Sun and shines 8 million times brighter.',
    ],
  },
};

export const ORDERED_GALAXIES = [
  'milky-way',
  'andromeda',
  'triangulum',
  'sombrero',
  'whirlpool',
  'cartwheel',
  'cigar',
  'large-magellanic-cloud',
];

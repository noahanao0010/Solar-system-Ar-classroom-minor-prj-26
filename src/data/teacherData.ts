import { TeacherSlide } from '../types/astronomy';

export const TEACHER_SLIDES: TeacherSlide[] = [
  {
    id: 1,
    title: '1. The Sun: Gravitational Engine & Fusion Core',
    targetPlanet: 'sun',
    talkingPoints: [
      'The Sun contains 99.86% of all mass in the Solar System.',
      'Nuclear fusion converts 600M tons of hydrogen into helium every second in the core.',
      'Surface temperature is ~5,500°C; the core reaches an astounding 15,000,000°C.',
      'Solar wind creates space weather and illuminates Earth’s auroras.',
    ],
    promptQuestion: 'Class Question: If the Sun suddenly disappeared, how long would it take before Earth went dark?',
    didYouKnow: 'Light takes roughly 8 minutes and 20 seconds to travel 150 million km from the Sun to Earth.',
  },
  {
    id: 2,
    title: '2. Terrestrial Worlds: Rocky Surfaces & Atmospheres',
    targetPlanet: 'venus',
    talkingPoints: [
      'Inner four planets (Mercury, Venus, Earth, Mars) are composed primarily of rock and metal.',
      'Venus has a runaway greenhouse effect; surface pressure equals being 900 meters underwater.',
      'Mercury experiences temperature swings of over 600°C between night and day due to lack of atmosphere.',
      'Earth is currently the only known world with liquid water, plate tectonics, and biology.',
    ],
    promptQuestion: 'Class Question: Why is Venus hotter than Mercury even though Mercury is much closer to the Sun?',
    didYouKnow: 'Venus spins backwards compared to most other planets, so the Sun rises in the West!',
  },
  {
    id: 3,
    title: '3. Mars & The Asteroid Belt: Boundaries & Canyons',
    targetPlanet: 'mars',
    talkingPoints: [
      'Mars hosts Olympus Mons, a dormant shield volcano three times higher than Mount Everest.',
      'Valles Marineris stretches across 4,000 km, dwarfing Earth’s Grand Canyon.',
      'Between Mars and Jupiter lies the main Asteroid Belt with millions of rocky fragments (Ceres, Vesta).',
      'The asteroid belt represents planetesimals that never coalesced due to Jupiter’s gravitational perturbations.',
    ],
    promptQuestion: 'Class Question: What gives Mars its characteristic reddish color?',
    didYouKnow: 'Rust! Iron oxide in the Martian regolith dust oxidizes and absorbs blue light.',
  },
  {
    id: 4,
    title: '4. Gas Giants: The Great Red Spot & Saturn’s Rings',
    targetPlanet: 'saturn',
    talkingPoints: [
      'Jupiter and Saturn are predominantly hydrogen and helium gas with liquid metallic hydrogen layers.',
      'Jupiter’s Great Red Spot has been spinning as a high-pressure vortex for at least three centuries.',
      'Saturn’s rings span 282,000 km but are only roughly 10 to 30 meters thick.',
      'Saturn has an average density less than liquid water (0.687 g/cm³).',
    ],
    promptQuestion: 'Class Question: If you had a bathtub large enough, would Saturn float or sink?',
    didYouKnow: 'Saturn would float! It is the only planet in our Solar System less dense than water.',
  },
  {
    id: 5,
    title: '5. Ice Giants & The Outer Frontier: Uranus & Neptune',
    targetPlanet: 'uranus',
    talkingPoints: [
      'Uranus and Neptune contain heavier elements (water, ammonia, and methane ices) under extreme pressures.',
      'Uranus rotates sideways at an axial tilt of 97.8°, causing 42-year long polar seasons.',
      'Neptune generates supersonic wind speeds exceeding 2,100 km/h.',
      'Neptune was discovered through mathematical orbital calculations before it was seen by telescope.',
    ],
    promptQuestion: 'Class Question: Why do Uranus and Neptune look distinctly cyan and deep blue?',
    didYouKnow: 'Methane gas in their upper atmospheres absorbs red wavelengths of light and reflects brilliant blues and cyans!',
  },
];

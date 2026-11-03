import { QuizQuestion } from '../types/astronomy';

export const SOLAR_SYSTEM_QUIZ: QuizQuestion[] = [
  {
    id: 1,
    question: 'Which planet in our Solar System is the hottest, despite not being the closest to the Sun?',
    options: ['Mercury', 'Venus', 'Mars', 'Jupiter'],
    correctIndex: 1,
    explanation:
      'Venus is the hottest planet at roughly 464°C (867°F). Its dense carbon dioxide atmosphere and sulfuric acid clouds cause an extreme runaway greenhouse effect that traps solar heat.',
    hint: 'This planet is covered in thick, yellowish sulfuric acid clouds and has an atmosphere with 92 times Earth’s pressure.',
    planetReference: 'venus',
  },
  {
    id: 2,
    question: 'Why does Uranus appear to rotate almost entirely on its side compared to the orbital plane?',
    options: [
      'The strong magnetic field of Neptune pulls it sideways',
      'Solar radiation pressure flattened its rotational axis',
      'An ancient catastrophic collision with an Earth-sized protoplanet',
      'Gravitational drag from its extensive outer ring system',
    ],
    correctIndex: 2,
    explanation:
      'Astronomers believe that early in the Solar System’s history (~4 billion years ago), Uranus was struck by a massive protoplanet roughly 1 to 2 times Earth’s mass, knocking its rotational axis sideways to a 98-degree tilt.',
    hint: 'Think of an interplanetary impact during the chaotic early formation of giant planets.',
    planetReference: 'uranus',
  },
  {
    id: 3,
    question: 'What is the Great Red Spot on Jupiter, and how large is it?',
    options: [
      'A permanent mountain peak towering above the gas clouds',
      'A giant anticyclonic storm larger than the entire planet Earth',
      'An active volcanic plume spewing molten sulfur from the interior',
      'An impact crater left by a rogue extrasolar comet',
    ],
    correctIndex: 1,
    explanation:
      'The Great Red Spot is a persistent high-pressure storm producing 430 km/h winds. It has raged continuously for at least 300 years and is wide enough to swallow Earth whole.',
    hint: 'It is a swirling atmospheric storm located 22 degrees south of Jupiter’s equator.',
    planetReference: 'jupiter',
  },
  {
    id: 4,
    question: 'What are the magnificent rings of Saturn primarily composed of?',
    options: [
      'Solid metallic gold, copper, and iron bands',
      'Dense neon and argon plasma clouds',
      'Water ice particles ranging from tiny dust grains to house-sized boulders',
      'Solidified carbon and diamond sheets',
    ],
    correctIndex: 2,
    explanation:
      'Saturn’s rings are 99% pure water ice, with trace amounts of rock and tholins. Though spanning up to 282,000 km across, the rings are surprisingly paper-thin—only about 10 meters thick on average!',
    hint: 'Think of billions of glittering ice cubes orbiting the gas giant in synchronous harmony.',
    planetReference: 'saturn',
  },
  {
    id: 5,
    question: 'Which planet has the fastest supersonic winds recorded anywhere in the Solar System?',
    options: ['Earth', 'Mars', 'Jupiter', 'Neptune'],
    correctIndex: 3,
    explanation:
      'Neptune features supersonic winds clocking in at over 2,100 km/h (1,300 mph)—faster than the speed of sound on Earth! Its cold interior and atmospheric convection drive these immense jet streams.',
    hint: 'Look to the outermost ice giant, known for its deep blue methane atmosphere and the Great Dark Spot.',
    planetReference: 'neptune',
  },
];

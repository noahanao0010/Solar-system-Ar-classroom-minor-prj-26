export type PlanetId =
  | 'sun'
  | 'mercury'
  | 'venus'
  | 'earth'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune';

export type SpacecraftCategory = 'satellite' | 'rocket' | 'spacecraft';

export type SpacecraftId =
  | 'iss'
  | 'hubble'
  | 'jwst'
  | 'sputnik'
  | 'saturn-v'
  | 'starship'
  | 'sls'
  | 'apollo-lander'
  | 'voyager'
  | 'mars-rover'
  | 'space-shuttle';

export type ArPlaceableId = PlanetId | 'minisystem' | SpacecraftId;

export interface SpacecraftInfo {
  id: SpacecraftId;
  name: string;
  category: SpacecraftCategory;
  agency: string;
  era: string;
  tagline: string;
  description: string;
  color: string;
  accentColor: string;
  dimensions: string;
  massKg: string;
  maxSpeed: string;
  orbitOrDestination: string;
  altitudeOrDistance: string;
  keyMilestones: string[];
  funFacts: string[];
  scaleAR: number;
}


export interface PlanetLayer {
  name: string;
  depth: string;
  composition: string;
  color: string;
  description: string;
}

export interface PlanetInfo {
  id: PlanetId;
  name: string;
  title: string;
  type: 'Star' | 'Terrestrial' | 'Gas Giant' | 'Ice Giant';
  tagline: string;
  overview: string;
  color: string;
  accentColor: string;
  diameterKm: number; // e.g. 12742 for Earth
  massKg: string; // e.g. 5.972 × 10^24 kg
  distanceFromSunKm: number; // in million km
  orbitPeriodDays: number; // in Earth days
  rotationPeriodHours: number; // in hours
  surfaceGravityMs2: number; // e.g. 9.8 for Earth
  avgTempCelsius: number;
  moonsCount: number;
  notableMoons: string[];
  atmosphericComposition: { gas: string; percentage: number }[];
  layers: PlanetLayer[];
  funFacts: string[];
  discovery: string;
  hasRings?: boolean;
  ringColor?: string;
  tiltDegrees: number;
  scale3D: number; // Normalized visual radius for 3D view
  orbitRadius3D: number; // Normalized orbit radius for 3D view
  orbitSpeed3D: number;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  hint: string;
  planetReference?: PlanetId;
}

export interface Mission {
  id: string;
  title: string;
  category: 'exploration' | 'discovery' | 'quiz' | 'ar';
  description: string;
  xpReward: number;
  badge: {
    name: string;
    icon: string;
    color: string;
  };
  requirementCount: number;
  targetPlanet?: PlanetId;
  isUnlocked: boolean;
  isCompleted: boolean;
  progress: number;
}

export interface StudentProgress {
  xp: number;
  level: number;
  title: string;
  exploredPlanets: PlanetId[];
  completedMissionIds: string[];
  quizBestScore: number;
  quizAttempts: number;
  badges: string[];
  notes: { id: string; planetId: PlanetId; text: string; date: string }[];
}

export interface TeacherSlide {
  id: number;
  title: string;
  targetPlanet: PlanetId | 'all';
  talkingPoints: string[];
  promptQuestion: string;
  didYouKnow: string;
}

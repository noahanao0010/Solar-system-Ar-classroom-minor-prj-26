import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { PlanetId, StudentProgress, Mission } from '../types/astronomy';
import { INITIAL_MISSIONS } from '../data/missionsData';
import { soundEffects } from '../utils/soundEffects';

export type AppView =
  | 'dashboard'
  | 'solarSystem'
  | 'explorer'
  | 'compare'
  | 'missions'
  | 'quiz'
  | 'progress'
  | 'teacher'
  | 'cameraAR'
  | 'mywebarHub';

export interface ClassroomStudent {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'exploring' | 'quiz' | 'ar';
  currentPlanet: string;
  quizScore: number | null; // out of 5
  xp: number;
}

interface ClassroomContextType {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  selectedPlanetId: PlanetId;
  setSelectedPlanetId: (id: PlanetId) => void;
  comparePlanets: PlanetId[];
  setComparePlanets: (planets: PlanetId[]) => void;
  addComparePlanet: (id: PlanetId) => void;
  removeComparePlanet: (id: PlanetId) => void;

  // Student progress & Gamification
  progress: StudentProgress;
  exploredCount: number; // Safely computed property
  missions: Mission[];
  markPlanetExplored: (id: PlanetId) => void;
  completeQuiz: (score: number, total: number) => { xpGained: number; isNewRecord: boolean };
  recordArPlacement: () => void;
  recordCompareUsed: () => void;
  claimMissionReward: (missionId: string) => void;
  addStudentNote: (planetId: PlanetId, text: string) => void;
  deleteStudentNote: (noteId: string) => void;
  resetProgress: () => void;

  // Audio
  soundEnabled: boolean;
  toggleSound: () => void;

  // Teacher Presentation state
  classroomCode: string;
  generateNewClassroomCode: () => void;
  teacherSlideIndex: number;
  setTeacherSlideIndex: (idx: number) => void;
  isLaserPointerActive: boolean;
  setIsLaserPointerActive: (active: boolean) => void;
  simulatedStudents: ClassroomStudent[];
}

const STORAGE_KEY = 'ar_smart_classroom_progress_v2';
const SOUND_KEY = 'ar_smart_classroom_sound';

const DEFAULT_PROGRESS: StudentProgress = {
  xp: 120,
  level: 1,
  title: 'Junior Cadet',
  exploredPlanets: ['earth'],
  completedMissionIds: [],
  quizBestScore: 0,
  quizAttempts: 0,
  badges: ['Cadet Wings'],
  notes: [
    {
      id: 'default-note-1',
      planetId: 'earth',
      text: 'Earth is the only known world with liquid surface water and life. 71% ocean coverage.',
      date: '2026-11-03',
    },
  ],
};

const INITIAL_ROSTER: ClassroomStudent[] = [
  { id: 'st-1', name: 'Maya Lin', avatar: '👩‍🚀', status: 'quiz', currentPlanet: 'Venus', quizScore: 5, xp: 620 },
  { id: 'st-2', name: 'Alex Chen', avatar: '👨‍🚀', status: 'ar', currentPlanet: 'Saturn', quizScore: 4, xp: 540 },
  { id: 'st-3', name: 'Sophia Miller', avatar: '👩‍🔬', status: 'exploring', currentPlanet: 'Mars', quizScore: 5, xp: 710 },
  { id: 'st-4', name: 'Noah Patel', avatar: '👨‍🔬', status: 'online', currentPlanet: 'Jupiter', quizScore: 3, xp: 480 },
  { id: 'st-5', name: 'Liam Garcia', avatar: '🧑‍🚀', status: 'exploring', currentPlanet: 'Neptune', quizScore: null, xp: 320 },
];

const ClassroomContext = createContext<ClassroomContextType | null>(null);

function calculateLevelAndTitle(xp: number): { level: number; title: string } {
  if (xp >= 1500) return { level: 5, title: 'Master Astronomer' };
  if (xp >= 1000) return { level: 4, title: 'Mission Commander' };
  if (xp >= 600) return { level: 3, title: 'Planetary Specialist' };
  if (xp >= 300) return { level: 2, title: 'Cosmic Explorer' };
  return { level: 1, title: 'Junior Cadet' };
}

export function ClassroomProvider({ children }: { children: ReactNode }) {
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [selectedPlanetId, setSelectedPlanetId] = useState<PlanetId>('earth');
  const [comparePlanets, setComparePlanets] = useState<PlanetId[]>(['earth', 'mars']);
  const [teacherSlideIndex, setTeacherSlideIndex] = useState(0);
  const [isLaserPointerActive, setIsLaserPointerActive] = useState(false);
  const [classroomCode, setClassroomCode] = useState('ASTRO-4921');
  const [simulatedStudents] = useState<ClassroomStudent[]>(INITIAL_ROSTER);

  // Audio settings
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem(SOUND_KEY);
    return saved !== null ? saved === 'true' : true;
  });

  // Progress state
  const [progress, setProgress] = useState<StudentProgress>(() => {
    if (typeof window === 'undefined') return DEFAULT_PROGRESS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure safe shape
        return {
          ...DEFAULT_PROGRESS,
          ...parsed,
          exploredPlanets: Array.isArray(parsed.exploredPlanets) ? parsed.exploredPlanets : ['earth'],
          completedMissionIds: Array.isArray(parsed.completedMissionIds) ? parsed.completedMissionIds : [],
          notes: Array.isArray(parsed.notes) ? parsed.notes : [],
        };
      }
    } catch {}
    return DEFAULT_PROGRESS;
  });

  // Synchronize sound effects
  useEffect(() => {
    soundEffects.setMuted(!soundEnabled);
    localStorage.setItem(SOUND_KEY, String(soundEnabled));
  }, [soundEnabled]);

  // Persist progress
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {}
  }, [progress]);

  const toggleSound = () => {
    setSoundEnabled(prev => !prev);
  };

  const generateNewClassroomCode = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    setClassroomCode(`ASTRO-${randomNum}`);
    soundEffects.playClick();
  };

  // Safe computed property for explored count
  const exploredCount = progress.exploredPlanets ? progress.exploredPlanets.length : 0;

  // Derive dynamic missions state from progress
  const missions: Mission[] = INITIAL_MISSIONS.map(m => {
    const isCompleted = progress.completedMissionIds.includes(m.id);
    let currentCount = 0;

    if (m.id === 'mission-explore-4') {
      currentCount = Math.min(m.requirementCount, exploredCount);
    } else if (m.id === 'mission-explore-all') {
      currentCount = Math.min(8, progress.exploredPlanets.filter(id => id !== 'sun').length);
    } else if (m.id === 'mission-venus-heat') {
      currentCount = progress.exploredPlanets.includes('venus') ? 1 : 0;
    } else if (m.id === 'mission-saturn-rings') {
      currentCount = progress.exploredPlanets.includes('saturn') ? 1 : 0;
    } else if (m.id === 'mission-compare-giants') {
      currentCount = isCompleted ? 1 : 0;
    } else if (m.id === 'mission-ar-placement') {
      currentCount = isCompleted ? 1 : 0;
    } else if (m.id === 'mission-quiz-master') {
      currentCount = progress.quizBestScore;
    }

    return {
      ...m,
      isCompleted,
      progress: isCompleted ? m.requirementCount : currentCount,
    };
  });

  const markPlanetExplored = (id: PlanetId) => {
    setProgress(prev => {
      if (prev.exploredPlanets.includes(id)) return prev;

      const updatedExplored = [...prev.exploredPlanets, id];
      const xpBonus = 50;
      const newXp = prev.xp + xpBonus;
      const { level, title } = calculateLevelAndTitle(newXp);

      // Auto-unlock completed missions
      const newCompleted = [...prev.completedMissionIds];
      const newBadges = [...prev.badges];

      if (updatedExplored.length >= 4 && !newCompleted.includes('mission-explore-4')) {
        newCompleted.push('mission-explore-4');
        newBadges.push('Cosmic Scout Badge');
      }
      if (updatedExplored.includes('venus') && !newCompleted.includes('mission-venus-heat')) {
        newCompleted.push('mission-venus-heat');
        newBadges.push('Atmospheric Analyst');
      }
      if (updatedExplored.includes('saturn') && !newCompleted.includes('mission-saturn-rings')) {
        newCompleted.push('mission-saturn-rings');
        newBadges.push('Ring Master Badge');
      }
      const majorPlanets = updatedExplored.filter(p => p !== 'sun');
      if (majorPlanets.length >= 8 && !newCompleted.includes('mission-explore-all')) {
        newCompleted.push('mission-explore-all');
        newBadges.push('Grand Tour Master');
      }

      return {
        ...prev,
        xp: newXp,
        level,
        title,
        exploredPlanets: updatedExplored,
        completedMissionIds: newCompleted,
        badges: Array.from(new Set(newBadges)),
      };
    });
  };

  const completeQuiz = (score: number, total: number) => {
    const isNewRecord = score > progress.quizBestScore;
    const baseXP = score * 40;
    const perfectBonus = score === total ? 50 : 0;
    const xpGained = baseXP + perfectBonus;

    setProgress(prev => {
      const newXp = prev.xp + xpGained;
      const { level, title } = calculateLevelAndTitle(newXp);
      const newCompleted = [...prev.completedMissionIds];
      const newBadges = [...prev.badges];

      if (score >= 4 && !newCompleted.includes('mission-quiz-master')) {
        newCompleted.push('mission-quiz-master');
        newBadges.push('Solar Scholar Laureate');
      }

      return {
        ...prev,
        xp: newXp,
        level,
        title,
        quizBestScore: Math.max(prev.quizBestScore, score),
        quizAttempts: prev.quizAttempts + 1,
        completedMissionIds: newCompleted,
        badges: Array.from(new Set(newBadges)),
      };
    });

    return { xpGained, isNewRecord };
  };

  const recordArPlacement = () => {
    setProgress(prev => {
      if (prev.completedMissionIds.includes('mission-ar-placement')) return prev;
      const newXp = prev.xp + 200;
      const { level, title } = calculateLevelAndTitle(newXp);
      return {
        ...prev,
        xp: newXp,
        level,
        title,
        completedMissionIds: [...prev.completedMissionIds, 'mission-ar-placement'],
        badges: Array.from(new Set([...prev.badges, 'WebAR Pioneer'])),
      };
    });
  };

  const recordCompareUsed = () => {
    setProgress(prev => {
      if (prev.completedMissionIds.includes('mission-compare-giants')) return prev;
      const newXp = prev.xp + 120;
      const { level, title } = calculateLevelAndTitle(newXp);
      return {
        ...prev,
        xp: newXp,
        level,
        title,
        completedMissionIds: [...prev.completedMissionIds, 'mission-compare-giants'],
        badges: Array.from(new Set([...prev.badges, 'Planetary Physicist'])),
      };
    });
  };

  const claimMissionReward = (missionId: string) => {
    const targetMission = INITIAL_MISSIONS.find(m => m.id === missionId);
    if (!targetMission) return;

    setProgress(prev => {
      if (prev.completedMissionIds.includes(missionId)) return prev;
      const newXp = prev.xp + targetMission.xpReward;
      const { level, title } = calculateLevelAndTitle(newXp);
      return {
        ...prev,
        xp: newXp,
        level,
        title,
        completedMissionIds: [...prev.completedMissionIds, missionId],
        badges: Array.from(new Set([...prev.badges, targetMission.badge.name])),
      };
    });
    soundEffects.playSuccess();
  };

  const addStudentNote = (planetId: PlanetId, text: string) => {
    const newNote = {
      id: `note-${Date.now()}`,
      planetId,
      text,
      date: new Date().toISOString().split('T')[0],
    };
    setProgress(prev => ({
      ...prev,
      notes: [newNote, ...prev.notes],
    }));
  };

  const deleteStudentNote = (noteId: string) => {
    setProgress(prev => ({
      ...prev,
      notes: prev.notes.filter(n => n.id !== noteId),
    }));
  };

  const resetProgress = () => {
    setProgress(DEFAULT_PROGRESS);
    localStorage.removeItem(STORAGE_KEY);
    soundEffects.playClick();
  };

  const addComparePlanet = (id: PlanetId) => {
    if (!comparePlanets.includes(id) && comparePlanets.length < 3) {
      setComparePlanets([...comparePlanets, id]);
    }
  };

  const removeComparePlanet = (id: PlanetId) => {
    if (comparePlanets.length > 1) {
      setComparePlanets(comparePlanets.filter(p => p !== id));
    }
  };

  return (
    <ClassroomContext.Provider
      value={{
        currentView,
        setCurrentView,
        selectedPlanetId,
        setSelectedPlanetId,
        comparePlanets,
        setComparePlanets,
        addComparePlanet,
        removeComparePlanet,
        progress,
        exploredCount,
        missions,
        markPlanetExplored,
        completeQuiz,
        recordArPlacement,
        recordCompareUsed,
        claimMissionReward,
        addStudentNote,
        deleteStudentNote,
        resetProgress,
        soundEnabled,
        toggleSound,
        classroomCode,
        generateNewClassroomCode,
        teacherSlideIndex,
        setTeacherSlideIndex,
        isLaserPointerActive,
        setIsLaserPointerActive,
        simulatedStudents,
      }}
    >
      {children}
    </ClassroomContext.Provider>
  );
}

export function useClassroom() {
  const context = useContext(ClassroomContext);
  if (!context) {
    throw new Error('useClassroom must be used within a ClassroomProvider');
  }
  return context;
}

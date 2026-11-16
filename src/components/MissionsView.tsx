import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useClassroom } from '../context/ClassroomContext';
import { soundEffects } from '../utils/soundEffects';
import { PageShell, SegmentedTabs } from './ui/ObservatoryPrimitives';
import { SpaceVoxelSandbox, VoxelBlockItem } from './SpaceVoxelSandbox';
import {
  Award,
  CheckCircle2,
  Lock,
  ArrowRight,
  Sparkles,
  Trophy,
  Compass,
  Hammer,
  FlaskConical,
  Users,
  Orbit,
  Camera,
  Scale,
  HelpCircle,
  Radio,
  Trash2,
  Wand2,
  Blocks,
} from 'lucide-react';

type MissionHubTab = 'explore' | 'build' | 'learn' | 'connect';

type CraftElementId =
  | 'ice'
  | 'silicon'
  | 'hydrogen'
  | 'co2'
  | 'soil'
  | 'iron'
  | 'glass'
  | 'gold'
  | 'copper';

interface CraftElementSpec {
  id: CraftElementId;
  name: string;
  formula: string;
  colorClass: string;
}

const CRAFT_ELEMENTS: Record<CraftElementId, CraftElementSpec> = {
  ice: { id: 'ice', name: 'Water Ice', formula: 'H2O', colorClass: 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200' },
  silicon: { id: 'silicon', name: 'Silicon Wafer', formula: 'Si', colorClass: 'bg-sky-500/20 border-sky-400/50 text-sky-200' },
  hydrogen: { id: 'hydrogen', name: 'Liquid H2', formula: 'H2', colorClass: 'bg-indigo-500/20 border-indigo-400/50 text-indigo-200' },
  co2: { id: 'co2', name: 'Captured CO2', formula: 'CO2', colorClass: 'bg-slate-600/25 border-slate-400/50 text-slate-200' },
  soil: { id: 'soil', name: 'Martian Soil', formula: 'Fe2O3', colorClass: 'bg-orange-500/20 border-orange-400/50 text-orange-200' },
  iron: { id: 'iron', name: 'Regolith Iron', formula: 'Fe', colorClass: 'bg-zinc-500/25 border-zinc-400/50 text-zinc-200' },
  glass: { id: 'glass', name: 'Optic Glass', formula: 'SiO2', colorClass: 'bg-teal-500/20 border-teal-400/50 text-teal-200' },
  gold: { id: 'gold', name: 'Kapton Gold', formula: 'Au', colorClass: 'bg-amber-500/20 border-amber-400/50 text-amber-200' },
  copper: { id: 'copper', name: 'Copper Coil', formula: 'Cu', colorClass: 'bg-rose-500/20 border-rose-400/50 text-rose-200' },
};

interface SpaceCraftRecipe {
  id: string;
  name: string;
  xp: number;
  category: string;
  scienceFact: string;
  grid: (CraftElementId | null)[]; // 9 slots for blueprint auto-fill & display
  requiredCounts: Partial<Record<CraftElementId, number>>;
}

const SPACE_CRAFT_RECIPES: SpaceCraftRecipe[] = [
  {
    id: 'craft-solar-array',
    name: 'Photovoltaic Solar Array',
    xp: 35,
    category: 'Power Systems',
    scienceFact:
      'Silicon wafers convert solar photons into DC electricity, while optic glass shields cells against micrometeoroids.',
    grid: ['glass', 'silicon', 'glass', 'copper', 'silicon', 'copper', null, 'iron', null],
    requiredCounts: { glass: 2, silicon: 2, copper: 2, iron: 1 },
  },
  {
    id: 'craft-o2-electrolysis',
    name: 'Electrolysis O2 Generator',
    xp: 35,
    category: 'Life Support',
    scienceFact:
      'Used aboard the ISS: electrical current splits harvested lunar H2O ice into breathable oxygen and rocket-grade hydrogen.',
    grid: [null, 'ice', null, 'copper', 'ice', 'copper', 'iron', 'hydrogen', 'iron'],
    requiredCounts: { ice: 2, copper: 2, iron: 2, hydrogen: 1 },
  },
  {
    id: 'craft-bio-dome',
    name: 'Martian Bio-Greenhouse',
    xp: 40,
    category: 'Astrobiology',
    scienceFact:
      'Combines CO2-rich Martian atmosphere with purified regolith water ice inside pressurized glass domes to grow crops.',
    grid: ['glass', 'glass', 'glass', 'co2', 'soil', 'ice', 'iron', 'copper', 'iron'],
    requiredCounts: { glass: 3, co2: 1, soil: 1, ice: 1, iron: 2, copper: 1 },
  },
  {
    id: 'craft-jwst-mirror',
    name: 'JWST Gold-Coated Mirror',
    xp: 45,
    category: 'Space Optics',
    scienceFact:
      'Microscopic vapor-deposited gold reflects 98% of deep-infrared light from the earliest galaxies 13+ billion years ago.',
    grid: ['gold', 'gold', 'gold', 'copper', 'glass', 'copper', 'iron', 'silicon', 'iron'],
    requiredCounts: { gold: 3, copper: 2, glass: 1, iron: 2, silicon: 1 },
  },
  {
    id: 'craft-ion-drive',
    name: 'Hall-Effect Ion Thruster',
    xp: 40,
    category: 'Propulsion',
    scienceFact:
      'Magnetic copper coils accelerate ionized propellant up to 40 km/s, letting spacecraft cruise across interplanetary space efficiently.',
    grid: ['iron', 'copper', 'iron', 'copper', 'hydrogen', 'copper', 'silicon', 'gold', 'silicon'],
    requiredCounts: { iron: 2, copper: 3, hydrogen: 1, silicon: 2, gold: 1 },
  },
  {
    id: 'craft-deep-dish',
    name: 'Deep-Space Telemetry Dish',
    xp: 35,
    category: 'Communications',
    scienceFact:
      'High-gain parabolic reflectors focus faint radio carrier waves back to Earth from beyond Neptune and Pluto.',
    grid: ['iron', 'copper', 'iron', 'gold', 'silicon', 'gold', null, 'copper', null],
    requiredCounts: { iron: 2, copper: 2, gold: 2, silicon: 1 },
  },
];

const PEER_BLUEPRINTS: Record<string, { label: string; biomeHint: string; blocks: VoxelBlockItem[] }> = {
  'st-1': {
    label: 'Maya Venus Relay Array',
    biomeHint: 'Orbital Comms Node',
    blocks: [
      { x: 0, y: 0, z: 0, type: 'habitat' },
      { x: 1, y: 0, z: 0, type: 'solar' },
      { x: -1, y: 0, z: 0, type: 'solar' },
      { x: 0, y: 1, z: 0, type: 'dish' },
      { x: 0, y: 0, z: 1, type: 'dome' },
    ],
  },
  'st-2': {
    label: 'Alex Saturn Ion Station',
    biomeHint: 'Zero-G Propulsion Rig',
    blocks: [
      { x: 0, y: 0, z: 0, type: 'habitat' },
      { x: 0, y: 1, z: 0, type: 'habitat' },
      { x: -1, y: 0, z: 0, type: 'thruster' },
      { x: 1, y: 0, z: 0, type: 'thruster' },
      { x: 0, y: 0, z: 1, type: 'solar' },
      { x: 0, y: 2, z: 0, type: 'dish' },
    ],
  },
  'st-3': {
    label: 'Sophia Olympus Greenhouse',
    biomeHint: 'Mars O2 Closed Loop',
    blocks: [
      { x: 0, y: 0, z: 0, type: 'dome' },
      { x: 1, y: 0, z: 0, type: 'oxygen' },
      { x: 2, y: 0, z: 0, type: 'ice' },
      { x: -1, y: 0, z: 0, type: 'habitat' },
      { x: -1, y: 0, z: 1, type: 'solar' },
      { x: 0, y: 0, z: 1, type: 'regolith' },
    ],
  },
  'st-4': {
    label: 'Noah Shackleton Ice Lab',
    biomeHint: 'Lunar Crater Extraction',
    blocks: [
      { x: 0, y: 0, z: 0, type: 'regolith' },
      { x: 1, y: 0, z: 0, type: 'ice' },
      { x: 1, y: 1, z: 0, type: 'oxygen' },
      { x: 0, y: 1, z: 0, type: 'habitat' },
      { x: 0, y: 2, z: 0, type: 'solar' },
    ],
  },
  'st-5': {
    label: 'Liam Titan Cryo Outpost',
    biomeHint: 'Deep Outer Rim Dome',
    blocks: [
      { x: 0, y: 0, z: 0, type: 'dome' },
      { x: 0, y: 0, z: -1, type: 'habitat' },
      { x: 1, y: 0, z: -1, type: 'dish' },
      { x: -1, y: 0, z: -1, type: 'thruster' },
      { x: 0, y: 1, z: -1, type: 'solar' },
    ],
  },
};

const SYNERGY_STORAGE_KEY = 'ar_smart_classroom_synergies_v1';
const CRAFTED_TECH_STORAGE_KEY = 'ar_smart_classroom_crafted_tech_v1';

export const MissionsView: React.FC = () => {
  const {
    missions,
    exploredCount,
    progress,
    claimMissionReward,
    grantBonusXp,
    setCurrentView,
    setSelectedPlanetId,
    classroomCode,
    simulatedStudents,
  } = useClassroom();

  const [hubTab, setHubTab] = useState<MissionHubTab>('explore');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all');
  const [unlockedSynergies, setUnlockedSynergies] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(SYNERGY_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [sandboxImportBlocks, setSandboxImportBlocks] = useState<VoxelBlockItem[] | undefined>(undefined);
  const [rewardToast, setRewardToast] = useState<string | null>(null);

  // 3x3 Space Crafting Table State
  const [selectedElement, setSelectedElement] = useState<CraftElementId>('glass');
  const [craftGrid, setCraftGrid] = useState<(CraftElementId | null)[]>(Array(9).fill(null));
  const [craftedRecipes, setCraftedRecipes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(CRAFTED_TECH_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [crewPulseSent, setCrewPulseSent] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(SYNERGY_STORAGE_KEY, JSON.stringify(unlockedSynergies));
    } catch {}
  }, [unlockedSynergies]);

  useEffect(() => {
    try {
      localStorage.setItem(CRAFTED_TECH_STORAGE_KEY, JSON.stringify(craftedRecipes));
    } catch {}
  }, [craftedRecipes]);

  const showToast = (msg: string) => {
    setRewardToast(msg);
    setTimeout(() => {
      setRewardToast(prev => (prev === msg ? null : prev));
    }, 3200);
  };

  const handleUnlockSynergy = (synergyKey: string, title: string, xp: number, badge?: string) => {
    if (unlockedSynergies.includes(synergyKey)) return;
    setUnlockedSynergies(prev => (prev.includes(synergyKey) ? prev : [...prev, synergyKey]));
    grantBonusXp(xp, badge);
    soundEffects.playCraftSuccess();
    showToast(`Colony Synergy Active: ${title} (+${xp} XP${badge ? ` · ${badge}` : ''})`);
  };

  const handleLaunchTask = (missionId: string) => {
    soundEffects.playClick();
    if (missionId === 'mission-explore-4' || missionId === 'mission-explore-all') {
      setCurrentView('solarSystem');
    } else if (missionId === 'mission-venus-heat') {
      setSelectedPlanetId('venus');
      setCurrentView('explorer');
    } else if (missionId === 'mission-saturn-rings') {
      setSelectedPlanetId('saturn');
      setCurrentView('explorer');
    } else if (missionId === 'mission-compare-giants') {
      setCurrentView('compare');
    } else if (missionId === 'mission-ar-placement') {
      setCurrentView('cameraAR');
    } else if (missionId === 'mission-quiz-master') {
      setCurrentView('quiz');
    }
  };

  // Match 3x3 crafting table contents against known space tech recipes (order-independent ingredient bag match)
  const matchedRecipe = SPACE_CRAFT_RECIPES.find(recipe => {
    const gridCounts: Partial<Record<CraftElementId, number>> = {};
    craftGrid.forEach(item => {
      if (item) gridCounts[item] = (gridCounts[item] || 0) + 1;
    });
    const requiredKeys = Object.keys(recipe.requiredCounts) as CraftElementId[];
    const gridKeys = Object.keys(gridCounts) as CraftElementId[];
    if (requiredKeys.length !== gridKeys.length) return false;
    return requiredKeys.every(k => gridCounts[k] === recipe.requiredCounts[k]);
  });

  const handleCraftTableSubmit = () => {
    if (!matchedRecipe) return;
    soundEffects.playCraftSuccess();
    const isFirstTime = !craftedRecipes.includes(matchedRecipe.id);
    if (isFirstTime) {
      const nextCrafted = [...craftedRecipes, matchedRecipe.id];
      setCraftedRecipes(nextCrafted);
      const badge = nextCrafted.length >= SPACE_CRAFT_RECIPES.length ? 'Space Master Crafter' : undefined;
      grantBonusXp(matchedRecipe.xp, badge);
      showToast(`Crafted ${matchedRecipe.name}! (+${matchedRecipe.xp} XP${badge ? ` · ${badge}` : ''})`);
    } else {
      showToast(`Assembled ${matchedRecipe.name} — engineering blueprint verified!`);
    }
    setCraftGrid(Array(9).fill(null));
  };

  const handleLoadPeerBuild = (studentId: string, studentName: string) => {
    const bp = PEER_BLUEPRINTS[studentId];
    if (!bp) return;
    soundEffects.playCraftSuccess();
    setSandboxImportBlocks([...bp.blocks]);
    setHubTab('build');
    showToast(`Loaded ${studentName}'s ${bp.label} into your 3D Sandbox`);
  };

  const completedCount = missions.filter(m => m.isCompleted).length;
  const filteredMissions = missions.filter(m => {
    if (filterStatus === 'active') return !m.isCompleted;
    if (filterStatus === 'completed') return m.isCompleted;
    return true;
  });

  const xpRatio = Math.min((progress.xp / 1500) * 100, 100);
  const dynamicBadges = [
    ...missions.map(m => m.badge.name),
    'Colony Architect',
    'Space Master Crafter',
  ];

  return (
    <PageShell maxWidth="7xl">
      {/* Header Banner */}
      <section className="glass-panel-elevated rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-emerald-300">
            <Blocks className="w-3.5 h-3.5 text-emerald-400" />
            <span>Mission Hub · Explore · Build · Learn · Connect</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white flex items-center gap-2.5">
            <Award className="w-6 h-6 text-emerald-400 flex-shrink-0" />
            <span>Galactic Colony & Learning Missions</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Explore real worlds, build interlocking 3D voxel colonies with power and O2 conduits, craft orbital hardware on the 3×3 engineering table, and share blueprints with your class crew.
          </p>
        </div>

        {/* Hairline Telemetry Readout */}
        <div className="grid grid-cols-3 gap-5 sm:divide-x sm:divide-slate-800/80 w-full lg:w-auto pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-800/80 tabular-nums">
          <div className="sm:pr-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Worlds</div>
            <div className="font-display text-xl font-bold text-sky-300 mt-0.5">{exploredCount}/8</div>
          </div>
          <div className="sm:px-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Quests</div>
            <div className="font-display text-xl font-bold text-emerald-300 mt-0.5">
              {completedCount}/{missions.length}
            </div>
          </div>
          <div className="sm:pl-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Total XP</div>
            <div className="font-display text-xl font-bold text-amber-300 mt-0.5">{progress.xp}</div>
          </div>
        </div>
      </section>

      {/* Reward / Craft Notification Banner */}
      <AnimatePresence>
        {rewardToast && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl bg-emerald-500/15 border border-emerald-400/50 px-4 py-3 flex items-center justify-between gap-3 text-xs text-emerald-100"
          >
            <div className="flex items-center gap-2 font-semibold">
              <Sparkles className="w-4 h-4 text-amber-300 flex-shrink-0" />
              <span>{rewardToast}</span>
            </div>
            <button
              onClick={() => setRewardToast(null)}
              className="text-emerald-300 hover:text-white text-[11px] font-mono"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rank Ladder + 4-Mode Hub Navigation */}
      <section className="glass-panel rounded-2xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span className="font-display font-bold text-white text-sm">{progress.title}</span>
                <span className="font-mono text-slate-400 tabular-nums">· Level {progress.level}</span>
              </div>
              <span className="font-mono font-semibold text-amber-300 tabular-nums">{progress.xp} / 1500 XP</span>
            </div>

            <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800/70">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${xpRatio}%` }}
                transition={{ type: 'spring', stiffness: 120, damping: 22 }}
                className="h-full bg-gradient-to-r from-amber-500 via-orange-400 to-sky-400"
              />
            </div>

            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>Cadet · 0</span>
              <span>Explorer · 300</span>
              <span className="hidden sm:inline">Specialist · 600</span>
              <span className="hidden sm:inline">Commander · 1000</span>
              <span>Master · 1500</span>
            </div>
          </div>

          <SegmentedTabs<MissionHubTab>
            layoutId="missions-hub-tabs"
            value={hubTab}
            onChange={val => {
              soundEffects.playClick();
              setHubTab(val);
            }}
            items={[
              { id: 'explore', label: 'Explore Quests', icon: <Compass className="w-3.5 h-3.5" /> },
              { id: 'build', label: 'Build Colony', icon: <Hammer className="w-3.5 h-3.5" /> },
              { id: 'learn', label: 'Learn & Craft', icon: <FlaskConical className="w-3.5 h-3.5" /> },
              { id: 'connect', label: 'Connect Crew', icon: <Users className="w-3.5 h-3.5" /> },
            ]}
          />
        </div>
      </section>

      {/* TAB 1: EXPLORE QUESTS */}
      {hubTab === 'explore' && (
        <div className="space-y-6">
          {/* Quick Biome Portal Jumps */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: '3D Solar System', sub: 'Orbital Sandbox & VR', view: 'solarSystem' as const, icon: <Orbit className="w-4 h-4 text-sky-400" /> },
              { label: 'Live Camera AR', sub: 'AR Physics Experiments', view: 'cameraAR' as const, icon: <Camera className="w-4 h-4 text-rose-400" /> },
              { label: 'Scale Comparator', sub: 'Compare World Sizes', view: 'compare' as const, icon: <Scale className="w-4 h-4 text-indigo-400" /> },
              { label: '5-Question Quiz', sub: 'Earn +250 Mastery XP', view: 'quiz' as const, icon: <HelpCircle className="w-4 h-4 text-amber-400" /> },
            ].map(portal => (
              <button
                key={portal.view}
                onClick={() => {
                  soundEffects.playClick();
                  setCurrentView(portal.view);
                }}
                className="glass-panel rounded-2xl p-3.5 text-left hover:border-sky-400/50 transition-colors flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    {portal.icon}
                    <span className="truncate">{portal.label}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate mt-0.5">{portal.sub}</div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              </button>
            ))}
          </div>

          {/* Missions Header & Animated Filter Tabs */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-baseline gap-3">
                <h2 className="font-display text-lg font-bold text-white">Curriculum Quests</h2>
                <span className="text-xs font-mono text-slate-400 tabular-nums">
                  {completedCount} of {missions.length} done
                </span>
              </div>

              <SegmentedTabs
                layoutId="missions-filter-tabs"
                value={filterStatus}
                onChange={val => {
                  soundEffects.playClick();
                  setFilterStatus(val);
                }}
                compact
                items={[
                  { id: 'all', label: `All (${missions.length})` },
                  { id: 'active', label: `Active (${missions.length - completedCount})` },
                  { id: 'completed', label: `Done (${completedCount})` },
                ]}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMissions.map(mission => {
                const isFinished = mission.isCompleted;
                const canClaim = !isFinished && mission.progress >= mission.requirementCount;
                const pct = Math.min((mission.progress / mission.requirementCount) * 100, 100);

                return (
                  <motion.div
                    layout
                    key={mission.id}
                    className={`glass-panel p-5 rounded-2xl flex flex-col justify-between gap-4 transition-colors ${
                      isFinished ? 'border-emerald-500/35 bg-emerald-950/10' : 'hover:border-sky-400/40'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="uppercase tracking-wider text-slate-400">{mission.category}</span>
                        <span className="font-semibold text-amber-300 flex items-center gap-1 tabular-nums">
                          <Sparkles className="w-3 h-3 text-amber-400" />
                          +{mission.xpReward} XP
                        </span>
                      </div>

                      <h3 className="font-display text-base font-bold text-white flex items-start gap-2 leading-snug">
                        {isFinished ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        ) : (
                          <span className="w-4 h-4 rounded-full border border-slate-600 flex-shrink-0 mt-0.5" />
                        )}
                        <span>{mission.title}</span>
                      </h3>

                      <p className="text-xs text-slate-400 leading-relaxed">{mission.description}</p>

                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between text-[11px] font-mono text-slate-400">
                          <span>Progress</span>
                          <span className="text-slate-200 font-semibold tabular-nums">
                            {mission.progress} / {mission.requirementCount}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              isFinished ? 'bg-emerald-400' : 'bg-sky-400'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      <div className="text-[11px] font-medium text-slate-300 flex items-center gap-1.5 truncate">
                        <Award className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                        <span className="truncate">{mission.badge.name}</span>
                      </div>

                      {isFinished ? (
                        <span className="text-xs font-mono font-semibold text-emerald-400 flex-shrink-0">
                          Claimed
                        </span>
                      ) : canClaim ? (
                        <button
                          onClick={() => claimMissionReward(mission.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/25 flex-shrink-0 transition-colors"
                        >
                          Claim Reward
                        </button>
                      ) : (
                        <button
                          onClick={() => handleLaunchTask(mission.id)}
                          className="flex items-center gap-1 text-xs font-semibold text-sky-400 hover:text-sky-300 flex-shrink-0"
                        >
                          <span>Launch</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>

          {/* Badges Showcase Locker */}
          <section className="glass-panel rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Field & Engineering Badges</span>
              </h2>
              <span className="text-xs font-mono text-slate-400 tabular-nums">
                {dynamicBadges.filter(name => progress.badges.includes(name)).length} / {dynamicBadges.length} Unlocked
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-3">
              {dynamicBadges.map(badgeName => {
                const isUnlocked = progress.badges.includes(badgeName);
                return (
                  <div
                    key={badgeName}
                    className={`p-3 rounded-xl border text-center flex flex-col items-center justify-between gap-2 transition-all ${
                      isUnlocked
                        ? 'bg-slate-950/85 border-amber-400/40 text-amber-200'
                        : 'bg-slate-950/35 border-slate-800/70 text-slate-500 opacity-65'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center ${
                        isUnlocked ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-900 text-slate-600'
                      }`}
                    >
                      {isUnlocked ? <Award className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    </div>
                    <div className="text-[11px] font-semibold leading-tight">{badgeName}</div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* TAB 2: BUILD 3D SPACE COLONY */}
      {hubTab === 'build' && (
        <section className="glass-panel rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
                <Hammer className="w-5 h-5 text-emerald-400" />
                <span>3D Space Colony Voxel Builder</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Stack habitats, solar arrays, water ice, O2 extractors, bio-domes, radio relays, and ion thrusters in 3D biomes. Connect adjacent modules to light up live conduits and earn XP.
              </p>
            </div>
            <span className="text-xs font-mono text-emerald-300 tabular-nums">
              {unlockedSynergies.length}/4 Synergies Discovered
            </span>
          </div>

          <SpaceVoxelSandbox
            initialBlocks={sandboxImportBlocks}
            onUnlockSynergy={handleUnlockSynergy}
          />
        </section>
      )}

      {/* TAB 3: LEARN & CRAFT (3x3 MINECRAFT-STYLE SPACE CRAFTING TABLE) */}
      {hubTab === 'learn' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: 3x3 Interactive Crafting Grid & Ingredient Palette */}
          <div className="lg:col-span-7 glass-panel rounded-3xl p-5 sm:p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
                  <FlaskConical className="w-5 h-5 text-sky-400" />
                  <span>3×3 Aerospace Engineering Crafting Table</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select an element below, click table slots to place it (click again to clear), and synthesize spacecraft hardware.
                </p>
              </div>
              <button
                onClick={() => {
                  soundEffects.playClick();
                  setCraftGrid(Array(9).fill(null));
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Grid</span>
              </button>
            </div>

            {/* Element Palette */}
            <div className="space-y-2">
              <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                1. Raw Space Elements Inventory
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {(Object.keys(CRAFT_ELEMENTS) as CraftElementId[]).map(elKey => {
                  const el = CRAFT_ELEMENTS[elKey];
                  const active = selectedElement === elKey;
                  return (
                    <button
                      key={el.id}
                      onClick={() => {
                        soundEffects.playClick();
                        setSelectedElement(el.id);
                      }}
                      className={`p-2 rounded-xl border text-left transition-all ${
                        active
                          ? 'bg-sky-500/25 border-sky-400 text-white shadow-md'
                          : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <div className="text-[10px] font-mono opacity-80">{el.formula}</div>
                      <div className="text-xs font-bold truncate">{el.name}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3x3 Grid -> Craft Output Arrow */}
            <div className="flex flex-col sm:flex-row items-center gap-6 bg-slate-950/75 border border-slate-800 rounded-2xl p-5">
              <div className="grid grid-cols-3 gap-2.5 flex-shrink-0">
                {craftGrid.map((cell, idx) => {
                  const el = cell ? CRAFT_ELEMENTS[cell] : null;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        soundEffects.playBlockPlace();
                        setCraftGrid(prev => {
                          const next = [...prev];
                          next[idx] = prev[idx] === selectedElement ? null : selectedElement;
                          return next;
                        });
                      }}
                      className={`w-20 h-20 rounded-xl border-2 flex flex-col items-center justify-center p-1.5 transition-all ${
                        el
                          ? `${el.colorClass} font-bold`
                          : 'bg-slate-900/90 border-slate-700/80 border-dashed text-slate-500 hover:border-sky-500/50'
                      }`}
                    >
                      {el ? (
                        <>
                          <span className="text-[10px] font-mono opacity-85">{el.formula}</span>
                          <span className="text-[11px] leading-tight text-center mt-0.5">{el.name}</span>
                        </>
                      ) : (
                        <span className="text-[10px] font-mono">Slot {idx + 1}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col items-center sm:items-start gap-3 flex-1 w-full">
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  Synthesis Output
                </div>

                {matchedRecipe ? (
                  <div className="w-full rounded-2xl bg-emerald-500/15 border border-emerald-400/50 p-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono text-emerald-300 uppercase">
                        {matchedRecipe.category}
                      </span>
                      <span className="text-xs font-mono font-bold text-amber-300 tabular-nums">
                        +{matchedRecipe.xp} XP
                      </span>
                    </div>
                    <div className="font-display text-base font-bold text-white">
                      {matchedRecipe.name}
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed">
                      {matchedRecipe.scienceFact}
                    </p>
                    <button
                      onClick={handleCraftTableSubmit}
                      className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>
                        {craftedRecipes.includes(matchedRecipe.id) ? 'Assemble Hardware' : `Craft & Claim +${matchedRecipe.xp} XP`}
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="w-full rounded-2xl bg-slate-900/80 border border-slate-800 p-4 text-xs text-slate-400 space-y-1.5">
                    <div className="font-semibold text-slate-200">No matching engineering blueprint yet</div>
                    <p>
                      Combine raw elements in the 3×3 workbench, or click <strong className="text-sky-300">Auto-Fill Pattern</strong> on any blueprint card on the right to inspect the science behind it.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Recipe Guide & Unlocked Space Hardware */}
          <div className="lg:col-span-5 glass-panel rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-white">
                Space Engineering Blueprints
              </h3>
              <span className="text-xs font-mono text-emerald-300 tabular-nums">
                {craftedRecipes.length}/{SPACE_CRAFT_RECIPES.length} Crafted
              </span>
            </div>

            <div className="space-y-2.5 max-h-[470px] overflow-y-auto pr-1">
              {SPACE_CRAFT_RECIPES.map(recipe => {
                const isCrafted = craftedRecipes.includes(recipe.id);
                return (
                  <div
                    key={recipe.id}
                    className={`rounded-2xl border p-3.5 space-y-2 ${
                      isCrafted
                        ? 'bg-emerald-950/20 border-emerald-500/40'
                        : 'bg-slate-950/70 border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-wider text-sky-300">
                          {recipe.category} · +{recipe.xp} XP
                        </div>
                        <div className="text-sm font-bold text-white flex items-center gap-1.5">
                          {isCrafted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
                          <span>{recipe.name}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          soundEffects.playClick();
                          setCraftGrid([...recipe.grid]);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-semibold text-sky-300 whitespace-nowrap"
                      >
                        <Wand2 className="w-3 h-3" />
                        <span>Auto-Fill</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
                      {(Object.entries(recipe.requiredCounts) as [CraftElementId, number][]).map(([elId, count]) => (
                        <span
                          key={elId}
                          className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300"
                        >
                          {count}× {CRAFT_ELEMENTS[elId].name}
                        </span>
                      ))}
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">{recipe.scienceFact}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CONNECT CREW (SHARED COLONIES & CLASSROOM PULSE) */}
      {hubTab === 'connect' && (
        <div className="space-y-6">
          <section className="glass-panel rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-[11px] font-mono uppercase tracking-wider text-sky-300">
                Active Classroom Session · {classroomCode}
              </div>
              <h2 className="font-display text-lg font-bold text-white">
                Collaborate & Inspect Classmate Colony Blueprints
              </h2>
              <p className="text-xs text-slate-400">
                Load any crew member's voxel outpost straight into your 3D Space Colony Sandbox to test power grids and life-support links, or broadcast your mission pulse.
              </p>
            </div>

            <button
              onClick={() => {
                soundEffects.playGpsLock();
                setCrewPulseSent(true);
                showToast(`Telemetry Pulse Broadcasted to Classroom ${classroomCode}`);
                setTimeout(() => setCrewPulseSent(false), 3000);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-colors ${
                crewPulseSent
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-lg shadow-sky-500/20'
              }`}
            >
              <Radio className="w-4 h-4" />
              <span>{crewPulseSent ? 'Crew Pulse Active' : 'Send Crew Telemetry Pulse'}</span>
            </button>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {simulatedStudents.map(student => {
              const bp = PEER_BLUEPRINTS[student.id];
              return (
                <div
                  key={student.id}
                  className="glass-panel rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-sky-400/40 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{student.avatar}</span>
                        <div>
                          <div className="font-bold text-white text-sm">{student.name}</div>
                          <div className="text-[11px] text-slate-400">
                            Stationed at {student.currentPlanet}
                          </div>
                        </div>
                      </div>
                      <span className="font-mono text-xs font-bold text-amber-300 tabular-nums">
                        {student.xp} XP
                      </span>
                    </div>

                    {bp && (
                      <div className="bg-slate-950/75 border border-slate-800 rounded-xl p-3 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-sky-300">{bp.label}</span>
                          <span className="font-mono text-slate-400 tabular-nums">
                            {bp.blocks.length} blocks
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">{bp.biomeHint}</div>
                      </div>
                    )}
                  </div>

                  {bp && (
                    <button
                      onClick={() => handleLoadPeerBuild(student.id, student.name)}
                      className="w-full py-2 px-3 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Hammer className="w-3.5 h-3.5" />
                      <span>Load Peer Build into 3D Sandbox</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </PageShell>
  );
};

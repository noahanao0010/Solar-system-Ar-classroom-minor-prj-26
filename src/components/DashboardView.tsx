import React from 'react';
import {
  Orbit,
  Compass,
  Camera,
  Scale,
  Award,
  HelpCircle,
  GraduationCap,
  ArrowRight,
  CheckCircle2,
  Trophy,
  Rocket,
  Palette,
} from 'lucide-react';
import { useClassroom, AppView } from '../context/ClassroomContext';
import { PLANETS_DATA, ORDERED_PLANETS } from '../data/planetsData';
import { PlanetId } from '../types/astronomy';
import { soundEffects } from '../utils/soundEffects';
import { COLOR_GRADE_PRESETS, ColorGradePresetId } from '../utils/coreAssetsEngine';

export const DashboardView: React.FC = () => {
  const {
    setCurrentView,
    setSelectedPlanetId,
    progress,
    exploredCount,
    missions,
    classroomCode,
    colorGradePreset,
    setColorGradePreset,
  } = useClassroom();

  const handleNavigate = (view: AppView, planetId?: PlanetId) => {
    soundEffects.playClick();
    if (planetId) {
      setSelectedPlanetId(planetId);
    }
    setCurrentView(view);
  };

  const completedMissionsCount = missions.filter(m => m.isCompleted).length;

  return (
    <div className="min-h-full pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 pt-6">
      {/* Editorial Aerospace Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl glass-panel-elevated p-6 sm:p-10">
        {/* Subtle Atmospheric Radial Glows */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 left-1/4 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Editorial Column */}
          <div className="lg:col-span-7 space-y-5">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-sky-300">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <span>Interactive Astronomy · 3D & Spatial AR</span>
            </div>

            <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.08]">
              Explore the Cosmos in{' '}
              <span className="bg-gradient-to-r from-sky-300 via-indigo-200 to-amber-200 bg-clip-text text-transparent">
                3D & Augmented Reality
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
              Step inside our virtual observatory. Navigate live orbital mechanics, dissect planetary interiors, anchor worlds into your classroom with Camera AR, and master cosmic scale.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={() => handleNavigate('solarSystem')}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm shadow-lg shadow-sky-500/25 transition-all hover:-translate-y-0.5"
              >
                <Orbit className="w-4 h-4" />
                <span>Launch 3D Space</span>
              </button>

              <button
                onClick={() => handleNavigate('cameraAR')}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-semibold text-sm shadow-lg shadow-pink-600/25 transition-all hover:-translate-y-0.5"
              >
                <Camera className="w-4 h-4" />
                <span>Enter Camera AR</span>
              </button>

              <button
                onClick={() => handleNavigate('quiz')}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 font-semibold text-sm border border-slate-700/80 transition-all"
              >
                <HelpCircle className="w-4 h-4 text-amber-300" />
                <span>5-Question Quiz</span>
              </button>
            </div>
          </div>

          {/* Right Visual Graphic Motif: Animated Vector Orbital Telemetry Diagram */}
          <div className="hidden lg:flex lg:col-span-5 items-center justify-center relative">
            <div className="relative w-72 h-72 flex items-center justify-center">
              <svg viewBox="0 0 280 280" className="w-full h-full overflow-visible" aria-hidden="true">
                <defs>
                  <radialGradient id="sunCoreGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#fef08a" />
                    <stop offset="45%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                  </radialGradient>
                </defs>

                {/* Calibration Crosshairs */}
                <line x1="140" y1="8" x2="140" y2="272" stroke="rgba(148,163,184,0.12)" strokeDasharray="3 4" />
                <line x1="8" y1="140" x2="272" y2="140" stroke="rgba(148,163,184,0.12)" strokeDasharray="3 4" />

                {/* Outer Orbit Ring */}
                <g className="origin-center animate-orbit-slow" style={{ transformOrigin: '140px 140px' }}>
                  <circle cx="140" cy="140" r="120" fill="none" stroke="rgba(56,189,248,0.22)" strokeWidth="1" strokeDasharray="4 6" />
                  <circle cx="260" cy="140" r="6" fill="#38bdf8" />
                  <circle cx="260" cy="140" r="11" fill="none" stroke="rgba(56,189,248,0.4)" />
                </g>

                {/* Middle Orbit Ring */}
                <g className="origin-center animate-orbit-reverse" style={{ transformOrigin: '140px 140px' }}>
                  <circle cx="140" cy="140" r="84" fill="none" stroke="rgba(129,140,248,0.28)" strokeWidth="1" />
                  <circle cx="80" cy="81" r="5" fill="#f97316" />
                  <circle cx="200" cy="199" r="3.5" fill="#a5b4fc" />
                </g>

                {/* Inner Orbit Ring */}
                <g className="origin-center animate-orbit-slow" style={{ transformOrigin: '140px 140px', animationDuration: '14s' }}>
                  <circle cx="140" cy="140" r="48" fill="none" stroke="rgba(251,191,36,0.3)" strokeWidth="1" />
                  <circle cx="140" cy="92" r="3.5" fill="#fde68a" />
                </g>

                {/* Solar Core */}
                <circle cx="140" cy="140" r="30" fill="url(#sunCoreGrad)" />
                <circle cx="140" cy="140" r="13" fill="#fde047" />
              </svg>

              {/* Corner Telemetry Coordinates */}
              <div className="absolute top-1 right-2 text-[10px] font-mono text-slate-400">
                RA 18h 36m · +38°
              </div>
              <div className="absolute bottom-1 left-2 text-[10px] font-mono text-sky-400/90">
                LUT: {COLOR_GRADE_PRESETS[colorGradePreset].label}
              </div>
            </div>
          </div>
        </div>

        {/* Hairline-Divided Telemetry Strip (Single Surface Architecture) */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-6 sm:divide-x sm:divide-slate-800/80">
          <div className="sm:pr-4">
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Cadet Rank</div>
            <div className="font-display text-base sm:text-lg font-bold text-amber-300 flex items-center gap-1.5 mt-1">
              <Trophy className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span className="truncate">{progress.title}</span>
            </div>
            <div className="text-xs font-mono text-slate-400 mt-1">
              Lvl {progress.level} · {progress.xp} XP
            </div>
          </div>

          <div className="sm:px-4">
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Worlds Explored</div>
            <div className="font-display text-base sm:text-lg font-bold text-sky-300 flex items-center gap-1.5 mt-1">
              <Compass className="w-4 h-4 text-sky-400 flex-shrink-0" />
              <span>{exploredCount} / 8</span>
            </div>
            <div className="text-xs font-mono text-slate-400 mt-1">
              {Math.round((exploredCount / 8) * 100)}% charted
            </div>
          </div>

          <div className="sm:px-4">
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Missions Finished</div>
            <div className="font-display text-base sm:text-lg font-bold text-emerald-300 flex items-center gap-1.5 mt-1">
              <Award className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{completedMissionsCount} / 7</span>
            </div>
            <div className="text-xs font-mono text-slate-400 mt-1">
              Curriculum badges
            </div>
          </div>

          <div className="sm:pl-4">
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Quiz Best Score</div>
            <div className="font-display text-base sm:text-lg font-bold text-indigo-300 flex items-center gap-1.5 mt-1">
              <HelpCircle className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <span>{progress.quizBestScore} / 5</span>
            </div>
            <div className="text-xs font-mono text-slate-400 mt-1">
              {progress.quizAttempts > 0 ? `${progress.quizAttempts} attempts` : 'Ready to start'}
            </div>
          </div>
        </div>
      </section>

      {/* Main Core Modules Grid */}
      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
          <div className="flex items-baseline gap-3">
            <h2 className="font-display text-xl font-bold text-white">Core Learning Modules</h2>
            <span className="text-xs text-slate-400">Select an observatory module to launch</span>
          </div>

          {/* Global Color Grading Switcher */}
          <div className="flex items-center gap-2 text-xs">
            <Palette className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-slate-400 hidden sm:inline">Visual Grade:</span>
            <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-lg p-0.5">
              {(Object.keys(COLOR_GRADE_PRESETS) as ColorGradePresetId[]).map(key => (
                <button
                  key={key}
                  onClick={() => {
                    soundEffects.playClick();
                    setColorGradePreset(key);
                  }}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    colorGradePreset === key
                      ? 'bg-sky-500/20 text-sky-200 font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {COLOR_GRADE_PRESETS[key].label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* 1. 3D Solar System */}
          <div
            onClick={() => handleNavigate('solarSystem')}
            className="group glass-panel hover:border-sky-400/50 p-6 rounded-2xl cursor-pointer transition-all hover:-translate-y-0.5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-xl bg-sky-500/15 border border-sky-400/25 text-sky-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Orbit className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-sky-300/80">
                  Real-Time 3D
                </span>
              </div>
              <h3 className="font-display text-lg font-bold text-white group-hover:text-sky-300 transition-colors">
                3D Interactive Solar System
              </h3>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                Full Three.js orbital simulation with solar corona shaders, deep-space galaxies, variable warp speeds, and GPS celestial sky lock.
              </p>
            </div>
            <div className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-sky-400 group-hover:translate-x-1 transition-transform">
              <span>Open 3D Simulator</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* 2. Planet Explorer */}
          <div
            onClick={() => handleNavigate('explorer', 'earth')}
            className="group glass-panel hover:border-emerald-400/50 p-6 rounded-2xl cursor-pointer transition-all hover:-translate-y-0.5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-400/25 text-emerald-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Compass className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-300/80">
                  PBR · Dissector
                </span>
              </div>
              <h3 className="font-display text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
                Planet & Galaxy Explorer
              </h3>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                Inspect worlds and spiral galaxies in isolation. Toggle internal layers (Crust, Mantle, Core), compute gravity weight, and hear narration.
              </p>
            </div>
            <div className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-emerald-400 group-hover:translate-x-1 transition-transform">
              <span>Inspect Worlds</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* 3. Camera AR Placement */}
          <div
            onClick={() => handleNavigate('cameraAR')}
            className="group glass-panel border-pink-500/25 hover:border-pink-400/70 p-6 rounded-2xl cursor-pointer transition-all hover:-translate-y-0.5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-xl bg-pink-500/15 border border-pink-400/30 text-pink-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Camera className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-pink-300">
                  Spatial AR · Live
                </span>
              </div>
              <h3 className="font-display text-lg font-bold text-white group-hover:text-pink-300 transition-colors">
                Camera AR Classroom
              </h3>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                Anchor planets, spacecraft, or galaxies onto your desk or floor using real-world object detection, gyroscope tracking, and WebXR.
              </p>
            </div>
            <div className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-pink-400 group-hover:translate-x-1 transition-transform">
              <span>Start AR Session</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* 4. Compare Mode */}
          <div
            onClick={() => handleNavigate('compare')}
            className="group glass-panel hover:border-purple-400/50 p-6 rounded-2xl cursor-pointer transition-all hover:-translate-y-0.5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-xl bg-purple-500/15 border border-purple-400/25 text-purple-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Scale className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-purple-300/80">
                  True Scale
                </span>
              </div>
              <h3 className="font-display text-lg font-bold text-white group-hover:text-purple-300 transition-colors">
                Planetary Scale & Compare
              </h3>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                Place up to three worlds or spacecraft side-by-side at proportional physical scale. Compare mass, gravity, velocity, and telemetry.
              </p>
            </div>
            <div className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-purple-400 group-hover:translate-x-1 transition-transform">
              <span>Compare Models</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* 5. Quiz Centre */}
          <div
            onClick={() => handleNavigate('quiz')}
            className="group glass-panel hover:border-amber-400/50 p-6 rounded-2xl cursor-pointer transition-all hover:-translate-y-0.5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-400/25 text-amber-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-amber-300">
                  5 Questions
                </span>
              </div>
              <h3 className="font-display text-lg font-bold text-white group-hover:text-amber-300 transition-colors">
                5-Question Quiz Centre
              </h3>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                Test your mastery on Venusian heat, Saturnian ice rings, Uranian tilt, and supersonic winds. Earn the Solar Scholar Laureate badge.
              </p>
            </div>
            <div className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-amber-400 group-hover:translate-x-1 transition-transform">
              <span>Take Quiz</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* 6. Teacher Mode */}
          <div
            onClick={() => handleNavigate('teacher')}
            className="group glass-panel hover:border-indigo-400/50 p-6 rounded-2xl cursor-pointer transition-all hover:-translate-y-0.5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-xl bg-indigo-500/15 border border-indigo-400/25 text-indigo-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-indigo-300">
                  Class · {classroomCode}
                </span>
              </div>
              <h3 className="font-display text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
                Teacher Presentation Mode
              </h3>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                Curriculum guided slide tours with unique 3D flight animations, live laser annotation, student roster tracking, and pop quiz launcher.
              </p>
            </div>
            <div className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-indigo-400 group-hover:translate-x-1 transition-transform">
              <span>Open Teacher Desk</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </section>

      {/* Satellites, Rockets & Spacecraft Fleet Showcase */}
      <section className="glass-panel rounded-3xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Rocket className="w-4 h-4 text-amber-400" />
              <h3 className="font-display text-base font-bold text-white">
                Satellites, Rockets & Deep Space Fleet
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Inspect orbital laboratories, lunar landers, and deep-space probes in 3D & Camera AR
            </p>
          </div>
          <button
            onClick={() => handleNavigate('cameraAR')}
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
          >
            <span>Project Fleet in AR</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { id: 'iss', name: 'ISS Station', agency: 'NASA / International', category: 'Satellite', color: '#38bdf8' },
            { id: 'saturn-v', name: 'Saturn V', agency: 'Apollo Moon Rocket', category: 'Rocket', color: '#f8fafc' },
            { id: 'starship', name: 'Starship', agency: 'SpaceX Next-Gen', category: 'Rocket', color: '#cbd5e1' },
            { id: 'jwst', name: 'James Webb', agency: 'NASA / ESA / CSA', category: 'Observatory', color: '#f59e0b' },
            { id: 'apollo-lander', name: 'Apollo Lander', agency: 'Eagle 1969', category: 'Spacecraft', color: '#eab308' },
            { id: 'mars-rover', name: 'Perseverance', agency: 'Mars Astrobiology', category: 'Rover', color: '#f87171' },
          ].map(item => (
            <div
              key={item.id}
              onClick={() => handleNavigate('cameraAR')}
              className="group p-3.5 rounded-2xl bg-slate-950/75 border border-slate-800/90 hover:border-amber-400/50 cursor-pointer transition-all hover:-translate-y-0.5 flex flex-col justify-between gap-2"
            >
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="uppercase tracking-wider">{item.category}</span>
              </div>
              <div>
                <div className="font-display text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                  {item.name}
                </div>
                <div className="text-[11px] text-slate-400 truncate mt-0.5">{item.agency}</div>
              </div>
              <div className="text-[11px] font-semibold text-amber-400/90 flex items-center gap-1 mt-1">
                <span>View in AR</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Planet Selector Carousel */}
      <section className="glass-panel rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display text-base font-bold text-white">Solar System Worlds</h3>
            <p className="text-xs text-slate-400">Select any planet for 3D surface inspection and acoustic profile</p>
          </div>
          <button
            onClick={() => handleNavigate('solarSystem')}
            className="text-xs font-medium text-sky-400 hover:text-sky-300 flex items-center gap-1"
          >
            <span>View All in 3D</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {ORDERED_PLANETS.map(id => {
            const planet = PLANETS_DATA[id];
            const isExplored = progress.exploredPlanets.includes(id);
            return (
              <button
                key={id}
                onClick={() => {
                  soundEffects.playPlanetSound(id);
                  soundEffects.speakPlanet(id);
                  handleNavigate('explorer', id);
                }}
                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-between gap-2 hover:-translate-y-0.5 ${
                  isExplored
                    ? 'bg-slate-900/90 border-slate-700/90 hover:border-sky-400/70'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-600'
                }`}
              >
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center relative"
                  style={{
                    background: `radial-gradient(circle at 32% 30%, ${planet.accentColor}, ${planet.color} 58%, #020617 100%)`,
                    boxShadow: `0 0 18px ${planet.color}38`,
                  }}
                >
                  {isExplored && (
                    <span className="absolute -top-1 -right-1 bg-emerald-500 text-slate-950 rounded-full p-0.5 shadow">
                      <CheckCircle2 className="w-3 h-3" />
                    </span>
                  )}
                </div>
                <div>
                  <div className="font-display text-xs font-bold text-white">{planet.name}</div>
                  <div className="text-[10px] font-mono text-slate-400 capitalize">{planet.type}</div>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};

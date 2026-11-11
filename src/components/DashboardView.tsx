import React from 'react';
import {
  Orbit,
  Compass,
  Camera,
  Scale,
  Award,
  HelpCircle,
  GraduationCap,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Trophy,
  Cpu,
  Rocket,
} from 'lucide-react';
import { useClassroom, AppView } from '../context/ClassroomContext';
import { PLANETS_DATA, ORDERED_PLANETS } from '../data/planetsData';
import { PlanetId } from '../types/astronomy';
import { soundEffects } from '../utils/soundEffects';

export const DashboardView: React.FC = () => {
  const {
    setCurrentView,
    setSelectedPlanetId,
    progress,
    exploredCount,
    missions,
    classroomCode,
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
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border border-slate-800 p-6 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-semibold border border-sky-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Web & Mobile 3D / AR Astronomy Platform</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Explore the Universe in{' '}
            <span className="bg-gradient-to-r from-sky-400 via-indigo-300 to-amber-300 bg-clip-text text-transparent">
              3D & Augmented Reality
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
            Step inside our virtual observatory. Discover orbital mechanics, dissect planetary layers, project worlds into your classroom with Camera AR, and conquer our 5-question Solar Quiz.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => handleNavigate('solarSystem')}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm shadow-lg shadow-sky-600/30 transition-all hover:scale-[1.02]"
            >
              <Orbit className="w-4 h-4" />
              <span>Launch 3D Space</span>
            </button>

            <button
              onClick={() => handleNavigate('cameraAR')}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-semibold text-sm shadow-lg shadow-pink-600/30 transition-all hover:scale-[1.02]"
            >
              <Camera className="w-4 h-4" />
              <span>Enter Camera AR</span>
            </button>

            <button
              onClick={() => handleNavigate('quiz')}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition-all"
            >
              <HelpCircle className="w-4 h-4" />
              <span>5-Question Quiz</span>
            </button>
          </div>
        </div>

        {/* Live Status Badges */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">Cadet Rank</div>
            <div className="text-base sm:text-lg font-bold text-amber-300 flex items-center gap-1.5 mt-0.5">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>{progress.title}</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Level {progress.level} • {progress.xp} XP</div>
          </div>

          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">Planets Explored</div>
            <div className="text-base sm:text-lg font-bold text-sky-300 flex items-center gap-1.5 mt-0.5">
              <Compass className="w-4 h-4 text-sky-400" />
              <span>{exploredCount} / 8</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {Math.round((exploredCount / 8) * 100)}% charted
            </div>
          </div>

          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">Missions Finished</div>
            <div className="text-base sm:text-lg font-bold text-emerald-300 flex items-center gap-1.5 mt-0.5">
              <Award className="w-4 h-4 text-emerald-400" />
              <span>{completedMissionsCount} / 7</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Earn badges & XP</div>
          </div>

          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">Quiz Best Score</div>
            <div className="text-base sm:text-lg font-bold text-indigo-300 flex items-center gap-1.5 mt-0.5">
              <HelpCircle className="w-4 h-4 text-indigo-400" />
              <span>{progress.quizBestScore} / 5</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {progress.quizAttempts > 0 ? `${progress.quizAttempts} attempts made` : 'Not attempted yet'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Core Modules Grid */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span>Core Learning Modules</span>
          <span className="text-xs font-normal text-slate-400">Select any experience to begin</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* 1. 3D Solar System */}
          <div
            onClick={() => handleNavigate('solarSystem')}
            className="group relative bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-sky-500/50 p-6 rounded-2xl cursor-pointer transition-all hover:shadow-xl hover:shadow-sky-500/10 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Orbit className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-sky-300 transition-colors">
                3D Interactive Solar System
              </h3>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                Full Three.js orbital simulation. Zoom into orbits, control orbital speed multipliers, inspect planetary planes, and view asteroid belt clusters.
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
            className="group relative bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/50 p-6 rounded-2xl cursor-pointer transition-all hover:shadow-xl hover:shadow-emerald-500/10 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Compass className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
                Planet Explorer & Dissector
              </h3>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                Inspect 3D worlds in isolation. Toggle internal layers (Crust, Mantle, Core), calculate your weight on other worlds, and listen to audio narration.
              </p>
            </div>
            <div className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-emerald-400 group-hover:translate-x-1 transition-transform">
              <span>Inspect Planets</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* 3. Camera AR Placement (Milestone 2) */}
          <div
            onClick={() => handleNavigate('cameraAR')}
            className="group relative bg-slate-900/80 hover:bg-slate-850 border border-pink-500/30 hover:border-pink-500 p-6 rounded-2xl cursor-pointer transition-all hover:shadow-xl hover:shadow-pink-500/10 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Camera className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                  Milestone 2
                </span>
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-pink-300 transition-colors">
                Camera AR Classroom
              </h3>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                Project planets or the mini solar system directly onto your desk or floor using live camera feed and WebXR/gyroscope tracking with photo capture.
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
            className="group relative bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-purple-500/50 p-6 rounded-2xl cursor-pointer transition-all hover:shadow-xl hover:shadow-purple-500/10 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Scale className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors">
                Planetary Scale & Compare
              </h3>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                Place two or three worlds side-by-side at true physical scale. Compare gravity, diameter, temperatures, and atmospheric composition.
              </p>
            </div>
            <div className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-purple-400 group-hover:translate-x-1 transition-transform">
              <span>Compare Planets</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* 5. Quiz Centre (5 Questions) */}
          <div
            onClick={() => handleNavigate('quiz')}
            className="group relative bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/50 p-6 rounded-2xl cursor-pointer transition-all hover:shadow-xl hover:shadow-amber-500/10 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <HelpCircle className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  5 Questions
                </span>
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors">
                5-Question Quiz Centre
              </h3>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                Test your mastery on Venusian heat, Saturnian ice rings, Uranian tilt, and supersonic winds. Earn the Solar Scholar Laureate badge!
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
            className="group relative bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/50 p-6 rounded-2xl cursor-pointer transition-all hover:shadow-xl hover:shadow-indigo-500/10 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Class: {classroomCode}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
                Teacher Presentation Mode
              </h3>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                Step-by-step curriculum guided tour, live 3D laser pointer annotation, student roster monitoring, and pop quiz launcher.
              </p>
            </div>
            <div className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-indigo-400 group-hover:translate-x-1 transition-transform">
              <span>Open Teacher Desk</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* 7. MyWebAR & MCP Integration Hub */}
          <div
            onClick={() => handleNavigate('mywebarHub')}
            className="group relative bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-sky-500/50 p-6 rounded-2xl cursor-pointer transition-all hover:shadow-xl hover:shadow-sky-500/10 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Cpu className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  MCP Server
                </span>
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-sky-300 transition-colors">
                MyWebAR & MCP AI Server
              </h3>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                Connect AI assistants (Claude / ChatGPT) to your AR classroom via Model Context Protocol, generate instant mobile QR codes, and embed custom MyWebAR projects.
              </p>
            </div>
            <div className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-sky-400 group-hover:translate-x-1 transition-transform">
              <span>Open MCP & QR Hub</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Satellites, Rockets & Spacecraft Fleet Showcase */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300">
                <Rocket className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-white">Satellites, Rockets & Deep Space Fleet</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Inspect humanity's greatest orbital laboratories, Apollo landers, and interstellar probes in 3D & WebAR
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
            { id: 'iss', name: 'ISS Station', agency: 'NASA / International', badge: 'Satellite', color: '#38bdf8' },
            { id: 'saturn-v', name: 'Saturn V', agency: 'Apollo Moon Rocket', badge: 'Rocket', color: '#f8fafc' },
            { id: 'starship', name: 'Starship', agency: 'SpaceX Next-Gen', badge: 'Rocket', color: '#cbd5e1' },
            { id: 'jwst', name: 'James Webb', agency: 'NASA / ESA / CSA', badge: 'Observatory', color: '#f59e0b' },
            { id: 'apollo-lander', name: 'Apollo Lander', agency: 'Eagle 1969', badge: 'Spacecraft', color: '#eab308' },
            { id: 'mars-rover', name: 'Perseverance', agency: 'Mars Astrobiology', badge: 'Rover', color: '#f87171' },
          ].map(item => (
            <div
              key={item.id}
              onClick={() => handleNavigate('cameraAR')}
              className="group p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-amber-500/50 cursor-pointer transition-all hover:scale-105 flex flex-col justify-between gap-2"
            >
              <div className="flex items-center justify-between">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  {item.badge}
                </span>
              </div>
              <div>
                <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                  {item.name}
                </div>
                <div className="text-[10px] text-slate-400 truncate">{item.agency}</div>
              </div>
              <div className="text-[10px] font-semibold text-amber-400/80 flex items-center gap-1 mt-1">
                <span>View in AR</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Planet Selector Carousel */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white">Solar System Worlds</h3>
            <p className="text-xs text-slate-400">Select any planet to jump straight into its 3D examination & sound</p>
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
                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-between gap-2 hover:scale-105 ${
                  isExplored
                    ? 'bg-slate-800/80 border-slate-700 hover:border-sky-500'
                    : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-600'
                }`}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shadow-md relative"
                  style={{
                    backgroundColor: planet.color,
                    boxShadow: `0 0 15px ${planet.color}40`,
                  }}
                >
                  {isExplored && (
                    <span className="absolute -top-1 -right-1 bg-emerald-500 text-slate-950 rounded-full p-0.5">
                      <CheckCircle2 className="w-3 h-3" />
                    </span>
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">{planet.name}</div>
                  <div className="text-[10px] text-slate-400 capitalize">{planet.type}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

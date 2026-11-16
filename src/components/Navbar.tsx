import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Orbit,
  Compass,
  Scale,
  Award,
  HelpCircle,
  Camera,
  GraduationCap,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  User,
  LayoutDashboard,
  Sparkles,
  Smartphone,
  Palette,
  Search,
} from 'lucide-react';
import { useClassroom, AppView } from '../context/ClassroomContext';
import { soundEffects } from '../utils/soundEffects';
import { useGyroscope } from '../hooks/useGyroscope';
import { COLOR_GRADE_PRESETS, ColorGradePresetId } from '../utils/coreAssetsEngine';

const PRESET_ORDER: ColorGradePresetId[] = [
  'deep-cosmos',
  'solar-flare',
  'cryo-observatory',
  'natural-imax',
];

interface NavbarProps {
  onOpenCommandPalette?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenCommandPalette }) => {
  const {
    currentView,
    setCurrentView,
    progress,
    soundEnabled,
    toggleSound,
    colorGradePreset,
    setColorGradePreset,
  } = useClassroom();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const { isActive: isGyroActive, toggleGyro } = useGyroscope();

  const navItems: { view: AppView; label: string; icon: React.ReactNode; meta?: string }[] = [
    { view: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { view: 'solarSystem', label: '3D Space', icon: <Orbit className="w-4 h-4" /> },
    { view: 'explorer', label: 'Explorer', icon: <Compass className="w-4 h-4" /> },
    { view: 'compare', label: 'Compare', icon: <Scale className="w-4 h-4" /> },
    {
      view: 'missions',
      label: 'Missions',
      icon: <Award className="w-4 h-4" />,
      meta: `${progress.completedMissionIds.length}/7`,
    },
    {
      view: 'quiz',
      label: 'Quiz',
      icon: <HelpCircle className="w-4 h-4" />,
      meta: progress.quizBestScore > 0 ? `${progress.quizBestScore}/5` : '5 Qs',
    },
    {
      view: 'cameraAR',
      label: 'Camera AR',
      icon: <Camera className="w-4 h-4" />,
      meta: 'Live',
    },
    { view: 'teacher', label: 'Teacher', icon: <GraduationCap className="w-4 h-4" /> },
    { view: 'progress', label: 'Journal', icon: <User className="w-4 h-4" /> },
  ];

  const handleNavClick = (view: AppView) => {
    soundEffects.playClick();
    setCurrentView(view);
  };

  const handleCycleColorGrade = () => {
    soundEffects.playClick();
    const idx = PRESET_ORDER.indexOf(colorGradePreset);
    const next = PRESET_ORDER[(idx + 1) % PRESET_ORDER.length];
    setColorGradePreset(next);
  };

  const toggleFullscreen = () => {
    soundEffects.playClick();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 text-slate-100">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Logo & Branding */}
          <div
            onClick={() => handleNavClick('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer group flex-shrink-0"
          >
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500/30 via-indigo-600/30 to-amber-500/20 border border-sky-400/35 flex items-center justify-center shadow-lg shadow-sky-500/15 group-hover:scale-105 transition-transform">
              <Orbit className="w-5 h-5 text-sky-300" />
            </div>
            <div>
              <span className="font-display font-bold tracking-tight text-base sm:text-lg text-white block leading-none">
                AR Smart Classroom
              </span>
              <p className="text-[11px] font-mono text-slate-400 hidden sm:block mt-0.5 tracking-wide">
                WebAR · 3D Observatory
              </p>
            </div>
          </div>

          {/* Desktop Navigation with Smooth Framer Motion layoutId Pill */}
          <nav className="hidden lg:flex items-center gap-0.5 overflow-x-auto py-1 scrollbar-none">
            {navItems.map(item => {
              const isActive = currentView === item.view;
              return (
                <button
                  key={item.view}
                  onClick={() => handleNavClick(item.view)}
                  className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    isActive ? 'text-sky-100' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="navbar-active-indicator"
                      transition={{ type: 'spring', stiffness: 460, damping: 36 }}
                      className="absolute inset-0 rounded-lg bg-sky-500/15 border border-sky-400/35 shadow-sm shadow-sky-500/10"
                    />
                  )}
                  <span className={`relative z-10 ${isActive ? 'text-sky-300' : 'text-slate-400'}`}>
                    {item.icon}
                  </span>
                  <span className="relative z-10">{item.label}</span>
                  {item.meta && (
                    <span
                      className={`relative z-10 text-[10px] font-mono ${
                        item.view === 'cameraAR'
                          ? 'text-rose-400 font-semibold'
                          : isActive
                          ? 'text-sky-300'
                          : 'text-slate-400'
                      }`}
                    >
                      · {item.meta}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Status & Quick Actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Command Palette Quick Jump */}
            {onOpenCommandPalette && (
              <button
                onClick={() => {
                  soundEffects.playClick();
                  onOpenCommandPalette();
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/70 border border-slate-800 text-slate-300 hover:text-white hover:border-sky-400/40 text-xs transition-colors"
                title="Quick Jump Command Palette (Ctrl/Cmd + K)"
              >
                <Search className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden xl:inline text-[11px] font-mono text-slate-400">⌘K</span>
              </button>
            )}

            {/* Student XP Readout */}
            <button
              onClick={() => handleNavClick('progress')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/70 border border-slate-800 text-xs hover:border-amber-400/40 transition-colors"
              title={`Level ${progress.level}: ${progress.title}`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-mono font-semibold text-amber-300">{progress.xp} XP</span>
              <span className="text-[11px] font-mono text-slate-400 hidden md:inline">
                · Lvl {progress.level}
              </span>
            </button>

            {/* Color Grade Quick Switcher */}
            <button
              onClick={handleCycleColorGrade}
              className="p-2 rounded-lg border bg-slate-900/70 border-slate-800 text-sky-300 hover:text-white hover:bg-slate-800 transition-colors hidden sm:flex items-center gap-1.5 text-xs"
              title={`Color Grading LUT: ${COLOR_GRADE_PRESETS[colorGradePreset].label} (Click to cycle)`}
            >
              <Palette className="w-4 h-4" />
            </button>

            {/* Gyroscope Global Motion Toggle */}
            <button
              onClick={toggleGyro}
              className={`p-2 rounded-lg border transition-all ${
                isGyroActive
                  ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 shadow-sm shadow-emerald-500/20'
                  : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={isGyroActive ? 'Device Gyroscope Motion: Active (Tilt phone or move mouse)' : 'Enable Device Gyroscope Motion'}
            >
              <Smartphone className={`w-4 h-4 ${isGyroActive ? 'text-emerald-400' : 'text-slate-400'}`} />
            </button>

            {/* Audio Toggle */}
            <button
              onClick={toggleSound}
              className={`p-2 rounded-lg border transition-colors ${
                soundEnabled
                  ? 'bg-slate-900/70 border-slate-800 text-sky-400 hover:bg-slate-800'
                  : 'bg-slate-900/70 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
              title={soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg border bg-slate-900/70 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors hidden sm:flex items-center"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Sub-Navigation Bar */}
        <div className="lg:hidden flex items-center gap-1 overflow-x-auto py-2 border-t border-slate-800/80 scrollbar-none">
          {navItems.map(item => {
            const isActive = currentView === item.view;
            return (
              <button
                key={item.view}
                onClick={() => handleNavClick(item.view)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs whitespace-nowrap font-medium transition-all ${
                  isActive
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    : 'text-slate-400 hover:text-white bg-slate-900/60'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};

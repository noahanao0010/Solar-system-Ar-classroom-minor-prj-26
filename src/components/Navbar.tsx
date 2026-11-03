import React, { useState } from 'react';
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
  Cpu,
} from 'lucide-react';
import { useClassroom, AppView } from '../context/ClassroomContext';
import { soundEffects } from '../utils/soundEffects';

export const Navbar: React.FC = () => {
  const {
    currentView,
    setCurrentView,
    progress,
    soundEnabled,
    toggleSound,
  } = useClassroom();

  const [isFullscreen, setIsFullscreen] = useState(false);

  const navItems: { view: AppView; label: string; icon: React.ReactNode; badge?: string }[] = [
    { view: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { view: 'solarSystem', label: '3D Space', icon: <Orbit className="w-4 h-4" /> },
    { view: 'explorer', label: 'Explorer', icon: <Compass className="w-4 h-4" /> },
    { view: 'compare', label: 'Compare', icon: <Scale className="w-4 h-4" /> },
    {
      view: 'missions',
      label: 'Missions',
      icon: <Award className="w-4 h-4" />,
      badge: `${progress.completedMissionIds.length}/7`,
    },
    {
      view: 'quiz',
      label: 'Quiz (5 Qs)',
      icon: <HelpCircle className="w-4 h-4" />,
      badge: progress.quizBestScore > 0 ? `${progress.quizBestScore}/5` : undefined,
    },
    {
      view: 'cameraAR',
      label: 'Camera AR',
      icon: <Camera className="w-4 h-4" />,
      badge: 'WebAR',
    },
    {
      view: 'mywebarHub',
      label: 'MyWebAR & MCP',
      icon: <Cpu className="w-4 h-4" />,
      badge: 'MCP',
    },
    { view: 'teacher', label: 'Teacher Mode', icon: <GraduationCap className="w-4 h-4" /> },
    { view: 'progress', label: 'Journal', icon: <User className="w-4 h-4" /> },
  ];

  const handleNavClick = (view: AppView) => {
    soundEffects.playClick();
    setCurrentView(view);
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
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Logo & Branding */}
          <div
            onClick={() => handleNavClick('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer group flex-shrink-0"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-sky-500 to-amber-500 flex items-center justify-center shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform">
              <Orbit className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold tracking-tight text-base sm:text-lg bg-gradient-to-r from-sky-300 via-indigo-200 to-amber-200 bg-clip-text text-transparent">
                  AR Smart Classroom
                </span>
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  WebAR
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">Interactive 3D Solar System & AR</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 overflow-x-auto py-1">
            {navItems.map(item => {
              const isActive = currentView === item.view;
              return (
                <button
                  key={item.view}
                  onClick={() => handleNavClick(item.view)}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm shadow-sky-500/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        item.view === 'cameraAR'
                          ? 'bg-pink-500/30 text-pink-300 border border-pink-500/40'
                          : 'bg-slate-800 text-sky-300 border border-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Status & Quick Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Student XP Pill */}
            <div
              onClick={() => handleNavClick('progress')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700/80 text-xs cursor-pointer hover:border-amber-500/50 transition-colors"
              title={`Level ${progress.level}: ${progress.title}`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold text-amber-300">{progress.xp} XP</span>
              <span className="text-[11px] text-slate-400 hidden md:inline">
                • Lvl {progress.level}
              </span>
            </div>

            {/* Audio Toggle */}
            <button
              onClick={toggleSound}
              className={`p-2 rounded-lg border transition-colors ${
                soundEnabled
                  ? 'bg-slate-900 border-slate-700 text-sky-400 hover:bg-slate-800'
                  : 'bg-slate-900 border-slate-700 text-slate-500 hover:text-slate-300'
              }`}
              title={soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg border bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors hidden sm:flex items-center"
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

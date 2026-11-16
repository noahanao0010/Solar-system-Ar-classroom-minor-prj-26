import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Search,
  Orbit,
  Compass,
  Camera,
  Scale,
  Award,
  HelpCircle,
  GraduationCap,
  User,
  LayoutDashboard,
  Palette,
  Sparkles,
  ArrowRight,
  X,
} from 'lucide-react';
import { useClassroom, AppView } from '../context/ClassroomContext';
import { PLANETS_DATA, ORDERED_PLANETS } from '../data/planetsData';
import { GALAXIES_DATA, ORDERED_GALAXIES } from '../data/galaxiesData';
import { COLOR_GRADE_PRESETS, ColorGradePresetId } from '../utils/coreAssetsEngine';
import { soundEffects } from '../utils/soundEffects';

interface CommandItem {
  id: string;
  label: string;
  subtitle: string;
  group: 'Modules' | 'Planets & Star' | 'Deep Space' | 'Color Grading';
  accent: string;
  icon: React.ReactNode;
  action: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose }) => {
  const { setCurrentView, setSelectedPlanetId, setColorGradePreset, colorGradePreset } =
    useClassroom();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      const timer = window.setTimeout(() => inputRef.current?.focus(), 40);
      return () => window.clearTimeout(timer);
    }
  }, [open]);

  const items: CommandItem[] = useMemo(() => {
    const viewNavs: { view: AppView; label: string; subtitle: string; icon: React.ReactNode; accent: string }[] = [
      { view: 'dashboard', label: 'Command Deck', subtitle: 'Overview & telemetry hub', icon: <LayoutDashboard className="w-4 h-4" />, accent: '#38bdf8' },
      { view: 'solarSystem', label: '3D Space Observatory', subtitle: 'Interactive solar system, spacecraft & cosmic web', icon: <Orbit className="w-4 h-4" />, accent: '#38bdf8' },
      { view: 'cameraAR', label: 'Camera AR Classroom', subtitle: 'Spatial surface anchors & object detection', icon: <Camera className="w-4 h-4" />, accent: '#f472b6' },
      { view: 'explorer', label: 'Planet & Galaxy Explorer', subtitle: 'Surface dissector, interior layers & weight calc', icon: <Compass className="w-4 h-4" />, accent: '#34d399' },
      { view: 'compare', label: 'Planetary & Fleet Compare', subtitle: 'True-scale 3D side-by-side comparison', icon: <Scale className="w-4 h-4" />, accent: '#a78bfa' },
      { view: 'missions', label: 'Missions & Badges', subtitle: 'Track progress and claim XP rewards', icon: <Award className="w-4 h-4" />, accent: '#fbbf24' },
      { view: 'quiz', label: '5-Question Solar Quiz', subtitle: 'Test mastery across worlds & extremes', icon: <HelpCircle className="w-4 h-4" />, accent: '#fbbf24' },
      { view: 'teacher', label: 'Teacher Presentation Desk', subtitle: 'Guided 3D tour slides, laser pointer & roster', icon: <GraduationCap className="w-4 h-4" />, accent: '#818cf8' },
      { view: 'progress', label: 'Cadet Flight Journal', subtitle: 'Notes log, charting record & JSON export', icon: <User className="w-4 h-4" />, accent: '#38bdf8' },
    ];

    const list: CommandItem[] = [];

    viewNavs.forEach(v => {
      list.push({
        id: `view-${v.view}`,
        label: v.label,
        subtitle: v.subtitle,
        group: 'Modules',
        accent: v.accent,
        icon: v.icon,
        action: () => {
          soundEffects.playClick();
          setCurrentView(v.view);
          onClose();
        },
      });
    });

    (['sun', ...ORDERED_PLANETS] as const).forEach(pId => {
      const p = PLANETS_DATA[pId];
      list.push({
        id: `planet-${pId}`,
        label: p.name,
        subtitle: `${p.type} · ${p.tagline}`,
        group: 'Planets & Star',
        accent: p.accentColor,
        icon: <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: p.color }} />,
        action: () => {
          soundEffects.playPlanetSound(pId);
          setSelectedPlanetId(pId);
          setCurrentView('explorer');
          onClose();
        },
      });
    });

    ORDERED_GALAXIES.forEach(gId => {
      const g = GALAXIES_DATA[gId];
      if (!g) return;
      list.push({
        id: `galaxy-${gId}`,
        label: g.name,
        subtitle: `${g.type} · ${g.distanceLightYears}`,
        group: 'Deep Space',
        accent: g.accentColor,
        icon: <Sparkles className="w-4 h-4" style={{ color: g.accentColor }} />,
        action: () => {
          soundEffects.playWarp();
          setCurrentView('solarSystem');
          onClose();
        },
      });
    });

    (Object.keys(COLOR_GRADE_PRESETS) as ColorGradePresetId[]).forEach(key => {
      const cfg = COLOR_GRADE_PRESETS[key];
      list.push({
        id: `lut-${key}`,
        label: `LUT: ${cfg.label}${colorGradePreset === key ? ' (Active)' : ''}`,
        subtitle: cfg.description,
        group: 'Color Grading',
        accent: '#38bdf8',
        icon: <Palette className="w-4 h-4 text-sky-400" />,
        action: () => {
          soundEffects.playClick();
          setColorGradePreset(key);
          onClose();
        },
      });
    });

    return list;
  }, [colorGradePreset, onClose, setColorGradePreset, setCurrentView, setSelectedPlanetId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 14);
    return items
      .filter(
        it =>
          it.label.toLowerCase().includes(q) ||
          it.subtitle.toLowerCase().includes(q) ||
          it.group.toLowerCase().includes(q),
      )
      .slice(0, 14);
  }, [items, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (filtered.length > 0 ? (prev + 1) % filtered.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (filtered.length > 0 ? (prev - 1 + filtered.length) % filtered.length : 0));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault();
      filtered[selectedIndex].action();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4 bg-slate-950/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            onClick={e => e.stopPropagation()}
            onKeyDown={handleKeyDown}
            className="w-full max-w-xl glass-panel-elevated rounded-2xl overflow-hidden shadow-2xl"
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800/90">
              <Search className="w-4 h-4 text-sky-400 flex-shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Jump to module, planet, galaxy, or color grading LUT..."
                className="flex-1 bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none"
              />
              <button
                onClick={onClose}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/80"
                aria-label="Close command palette"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Results */}
            <div className="max-h-[55vh] overflow-y-auto p-2 space-y-1 scrollbar-none">
              {filtered.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  No matching modules, worlds, or telemetry commands found.
                </div>
              ) : (
                filtered.map((item, idx) => {
                  const active = idx === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      onClick={item.action}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                        active
                          ? 'bg-sky-500/15 border border-sky-400/35 text-white'
                          : 'border border-transparent text-slate-300 hover:bg-slate-900/70'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-center flex-shrink-0">
                          {item.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-white truncate">
                            {item.label}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {item.subtitle}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider hidden sm:inline">
                          {item.group}
                        </span>
                        <ArrowRight className={`w-3.5 h-3.5 ${active ? 'text-sky-300' : 'text-slate-600'}`} />
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer Hints */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-slate-800/80 text-[10px] font-mono text-slate-400 bg-slate-950/60">
              <span>↑↓ Navigate · ↵ Launch · Esc Close</span>
              <span>Cmd / Ctrl + K</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

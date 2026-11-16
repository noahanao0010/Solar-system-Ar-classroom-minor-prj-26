import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useClassroom } from '../context/ClassroomContext';
import { PLANETS_DATA, ORDERED_PLANETS } from '../data/planetsData';
import { soundEffects } from '../utils/soundEffects';
import { PageShell } from './ui/ObservatoryPrimitives';
import {
  BookOpen,
  Trash2,
  Download,
  RotateCcw,
  CheckCircle2,
  Circle,
  Calendar,
} from 'lucide-react';
import { PlanetId } from '../types/astronomy';

export const ProgressView: React.FC = () => {
  const {
    progress,
    exploredCount,
    deleteStudentNote,
    addStudentNote,
    resetProgress,
    setCurrentView,
    setSelectedPlanetId,
  } = useClassroom();

  const [newNotePlanet, setNewNotePlanet] = useState<PlanetId>('earth');
  const [newNoteText, setNewNoteText] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleExportJson = () => {
    soundEffects.playSuccess();
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(progress, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `astro_classroom_progress_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    addStudentNote(newNotePlanet, newNoteText.trim());
    setNewNoteText('');
    soundEffects.playSuccess();
  };

  return (
    <PageShell maxWidth="7xl">
      {/* Cadet Profile Banner */}
      <section className="glass-panel-elevated rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500/30 to-indigo-600/30 border border-sky-400/35 flex items-center justify-center text-3xl shadow-lg shadow-sky-500/15">
              🧑‍🚀
            </div>
            <div>
              <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-amber-300">
                <span>Level {progress.level}</span>
                <span>·</span>
                <span>{progress.title}</span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-0.5">
                Cadet Flight Log
              </h1>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                {progress.xp} Total XP · {exploredCount}/8 Worlds Charted · {progress.notes.length} Field Notes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJson}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700/80 transition-colors"
            >
              <Download className="w-4 h-4 text-sky-400" />
              <span>Export JSON</span>
            </button>

            <button
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/80 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 text-xs font-semibold border border-slate-800 hover:border-rose-500/40 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Rank Progress Bar */}
        <div className="pt-5 border-t border-slate-800/80 space-y-2">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-300">Progression to Master Astronomer</span>
            <span className="text-amber-300 font-semibold">{progress.xp} / 1500 XP</span>
          </div>
          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800/70">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((progress.xp / 1500) * 100, 100)}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 22 }}
              className="h-full bg-gradient-to-r from-sky-400 via-indigo-400 to-amber-400"
            />
          </div>
        </div>
      </section>

      {/* Aligned Two-Column Layout: Planetary Checklist + Field Journal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Explored Planets Matrix */}
        <section className="lg:col-span-5 glass-panel p-6 rounded-3xl space-y-4 h-fit">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Planetary Charting</span>
            </h2>
            <span className="text-xs font-mono text-slate-400">{exploredCount} / 8</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {ORDERED_PLANETS.map(id => {
              const isExplored = progress.exploredPlanets.includes(id);
              const p = PLANETS_DATA[id];
              return (
                <button
                  key={id}
                  onClick={() => {
                    soundEffects.playClick();
                    setSelectedPlanetId(id);
                    setCurrentView('explorer');
                  }}
                  className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                    isExplored
                      ? 'bg-slate-950/80 border-emerald-500/35 hover:border-emerald-400'
                      : 'bg-slate-950/35 border-slate-800/80 hover:border-slate-600 opacity-70'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: p.color }}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">{p.name}</div>
                      <div className="text-[10px] font-mono text-slate-400 capitalize truncate">{p.type}</div>
                    </div>
                  </div>

                  {isExplored ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Right: Student Field Journal */}
        <section className="lg:col-span-7 glass-panel p-6 rounded-3xl space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-sky-400" />
              <h2 className="font-display text-base font-bold text-white">Student Field Journal</h2>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {progress.notes.length} observations
            </span>
          </div>

          <form
            onSubmit={handleCreateNote}
            className="bg-slate-950/75 border border-slate-800/90 p-4 rounded-2xl space-y-3"
          >
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-xs text-slate-300 font-semibold">Target World:</label>
              <select
                value={newNotePlanet}
                onChange={e => setNewNotePlanet(e.target.value as PlanetId)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-sky-400"
              >
                {ORDERED_PLANETS.map(id => (
                  <option key={id} value={id}>
                    {PLANETS_DATA[id].name}
                  </option>
                ))}
              </select>
            </div>

            <textarea
              value={newNoteText}
              onChange={e => setNewNoteText(e.target.value)}
              placeholder="Record an astronomical observation, gravity calculation, or AR placement note..."
              rows={2}
              className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
            />

            <button
              type="submit"
              disabled={!newNoteText.trim()}
              className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-slate-950 font-bold text-xs transition-colors ml-auto block"
            >
              Add Journal Entry
            </button>
          </form>

          <div className="space-y-2.5">
            {progress.notes.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">
                No notes logged yet. Examine any planet in Explorer and log observations.
              </p>
            ) : (
              progress.notes.map(note => {
                const p = PLANETS_DATA[note.planetId];
                return (
                  <div
                    key={note.id}
                    className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-2xl flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-mono">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: p.color }}
                        />
                        <span className="font-sans font-bold text-white">{p.name}</span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {note.date}
                        </span>
                      </div>
                      <p className="text-slate-300 text-xs leading-relaxed pl-4">{note.text}</p>
                    </div>

                    <button
                      onClick={() => {
                        soundEffects.playClick();
                        deleteStudentNote(note.id);
                      }}
                      className="p-1 text-slate-500 hover:text-rose-400 transition-colors flex-shrink-0"
                      title="Delete Note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* Reset Confirmation Modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel-elevated rounded-3xl p-6 max-w-sm w-full space-y-4"
            >
              <h3 className="font-display text-base font-bold text-white">Reset Learning Progress?</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                This will reset your earned XP, completed missions, and quiz scores back to Junior Cadet.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    resetProgress();
                    setShowResetConfirm(false);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
                >
                  Yes, Reset All
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
};

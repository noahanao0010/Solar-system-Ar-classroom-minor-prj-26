import React, { useState } from 'react';
import { useClassroom } from '../context/ClassroomContext';
import { PLANETS_DATA, ORDERED_PLANETS } from '../data/planetsData';
import { soundEffects } from '../utils/soundEffects';
import {
  User,
  Award,
  BookOpen,
  Trash2,
  Download,
  RotateCcw,
  Sparkles,
  Trophy,
  CheckCircle2,
  Circle,
  HelpCircle,
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
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(progress, null, 2));
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
    <div className="min-h-full pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6 pt-6">
      {/* Student Profile Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border border-slate-800 p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-3xl shadow-lg shadow-sky-500/20">
              🧑‍🚀
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white">Cadet Flight Log</h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                  Level {progress.level}
                </span>
              </div>
              <p className="text-sm font-semibold text-amber-300 mt-0.5">{progress.title}</p>
              <p className="text-xs text-slate-400 mt-1">Total Solar System XP: {progress.xp} points</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJson}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
            >
              <Download className="w-4 h-4 text-sky-400" />
              <span>Export Record (JSON)</span>
            </button>

            <button
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-red-950/60 text-slate-400 hover:text-red-300 text-xs font-semibold border border-slate-800 hover:border-red-500/40 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 space-y-2">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-300">Progression to Next Rank</span>
            <span className="text-amber-300">{progress.xp} / 1500 XP</span>
          </div>
          <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-400 via-indigo-500 to-amber-400"
              style={{ width: `${Math.min((progress.xp / 1500) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Explored Planets Checklist */}
      <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Planetary Charting Record ({exploredCount} / 8 Worlds)</span>
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {ORDERED_PLANETS.map(id => {
            const isExplored = progress.exploredPlanets.includes(id);
            const p = PLANETS_DATA[id];
            return (
              <div
                key={id}
                onClick={() => {
                  soundEffects.playClick();
                  setSelectedPlanetId(id);
                  setCurrentView('explorer');
                }}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                  isExplored
                    ? 'bg-slate-950/80 border-emerald-500/40 hover:border-emerald-500'
                    : 'bg-slate-950/30 border-slate-800/80 hover:border-slate-700 opacity-60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: p.color }}
                  />
                  <div>
                    <div className="text-xs font-bold text-white">{p.name}</div>
                    <div className="text-[10px] text-slate-400">{p.type}</div>
                  </div>
                </div>

                {isExplored ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-600 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Student Field Journal Notes */}
      <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-bold text-white">Student Field Journal</h2>
          </div>
          <span className="text-xs text-slate-400">{progress.notes.length} observations logged</span>
        </div>

        {/* Quick Add Form */}
        <form onSubmit={handleCreateNote} className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs text-slate-300 font-semibold">Planet:</label>
            <select
              value={newNotePlanet}
              onChange={e => setNewNotePlanet(e.target.value as PlanetId)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
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
            placeholder="Type your astronomical observation, calculation, or finding..."
            rows={2}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />

          <button
            type="submit"
            disabled={!newNoteText.trim()}
            className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-semibold text-xs transition-colors ml-auto block"
          >
            Add Journal Entry
          </button>
        </form>

        {/* Notes List */}
        <div className="space-y-3">
          {progress.notes.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No notes logged yet. Examine any planet in Explorer and add notes!</p>
          ) : (
            progress.notes.map(note => {
              const p = PLANETS_DATA[note.planetId];
              return (
                <div
                  key={note.id}
                  className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-2xl flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: p.color }}
                      />
                      <span className="font-bold text-white">{p.name}</span>
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
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
                    className="p-1 text-slate-500 hover:text-red-400 transition-colors flex-shrink-0"
                    title="Delete Note"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Reset Learning Progress?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
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
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
              >
                Yes, Reset All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

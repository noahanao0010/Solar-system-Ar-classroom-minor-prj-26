import React from 'react';
import { useClassroom } from '../context/ClassroomContext';
import { soundEffects } from '../utils/soundEffects';
import {
  Award,
  CheckCircle2,
  Lock,
  ArrowRight,
  Sparkles,
  Trophy,
  Flame,
  Camera,
  Telescope,
  Scale,
  Compass,
} from 'lucide-react';
import { PlanetId } from '../types/astronomy';

export const MissionsView: React.FC = () => {
  const {
    missions,
    exploredCount,
    progress,
    claimMissionReward,
    setCurrentView,
    setSelectedPlanetId,
  } = useClassroom();

  const handleLaunchTask = (mission: any) => {
    soundEffects.playClick();
    if (mission.id === 'mission-explore-4' || mission.id === 'mission-explore-all') {
      setCurrentView('solarSystem');
    } else if (mission.id === 'mission-venus-heat') {
      setSelectedPlanetId('venus');
      setCurrentView('explorer');
    } else if (mission.id === 'mission-saturn-rings') {
      setSelectedPlanetId('saturn');
      setCurrentView('explorer');
    } else if (mission.id === 'mission-compare-giants') {
      setCurrentView('compare');
    } else if (mission.id === 'mission-ar-placement') {
      setCurrentView('cameraAR');
    } else if (mission.id === 'mission-quiz-master') {
      setCurrentView('quiz');
    }
  };

  const completedCount = missions.filter(m => m.isCompleted).length;

  return (
    <div className="min-h-full pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8 pt-6">
      {/* Header Banner */}
      <div className="bg-slate-900/80 border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-6 h-6 text-emerald-400" />
            <h1 className="text-2xl font-extrabold text-white">Classroom Missions & Field Badges</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Complete discovery objectives, project worlds in AR, and test your knowledge in the 5-Question Quiz to earn ranks and XP.
          </p>
        </div>

        {/* Explored Count Safe Stat Badge (Fixes Startup Issue) */}
        <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-sm">
            {exploredCount}/8
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-medium">Explored Worlds</div>
            <div className="text-xs font-bold text-white">Safe Progress Sync</div>
          </div>
        </div>
      </div>

      {/* Rank Ladder */}
      <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl shadow-lg space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-white">Astronomer Rank: {progress.title}</span>
            <span className="text-slate-400">• Level {progress.level}</span>
          </div>
          <span className="font-semibold text-amber-300">{progress.xp} XP Total</span>
        </div>

        <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-sky-400"
            style={{ width: `${Math.min((progress.xp / 1500) * 100, 100)}%` }}
          />
        </div>

        <div className="flex justify-between text-[10px] text-slate-500">
          <span>Cadet (0 XP)</span>
          <span>Explorer (300 XP)</span>
          <span>Specialist (600 XP)</span>
          <span>Commander (1000 XP)</span>
          <span>Master Astronomer (1500 XP)</span>
        </div>
      </div>

      {/* Missions List */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span>Active Learning Missions</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
            {completedCount} / {missions.length} Completed
          </span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {missions.map(mission => {
            const isFinished = mission.isCompleted;
            const canClaim = !isFinished && mission.progress >= mission.requirementCount;

            return (
              <div
                key={mission.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                  isFinished
                    ? 'bg-slate-900/50 border-emerald-500/30 shadow-sm'
                    : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-2.5">
                  {/* Category Pill and Reward */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {mission.category}
                    </span>
                    <span className="font-bold text-amber-300 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      +{mission.xpReward} XP
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    {isFinished ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-slate-600 flex-shrink-0" />
                    )}
                    <span>{mission.title}</span>
                  </h3>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    {mission.description}
                  </p>

                  {/* Progress bar */}
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Requirement:</span>
                      <span className="font-semibold text-slate-200">
                        {mission.progress} / {mission.requirementCount}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{
                          width: `${Math.min((mission.progress / mission.requirementCount) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Bottom Action */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    <span>{mission.badge.name}</span>
                  </div>

                  {isFinished ? (
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Completed
                    </span>
                  ) : canClaim ? (
                    <button
                      onClick={() => claimMissionReward(mission.id)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 animate-bounce"
                    >
                      Claim Reward
                    </button>
                  ) : (
                    <button
                      onClick={() => handleLaunchTask(mission)}
                      className="flex items-center gap-1 text-xs font-semibold text-sky-400 hover:text-sky-300"
                    >
                      <span>Go to Task</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Badges Showcase Locker */}
      <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>Badge Collection Locker</span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {missions.map(m => {
            const isUnlocked = progress.badges.includes(m.badge.name);
            return (
              <div
                key={m.id}
                className={`p-3 rounded-xl border text-center flex flex-col items-center justify-between gap-2 transition-all ${
                  isUnlocked
                    ? 'bg-slate-950/80 border-amber-500/40 text-amber-200'
                    : 'bg-slate-950/30 border-slate-800/60 text-slate-600 opacity-60'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isUnlocked ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-600'
                  }`}
                >
                  {isUnlocked ? <Award className="w-5 h-5" /> : <Lock className="w-4 h-4" />}
                </div>
                <div className="text-[11px] font-bold leading-tight">{m.badge.name}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

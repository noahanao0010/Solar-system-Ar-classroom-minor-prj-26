import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { SOLAR_SYSTEM_QUIZ } from '../data/quizData';
import { useClassroom } from '../context/ClassroomContext';
import { soundEffects } from '../utils/soundEffects';
import { PageShell } from './ui/ObservatoryPrimitives';
import {
  HelpCircle,
  CheckCircle2,
  XCircle,
  Lightbulb,
  ArrowRight,
  RotateCcw,
  Award,
  Sparkles,
  Trophy,
} from 'lucide-react';

export const QuizCenterView: React.FC = () => {
  const { completeQuiz, progress, setCurrentView } = useClassroom();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [userAnswers, setUserAnswers] = useState<{ questionId: number; selected: number; isCorrect: boolean }[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completionResult, setCompletionResult] = useState<{ xpGained: number; isNewRecord: boolean } | null>(null);

  const currentQ = SOLAR_SYSTEM_QUIZ[currentIndex];
  const totalQuestions = SOLAR_SYSTEM_QUIZ.length; // 5 questions

  const handleSelectOption = (idx: number) => {
    if (isAnswered) return;
    setSelectedOption(idx);
    setIsAnswered(true);

    const isCorrect = idx === currentQ.correctIndex;
    if (isCorrect) {
      soundEffects.playSuccess();
    } else {
      soundEffects.playClick();
    }

    setUserAnswers(prev => [
      ...prev,
      {
        questionId: currentQ.id,
        selected: idx,
        isCorrect,
      },
    ]);
  };

  const handleNext = () => {
    soundEffects.playClick();
    setShowHint(false);
    setSelectedOption(null);
    setIsAnswered(false);

    if (currentIndex + 1 < totalQuestions) {
      setCurrentIndex(currentIndex + 1);
    } else {
      const finalScore =
        userAnswers.filter(a => a.isCorrect).length +
        (selectedOption === currentQ.correctIndex ? 1 : 0);
      const res = completeQuiz(finalScore, totalQuestions);
      setCompletionResult(res);
      setIsCompleted(true);

      if (finalScore >= 4) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    }
  };

  const handleRestartQuiz = () => {
    soundEffects.playClick();
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setShowHint(false);
    setUserAnswers([]);
    setIsCompleted(false);
    setCompletionResult(null);
  };

  const finalScore = userAnswers.filter(a => a.isCorrect).length;

  return (
    <PageShell maxWidth="5xl">
      {/* Quiz Header */}
      <section className="glass-panel-elevated p-6 rounded-3xl flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Assessment Deck · 5 Questions</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-white flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-amber-400" />
            <span>Solar System Mastery Quiz</span>
          </h1>
          <p className="text-xs text-slate-300">
            Test planetary temperatures, axial tilts, ring structures, and orbital velocity extremes.
          </p>
        </div>

        <div className="flex items-center gap-5 sm:divide-x sm:divide-slate-800/80">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Best Score</div>
            <div className="font-display text-lg font-bold text-amber-300 flex items-center gap-1.5 mt-0.5">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>{progress.quizBestScore} / 5</span>
            </div>
          </div>
          <div className="sm:pl-5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Attempts</div>
            <div className="font-display text-lg font-bold text-slate-200 mt-0.5">
              {progress.quizAttempts}
            </div>
          </div>
        </div>
      </section>

      <AnimatePresence mode="wait">
        {!isCompleted ? (
          <motion.div
            key={`q-${currentIndex}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6"
          >
            {/* Question Progress Bar & Step Dots */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-sky-300 font-semibold">
                  Question {currentIndex + 1} of {totalQuestions}
                </span>
                <div className="flex items-center gap-1.5">
                  {SOLAR_SYSTEM_QUIZ.map((q, idx) => {
                    const ans = userAnswers[idx];
                    const dotColor = ans
                      ? ans.isCorrect
                        ? 'bg-emerald-400'
                        : 'bg-rose-400'
                      : idx === currentIndex
                      ? 'bg-sky-400 w-5'
                      : 'bg-slate-700';
                    return (
                      <span
                        key={q.id}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          idx === currentIndex ? dotColor : `w-1.5 ${dotColor}`
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
              <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-400 to-indigo-500 transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
                />
              </div>
            </div>

            {/* Question Text */}
            <h2 className="font-display text-lg sm:text-xl font-bold text-white leading-snug">
              {currentQ.question}
            </h2>

            {/* Options */}
            <div className="space-y-2.5">
              {currentQ.options.map((option, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrect = idx === currentQ.correctIndex;

                let optionStyle =
                  'bg-slate-950/70 border-slate-800 hover:border-sky-400/50 hover:bg-slate-900/90 text-slate-200';
                if (isAnswered) {
                  if (isCorrect) {
                    optionStyle =
                      'bg-emerald-950/60 border-emerald-400/70 text-emerald-100 shadow-sm shadow-emerald-500/15';
                  } else if (isSelected) {
                    optionStyle = 'bg-rose-950/60 border-rose-500/70 text-rose-200';
                  } else {
                    optionStyle = 'bg-slate-950/35 border-slate-800/60 text-slate-500';
                  }
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(idx)}
                    disabled={isAnswered}
                    className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between gap-3 text-sm font-medium ${optionStyle}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-md bg-slate-900 border border-slate-700/80 flex items-center justify-center text-[11px] font-mono font-bold text-slate-300 flex-shrink-0">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span>{option}</span>
                    </div>

                    {isAnswered && (
                      <div className="flex-shrink-0">
                        {isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                        {isSelected && !isCorrect && <XCircle className="w-5 h-5 text-rose-400" />}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Explanation Banner */}
            {isAnswered && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-950/85 border border-sky-500/30 p-4 rounded-xl space-y-1.5"
              >
                <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-sky-300 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Astronomy Explanation</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {currentQ.explanation}
                </p>
              </motion.div>
            )}

            {/* Footer Controls */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
              {!isAnswered ? (
                <button
                  onClick={() => setShowHint(!showHint)}
                  className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-semibold"
                >
                  <Lightbulb className="w-4 h-4" />
                  <span>{showHint ? 'Hide Hint' : 'Need a Hint?'}</span>
                </button>
              ) : (
                <span className="text-xs font-mono text-slate-400">
                  {selectedOption === currentQ.correctIndex ? 'Correct Answer' : 'Review Explanation'}
                </span>
              )}

              {isAnswered && (
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-lg shadow-sky-500/25 transition-all ml-auto"
                >
                  <span>{currentIndex + 1 === totalQuestions ? 'See Results' : 'Next Question'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {showHint && !isAnswered && (
              <div className="bg-amber-950/35 border border-amber-500/30 p-3 rounded-xl text-xs text-amber-200">
                <strong>Hint:</strong> {currentQ.hint}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="quiz-complete"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel-elevated rounded-3xl p-8 sm:p-10 text-center space-y-6"
          >
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-400/35 text-amber-300 mx-auto flex items-center justify-center">
              <Award className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-sky-300">
                Assessment Complete
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mt-1">
                {finalScore} / 5 Correct ({Math.round((finalScore / 5) * 100)}%)
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm mt-1">
                {finalScore >= 4
                  ? 'Outstanding mastery across solar system dynamics and extremes.'
                  : 'Good attempt! Explore the Planet Dissector and retake to earn 4+ for Solar Scholar.'}
              </p>
            </div>

            {completionResult && (
              <div className="max-w-md mx-auto bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">XP Earned</span>
                  <span className="font-bold text-amber-300">+{completionResult.xpGained} XP</span>
                </div>
                {finalScore >= 4 && (
                  <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-slate-800">
                    <span className="text-slate-400">Badge Unlocked</span>
                    <span className="font-bold text-emerald-300">Solar Scholar Laureate</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={handleRestartQuiz}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retake Quiz</span>
              </button>

              <button
                onClick={() => {
                  soundEffects.playClick();
                  setCurrentView('missions');
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-lg shadow-sky-500/25 transition-colors"
              >
                <Award className="w-4 h-4" />
                <span>View Missions & Badges</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
};

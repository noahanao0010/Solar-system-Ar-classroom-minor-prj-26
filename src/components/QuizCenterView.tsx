import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { SOLAR_SYSTEM_QUIZ } from '../data/quizData';
import { useClassroom } from '../context/ClassroomContext';
import { soundEffects } from '../utils/soundEffects';
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
  const { completeQuiz, progress, setCurrentView, setSelectedPlanetId } = useClassroom();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [userAnswers, setUserAnswers] = useState<{ questionId: number; selected: number; isCorrect: boolean }[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completionResult, setCompletionResult] = useState<{ xpGained: number; isNewRecord: boolean } | null>(null);

  const currentQ = SOLAR_SYSTEM_QUIZ[currentIndex];
  const totalQuestions = SOLAR_SYSTEM_QUIZ.length; // Exactly 5!

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
      // Calculate final score
      const finalScore = userAnswers.filter(a => a.isCorrect).length + (selectedOption === currentQ.correctIndex ? 1 : 0);
      const res = completeQuiz(finalScore, totalQuestions);
      setCompletionResult(res);
      setIsCompleted(true);

      // Trigger celebration confetti on high score (>=4/5)
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
    <div className="min-h-full pb-16 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto space-y-6 pt-6">
      {/* Quiz Header */}
      <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-xl flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl font-bold text-white">5-Question Solar System Quiz</h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Demonstrate your mastery across terrestrial worlds, gas giants, rings, and orbital extremes.
          </p>
        </div>

        {progress.quizBestScore > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Best: <strong className="text-white">{progress.quizBestScore}/5</strong></span>
          </div>
        )}
      </div>

      {!isCompleted ? (
        /* Active Question Card */
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-sky-300">Question {currentIndex + 1} of {totalQuestions}</span>
              <span className="text-slate-400">{Math.round(((currentIndex) / totalQuestions) * 100)}% Complete</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
              />
            </div>
          </div>

          {/* Question Text */}
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white leading-snug">
              {currentQ.question}
            </h2>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {currentQ.options.map((option, idx) => {
              const isSelected = selectedOption === idx;
              const isCorrect = idx === currentQ.correctIndex;

              let optionStyle = 'bg-slate-950/70 border-slate-800 hover:border-sky-500/50 hover:bg-slate-850 text-slate-200';
              if (isAnswered) {
                if (isCorrect) {
                  optionStyle = 'bg-emerald-950/80 border-emerald-500 text-emerald-200 shadow-md shadow-emerald-500/10';
                } else if (isSelected) {
                  optionStyle = 'bg-rose-950/80 border-rose-500 text-rose-200';
                } else {
                  optionStyle = 'bg-slate-950/40 border-slate-850 text-slate-500';
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
                    <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 flex-shrink-0">
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

          {/* Explanation Banner (when answered) */}
          {isAnswered && (
            <div className="bg-slate-950/90 border border-slate-800 p-4 rounded-xl space-y-1.5 animate-in fade-in duration-200">
              <div className="flex items-center gap-1.5 text-xs font-bold text-sky-400 uppercase tracking-wide">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Astronomy Explanation</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {currentQ.explanation}
              </p>
            </div>
          )}

          {/* Hint and Next Button row */}
          <div className="flex items-center justify-between pt-2">
            {!isAnswered ? (
              <button
                onClick={() => setShowHint(!showHint)}
                className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-semibold"
              >
                <Lightbulb className="w-4 h-4" />
                <span>{showHint ? 'Hide Hint' : 'Need a Hint?'}</span>
              </button>
            ) : <div />}

            {isAnswered && (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-lg shadow-sky-600/30 transition-all hover:scale-105 ml-auto"
              >
                <span>{currentIndex + 1 === totalQuestions ? 'See Results' : 'Next Question'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {showHint && !isAnswered && (
            <div className="bg-amber-950/40 border border-amber-500/30 p-3 rounded-xl text-xs text-amber-200">
              <strong>Hint:</strong> {currentQ.hint}
            </div>
          )}
        </div>
      ) : (
        /* Quiz Completion Card */
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Award className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Quiz Completed!</h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              You scored <strong className="text-amber-300 text-base">{finalScore} out of 5</strong> questions correctly ({Math.round((finalScore / 5) * 100)}%).
            </p>
          </div>

          {/* Reward Summary */}
          {completionResult && (
            <div className="max-w-md mx-auto bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">XP Earned:</span>
                <span className="font-bold text-amber-300">+{completionResult.xpGained} XP</span>
              </div>
              {finalScore >= 4 && (
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
                  <span className="text-slate-400">Mission Unlocked:</span>
                  <span className="font-bold text-emerald-300">Solar Scholar Laureate 🎖️</span>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <button
              onClick={handleRestartQuiz}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retake Quiz</span>
            </button>

            <button
              onClick={() => {
                soundEffects.playClick();
                setCurrentView('missions');
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-lg shadow-sky-600/30 transition-all hover:scale-105"
            >
              <Award className="w-4 h-4" />
              <span>View Missions & Badges</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

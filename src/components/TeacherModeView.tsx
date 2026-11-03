import React, { useState } from 'react';
import { useClassroom } from '../context/ClassroomContext';
import { TEACHER_SLIDES } from '../data/teacherData';
import { soundEffects } from '../utils/soundEffects';
import {
  GraduationCap,
  Users,
  Presentation,
  Send,
  PenTool,
  Copy,
  Check,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  HelpCircle,
  FileText,
  Printer,
} from 'lucide-react';

export const TeacherModeView: React.FC = () => {
  const {
    classroomCode,
    generateNewClassroomCode,
    teacherSlideIndex,
    setTeacherSlideIndex,
    isLaserPointerActive,
    setIsLaserPointerActive,
    simulatedStudents,
    setSelectedPlanetId,
    setCurrentView,
  } = useClassroom();

  const [copiedCode, setCopiedCode] = useState(false);
  const [popQuizLaunched, setPopQuizLaunched] = useState(false);

  const currentSlide = TEACHER_SLIDES[teacherSlideIndex];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(classroomCode);
    setCopiedCode(true);
    soundEffects.playClick();
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSync3D = () => {
    soundEffects.playWarp();
    if (currentSlide.targetPlanet !== 'all') {
      setSelectedPlanetId(currentSlide.targetPlanet);
    }
    setCurrentView('solarSystem');
  };

  const handleLaunchPopQuiz = () => {
    soundEffects.playSuccess();
    setPopQuizLaunched(true);
    setTimeout(() => setPopQuizLaunched(false), 3000);
  };

  return (
    <div className="min-h-full pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 pt-6">
      {/* Teacher Desk Header Bar */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-950 border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Teacher Presentation Desk</h1>
              <p className="text-xs text-slate-400">
                Orchestrate guided 3D tours, monitor student quiz readiness, and launch class activities.
              </p>
            </div>
          </div>
        </div>

        {/* Classroom Access Code Badge */}
        <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 p-2.5 rounded-2xl">
          <div className="px-3 py-1">
            <span className="text-[10px] text-slate-400 block font-semibold uppercase">Class Code</span>
            <span className="text-base font-extrabold text-amber-300 tracking-wider">{classroomCode}</span>
          </div>

          <button
            onClick={handleCopyCode}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Copy Classroom Code"
          >
            {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          <button
            onClick={generateNewClassroomCode}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Generate New Code"
          >
            <RefreshCw className="w-4 h-4 text-sky-400" />
          </button>
        </div>
      </div>

      {/* Main Two Columns: Presentation Tour on Left, Live Roster on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Guided Tour Slide Deck */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            {/* Slide Index Progress */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Presentation className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Curriculum Slide {teacherSlideIndex + 1} of {TEACHER_SLIDES.length}
                </span>
              </div>

              {/* Laser Pointer Tool Toggle */}
              <button
                onClick={() => {
                  soundEffects.playClick();
                  setIsLaserPointerActive(!isLaserPointerActive);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  isLaserPointerActive
                    ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-md'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <PenTool className="w-3.5 h-3.5 text-rose-400" />
                <span>{isLaserPointerActive ? 'Laser Pointer: ACTIVE' : 'Laser Pointer: OFF'}</span>
              </button>
            </div>

            {/* Slide Title */}
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                {currentSlide.title}
              </h2>
            </div>

            {/* Talking Points */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Key Educational Talking Points
              </h3>
              <ul className="space-y-2">
                {currentSlide.talkingPoints.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-300 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Discussion Question Box */}
            <div className="bg-indigo-950/40 border border-indigo-500/30 p-4 rounded-2xl space-y-1 text-xs">
              <span className="font-bold text-indigo-300 uppercase tracking-wide">
                Class Discussion Prompt:
              </span>
              <p className="text-slate-200 text-sm font-medium">{currentSlide.promptQuestion}</p>
            </div>

            {/* Did You Know Highlight */}
            <div className="bg-amber-950/30 border border-amber-500/30 p-4 rounded-2xl space-y-1 text-xs">
              <span className="font-bold text-amber-300 uppercase tracking-wide flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Astronomical Highlight:
              </span>
              <p className="text-slate-200 leading-relaxed">{currentSlide.didYouKnow}</p>
            </div>

            {/* Slide Navigation Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                disabled={teacherSlideIndex === 0}
                onClick={() => {
                  soundEffects.playClick();
                  setTeacherSlideIndex(teacherSlideIndex - 1);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-semibold transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Previous Slide</span>
              </button>

              {/* Sync 3D Button */}
              <button
                onClick={handleSync3D}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all hover:scale-105"
              >
                <span>Jump 3D Solar View</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                disabled={teacherSlideIndex === TEACHER_SLIDES.length - 1}
                onClick={() => {
                  soundEffects.playClick();
                  setTeacherSlideIndex(teacherSlideIndex + 1);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-semibold transition-all"
              >
                <span>Next Slide</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Live Classroom Student Roster & Quick Actions */}
        <div className="lg:col-span-4 space-y-4">
          {/* Pop Quiz Broadcast Card */}
          <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-3xl shadow-xl space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-sky-400" />
              <span>Broadcast Quick Action</span>
            </h3>

            <p className="text-xs text-slate-400 leading-relaxed">
              Push the 5-question Solar Quiz directly to all connected students’ screens simultaneously.
            </p>

            <button
              onClick={handleLaunchPopQuiz}
              className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                popQuizLaunched
                  ? 'bg-emerald-600 text-white'
                  : 'bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-600/30 hover:scale-[1.02]'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>{popQuizLaunched ? 'Quiz Broadcasted to All!' : 'Broadcast 5-Question Pop Quiz'}</span>
            </button>
          </div>

          {/* Active Student Roster */}
          <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-3xl shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span>Classroom Roster ({simulatedStudents.length})</span>
              </h3>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>

            <div className="space-y-2.5">
              {simulatedStudents.map(student => (
                <div
                  key={student.id}
                  className="bg-slate-950/70 border border-slate-800/80 p-3 rounded-2xl flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{student.avatar}</span>
                    <div>
                      <div className="font-bold text-white">{student.name}</div>
                      <div className="text-[10px] text-slate-400">Exploring {student.currentPlanet}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-semibold text-amber-300">
                      {student.quizScore !== null ? `${student.quizScore}/5 Quiz` : 'In Progress'}
                    </div>
                    <div className="text-[10px] text-slate-500">{student.xp} XP</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

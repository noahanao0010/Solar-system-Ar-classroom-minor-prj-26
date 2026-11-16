import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useClassroom, AppView } from '../context/ClassroomContext';
import { PLANETS_DATA, ORDERED_PLANETS } from '../data/planetsData';
import { SPACECRAFTS_DATA, ORDERED_SPACECRAFT } from '../data/spaceCraftData';
import { GALAXIES_DATA, ORDERED_GALAXIES } from '../data/galaxiesData';
import {
  TeacherImportantCallout,
  TeacherMaterialItem,
  TeacherMaterialKind,
  TeacherSlideTheme,
  TeacherSlide,
  PlanetId,
} from '../types/astronomy';
import { soundEffects } from '../utils/soundEffects';
import { PageShell, SegmentedTabs } from './ui/ObservatoryPrimitives';
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
  Edit3,
  Eye,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  BookmarkCheck,
  BookOpen,
  Link2,
  Rocket,
  Orbit,
  Camera,
  Scale,
  Download,
  Upload,
  RotateCcw,
  ExternalLink,
  CopyPlus,
  Layers,
  CheckSquare,
  Square,
  Bot,
  Wand2,
  Film,
  Loader2,
} from 'lucide-react';

const THEME_LABELS: Record<TeacherSlideTheme, string> = {
  'solar-corona': 'Coronal Plasma Dive',
  'terrestrial-survey': 'Terrestrial Ecliptic Sweep',
  'asteroid-canyon': 'Asteroid Canyon Transit',
  'gas-ring-sweep': 'Saturn Ring Plane Flyby',
  'ice-frontier': 'Ice Frontier Axial Swoop',
  'spacecraft-fleet': 'Orbital Fleet Rendezvous',
  'deep-cosmos': 'Deep Cosmic Web Macro Zoom',
};

const MATERIAL_KIND_META: Record<
  TeacherMaterialKind,
  { label: string; icon: React.ReactNode; badgeClass: string }
> = {
  '3d-asset': {
    label: '3D Simulation',
    icon: <Orbit className="w-3.5 h-3.5 text-sky-400" />,
    badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  },
  'ar-lab': {
    label: 'Camera AR Lab',
    icon: <Camera className="w-3.5 h-3.5 text-rose-400" />,
    badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  },
  compare: {
    label: 'Scale Compare',
    icon: <Scale className="w-3.5 h-3.5 text-indigo-400" />,
    badgeClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  },
  quiz: {
    label: 'Assessment Quiz',
    icon: <HelpCircle className="w-3.5 h-3.5 text-amber-400" />,
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  worksheet: {
    label: 'Class Activity',
    icon: <BookOpen className="w-3.5 h-3.5 text-emerald-400" />,
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  'external-ref': {
    label: 'Reference Material',
    icon: <Link2 className="w-3.5 h-3.5 text-cyan-400" />,
    badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  },
};

interface AgentVisualSuggestion {
  title: string;
  animationType: string;
  cameraChoreography: string;
  theme: TeacherSlideTheme;
  targetPlanet: string;
  arActivityIdea: string;
}

interface AgentProposedSlide {
  title: string;
  subheading?: string;
  targetPlanet?: string;
  theme?: TeacherSlideTheme;
  talkingPoints?: string[];
  promptQuestion?: string;
  didYouKnow?: string;
  narrationScript?: string;
  prerequisites?: string[];
  customImportantHeading?: string;
  customImportantContent?: string;
  customImportantSeverity?: TeacherImportantCallout['severity'];
  materials?: {
    title: string;
    kind: TeacherMaterialKind;
    targetView: TeacherMaterialItem['targetView'];
    targetAssetId?: string;
    note?: string;
  }[];
}

interface AgentChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestions?: AgentVisualSuggestion[];
  includeProposedSlide?: boolean;
  proposedSlide?: AgentProposedSlide;
}

const VALID_THEMES: TeacherSlideTheme[] = [
  'solar-corona',
  'terrestrial-survey',
  'asteroid-canyon',
  'gas-ring-sweep',
  'ice-frontier',
  'spacecraft-fleet',
  'deep-cosmos',
];

const STARTER_AGENT_PROMPTS = [
  'Suggest a dramatic 3D Saturn ring-plane flyby animation and AR gravity activity',
  'Design an animated Solar Corona & Earth magnetosphere shield visual lesson',
  'Build a new Mars Rover exploration slide with visual transitions & talking points',
  'Recommend visual animations and quiz hooks to teach exoplanet orbits',
];

export const TeacherModeView: React.FC = () => {
  const {
    classroomCode,
    generateNewClassroomCode,
    teacherSlides,
    updateTeacherSlide,
    addTeacherSlide,
    duplicateTeacherSlide,
    deleteTeacherSlide,
    moveTeacherSlide,
    resetTeacherSlides,
    importTeacherSlides,
    teacherSlideIndex,
    setTeacherSlideIndex,
    isLaserPointerActive,
    setIsLaserPointerActive,
    simulatedStudents,
    setSelectedPlanetId,
    setCurrentView,
    setIsTeacherPresenting3D,
  } = useClassroom();

  const [studioTab, setStudioTab] = useState<'present' | 'edit' | 'agent'>('present');
  const [copiedCode, setCopiedCode] = useState(false);
  const [popQuizLaunched, setPopQuizLaunched] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const [checkedPrereqs, setCheckedPrereqs] = useState<Record<string, boolean>>({});

  // Visual Animated Presentation Agentic Chat State
  const [agentMessages, setAgentMessages] = useState<AgentChatMessage[]>([
    {
      id: 'agent-welcome',
      role: 'assistant',
      content:
        'Describe your lesson goal or ask for visual animation ideas for the active slide. I will recommend 3D camera choreography, AR physics labs, and ready-to-apply animated slides.',
    },
  ]);
  const [agentInput, setAgentInput] = useState('');
  const [isAgentLoading, setIsAgentLoading] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [agentAppliedToast, setAgentAppliedToast] = useState<string | null>(null);

  // Draft inputs for fast adding of Dependencies & Materials in Edit mode
  const [newPrereqText, setNewPrereqText] = useState('');
  const [newPointText, setNewPointText] = useState('');
  const [matTitle, setMatTitle] = useState('');
  const [matKind, setMatKind] = useState<TeacherMaterialKind>('3d-asset');
  const [matView, setMatView] = useState<NonNullable<TeacherMaterialItem['targetView']>>('explorer');
  const [matAssetId, setMatAssetId] = useState<string>('earth');
  const [matNote, setMatNote] = useState('');
  const [matUrl, setMatUrl] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const safeIndex = Math.min(teacherSlideIndex, Math.max(0, teacherSlides.length - 1));
  const currentSlide = teacherSlides[safeIndex] || teacherSlides[0];
  const themeLabel = currentSlide?.theme ? THEME_LABELS[currentSlide.theme] : THEME_LABELS['deep-cosmos'];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(classroomCode);
    setCopiedCode(true);
    soundEffects.playClick();
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSync3D = () => {
    soundEffects.playWarp();
    setIsTeacherPresenting3D(true);
    if (currentSlide.targetPlanet !== 'all' && currentSlide.targetPlanet in PLANETS_DATA) {
      setSelectedPlanetId(currentSlide.targetPlanet as PlanetId);
    }
    setCurrentView('solarSystem');
  };

  const handleLaunchPopQuiz = () => {
    soundEffects.playSuccess();
    setPopQuizLaunched(true);
    setTimeout(() => setPopQuizLaunched(false), 3000);
  };

  const handleLaunchMaterial = (mat: TeacherMaterialItem) => {
    soundEffects.playClick();
    if (mat.targetAssetId && mat.targetAssetId in PLANETS_DATA) {
      setSelectedPlanetId(mat.targetAssetId as PlanetId);
    }
    if (mat.targetView === 'solarSystem') {
      setIsTeacherPresenting3D(false);
    }
    if (mat.targetView) {
      setCurrentView(mat.targetView);
    }
  };

  const handleExportDeck = () => {
    soundEffects.playSuccess();
    const blob = new Blob([JSON.stringify(teacherSlides, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `astronomy-lesson-deck-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const ok = importTeacherSlides(parsed);
        setImportFeedback(ok ? `Imported ${parsed.length} slides successfully.` : 'Invalid lesson deck file format.');
      } catch {
        setImportFeedback('Could not read JSON file.');
      }
      setTimeout(() => setImportFeedback(null), 3500);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Helpers to modify current slide fields cleanly
  const addPrerequisite = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const existing = currentSlide.prerequisites || [];
    if (existing.includes(trimmed)) return;
    updateTeacherSlide(safeIndex, { prerequisites: [...existing, trimmed] });
    setNewPrereqText('');
    soundEffects.playClick();
  };

  const removePrerequisite = (idx: number) => {
    const next = (currentSlide.prerequisites || []).filter((_, i) => i !== idx);
    updateTeacherSlide(safeIndex, { prerequisites: next });
    soundEffects.playClick();
  };

  const addTalkingPoint = () => {
    const trimmed = newPointText.trim();
    if (!trimmed) return;
    updateTeacherSlide(safeIndex, {
      talkingPoints: [...currentSlide.talkingPoints, trimmed],
    });
    setNewPointText('');
    soundEffects.playClick();
  };

  const updateTalkingPoint = (idx: number, val: string) => {
    const next = [...currentSlide.talkingPoints];
    next[idx] = val;
    updateTeacherSlide(safeIndex, { talkingPoints: next });
  };

  const removeTalkingPoint = (idx: number) => {
    if (currentSlide.talkingPoints.length <= 1) return;
    updateTeacherSlide(safeIndex, {
      talkingPoints: currentSlide.talkingPoints.filter((_, i) => i !== idx),
    });
    soundEffects.playClick();
  };

  const addMaterialItem = () => {
    const trimmed = matTitle.trim();
    if (!trimmed) return;
    const item: TeacherMaterialItem = {
      id: `mat-${Date.now()}`,
      title: trimmed,
      kind: matKind,
      targetView: matKind === 'external-ref' ? undefined : matView,
      targetAssetId: matKind === 'quiz' || matKind === 'external-ref' ? undefined : matAssetId,
      note: matNote.trim() || undefined,
      url: matKind === 'external-ref' ? matUrl.trim() || undefined : undefined,
    };
    updateTeacherSlide(safeIndex, {
      materials: [...(currentSlide.materials || []), item],
    });
    setMatTitle('');
    setMatNote('');
    setMatUrl('');
    soundEffects.playSuccess();
  };

  const removeMaterialItem = (id: string) => {
    updateTeacherSlide(safeIndex, {
      materials: (currentSlide.materials || []).filter(m => m.id !== id),
    });
    soundEffects.playClick();
  };

  const updateCustomImportant = (patch: Partial<TeacherImportantCallout> | null) => {
    if (patch === null) {
      updateTeacherSlide(safeIndex, { customImportant: undefined });
      return;
    }
    const base: TeacherImportantCallout = currentSlide.customImportant || {
      heading: 'Important Concept',
      content: '',
      severity: 'exam-focus',
    };
    updateTeacherSlide(safeIndex, {
      customImportant: { ...base, ...patch },
    });
  };

  // Visual Animated Presentation Agentic Chat Handlers
  const showAppliedBanner = (msg: string) => {
    setAgentAppliedToast(msg);
    setTimeout(() => setAgentAppliedToast(prev => (prev === msg ? null : prev)), 3200);
  };

  const normalizeTheme = (t?: string): TeacherSlideTheme => {
    if (t && VALID_THEMES.includes(t as TeacherSlideTheme)) return t as TeacherSlideTheme;
    return 'deep-cosmos';
  };

  const buildSlidePatchFromAgent = (draft: AgentProposedSlide): Partial<TeacherSlide> => {
    const patch: Partial<TeacherSlide> = {
      title: draft.title || currentSlide.title,
      subheading: draft.subheading || currentSlide.subheading,
      targetPlanet: (draft.targetPlanet || currentSlide.targetPlanet) as TeacherSlide['targetPlanet'],
      theme: normalizeTheme(draft.theme),
      talkingPoints:
        Array.isArray(draft.talkingPoints) && draft.talkingPoints.length > 0
          ? draft.talkingPoints
          : currentSlide.talkingPoints,
      promptQuestion: draft.promptQuestion || currentSlide.promptQuestion,
      didYouKnow: draft.didYouKnow || currentSlide.didYouKnow,
      narrationScript: draft.narrationScript || currentSlide.narrationScript,
      prerequisites: Array.isArray(draft.prerequisites) ? draft.prerequisites : currentSlide.prerequisites,
    };

    if (draft.customImportantContent) {
      patch.customImportant = {
        heading: draft.customImportantHeading || 'Important Concept',
        content: draft.customImportantContent,
        severity: draft.customImportantSeverity || 'exam-focus',
      };
    }

    if (Array.isArray(draft.materials) && draft.materials.length > 0) {
      patch.materials = draft.materials.map((m, i) => ({
        id: `ai-mat-${Date.now()}-${i}`,
        title: m.title,
        kind: m.kind || '3d-asset',
        targetView: m.targetView || 'solarSystem',
        targetAssetId: m.targetAssetId,
        note: m.note,
      }));
    }

    return patch;
  };

  const handleApplyAgentSlideToCurrent = (draft: AgentProposedSlide) => {
    soundEffects.playSuccess();
    updateTeacherSlide(safeIndex, buildSlidePatchFromAgent(draft));
    showAppliedBanner(`Updated Slide #${safeIndex + 1} with AI animated presentation blueprint`);
  };

  const handleInsertAgentSlideAsNew = (draft: AgentProposedSlide) => {
    soundEffects.playSuccess();
    const patch = buildSlidePatchFromAgent(draft);
    const nextSlide: TeacherSlide = {
      id: Date.now(),
      title: patch.title || `${teacherSlides.length + 1}. Animated Astronomy Module`,
      subheading: patch.subheading,
      targetPlanet: patch.targetPlanet || 'earth',
      theme: patch.theme || 'terrestrial-survey',
      talkingPoints: patch.talkingPoints || ['Explore live 3D simulation.'],
      promptQuestion: patch.promptQuestion || 'What pattern stands out in this 3D simulation?',
      didYouKnow: patch.didYouKnow || 'Use 3D Holo-Cards to inspect physical constants live.',
      narrationScript: patch.narrationScript,
      prerequisites: patch.prerequisites,
      customImportant: patch.customImportant,
      materials: patch.materials || [],
    };
    const nextDeck = [...teacherSlides, nextSlide];
    importTeacherSlides(nextDeck);
    setTeacherSlideIndex(nextDeck.length - 1);
    showAppliedBanner(`Inserted Slide #${nextDeck.length}: ${nextSlide.title}`);
  };

  const handleApplySuggestionChoreography = (sug: AgentVisualSuggestion, launchNow = false) => {
    const theme = normalizeTheme(sug.theme);
    const target = (sug.targetPlanet || currentSlide.targetPlanet) as TeacherSlide['targetPlanet'];
    updateTeacherSlide(safeIndex, {
      theme,
      targetPlanet: target,
    });
    soundEffects.playWarp();
    showAppliedBanner(`Applied "${THEME_LABELS[theme]}" choreography to Slide #${safeIndex + 1}`);
    if (launchNow) {
      setIsTeacherPresenting3D(true);
      if (target !== 'all' && target in PLANETS_DATA) {
        setSelectedPlanetId(target as PlanetId);
      }
      setCurrentView('solarSystem');
    }
  };

  const handleSendAgentPrompt = async (customText?: string) => {
    const promptText = (customText ?? agentInput).trim();
    if (!promptText || isAgentLoading) return;

    const userMsg: AgentChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: promptText,
    };

    const nextMessages = [...agentMessages, userMsg];
    setAgentMessages(nextMessages);
    if (!customText) setAgentInput('');
    setAgentError(null);
    setIsAgentLoading(true);
    soundEffects.playClick();

    try {
      const response = await fetch('/api/teacher/presentation-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: promptText,
          history: nextMessages.slice(-6).map(m => ({ role: m.role, content: m.content })),
          currentSlide,
          allSlideTitles: teacherSlides.map(s => s.title),
          slideIndex: safeIndex,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || `Request failed with status ${response.status}`);
      }

      const agentReply: AgentChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.assistantMessage || 'Generated visual presentation suggestions.',
        suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
        includeProposedSlide: Boolean(data.includeProposedSlide && data.proposedSlide),
        proposedSlide: data.proposedSlide,
      };
      setAgentMessages(prev => [...prev, agentReply]);
      soundEffects.playSuccess();
    } catch (err: any) {
      setAgentError(err?.message || 'Unable to reach Presentation Architect Agent.');
    } finally {
      setIsAgentLoading(false);
    }
  };

  const severityStyles = (severity: TeacherImportantCallout['severity']) => {
    if (severity === 'critical') {
      return {
        wrapper: 'bg-rose-950/35 border-rose-500/40',
        label: 'text-rose-300',
        badge: 'bg-rose-500/20 text-rose-200 border-rose-500/40',
        tag: 'Critical Safety / Physics',
      };
    }
    if (severity === 'exam-focus') {
      return {
        wrapper: 'bg-amber-950/30 border-amber-500/40',
        label: 'text-amber-300',
        badge: 'bg-amber-500/20 text-amber-200 border-amber-500/40',
        tag: 'Key Exam Takeaway',
      };
    }
    return {
      wrapper: 'bg-cyan-950/30 border-cyan-500/40',
      label: 'text-cyan-300',
      badge: 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40',
      tag: 'Classroom Lab Note',
    };
  };

  return (
    <PageShell maxWidth="7xl">
      {/* Hidden JSON importer */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleImportFile}
      />

      {/* Educator Studio Header Bar */}
      <section className="glass-panel-elevated p-5 sm:p-6 rounded-3xl space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/35 text-indigo-300 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-indigo-300">
                Educator Studio · Curriculum & 3D Lesson Builder
              </div>
              <h1 className="font-display text-xl sm:text-2xl font-bold text-white">
                Teacher Presentation & Materials Studio
              </h1>
              <p className="text-xs text-slate-300 mt-0.5">
                Present guided 3D lessons, define slide dependencies, attach interactive AR/3D materials, and highlight custom important takeaways.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-between lg:justify-end">
            <SegmentedTabs<'present' | 'edit' | 'agent'>
              layoutId="teacher-studio-tab"
              value={studioTab}
              onChange={v => {
                soundEffects.playClick();
                setStudioTab(v);
              }}
              items={[
                { id: 'present', label: 'Present Lesson', icon: <Eye className="w-3.5 h-3.5" /> },
                { id: 'edit', label: 'Edit & Customize', icon: <Edit3 className="w-3.5 h-3.5" /> },
                { id: 'agent', label: 'Visual AI Agent', icon: <Bot className="w-3.5 h-3.5" /> },
              ]}
            />

            {/* Classroom Code */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl">
              <div className="pr-1.5">
                <span className="text-[9px] font-mono text-slate-400 block uppercase">Class Code</span>
                <span className="text-sm font-mono font-extrabold text-amber-300 tracking-wider tabular-nums">
                  {classroomCode}
                </span>
              </div>
              <button
                onClick={handleCopyCode}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                title="Copy Class Code"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={generateNewClassroomCode}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                title="Generate New Code"
              >
                <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Slide Deck Quick Strip + Deck Management Toolbar */}
        <div className="pt-3 border-t border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {teacherSlides.map((slide, idx) => {
              const active = idx === safeIndex;
              const hasImportant = Boolean(slide.customImportant?.content);
              const depCount = slide.prerequisites?.length || 0;
              return (
                <button
                  key={slide.id}
                  onClick={() => {
                    soundEffects.playClick();
                    setTeacherSlideIndex(idx);
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs whitespace-nowrap border transition-colors ${
                    active
                      ? 'bg-indigo-600/25 border-indigo-400 text-white font-semibold'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <span className="font-mono text-[10px] text-indigo-300 tabular-nums">#{idx + 1}</span>
                  <span className="max-w-[130px] truncate">{slide.title.replace(/^\d+\.\s*/, '')}</span>
                  {hasImportant && <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0" />}
                  {depCount > 0 && (
                    <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                      ({depCount} dep)
                    </span>
                  )}
                </button>
              );
            })}

            <button
              onClick={addTeacherSlide}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-300 text-xs font-semibold whitespace-nowrap transition-colors"
              title="Add New Curriculum Slide"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Slide</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => duplicateTeacherSlide(safeIndex)}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs"
              title="Duplicate Current Slide"
            >
              <CopyPlus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleExportDeck}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs"
              title="Export Lesson Deck (JSON)"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs"
              title="Import Lesson Deck (JSON)"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>

            {confirmReset ? (
              <div className="flex items-center gap-1 bg-rose-950/70 border border-rose-500/40 rounded-lg px-2 py-1 text-[11px]">
                <span className="text-rose-200">Reset all?</span>
                <button
                  onClick={() => {
                    resetTeacherSlides();
                    setConfirmReset(false);
                  }}
                  className="font-bold text-rose-300 hover:underline px-1"
                >
                  Yes
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="text-slate-400 hover:text-white px-1"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmReset(true)}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-amber-300 text-xs"
                title="Reset Slides to Default Curriculum"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {importFeedback && (
          <div className="text-xs font-medium text-sky-300 bg-sky-950/50 border border-sky-500/30 rounded-xl px-3 py-2">
            {importFeedback}
          </div>
        )}
      </section>

      {/* Main Layout: Left 8 Cols Slide Canvas / Authoring Studio, Right 4 Cols Class Readiness & Roster */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
            {/* Top Meta Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/90 pb-4">
              <div className="flex items-center gap-2">
                <Presentation className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider tabular-nums">
                  Slide {safeIndex + 1} / {teacherSlides.length}
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-xs font-mono text-sky-300">{themeLabel}</span>
              </div>

              <div className="flex items-center gap-2">
                {studioTab === 'edit' && (
                  <>
                    <button
                      disabled={safeIndex === 0}
                      onClick={() => moveTeacherSlide(safeIndex, 'up')}
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-35"
                      title="Move Slide Earlier"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      disabled={safeIndex === teacherSlides.length - 1}
                      onClick={() => moveTeacherSlide(safeIndex, 'down')}
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-35"
                      title="Move Slide Later"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      disabled={teacherSlides.length <= 1}
                      onClick={() => deleteTeacherSlide(safeIndex)}
                      className="p-1.5 rounded-lg bg-rose-950/50 border border-rose-500/35 text-rose-300 hover:bg-rose-900/60 disabled:opacity-35"
                      title="Delete This Slide"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}

                <button
                  onClick={() => {
                    soundEffects.playClick();
                    setIsLaserPointerActive(!isLaserPointerActive);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                    isLaserPointerActive
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                      : 'bg-slate-900/90 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <PenTool className="w-3.5 h-3.5 text-rose-400" />
                  <span>{isLaserPointerActive ? 'Laser Pointer: ON' : 'Laser Pointer'}</span>
                </button>
              </div>
            </div>

            {/* TAB 1: PRESENT MODE */}
            {studioTab === 'present' && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide.id}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
                        {currentSlide.title}
                      </h2>
                      {currentSlide.subheading && (
                        <p className="text-xs font-mono text-indigo-300/90 mt-1">{currentSlide.subheading}</p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        soundEffects.playClick();
                        setStudioTab('agent');
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/40 text-sky-200 text-xs font-semibold whitespace-nowrap transition-colors"
                    >
                      <Wand2 className="w-3.5 h-3.5 text-sky-400" />
                      <span>AI Animation Ideas</span>
                    </button>
                  </div>

                  {/* Prerequisites / Lesson Dependencies Checklist */}
                  {currentSlide.prerequisites && currentSlide.prerequisites.length > 0 && (
                    <div className="bg-slate-950/65 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-slate-400">
                        <span className="flex items-center gap-1.5 text-sky-300 font-semibold">
                          <Layers className="w-3.5 h-3.5" />
                          Prerequisites & Topic Dependencies
                        </span>
                        <span>Click to verify ready</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {currentSlide.prerequisites.map((dep, idx) => {
                          const key = `${currentSlide.id}-${idx}`;
                          const done = Boolean(checkedPrereqs[key]);
                          return (
                            <button
                              key={key}
                              onClick={() => {
                                soundEffects.playClick();
                                setCheckedPrereqs(prev => ({ ...prev, [key]: !prev[key] }));
                              }}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border transition-colors ${
                                done
                                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200 line-through'
                                  : 'bg-slate-900 border-slate-700 text-slate-200 hover:border-sky-500/50'
                              }`}
                            >
                              {done ? (
                                <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Square className="w-3.5 h-3.5 text-slate-400" />
                              )}
                              <span>{dep}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Custom Important Banner */}
                  {currentSlide.customImportant && currentSlide.customImportant.content && (
                    (() => {
                      const s = severityStyles(currentSlide.customImportant.severity);
                      return (
                        <div className={`border p-4 rounded-2xl space-y-1.5 ${s.wrapper}`}>
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 ${s.label}`}>
                              <AlertTriangle className="w-4 h-4" />
                              {currentSlide.customImportant.heading || 'Important Note'}
                            </span>
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${s.badge}`}>
                              {s.tag}
                            </span>
                          </div>
                          <p className="text-sm text-slate-100 leading-relaxed">
                            {currentSlide.customImportant.content}
                          </p>
                        </div>
                      );
                    })()
                  )}

                  {/* Talking Points */}
                  <div className="space-y-2.5">
                    <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-300">
                      Key Educational Talking Points
                    </h3>
                    <ul className="space-y-2">
                      {currentSlide.talkingPoints.map((point, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-200 leading-relaxed">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Class Discussion & Highlight */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-indigo-950/35 border border-indigo-500/25 p-4 rounded-2xl space-y-1 text-xs">
                      <span className="font-mono font-bold text-indigo-300 uppercase tracking-wider">
                        Class Discussion Prompt
                      </span>
                      <p className="text-slate-100 text-sm font-medium leading-relaxed">
                        {currentSlide.promptQuestion}
                      </p>
                    </div>

                    <div className="bg-amber-950/25 border border-amber-500/25 p-4 rounded-2xl space-y-1 text-xs">
                      <span className="font-mono font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        Astronomical Highlight
                      </span>
                      <p className="text-slate-100 leading-relaxed">{currentSlide.didYouKnow}</p>
                    </div>
                  </div>

                  {/* Attached Teaching Materials & 1-Click Launchable Assets */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                        <BookmarkCheck className="w-3.5 h-3.5" />
                        <span>Attached Teaching Materials & Interactive Assets</span>
                      </h3>
                      <button
                        onClick={() => {
                          soundEffects.playClick();
                          setStudioTab('edit');
                        }}
                        className="text-[11px] text-sky-300 hover:underline font-medium"
                      >
                        + Manage Materials
                      </button>
                    </div>

                    {currentSlide.materials && currentSlide.materials.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {currentSlide.materials.map(mat => {
                          const meta = MATERIAL_KIND_META[mat.kind];
                          return (
                            <div
                              key={mat.id}
                              className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 flex flex-col justify-between gap-2"
                            >
                              <div className="space-y-1">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border ${meta.badgeClass}`}>
                                  {meta.icon}
                                  <span>{meta.label}</span>
                                </span>
                                <div className="text-xs font-bold text-white">{mat.title}</div>
                                {mat.note && <p className="text-[11px] text-slate-400">{mat.note}</p>}
                              </div>

                              {mat.url ? (
                                <a
                                  href={mat.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-cyan-300 hover:text-cyan-200"
                                >
                                  <span>Open Reference Link</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : mat.targetView ? (
                                <button
                                  onClick={() => handleLaunchMaterial(mat)}
                                  className="inline-flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sky-300 text-[11px] font-semibold transition-colors"
                                >
                                  <span>Launch Activity</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 bg-slate-950/50 border border-slate-800/80 rounded-2xl p-3.5">
                        No materials attached to this slide yet. Switch to <button onClick={() => setStudioTab('edit')} className="text-sky-300 underline">Edit & Customize</button> to attach 3D scenes, AR labs, quizzes, or links.
                      </div>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            )}

            {/* TAB 2: EDIT & CUSTOMIZE */}
            {studioTab === 'edit' && (
              <div className="space-y-6">
                {/* Section A: Title, Linked 3D Asset & Flyby Camera Theme */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-sky-300 flex items-center gap-1.5">
                      <Rocket className="w-3.5 h-3.5" />
                      1. Slide Identity & 3D Camera Sync
                    </h3>
                    <button
                      onClick={() => setStudioTab('present')}
                      className="text-xs text-emerald-300 hover:underline font-semibold"
                    >
                      Done Editing
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Slide Title</label>
                      <input
                        type="text"
                        value={currentSlide.title}
                        onChange={e => updateTeacherSlide(safeIndex, { title: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Subheading</label>
                      <input
                        type="text"
                        value={currentSlide.subheading || ''}
                        onChange={e => updateTeacherSlide(safeIndex, { subheading: e.target.value })}
                        placeholder="Core theme summary..."
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Focus 3D Object / Asset</label>
                      <select
                        value={currentSlide.targetPlanet}
                        onChange={e => updateTeacherSlide(safeIndex, { targetPlanet: e.target.value as any })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
                      >
                        <option value="all">Full Solar System Overview</option>
                        <optgroup label="Sun & Planets">
                          {ORDERED_PLANETS.map(p => (
                            <option key={p} value={p}>{PLANETS_DATA[p].name}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Spacecraft & Observatories">
                          {ORDERED_SPACECRAFT.map(s => (
                            <option key={s} value={s}>{SPACECRAFTS_DATA[s].name}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Galaxies & Deep Cosmos">
                          {ORDERED_GALAXIES.map(g => (
                            <option key={g} value={g}>{GALAXIES_DATA[g].name}</option>
                          ))}
                        </optgroup>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">3D Flyby Animation Theme</label>
                      <select
                        value={currentSlide.theme || 'deep-cosmos'}
                        onChange={e => updateTeacherSlide(safeIndex, { theme: e.target.value as TeacherSlideTheme })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
                      >
                        {(Object.keys(THEME_LABELS) as TeacherSlideTheme[]).map(t => (
                          <option key={t} value={t}>{THEME_LABELS[t]}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section B: Talking Points & Class Questions */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-300">
                    2. Talking Points, Question & Highlight
                  </h3>

                  <div className="space-y-2">
                    {currentSlide.talkingPoints.map((pt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={pt}
                          onChange={e => updateTalkingPoint(idx, e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          disabled={currentSlide.talkingPoints.length <= 1}
                          onClick={() => removeTalkingPoint(idx)}
                          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 disabled:opacity-30"
                          title="Remove Talking Point"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newPointText}
                        onChange={e => setNewPointText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addTalkingPoint()}
                        placeholder="Add new key talking point..."
                        className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        onClick={addTalkingPoint}
                        className="px-3 py-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-semibold flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Discussion Question</label>
                      <textarea
                        rows={2}
                        value={currentSlide.promptQuestion}
                        onChange={e => updateTeacherSlide(safeIndex, { promptQuestion: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Did You Know? Highlight</label>
                      <textarea
                        rows={2}
                        value={currentSlide.didYouKnow}
                        onChange={e => updateTeacherSlide(safeIndex, { didYouKnow: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Section C: Custom Important Callout */}
                <div className="bg-slate-950/60 border border-amber-500/30 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      3. Custom Important Callout Box
                    </h3>
                    {currentSlide.customImportant && (
                      <button
                        onClick={() => updateCustomImportant(null)}
                        className="text-[11px] text-slate-400 hover:text-rose-300"
                      >
                        Remove Callout
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Importance Type</label>
                      <select
                        value={currentSlide.customImportant?.severity || 'exam-focus'}
                        onChange={e =>
                          updateCustomImportant({
                            severity: e.target.value as TeacherImportantCallout['severity'],
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                      >
                        <option value="critical">Critical Safety / Physics Rule</option>
                        <option value="exam-focus">Exam Focus / Misconception Alert</option>
                        <option value="lab-note">Classroom Lab Instruction</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Callout Heading</label>
                      <input
                        type="text"
                        value={currentSlide.customImportant?.heading || ''}
                        onChange={e => updateCustomImportant({ heading: e.target.value })}
                        placeholder="e.g., Exam Concept: Greenhouse Effect"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Important Message for Class</label>
                    <textarea
                      rows={2}
                      value={currentSlide.customImportant?.content || ''}
                      onChange={e => updateCustomImportant({ content: e.target.value })}
                      placeholder="Write a clear rule, formula warning, or key takeaway displayed prominently..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                    />
                  </div>
                </div>

                {/* Section D: Dependencies & Teaching Materials */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-4">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    4. Lesson Dependencies & Attached Teaching Materials
                  </h3>

                  {/* Prerequisites / Dependencies */}
                  <div className="space-y-2">
                    <label className="text-[11px] text-slate-300 font-semibold block">
                      Prerequisites / Dependencies (What students should know first)
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {(currentSlide.prerequisites || []).map((dep, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200"
                        >
                          <span>{dep}</span>
                          <button
                            onClick={() => removePrerequisite(idx)}
                            className="text-slate-400 hover:text-rose-400"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={newPrereqText}
                        onChange={e => setNewPrereqText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addPrerequisite(newPrereqText)}
                        placeholder="Add prerequisite topic or tool..."
                        className="flex-1 min-w-[200px] px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                      />
                      <button
                        onClick={() => addPrerequisite(newPrereqText)}
                        className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold"
                      >
                        Add Dependency
                      </button>
                    </div>

                    {/* Quick 1-click dependency chips from prior slides */}
                    {safeIndex > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] text-slate-400">Quick link prior slide:</span>
                        {teacherSlides.slice(0, safeIndex).map((prevS, pIdx) => (
                          <button
                            key={prevS.id}
                            onClick={() => addPrerequisite(`Slide #${pIdx + 1}: ${prevS.title.replace(/^\d+\.\s*/, '')}`)}
                            className="text-[10px] px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sky-300"
                          >
                            + #{pIdx + 1}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Teaching Materials Builder */}
                  <div className="pt-3 border-t border-slate-800 space-y-3">
                    <label className="text-[11px] text-slate-300 font-semibold block">
                      Attach Interactive App Assets & External Teaching Materials
                    </label>

                    {(currentSlide.materials || []).length > 0 && (
                      <div className="space-y-1.5">
                        {currentSlide.materials!.map(mat => (
                          <div
                            key={mat.id}
                            className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {MATERIAL_KIND_META[mat.kind].icon}
                              <span className="font-semibold text-white truncate">{mat.title}</span>
                              {mat.targetView && (
                                <span className="text-[10px] font-mono text-slate-400">({mat.targetView})</span>
                              )}
                            </div>
                            <button
                              onClick={() => removeMaterialItem(mat.id)}
                              className="text-slate-400 hover:text-rose-400 flex-shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-900/70 p-3 rounded-xl border border-slate-800">
                      <input
                        type="text"
                        value={matTitle}
                        onChange={e => setMatTitle(e.target.value)}
                        placeholder="Material title (e.g., Inspect Saturn Rings AR)"
                        className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                      />
                      <select
                        value={matKind}
                        onChange={e => {
                          const k = e.target.value as TeacherMaterialKind;
                          setMatKind(k);
                          if (k === 'ar-lab') setMatView('cameraAR');
                          else if (k === 'compare') setMatView('compare');
                          else if (k === 'quiz') setMatView('quiz');
                          else if (k === 'worksheet') setMatView('missions');
                          else setMatView('explorer');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                      >
                        <option value="3d-asset">3D Explorer / Simulation</option>
                        <option value="ar-lab">Camera AR Lab</option>
                        <option value="compare">Scale Compare View</option>
                        <option value="quiz">Assessment Quiz</option>
                        <option value="worksheet">Missions / Activity Log</option>
                        <option value="external-ref">External Web Resource</option>
                      </select>

                      {matKind !== 'external-ref' && matKind !== 'quiz' && (
                        <select
                          value={matAssetId}
                          onChange={e => setMatAssetId(e.target.value)}
                          className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                        >
                          {ORDERED_PLANETS.map(p => (
                            <option key={p} value={p}>{PLANETS_DATA[p].name}</option>
                          ))}
                        </select>
                      )}

                      {matKind === 'external-ref' && (
                        <input
                          type="url"
                          value={matUrl}
                          onChange={e => setMatUrl(e.target.value)}
                          placeholder="https://nasa.gov/..."
                          className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                        />
                      )}

                      <input
                        type="text"
                        value={matNote}
                        onChange={e => setMatNote(e.target.value)}
                        placeholder="Short instruction note (optional)"
                        className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                      />

                      <button
                        onClick={addMaterialItem}
                        className="sm:col-span-2 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Attach Teaching Material to Slide</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: VISUAL ANIMATED PRESENTATION AGENTIC CHAT */}
            {studioTab === 'agent' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-300">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        Visual Animated Presentation Architect
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Powered by Gemini · Designs 3D flyby choreography, AR physics labs & ready-to-present slides
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-sky-300 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg">
                    Active: Slide #{safeIndex + 1}
                  </span>
                </div>

                {agentAppliedToast && (
                  <div className="rounded-xl bg-emerald-500/15 border border-emerald-400/50 px-3.5 py-2 text-xs text-emerald-200 font-semibold flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>{agentAppliedToast}</span>
                  </div>
                )}

                {agentError && (
                  <div className="rounded-xl bg-rose-950/60 border border-rose-500/40 px-3.5 py-2.5 text-xs text-rose-200 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">Presentation Agent Unavailable</div>
                      <div className="text-rose-200/90 mt-0.5">{agentError}</div>
                    </div>
                  </div>
                )}

                {/* Starter Prompt Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {STARTER_AGENT_PROMPTS.map((starter, i) => (
                    <button
                      key={i}
                      disabled={isAgentLoading}
                      onClick={() => handleSendAgentPrompt(starter)}
                      className="text-left text-[11px] px-2.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-sky-200 transition-colors disabled:opacity-50"
                    >
                      + {starter}
                    </button>
                  ))}
                </div>

                {/* Chat Messages & Visual Storyboard Cards */}
                <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
                  {agentMessages.map(msg => (
                    <div
                      key={msg.id}
                      className={`rounded-2xl p-4 space-y-3 border ${
                        msg.role === 'user'
                          ? 'bg-indigo-950/40 border-indigo-500/35 ml-6'
                          : 'bg-slate-950/75 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-400">
                        <span className={msg.role === 'user' ? 'text-indigo-300 font-bold' : 'text-sky-300 font-bold'}>
                          {msg.role === 'user' ? 'Educator' : 'Presentation Architect AI'}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-100 leading-relaxed">{msg.content}</p>

                      {/* Visual Animated Presentation Suggestions */}
                      {msg.suggestions && msg.suggestions.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          {msg.suggestions.map((sug, sIdx) => {
                            const sTheme = normalizeTheme(sug.theme);
                            return (
                              <div
                                key={sIdx}
                                className="rounded-xl bg-slate-900/95 border border-slate-700/80 p-3.5 space-y-2.5 flex flex-col justify-between"
                              >
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                                    <span className="text-amber-300 font-bold flex items-center gap-1">
                                      <Film className="w-3 h-3" />
                                      {sug.animationType}
                                    </span>
                                    <span className="text-sky-300 truncate">{sug.targetPlanet}</span>
                                  </div>

                                  {/* Miniature Animated Camera Path Motion Preview */}
                                  <div className="relative h-8 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden flex items-center px-2">
                                    <div className="w-full h-px bg-slate-700" />
                                    <motion.div
                                      animate={{ x: [0, 140, 0] }}
                                      transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
                                      className="absolute left-2 w-5 h-2 rounded-full bg-gradient-to-r from-sky-400 to-indigo-400 shadow-sm shadow-sky-400/50"
                                    />
                                    <span className="ml-auto relative z-10 text-[9px] font-mono text-slate-400 bg-slate-950/90 px-1.5">
                                      {THEME_LABELS[sTheme]}
                                    </span>
                                  </div>

                                  <div className="text-xs font-bold text-white">{sug.title}</div>
                                  <p className="text-[11px] text-slate-300 leading-relaxed">
                                    {sug.cameraChoreography}
                                  </p>
                                  <div className="text-[11px] text-emerald-300/90 bg-emerald-950/30 border border-emerald-500/20 rounded-lg px-2 py-1.5">
                                    AR Activity: {sug.arActivityIdea}
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-1.5 pt-1">
                                  <button
                                    onClick={() => handleApplySuggestionChoreography(sug, false)}
                                    className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-semibold text-sky-200 transition-colors"
                                  >
                                    Apply to Slide
                                  </button>
                                  <button
                                    onClick={() => handleApplySuggestionChoreography(sug, true)}
                                    className="py-1.5 px-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                                  >
                                    <span>Launch 3D</span>
                                    <ArrowRight className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Complete Proposed Slide Blueprint */}
                      {msg.includeProposedSlide && msg.proposedSlide && (
                        <div className="rounded-xl bg-indigo-950/35 border border-indigo-400/40 p-4 space-y-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                              Ready-to-Use Animated Slide Blueprint
                            </span>
                            <span className="text-[10px] font-mono text-sky-300">
                              {msg.proposedSlide.targetPlanet || 'earth'} · {THEME_LABELS[normalizeTheme(msg.proposedSlide.theme)]}
                            </span>
                          </div>

                          <div className="text-sm font-bold text-white">{msg.proposedSlide.title}</div>
                          {msg.proposedSlide.subheading && (
                            <div className="text-xs font-mono text-indigo-200">{msg.proposedSlide.subheading}</div>
                          )}

                          {msg.proposedSlide.talkingPoints && msg.proposedSlide.talkingPoints.length > 0 && (
                            <ul className="space-y-1 text-xs text-slate-200">
                              {msg.proposedSlide.talkingPoints.map((pt, pIdx) => (
                                <li key={pIdx} className="flex items-start gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                                  <span>{pt}</span>
                                </li>
                              ))}
                            </ul>
                          )}

                          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-indigo-500/20">
                            <button
                              onClick={() => handleApplyAgentSlideToCurrent(msg.proposedSlide!)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors"
                            >
                              Apply to Slide #{safeIndex + 1}
                            </button>
                            <button
                              onClick={() => handleInsertAgentSlideAsNew(msg.proposedSlide!)}
                              className="px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs transition-colors"
                            >
                              Insert as New Slide
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {isAgentLoading && (
                    <div className="rounded-2xl bg-slate-950/75 border border-slate-800 p-4 flex items-center gap-2.5 text-xs text-sky-300">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Choreographing visual 3D presentation & pedagogical storyboard...</span>
                    </div>
                  )}
                </div>

                {/* Chat Input Bar */}
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    handleSendAgentPrompt();
                  }}
                  className="flex items-center gap-2 pt-2"
                >
                  <input
                    type="text"
                    value={agentInput}
                    onChange={e => setAgentInput(e.target.value)}
                    placeholder="Ask for a 3D flyby animation, AR experiment, or complete new lesson slide..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="submit"
                    disabled={isAgentLoading || !agentInput.trim()}
                    className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-45 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Ask Agent</span>
                  </button>
                </form>
              </div>
            )}

            {/* Slide Navigation & 3D Presentation Launch Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800/90">
              <button
                disabled={safeIndex === 0}
                onClick={() => {
                  soundEffects.playClick();
                  setTeacherSlideIndex(safeIndex - 1);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900/90 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 text-slate-200 text-xs font-semibold transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <button
                onClick={handleSync3D}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-sky-600 to-indigo-600 hover:from-indigo-500 hover:to-sky-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 transition-all hover:-translate-y-0.5 border border-indigo-400/40"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <div className="text-left">
                  <div className="leading-tight">Jump 3D Solar View</div>
                  <div className="text-[10px] text-sky-200 font-normal">{themeLabel}</div>
                </div>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>

              <button
                disabled={safeIndex === teacherSlides.length - 1}
                onClick={() => {
                  soundEffects.playClick();
                  setTeacherSlideIndex(safeIndex + 1);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900/90 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 text-slate-200 text-xs font-semibold transition-colors"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Quick Actions & Student Roster */}
        <div className="lg:col-span-4 space-y-4">
          <div className="glass-panel p-5 rounded-3xl space-y-3">
            <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-sky-400" />
              <span>Classroom Broadcast</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Push the 5-question Solar Mastery assessment to all active student devices simultaneously.
            </p>
            <button
              onClick={handleLaunchPopQuiz}
              className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors ${
                popQuizLaunched
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-lg shadow-sky-500/25'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>{popQuizLaunched ? 'Quiz Broadcasted!' : 'Broadcast 5-Question Quiz'}</span>
            </button>
          </div>

          <div className="glass-panel p-5 rounded-3xl space-y-3">
            <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Slide Readiness Summary</span>
            </h3>
            <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2">
                <div className="text-base font-bold text-sky-300 tabular-nums">
                  {currentSlide.prerequisites?.length || 0}
                </div>
                <div className="text-[10px] text-slate-400">Deps</div>
              </div>
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2">
                <div className="text-base font-bold text-emerald-300 tabular-nums">
                  {currentSlide.materials?.length || 0}
                </div>
                <div className="text-[10px] text-slate-400">Materials</div>
              </div>
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2">
                <div className="text-base font-bold text-amber-300 tabular-nums">
                  {currentSlide.customImportant?.content ? 'Yes' : 'No'}
                </div>
                <div className="text-[10px] text-slate-400">Important</div>
              </div>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span>Classroom Roster ({simulatedStudents.length})</span>
              </h3>
              <span className="text-[10px] font-mono text-emerald-400 uppercase">Active</span>
            </div>

            <div className="space-y-2.5">
              {simulatedStudents.map(student => (
                <div
                  key={student.id}
                  className="bg-slate-950/65 border border-slate-800/80 p-3 rounded-2xl flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{student.avatar}</span>
                    <div>
                      <div className="font-bold text-white">{student.name}</div>
                      <div className="text-[11px] text-slate-400">
                        Exploring {student.currentPlanet}
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-mono tabular-nums">
                    <div className="font-semibold text-amber-300">
                      {student.quizScore !== null ? `${student.quizScore}/5 Quiz` : 'In Progress'}
                    </div>
                    <div className="text-[10px] text-slate-400">{student.xp} XP</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
};

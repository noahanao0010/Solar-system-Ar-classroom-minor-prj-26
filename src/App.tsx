/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy, useRef, useState, useEffect } from 'react';
import { MotionConfig } from 'motion/react';
import { ClassroomProvider, useClassroom } from './context/ClassroomContext';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { SpaceTransitPortal } from './components/SpaceTransitPortal';
import { CommandPalette } from './components/CommandPalette';
import {
  ObservatoryErrorBoundary,
  ViewLoadingFallback,
} from './components/ui/ObservatoryPrimitives';
import { Trash2 } from 'lucide-react';

// Code-split heavy WebGL / Three.js & secondary feature modules for fast initial load
const SolarSystemView = lazy(() =>
  import('./components/SolarSystemView').then(m => ({ default: m.SolarSystemView })),
);
const PlanetExplorerView = lazy(() =>
  import('./components/PlanetExplorerView').then(m => ({ default: m.PlanetExplorerView })),
);
const CompareView = lazy(() =>
  import('./components/CompareView').then(m => ({ default: m.CompareView })),
);
const MissionsView = lazy(() =>
  import('./components/MissionsView').then(m => ({ default: m.MissionsView })),
);
const QuizCenterView = lazy(() =>
  import('./components/QuizCenterView').then(m => ({ default: m.QuizCenterView })),
);
const CameraARView = lazy(() =>
  import('./components/CameraARView').then(m => ({ default: m.CameraARView })),
);
const TeacherModeView = lazy(() =>
  import('./components/TeacherModeView').then(m => ({ default: m.TeacherModeView })),
);
const ProgressView = lazy(() =>
  import('./components/ProgressView').then(m => ({ default: m.ProgressView })),
);

function LaserPointerLayer() {
  const { isLaserPointerActive, setIsLaserPointerActive } = useClassroom();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (!isLaserPointerActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [isLaserPointerActive]);

  if (!isLaserPointerActive) return null;

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.shadowColor = '#f43f5e';
    ctx.shadowBlur = 10;
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDraw = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <canvas
        ref={canvasRef}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={stopDraw}
        className="w-full h-full pointer-events-auto cursor-crosshair"
      />

      <div className="absolute bottom-6 right-6 pointer-events-auto flex items-center gap-2 glass-panel-elevated p-2 rounded-2xl">
        <div className="text-xs text-rose-300 font-bold px-2 flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
          <span>Laser Annotation Mode</span>
        </div>
        <button
          onClick={clearCanvas}
          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700"
          title="Clear Screen Annotations"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => setIsLaserPointerActive(false)}
          className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs"
        >
          Close Laser
        </button>
      </div>
    </div>
  );
}

function MainContent() {
  const { currentView, setCurrentView } = useClassroom();

  return (
    <main className="flex-1 overflow-y-auto relative">
      <ObservatoryErrorBoundary onRecover={() => setCurrentView('dashboard')}>
        <Suspense fallback={<ViewLoadingFallback />}>
          <div key={currentView} className="min-h-full animate-stage-enter">
            {currentView === 'dashboard' && <DashboardView />}
            {currentView === 'solarSystem' && <SolarSystemView />}
            {currentView === 'explorer' && <PlanetExplorerView />}
            {currentView === 'compare' && <CompareView />}
            {currentView === 'missions' && <MissionsView />}
            {currentView === 'quiz' && <QuizCenterView />}
            {currentView === 'cameraAR' && <CameraARView />}
            {currentView === 'teacher' && <TeacherModeView />}
            {currentView === 'progress' && <ProgressView />}
          </div>
        </Suspense>
      </ObservatoryErrorBoundary>
    </main>
  );
}

function AppShell() {
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#030612] text-slate-100 antialiased font-sans">
      <Navbar onOpenCommandPalette={() => setCommandOpen(true)} />
      <MainContent />
      <LaserPointerLayer />
      <SpaceTransitPortal />
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <ClassroomProvider>
        <AppShell />
      </ClassroomProvider>
    </MotionConfig>
  );
}

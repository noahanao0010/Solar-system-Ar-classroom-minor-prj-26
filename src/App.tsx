/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { ClassroomProvider, useClassroom } from './context/ClassroomContext';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { SolarSystemView } from './components/SolarSystemView';
import { PlanetExplorerView } from './components/PlanetExplorerView';
import { CompareView } from './components/CompareView';
import { MissionsView } from './components/MissionsView';
import { QuizCenterView } from './components/QuizCenterView';
import { CameraARView } from './components/CameraARView';
import { TeacherModeView } from './components/TeacherModeView';
import { ProgressView } from './components/ProgressView';
import { MyWebARHubView } from './components/MyWebARHubView';
import { Trash2, PenTool } from 'lucide-react';

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

      <div className="absolute bottom-6 right-6 pointer-events-auto flex items-center gap-2 bg-slate-900/90 border border-slate-700 p-2 rounded-2xl shadow-2xl">
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
  const { currentView } = useClassroom();

  return (
    <main className="flex-1 overflow-y-auto">
      {currentView === 'dashboard' && <DashboardView />}
      {currentView === 'solarSystem' && <SolarSystemView />}
      {currentView === 'explorer' && <PlanetExplorerView />}
      {currentView === 'compare' && <CompareView />}
      {currentView === 'missions' && <MissionsView />}
      {currentView === 'quiz' && <QuizCenterView />}
      {currentView === 'cameraAR' && <CameraARView />}
      {currentView === 'mywebarHub' && <MyWebARHubView />}
      {currentView === 'teacher' && <TeacherModeView />}
      {currentView === 'progress' && <ProgressView />}
    </main>
  );
}

export default function App() {
  return (
    <ClassroomProvider>
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 antialiased font-sans">
        <Navbar />
        <MainContent />
        <LaserPointerLayer />
      </div>
    </ClassroomProvider>
  );
}

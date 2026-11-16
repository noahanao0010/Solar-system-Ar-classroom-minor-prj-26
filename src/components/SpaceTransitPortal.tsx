import React, { useEffect, useRef } from 'react';
import { useClassroom } from '../context/ClassroomContext';

interface StarStreak {
  angle: number;
  dist: number;
  speed: number;
  length: number;
  color: string;
}

const STREAK_PALETTE = ['#38bdf8', '#818cf8', '#e0f2fe', '#f59e0b'];

export const SpaceTransitPortal: React.FC = () => {
  const { transitState } = useClassroom();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!transitState.active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cx = width * 0.5;
    const cy = height * 0.5;
    const maxRadius = Math.hypot(cx, cy);

    const streaks: StarStreak[] = Array.from({ length: 76 }, () => ({
      angle: Math.random() * Math.PI * 2,
      dist: 18 + Math.random() * (maxRadius * 0.45),
      speed: 14 + Math.random() * 28,
      length: 22 + Math.random() * 64,
      color: STREAK_PALETTE[Math.floor(Math.random() * STREAK_PALETTE.length)],
    }));

    const renderFrame = () => {
      ctx.clearRect(0, 0, width, height);

      // Radial cosmic aperture glow
      const radial = ctx.createRadialGradient(cx, cy, 12, cx, cy, maxRadius * 0.72);
      radial.addColorStop(0, 'rgba(56, 189, 248, 0.22)');
      radial.addColorStop(0.35, 'rgba(15, 23, 42, 0.72)');
      radial.addColorStop(1, 'rgba(3, 6, 18, 0.94)');
      ctx.fillStyle = radial;
      ctx.fillRect(0, 0, width, height);

      // Converging / accelerating warp lines
      ctx.lineCap = 'round';
      for (let i = 0; i < streaks.length; i++) {
        const s = streaks[i];
        s.dist += s.speed;
        if (s.dist > maxRadius + 80) {
          s.dist = 12 + Math.random() * 40;
        }

        const x1 = cx + Math.cos(s.angle) * s.dist;
        const y1 = cy + Math.sin(s.angle) * s.dist;
        const x2 = cx + Math.cos(s.angle) * (s.dist + s.length);
        const y2 = cy + Math.sin(s.angle) * (s.dist + s.length);

        ctx.strokeStyle = s.color;
        ctx.globalAlpha = 0.65;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      rafRef.current = requestAnimationFrame(renderFrame);
    };

    rafRef.current = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [transitState.active]);

  if (!transitState.active) return null;

  return (
    <div
      className="fixed inset-0 z-[90] pointer-events-none flex items-center justify-center transition-opacity duration-200"
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Crisp Orbital Lock Beacon */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 py-5 rounded-2xl glass-panel-elevated border border-sky-400/30">
        <div className="relative w-12 h-12 mb-3 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-sky-400/60 animate-orbit-slow" />
          <div className="absolute inset-1.5 rounded-full border border-dashed border-amber-300/60 animate-orbit-reverse" />
          <div className="w-2.5 h-2.5 rounded-full bg-sky-300 shadow-[0_0_16px_rgba(56,189,248,0.9)]" />
        </div>

        <span className="text-[10px] font-mono uppercase tracking-[0.26em] text-sky-300/90">
          Transit Vector
        </span>
        <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-white mt-0.5">
          {transitState.title}
        </h2>
        <p className="text-xs text-slate-300 mt-0.5">{transitState.subtitle}</p>
      </div>
    </div>
  );
};

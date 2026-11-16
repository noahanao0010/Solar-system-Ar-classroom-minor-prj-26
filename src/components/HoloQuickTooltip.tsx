import React from 'react';
import { motion } from 'motion/react';
import { getHologramSpec } from '../utils/hologramData';
import { COLOR_GRADE_THEMES, ColorGradePresetId } from '../utils/coreAssetsEngine';
import { soundEffects } from '../utils/soundEffects';
import { PlanetId, SpacecraftId, GalaxyId } from '../types/astronomy';
import { PLANETS_DATA } from '../data/planetsData';
import { SPACECRAFTS_DATA } from '../data/spaceCraftData';
import { GALAXIES_DATA } from '../data/galaxiesData';
import { Volume2, Scan, Compass, Camera, X } from 'lucide-react';

export interface TooltipScreenAnchor {
  id: string;
  screenX: number;
  screenY: number;
}

interface HoloQuickTooltipProps {
  anchor: TooltipScreenAnchor;
  colorGradePreset: ColorGradePresetId;
  onClose: () => void;
  onFocusObject: (id: PlanetId | SpacecraftId | GalaxyId) => void;
  onOpenFullHUD: (id: string) => void;
  onLaunchAR: (id: string) => void;
}

export const HoloQuickTooltip: React.FC<HoloQuickTooltipProps> = ({
  anchor,
  colorGradePreset,
  onClose,
  onFocusObject,
  onOpenFullHUD,
  onLaunchAR,
}) => {
  const spec = getHologramSpec(anchor.id);
  const theme = COLOR_GRADE_THEMES[colorGradePreset];

  const viewportW = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 800;

  const cardWidth = Math.min(340, viewportW - 32);
  const cardHeightApprox = 290;

  // Smart horizontal placement relative to 3D projected screen anchor
  const placeLeft = anchor.screenX > viewportW * 0.58;
  const rawCardX = placeLeft
    ? anchor.screenX - cardWidth - 38
    : anchor.screenX + 38;
  const cardX = Math.max(16, Math.min(viewportW - cardWidth - 16, rawCardX));

  // Keep cleanly above bottom flight dock and below navbar
  const rawCardY = anchor.screenY - cardHeightApprox * 0.45;
  const cardY = Math.max(76, Math.min(viewportH - cardHeightApprox - 135, rawCardY));

  const tetherEndX = placeLeft ? cardX + cardWidth : cardX;
  const tetherEndY = cardY + 34;
  const elbowX = placeLeft ? tetherEndX + 18 : tetherEndX - 18;

  // Quick contextual fact derived cleanly from dataset
  const quickFact =
    anchor.id in PLANETS_DATA
      ? PLANETS_DATA[anchor.id as PlanetId].funFacts[0] || spec.intelBriefing
      : anchor.id in SPACECRAFTS_DATA
      ? SPACECRAFTS_DATA[anchor.id as SpacecraftId].funFacts[0] || spec.intelBriefing
      : anchor.id in GALAXIES_DATA
      ? GALAXIES_DATA[anchor.id as GalaxyId].funFacts[0] || spec.intelBriefing
      : spec.intelBriefing;

  const handlePlayBrief = () => {
    soundEffects.playClick();
    if (anchor.id in PLANETS_DATA) {
      soundEffects.playPlanetSound(anchor.id as PlanetId);
      soundEffects.speakPlanet(anchor.id as PlanetId);
    } else if (anchor.id in SPACECRAFTS_DATA) {
      soundEffects.playSpacecraftSound(anchor.id as SpacecraftId);
      soundEffects.speakSpacecraft(anchor.id as SpacecraftId);
    } else if (anchor.id in GALAXIES_DATA) {
      if (anchor.id === 'cosmic-web' || anchor.id === 'observable-universe') {
        soundEffects.playCosmicWeb();
      } else {
        soundEffects.playGalaxySound(anchor.id as GalaxyId);
      }
      soundEffects.speakGalaxy(anchor.id as GalaxyId);
    } else {
      soundEffects.speakDetection(`${spec.name}. ${quickFact}`);
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-35 select-none">
      {/* Vector Leader Line Tether connecting exact live 3D projection to Stacked Tooltip */}
      <svg className="fixed inset-0 w-full h-full pointer-events-none overflow-visible">
        <defs>
          <linearGradient id={`holo-tether-${anchor.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={theme.accentHex} stopOpacity="0.95" />
            <stop offset="100%" stopColor={theme.secondaryHex} stopOpacity="0.65" />
          </linearGradient>
        </defs>
        {/* Outer Target Reticle Node at exact 3D position */}
        <circle
          cx={anchor.screenX}
          cy={anchor.screenY}
          r={11}
          fill="none"
          stroke={theme.accentHex}
          strokeWidth={1.25}
          strokeDasharray="4 3"
          opacity={0.85}
        />
        <circle
          cx={anchor.screenX}
          cy={anchor.screenY}
          r={3.5}
          fill={theme.accentHex}
        />
        <polyline
          points={`${anchor.screenX},${anchor.screenY} ${elbowX},${tetherEndY} ${tetherEndX},${tetherEndY}`}
          fill="none"
          stroke={`url(#holo-tether-${anchor.id})`}
          strokeWidth={1.5}
        />
        <circle
          cx={tetherEndX}
          cy={tetherEndY}
          r={2.5}
          fill={theme.secondaryHex}
        />
      </svg>

      {/* Sci-Fi Advanced Stacks Layered Holographic Card */}
      <motion.div
        key={anchor.id}
        initial={{ opacity: 0, scale: 0.94, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 6 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        style={{
          left: cardX,
          top: cardY,
          width: cardWidth,
        }}
        className="fixed pointer-events-auto"
      >
        {/* Layer 0: Back Depth Holographic Stack Plate */}
        <div
          aria-hidden="true"
          style={{
            borderColor: theme.borderRgba,
            background: 'rgba(2, 6, 20, 0.55)',
          }}
          className="absolute inset-0 translate-x-2 translate-y-2 rounded-2xl border pointer-events-none"
        />

        {/* Layer 1: Mid Calibrated Telemetry Stack */}
        <div
          style={{
            background: theme.tintCss,
            borderColor: theme.borderRgba,
            boxShadow: `0 18px 42px -10px rgba(0,0,0,0.8), 0 0 28px -6px ${theme.glowRgba}`,
          }}
          className="relative rounded-2xl border p-3.5 text-slate-100 overflow-hidden"
        >
          {/* Subtle holographic scanline sheen */}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none opacity-[0.07]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.45) 3px, rgba(255,255,255,0.45) 4px)',
            }}
          />

          {/* Corner Calibration Brackets */}
          <span
            style={{ borderColor: theme.accentHex }}
            className="absolute top-1.5 left-1.5 w-2.5 h-2.5 border-t border-l pointer-events-none"
          />
          <span
            style={{ borderColor: theme.accentHex }}
            className="absolute top-1.5 right-1.5 w-2.5 h-2.5 border-t border-r pointer-events-none"
          />
          <span
            style={{ borderColor: theme.accentHex }}
            className="absolute bottom-1.5 left-1.5 w-2.5 h-2.5 border-b border-l pointer-events-none"
          />
          <span
            style={{ borderColor: theme.accentHex }}
            className="absolute bottom-1.5 right-1.5 w-2.5 h-2.5 border-b border-r pointer-events-none"
          />

          {/* Top Header: Clean unboxed metadata + Object Name + Dismiss */}
          <div className="relative flex items-start justify-between gap-2 pb-2.5 border-b border-white/10">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] font-mono tracking-wider text-slate-400 truncate">
                <span style={{ color: theme.accentHex }} className="font-semibold">
                  {spec.specCode}
                </span>
                <span aria-hidden="true">·</span>
                <span className="truncate">{spec.classification.split('//')[1]?.trim() || 'CELESTIAL BODY'}</span>
              </div>
              <h4 className="font-display text-base font-bold text-white flex items-center gap-2 mt-0.5 truncate">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: spec.accentColor }}
                />
                <span className="truncate">{spec.name}</span>
              </h4>
            </div>

            <button
              type="button"
              onClick={() => {
                soundEffects.playHoloDismiss();
                onClose();
              }}
              className="p-1 rounded-lg bg-slate-900/90 border border-slate-700/80 text-slate-400 hover:text-white hover:border-slate-500 transition-colors shrink-0"
              aria-label="Close holographic tooltip"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Fact Readout */}
          <div className="relative py-2.5 space-y-2">
            <p className="text-xs text-slate-200 leading-relaxed line-clamp-2">
              {spec.primaryOverview}
            </p>
            <div
              style={{ borderColor: 'rgba(255,255,255,0.08)' }}
              className="rounded-xl bg-slate-950/75 border px-2.5 py-2 text-[11px] text-slate-300 leading-snug"
            >
              <span
                style={{ color: theme.accentHex }}
                className="font-mono text-[10px] font-semibold uppercase tracking-wider mr-1.5"
              >
                Quick Fact:
              </span>
              <span>{quickFact}</span>
            </div>
          </div>

          {/* 3-Column Tabular Metrics Strip */}
          <div className="relative grid grid-cols-3 gap-2 py-2 border-y border-white/10 divide-x divide-white/10 text-[10px]">
            <div className="pr-1 min-w-0">
              <span className="font-mono text-slate-400 block truncate">
                {spec.dimensionMetric.label.split(' ')[0]}
              </span>
              <span className="font-mono tabular-nums font-bold text-white text-[11px] block truncate mt-0.5">
                {spec.dimensionMetric.value}
              </span>
            </div>

            <div className="px-1.5 min-w-0">
              <span className="font-mono text-slate-400 block truncate">
                {spec.distanceMetric.label.split(' ')[0]}
              </span>
              <span
                style={{ color: theme.accentHex }}
                className="font-mono tabular-nums font-bold text-[11px] block truncate mt-0.5"
              >
                {spec.distanceMetric.value}
              </span>
            </div>

            <div className="pl-1.5 min-w-0">
              <span className="font-mono text-slate-400 block truncate">
                {spec.tempOrMassMetric.label.split(' ').slice(-1)[0]}
              </span>
              <span className="font-mono tabular-nums font-bold text-amber-300 text-[11px] block truncate mt-0.5">
                {spec.tempOrMassMetric.value}
              </span>
            </div>
          </div>

          {/* Layer 2: Front Action Micro-Stack */}
          <div className="relative flex items-center justify-between gap-1.5 pt-2.5">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePlayBrief}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900/90 border border-slate-700/80 text-slate-200 hover:text-white hover:border-slate-500 text-[11px] font-medium whitespace-nowrap transition-colors"
                title="Play SFX & Quick Audio Fact"
              >
                <Volume2 className="w-3 h-3 text-amber-400" />
                <span>Audio</span>
              </button>

              <button
                type="button"
                onClick={() => onFocusObject(anchor.id as PlanetId | SpacecraftId | GalaxyId)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900/90 border border-slate-700/80 text-slate-200 hover:text-white hover:border-slate-500 text-[11px] font-medium whitespace-nowrap transition-colors"
                title="Track & Focus Camera"
              >
                <Compass className="w-3 h-3 text-sky-400" />
                <span>Focus</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEffects.playClick();
                  onLaunchAR(anchor.id);
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900/90 border border-slate-700/80 text-slate-200 hover:text-white hover:border-slate-500 text-[11px] font-medium whitespace-nowrap transition-colors"
                title="Project in Live AR"
              >
                <Camera className="w-3 h-3 text-pink-400" />
                <span>AR</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                soundEffects.playHoloActivate();
                onOpenFullHUD(anchor.id);
              }}
              style={{
                backgroundColor: theme.accentHex,
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-slate-950 font-bold text-[11px] whitespace-nowrap hover:brightness-110 transition-all shadow-sm"
            >
              <Scan className="w-3 h-3" />
              <span>Full HUD</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { HologramSpec, getHologramSpec } from '../utils/hologramData';
import { soundEffects } from '../utils/soundEffects';
import { SegmentedTabs } from './ui/ObservatoryPrimitives';
import {
  Scan,
  Radio,
  Volume2,
  Camera,
  X,
  Sparkles,
  Cpu,
  Shield,
} from 'lucide-react';

interface SciFiHologramHUDProps {
  modelId: string;
  onClose: () => void;
  onLaunchAR?: (id: string) => void;
}

export const SciFiHologramHUD: React.FC<SciFiHologramHUDProps> = ({
  modelId,
  onClose,
  onLaunchAR,
}) => {
  const spec: HologramSpec = getHologramSpec(modelId);
  const [activeTab, setActiveTab] = useState<'telemetry' | 'deepScan' | 'intel'>('telemetry');
  const [isSonarActive, setIsSonarActive] = useState(false);
  const [scanPulse, setScanPulse] = useState(0);

  useEffect(() => {
    soundEffects.playHoloActivate();
  }, [modelId]);

  useEffect(() => {
    const interval = setInterval(() => {
      setScanPulse(prev => (prev + 2) % 100);
    }, 60);
    return () => clearInterval(interval);
  }, []);

  const handlePlaySonar = () => {
    setIsSonarActive(true);
    soundEffects.playTargetLock();
    soundEffects.playScan();
    setTimeout(() => setIsSonarActive(false), 800);
  };

  const handleVocalBriefing = () => {
    soundEffects.playClick();
    soundEffects.speakDetection(`Holographic scan of ${spec.name}. ${spec.primaryOverview}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center p-3 sm:p-6"
    >
      {/* Backdrop */}
      <div
        onClick={() => {
          soundEffects.playHoloDismiss();
          onClose();
        }}
        className="absolute inset-0 bg-slate-950/75 backdrop-blur-md pointer-events-auto"
      />

      {/* Hologram Projection Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        className="relative pointer-events-auto w-full max-w-2xl max-h-[90vh] overflow-y-auto glass-panel-elevated rounded-3xl p-5 sm:p-6 text-slate-100 space-y-4 scrollbar-none font-sans"
      >
        {/* Corner Reticle Brackets */}
        <div className="absolute top-2.5 left-2.5 w-3.5 h-3.5 border-t-2 border-l-2 border-sky-400/80 pointer-events-none" />
        <div className="absolute top-2.5 right-2.5 w-3.5 h-3.5 border-t-2 border-r-2 border-sky-400/80 pointer-events-none" />
        <div className="absolute bottom-2.5 left-2.5 w-3.5 h-3.5 border-b-2 border-l-2 border-sky-400/80 pointer-events-none" />
        <div className="absolute bottom-2.5 right-2.5 w-3.5 h-3.5 border-b-2 border-r-2 border-sky-400/80 pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between border-b border-sky-500/25 pb-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
              <span className="inline-flex items-center gap-1.5 text-sky-300 font-bold tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
                {spec.specCode}
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-emerald-400 uppercase tracking-widest">
                {spec.statusBadge}
              </span>
            </div>

            <h2 className="font-display text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <span
                className="w-3.5 h-3.5 rounded-full inline-block"
                style={{ backgroundColor: spec.accentColor }}
              />
              <span>{spec.name}</span>
            </h2>

            <div className="text-[11px] font-mono text-slate-400">
              {spec.classification}
            </div>
          </div>

          <button
            onClick={() => {
              soundEffects.playHoloDismiss();
              onClose();
            }}
            className="p-1.5 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close Hologram HUD"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Radar Scanning Line */}
        <div className="relative w-full h-1 bg-slate-900 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sky-400 via-indigo-400 to-emerald-400 transition-all duration-75"
            style={{ width: `${scanPulse}%` }}
          />
        </div>

        {/* Shared Framer Motion Segmented Tabs */}
        <SegmentedTabs
          layoutId="holo-hud-tabs"
          value={activeTab}
          onChange={val => {
            soundEffects.playClick();
            setActiveTab(val);
          }}
          className="w-full flex"
          items={[
            { id: 'telemetry', label: 'Telemetry', icon: <Cpu className="w-3.5 h-3.5" /> },
            { id: 'deepScan', label: 'Deep Scan', icon: <Scan className="w-3.5 h-3.5" /> },
            { id: 'intel', label: 'Intel Briefing', icon: <Sparkles className="w-3.5 h-3.5" /> },
          ]}
        />

        {/* Tab 1: Telemetry Data Grid */}
        {activeTab === 'telemetry' && (
          <div className="space-y-4">
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {spec.primaryOverview}
            </p>

            {/* Hairline-divided 4-metric telemetry strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800/80 sm:divide-x sm:divide-slate-800/80 text-xs">
              <div className="sm:pr-3">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">
                  {spec.dimensionMetric.label}
                </span>
                <span className="font-mono font-bold text-white text-sm truncate block mt-0.5">
                  {spec.dimensionMetric.value}
                </span>
              </div>

              <div className="sm:px-3">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">
                  {spec.distanceMetric.label}
                </span>
                <span className="font-mono font-bold text-sky-300 text-sm truncate block mt-0.5">
                  {spec.distanceMetric.value}
                </span>
              </div>

              <div className="sm:px-3">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">
                  {spec.velocityMetric.label}
                </span>
                <span className="font-mono font-bold text-amber-300 text-sm truncate block mt-0.5">
                  {spec.velocityMetric.value}
                </span>
              </div>

              <div className="sm:pl-3">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">
                  {spec.tempOrMassMetric.label}
                </span>
                <span className="font-mono font-bold text-purple-300 text-sm truncate block mt-0.5">
                  {spec.tempOrMassMetric.value}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-[11px] font-mono bg-slate-950/75 p-3.5 rounded-2xl border border-slate-800/80">
              {spec.telemetryStream.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between border-b border-slate-800/70 pb-1">
                  <span className="text-slate-400">{item.label}</span>
                  <span className="text-sky-300 font-bold">{item.val}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Deep Scan Analysis */}
        {activeTab === 'deepScan' && (
          <div className="space-y-3">
            <div className="bg-slate-950/65 p-4 rounded-2xl border border-indigo-500/25 space-y-2.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                <span>Multi-Spectral Structural Analysis</span>
              </span>

              <ul className="space-y-2 text-xs text-slate-200">
                {spec.deepScanDetails.map((detail, idx) => (
                  <li key={idx} className="flex items-start gap-2 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/75 border border-slate-800 text-xs font-mono text-slate-400 flex items-center justify-between">
              <span>COORDINATES VECTOR</span>
              <span className="text-emerald-300 font-bold">{spec.coordinates}</span>
            </div>
          </div>
        )}

        {/* Tab 3: Intel Briefing */}
        {activeTab === 'intel' && (
          <div className="space-y-3">
            <div className="bg-amber-950/25 p-4 rounded-2xl border border-amber-500/30 space-y-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Deep Space Intelligence Report</span>
              </span>

              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                {spec.intelBriefing}
              </p>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed px-1">
              Cross-reference physical dimensions in the Compare View or project directly onto your desk with Camera AR.
            </p>
          </div>
        )}

        {/* Bottom Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-sky-500/25">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePlaySonar}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors border ${
                isSonarActive
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="Pulse Sonar Frequency"
            >
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isSonarActive ? 'Pulsing...' : 'Sonar Ping'}</span>
            </button>

            <button
              onClick={handleVocalBriefing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold transition-colors"
              title="Speak Vocal Briefing"
            >
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Voice Briefing</span>
            </button>
          </div>

          {onLaunchAR && (
            <button
              onClick={() => {
                soundEffects.playWarp();
                onLaunchAR(spec.id);
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-xs font-bold shadow-lg shadow-pink-600/25 transition-all"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Project Hologram in AR</span>
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

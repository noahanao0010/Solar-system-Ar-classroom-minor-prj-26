/**
 * Procedural Web Audio API sound synthesizer and Web Speech API narrator.
 * Zero external audio files required.
 */

import { PlanetId, SpacecraftId } from '../types/astronomy';
import { PLANETS_DATA } from '../data/planetsData';
import { SPACECRAFTS_DATA } from '../data/spaceCraftData';
import { GALAXIES_DATA } from '../data/galaxiesData';

let audioCtx: AudioContext | null = null;
let ambientGain: GainNode | null = null;
let ambientOsc1: OscillatorNode | null = null;
let ambientOsc2: OscillatorNode | null = null;
let ambientOsc3: OscillatorNode | null = null;
let ambientLFO: OscillatorNode | null = null;
let ambientFilter: BiquadFilterNode | null = null;
let cosmicMusicActive = false;
let cosmicChimeTimer: any = null;
let isMuted = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export const soundEffects = {
  setMuted(muted: boolean) {
    isMuted = muted;
    if (ambientGain && audioCtx) {
      ambientGain.gain.setTargetAtTime(muted ? 0 : 0.05, audioCtx.currentTime, 0.2);
    }
    if (muted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  },

  getMuted() {
    return isMuted;
  },

  // UI interaction clicks
  playClick() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {}
  },

  playScan() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.12);
      osc.frequency.linearRampToValueAtTime(1040, ctx.currentTime + 0.22);

      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {}
  },

  playWarp() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(480, ctx.currentTime + 0.4);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(200, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(2400, ctx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } catch {}
  },

  playSuccess() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);

        gain.gain.setValueAtTime(0.09, ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.25);
      });
    } catch {}
  },

  // -------------------------------------------------------------
  // Unique Planet Sonification Audio Synthesizer (NASA Electromagnetic Signatures)
  // -------------------------------------------------------------
  playPlanetSound(planetId: PlanetId | 'minisystem' | 'overview') {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;

    try {
      switch (planetId) {
        case 'sun': {
          // Low-frequency solar plasma roar & magnetic flare rumble (55Hz drone with pulsating filter)
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const filter = ctx.createBiquadFilter();
          const gain = ctx.createGain();

          osc1.type = 'sawtooth';
          osc1.frequency.setValueAtTime(45, t);
          osc1.frequency.linearRampToValueAtTime(55, t + 0.5);

          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(90, t);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(140, t);
          filter.frequency.exponentialRampToValueAtTime(420, t + 0.3);
          filter.frequency.exponentialRampToValueAtTime(120, t + 0.9);

          gain.gain.setValueAtTime(0.14, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 1.0);

          osc1.connect(filter);
          osc2.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);

          osc1.start(t);
          osc2.start(t);
          osc1.stop(t + 1.0);
          osc2.stop(t + 1.0);
          break;
        }

        case 'mercury': {
          // Swift high-frequency solar wind whistle & crystalline flutter
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(680, t);
          osc.frequency.exponentialRampToValueAtTime(1420, t + 0.15);
          osc.frequency.exponentialRampToValueAtTime(880, t + 0.35);

          gain.gain.setValueAtTime(0.1, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.4);
          break;
        }

        case 'venus': {
          // Dense greenhouse pressure whoosh & sulfur acid atmosphere howl
          const osc = ctx.createOscillator();
          const filter = ctx.createBiquadFilter();
          const gain = ctx.createGain();

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(80, t);
          osc.frequency.linearRampToValueAtTime(120, t + 0.4);

          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(260, t);
          filter.Q.setValueAtTime(4.0, t);
          filter.frequency.linearRampToValueAtTime(540, t + 0.3);
          filter.frequency.linearRampToValueAtTime(200, t + 0.7);

          gain.gain.setValueAtTime(0.12, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);

          osc.start(t);
          osc.stop(t + 0.8);
          break;
        }

        case 'earth': {
          // Harmonic auroral chorus waves & peaceful blue planet chords (E5, G#5, B5, E6)
          const chord = [329.63, 415.3, 493.88, 659.25];
          chord.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t + i * 0.04);
            osc.frequency.exponentialRampToValueAtTime(freq * 1.02, t + i * 0.04 + 0.6);

            gain.gain.setValueAtTime(0.06, t + i * 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.04 + 0.7);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t + i * 0.04);
            osc.stop(t + i * 0.04 + 0.7);
          });
          break;
        }

        case 'mars': {
          // Thin Martian dust devil whistle & hollow desert resonance
          const osc = ctx.createOscillator();
          const filter = ctx.createBiquadFilter();
          const gain = ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(280, t);
          osc.frequency.exponentialRampToValueAtTime(190, t + 0.5);

          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(420, t);
          filter.Q.setValueAtTime(5.0, t);

          gain.gain.setValueAtTime(0.1, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);

          osc.start(t);
          osc.stop(t + 0.6);
          break;
        }

        case 'jupiter': {
          // Colossal Jovian magnetosphere radio roar & descending lightning whistlers
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const filter = ctx.createBiquadFilter();
          const gain = ctx.createGain();

          osc1.type = 'sawtooth';
          osc1.frequency.setValueAtTime(65, t);

          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(1400, t); // Lightning whistler
          osc2.frequency.exponentialRampToValueAtTime(280, t + 0.5);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(350, t);

          gain.gain.setValueAtTime(0.14, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.85);

          osc1.connect(filter);
          osc2.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);

          osc1.start(t);
          osc2.start(t);
          osc1.stop(t + 0.85);
          osc2.stop(t + 0.85);
          break;
        }

        case 'saturn': {
          // Cassini spacecraft ethereal radio emissions & icy ring crystal chimes (glass-like harmonics)
          const ringChimes = [880, 1174.66, 1318.51, 1760];
          ringChimes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t + idx * 0.05);

            gain.gain.setValueAtTime(0.06, t + idx * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.05 + 0.65);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t + idx * 0.05);
            osc.stop(t + idx * 0.05 + 0.65);
          });
          break;
        }

        case 'uranus': {
          // Tilted magnetic field oscillating pulse & pale ice crystal tone
          const osc = ctx.createOscillator();
          const lfo = ctx.createOscillator();
          const lfoGain = ctx.createGain();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, t);

          lfo.frequency.setValueAtTime(6, t); // 6Hz tilt wobble
          lfoGain.gain.setValueAtTime(25, t);

          lfo.connect(osc.frequency);

          gain.gain.setValueAtTime(0.1, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

          osc.connect(gain);
          gain.connect(ctx.destination);

          lfo.start(t);
          osc.start(t);
          lfo.stop(t + 0.7);
          osc.stop(t + 0.7);
          break;
        }

        case 'neptune': {
          // Supersonic storm wind deep ocean drone & cold methane resonance
          const osc = ctx.createOscillator();
          const filter = ctx.createBiquadFilter();
          const gain = ctx.createGain();

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(75, t);
          osc.frequency.exponentialRampToValueAtTime(55, t + 0.7);

          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(320, t);
          filter.frequency.exponentialRampToValueAtTime(160, t + 0.7);
          filter.Q.setValueAtTime(3.5, t);

          gain.gain.setValueAtTime(0.12, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);

          osc.start(t);
          osc.stop(t + 0.8);
          break;
        }

        case 'minisystem':
        case 'overview': {
          // Celestial harmony: multi-frequency cosmic chime
          const freqs = [261.63, 329.63, 392.0, 523.25, 659.25];
          freqs.forEach((f, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(f, t + i * 0.05);

            gain.gain.setValueAtTime(0.07, t + i * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.6);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t + i * 0.05);
            osc.stop(t + i * 0.05 + 0.6);
          });
          break;
        }
      }
    } catch {}
  },

  // -------------------------------------------------------------
  // Satellites, Rockets & Spacecraft Sound Synthesizer
  // -------------------------------------------------------------
  playSpacecraftSound(craftId: SpacecraftId) {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const t = ctx.currentTime;

    try {
      if (craftId === 'sputnik') {
        // Iconic authentic 1957 Sputnik radio beep
        [0, 0.22, 0.44].forEach(offset => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1000, t + offset);

          gain.gain.setValueAtTime(0.12, t + offset);
          gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.12);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t + offset);
          osc.stop(t + offset + 0.12);
        });
        return;
      }

      if (craftId === 'saturn-v' || craftId === 'starship' || craftId === 'sls') {
        // Super-heavy Rocket Engine Ignition Rumble & Stage Burn
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(50, t);
        osc.frequency.exponentialRampToValueAtTime(95, t + 0.3);
        osc.frequency.linearRampToValueAtTime(40, t + 0.9);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(180, t);
        filter.frequency.exponentialRampToValueAtTime(650, t + 0.25);
        filter.frequency.exponentialRampToValueAtTime(120, t + 0.9);

        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.95);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t);
        osc.stop(t + 0.95);
        return;
      }

      if (craftId === 'iss' || craftId === 'hubble' || craftId === 'jwst') {
        // High-tech orbital telemetry data telemetry pulses
        const tones = [987.77, 1318.51, 1567.98];
        tones.forEach((tone, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(tone, t + idx * 0.08);

          gain.gain.setValueAtTime(0.08, t + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.18);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t + idx * 0.08);
          osc.stop(t + idx * 0.08 + 0.18);
        });
        return;
      }

      if (craftId === 'apollo-lander' || craftId === 'voyager' || craftId === 'mars-rover' || craftId === 'space-shuttle') {
        // Scientific exploration telemetry / radar beep
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, t);
        osc.frequency.linearRampToValueAtTime(900, t + 0.12);
        osc.frequency.linearRampToValueAtTime(450, t + 0.35);

        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.4);
      }
    } catch {}
  },

  // -------------------------------------------------------------
  // Web Speech API Narrator (Real spoken audio for all planets & assets)
  // -------------------------------------------------------------
  speakText(text: string) {
    if (isMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel(); // Stop prior speech to prevent backlog

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.volume = 0.9;

      // Select an English voice if available
      const voices = window.speechSynthesis.getVoices();
      const englishVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')));
      if (englishVoice) {
        utterance.voice = englishVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch {}
  },

  speakPlanet(planetId: PlanetId | 'minisystem' | 'overview') {
    if (planetId === 'overview') {
      this.speakText('Solar System: Viewing planetary orbits anchored around the Sun.');
      return;
    }
    if (planetId === 'minisystem') {
      this.speakText('Mini Solar System: Full planetary clockwork model in motion.');
      return;
    }

    const p = PLANETS_DATA[planetId];
    if (p) {
      const narration = `${p.name}. ${p.tagline}. ${p.overview.split('.')[0]}.`;
      this.speakText(narration);
    }
  },

  speakSpacecraft(craftId: SpacecraftId) {
    const sc = SPACECRAFTS_DATA[craftId];
    if (sc) {
      const narration = `${sc.name}. ${sc.tagline}. ${sc.description.split('.')[0]}.`;
      this.speakText(narration);
    }
  },

  playGalaxySound(galaxyId: string) {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const t = ctx.currentTime;

    try {
      // Deep cosmological density wave & galactic radio resonance
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(40, t);
      osc1.frequency.exponentialRampToValueAtTime(70, t + 0.4);
      osc1.frequency.linearRampToValueAtTime(45, t + 1.1);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(220, t);
      osc2.frequency.linearRampToValueAtTime(330, t + 0.5);
      osc2.frequency.exponentialRampToValueAtTime(110, t + 1.1);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(160, t);
      filter.frequency.exponentialRampToValueAtTime(480, t + 0.35);
      filter.frequency.exponentialRampToValueAtTime(140, t + 1.1);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 1.2);
      osc2.stop(t + 1.2);
    } catch {}
  },

  speakGalaxy(galaxyId: string) {
    const g = GALAXIES_DATA[galaxyId];
    if (g) {
      const narration = `${g.name}. ${g.type}. ${g.tagline}. ${g.overview.split('.')[0]}.`;
      this.speakText(narration);
    }
  },

  // Speed multiplier acceleration & deceleration whooshes
  playSpeedChange(speed: number) {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    try {
      if (speed === 0) {
        // Freeze / Pause temporal power-down hum
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, t);
        osc.frequency.exponentialRampToValueAtTime(70, t + 0.28);
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.3);
      } else if (speed === 0.5) {
        // Slow-motion deep harmonic
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, t);
        osc.frequency.exponentialRampToValueAtTime(240, t + 0.2);
        gain.gain.setValueAtTime(0.07, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.22);
      } else if (speed === 1) {
        // Normal orbital resonance
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, t);
        osc.frequency.exponentialRampToValueAtTime(554.37, t + 0.15);
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.18);
      } else if (speed === 5) {
        // Warp acceleration 5x
        [0, 0.06].forEach((offset, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(600 + idx * 300, t + offset);
          osc.frequency.setValueAtTime(300 + idx * 200, t + offset);
          osc.frequency.exponentialRampToValueAtTime(700 + idx * 300, t + offset + 0.18);
          gain.gain.setValueAtTime(0.06, t + offset);
          gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.2);
          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t + offset);
          osc.stop(t + offset + 0.2);
        });
      } else if (speed === 10) {
        // Hyper-drive 10x surge
        [0, 0.05, 0.1].forEach((offset, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(250 + idx * 250, t + offset);
          osc.frequency.exponentialRampToValueAtTime(1200 + idx * 400, t + offset + 0.25);
          gain.gain.setValueAtTime(0.07, t + offset);
          gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t + offset);
          osc.stop(t + offset + 0.25);
        });
      }
    } catch {}
  },

  // -------------------------------------------------------------
  // Ambient Cosmic Space Soundtrack & Music Synthesizer
  // -------------------------------------------------------------
  startCosmicMusic() {
    if (cosmicMusicActive) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    cosmicMusicActive = true;

    try {
      ambientGain = ctx.createGain();
      ambientGain.gain.setValueAtTime(0.001, ctx.currentTime);
      ambientGain.gain.exponentialRampToValueAtTime(isMuted ? 0.0001 : 0.045, ctx.currentTime + 1.5);

      ambientFilter = ctx.createBiquadFilter();
      ambientFilter.type = 'lowpass';
      ambientFilter.frequency.setValueAtTime(220, ctx.currentTime);

      // Low frequency LFO filter modulation (subtle breathing effect)
      ambientLFO = ctx.createOscillator();
      ambientLFO.frequency.setValueAtTime(0.08, ctx.currentTime);
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(80, ctx.currentTime);
      ambientLFO.connect(lfoGain);
      lfoGain.connect(ambientFilter.frequency);
      ambientLFO.start();

      // Deep Root Drone (F2 = 87.31 Hz)
      ambientOsc1 = ctx.createOscillator();
      ambientOsc1.type = 'sine';
      ambientOsc1.frequency.setValueAtTime(87.31, ctx.currentTime);

      // Fifth harmonic (C3 = 130.81 Hz)
      ambientOsc2 = ctx.createOscillator();
      ambientOsc2.type = 'triangle';
      ambientOsc2.frequency.setValueAtTime(130.81, ctx.currentTime);

      // Octave shimmer (F3 = 174.61 Hz)
      ambientOsc3 = ctx.createOscillator();
      ambientOsc3.type = 'sine';
      ambientOsc3.frequency.setValueAtTime(174.61, ctx.currentTime);

      ambientOsc1.connect(ambientFilter);
      ambientOsc2.connect(ambientFilter);
      ambientOsc3.connect(ambientFilter);
      ambientFilter.connect(ambientGain);
      ambientGain.connect(ctx.destination);

      ambientOsc1.start();
      ambientOsc2.start();
      ambientOsc3.start();

      // Periodic random celestial chime generator (crystalline stars)
      const chimes = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];
      const playRandomChime = () => {
        if (!cosmicMusicActive || isMuted) return;
        const note = chimes[Math.floor(Math.random() * chimes.length)];
        const chimeOsc = ctx.createOscillator();
        const chimeGain = ctx.createGain();
        chimeOsc.type = 'sine';
        chimeOsc.frequency.setValueAtTime(note, ctx.currentTime);
        chimeGain.gain.setValueAtTime(0.025, ctx.currentTime);
        chimeGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 3.2);
        chimeOsc.connect(chimeGain);
        chimeGain.connect(ctx.destination);
        chimeOsc.start();
        chimeOsc.stop(ctx.currentTime + 3.2);
      };

      cosmicChimeTimer = window.setInterval(() => {
        playRandomChime();
      }, 4500);
    } catch (e) {
      console.warn('Could not start cosmic ambient music:', e);
    }
  },

  stopCosmicMusic() {
    cosmicMusicActive = false;
    if (cosmicChimeTimer) {
      clearInterval(cosmicChimeTimer);
      cosmicChimeTimer = null;
    }
    const ctx = getAudioContext();
    if (ambientGain && ctx) {
      try {
        ambientGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
      } catch {}
    }
    setTimeout(() => {
      [ambientOsc1, ambientOsc2, ambientOsc3, ambientLFO].forEach(node => {
        if (node) {
          try {
            node.stop();
            node.disconnect();
          } catch {}
        }
      });
      ambientOsc1 = null;
      ambientOsc2 = null;
      ambientOsc3 = null;
      ambientLFO = null;
      ambientFilter = null;
      ambientGain = null;
    }, 850);
  },

  toggleCosmicMusic(): boolean {
    if (cosmicMusicActive) {
      this.stopCosmicMusic();
      return false;
    } else {
      this.startCosmicMusic();
      return true;
    }
  },

  isCosmicMusicActive(): boolean {
    return cosmicMusicActive;
  },

  // Real-world AR Object Detection & Anchor Audio Effects
  playTargetLock() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const t = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(1174.66, t); // D6
      osc1.frequency.setValueAtTime(1760.0, t + 0.08); // A6
      osc2.frequency.setValueAtTime(880, t);
      osc2.frequency.setValueAtTime(1318.51, t + 0.08);

      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.22);
      osc2.stop(t + 0.22);
    } catch {}
  },

  playAnchorPlaced() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const t = ctx.currentTime;
      // Sub-bass physical contact thud + digital lock ping
      const thudOsc = ctx.createOscillator();
      const thudGain = ctx.createGain();
      thudOsc.type = 'sine';
      thudOsc.frequency.setValueAtTime(160, t);
      thudOsc.frequency.exponentialRampToValueAtTime(45, t + 0.18);

      thudGain.gain.setValueAtTime(0.2, t);
      thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      thudOsc.connect(thudGain);
      thudGain.connect(ctx.destination);
      thudOsc.start(t);
      thudOsc.stop(t + 0.2);

      // Digital confirmation chime
      const chimeOsc = ctx.createOscillator();
      const chimeGain = ctx.createGain();
      chimeOsc.type = 'sine';
      chimeOsc.frequency.setValueAtTime(659.25, t + 0.05); // E5
      chimeOsc.frequency.setValueAtTime(1318.51, t + 0.12); // E6

      chimeGain.gain.setValueAtTime(0.08, t + 0.05);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      chimeOsc.connect(chimeGain);
      chimeGain.connect(ctx.destination);
      chimeOsc.start(t + 0.05);
      chimeOsc.stop(t + 0.35);
    } catch {}
  },

  speakDetection(text: string) {
    if (isMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.volume = 0.85;
      window.speechSynthesis.speak(utterance);
    } catch {}
  },

  // GPS Satellite Lock & Celestial Alignment Chirp
  playGpsLock() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    try {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(1480, t);
      osc1.frequency.setValueAtTime(2217.46, t + 0.08); // C#7
      osc2.frequency.setValueAtTime(740, t);
      osc2.frequency.setValueAtTime(1108.73, t + 0.08);

      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.28);
      osc2.stop(t + 0.28);
    } catch {}
  },

  // Cosmic Web Intergalactic Deep Resonance
  playCosmicWeb() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    try {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sawtooth';
      osc1.frequency.setValueAtTime(65.41, t); // C2 sub-bass
      osc2.frequency.setValueAtTime(130.81, t); // C3

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(180, t);
      filter.frequency.exponentialRampToValueAtTime(650, t + 0.6);
      filter.frequency.exponentialRampToValueAtTime(120, t + 1.6);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.6);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 1.6);
      osc2.stop(t + 1.6);
    } catch {}
  },

  // Warp speed streak whoosh during fast gesture zoom / 5x-10x speed
  playWarpStreak(speedMultiplier: number = 5) {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    try {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(1400, t + 0.22);
      osc.frequency.exponentialRampToValueAtTime(300, t + 0.45);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(450, t);
      filter.Q.setValueAtTime(3.5, t);

      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.45);
    } catch {}
  },

  // Sci-Fi Hologram projection activation chime & resonance
  playHoloActivate() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    try {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(440, t);
      osc1.frequency.exponentialRampToValueAtTime(1760, t + 0.18);
      osc1.frequency.setValueAtTime(1318.5, t + 0.22); // E6 shimmer

      osc2.frequency.setValueAtTime(220, t);
      osc2.frequency.exponentialRampToValueAtTime(880, t + 0.2);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, t);
      filter.Q.setValueAtTime(4.0, t);

      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.4);
      osc2.stop(t + 0.4);
    } catch {}
  },

  // Subtle sci-fi dwell lock pulse while hovering/interacting
  playHoloDwell() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(960, t);
      osc.frequency.exponentialRampToValueAtTime(1200, t + 0.05);

      gain.gain.setValueAtTime(0.025, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.06);
    } catch {}
  },

  // Sci-Fi Hologram dismissal power-down whoosh
  playHoloDismiss() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.exponentialRampToValueAtTime(110, t + 0.2);

      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.2);
    } catch {}
  },

  // Sci-Fi Hologram incremental scan tick during 2-second dwell / long-press
  playHoloScanTick(progress: number = 0.5) {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const freq = 640 + progress * 620;
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.12, t + 0.045);

      gain.gain.setValueAtTime(0.032, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.055);
    } catch {}
  },

  // Sci-Fi Holographic 2-second Tooltip Lock & Stack Unfold chime
  playHoloTooltipReveal() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    try {
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(900, t);
      filter.frequency.exponentialRampToValueAtTime(2400, t + 0.24);
      filter.Q.setValueAtTime(2.5, t);
      filter.connect(ctx.destination);

      const chord = [587.33, 880.0, 1174.66]; // D5, A5, D6 shimmer
      chord.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx === 1 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, t + idx * 0.035);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.015, t + idx * 0.035 + 0.26);

        gain.gain.setValueAtTime(0.045, t + idx * 0.035);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + idx * 0.035 + 0.28);

        osc.connect(gain);
        gain.connect(filter);
        osc.start(t + idx * 0.035);
        osc.stop(t + idx * 0.035 + 0.29);
      });
    } catch {}
  },

  // Optical Color Grading LUT calibration chime
  playColorGradeShift() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    try {
      [783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + i * 0.04);
        gain.gain.setValueAtTime(0.045, t + i * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.04 + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t + i * 0.04);
        osc.stop(t + i * 0.04 + 0.17);
      });
    } catch {}
  },

  // Crisp AR Camera Snapshot Shutter & Optical Flash sound
  playArCaptureShutter() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    try {
      const clickOsc = ctx.createOscillator();
      const clickGain = ctx.createGain();
      clickOsc.type = 'square';
      clickOsc.frequency.setValueAtTime(1400, t);
      clickOsc.frequency.exponentialRampToValueAtTime(220, t + 0.04);
      clickGain.gain.setValueAtTime(0.09, t);
      clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
      clickOsc.connect(clickGain);
      clickGain.connect(ctx.destination);
      clickOsc.start(t);
      clickOsc.stop(t + 0.045);

      const chimeOsc = ctx.createOscillator();
      const chimeGain = ctx.createGain();
      chimeOsc.type = 'sine';
      chimeOsc.frequency.setValueAtTime(1046.5, t + 0.05);
      chimeOsc.frequency.setValueAtTime(1567.98, t + 0.1);
      chimeGain.gain.setValueAtTime(0.07, t + 0.05);
      chimeGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      chimeOsc.connect(chimeGain);
      chimeGain.connect(ctx.destination);
      chimeOsc.start(t + 0.05);
      chimeOsc.stop(t + 0.26);
    } catch {}
  },

  // Procedural Asteroid / Planetary / Satellite Collision Impact SFX
  playCollisionImpact(intensity: number = 0.6, isMetallic: boolean = false) {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const amp = Math.min(1.0, Math.max(0.18, intensity));
    try {
      // Sub-bass kinetic thump
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(110 + amp * 55, t);
      subOsc.frequency.exponentialRampToValueAtTime(32, t + 0.28);
      subGain.gain.setValueAtTime(0.16 * amp, t);
      subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(t);
      subOsc.stop(t + 0.31);

      // Filtered noise burst for ejecta crackle
      const bufferSize = Math.floor(ctx.sampleRate * 0.22);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.28));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = isMetallic ? 'bandpass' : 'lowpass';
      filter.frequency.setValueAtTime(isMetallic ? 1400 : 680 + amp * 900, t);
      filter.Q.setValueAtTime(isMetallic ? 4.0 : 1.2, t);
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.11 * amp, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(t);

      // Optional metallic harmonic ring for spacecraft/satellite deflection
      if (isMetallic) {
        const ringOsc = ctx.createOscillator();
        const ringGain = ctx.createGain();
        ringOsc.type = 'triangle';
        ringOsc.frequency.setValueAtTime(860 + amp * 300, t);
        ringOsc.frequency.exponentialRampToValueAtTime(520, t + 0.25);
        ringGain.gain.setValueAtTime(0.06 * amp, t);
        ringGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
        ringOsc.connect(ringGain);
        ringGain.connect(ctx.destination);
        ringOsc.start(t);
        ringOsc.stop(t + 0.27);
      }
    } catch {}
  },

  // Meteoroid / Debris kinetic launcher discharge whoosh
  playDebrisLaunch() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, t);
      osc.frequency.exponentialRampToValueAtTime(640, t + 0.08);
      osc.frequency.exponentialRampToValueAtTime(120, t + 0.24);
      gain.gain.setValueAtTime(0.075, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.26);
    } catch {}
  },

  // Tactile voxel block placement thud + bright chime
  playBlockPlace() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(420, t + 0.055);
      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.075);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.08);
    } catch {}
  },

  // Voxel block mine / break crunch
  playBlockBreak() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(190, t);
      osc.frequency.exponentialRampToValueAtTime(65, t + 0.09);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.11);
    } catch {}
  },

  // Crafting / Synergy unlock chime
  playCraftSuccess() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    try {
      [440, 554.37, 659.25, 880].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t + idx * 0.055);
        gain.gain.setValueAtTime(0.07, t + idx * 0.055);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.055 + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t + idx * 0.055);
        osc.stop(t + idx * 0.055 + 0.23);
      });
    } catch {}
  },

  // Elastic gravity drop floor bounce tick
  playPhysicsBounce(velocityNorm: number = 0.6) {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const v = Math.min(1, Math.max(0.15, velocityNorm));
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180 + v * 220, t);
      osc.frequency.exponentialRampToValueAtTime(75, t + 0.09);
      gain.gain.setValueAtTime(0.1 * v, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.11);
    } catch {}
  },

  // Backward compatibility alias
  toggleAmbience(start: boolean) {
    if (start) this.startCosmicMusic();
    else this.stopCosmicMusic();
  },
};



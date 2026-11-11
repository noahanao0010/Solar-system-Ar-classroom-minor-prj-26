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

  // Background Cosmic Ambience
  toggleAmbience(start: boolean) {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (!start) {
      if (ambientOsc1) {
        try {
          ambientOsc1.stop();
          ambientOsc1.disconnect();
        } catch {}
        ambientOsc1 = null;
      }
      if (ambientOsc2) {
        try {
          ambientOsc2.stop();
          ambientOsc2.disconnect();
        } catch {}
        ambientOsc2 = null;
      }
      return;
    }

    if (ambientOsc1 || ambientOsc2) return;

    try {
      ambientGain = ctx.createGain();
      ambientGain.gain.setValueAtTime(isMuted ? 0 : 0.035, ctx.currentTime);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(180, ctx.currentTime);

      ambientOsc1 = ctx.createOscillator();
      ambientOsc1.type = 'sine';
      ambientOsc1.frequency.setValueAtTime(55, ctx.currentTime); // A1

      ambientOsc2 = ctx.createOscillator();
      ambientOsc2.type = 'triangle';
      ambientOsc2.frequency.setValueAtTime(110.5, ctx.currentTime); // A2 slight detune for space shimmer

      ambientOsc1.connect(filter);
      ambientOsc2.connect(filter);
      filter.connect(ambientGain);
      ambientGain.connect(ctx.destination);

      ambientOsc1.start();
      ambientOsc2.start();
    } catch {}
  },
};

/**
 * Dynamic GPU-Shader Deep-Space Starfield, Volumetric Nebulae & Inter-Galactic Particle System
 * Zero-GC per-frame updates, toroidal camera-relative dust advection, and LUT theme synchronization.
 */

import * as THREE from 'three';
import type { ColorGradePresetId } from './coreAssetsEngine';

export interface DeepSpaceParticleSystem {
  group: THREE.Group;
  setVisible: (visible: boolean) => void;
  setColorPreset: (presetId: ColorGradePresetId) => void;
  update: (
    elapsed: number,
    delta: number,
    simSpeed: number,
    localCamPos: THREE.Vector3,
    warpFactor: number,
  ) => void;
  dispose: () => void;
}

const PRESET_NEBULA_MODIFIERS: Record<
  ColorGradePresetId,
  { accentTint: [number, number, number]; nebulaBoost: number; starBoost: number }
> = {
  'deep-cosmos': {
    accentTint: [0.22, 0.74, 0.98],
    nebulaBoost: 1.0,
    starBoost: 1.0,
  },
  'solar-flare': {
    accentTint: [0.98, 0.62, 0.18],
    nebulaBoost: 1.15,
    starBoost: 1.08,
  },
  'cryo-observatory': {
    accentTint: [0.16, 0.85, 0.96],
    nebulaBoost: 0.96,
    starBoost: 1.05,
  },
  'natural-imax': {
    accentTint: [0.88, 0.92, 0.99],
    nebulaBoost: 0.82,
    starBoost: 0.98,
  },
};

export function createDeepSpaceParticleSystem(
  isSoftwareGl: boolean,
  pixelRatio: number,
): DeepSpaceParticleSystem {
  const group = new THREE.Group();
  group.name = 'DeepSpaceDynamicParticles';

  const galacticPlaneEuler = new THREE.Euler(0.46, 0.28, -0.32);
  const galacticQuat = new THREE.Quaternion().setFromEuler(galacticPlaneEuler);
  const _tempVec = new THREE.Vector3();

  // Shared tracked resources for clean unmount disposal
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.ShaderMaterial[] = [];

  // =========================================================================
  // LAYER 1: Multi-Spectral Scintillating Starfield & Milky Way Galactic Band
  // =========================================================================
  const starCount = isSoftwareGl ? 1700 : 4600;
  const starPositions = new Float32Array(starCount * 3);
  const starColors = new Float32Array(starCount * 3);
  const starSizes = new Float32Array(starCount);
  const starPhases = new Float32Array(starCount);
  const starTwinkle = new Float32Array(starCount);
  const starBrightMask = new Float32Array(starCount);

  const spectralPalette = [
    new THREE.Color('#93c5fd'), // O/B Hot Sapphire-Blue
    new THREE.Color('#bae6fd'), // B Blue-White
    new THREE.Color('#f8fafc'), // A Pure Ice White
    new THREE.Color('#fef3c7'), // F/G Solar Cream-Gold
    new THREE.Color('#fde68a'), // G Yellow Star
    new THREE.Color('#fdba74'), // K Orange Giant
    new THREE.Color('#fca5a5'), // M Red Dwarf
  ];

  for (let i = 0; i < starCount; i++) {
    const idx = i * 3;
    const isBandStar = i < starCount * 0.42;

    if (isBandStar) {
      // Sweeping Milky Way galactic band concentration
      const angle = Math.random() * Math.PI * 2;
      const dist = 165 + Math.random() * 365;
      const bandThickness = (Math.random() + Math.random() - 1.0) * 34;
      _tempVec.set(
        Math.cos(angle) * dist,
        bandThickness,
        Math.sin(angle) * dist,
      );
      _tempVec.applyQuaternion(galacticQuat);
    } else {
      // Spherical deep-cosmos dome shell
      const r = 145 + Math.random() * 410;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      _tempVec.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi),
      );
    }

    starPositions[idx] = _tempVec.x;
    starPositions[idx + 1] = _tempVec.y;
    starPositions[idx + 2] = _tempVec.z;

    const col = spectralPalette[Math.floor(Math.random() * spectralPalette.length)];
    const luminance = 0.58 + Math.random() * 0.42;
    starColors[idx] = col.r * luminance;
    starColors[idx + 1] = col.g * luminance;
    starColors[idx + 2] = col.b * luminance;

    const isHeroStar = Math.random() > 0.91;
    starSizes[i] = isHeroStar ? 4.2 + Math.random() * 3.6 : 1.3 + Math.random() * 2.4;
    starBrightMask[i] = isHeroStar ? 1.0 : 0.0;
    starPhases[i] = Math.random() * Math.PI * 2;
    starTwinkle[i] = 0.8 + Math.random() * 2.8;
  }

  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  starGeo.setAttribute('aColor', new THREE.BufferAttribute(starColors, 3));
  starGeo.setAttribute('aSize', new THREE.BufferAttribute(starSizes, 1));
  starGeo.setAttribute('aPhase', new THREE.BufferAttribute(starPhases, 1));
  starGeo.setAttribute('aTwinkle', new THREE.BufferAttribute(starTwinkle, 1));
  starGeo.setAttribute('aBrightMask', new THREE.BufferAttribute(starBrightMask, 1));
  geometries.push(starGeo);

  const starMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: pixelRatio },
      uWarpFactor: { value: 0 },
      uStarBoost: { value: 1.0 },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uPixelRatio;
      uniform float uWarpFactor;
      uniform float uStarBoost;

      attribute vec3 aColor;
      attribute float aSize;
      attribute float aPhase;
      attribute float aTwinkle;
      attribute float aBrightMask;

      varying vec3 vColor;
      varying float vTwinkle;
      varying float vBright;

      void main() {
        float osc = 0.68 + 0.32 * sin(uTime * aTwinkle + aPhase);
        float warpSurge = 1.0 + uWarpFactor * 0.45;
        vColor = aColor * osc * warpSurge * uStarBoost;
        vTwinkle = osc;
        vBright = aBrightMask;

        // Micro secular orbital drift
        float driftAngle = sin(uTime * 0.015 + aPhase) * 0.008;
        vec3 pos = position;
        float cx = cos(driftAngle);
        float sx = sin(driftAngle);
        pos.xz = mat2(cx, -sx, sx, cx) * pos.xz;

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        float dist = max(12.0, -mvPosition.z);
        gl_PointSize = clamp(aSize * uPixelRatio * (1.0 + uWarpFactor * 0.25) * (240.0 / dist), 1.4, 38.0);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vTwinkle;
      varying float vBright;

      void main() {
        vec2 p = gl_PointCoord - 0.5;
        float r = length(p);
        if (r > 0.5) discard;

        // Smooth Gaussian stellar core + airy halo
        float core = exp(-r * r * 28.0);
        float halo = exp(-r * r * 7.5) * 0.42;

        // Subtle 4-point optical diffraction spikes on bright giant stars
        float spikeX = exp(-abs(p.y) * 26.0) * exp(-abs(p.x) * 6.0);
        float spikeY = exp(-abs(p.x) * 26.0) * exp(-abs(p.y) * 6.0);
        float spikes = (spikeX + spikeY) * 0.55 * vBright * vTwinkle;

        float alpha = clamp(core + halo + spikes, 0.0, 1.0);
        vec3 finalRgb = mix(vColor, vec3(1.0), core * 0.55);
        gl_FragColor = vec4(finalRgb, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  materials.push(starMat);

  const starPoints = new THREE.Points(starGeo, starMat);
  starPoints.frustumCulled = false;
  group.add(starPoints);

  // =========================================================================
  // LAYER 2: Volumetric Ionized Nebula Clouds & Deep-Space Dust Pillars
  // =========================================================================
  const nebulaCount = isSoftwareGl ? 280 : 760;
  const nebPositions = new Float32Array(nebulaCount * 3);
  const nebColors = new Float32Array(nebulaCount * 3);
  const nebSizes = new Float32Array(nebulaCount);
  const nebPhases = new Float32Array(nebulaCount);
  const nebSpins = new Float32Array(nebulaCount);

  interface NebulaClusterDef {
    center: THREE.Vector3;
    spread: number;
    coreColor: THREE.Color;
    rimColor: THREE.Color;
  }

  const nebulaClusters: NebulaClusterDef[] = [
    // Orion-style Sapphire & Ion Cyan Reflection Nebula
    {
      center: new THREE.Vector3(190, 68, -210),
      spread: 95,
      coreColor: new THREE.Color('#0284c7'),
      rimColor: new THREE.Color('#312e81'),
    },
    // Carina-style Solar Amber & Rose Ionization Pillars
    {
      center: new THREE.Vector3(-210, 42, -165),
      spread: 105,
      coreColor: new THREE.Color('#f59e0b'),
      rimColor: new THREE.Color('#be185d'),
    },
    // Veil-style Violet & Magenta Supernova Remnant
    {
      center: new THREE.Vector3(-140, -78, 175),
      spread: 90,
      coreColor: new THREE.Color('#9333ea'),
      rimColor: new THREE.Color('#06b6d4'),
    },
    // Lagoon Emerald & Indigo Stellar Nursery
    {
      center: new THREE.Vector3(175, -62, 165),
      spread: 88,
      coreColor: new THREE.Color('#0d9488'),
      rimColor: new THREE.Color('#4338ca'),
    },
    // Deep Core Intergalactic Crimson-Gold Rift
    {
      center: new THREE.Vector3(20, 125, -295),
      spread: 120,
      coreColor: new THREE.Color('#e11d48'),
      rimColor: new THREE.Color('#f97316'),
    },
  ];

  const galacticGlowA = new THREE.Color('#1e1b4b');
  const galacticGlowB = new THREE.Color('#0369a1');

  for (let i = 0; i < nebulaCount; i++) {
    const idx = i * 3;
    const col = new THREE.Color();

    if (i < nebulaCount * 0.45) {
      // Cluster clouds (70% inner dense gas, 30% outer wispy halo)
      const cluster = nebulaClusters[i % nebulaClusters.length];
      const rad = Math.pow(Math.random(), 0.72) * cluster.spread;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      nebPositions[idx] = cluster.center.x + rad * Math.sin(phi) * Math.cos(theta);
      nebPositions[idx + 1] = cluster.center.y + rad * Math.cos(phi) * 0.62;
      nebPositions[idx + 2] = cluster.center.z + rad * Math.sin(phi) * Math.sin(theta);

      col.copy(cluster.coreColor).lerp(cluster.rimColor, rad / cluster.spread);
      nebSizes[i] = 44 + Math.random() * 58;
    } else {
      // Sweeping Galactic Equator Veil clouds
      const angle = Math.random() * Math.PI * 2;
      const dist = 195 + Math.random() * 210;
      const thickness = (Math.random() - 0.5) * 42 + Math.sin(angle * 3.0) * 18;
      _tempVec.set(Math.cos(angle) * dist, thickness, Math.sin(angle) * dist);
      _tempVec.applyQuaternion(galacticQuat);

      nebPositions[idx] = _tempVec.x;
      nebPositions[idx + 1] = _tempVec.y;
      nebPositions[idx + 2] = _tempVec.z;

      col.copy(galacticGlowA).lerp(galacticGlowB, Math.random());
      nebSizes[i] = 52 + Math.random() * 68;
    }

    nebColors[idx] = col.r;
    nebColors[idx + 1] = col.g;
    nebColors[idx + 2] = col.b;
    nebPhases[i] = Math.random() * Math.PI * 2;
    nebSpins[i] = (Math.random() - 0.5) * 0.12;
  }

  const nebGeo = new THREE.BufferGeometry();
  nebGeo.setAttribute('position', new THREE.BufferAttribute(nebPositions, 3));
  nebGeo.setAttribute('aColor', new THREE.BufferAttribute(nebColors, 3));
  nebGeo.setAttribute('aSize', new THREE.BufferAttribute(nebSizes, 1));
  nebGeo.setAttribute('aPhase', new THREE.BufferAttribute(nebPhases, 1));
  nebGeo.setAttribute('aSpin', new THREE.BufferAttribute(nebSpins, 1));
  geometries.push(nebGeo);

  const nebMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: pixelRatio },
      uWarpFactor: { value: 0 },
      uAccentTint: { value: new THREE.Vector3(0.22, 0.74, 0.98) },
      uNebulaBoost: { value: 1.0 },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uPixelRatio;
      uniform float uWarpFactor;

      attribute vec3 aColor;
      attribute float aSize;
      attribute float aPhase;
      attribute float aSpin;

      varying vec3 vColor;
      varying float vPhase;
      varying float vAngle;

      void main() {
        vColor = aColor;
        vPhase = aPhase;
        vAngle = aPhase + uTime * aSpin;

        // Slow billowing volumetric drift
        vec3 pos = position;
        pos.x += sin(uTime * 0.08 + aPhase) * 3.5;
        pos.y += cos(uTime * 0.06 + aPhase * 1.3) * 2.4;
        pos.z += sin(uTime * 0.07 - aPhase) * 3.5;

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        float dist = max(35.0, -mvPosition.z);
        gl_PointSize = clamp(aSize * uPixelRatio * (1.0 + uWarpFactor * 0.18) * (420.0 / dist), 12.0, 210.0);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uAccentTint;
      uniform float uNebulaBoost;

      varying vec3 vColor;
      varying float vPhase;
      varying float vAngle;

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float noise2(vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);
        float a = hash21(i);
        float b = hash21(i + vec2(1.0, 0.0));
        float c = hash21(i + vec2(0.0, 1.0));
        float d = hash21(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }

      void main() {
        vec2 centered = gl_PointCoord - 0.5;
        float dist = length(centered);
        if (dist > 0.5) discard;

        // Rotate UVs inside billboard for non-repeating wispy nebula filaments
        float c = cos(vAngle);
        float s = sin(vAngle);
        vec2 ruv = mat2(c, -s, s, c) * centered;

        float f1 = noise2(ruv * 4.2 + vec2(vPhase, uTime * 0.03));
        float f2 = noise2(ruv * 8.6 - vec2(uTime * 0.025, vPhase * 1.7));
        float wisp = f1 * 0.65 + f2 * 0.35;

        float radialEnvelope = exp(-dist * dist * 10.5);
        float filamentAlpha = radialEnvelope * smoothstep(0.18, 0.92, wisp) * 0.145 * uNebulaBoost;

        vec3 tinted = mix(vColor, vColor * (0.65 + 0.55 * uAccentTint), 0.32);
        vec3 litGas = tinted * (0.85 + wisp * 0.75);
        gl_FragColor = vec4(litGas, clamp(filamentAlpha, 0.0, 0.32));
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  materials.push(nebMat);

  const nebulaPoints = new THREE.Points(nebGeo, nebMat);
  nebulaPoints.frustumCulled = false;
  group.add(nebulaPoints);

  // =========================================================================
  // LAYER 3: Toroidal Inter-Galactic Quantum Dust & Travel Motes
  // Always wraps smoothly around uLocalCamPos in the vertex shader (zero CPU cost)
  // =========================================================================
  const dustCount = isSoftwareGl ? 440 : 1200;
  const dustPositions = new Float32Array(dustCount * 3);
  const dustDrift = new Float32Array(dustCount * 3);
  const dustColors = new Float32Array(dustCount * 3);
  const dustSizes = new Float32Array(dustCount);
  const dustPhases = new Float32Array(dustCount);

  const dustPalette = [
    new THREE.Color('#7dd3fc'), // Ion Cyan
    new THREE.Color('#c4b5fd'), // Cosmic Violet
    new THREE.Color('#fde68a'), // Starlight Gold
    new THREE.Color('#e0f2fe'), // Ice Blue
  ];

  for (let i = 0; i < dustCount; i++) {
    const idx = i * 3;
    dustPositions[idx] = (Math.random() - 0.5) * 190;
    dustPositions[idx + 1] = (Math.random() - 0.5) * 140;
    dustPositions[idx + 2] = (Math.random() - 0.5) * 190;

    dustDrift[idx] = (Math.random() - 0.5) * 1.4;
    dustDrift[idx + 1] = (Math.random() - 0.5) * 0.65;
    dustDrift[idx + 2] = (Math.random() - 0.5) * 1.4;

    const col = dustPalette[i % dustPalette.length];
    dustColors[idx] = col.r;
    dustColors[idx + 1] = col.g;
    dustColors[idx + 2] = col.b;

    dustSizes[i] = 1.2 + Math.random() * 2.1;
    dustPhases[i] = Math.random() * Math.PI * 2;
  }

  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  dustGeo.setAttribute('aDrift', new THREE.BufferAttribute(dustDrift, 3));
  dustGeo.setAttribute('aColor', new THREE.BufferAttribute(dustColors, 3));
  dustGeo.setAttribute('aSize', new THREE.BufferAttribute(dustSizes, 1));
  dustGeo.setAttribute('aPhase', new THREE.BufferAttribute(dustPhases, 1));
  geometries.push(dustGeo);

  const dustMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: pixelRatio },
      uLocalCamPos: { value: new THREE.Vector3(0, 32, 60) },
      uWarpFactor: { value: 0 },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uPixelRatio;
      uniform vec3 uLocalCamPos;
      uniform float uWarpFactor;

      attribute vec3 aDrift;
      attribute vec3 aColor;
      attribute float aSize;
      attribute float aPhase;

      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vec3 boxSize = vec3(190.0, 140.0, 190.0);
        vec3 halfBox = boxSize * 0.5;

        // Continuous cosmic drift + toroidal wrap around live camera position
        vec3 drifted = position + aDrift * uTime * (1.0 + uWarpFactor * 2.5);
        vec3 rel = mod(drifted - uLocalCamPos + halfBox, boxSize) - halfBox;
        vec3 wrappedPos = uLocalCamPos + rel;

        // Smooth edge fade so particles never pop at wrap box boundaries
        float edgeNorm = max(
          abs(rel.x) / halfBox.x,
          max(abs(rel.y) / halfBox.y, abs(rel.z) / halfBox.z)
        );
        float edgeFade = 1.0 - smoothstep(0.65, 0.98, edgeNorm);

        vec4 mvPosition = modelViewMatrix * vec4(wrappedPos, 1.0);
        float camDist = length(mvPosition.xyz);
        float nearFade = smoothstep(2.5, 8.5, camDist);

        float pulse = 0.55 + 0.45 * sin(uTime * 1.8 + aPhase);
        vColor = aColor * (0.9 + uWarpFactor * 0.85);
        vAlpha = edgeFade * nearFade * pulse * (0.42 + uWarpFactor * 0.48);

        gl_PointSize = clamp(
          aSize * uPixelRatio * (1.0 + uWarpFactor * 0.8) * (72.0 / max(4.0, camDist)),
          1.2,
          14.0
        );
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vec2 p = gl_PointCoord - 0.5;
        float r = length(p);
        if (r > 0.5) discard;
        float glow = exp(-r * r * 18.0);
        gl_FragColor = vec4(vColor, glow * vAlpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  materials.push(dustMat);

  const dustPoints = new THREE.Points(dustGeo, dustMat);
  dustPoints.frustumCulled = false;
  group.add(dustPoints);

  // =========================================================================
  // LAYER 4: Deep-Space Quasar & Pulsar Beacon Stars
  // =========================================================================
  const beaconCount = isSoftwareGl ? 42 : 96;
  const beaconPos = new Float32Array(beaconCount * 3);
  const beaconColors = new Float32Array(beaconCount * 3);
  const beaconPhases = new Float32Array(beaconCount);
  const beaconPalette = [
    new THREE.Color('#38bdf8'),
    new THREE.Color('#f472b6'),
    new THREE.Color('#a78bfa'),
    new THREE.Color('#fbbf24'),
  ];

  for (let i = 0; i < beaconCount; i++) {
    const idx = i * 3;
    const r = 210 + Math.random() * 270;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    beaconPos[idx] = r * Math.sin(phi) * Math.cos(theta);
    beaconPos[idx + 1] = r * Math.sin(phi) * Math.sin(theta);
    beaconPos[idx + 2] = r * Math.cos(phi);

    const c = beaconPalette[i % beaconPalette.length];
    beaconColors[idx] = c.r;
    beaconColors[idx + 1] = c.g;
    beaconColors[idx + 2] = c.b;
    beaconPhases[i] = Math.random() * Math.PI * 2;
  }

  const beaconGeo = new THREE.BufferGeometry();
  beaconGeo.setAttribute('position', new THREE.BufferAttribute(beaconPos, 3));
  beaconGeo.setAttribute('aColor', new THREE.BufferAttribute(beaconColors, 3));
  beaconGeo.setAttribute('aPhase', new THREE.BufferAttribute(beaconPhases, 1));
  geometries.push(beaconGeo);

  const beaconMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: pixelRatio },
      uWarpFactor: { value: 0 },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uPixelRatio;
      uniform float uWarpFactor;

      attribute vec3 aColor;
      attribute float aPhase;

      varying vec3 vColor;
      varying float vPulse;
      varying float vAngle;

      void main() {
        // Sharp rhythmic pulsar heartbeat wave
        float wave = pow(0.5 + 0.5 * sin(uTime * 1.45 + aPhase), 3.0);
        vPulse = 0.45 + wave * 0.85;
        vColor = aColor * (0.9 + wave * 0.7 + uWarpFactor * 0.4);
        vAngle = aPhase + uTime * 0.25;

        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        float dist = max(25.0, -mvPosition.z);
        gl_PointSize = clamp((7.5 + wave * 4.5) * uPixelRatio * (260.0 / dist), 3.0, 28.0);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vPulse;
      varying float vAngle;

      void main() {
        vec2 p = gl_PointCoord - 0.5;
        float r = length(p);
        if (r > 0.5) discard;

        float c = cos(vAngle);
        float s = sin(vAngle);
        vec2 rp = mat2(c, -s, s, c) * p;

        float core = exp(-r * r * 36.0);
        float crossA = exp(-abs(rp.y) * 28.0) * exp(-abs(rp.x) * 6.5);
        float crossB = exp(-abs(rp.x) * 28.0) * exp(-abs(rp.y) * 6.5);
        float flare = (crossA + crossB) * 0.75 * vPulse;

        float alpha = clamp(core + flare, 0.0, 1.0);
        gl_FragColor = vec4(mix(vColor, vec3(1.0), core * 0.7), alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  materials.push(beaconMat);

  const beaconPoints = new THREE.Points(beaconGeo, beaconMat);
  beaconPoints.frustumCulled = false;
  group.add(beaconPoints);

  return {
    group,
    setVisible: (visible: boolean) => {
      group.visible = visible;
    },
    setColorPreset: (presetId: ColorGradePresetId) => {
      const mod = PRESET_NEBULA_MODIFIERS[presetId];
      nebMat.uniforms.uAccentTint.value.set(...mod.accentTint);
      nebMat.uniforms.uNebulaBoost.value = mod.nebulaBoost;
      starMat.uniforms.uStarBoost.value = mod.starBoost;
    },
    update: (
      elapsed: number,
      delta: number,
      simSpeed: number,
      localCamPos: THREE.Vector3,
      warpFactor: number,
    ) => {
      const clampedWarp = THREE.MathUtils.clamp(warpFactor, 0, 1.5);
      starMat.uniforms.uTime.value = elapsed;
      starMat.uniforms.uWarpFactor.value = clampedWarp;

      nebMat.uniforms.uTime.value = elapsed;
      nebMat.uniforms.uWarpFactor.value = clampedWarp;

      dustMat.uniforms.uTime.value = elapsed;
      dustMat.uniforms.uLocalCamPos.value.copy(localCamPos);
      dustMat.uniforms.uWarpFactor.value = clampedWarp;

      beaconMat.uniforms.uTime.value = elapsed;
      beaconMat.uniforms.uWarpFactor.value = clampedWarp;

      // Subtle majestic cosmic drift rotation proportional to simulation activity
      const driftRate = delta * 0.0028 * Math.max(0.25, simSpeed * 0.35);
      group.rotation.y += driftRate;
    },
    dispose: () => {
      geometries.forEach(g => g.dispose());
      materials.forEach(m => m.dispose());
    },
  };
}

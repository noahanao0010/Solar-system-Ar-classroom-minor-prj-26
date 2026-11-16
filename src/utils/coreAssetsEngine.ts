/**
 * Core 3D Assets, Shaders, Deep-Space Environment & Post-Processing Color Grading Engine
 * Shared across 3D Space, Planet Explorer, Compare, and Camera AR views.
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { PlanetId } from '../types/astronomy';
import { PLANETS_DATA } from '../data/planetsData';
import {
  getPlanetTexture,
  getPlanetBumpTexture,
  getPlanetRoughnessTexture,
  getRingTexture,
} from './textureGenerator';
import { getStarPointTexture } from './galaxyGenerator';

export type ColorGradePresetId = 'deep-cosmos' | 'solar-flare' | 'cryo-observatory' | 'natural-imax';

export interface ColorGradeConfig {
  id: ColorGradePresetId;
  label: string;
  description: string;
  exposure: number;
  contrast: number;
  saturation: number;
  vignette: number;
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
  shadowTint: [number, number, number];
  highlightTint: [number, number, number];
}

export const COLOR_GRADE_PRESETS: Record<ColorGradePresetId, ColorGradeConfig> = {
  'deep-cosmos': {
    id: 'deep-cosmos',
    label: 'Deep Cosmos',
    description: 'Obsidian shadows, calibrated teal-gold split-tone & celestial bloom',
    exposure: 1.08,
    contrast: 1.07,
    saturation: 1.12,
    vignette: 0.24,
    bloomStrength: 0.62,
    bloomRadius: 0.45,
    bloomThreshold: 0.72,
    shadowTint: [0.02, 0.05, 0.14],
    highlightTint: [1.04, 0.99, 0.92],
  },
  'solar-flare': {
    id: 'solar-flare',
    label: 'Solar Flare',
    description: 'Warm heliospheric amber highlights with rich corona radiance',
    exposure: 1.12,
    contrast: 1.09,
    saturation: 1.16,
    vignette: 0.22,
    bloomStrength: 0.82,
    bloomRadius: 0.55,
    bloomThreshold: 0.65,
    shadowTint: [0.08, 0.03, 0.05],
    highlightTint: [1.1, 0.98, 0.84],
  },
  'cryo-observatory': {
    id: 'cryo-observatory',
    label: 'Cryo Observatory',
    description: 'Crisp sapphire & ion-cyan scientific instrumentation grading',
    exposure: 1.05,
    contrast: 1.06,
    saturation: 1.06,
    vignette: 0.28,
    bloomStrength: 0.52,
    bloomRadius: 0.42,
    bloomThreshold: 0.76,
    shadowTint: [0.01, 0.06, 0.16],
    highlightTint: [0.92, 1.02, 1.08],
  },
  'natural-imax': {
    id: 'natural-imax',
    label: 'Natural IMAX',
    description: 'Balanced astronomical clarity with neutral highlights & subtle bloom',
    exposure: 1.04,
    contrast: 1.03,
    saturation: 1.04,
    vignette: 0.14,
    bloomStrength: 0.4,
    bloomRadius: 0.35,
    bloomThreshold: 0.8,
    shadowTint: [0.01, 0.02, 0.04],
    highlightTint: [1.0, 1.0, 1.0],
  },
};

export interface ColorGradeTheme {
  accentHex: string;
  secondaryHex: string;
  borderRgba: string;
  glowRgba: string;
  tintCss: string;
  cssFilter: string;
}

export const COLOR_GRADE_THEMES: Record<ColorGradePresetId, ColorGradeTheme> = {
  'deep-cosmos': {
    accentHex: '#38bdf8',
    secondaryHex: '#818cf8',
    borderRgba: 'rgba(56, 189, 248, 0.42)',
    glowRgba: 'rgba(56, 189, 248, 0.22)',
    tintCss: 'rgba(6, 14, 34, 0.88)',
    cssFilter: 'contrast(1.04) saturate(1.1)',
  },
  'solar-flare': {
    accentHex: '#f59e0b',
    secondaryHex: '#fb7185',
    borderRgba: 'rgba(245, 158, 11, 0.46)',
    glowRgba: 'rgba(245, 158, 11, 0.24)',
    tintCss: 'rgba(22, 12, 8, 0.88)',
    cssFilter: 'contrast(1.06) saturate(1.15) sepia(0.08)',
  },
  'cryo-observatory': {
    accentHex: '#22d3ee',
    secondaryHex: '#60a5fa',
    borderRgba: 'rgba(34, 211, 238, 0.46)',
    glowRgba: 'rgba(34, 211, 238, 0.22)',
    tintCss: 'rgba(4, 18, 32, 0.88)',
    cssFilter: 'contrast(1.05) saturate(1.05) hue-rotate(-4deg)',
  },
  'natural-imax': {
    accentHex: '#e2e8f0',
    secondaryHex: '#38bdf8',
    borderRgba: 'rgba(226, 232, 240, 0.36)',
    glowRgba: 'rgba(148, 163, 184, 0.18)',
    tintCss: 'rgba(10, 14, 24, 0.88)',
    cssFilter: 'contrast(1.02) saturate(1.02)',
  },
};

/**
 * Custom GLSL Filmic Cosmic Color Grading, Micro-Chromatic Dispersion & Vignette Shader
 */
export const CosmicColorGradingShader = {
  uniforms: {
    tDiffuse: { value: null },
    uExposure: { value: 1.08 },
    uContrast: { value: 1.07 },
    uSaturation: { value: 1.12 },
    uVignette: { value: 0.24 },
    uHoloPulse: { value: 0.0 },
    uShadowTint: { value: new THREE.Vector3(0.02, 0.05, 0.14) },
    uHighlightTint: { value: new THREE.Vector3(1.04, 0.99, 0.92) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uExposure;
    uniform float uContrast;
    uniform float uSaturation;
    uniform float uVignette;
    uniform float uHoloPulse;
    uniform vec3 uShadowTint;
    uniform vec3 uHighlightTint;
    varying vec2 vUv;

    void main() {
      vec2 centered = vUv - 0.5;
      float distSq = dot(centered, centered);

      // Subtle holographic chromatic micro-dispersion near edges when scanning or warping
      float shift = uHoloPulse * 0.0045 * distSq;
      vec4 baseTex = texture2D(tDiffuse, vUv);
      vec3 texRgb = baseTex.rgb;
      if (uHoloPulse > 0.01) {
        texRgb.r = texture2D(tDiffuse, vUv + centered * shift).r;
        texRgb.b = texture2D(tDiffuse, vUv - centered * shift).b;
      }

      vec3 col = texRgb * (uExposure + uHoloPulse * 0.06);

      // Filmic contrast around mid-gray
      col = (col - 0.5) * uContrast + 0.5;
      col = max(col, 0.0);

      // Luma & Split-Toning (shadow cool tint + highlight warm/crisp tint)
      float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
      float shadowMask = clamp(1.0 - luma * 2.2, 0.0, 1.0);
      float highlightMask = clamp((luma - 0.45) * 1.8, 0.0, 1.0);

      col += uShadowTint * shadowMask * 0.22;
      col = mix(col, col * uHighlightTint, highlightMask * 0.65);

      // Saturation adjustment
      float finalLuma = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(finalLuma), col, uSaturation);

      // Subtle optical edge vignette
      float vig = 1.0 - smoothstep(0.18, 0.85, distSq) * uVignette;
      col *= vig;

      gl_FragColor = vec4(clamp(col, 0.0, 1.0), baseTex.a);
    }
  `,
};

export interface CinematicPipeline {
  composer: EffectComposer;
  bloomPass: UnrealBloomPass;
  gradePass: ShaderPass;
  applyPreset: (presetId: ColorGradePresetId) => void;
  setBloomStrength: (val: number) => void;
  setHoloPulse: (val: number) => void;
  setSize: (w: number, h: number) => void;
  dispose: () => void;
}

/**
 * Creates calibrated EffectComposer post-processing pipeline with UnrealBloom + Color Grading
 */
export function createCinematicComposer(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  width: number,
  height: number,
  initialPreset: ColorGradePresetId = 'deep-cosmos',
): CinematicPipeline {
  const preset = COLOR_GRADE_PRESETS[initialPreset];

  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(Math.max(1, width), Math.max(1, height)),
    preset.bloomStrength,
    preset.bloomRadius,
    preset.bloomThreshold,
  );
  composer.addPass(bloomPass);

  const gradePass = new ShaderPass(CosmicColorGradingShader);
  composer.addPass(gradePass);

  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  const applyPreset = (presetId: ColorGradePresetId) => {
    const cfg = COLOR_GRADE_PRESETS[presetId];
    bloomPass.strength = cfg.bloomStrength;
    bloomPass.radius = cfg.bloomRadius;
    bloomPass.threshold = cfg.bloomThreshold;

    gradePass.uniforms.uExposure.value = cfg.exposure;
    gradePass.uniforms.uContrast.value = cfg.contrast;
    gradePass.uniforms.uSaturation.value = cfg.saturation;
    gradePass.uniforms.uVignette.value = cfg.vignette;
    gradePass.uniforms.uShadowTint.value.set(...cfg.shadowTint);
    gradePass.uniforms.uHighlightTint.value.set(...cfg.highlightTint);
  };

  applyPreset(initialPreset);

  return {
    composer,
    bloomPass,
    gradePass,
    applyPreset,
    setBloomStrength: (val: number) => {
      bloomPass.strength = val;
    },
    setHoloPulse: (val: number) => {
      gradePass.uniforms.uHoloPulse.value = val;
    },
    setSize: (w: number, h: number) => {
      const safeW = Math.max(1, w);
      const safeH = Math.max(1, h);
      composer.setSize(safeW, safeH);
      bloomPass.resolution.set(safeW, safeH);
    },
    dispose: () => {
      composer.dispose();
    },
  };
}

/**
 * Custom GLSL Rayleigh-Scattering Atmospheric Fresnel Limb Glow Shader
 */
export function createAtmosphereFresnelMesh(
  radius: number,
  colorHex: string | number,
  intensity: number = 0.85,
  power: number = 3.2,
): THREE.Mesh {
  const geo = new THREE.SphereGeometry(radius, 48, 48);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(colorHex) },
      uIntensity: { value: intensity },
      uPower: { value: power },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vNormalView = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uIntensity;
      uniform float uPower;
      varying vec3 vNormalView;
      varying vec3 vViewDir;

      void main() {
        float fresnel = pow(1.0 - max(dot(normalize(vNormalView), normalize(vViewDir)), 0.0), uPower);
        gl_FragColor = vec4(uColor * uIntensity, clamp(fresnel * uIntensity, 0.0, 0.85));
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.FrontSide,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 2;
  return mesh;
}

/**
 * Animated Solar Corona & Plasma Prominence Loops around the Sun
 */
export function createSolarCoronaGroup(sunRadius: number): THREE.Group {
  const coronaGroup = new THREE.Group();

  // 1. Animated Plasma Corona Shell
  const coronaGeo = new THREE.SphereGeometry(sunRadius * 1.24, 48, 48);
  const coronaMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uInnerColor: { value: new THREE.Color('#ffaa00') },
      uOuterColor: { value: new THREE.Color('#ff3d00') },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      varying vec3 vPos;
      void main() {
        vPos = position;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vNormalView = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uInnerColor;
      uniform vec3 uOuterColor;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      varying vec3 vPos;

      void main() {
        float ndotv = max(dot(normalize(vNormalView), normalize(vViewDir)), 0.0);
        float rim = pow(1.0 - ndotv, 2.2);
        float plasma = sin(vPos.x * 3.5 + uTime * 2.2) * cos(vPos.y * 4.0 - uTime * 1.6) * sin(vPos.z * 3.0 + uTime);
        float flare = 0.65 + 0.35 * plasma;
        vec3 col = mix(uOuterColor, uInnerColor, ndotv * 0.5 + 0.45);
        gl_FragColor = vec4(col * flare * 1.3, clamp(rim * 0.72 * flare, 0.0, 0.85));
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.BackSide,
  });
  const coronaMesh = new THREE.Mesh(coronaGeo, coronaMat);
  coronaGroup.add(coronaMesh);

  // 2. Solar Magnetic Prominence Loops (3 arcing glowing torus segments)
  const loopColors = [0xff8a00, 0xff5500, 0xffcc33];
  for (let i = 0; i < 3; i++) {
    const loopGeo = new THREE.TorusGeometry(sunRadius * 0.32, sunRadius * 0.018, 12, 32, Math.PI);
    const loopMat = new THREE.MeshBasicMaterial({
      color: loopColors[i],
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
    });
    const loopMesh = new THREE.Mesh(loopGeo, loopMat);
    const phi = (i * Math.PI * 2) / 3;
    loopMesh.position.set(
      Math.cos(phi) * sunRadius * 0.96,
      (i - 1) * sunRadius * 0.25,
      Math.sin(phi) * sunRadius * 0.96,
    );
    loopMesh.lookAt(0, 0, 0);
    loopMesh.rotateY(Math.PI / 2);
    coronaGroup.add(loopMesh);
  }

  coronaGroup.userData = {
    coronaMat,
    update: (elapsed: number) => {
      coronaMat.uniforms.uTime.value = elapsed;
    },
  };

  return coronaGroup;
}

/**
 * Multi-Spectral Astronomical Starfield (O/B Blue, A/F White, G Gold, K/M Amber Stars)
 */
export function createSpectralStarfield(starCount: number = 3500, spread: number = 850): THREE.Points {
  const starTex = getStarPointTexture();
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);

  const palette = [
    new THREE.Color('#93c5fd'), // O/B Hot Blue
    new THREE.Color('#e0f2fe'), // A Ice White
    new THREE.Color('#ffffff'), // F Crisp White
    new THREE.Color('#fde68a'), // G Solar Yellow
    new THREE.Color('#fdba74'), // K Orange Giant
  ];

  for (let i = 0; i < starCount; i++) {
    const idx = i * 3;
    // Spherical shell distribution to keep stars crisp around horizon
    const r = 120 + Math.random() * (spread * 0.45);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    positions[idx] = r * Math.sin(phi) * Math.cos(theta);
    positions[idx + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[idx + 2] = r * Math.cos(phi);

    const col = palette[Math.floor(Math.random() * palette.length)];
    const brightness = 0.65 + Math.random() * 0.35;
    colors[idx] = col.r * brightness;
    colors[idx + 1] = col.g * brightness;
    colors[idx + 2] = col.b * brightness;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 1.85,
    map: starTex,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });

  return new THREE.Points(geo, mat);
}

/**
 * Deep-Space Cosmic Nebula Band & Interstellar Dust Clouds
 */
export function createNebulaBackdrop(cloudCount: number = 600): THREE.Group {
  const group = new THREE.Group();
  const starTex = getStarPointTexture();
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(cloudCount * 3);
  const colors = new Float32Array(cloudCount * 3);

  const cIndigo = new THREE.Color('#312e81');
  const cCyan = new THREE.Color('#0ea5e9');
  const cAmber = new THREE.Color('#d97706');
  const cRose = new THREE.Color('#be185d');

  for (let i = 0; i < cloudCount; i++) {
    const idx = i * 3;
    const angle = Math.random() * Math.PI * 2;
    const dist = 160 + Math.random() * 240;
    const bandTilt = (Math.random() - 0.5) * 90 + Math.sin(angle * 2) * 35;

    positions[idx] = Math.cos(angle) * dist;
    positions[idx + 1] = bandTilt;
    positions[idx + 2] = Math.sin(angle) * dist;

    const r = Math.random();
    const chosen = r < 0.45 ? cIndigo : r < 0.72 ? cCyan : r < 0.88 ? cRose : cAmber;
    colors[idx] = chosen.r;
    colors[idx + 1] = chosen.g;
    colors[idx + 2] = chosen.b;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 28,
    map: starTex,
    vertexColors: true,
    transparent: true,
    opacity: 0.14,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });

  const clouds = new THREE.Points(geo, mat);
  group.add(clouds);
  return group;
}

/**
 * Shared Core Planet Asset Builder (PBR Maps + Fresnel Atmospheric Limb + Rings)
 */
export function createEnhancedPlanetAssembly(
  planetId: PlanetId,
  radius: number,
  segments: number = 48,
): THREE.Mesh {
  const pData = PLANETS_DATA[planetId];
  const geo = new THREE.SphereGeometry(radius, segments, segments);
  const colorTex = getPlanetTexture(planetId);
  const bumpTex = getPlanetBumpTexture(planetId);
  const roughTex = getPlanetRoughnessTexture(planetId);

  const isEarth = planetId === 'earth';
  const isRocky = planetId === 'mercury' || planetId === 'mars';

  const mat = new THREE.MeshStandardMaterial({
    map: colorTex,
    bumpMap: bumpTex,
    bumpScale: isRocky ? radius * 0.045 : isEarth ? radius * 0.025 : radius * 0.01,
    roughnessMap: roughTex,
    roughness: isEarth ? 0.55 : isRocky ? 0.85 : 0.65,
    metalness: isEarth ? 0.14 : 0.06,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.z = THREE.MathUtils.degToRad(pData.tiltDegrees);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  // Add Atmospheric Fresnel Limb Glow for planets with atmospheres
  if (planetId !== 'mercury') {
    const atmoColorMap: Partial<Record<PlanetId, string>> = {
      venus: '#facc15',
      earth: '#38bdf8',
      mars: '#fb923c',
      jupiter: '#fdba74',
      saturn: '#fde68a',
      uranus: '#67e8f9',
      neptune: '#3b82f6',
    };
    const atmoColor = atmoColorMap[planetId] || pData.accentColor;
    const atmoIntensity = planetId === 'earth' || planetId === 'neptune' ? 0.9 : 0.62;
    const fresnelShell = createAtmosphereFresnelMesh(radius * 1.055, atmoColor, atmoIntensity, 3.0);
    mesh.add(fresnelShell);
  }

  // Concentric Rings for Saturn or Uranus
  if (planetId === 'saturn' || planetId === 'uranus') {
    const innerR = radius * 1.38;
    const outerR = radius * 2.52;
    const ringGeo = new THREE.RingGeometry(innerR, outerR, 72);
    ringGeo.rotateX(Math.PI / 2);
    const ringTex = getRingTexture(planetId);
    const ringMat = new THREE.MeshStandardMaterial({
      map: ringTex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92,
      roughness: 0.55,
      metalness: 0.05,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.castShadow = true;
    ringMesh.receiveShadow = true;
    mesh.add(ringMesh);
  }

  return mesh;
}

export interface HologramVFXAssembly {
  group: THREE.Group;
  setTint: (hexColor: string) => void;
  update: (elapsed: number, dwellProgress: number, isLocked: boolean, targetScale?: number) => void;
  dispose: () => void;
}

/**
 * Procedural 3D Holographic Scanner & VFX Rig for targeted 3D objects in SolarSystemView
 * Features dual counter-rotating segmented orbital rings, vertical holographic sweep plane,
 * and rising additive photon particles synchronized with color grading presets.
 */
export function createHologramVFXAssembly(): HologramVFXAssembly {
  const group = new THREE.Group();
  group.visible = false;

  // 1. Primary equatorial segmented telemetry ring
  const innerRingGeo = new THREE.RingGeometry(1.18, 1.26, 48, 1, 0, Math.PI * 1.45);
  innerRingGeo.rotateX(-Math.PI / 2);
  const innerRingMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.78,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
  group.add(innerRing);

  // 2. Counter-rotating outer arc lock ring
  const outerRingGeo = new THREE.RingGeometry(1.42, 1.49, 48, 1, Math.PI * 0.2, Math.PI * 1.15);
  outerRingGeo.rotateX(-Math.PI / 2);
  const outerRingMat = new THREE.MeshBasicMaterial({
    color: 0x818cf8,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.62,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
  group.add(outerRing);

  // 3. Tilted orbital calibration ring
  const tiltRingGeo = new THREE.TorusGeometry(1.34, 0.015, 8, 64);
  const tiltRingMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.38,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const tiltRing = new THREE.Mesh(tiltRingGeo, tiltRingMat);
  tiltRing.rotation.x = Math.PI * 0.36;
  group.add(tiltRing);

  // 4. Vertical sweeping scan ring
  const scanSweepGeo = new THREE.TorusGeometry(1.15, 0.014, 8, 48);
  scanSweepGeo.rotateX(Math.PI / 2);
  const scanSweepMat = new THREE.MeshBasicMaterial({
    color: 0x7dd3fc,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const scanSweep = new THREE.Mesh(scanSweepGeo, scanSweepMat);
  group.add(scanSweep);

  // 5. Rising Holographic Photon Particle Column
  const particleCount = 48;
  const pPositions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    const angle = (i / particleCount) * Math.PI * 2;
    const rad = 1.05 + (i % 5) * 0.1;
    pPositions[i * 3] = Math.cos(angle) * rad;
    pPositions[i * 3 + 1] = ((i % 10) / 10) * 2.0 - 1.0;
    pPositions[i * 3 + 2] = Math.sin(angle) * rad;
  }
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
  const particleMat = new THREE.PointsMaterial({
    color: 0x38bdf8,
    size: 0.14,
    map: getStarPointTexture(),
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  group.add(particles);

  let currentScale = 1.0;

  return {
    group,
    setTint: (hexColor: string) => {
      const c = new THREE.Color(hexColor);
      innerRingMat.color.copy(c);
      scanSweepMat.color.copy(c).lerp(new THREE.Color('#ffffff'), 0.25);
      particleMat.color.copy(c);
      tiltRingMat.color.copy(c);
    },
    update: (elapsed: number, dwellProgress: number, isLocked: boolean, targetScale = 1.5) => {
      currentScale = THREE.MathUtils.lerp(currentScale, Math.max(0.65, targetScale), 0.16);
      group.scale.setScalar(currentScale);

      const spinBoost = isLocked ? 1.45 : 0.75 + dwellProgress * 1.8;
      innerRing.rotation.y = elapsed * 1.1 * spinBoost;
      outerRing.rotation.y = -elapsed * 0.85 * spinBoost;
      tiltRing.rotation.y = elapsed * 0.5;
      tiltRing.rotation.z = Math.sin(elapsed * 0.8) * 0.35;

      // Vertical laser sweep
      scanSweep.position.y = Math.sin(elapsed * (isLocked ? 2.4 : 4.2)) * 0.95;
      scanSweepMat.opacity = isLocked ? 0.55 + Math.sin(elapsed * 6) * 0.2 : 0.35 + dwellProgress * 0.55;

      innerRingMat.opacity = isLocked ? 0.85 : 0.35 + dwellProgress * 0.55;
      outerRingMat.opacity = isLocked ? 0.7 : 0.25 + dwellProgress * 0.5;

      // Update rising photon particles
      const posAttr = particleGeo.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < particleCount; i++) {
        let py = posAttr.getY(i);
        py += 0.018 * (isLocked ? 1.1 : 1.7);
        if (py > 1.1) py = -1.1;
        posAttr.setY(i, py);
      }
      posAttr.needsUpdate = true;
      particles.rotation.y = elapsed * 0.45;
      particleMat.opacity = isLocked ? 0.78 : 0.3 + dwellProgress * 0.6;
    },
    dispose: () => {
      innerRingGeo.dispose();
      innerRingMat.dispose();
      outerRingGeo.dispose();
      outerRingMat.dispose();
      tiltRingGeo.dispose();
      tiltRingMat.dispose();
      scanSweepGeo.dispose();
      scanSweepMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
    },
  };
}

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { motion, AnimatePresence } from 'motion/react';
import { useClassroom } from '../context/ClassroomContext';
import { PLANETS_DATA, ORDERED_PLANETS } from '../data/planetsData';
import { SPACECRAFTS_DATA, ORDERED_SPACECRAFT } from '../data/spaceCraftData';
import { PlanetId, SpacecraftId, ArPlaceableId } from '../types/astronomy';
import { getPlanetTexture } from '../utils/textureGenerator';
import { createSpacecraftObject } from '../utils/spaceCraftModels';
import { create3DGalaxy } from '../utils/galaxyGenerator';
import {
  createEnhancedPlanetAssembly,
  createSolarCoronaGroup,
  COLOR_GRADE_PRESETS,
  COLOR_GRADE_THEMES,
  ColorGradePresetId,
} from '../utils/coreAssetsEngine';
import { GALAXIES_DATA, ORDERED_GALAXIES } from '../data/galaxiesData';
import { soundEffects } from '../utils/soundEffects';
import { WebXRAR } from '../ar/webxr-ar';
import { deviceGyro } from '../utils/deviceOrientation';
import { useGyroscope } from '../hooks/useGyroscope';
import { SciFiHologramHUD } from './SciFiHologramHUD';
import { SegmentedTabs } from './ui/ObservatoryPrimitives';
import { arObjectDetector, ArObjectDetector, VisionDetectionFrame, DetectedObject } from '../utils/arObjectDetector';
import {
  createArHologramGuideRig,
  ArHologramGuideRig,
  HowToArStep,
} from '../utils/arHologramGuide';
import {
  Camera,
  RotateCw,
  Info,
  ArrowLeft,
  Sparkles,
  RefreshCw,
  Sun,
  X,
  Scan,
  Smartphone,
  Flame,
  Orbit,
  Rocket,
  Satellite,
  Compass,
  ChevronDown,
  ChevronUp,
  Move,
  History,
  Target,
  Crosshair,
  Palette,
  EyeOff,
  Eye,
  Play,
  Pause,
  MapPin,
  HelpCircle,
  Volume2,
  VolumeX,
  CheckCircle2,
  FlaskConical,
  Shield,
  Zap,
  ArrowDownToLine,
  Moon,
} from 'lucide-react';

const HOWTO_AR_STORAGE_KEY = 'ar_smart_classroom_howto_completed_v1';

const HOW_TO_AR_STEPS: {
  id: HowToArStep;
  num: string;
  title: string;
  headline: string;
  description: string;
  voicePrompt: string;
}[] = [
  {
    id: 'scan',
    num: '01',
    title: 'Surface Scan',
    headline: 'Sweep over a flat desk or floor',
    description:
      'Aim your camera at a well-lit desk or floor until ASTRA’s laser sweep and Vision markers lock onto the horizontal plane.',
    voicePrompt: 'Step 1: Sweep your camera gently across a bright desk or floor to lock the surface plane.',
  },
  {
    id: 'place',
    num: '02',
    title: 'Tap & Anchor',
    headline: 'Tap anywhere to anchor your asset',
    description:
      'Watch ASTRA project an anchor pulse onto the reticle. Tap anywhere on screen—or hit Anchor Now—to lock your 3D model.',
    voicePrompt: 'Step 2: Tap anywhere on your detected surface to anchor the three-D model with real-world shadows.',
  },
  {
    id: 'manipulate',
    num: '03',
    title: 'Move & Inspect',
    headline: 'Drag, pinch-scale & open Holo HUD',
    description:
      'Drag to reposition, switch to Rotate, pinch or use sliders to resize, ignite Thrusters on rockets, or tap Holo HUD for telemetry.',
    voicePrompt: 'Step 3: Drag to move, pinch to resize, or open the Holo HUD to inspect detailed astrophysics.',
  },
];

const AR_ANCHOR_STORAGE_KEY = 'ar_smart_classroom_persistent_anchor_v1';

const _gyroEuler = new THREE.Euler(0, 0, 0, 'YXZ');
const _gyroQuat = new THREE.Quaternion();

interface SavedArAnchor {
  modelId: ArPlaceableId;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  rotationSpeed: number;
  timestamp: number;
}

export const CameraARView: React.FC = () => {
  const {
    selectedPlanetId,
    recordArPlacement,
    setCurrentView,
    markPlanetExplored,
    grantBonusXp,
    colorGradePreset,
    setColorGradePreset,
  } = useClassroom();

  // AR Modes
  const [arCapability, setArCapability] = useState<'checking' | 'webxr' | 'camera-stream' | 'unsupported'>('checking');
  const [activeEngine, setActiveEngine] = useState<'webxr' | 'camera-stream'>('camera-stream');

  // Selected Model & Category — honor incoming selectedPlanetId!
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'planet' | 'satellite' | 'rocket' | 'spacecraft' | 'galaxy'>('all');
  const [selectedModel, setSelectedModel] = useState<ArPlaceableId>(() => selectedPlanetId || 'earth');

  // Real-World Object Detection & Dynamic Vision Tracking
  const [visionEnabled, setVisionEnabled] = useState<boolean>(true);
  const [interactMode, setInteractMode] = useState<'place' | 'move' | 'rotate'>('move');
  const [visionFrame, setVisionFrame] = useState<VisionDetectionFrame | null>(null);
  const [activeTarget, setActiveTarget] = useState<DetectedObject | null>(null);
  const visionFrameRef = useRef<VisionDetectionFrame | null>(null);
  const lastVisionTimeRef = useRef<number>(0);
  const lastDetectedCountRef = useRef<number>(0);

  // Device Gyroscope & Motion Tracking
  const {
    isActive: isGyroActive,
    isHardware: isGyroHardware,
    toggleGyro,
    calibrate: calibrateGyro,
  } = useGyroscope();

  const [isPlaced, setIsPlaced] = useState<boolean>(false);
  const [modelScale, setModelScale] = useState<number>(1.0);
  const [rotationSpeed, setRotationSpeed] = useState<number>(0.4);
  const [showFactSheet, setShowFactSheet] = useState<boolean>(false);
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [statusMessage, setStatusMessage] = useState<string>('Scanning desk or floor surface... Tap anywhere to anchor');
  const [isPlaneDetected, setIsPlaneDetected] = useState<boolean>(false);
  const [hitTestResult, setHitTestResult] = useState<boolean | null>(null);
  const [showMoveDevicePrompt, setShowMoveDevicePrompt] = useState<boolean>(false);
  const [restoredFromSavedAnchor, setRestoredFromSavedAnchor] = useState<boolean>(false);
  const [pendingSavedAnchor, setPendingSavedAnchor] = useState<SavedArAnchor | null>(null);

  // AR Shadow, Calibration & Cinema HUD state
  const [shadowsEnabled, setShadowsEnabled] = useState<boolean>(true);
  const [shadowOpacity, setShadowOpacity] = useState<number>(0.55);
  const [autoRoomLight, setAutoRoomLight] = useState<boolean>(true);
  const [exposureBoost, setExposureBoost] = useState<number>(1.05);
  const [thrustersIgnited, setThrustersIgnited] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState<boolean>(true);
  const [isControlsExpanded, setIsControlsExpanded] = useState<boolean>(false);
  const [isAssetTrayOpen, setIsAssetTrayOpen] = useState<boolean>(true);
  const [cinemaHudHidden, setCinemaHudHidden] = useState<boolean>(false);
  const [showColorMenu, setShowColorMenu] = useState<boolean>(false);
  const [showHologramHUD, setShowHologramHUD] = useState<boolean>(false);
  const [snapshotFlash, setSnapshotFlash] = useState<boolean>(false);

  // Interactive AR Experiment & Experience Lab State
  const [showArLab, setShowArLab] = useState<boolean>(false);
  const [experimentGravityBody, setExperimentGravityBody] = useState<'placed' | 'earth' | 'moon' | 'mars' | 'jupiter'>('placed');
  const [dropTelemetry, setDropTelemetry] = useState<{
    active: boolean;
    elapsedS: number;
    maxSpeedMs: number;
    bounces: number;
    gMs2: number;
  }>({ active: false, elapsedS: 0, maxSpeedMs: 0, bounces: 0, gMs2: 9.81 });
  const [magnetosphereOn, setMagnetosphereOn] = useState<boolean>(false);
  const [sunAzimuthDeg, setSunAzimuthDeg] = useState<number>(40);
  const [companionMoonOn, setCompanionMoonOn] = useState<boolean>(false);
  const labXpClaimedRef = useRef<boolean>(false);

  // Interactive 'How to AR' Onboarding Sequence with 3D Hologram Guide ASTRA
  const [showHowToGuide, setShowHowToGuide] = useState<boolean>(() => {
    try {
      return !localStorage.getItem(HOWTO_AR_STORAGE_KEY);
    } catch {
      return true;
    }
  });
  const [guideStepIdx, setGuideStepIdx] = useState<number>(0);
  const [guideVoiceOn, setGuideVoiceOn] = useState<boolean>(true);
  const showHowToGuideRef = useRef<boolean>(showHowToGuide);
  const guideStepIdxRef = useRef<number>(0);

  // DOM Refs
  const mountRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const webxrButtonContainerRef = useRef<HTMLDivElement>(null);

  // Three.js Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const placedGroupRef = useRef<THREE.Group | null>(null);
  const reticleMeshRef = useRef<THREE.Mesh | null>(null);
  const floorShadowPlaneRef = useRef<THREE.Mesh | null>(null);
  const floorShadowMatRef = useRef<THREE.ShadowMaterial | null>(null);
  const keyLightRef = useRef<THREE.DirectionalLight | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const arSpawnRingRef = useRef<THREE.Mesh | null>(null);
  const arGuideRigRef = useRef<ArHologramGuideRig | null>(null);
  const arExperimentGroupRef = useRef<THREE.Group | null>(null);
  const dropProbeRef = useRef<THREE.Mesh | null>(null);
  const dropPhysRef = useRef<{
    active: boolean;
    yOffset: number;
    velocity: number;
    elapsedS: number;
    maxSpeedMs: number;
    bounces: number;
    gMs2: number;
  }>({ active: false, yOffset: 0.52, velocity: 0, elapsedS: 0, maxSpeedMs: 0, bounces: 0, gMs2: 9.81 });
  const magnetosphereGroupRef = useRef<THREE.Group | null>(null);
  const solarWindRef = useRef<{
    points: THREE.Points | null;
    velocities: Float32Array;
    active: boolean;
    life: number;
  }>({ points: null, velocities: new Float32Array(120 * 3), active: false, life: 0 });
  const companionMoonPivotRef = useRef<THREE.Group | null>(null);
  const spawnRingProgressRef = useRef<number>(1);
  const currentDampScaleRef = useRef<number>(1.0);
  const webxrArInstanceRef = useRef<WebXRAR | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const thrusterFlameRef = useRef<THREE.Mesh | null>(null);

  // Live reactive refs for rAF loop
  const isAnimatingRef = useRef<boolean>(true);
  const rotationSpeedRef = useRef<number>(0.4);
  const modelScaleRef = useRef<number>(1.0);
  const autoRoomLightRef = useRef<boolean>(true);
  const colorGradeRef = useRef<ColorGradePresetId>(colorGradePreset);
  const exposureBoostRef = useRef<number>(1.05);
  const magnetosphereOnRef = useRef<boolean>(false);
  const companionMoonOnRef = useRef<boolean>(false);
  const selectedModelRef = useRef<ArPlaceableId>(selectedModel);

  useEffect(() => { isAnimatingRef.current = isAnimating; }, [isAnimating]);
  useEffect(() => { rotationSpeedRef.current = rotationSpeed; }, [rotationSpeed]);
  useEffect(() => { modelScaleRef.current = modelScale; }, [modelScale]);
  useEffect(() => { autoRoomLightRef.current = autoRoomLight; }, [autoRoomLight]);
  useEffect(() => { colorGradeRef.current = colorGradePreset; }, [colorGradePreset]);
  useEffect(() => { exposureBoostRef.current = exposureBoost; }, [exposureBoost]);
  useEffect(() => { showHowToGuideRef.current = showHowToGuide; }, [showHowToGuide]);
  useEffect(() => { guideStepIdxRef.current = guideStepIdx; }, [guideStepIdx]);
  useEffect(() => { magnetosphereOnRef.current = magnetosphereOn; }, [magnetosphereOn]);
  useEffect(() => { companionMoonOnRef.current = companionMoonOn; }, [companionMoonOn]);
  useEffect(() => { selectedModelRef.current = selectedModel; }, [selectedModel]);

  // Touch & Mouse Gesture Refs (including drag distance guard)
  const touchStartDistRef = useRef<number | null>(null);
  const touchStartScaleRef = useRef<number>(1.0);
  const touchLastPosRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const mouseLastPosRef = useRef<{ x: number; y: number } | null>(null);
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const dragDistanceRef = useRef<number>(0);

  const persistAnchorState = (
    modelId: ArPlaceableId,
    pos: THREE.Vector3,
    rot: THREE.Euler,
    scale: number,
    rotSpeed: number
  ) => {
    try {
      const data: SavedArAnchor = {
        modelId,
        position: [pos.x, pos.y, pos.z],
        rotation: [rot.x, rot.y, rot.z],
        scale,
        rotationSpeed: rotSpeed,
        timestamp: Date.now(),
      };
      localStorage.setItem(AR_ANCHOR_STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Ignore quota errors
    }
  };

  const getModelDisplayName = (id: ArPlaceableId): string => {
    if (id === 'minisystem') return 'Mini Solar System';
    if (id in PLANETS_DATA) return PLANETS_DATA[id as PlanetId].name;
    if (id in SPACECRAFTS_DATA) return SPACECRAFTS_DATA[id as SpacecraftId].name;
    return GALAXIES_DATA[id]?.name || 'Cosmic Model';
  };

  const triggerSpawnPulseVfx = (pos: THREE.Vector3, preset: ColorGradePresetId) => {
    if (!arSpawnRingRef.current) return;
    const theme = COLOR_GRADE_THEMES[preset];
    arSpawnRingRef.current.position.set(pos.x, pos.y + 0.004, pos.z);
    arSpawnRingRef.current.scale.setScalar(0.2);
    arSpawnRingRef.current.visible = true;
    const mat = arSpawnRingRef.current.material as THREE.MeshBasicMaterial;
    mat.color.set(theme.accentHex);
    mat.opacity = 0.95;
    spawnRingProgressRef.current = 0;
  };

  // Helper to build 3D object for planets, spacecraft, or galaxies
  const createPlaceableObject = (id: ArPlaceableId): THREE.Group => {
    let group: THREE.Group;

    if (id === 'minisystem') {
      group = new THREE.Group();
      const sunGeo = new THREE.SphereGeometry(0.12, 32, 32);
      const sunTex = getPlanetTexture('sun');
      const sunMat = new THREE.MeshBasicMaterial({ map: sunTex });
      const sunMesh = new THREE.Mesh(sunGeo, sunMat);
      sunMesh.castShadow = true;
      sunMesh.add(createSolarCoronaGroup(0.12));
      group.add(sunMesh);

      const miniLight = new THREE.PointLight(0xffeedd, 1.8, 3);
      miniLight.castShadow = true;
      group.add(miniLight);

      const miniPlanets: { id: PlanetId; dist: number; s: number; speed: number }[] = [
        { id: 'mercury', dist: 0.22, s: 0.02, speed: 1.5 },
        { id: 'venus', dist: 0.32, s: 0.035, speed: 1.2 },
        { id: 'earth', dist: 0.44, s: 0.04, speed: 1.0 },
        { id: 'mars', dist: 0.56, s: 0.03, speed: 0.8 },
        { id: 'jupiter', dist: 0.75, s: 0.08, speed: 0.5 },
        { id: 'saturn', dist: 0.95, s: 0.07, speed: 0.4 },
        { id: 'uranus', dist: 1.15, s: 0.05, speed: 0.3 },
        { id: 'neptune', dist: 1.35, s: 0.05, speed: 0.2 },
      ];

      miniPlanets.forEach(mp => {
        const oCurve = new THREE.EllipseCurve(0, 0, mp.dist, mp.dist, 0, Math.PI * 2, false, 0);
        const pts = oCurve.getPoints(64).map(p => new THREE.Vector3(p.x, 0, p.y));
        const oGeo = new THREE.BufferGeometry().setFromPoints(pts);
        const oMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.35 });
        const oLine = new THREE.Line(oGeo, oMat);
        group.add(oLine);

        const pMesh = createEnhancedPlanetAssembly(mp.id, mp.s, 24);
        pMesh.userData = { dist: mp.dist, speed: mp.speed, angle: Math.random() * Math.PI * 2 };
        group.add(pMesh);
      });
    } else if (id in PLANETS_DATA) {
      group = new THREE.Group();
      const radius = 0.2;

      if (id === 'sun') {
        const sunGeo = new THREE.SphereGeometry(radius, 40, 40);
        const sunMat = new THREE.MeshBasicMaterial({
          map: getPlanetTexture('sun'),
          color: 0xffeedd,
        });
        const sunMesh = new THREE.Mesh(sunGeo, sunMat);
        sunMesh.add(createSolarCoronaGroup(radius));
        group.add(sunMesh);
      } else {
        const pMesh = createEnhancedPlanetAssembly(id as PlanetId, radius, 48);
        group.add(pMesh);
      }

      const shadowGeo = new THREE.PlaneGeometry(radius * 3.5, radius * 3.5);
      const shadowCanvas = document.createElement('canvas');
      shadowCanvas.width = 128;
      shadowCanvas.height = 128;
      const sCtx = shadowCanvas.getContext('2d')!;
      const g = sCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
      g.addColorStop(0.5, 'rgba(0, 0, 0, 0.2)');
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      sCtx.fillStyle = g;
      sCtx.fillRect(0, 0, 128, 128);
      const shadowTex = new THREE.CanvasTexture(shadowCanvas);
      const shadowMat = new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
      });
      const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
      shadowMesh.rotation.x = -Math.PI / 2;
      shadowMesh.position.y = -radius * 1.02;
      group.add(shadowMesh);
    } else if (id in GALAXIES_DATA) {
      group = create3DGalaxy(id, 8500);
      group.scale.setScalar(0.045);

      const shadowGeo = new THREE.PlaneGeometry(1.4, 1.4);
      const shadowCanvas = document.createElement('canvas');
      shadowCanvas.width = 128;
      shadowCanvas.height = 128;
      const sCtx = shadowCanvas.getContext('2d')!;
      const g = sCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
      g.addColorStop(0.35, 'rgba(2, 132, 199, 0.18)');
      g.addColorStop(0.8, 'rgba(0, 0, 0, 0.45)');
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      sCtx.fillStyle = g;
      sCtx.fillRect(0, 0, 128, 128);
      const shadowTex = new THREE.CanvasTexture(shadowCanvas);
      const shadowMat = new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
      });
      const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
      shadowMesh.rotation.x = -Math.PI / 2;
      shadowMesh.position.y = -0.15;
      group.add(shadowMesh);
    } else {
      group = createSpacecraftObject(id as SpacecraftId);
    }

    group.userData.modelId = id;

    group.traverse(child => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return group;
  };

  // 1. Check WebXR and Camera capabilities
  useEffect(() => {
    async function checkCapabilities() {
      if (typeof navigator !== 'undefined' && 'xr' in navigator && (navigator as any).xr?.isSessionSupported) {
        try {
          const isSupported = await (navigator as any).xr.isSessionSupported('immersive-ar');
          if (isSupported) {
            setArCapability('webxr');
            setActiveEngine('webxr');
            return;
          }
        } catch {
          // Ignore WebXR check failure
        }
      }

      if (typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)) {
        setArCapability('camera-stream');
        setActiveEngine('camera-stream');
      } else {
        setArCapability('unsupported');
      }
    }

    checkCapabilities();
  }, []);

  // 2. Start Camera Video Stream
  useEffect(() => {
    let active = true;

    async function startCamera() {
      try {
        if (videoStreamRef.current) {
          videoStreamRef.current.getTracks().forEach(t => t.stop());
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (active && videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          videoStreamRef.current = stream;
          setCameraPermissionGranted(true);
          setStatusMessage('Scanning desk or floor surface... Tap anywhere to anchor');
        }
      } catch (err) {
        console.warn('Camera stream permission denied or unavailable:', err);
        setCameraPermissionGranted(false);
        setStatusMessage('Virtual Studio Active — tap anywhere on the spatial floor to anchor');
      }
    }

    startCamera();

    return () => {
      active = false;
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [facingMode]);

  // Display gentle guidance prompt if user hasn't placed after 3.5 seconds (and guide isn't active)
  useEffect(() => {
    if (isPlaced || hitTestResult !== null || showHowToGuide) {
      setShowMoveDevicePrompt(false);
      return;
    }

    const timer = setTimeout(() => {
      if ((hitTestResult === null || !isPlaneDetected) && !isPlaced && !showHowToGuideRef.current) {
        setShowMoveDevicePrompt(true);
        soundEffects.playScan();
      }
    }, 3500);

    return () => clearTimeout(timer);
  }, [isPlaced, hitTestResult, isPlaneDetected, showHowToGuide]);

  // Update shadow material opacity when state changes
  useEffect(() => {
    if (floorShadowMatRef.current) {
      floorShadowMatRef.current.opacity = shadowsEnabled ? shadowOpacity : 0;
      floorShadowMatRef.current.needsUpdate = true;
    }
  }, [shadowOpacity, shadowsEnabled]);

  // Sync exposure & holographic guide tint when LUT or exposure boost changes
  useEffect(() => {
    if (rendererRef.current) {
      const cfg = COLOR_GRADE_PRESETS[colorGradePreset];
      rendererRef.current.toneMappingExposure = cfg.exposure * exposureBoost;
    }
    arGuideRigRef.current?.setTint(COLOR_GRADE_THEMES[colorGradePreset].accentHex);
  }, [colorGradePreset, exposureBoost]);

  // Day/Night Terminator Sun Azimuth control around anchored AR scene
  useEffect(() => {
    if (!keyLightRef.current) return;
    const rad = (sunAzimuthDeg * Math.PI) / 180;
    keyLightRef.current.position.set(Math.cos(rad) * 2.4, 3.4, Math.sin(rad) * 2.4);
  }, [sunAzimuthDeg]);

  // Sync 3D ASTRA Holographic Guide step & visibility
  useEffect(() => {
    const rig = arGuideRigRef.current;
    if (rig) {
      rig.setVisible(showHowToGuide && !cinemaHudHidden);
      const stepObj = HOW_TO_AR_STEPS[guideStepIdx] || HOW_TO_AR_STEPS[0];
      rig.setStep(stepObj.id);
    }
    if (showHowToGuide && !cinemaHudHidden) {
      const stepObj = HOW_TO_AR_STEPS[guideStepIdx] || HOW_TO_AR_STEPS[0];
      soundEffects.playHoloScanTick(0.35 + guideStepIdx * 0.28);
      if (guideVoiceOn) {
        soundEffects.speakDetection(stepObj.voicePrompt);
      }
    }
  }, [showHowToGuide, guideStepIdx, cinemaHudHidden]);

  // 3. Initialize Three.js Scene with RoomEnvironment PBR IBL
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.05,
      50
    );
    camera.position.set(0, 0.45, 1.25);
    camera.lookAt(0, 0, -0.2);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = COLOR_GRADE_PRESETS[colorGradeRef.current].exposure * exposureBoostRef.current;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // PBR Environment Reflections (vital for metallic spacecraft, JWST gold foil & icy worlds)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envRT = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envRT.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    // Realistic Lighting Rig (dynamically adapts to camera room brightness)
    const keyLight = new THREE.DirectionalLight(0xfffaed, 2.7);
    keyLight.position.set(1.5, 3.8, 1.4);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.05;
    keyLight.shadow.camera.far = 10;
    keyLight.shadow.camera.left = -2.5;
    keyLight.shadow.camera.right = 2.5;
    keyLight.shadow.camera.top = 2.5;
    keyLight.shadow.camera.bottom = -2.5;
    keyLight.shadow.bias = -0.001;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);
    keyLightRef.current = keyLight;

    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x1e293b, 0.75);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.48);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    // Real-World Floor Plane with ShadowMaterial
    const floorGeo = new THREE.PlaneGeometry(30, 30);
    const floorShadowMat = new THREE.ShadowMaterial({
      opacity: shadowOpacity,
      transparent: true,
      depthWrite: false,
    });
    floorShadowMat.polygonOffset = true;
    floorShadowMat.polygonOffsetFactor = -1;
    floorShadowMat.polygonOffsetUnits = -1;
    floorShadowMatRef.current = floorShadowMat;

    const floorShadowPlane = new THREE.Mesh(floorGeo, floorShadowMat);
    floorShadowPlane.rotation.x = -Math.PI / 2;
    floorShadowPlane.position.set(0, -0.252, -0.7);
    floorShadowPlane.receiveShadow = true;
    scene.add(floorShadowPlane);
    floorShadowPlaneRef.current = floorShadowPlane;

    // Placed Object Container
    const placedGroup = new THREE.Group();
    scene.add(placedGroup);
    placedGroupRef.current = placedGroup;

    // Precision Placement Reticle
    const reticleGeo = new THREE.RingGeometry(0.085, 0.115, 48);
    const reticleMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const reticle = new THREE.Mesh(reticleGeo, reticleMat);
    reticle.rotation.x = -Math.PI / 2;
    reticle.position.set(0, -0.25, -0.7);
    scene.add(reticle);
    reticleMeshRef.current = reticle;

    const outerReticleGeo = new THREE.RingGeometry(0.145, 0.155, 48);
    const outerReticleMat = new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35,
    });
    const outerReticle = new THREE.Mesh(outerReticleGeo, outerReticleMat);
    reticle.add(outerReticle);

    const dotGeo = new THREE.CircleGeometry(0.018, 24);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide });
    const dot = new THREE.Mesh(dotGeo, dotMat);
    dot.position.z = 0.001;
    reticle.add(dot);

    // 3D Anchor Lock Shockwave Ring VFX
    const spawnRingGeo = new THREE.RingGeometry(0.16, 0.21, 64);
    const spawnRingMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const spawnRing = new THREE.Mesh(spawnRingGeo, spawnRingMat);
    spawnRing.rotation.x = -Math.PI / 2;
    spawnRing.visible = false;
    scene.add(spawnRing);
    arSpawnRingRef.current = spawnRing;

    // 3D Holographic AR Guide Character ("ASTRA") for interactive onboarding
    const guideRig = createArHologramGuideRig();
    guideRig.setTint(COLOR_GRADE_THEMES[colorGradeRef.current].accentHex);
    guideRig.setVisible(showHowToGuideRef.current);
    guideRig.setStep(HOW_TO_AR_STEPS[guideStepIdxRef.current]?.id || 'scan');
    scene.add(guideRig.group);
    arGuideRigRef.current = guideRig;

    // 3D AR Experiment & Experience Lab Group (Gravity Probe, Magnetosphere Dipole, Solar Wind, Companion Moon)
    const expGroup = new THREE.Group();
    scene.add(expGroup);
    arExperimentGroupRef.current = expGroup;

    const probeGeo = new THREE.SphereGeometry(0.032, 24, 24);
    const probeMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.75,
      metalness: 0.5,
      roughness: 0.25,
    });
    const probeMesh = new THREE.Mesh(probeGeo, probeMat);
    probeMesh.castShadow = true;
    probeMesh.visible = false;
    expGroup.add(probeMesh);
    dropProbeRef.current = probeMesh;

    const magGroup = new THREE.Group();
    const magGeo = new THREE.TorusGeometry(0.32, 0.0055, 12, 64);
    const magMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.48,
    });
    [0, Math.PI / 3, (2 * Math.PI) / 3].forEach(rotY => {
      const ring = new THREE.Mesh(magGeo, magMat);
      ring.rotation.y = rotY;
      ring.rotation.x = Math.PI / 2.4;
      magGroup.add(ring);
    });
    magGroup.visible = false;
    expGroup.add(magGroup);
    magnetosphereGroupRef.current = magGroup;

    const windCount = 120;
    const windPos = new Float32Array(windCount * 3);
    const windGeo = new THREE.BufferGeometry();
    windGeo.setAttribute('position', new THREE.BufferAttribute(windPos, 3));
    const windMat = new THREE.PointsMaterial({
      color: 0xfbbf24,
      size: 0.022,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const windPoints = new THREE.Points(windGeo, windMat);
    windPoints.visible = false;
    expGroup.add(windPoints);
    solarWindRef.current = {
      points: windPoints,
      velocities: new Float32Array(windCount * 3),
      active: false,
      life: 0,
    };

    const moonPivot = new THREE.Group();
    const moonGeo = new THREE.SphereGeometry(0.036, 20, 20);
    const moonMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.85, metalness: 0.05 });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonMesh.position.set(0.38, 0.06, 0);
    moonMesh.castShadow = true;
    moonPivot.add(moonMesh);
    moonPivot.visible = false;
    expGroup.add(moonPivot);
    companionMoonPivotRef.current = moonPivot;

    // Check Persistent Anchor Storage (only auto-restore if matching incoming selection or default earth)
    try {
      const savedAnchorStr = localStorage.getItem(AR_ANCHOR_STORAGE_KEY);
      if (savedAnchorStr) {
        const savedAnchor: SavedArAnchor = JSON.parse(savedAnchorStr);
        if (savedAnchor && savedAnchor.modelId) {
          const incomingNonDefault = selectedPlanetId && selectedPlanetId !== 'earth' && selectedPlanetId !== savedAnchor.modelId;
          if (incomingNonDefault) {
            setPendingSavedAnchor(savedAnchor);
          } else {
            setSelectedModel(savedAnchor.modelId);
            setModelScale(savedAnchor.scale || 1.0);
            modelScaleRef.current = savedAnchor.scale || 1.0;
            currentDampScaleRef.current = savedAnchor.scale || 1.0;
            setRotationSpeed(savedAnchor.rotationSpeed ?? 0.4);

            const restoredModel = createPlaceableObject(savedAnchor.modelId);
            restoredModel.position.set(savedAnchor.position[0], savedAnchor.position[1], savedAnchor.position[2]);
            restoredModel.rotation.set(savedAnchor.rotation[0], savedAnchor.rotation[1], savedAnchor.rotation[2]);
            placedGroup.add(restoredModel);
            placedGroup.scale.setScalar(savedAnchor.scale || 1.0);

            floorShadowPlane.position.y = savedAnchor.position[1] - 0.002;
            floorShadowPlane.visible = true;
            reticle.visible = false;

            setIsPlaced(true);
            setIsPlaneDetected(true);
            setRestoredFromSavedAnchor(true);
            setStatusMessage('Restored previous AR anchor — drag to adjust or tap Reposition');
          }
        }
      }
    } catch {
      // Ignore corrupt storage
    }

    // Initialize WebXR AR if verified supported
    if (arCapability === 'webxr') {
      try {
        const webxr = new WebXRAR(
          renderer,
          scene,
          () => createPlaceableObject(selectedModel),
          webxrButtonContainerRef.current || undefined
        );

        webxr.onFallback = () => {
          setActiveEngine('camera-stream');
          setArCapability('camera-stream');
          setStatusMessage('Switched to Live Camera Passthrough AR');
        };

        webxr.onHitTestResult = (hasHit: boolean) => {
          setHitTestResult(hasHit ? true : null);
          setIsPlaneDetected(hasHit);
          if (hasHit) {
            setShowMoveDevicePrompt(false);
            setStatusMessage('Physical surface locked — tap to anchor 3D model');
          }
        };

        webxr.onPlaced = (obj) => {
          soundEffects.playSuccess();
          setIsPlaced(true);
          setIsPlaneDetected(true);
          setShowMoveDevicePrompt(false);
          recordArPlacement();
          persistAnchorState(selectedModel, obj.position, obj.rotation, modelScaleRef.current, rotationSpeedRef.current);
          setStatusMessage('Anchored with real-world floor shadow');
        };

        webxrArInstanceRef.current = webxr;

        if (webxrButtonContainerRef.current) {
          webxrButtonContainerRef.current.innerHTML = '';
          webxrButtonContainerRef.current.appendChild(webxr.button);
        }
      } catch {
        setActiveEngine('camera-stream');
        setArCapability('camera-stream');
      }
    }

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    const clock = new THREE.Clock();
    renderer.setAnimationLoop((time, frame) => {
      const delta = Math.min(clock.getDelta(), 0.05);

      if (webxrArInstanceRef.current) {
        webxrArInstanceRef.current.update(frame);
      }

      // Smooth damped model scale transitions & materialize bounce
      if (placedGroupRef.current) {
        currentDampScaleRef.current = THREE.MathUtils.damp(
          currentDampScaleRef.current,
          modelScaleRef.current,
          10,
          delta
        );
        placedGroupRef.current.scale.setScalar(currentDampScaleRef.current);
      }

      // Anchor Lock 3D Shockwave Ring VFX
      if (arSpawnRingRef.current && arSpawnRingRef.current.visible) {
        spawnRingProgressRef.current += delta * 1.9;
        if (spawnRingProgressRef.current >= 1) {
          arSpawnRingRef.current.visible = false;
        } else {
          const t = spawnRingProgressRef.current;
          const eased = 1 - Math.pow(1 - t, 3);
          arSpawnRingRef.current.scale.setScalar(0.2 + eased * 2.2);
          (arSpawnRingRef.current.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.85;
        }
      }

      // Dynamic Gyroscope camera motion
      const gyro = deviceGyro.getState();
      if (gyro.isActive && !renderer.xr?.isPresenting) {
        camera.position.x = THREE.MathUtils.clamp(gyro.roll * 0.45, -0.65, 0.65);
        camera.position.y = THREE.MathUtils.clamp(0.45 - gyro.pitch * 0.45, -0.2, 1.2);
        camera.lookAt(0, 0, -0.7);
        _gyroEuler.set(gyro.pitch * 0.25, gyro.yaw * 0.35, gyro.roll * 0.25, 'YXZ');
        _gyroQuat.setFromEuler(_gyroEuler);
        camera.quaternion.multiply(_gyroQuat);
      }

      // Real-World Computer Vision & Ambient Room Light Estimation
      const now = performance.now();
      if (
        now - lastVisionTimeRef.current > 140 &&
        videoRef.current &&
        videoRef.current.readyState >= 2
      ) {
        lastVisionTimeRef.current = now;
        const vFrame = arObjectDetector.processVideoFrame(videoRef.current);
        visionFrameRef.current = vFrame;
        setVisionFrame(vFrame);

        if (vFrame.surfaceDetected) {
          setIsPlaneDetected(true);
          setHitTestResult(true);
        }

        // Real-time room light & white-balance matching
        if (autoRoomLightRef.current && keyLightRef.current && ambientLightRef.current && hemiLightRef.current) {
          const targetKey = 1.6 + vFrame.ambientBrightness * 2.1;
          const targetAmb = 0.28 + vFrame.ambientBrightness * 0.45;
          keyLightRef.current.intensity = THREE.MathUtils.lerp(keyLightRef.current.intensity, targetKey, 0.18);
          ambientLightRef.current.intensity = THREE.MathUtils.lerp(ambientLightRef.current.intensity, targetAmb, 0.18);
          keyLightRef.current.color.setRGB(vFrame.ambientTint.r, vFrame.ambientTint.g, vFrame.ambientTint.b);
        }

        if (vFrame.detectedObjects && vFrame.detectedObjects.length > 0) {
          const targetObj = vFrame.detectedObjects.find(o => o.type === 'object') || vFrame.detectedObjects[0];
          setActiveTarget(targetObj);
          if (vFrame.detectedObjects.length > lastDetectedCountRef.current) {
            soundEffects.playTargetLock();
          }
          lastDetectedCountRef.current = vFrame.detectedObjects.length;
        } else {
          setActiveTarget(null);
        }

        if (reticle && reticle.visible) {
          reticle.position.y = vFrame.estimatedSurfaceY;
        }
      }

      if (reticle.visible) {
        const pulse = 1.0 + Math.sin(time * 0.004) * 0.06;
        reticle.scale.set(pulse, pulse, 1);
      }

      if (placedGroup.children.length > 0 && !isDraggingRef.current) {
        placedGroup.children.forEach(child => {
          if (isAnimatingRef.current) {
            child.rotation.y += delta * rotationSpeedRef.current;
          }

          child.children.forEach(grandchild => {
            if (grandchild.userData.speed && isAnimatingRef.current) {
              grandchild.userData.angle += delta * grandchild.userData.speed;
              const dist = grandchild.userData.dist;
              grandchild.position.x = Math.cos(grandchild.userData.angle) * dist;
              grandchild.position.z = Math.sin(grandchild.userData.angle) * dist;
            }
          });
        });
      }

      // Animate ASTRA 3D Holographic Onboarding Guide
      arGuideRigRef.current?.update(
        time * 0.001,
        delta,
        visionFrameRef.current?.estimatedSurfaceY ?? -0.25,
      );

      // Update AR Experiment & Experience Lab objects around anchored center
      if (arExperimentGroupRef.current) {
        const anchorChild = placedGroup.children[0];
        const fallbackY = visionFrameRef.current?.estimatedSurfaceY ?? -0.25;
        if (anchorChild) {
          arExperimentGroupRef.current.position.copy(anchorChild.position);
        } else {
          arExperimentGroupRef.current.position.set(0, fallbackY, -0.7);
        }
      }

      // Gravity Drop Probe Physics Simulation
      if (dropPhysRef.current.active && dropProbeRef.current) {
        const dp = dropPhysRef.current;
        const scaledAccel = (dp.gMs2 / 9.81) * 1.15;
        dp.velocity -= scaledAccel * delta;
        dp.yOffset += dp.velocity * delta;
        dp.elapsedS += delta;
        const realSpeedMs = Math.abs(dp.velocity) * (9.81 / 1.15);
        if (realSpeedMs > dp.maxSpeedMs) dp.maxSpeedMs = realSpeedMs;

        const floorStop = 0.032;
        if (dp.yOffset <= floorStop) {
          dp.yOffset = floorStop;
          if (Math.abs(dp.velocity) > 0.16 && dp.bounces < 5) {
            dp.velocity = -dp.velocity * 0.62;
            dp.bounces += 1;
            soundEffects.playPhysicsBounce(Math.min(1, Math.abs(dp.velocity) / 1.4));
            setDropTelemetry({
              active: true,
              elapsedS: Number(dp.elapsedS.toFixed(2)),
              maxSpeedMs: Number(dp.maxSpeedMs.toFixed(2)),
              bounces: dp.bounces,
              gMs2: dp.gMs2,
            });
          } else {
            dp.active = false;
            dp.velocity = 0;
            soundEffects.playPhysicsBounce(0.2);
            setDropTelemetry({
              active: false,
              elapsedS: Number(dp.elapsedS.toFixed(2)),
              maxSpeedMs: Number(dp.maxSpeedMs.toFixed(2)),
              bounces: dp.bounces,
              gMs2: dp.gMs2,
            });
          }
        }
        dropProbeRef.current.position.set(0.24, dp.yOffset, 0.08);
        dropProbeRef.current.visible = true;
      }

      // Magnetosphere Dipole Animation
      if (magnetosphereGroupRef.current) {
        magnetosphereGroupRef.current.visible = magnetosphereOnRef.current;
        if (magnetosphereOnRef.current) {
          magnetosphereGroupRef.current.rotation.y += delta * 0.65;
        }
      }

      // Solar Wind Burst Particle Flow + Magnetic Bow-Shock Deflection
      const windPts = solarWindRef.current.points;
      if (solarWindRef.current.active && windPts) {
        const sw = solarWindRef.current;
        sw.life += delta;
        const posAttr = windPts.geometry.getAttribute('position') as THREE.BufferAttribute;
        const arr = posAttr.array as Float32Array;
        const vel = sw.velocities;
        const hasNaturalField = ['earth', 'jupiter', 'saturn', 'uranus', 'neptune'].includes(selectedModelRef.current);
        const isShielded = magnetosphereOnRef.current || hasNaturalField;
        const blockR = isShielded ? 0.34 : 0.19;

        for (let i = 0; i < windCount; i++) {
          const idx = i * 3;
          let px = arr[idx] + vel[idx] * delta;
          let py = arr[idx + 1] + vel[idx + 1] * delta;
          let pz = arr[idx + 2] + vel[idx + 2] * delta;
          const r = Math.hypot(px, py, pz);
          if (r < blockR && r > 0.001) {
            if (isShielded) {
              // Deflect along dipole shell around the planet
              const push = (blockR - r) * 1.4;
              py += (py >= 0 ? 1 : -1) * push * 0.45;
              pz += (pz >= 0 ? 1 : -1) * push * 0.45;
              px += push * 0.2;
            } else {
              // Impact surface & scatter slightly
              vel[idx] *= 0.25;
              vel[idx + 1] *= 0.25;
              vel[idx + 2] *= 0.25;
            }
          }
          arr[idx] = px;
          arr[idx + 1] = py;
          arr[idx + 2] = pz;
        }
        posAttr.needsUpdate = true;
        if (sw.life > 3.2) {
          sw.active = false;
          windPts.visible = false;
        }
      }

      // Companion Moon Orbit
      if (companionMoonPivotRef.current) {
        companionMoonPivotRef.current.visible = companionMoonOnRef.current;
        if (companionMoonOnRef.current) {
          companionMoonPivotRef.current.rotation.y += delta * 1.15;
        }
      }

      renderer.render(scene, camera);
    });

    return () => {
      renderer.setAnimationLoop(null);
      window.removeEventListener('resize', handleResize);
      if (webxrArInstanceRef.current) {
        webxrArInstanceRef.current.dispose();
      }
      arGuideRigRef.current?.dispose();
      arGuideRigRef.current = null;
      probeGeo.dispose();
      probeMat.dispose();
      magGeo.dispose();
      magMat.dispose();
      windGeo.dispose();
      windMat.dispose();
      moonGeo.dispose();
      moonMat.dispose();
      envRT.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update model when selected model changes
  useEffect(() => {
    if (webxrArInstanceRef.current) {
      webxrArInstanceRef.current.setPlanetFactory(() => createPlaceableObject(selectedModel));
    }

    if (isPlaced && placedGroupRef.current) {
      const prevAnchorPos = placedGroupRef.current.children[0]?.position.clone() || new THREE.Vector3(0, -0.25, -0.7);
      const prevAnchorRot = placedGroupRef.current.children[0]?.rotation.clone() || new THREE.Euler();

      placedGroupRef.current.clear();
      const newModel = createPlaceableObject(selectedModel);
      newModel.position.copy(prevAnchorPos);
      newModel.rotation.copy(prevAnchorRot);
      placedGroupRef.current.add(newModel);

      // Gentle materialize animation + VFX ring
      currentDampScaleRef.current = Math.max(0.15, modelScale * 0.55);
      triggerSpawnPulseVfx(prevAnchorPos, colorGradePreset);

      if (thrustersIgnited) {
        const fireGeo = new THREE.ConeGeometry(0.04, 0.16, 16);
        const fireMat = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.85 });
        const fireMesh = new THREE.Mesh(fireGeo, fireMat);
        fireMesh.rotation.x = Math.PI;
        fireMesh.position.set(prevAnchorPos.x, prevAnchorPos.y - 0.06, prevAnchorPos.z);
        placedGroupRef.current.add(fireMesh);
        thrusterFlameRef.current = fireMesh;
      }

      persistAnchorState(
        selectedModel,
        prevAnchorPos,
        prevAnchorRot,
        modelScale,
        rotationSpeed
      );
    }
  }, [selectedModel]);

  // Persist scale changes when placed
  useEffect(() => {
    if (isPlaced && placedGroupRef.current) {
      const child = placedGroupRef.current.children[0];
      if (child) {
        persistAnchorState(selectedModel, child.position, child.rotation, modelScale, rotationSpeed);
      }
    }
  }, [modelScale]);

  // Handle Thruster Flames
  useEffect(() => {
    if (!placedGroupRef.current) return;

    if (thrustersIgnited && placedGroupRef.current.children[0]) {
      const pos = placedGroupRef.current.children[0].position;
      const fireGeo = new THREE.ConeGeometry(0.04, 0.16, 16);
      const fireMat = new THREE.MeshBasicMaterial({
        color: 0xff6600,
        transparent: true,
        opacity: 0.85,
      });
      const fireMesh = new THREE.Mesh(fireGeo, fireMat);
      fireMesh.rotation.x = Math.PI;
      fireMesh.position.set(pos.x, pos.y - 0.06, pos.z);

      const pLight = new THREE.PointLight(0xff6600, 3, 1.5);
      pLight.position.y = -0.06;
      pLight.castShadow = true;

      fireMesh.add(pLight);
      placedGroupRef.current.add(fireMesh);
      thrusterFlameRef.current = fireMesh;
      soundEffects.playWarp();
    } else if (!thrustersIgnited && thrusterFlameRef.current && placedGroupRef.current) {
      placedGroupRef.current.remove(thrusterFlameRef.current);
      thrusterFlameRef.current = null;
    }
  }, [thrustersIgnited]);

  const restoreSavedSession = () => {
    if (!pendingSavedAnchor || !placedGroupRef.current || !floorShadowPlaneRef.current || !reticleMeshRef.current) return;
    soundEffects.playAnchorPlaced();
    setSelectedModel(pendingSavedAnchor.modelId);
    setModelScale(pendingSavedAnchor.scale || 1.0);
    modelScaleRef.current = pendingSavedAnchor.scale || 1.0;
    currentDampScaleRef.current = 0.25;
    setRotationSpeed(pendingSavedAnchor.rotationSpeed ?? 0.4);

    placedGroupRef.current.clear();
    const restoredModel = createPlaceableObject(pendingSavedAnchor.modelId);
    restoredModel.position.set(
      pendingSavedAnchor.position[0],
      pendingSavedAnchor.position[1],
      pendingSavedAnchor.position[2]
    );
    restoredModel.rotation.set(
      pendingSavedAnchor.rotation[0],
      pendingSavedAnchor.rotation[1],
      pendingSavedAnchor.rotation[2]
    );
    placedGroupRef.current.add(restoredModel);

    floorShadowPlaneRef.current.position.set(
      pendingSavedAnchor.position[0],
      pendingSavedAnchor.position[1] - 0.002,
      pendingSavedAnchor.position[2]
    );
    floorShadowPlaneRef.current.visible = true;
    reticleMeshRef.current.visible = false;

    triggerSpawnPulseVfx(restoredModel.position, colorGradePreset);
    setIsPlaced(true);
    setIsPlaneDetected(true);
    setRestoredFromSavedAnchor(true);
    setPendingSavedAnchor(null);
    setStatusMessage('Previous AR session restored');
  };

  /**
   * Anchor 3D asset dynamically at real-world coordinates with smooth materialize & shockwave ring
   */
  const anchorAtWorldPosition = (worldPos: THREE.Vector3, anchorDescription?: string) => {
    if (!sceneRef.current || !placedGroupRef.current) return;

    placedGroupRef.current.clear();
    const newModel = createPlaceableObject(selectedModel);
    newModel.position.copy(worldPos);
    placedGroupRef.current.add(newModel);
    currentDampScaleRef.current = Math.max(0.15, modelScale * 0.35);

    if (floorShadowPlaneRef.current) {
      floorShadowPlaneRef.current.position.set(worldPos.x, worldPos.y - 0.002, worldPos.z);
      floorShadowPlaneRef.current.visible = true;
    }

    if (reticleMeshRef.current) {
      reticleMeshRef.current.visible = false;
    }

    triggerSpawnPulseVfx(worldPos, colorGradePreset);
    setIsPlaced(true);
    setIsPlaneDetected(true);
    setShowMoveDevicePrompt(false);
    setPendingSavedAnchor(null);
    setInteractMode('move');

    soundEffects.playAnchorPlaced();

    const modelName = getModelDisplayName(selectedModel);
    const desc =
      anchorDescription ||
      (visionFrameRef.current?.surfaceType ? `${visionFrameRef.current.surfaceType} surface` : 'spatial coordinates');
    setStatusMessage(`${modelName} anchored on ${desc}`);
    recordArPlacement();
    soundEffects.speakDetection(`Anchored ${modelName} on ${desc}`);

    if (selectedModel in PLANETS_DATA) {
      markPlanetExplored(selectedModel as PlanetId);
      soundEffects.playPlanetSound(selectedModel as PlanetId);
    } else if (selectedModel in SPACECRAFTS_DATA) {
      soundEffects.playSpacecraftSound(selectedModel as SpacecraftId);
    } else if (selectedModel in GALAXIES_DATA) {
      if (selectedModel === 'cosmic-web' || selectedModel === 'observable-universe') {
        soundEffects.playCosmicWeb();
      } else {
        soundEffects.playGalaxySound(selectedModel);
      }
      soundEffects.speakGalaxy(selectedModel);
    }

    persistAnchorState(selectedModel, worldPos, newModel.rotation, modelScale, rotationSpeed);

    // If user is currently on Step 2 ('place') of How-to-AR guide, automatically advance to Step 3!
    if (showHowToGuideRef.current && guideStepIdxRef.current === 1) {
      setGuideStepIdx(2);
    }
  };

  const anchorToDetectedObject = (obj: DetectedObject) => {
    const container = mountRef.current;
    if (!container || !cameraRef.current) return;

    soundEffects.playTargetLock();

    const rect = container.getBoundingClientRect();
    const screenX = (obj.box.x + obj.box.width / 2) * rect.width;
    const screenY = (obj.box.y + obj.box.height / 2) * rect.height;
    const surfaceY = visionFrameRef.current?.estimatedSurfaceY ?? -0.25;

    const targetPos = ArObjectDetector.raycastToSurface(
      screenX,
      screenY,
      rect.width,
      rect.height,
      cameraRef.current,
      surfaceY
    );

    anchorAtWorldPosition(targetPos, obj.label.toLowerCase());
  };

  // Touch Gestures: Pinch-to-Scale, Drag-to-Move & Drag-to-Rotate
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) return;

    dragDistanceRef.current = 0;
    if (e.touches.length === 1) {
      pointerDownPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      if (!isPlaced) return;
      touchLastPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      isDraggingRef.current = true;
    } else if (e.touches.length === 2 && isPlaced) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartDistRef.current = dist;
      touchStartScaleRef.current = modelScale;
      isDraggingRef.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1 && pointerDownPosRef.current) {
      dragDistanceRef.current = Math.max(
        dragDistanceRef.current,
        Math.hypot(
          e.touches[0].clientX - pointerDownPosRef.current.x,
          e.touches[0].clientY - pointerDownPosRef.current.y
        )
      );
    }

    if (!isPlaced || !placedGroupRef.current || !mountRef.current || !cameraRef.current) return;
    const child = placedGroupRef.current.children[0];
    if (!child) return;

    if (e.touches.length === 2 && touchStartDistRef.current !== null) {
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = currentDist / touchStartDistRef.current;
      const newScale = THREE.MathUtils.clamp(touchStartScaleRef.current * factor, 0.25, 3.5);
      setModelScale(parseFloat(newScale.toFixed(2)));
      return;
    }

    if (e.touches.length === 1 && touchLastPosRef.current) {
      const curX = e.touches[0].clientX;
      const curY = e.touches[0].clientY;

      if (interactMode === 'move' || interactMode === 'place') {
        const rect = mountRef.current.getBoundingClientRect();
        const screenX = curX - rect.left;
        const screenY = curY - rect.top;
        const surfaceY = visionFrameRef.current?.estimatedSurfaceY ?? -0.25;

        const newPos = ArObjectDetector.raycastToSurface(
          screenX,
          screenY,
          rect.width,
          rect.height,
          cameraRef.current,
          surfaceY
        );

        child.position.set(newPos.x, newPos.y, newPos.z);
        if (floorShadowPlaneRef.current) {
          floorShadowPlaneRef.current.position.set(newPos.x, newPos.y - 0.002, newPos.z);
        }
      } else {
        const deltaX = curX - touchLastPosRef.current.x;
        const deltaY = curY - touchLastPosRef.current.y;
        child.rotation.y += deltaX * 0.015;
        child.rotation.x = THREE.MathUtils.clamp(child.rotation.x + deltaY * 0.006, -0.75, 0.75);
      }

      touchLastPosRef.current = { x: curX, y: curY };
    }
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    touchLastPosRef.current = null;
    touchStartDistRef.current = null;

    if (placedGroupRef.current?.children[0]) {
      const child = placedGroupRef.current.children[0];
      persistAnchorState(selectedModel, child.position, child.rotation, modelScale, rotationSpeed);
    }
  };

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) return;

    dragDistanceRef.current = 0;
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };

    if (isPlaced) {
      mouseLastPosRef.current = { x: e.clientX, y: e.clientY };
      isDraggingRef.current = true;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (pointerDownPosRef.current) {
      dragDistanceRef.current = Math.max(
        dragDistanceRef.current,
        Math.hypot(e.clientX - pointerDownPosRef.current.x, e.clientY - pointerDownPosRef.current.y)
      );
    }

    if (!isPlaced || !isDraggingRef.current || !mouseLastPosRef.current || !placedGroupRef.current || !mountRef.current || !cameraRef.current) return;
    const child = placedGroupRef.current.children[0];
    if (!child) return;

    if (interactMode === 'move' || interactMode === 'place') {
      const rect = mountRef.current.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const surfaceY = visionFrameRef.current?.estimatedSurfaceY ?? -0.25;

      const newPos = ArObjectDetector.raycastToSurface(
        screenX,
        screenY,
        rect.width,
        rect.height,
        cameraRef.current,
        surfaceY
      );

      child.position.set(newPos.x, newPos.y, newPos.z);
      if (floorShadowPlaneRef.current) {
        floorShadowPlaneRef.current.position.set(newPos.x, newPos.y - 0.002, newPos.z);
      }
    } else {
      const deltaX = e.clientX - mouseLastPosRef.current.x;
      const deltaY = e.clientY - mouseLastPosRef.current.y;
      child.rotation.y += deltaX * 0.015;
      child.rotation.x = THREE.MathUtils.clamp(child.rotation.x + deltaY * 0.006, -0.75, 0.75);
    }

    mouseLastPosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    mouseLastPosRef.current = null;
    if (isPlaced && placedGroupRef.current?.children[0]) {
      const child = placedGroupRef.current.children[0];
      persistAnchorState(selectedModel, child.position, child.rotation, modelScale, rotationSpeed);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!isPlaced) return;
    const delta = e.deltaY < 0 ? 0.06 : -0.06;
    setModelScale(prev => THREE.MathUtils.clamp(parseFloat((prev + delta).toFixed(2)), 0.25, 3.5));
  };

  // Tap-to-Place guarded against drag clicks and Move/Rotate mode
  const handleTapToPlace = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) return;

    // Crucial bug fix: ignore click emitted after dragging in move/rotate mode
    if (dragDistanceRef.current > 8) return;
    if (isPlaced && interactMode !== 'place') return;

    const container = mountRef.current;
    if (!container || !cameraRef.current) return;

    const rect = container.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    const surfaceY = visionFrameRef.current?.estimatedSurfaceY ?? -0.25;
    const targetWorldPos = ArObjectDetector.raycastToSurface(
      screenX,
      screenY,
      rect.width,
      rect.height,
      cameraRef.current,
      surfaceY
    );

    anchorAtWorldPosition(targetWorldPos, 'tapped surface');
  };

  const handleResetPlacement = () => {
    soundEffects.playClick();
    if (placedGroupRef.current) {
      placedGroupRef.current.clear();
      placedGroupRef.current.rotation.set(0, 0, 0);
    }
    if (reticleMeshRef.current) {
      reticleMeshRef.current.visible = true;
    }
    try {
      localStorage.removeItem(AR_ANCHOR_STORAGE_KEY);
    } catch {
      // Ignore storage error
    }

    setIsPlaced(false);
    setRestoredFromSavedAnchor(false);
    setHitTestResult(null);
    setIsPlaneDetected(false);
    setShowMoveDevicePrompt(false);
    setThrustersIgnited(false);
    setInteractMode('place');
    setStatusMessage('Scanning environment... Tap anywhere or lock onto a surface');
  };

  const toggleCameraFacing = () => {
    soundEffects.playClick();
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Capture AR Photo with crisp shutter SFX, flash, & active color grade
  const captureArSnapshot = () => {
    soundEffects.playArCaptureShutter();
    setSnapshotFlash(true);
    setTimeout(() => setSnapshotFlash(false), 180);

    const video = videoRef.current;
    const renderer = rendererRef.current;
    if (!renderer) return;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 1280;
    exportCanvas.height = 720;
    const ctx = exportCanvas.getContext('2d')!;

    ctx.save();
    ctx.filter = COLOR_GRADE_THEMES[colorGradePreset].cssFilter;
    if (video && video.readyState >= 2) {
      ctx.drawImage(video, 0, 0, exportCanvas.width, exportCanvas.height);
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, exportCanvas.height);
      grad.addColorStop(0, '#050714');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    }
    ctx.restore();

    ctx.drawImage(renderer.domElement, 0, 0, exportCanvas.width, exportCanvas.height);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.86)';
    ctx.beginPath();
    ctx.roundRect(24, exportCanvas.height - 76, 440, 52, 14);
    ctx.fill();

    ctx.font = 'bold 17px sans-serif';
    ctx.fillStyle = COLOR_GRADE_THEMES[colorGradePreset].accentHex;
    ctx.fillText('AR Smart Classroom · Spatial Observatory', 40, exportCanvas.height - 46);

    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#cbd5e1';
    const name = getModelDisplayName(selectedModel);
    const sub =
      selectedModel in SPACECRAFTS_DATA
        ? `${SPACECRAFTS_DATA[selectedModel as SpacecraftId].agency} · ${COLOR_GRADE_PRESETS[colorGradePreset].label}`
        : selectedModel in GALAXIES_DATA
        ? `${GALAXIES_DATA[selectedModel].type} · ${COLOR_GRADE_PRESETS[colorGradePreset].label}`
        : `Physical Floor Shadow · ${COLOR_GRADE_PRESETS[colorGradePreset].label}`;
    ctx.fillText(`${name} | ${sub}`, 40, exportCanvas.height - 28);

    const link = document.createElement('a');
    link.download = `AR-Snapshot-${selectedModel}-${Date.now()}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  };

  // Trigger AR Gravity Drop Probe Experiment
  const handleRunGravityDrop = () => {
    const bodyMap: Record<'earth' | 'moon' | 'mars' | 'jupiter', number> = {
      earth: 9.81,
      moon: 1.62,
      mars: 3.72,
      jupiter: 24.79,
    };
    let g = 9.81;
    if (experimentGravityBody === 'placed') {
      g = selectedModel in PLANETS_DATA ? PLANETS_DATA[selectedModel as PlanetId].surfaceGravityMs2 || 9.81 : 9.81;
    } else {
      g = bodyMap[experimentGravityBody];
    }
    const clampedG = Math.max(0.5, g);
    dropPhysRef.current = {
      active: true,
      yOffset: 0.52,
      velocity: 0,
      elapsedS: 0,
      maxSpeedMs: 0,
      bounces: 0,
      gMs2: clampedG,
    };
    setDropTelemetry({ active: true, elapsedS: 0, maxSpeedMs: 0, bounces: 0, gMs2: clampedG });
    soundEffects.playClick();
    if (!labXpClaimedRef.current) {
      labXpClaimedRef.current = true;
      grantBonusXp(25, 'AR Lab Experimenter');
    }
  };

  // Trigger Solar Wind Plasma Burst toward the anchored world
  const handleFireSolarWind = () => {
    const sw = solarWindRef.current;
    if (!sw.points) return;
    const posAttr = sw.points.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const count = arr.length / 3;
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      arr[idx] = -0.85 - Math.random() * 0.45;
      arr[idx + 1] = 0.08 + (Math.random() - 0.5) * 0.34;
      arr[idx + 2] = (Math.random() - 0.5) * 0.34;
      sw.velocities[idx] = 0.85 + Math.random() * 0.4;
      sw.velocities[idx + 1] = (Math.random() - 0.5) * 0.08;
      sw.velocities[idx + 2] = (Math.random() - 0.5) * 0.08;
    }
    posAttr.needsUpdate = true;
    sw.active = true;
    sw.life = 0;
    sw.points.visible = true;
    soundEffects.playWarp();
    if (!labXpClaimedRef.current) {
      labXpClaimedRef.current = true;
      grantBonusXp(25, 'AR Lab Experimenter');
    }
  };

  // Filter placeable models based on category
  const filteredModels: { id: ArPlaceableId; name: string; category: string; color: string; badge?: string }[] = [];

  if (selectedCategory === 'all' || selectedCategory === 'planet') {
    filteredModels.push({
      id: 'minisystem',
      name: 'Solar System',
      category: 'planet',
      color: '#f59e0b',
      badge: 'Mini Orbits',
    });
    ORDERED_PLANETS.forEach(pId => {
      filteredModels.push({
        id: pId,
        name: PLANETS_DATA[pId].name,
        category: 'planet',
        color: PLANETS_DATA[pId].color,
        badge: PLANETS_DATA[pId].type,
      });
    });
  }

  if (selectedCategory === 'all' || selectedCategory === 'satellite') {
    ORDERED_SPACECRAFT.filter(sId => SPACECRAFTS_DATA[sId].category === 'satellite').forEach(sId => {
      const sc = SPACECRAFTS_DATA[sId];
      filteredModels.push({ id: sId, name: sc.name, category: 'satellite', color: sc.color, badge: 'Satellite' });
    });
  }

  if (selectedCategory === 'all' || selectedCategory === 'rocket') {
    ORDERED_SPACECRAFT.filter(sId => SPACECRAFTS_DATA[sId].category === 'rocket').forEach(sId => {
      const sc = SPACECRAFTS_DATA[sId];
      filteredModels.push({ id: sId, name: sc.name, category: 'rocket', color: sc.color, badge: 'Rocket' });
    });
  }

  if (selectedCategory === 'all' || selectedCategory === 'spacecraft') {
    ORDERED_SPACECRAFT.filter(sId => SPACECRAFTS_DATA[sId].category === 'spacecraft').forEach(sId => {
      const sc = SPACECRAFTS_DATA[sId];
      filteredModels.push({ id: sId, name: sc.name, category: 'spacecraft', color: sc.color, badge: 'Spacecraft' });
    });
  }

  if (selectedCategory === 'all' || selectedCategory === 'galaxy') {
    ORDERED_GALAXIES.forEach(gId => {
      const gx = GALAXIES_DATA[gId];
      if (gx) {
        filteredModels.push({
          id: gId as ArPlaceableId,
          name: gx.name,
          category: 'galaxy',
          color: gx.accentColor,
          badge: gx.id === 'cosmic-web' ? 'Macro' : gx.id === 'observable-universe' ? 'Universe' : 'Galaxy',
        });
      }
    });
  }

  const isPlanet = selectedModel in PLANETS_DATA;
  const isSpacecraft = selectedModel in SPACECRAFTS_DATA;
  const isGalaxy = selectedModel in GALAXIES_DATA;
  const currentPlanetInfo = isPlanet ? PLANETS_DATA[selectedModel as PlanetId] : null;
  const currentSpacecraftInfo = isSpacecraft ? SPACECRAFTS_DATA[selectedModel as SpacecraftId] : null;
  const currentGalaxyInfo = isGalaxy ? GALAXIES_DATA[selectedModel] : null;
  const activeTheme = COLOR_GRADE_THEMES[colorGradePreset];

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] overflow-hidden bg-slate-950 select-none">
      {/* 1. Real Camera Video Background Feed synced to Color Grading */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        style={{ filter: activeTheme.cssFilter }}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
          cameraPermissionGranted ? 'opacity-100' : 'opacity-20'
        }`}
      />

      {!cameraPermissionGranted && (
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/45 via-slate-950/85 to-slate-950 pointer-events-none" />
      )}

      {/* Camera Shutter Optical Flash */}
      <AnimatePresence>
        {snapshotFlash && (
          <motion.div
            initial={{ opacity: 0.85 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-white z-50 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* 2. Transparent Three.js WebGL Canvas Overlay with Gesture Handlers */}
      <div
        ref={mountRef}
        onClick={handleTapToPlace}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        className={`absolute inset-0 w-full h-full z-10 touch-none ${
          isPlaced && interactMode === 'move'
            ? 'cursor-grab active:cursor-grabbing'
            : isPlaced && interactMode === 'rotate'
            ? 'cursor-ew-resize'
            : 'cursor-crosshair'
        }`}
      />

      {/* Cinema Mode Floating Restore Button */}
      {cinemaHudHidden && (
        <div className="absolute top-4 right-4 z-40">
          <button
            onClick={() => {
              soundEffects.playClick();
              setCinemaHudHidden(false);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-950/85 border border-slate-700 text-slate-200 hover:text-white text-xs font-semibold shadow-xl"
          >
            <Eye className="w-4 h-4 text-sky-400" />
            <span>Show Controls</span>
          </button>
        </div>
      )}

      {/* 3. Top Navigation & Sensor Controls */}
      {!cinemaHudHidden && (
        <div className="absolute top-3 inset-x-3 sm:inset-x-6 z-20 flex items-center justify-between gap-2 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              onClick={() => {
                soundEffects.playClick();
                setCurrentView('solarSystem');
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-800 transition-colors shadow-lg text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4 text-sky-400" />
              <span className="hidden sm:inline">Back to 3D Space</span>
            </button>

            <button
              onClick={() => {
                soundEffects.playClick();
                setIsAssetTrayOpen(v => !v);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors shadow-lg ${
                isAssetTrayOpen
                  ? 'bg-slate-800/95 border-sky-500/40 text-sky-200'
                  : 'bg-slate-900/90 border-slate-700 text-slate-300 hover:text-white'
              }`}
              title="Toggle 3D Model Selector"
            >
              <Orbit className="w-4 h-4 text-sky-400" />
              <span className="max-w-[110px] truncate">{getModelDisplayName(selectedModel)}</span>
              {isAssetTrayOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => {
                if (showHowToGuide) {
                  soundEffects.playHoloDismiss();
                  setShowHowToGuide(false);
                } else {
                  soundEffects.playHoloActivate();
                  setGuideStepIdx(0);
                  setShowHowToGuide(true);
                  setIsAssetTrayOpen(false);
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors shadow-lg ${
                showHowToGuide
                  ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold'
                  : 'bg-slate-900/90 border-slate-700 text-sky-300 hover:text-white hover:bg-slate-800'
              }`}
              title="Interactive 3D Holographic AR Guide (ASTRA)"
            >
              <HelpCircle className="w-4 h-4" />
              <span className="hidden md:inline">How to AR</span>
            </button>
          </div>

          {/* Center Status Readout */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs font-medium text-slate-200 shadow-lg">
            {restoredFromSavedAnchor ? (
              <History className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <MapPin className="w-3.5 h-3.5 text-sky-400" />
            )}
            <span className="max-w-xs truncate">{statusMessage}</span>
            {visionFrame && (
              <span className="pl-2 border-l border-slate-700 font-mono text-[11px] text-slate-400 tabular-nums">
                Light {Math.round(visionFrame.ambientBrightness * 100)}%
              </span>
            )}
          </div>

          {/* Top-right tools */}
          <div className="pointer-events-auto flex items-center gap-1.5 relative">
            <button
              onClick={() => {
                soundEffects.playClick();
                setVisionEnabled(!visionEnabled);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-xs font-semibold transition-colors shadow-lg ${
                visionEnabled
                  ? 'bg-sky-500 text-slate-950 border-sky-400'
                  : 'bg-slate-900/90 border-slate-700 text-slate-300 hover:text-white'
              }`}
              title="Surface & Object Vision Tracking"
            >
              <Target className="w-4 h-4" />
              <span className="hidden md:inline">Vision</span>
            </button>

            <button
              onClick={toggleGyro}
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-xs font-semibold transition-colors shadow-lg ${
                isGyroActive
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                  : 'bg-slate-900/90 border-slate-700 text-slate-300 hover:text-white'
              }`}
              title="Device Motion Gyroscope"
            >
              <Smartphone className="w-4 h-4" />
              <span className="hidden md:inline">{isGyroActive ? (isGyroHardware ? 'Gyro' : 'Sim Gyro') : 'Gyro'}</span>
            </button>

            {isGyroActive && (
              <button
                onClick={calibrateGyro}
                className="px-2.5 py-2 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold shadow-lg"
                title="Recenter Gyroscope"
              >
                Zero
              </button>
            )}

            {/* LUT Color Grading Picker */}
            <button
              onClick={() => {
                soundEffects.playClick();
                setShowColorMenu(v => !v);
              }}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-200 hover:text-white text-xs font-semibold shadow-lg"
              title="AR Color Grading Profile"
            >
              <Palette className="w-4 h-4" style={{ color: activeTheme.accentHex }} />
              <span className="hidden xl:inline">{COLOR_GRADE_PRESETS[colorGradePreset].label}</span>
            </button>

            {showColorMenu && (
              <div className="absolute right-0 top-12 w-56 rounded-xl bg-slate-950/95 border border-slate-700 p-1.5 shadow-2xl z-50 space-y-1">
                {(Object.keys(COLOR_GRADE_PRESETS) as ColorGradePresetId[]).map(presetKey => {
                  const cfg = COLOR_GRADE_PRESETS[presetKey];
                  const active = colorGradePreset === presetKey;
                  return (
                    <button
                      key={presetKey}
                      onClick={() => {
                        setColorGradePreset(presetKey);
                        soundEffects.playColorGradeShift();
                        setShowColorMenu(false);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors flex items-center justify-between ${
                        active ? 'bg-slate-800 text-white font-semibold' : 'text-slate-300 hover:bg-slate-900'
                      }`}
                    >
                      <span>{cfg.label}</span>
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: COLOR_GRADE_THEMES[presetKey].accentHex }}
                      />
                    </button>
                  );
                })}
              </div>
            )}

            <button
              onClick={toggleCameraFacing}
              className="p-2 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-200 hover:text-white transition-colors shadow-lg"
              title="Switch Front/Rear Camera"
            >
              <RefreshCw className="w-4 h-4 text-sky-400" />
            </button>

            <button
              onClick={() => {
                soundEffects.playClick();
                setCinemaHudHidden(true);
              }}
              className="p-2 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-200 hover:text-white transition-colors shadow-lg"
              title="Hide HUD for Clean View"
            >
              <EyeOff className="w-4 h-4 text-slate-300" />
            </button>

            <button
              onClick={captureArSnapshot}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-lg transition-colors"
              title="Capture AR Photo"
            >
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">Snap</span>
            </button>
          </div>
        </div>
      )}

      {/* Optional Restore Banner when incoming planet differed from saved session */}
      {!cinemaHudHidden && pendingSavedAnchor && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-950/95 border border-emerald-500/40 text-xs shadow-xl">
            <History className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-200">
              Saved AR anchor found ({getModelDisplayName(pendingSavedAnchor.modelId)})
            </span>
            <button
              onClick={restoreSavedSession}
              className="px-2 py-0.5 rounded-md bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 transition-colors"
            >
              Restore
            </button>
            <button
              onClick={() => setPendingSavedAnchor(null)}
              className="text-slate-400 hover:text-white"
              aria-label="Dismiss saved anchor notice"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 4. Native WebXR Button Mount Container */}
      <div
        id="ar-container"
        ref={webxrButtonContainerRef}
        className="absolute top-14 left-1/2 -translate-x-1/2 z-20 pointer-events-auto"
      />

      {/* 5. Collapsible Category & 3D Asset Shelf */}
      {!cinemaHudHidden && isAssetTrayOpen && (
        <div className="absolute top-16 sm:top-16 inset-x-3 sm:inset-x-6 z-20 flex flex-col items-center gap-1.5 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-1 p-1 rounded-xl bg-slate-950/90 border border-slate-800 shadow-xl overflow-x-auto max-w-full">
            {[
              { id: 'all', label: 'All Assets', icon: null },
              { id: 'planet', label: 'Planets', icon: <Orbit className="w-3.5 h-3.5" /> },
              { id: 'satellite', label: 'Satellites', icon: <Satellite className="w-3.5 h-3.5" /> },
              { id: 'rocket', label: 'Rockets', icon: <Rocket className="w-3.5 h-3.5" /> },
              { id: 'spacecraft', label: 'Spacecraft', icon: <Compass className="w-3.5 h-3.5" /> },
              { id: 'galaxy', label: 'Galaxies', icon: <Sparkles className="w-3.5 h-3.5" /> },
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => {
                  soundEffects.playClick();
                  setSelectedCategory(cat.id as typeof selectedCategory);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-sky-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          <div className="pointer-events-auto flex items-center gap-1.5 overflow-x-auto p-1.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-2xl max-w-3xl">
            {filteredModels.map(item => {
              const isSelected = selectedModel === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    soundEffects.playClick();
                    setSelectedModel(item.id);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs whitespace-nowrap transition-colors ${
                    isSelected
                      ? 'bg-sky-500 text-slate-950 font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800 font-medium'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span>{item.name}</span>
                  {item.badge && (
                    <span
                      className={`text-[9px] px-1 rounded font-mono ${
                        isSelected ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. Live Computer Vision & Object Detection HUD Overlay */}
      {!cinemaHudHidden && visionEnabled && visionFrame && (
        <div className="absolute inset-0 pointer-events-none z-15 overflow-hidden">
          {visionFrame.featurePoints.map((pt, idx) => (
            <div
              key={idx}
              style={{ left: `${pt.x * 100}%`, top: `${pt.y * 100}%` }}
              className="absolute w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-400/75"
            />
          ))}

          {visionFrame.detectedObjects.map(obj => (
            <div
              key={obj.id}
              style={{
                left: `${obj.box.x * 100}%`,
                top: `${obj.box.y * 100}%`,
                width: `${obj.box.width * 100}%`,
                height: `${obj.box.height * 100}%`,
              }}
              className="absolute border border-sky-400/45 bg-sky-500/5 rounded-xl transition-all duration-200"
            >
              <div className="absolute -top-0.5 -left-0.5 w-3 h-3 border-t-2 border-l-2 border-sky-400" />
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 border-t-2 border-r-2 border-sky-400" />
              <div className="absolute -bottom-0.5 -left-0.5 w-3 h-3 border-b-2 border-l-2 border-sky-400" />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 border-b-2 border-r-2 border-sky-400" />

              <div className="absolute -top-7 left-2 pointer-events-auto flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-950/90 border border-sky-400/45 text-[11px] shadow-lg">
                <span className="font-mono font-bold text-sky-200">{obj.label}</span>
                <span className="text-slate-400 text-[10px] font-mono tabular-nums">
                  {Math.round(obj.confidence * 100)}%
                  {obj.distanceMeters ? ` · ${obj.distanceMeters.toFixed(1)}m` : ''}
                </span>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    anchorToDetectedObject(obj);
                  }}
                  className="ml-1 px-2 py-0.5 rounded bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-[10px] transition-colors"
                >
                  Anchor
                </button>
              </div>
            </div>
          ))}

          {activeTarget && !isPlaced && (
            <div className="absolute bottom-40 sm:bottom-44 left-1/2 -translate-x-1/2 pointer-events-auto">
              <button
                onClick={() => anchorToDetectedObject(activeTarget)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold shadow-xl transition-colors"
              >
                <Crosshair className="w-4 h-4" />
                <span>Anchor on Detected {activeTarget.label}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Visual scanning instruction card if unplaced */}
      {!cinemaHudHidden && showMoveDevicePrompt && !isPlaced && (
        <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 max-w-sm mx-auto z-40 pointer-events-auto">
          <div className="bg-slate-900/95 border border-sky-400/60 rounded-2xl p-5 shadow-2xl text-center space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono uppercase tracking-wider text-sky-300 font-semibold">
                Surface Alignment Ready
              </span>
              <button
                onClick={() => {
                  soundEffects.playClick();
                  setShowMoveDevicePrompt(false);
                }}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <h3 className="text-base font-bold text-white">
              Tap anywhere on screen to anchor 3D object
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Aim at a flat desk or floor in steady lighting. Real-time room shadows will ground your model.
            </p>
            <div className="pt-1 flex items-center justify-center gap-2">
              <button
                onClick={() => {
                  setHitTestResult(true);
                  setIsPlaneDetected(true);
                  setShowMoveDevicePrompt(false);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Dismiss
              </button>
              <button
                onClick={() => {
                  if (cameraRef.current) {
                    const centerWorld = ArObjectDetector.raycastToSurface(
                      window.innerWidth / 2,
                      window.innerHeight * 0.56,
                      window.innerWidth,
                      window.innerHeight,
                      cameraRef.current,
                      visionFrameRef.current?.estimatedSurfaceY ?? -0.25
                    );
                    anchorAtWorldPosition(centerWorld, 'center desk surface');
                  }
                  setShowMoveDevicePrompt(false);
                }}
                className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold"
              >
                Anchor Center Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Learning Facts Sheet Modal */}
      {!cinemaHudHidden && showFactSheet && (
        <div className="absolute bottom-36 inset-x-4 sm:inset-x-auto sm:right-6 sm:w-96 z-40 bg-slate-900/95 border border-slate-700 rounded-2xl p-5 shadow-2xl text-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-sky-300">
                {currentPlanetInfo?.type || currentSpacecraftInfo?.category || currentGalaxyInfo?.type || 'Solar System'}
              </span>
              <h3 className="text-lg font-bold text-white mt-0.5">
                {getModelDisplayName(selectedModel)}
              </h3>
            </div>
            <button
              onClick={() => setShowFactSheet(false)}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {currentPlanetInfo?.overview ||
              currentSpacecraftInfo?.description ||
              currentGalaxyInfo?.overview ||
              'Interactive orbital scale model of our solar system anchored in real space.'}
          </p>

          {currentPlanetInfo && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Diameter</span>
                <span className="font-bold text-white tabular-nums">{currentPlanetInfo.diameterKm.toLocaleString()} km</span>
              </div>
              <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Gravity</span>
                <span className="font-bold text-amber-300 tabular-nums">{currentPlanetInfo.surfaceGravityMs2} m/s²</span>
              </div>
            </div>
          )}

          {currentSpacecraftInfo && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Agency</span>
                <span className="font-bold text-sky-300 truncate block">{currentSpacecraftInfo.agency}</span>
              </div>
              <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Top Speed</span>
                <span className="font-bold text-amber-300 tabular-nums">{currentSpacecraftInfo.maxSpeed}</span>
              </div>
            </div>
          )}

          {currentGalaxyInfo && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Diameter</span>
                <span className="font-bold text-white truncate block">{currentGalaxyInfo.diameterLightYears.toLocaleString()} ly</span>
              </div>
              <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Distance</span>
                <span className="font-bold text-sky-300 truncate block">{currentGalaxyInfo.distanceLightYears}</span>
              </div>
            </div>
          )}

          {(currentPlanetInfo || currentSpacecraftInfo || currentGalaxyInfo) && (
            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 text-xs space-y-1">
              <span className="text-[10px] text-amber-400 font-bold uppercase font-mono">Did You Know?</span>
              <p className="text-slate-300 text-[11px]">
                {currentPlanetInfo?.funFacts[0] || currentSpacecraftInfo?.funFacts[0] || currentGalaxyInfo?.funFacts[0]}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Sci-Fi Hologram HUD Modal Overlay */}
      {showHologramHUD && (
        <SciFiHologramHUD
          modelId={selectedModel}
          onClose={() => setShowHologramHUD(false)}
        />
      )}

      {/* AR Experiment & Experience Lab Panel */}
      {!cinemaHudHidden && showArLab && (
        <div className="absolute bottom-36 inset-x-4 sm:inset-x-auto sm:left-6 sm:w-96 z-40 bg-slate-950/95 border border-emerald-500/40 rounded-2xl p-4 shadow-2xl text-slate-100 space-y-3 pointer-events-auto">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                <FlaskConical className="w-3.5 h-3.5" />
                <span>AR Physics & Experience Lab</span>
              </span>
              <h3 className="text-sm font-bold text-white mt-0.5">
                Real-Space Simulation Bench
              </h3>
            </div>
            <button
              onClick={() => setShowArLab(false)}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 1. Gravity Drop Probe Experiment */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-sky-300 flex items-center gap-1.5">
                <ArrowDownToLine className="w-3.5 h-3.5" />
                Gravity Drop Probe (0.5m)
              </span>
              <span className="font-mono text-[11px] text-amber-300 tabular-nums">
                {dropTelemetry.gMs2.toFixed(2)} m/s²
              </span>
            </div>

            <div className="grid grid-cols-5 gap-1">
              {([
                { id: 'placed', label: 'Model' },
                { id: 'moon', label: 'Moon' },
                { id: 'mars', label: 'Mars' },
                { id: 'earth', label: 'Earth' },
                { id: 'jupiter', label: 'Jup' },
              ] as const).map(opt => (
                <button
                  key={opt.id}
                  onClick={() => {
                    soundEffects.playClick();
                    setExperimentGravityBody(opt.id);
                  }}
                  className={`py-1 rounded text-[10px] font-semibold border transition-colors ${
                    experimentGravityBody === opt.id
                      ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                onClick={handleRunGravityDrop}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5"
              >
                <ArrowDownToLine className="w-3.5 h-3.5" />
                <span>{dropTelemetry.active ? 'Re-Drop' : 'Run Drop Test'}</span>
              </button>
              <div className="text-[11px] font-mono text-slate-300 tabular-nums">
                {dropTelemetry.elapsedS.toFixed(2)}s · {dropTelemetry.maxSpeedMs.toFixed(1)} m/s · {dropTelemetry.bounces} bnc
              </div>
            </div>
          </div>

          {/* 2. Magnetosphere Shield & Solar Wind Burst */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Magnetosphere & Solar Wind Experience
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  soundEffects.playClick();
                  setMagnetosphereOn(v => !v);
                }}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-colors ${
                  magnetosphereOn
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>{magnetosphereOn ? 'Shield: ON' : 'Shield Field'}</span>
              </button>
              <button
                onClick={handleFireSolarWind}
                className="py-1.5 px-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Solar Wind</span>
              </button>
            </div>
          </div>

          {/* 3. Terminator Sun Angle & Companion Moon */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2.5 text-xs">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-300">
                <span className="flex items-center gap-1.5 font-semibold">
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  Day/Night Terminator Angle
                </span>
                <span className="font-mono text-amber-300 tabular-nums">{sunAzimuthDeg}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="5"
                value={sunAzimuthDeg}
                onChange={e => setSunAzimuthDeg(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            <button
              onClick={() => {
                soundEffects.playClick();
                setCompanionMoonOn(v => !v);
              }}
              className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-colors ${
                companionMoonOn
                  ? 'bg-indigo-500 text-white border-indigo-400 font-bold'
                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>{companionMoonOn ? 'Orbiting Moon: Active' : 'Spawn Orbiting Moon'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Interactive 'How to AR' Onboarding Card with 3D Holographic Guide ASTRA */}
      <AnimatePresence>
        {!cinemaHudHidden && showHowToGuide && (() => {
          const step = HOW_TO_AR_STEPS[guideStepIdx] || HOW_TO_AR_STEPS[0];
          const closeGuide = () => {
            soundEffects.playHoloDismiss();
            setShowHowToGuide(false);
            setIsAssetTrayOpen(true);
            try {
              localStorage.setItem(HOWTO_AR_STORAGE_KEY, 'true');
            } catch {
              // Ignore storage quota
            }
          };

          return (
            <motion.div
              key="how-to-ar-card"
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-36 sm:bottom-36 left-3 sm:left-6 z-40 w-[calc(100%-1.5rem)] sm:w-96 pointer-events-auto"
            >
              <div
                style={{ borderColor: activeTheme.borderRgba }}
                className="bg-slate-950/92 border rounded-2xl p-4 shadow-2xl text-slate-100 space-y-3"
              >
                {/* Header: Guide ID, Progress & Voice Toggle */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span
                      style={{ color: activeTheme.accentHex }}
                      className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-900 border border-slate-800"
                    >
                      ASTRA · HOW TO AR
                    </span>
                    <span className="font-mono text-[10px] text-slate-400 tabular-nums">
                      STEP {step.num} / 03
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        soundEffects.playClick();
                        setGuideVoiceOn(v => !v);
                      }}
                      className="p-1 rounded-lg bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                      title={guideVoiceOn ? 'Mute Guide Voice' : 'Enable Guide Voice'}
                    >
                      {guideVoiceOn ? <Volume2 className="w-3.5 h-3.5 text-sky-400" /> : <VolumeX className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={closeGuide}
                      className="px-2 py-1 rounded-lg bg-slate-900 text-slate-400 hover:text-white text-[11px] font-semibold border border-slate-800"
                    >
                      Skip
                    </button>
                  </div>
                </div>

                {/* 3-Step Selector Bar */}
                <div className="grid grid-cols-3 gap-1.5">
                  {HOW_TO_AR_STEPS.map((s, idx) => {
                    const active = idx === guideStepIdx;
                    const done = idx < guideStepIdx;
                    return (
                      <button
                        key={s.id}
                        onClick={() => {
                          soundEffects.playClick();
                          setGuideStepIdx(idx);
                        }}
                        className={`px-2 py-1 rounded-lg text-[10px] font-semibold border text-left transition-colors flex items-center gap-1 ${
                          active
                            ? 'bg-sky-500/20 border-sky-400 text-white'
                            : done
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span className="font-mono tabular-nums">{s.num}</span>
                        <span className="truncate">{s.title}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Step Instructions */}
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white leading-snug">{step.headline}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{step.description}</p>
                </div>

                {/* Live Interactive Action Footer */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80 text-xs">
                  {guideStepIdx === 0 && (
                    <>
                      <span className="text-[11px] font-mono text-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isPlaneDetected ? 'Surface Locked' : 'Spatial Floor Ready'}</span>
                      </span>
                      <button
                        onClick={() => {
                          setHitTestResult(true);
                          setIsPlaneDetected(true);
                          soundEffects.playScan();
                          setGuideStepIdx(1);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold transition-colors"
                      >
                        Next: Place Asset →
                      </button>
                    </>
                  )}

                  {guideStepIdx === 1 && (
                    <>
                      <button
                        onClick={() => {
                          if (cameraRef.current) {
                            const demoWorld = ArObjectDetector.raycastToSurface(
                              window.innerWidth * 0.54,
                              window.innerHeight * 0.56,
                              window.innerWidth,
                              window.innerHeight,
                              cameraRef.current,
                              visionFrameRef.current?.estimatedSurfaceY ?? -0.25,
                            );
                            anchorAtWorldPosition(demoWorld, 'guided spatial desk');
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-colors"
                      >
                        Anchor Model Now
                      </button>
                      <button
                        onClick={() => setGuideStepIdx(2)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700"
                      >
                        Next →
                      </button>
                    </>
                  )}

                  {guideStepIdx === 2 && (
                    <>
                      <button
                        onClick={() => {
                          soundEffects.playClick();
                          setGuideStepIdx(0);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700"
                      >
                        Replay
                      </button>
                      <button
                        onClick={() => {
                          soundEffects.playSuccess();
                          closeGuide();
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-colors"
                      >
                        Start Exploring ✓
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Bottom Spatial Dock with Clean Segmented Interaction Mode & Lighting Calibration */}
      {!cinemaHudHidden && (
        <div className="absolute bottom-3 inset-x-3 sm:inset-x-6 z-30 flex justify-center pointer-events-none">
          <div className="pointer-events-auto w-full max-w-2xl bg-slate-950/92 border border-slate-800 rounded-2xl p-3 sm:p-3.5 shadow-2xl space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                {isPlaced ? (
                  <>
                    <SegmentedTabs<'place' | 'move' | 'rotate'>
                      layoutId="ar-interact-mode"
                      compact
                      value={interactMode}
                      onChange={v => {
                        soundEffects.playClick();
                        setInteractMode(v);
                      }}
                      items={[
                        { id: 'place', label: 'Re-Anchor', icon: <MapPin className="w-3.5 h-3.5" /> },
                        { id: 'move', label: 'Move', icon: <Move className="w-3.5 h-3.5" /> },
                        { id: 'rotate', label: 'Rotate', icon: <RotateCw className="w-3.5 h-3.5" /> },
                      ]}
                    />
                    <button
                      onClick={handleResetPlacement}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700"
                      title="Clear anchor & scan again"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
                      <span className="hidden sm:inline">Clear</span>
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-amber-300 font-medium">
                    <Crosshair className="w-4 h-4 text-sky-400" />
                    <span>Tap surface to anchor {getModelDisplayName(selectedModel)}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {isSpacecraft && (
                  <button
                    onClick={() => {
                      soundEffects.playClick();
                      setThrustersIgnited(!thrustersIgnited);
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-semibold text-xs transition-colors ${
                      thrustersIgnited
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'bg-slate-800 text-amber-300 hover:bg-slate-700 border border-slate-700'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Thrusters</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    soundEffects.playClick();
                    setIsAnimating(v => !v);
                  }}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700"
                  title={isAnimating ? 'Pause Spin' : 'Resume Spin'}
                >
                  {isAnimating ? <Pause className="w-3.5 h-3.5 text-sky-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
                </button>

                <button
                  onClick={() => {
                    soundEffects.playClick();
                    setShowFactSheet(!showFactSheet);
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-semibold text-xs border transition-colors ${
                    showFactSheet
                      ? 'bg-sky-500 text-slate-950 border-sky-400'
                      : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border-slate-700'
                  }`}
                >
                  <Info className="w-3.5 h-3.5" />
                  <span>Specs</span>
                </button>

                <button
                  onClick={() => {
                    soundEffects.playClick();
                    setShowArLab(v => !v);
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold text-xs border transition-colors ${
                    showArLab
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                      : 'bg-emerald-500/15 text-emerald-300 border-emerald-400/50 hover:bg-emerald-500/25'
                  }`}
                >
                  <FlaskConical className="w-3.5 h-3.5" />
                  <span>AR Lab</span>
                </button>

                <button
                  onClick={() => {
                    soundEffects.playHoloActivate();
                    setShowHologramHUD(true);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold text-xs bg-sky-500/20 text-sky-300 border border-sky-400/50 hover:bg-sky-500/30 transition-colors"
                >
                  <Scan className="w-3.5 h-3.5" />
                  <span>Holo HUD</span>
                </button>

                <button
                  onClick={() => setIsControlsExpanded(!isControlsExpanded)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
                  title="Lighting, Exposure & Shadow Calibration"
                >
                  {isControlsExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Sliders Row + Scale Quick Presets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800 text-xs">
              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span>Scale</span>
                  <div className="flex items-center gap-1">
                    {[0.5, 1.0, 2.0].map(preset => (
                      <button
                        key={preset}
                        onClick={() => {
                          soundEffects.playClick();
                          setModelScale(preset);
                        }}
                        className={`px-1.5 py-0.2 rounded font-mono text-[10px] ${
                          Math.abs(modelScale - preset) < 0.08
                            ? 'bg-sky-500 text-slate-950 font-bold'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {preset}x
                      </button>
                    ))}
                    <span className="font-mono font-semibold text-sky-300 ml-1 tabular-nums">
                      {Math.round(modelScale * 100)}%
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0.25"
                  max="3.5"
                  step="0.05"
                  value={modelScale}
                  onChange={e => setModelScale(parseFloat(e.target.value))}
                  className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Spin Rate</span>
                  <span className="font-mono font-semibold text-sky-300 tabular-nums">{rotationSpeed.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2.0"
                  step="0.1"
                  value={rotationSpeed}
                  onChange={e => setRotationSpeed(parseFloat(e.target.value))}
                  className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
              </div>
            </div>

            {/* Expandable Lighting & Floor Shadow Calibration */}
            {isControlsExpanded && (
              <div className="pt-2 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                      Floor Shadow
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShadowsEnabled(!shadowsEnabled)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          shadowsEnabled ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {shadowsEnabled ? 'ON' : 'OFF'}
                      </button>
                      <span className="font-mono font-semibold text-amber-300 tabular-nums">{Math.round(shadowOpacity * 100)}%</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.9"
                    step="0.05"
                    value={shadowOpacity}
                    onChange={e => setShadowOpacity(parseFloat(e.target.value))}
                    disabled={!shadowsEnabled}
                    className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg disabled:opacity-30"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-300">
                      Room Light Match & Exposure
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setAutoRoomLight(v => !v)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          autoRoomLight ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {autoRoomLight ? 'Auto Match' : 'Manual'}
                      </button>
                      <span className="font-mono font-semibold text-sky-300 tabular-nums">{exposureBoost.toFixed(2)} EV</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0.65"
                    max="1.5"
                    step="0.05"
                    value={exposureBoost}
                    onChange={e => setExposureBoost(parseFloat(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

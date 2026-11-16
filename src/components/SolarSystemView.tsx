import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { useClassroom } from '../context/ClassroomContext';
import { PLANETS_DATA, ORDERED_PLANETS } from '../data/planetsData';
import { SPACECRAFTS_DATA, ORDERED_SPACECRAFT } from '../data/spaceCraftData';
import { GALAXIES_DATA, ORDERED_GALAXIES } from '../data/galaxiesData';
import { PlanetId, SpacecraftId, GalaxyId, ArPlaceableId } from '../types/astronomy';
import { getPlanetTexture } from '../utils/textureGenerator';
import { createSpacecraftObject } from '../utils/spaceCraftModels';
import { create3DGalaxy } from '../utils/galaxyGenerator';
import { AnimatePresence } from 'motion/react';
import {
  COLOR_GRADE_PRESETS,
  COLOR_GRADE_THEMES,
  ColorGradePresetId,
  CinematicPipeline,
  HologramVFXAssembly,
  createCinematicComposer,
  createEnhancedPlanetAssembly,
  createHologramVFXAssembly,
  createSolarCoronaGroup,
} from '../utils/coreAssetsEngine';
import {
  createDeepSpaceParticleSystem,
  DeepSpaceParticleSystem,
} from '../utils/deepSpaceParticles';
import { soundEffects } from '../utils/soundEffects';
import { SciFiHologramHUD } from './SciFiHologramHUD';
import { HoloQuickTooltip, TooltipScreenAnchor } from './HoloQuickTooltip';
import {
  deviceLocation,
  OBSERVATORY_PRESETS,
  createWarpStreaksVFX,
  GpsLocationState,
} from '../utils/deviceLocationGesture';
import {
  Play,
  Pause,
  RotateCcw,
  Eye,
  Maximize2,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
  Compass,
  Info,
  Camera,
  Satellite,
  Rocket,
  Orbit,
  Sparkles,
  Smartphone,
  Music,
  MapPin,
  Globe,
  Sliders,
  Zap,
  Navigation,
  X,
  Crosshair,
  Presentation,
  ArrowRight,
  ArrowLeft,
  Scan,
  Shield,
  HelpCircle,
  Palette,
  Atom,
  Flame,
  Layers,
  Box,
  Glasses,
  Table2,
} from 'lucide-react';
import {
  OrbitalPhysicsEngine,
  PhysicsGravityMode,
  CollisionRecord,
} from '../utils/orbitalPhysicsEngine';
import {
  VrExperienceMode,
  createHolodeckTableRig,
  LowLatencyVRInput,
  probeWebXRVRSupport,
  startWebXRVRSession,
} from '../utils/vrImmersiveController';
import { deviceGyro } from '../utils/deviceOrientation';
import { useGyroscope } from '../hooks/useGyroscope';

// Pre-allocated reusable math vectors & quaternions
const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();
const _waypointCamPos = new THREE.Vector3();
const _gyroEuler = new THREE.Euler(0, 0, 0, 'YXZ');
const _gyroQuat = new THREE.Quaternion();
const _celestialEuler = new THREE.Euler(0, 0, 0, 'YXZ');
const _celestialQuat = new THREE.Quaternion();
const _holoWorldPos = new THREE.Vector3();
const _holoProjVec = new THREE.Vector3();
const _prevCamPos = new THREE.Vector3(0, 32, 60);
const _localCamPos = new THREE.Vector3(0, 32, 60);
const _vrThrustForward = new THREE.Vector3();
const _stereoSize = new THREE.Vector2();

const HOLO_DWELL_MS = 2000;

// Strategic cosmic coordinates for all 10 deep universe structures in 3D Space
const GALAXY_COORDINATES: Record<GalaxyId, { pos: [number, number, number]; scale: number }> = {
  'milky-way': { pos: [0, 95, -140], scale: 2.8 },
  'andromeda': { pos: [140, 55, -110], scale: 2.6 },
  'triangulum': { pos: [90, -45, -120], scale: 2.0 },
  'sombrero': { pos: [-130, 50, -110], scale: 2.2 },
  'whirlpool': { pos: [-105, -55, 95], scale: 2.1 },
  'cartwheel': { pos: [120, -70, 85], scale: 2.2 },
  'cigar': { pos: [-85, 75, -80], scale: 1.9 },
  'large-magellanic-cloud': { pos: [-70, -85, -100], scale: 1.8 },
  'cosmic-web': { pos: [0, -170, -90], scale: 3.8 },
  'observable-universe': { pos: [0, 0, -260], scale: 5.5 },
};

/**
 * Procedural 3D Holographic Emitter Pedestal
 */
function createHologramEmitter3D(): THREE.Group {
  const group = new THREE.Group();

  // 1. Concentric pulsing cyan ring
  const ringGeo = new THREE.RingGeometry(0.8, 1.4, 32);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.65,
  });
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  group.add(ringMesh);

  // 2. Outer segmented reticle ring
  const outerRingGeo = new THREE.RingGeometry(1.6, 1.8, 24);
  outerRingGeo.rotateX(-Math.PI / 2);
  const outerMat = new THREE.MeshBasicMaterial({
    color: 0x0284c7,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.45,
    wireframe: true,
  });
  const outerMesh = new THREE.Mesh(outerRingGeo, outerMat);
  group.add(outerMesh);

  // 3. Ethereal holographic projection beam cylinder
  const beamGeo = new THREE.CylinderGeometry(0.2, 1.2, 3.2, 16, 1, true);
  beamGeo.translate(0, 1.6, 0);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.16,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const beamMesh = new THREE.Mesh(beamGeo, beamMat);
  group.add(beamMesh);

  group.userData = { ringMesh, outerMesh, beamMesh, ringMat };
  group.visible = false;
  return group;
}

export const SolarSystemView: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const {
    setSelectedPlanetId,
    setCurrentView,
    markPlanetExplored,
    soundEnabled,
    toggleSound,
    isTeacherPresenting3D,
    setIsTeacherPresenting3D,
    teacherSlides,
    teacherSlideIndex,
    setTeacherSlideIndex,
    colorGradePreset,
    setColorGradePreset,
  } = useClassroom();

  // Visual grading & post-processing state
  const [showGradeMenu, setShowGradeMenu] = useState(false);
  const [bloomIntensity, setBloomIntensity] = useState<number>(
    () => COLOR_GRADE_PRESETS[colorGradePreset].bloomStrength,
  );

  // Dock & Category state
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'planets' | 'spacecraft' | 'galaxies'>('planets');
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const simSpeedRef = useRef<number>(1);
  const [isCosmicMusicOn, setIsCosmicMusicOn] = useState<boolean>(() => soundEffects.isCosmicMusicActive());
  const [showOrbits, setShowOrbits] = useState<boolean>(true);
  const [showSpacecraft, setShowSpacecraft] = useState<boolean>(true);
  const [showGalaxies, setShowGalaxies] = useState<boolean>(true);
  const [showDeepSpace, setShowDeepSpace] = useState<boolean>(true);
  const [focusedPlanet, setFocusedPlanet] = useState<PlanetId | 'overview' | SpacecraftId | GalaxyId>('overview');

  // Sci-Fi Hologram HUD, 2-Second Quick Tooltip & Interaction Dwell state
  const [hologramActiveId, setHologramActiveId] = useState<string | null>(null);
  const hologramActiveIdRef = useRef<string | null>(null);
  const [quickTooltipAnchor, setQuickTooltipAnchor] = useState<TooltipScreenAnchor | null>(null);
  const quickTooltipIdRef = useRef<string | null>(null);
  const [hoverReticle, setHoverReticle] = useState<{
    id: string;
    name: string;
    category: string;
    screenX: number;
    screenY: number;
    progress: number;
  } | null>(null);
  const hoverStartTimeRef = useRef<number>(0);
  const hoveredIdRef = useRef<string | null>(null);
  const hoveredNameRef = useRef<string>('Celestial Target');
  const hoveredCatRef = useRef<string>('OBJECT');
  const scanMilestoneRef = useRef<number>(0);
  const pointerDownOriginRef = useRef<{ x: number; y: number } | null>(null);
  const didPointerDragRef = useRef<boolean>(false);
  const lastRaycastTimeRef = useRef<number>(0);
  const lastUiSyncRef = useRef<number>(0);
  const colorGradePresetRef = useRef<ColorGradePresetId>(colorGradePreset);

  // Teacher Presentation & Slide Animation state
  const [slideWaypointStep, setSlideWaypointStep] = useState<number>(0);
  const [isSlideFlying, setIsSlideFlying] = useState<boolean>(false);
  const [isPresentationPanelMinimized, setIsPresentationPanelMinimized] = useState<boolean>(false);

  // GPS Location & Celestial Alignment state
  const [gpsActive, setGpsActive] = useState<boolean>(false);
  const [gpsState, setGpsState] = useState<GpsLocationState>(() => deviceLocation.getState());
  const [showGpsModal, setShowGpsModal] = useState<boolean>(false);
  const [selectedObservatoryId, setSelectedObservatoryId] = useState<string>('current-gps');

  // Device Gyroscope & Motion Tracking
  const {
    isActive: isGyroActive,
    isHardware: isGyroHardware,
    toggleGyro,
    calibrate: calibrateGyro,
    sensitivity: gyroSensitivity,
    setSensitivity: setGyroSensitivity,
  } = useGyroscope();

  // Cannon.js Orbital Physics & Collision state
  const [showPhysicsMenu, setShowPhysicsMenu] = useState<boolean>(false);
  const [gravityMode, setGravityMode] = useState<PhysicsGravityMode>('kepler');
  const [gravityScale, setGravityScale] = useState<number>(1.0);
  const [collisionCount, setCollisionCount] = useState<number>(0);
  const [debrisCount, setDebrisCount] = useState<number>(22);
  const [recentCollision, setRecentCollision] = useState<CollisionRecord | null>(null);
  const [showPhysicsWireframe, setShowPhysicsWireframe] = useState<boolean>(false);
  const physicsRef = useRef<OrbitalPhysicsEngine | null>(null);
  const lastDebrisSyncRef = useRef<number>(0);

  // WebXR / Mobile IMU / Desktop Tabletop VR Mode state
  const [vrMode, setVrMode] = useState<VrExperienceMode>('off');
  const [stereoSplit, setStereoSplit] = useState<boolean>(false);
  const [webxrSupported, setWebxrSupported] = useState<boolean>(false);
  const [webxrActive, setWebxrActive] = useState<boolean>(false);
  const [showVrMenu, setShowVrMenu] = useState<boolean>(false);
  const [vrPointerLocked, setVrPointerLocked] = useState<boolean>(false);
  const [vrHasImu, setVrHasImu] = useState<boolean>(false);
  const vrModeRef = useRef<VrExperienceMode>('off');
  const stereoSplitRef = useRef<boolean>(false);
  const vrRigRef = useRef<THREE.Group | null>(null);
  const vrInputRef = useRef<LowLatencyVRInput | null>(null);
  const tableRigRef = useRef<ReturnType<typeof createHolodeckTableRig> | null>(null);
  const stereoCamRef = useRef<THREE.StereoCamera | null>(null);
  const xrSessionRef = useRef<any>(null);
  const vrThrustRef = useRef<boolean>(false);

  // Three.js refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const planetMeshesRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const orbitLinesRef = useRef<THREE.Group | null>(null);
  const spacecraftGroupRef = useRef<THREE.Group | null>(null);
  const galaxiesGroupRef = useRef<THREE.Group | null>(null);
  const warpStreaksGroupRef = useRef<THREE.Group | null>(null);
  const celestialGroupRef = useRef<THREE.Group | null>(null);
  const holoEmitterRef = useRef<THREE.Group | null>(null);
  const holoVfxRef = useRef<HologramVFXAssembly | null>(null);
  const pipelineRef = useRef<CinematicPipeline | null>(null);
  const coronaGroupRef = useRef<THREE.Group | null>(null);
  const deepSpaceRef = useRef<DeepSpaceParticleSystem | null>(null);
  const smoothedWarpRef = useRef<number>(0);

  // Focus transition animation flag
  const isTransitioningRef = useRef(false);

  // Current Teacher Slide (from live editable deck)
  const safeTeacherIdx = Math.min(teacherSlideIndex, Math.max(0, teacherSlides.length - 1));
  const currentTeacherSlide = teacherSlides[safeTeacherIdx] || teacherSlides[0];

  // Handle Simulation Speed Controls with Sound & Warp Streaks
  const handleSetSpeed = (val: number) => {
    soundEffects.playSpeedChange(val);
    if (val >= 5) {
      soundEffects.playWarpStreak(val);
    }
    setSimSpeed(val);
    simSpeedRef.current = val;
  };

  const handleToggleCosmicMusic = () => {
    soundEffects.playClick();
    const active = soundEffects.toggleCosmicMusic();
    setIsCosmicMusicOn(active);
  };

  // Toggle GPS Celestial Alignment
  const toggleGpsSkyLock = () => {
    soundEffects.playClick();
    if (!gpsActive) {
      soundEffects.playGpsLock();
      deviceLocation.startWatching();
      deviceLocation.setSkyAligned(true);
      setGpsActive(true);
      setShowGpsModal(true);
    } else {
      deviceLocation.setSkyAligned(false);
      setGpsActive(false);
    }
  };

  const selectObservatoryPreset = (presetId: string) => {
    soundEffects.playClick();
    setSelectedObservatoryId(presetId);
    deviceLocation.setObservatoryPreset(presetId);
    soundEffects.playGpsLock();
  };

  // Subscribe to GPS Location updates
  useEffect(() => {
    const unsubscribe = deviceLocation.subscribe(updatedState => {
      setGpsState({ ...updatedState });
    });
    return () => unsubscribe();
  }, []);

  // Sync 3D Scene to Teacher Slide with Unique Animation & Presentation
  const triggerSlidePresentation = (slideIdx: number) => {
    const slide = teacherSlides[slideIdx];
    if (!slide) return;

    soundEffects.playWarp();
    setIsSlideFlying(true);
    setSlideWaypointStep(0);

    const targetId = slide.targetPlanet;
    if (targetId && targetId !== 'all') {
      focusOnObject(targetId);
    } else {
      focusOnObject('overview');
    }

    // Unique Slide Narration & Presentation Announcement
    const script = slide.narrationScript || `${slide.title}. ${slide.talkingPoints[0]}`;
    soundEffects.speakDetection(script);
  };

  // Trigger unique slide animation when teacher presentation mode is active or slide changes
  useEffect(() => {
    if (isTeacherPresenting3D) {
      triggerSlidePresentation(teacherSlideIndex);
    }
  }, [isTeacherPresenting3D, teacherSlideIndex]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect software WebGL
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x04060f);
    scene.fog = new THREE.FogExp2(0x04060f, 0.0035);
    sceneRef.current = scene;

    // Celestial parent group for GPS alignment & VR Tabletop scaling
    const celestialGroup = new THREE.Group();
    celestialGroupRef.current = celestialGroup;
    scene.add(celestialGroup);

    // XR / First-Person Camera Rig
    const vrRig = new THREE.Group();
    vrRig.name = 'XRUserRig';
    vrRigRef.current = vrRig;
    scene.add(vrRig);

    // Procedural Holodeck Observatory Projector Table for Desktop / VR Tabletop Mode
    const tableRig = createHolodeckTableRig();
    tableRigRef.current = tableRig;
    scene.add(tableRig.group);

    // 2. Camera with tight near plane for tabletop diorama & deep cosmic far range
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.05,
      1200
    );
    camera.position.set(0, 32, 60);
    cameraRef.current = camera;

    // 3. Renderer with soft shadows + WebXR readiness
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.xr.enabled = true;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // Stereoscopic camera & low-latency VR head-tracking input
    const stereoCam = new THREE.StereoCamera();
    stereoCam.eyeSep = 0.064;
    stereoCamRef.current = stereoCam;

    const vrInput = new LowLatencyVRInput(locked => {
      setVrPointerLocked(locked);
    });
    vrInput.attach(renderer.domElement);
    vrInputRef.current = vrInput;

    probeWebXRVRSupport().then(supported => {
      setWebxrSupported(supported);
    });

    // 4. Room Environment for PBR reflection
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment()).texture;
    pmremGenerator.dispose();

    // 5. OrbitControls with multi-touch pinch-to-zoom & momentum glide
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 2.0; // allows ultra-close planet inspection
    controls.maxDistance = 550.0; // allows wide cosmic web & universe overview
    controls.maxPolarAngle = Math.PI - 0.05;
    controls.enablePan = true;
    controls.zoomSpeed = 1.2;
    controls.rotateSpeed = 0.85;
    controlsRef.current = controls;

    controls.addEventListener('start', () => {
      isTransitioningRef.current = false;
    });

    // 6. Lighting
    const sunLight = new THREE.PointLight(0xfffaed, 3.0, 320, 0.35);
    sunLight.position.set(0, 0, 0);
    sunLight.castShadow = true;
    celestialGroup.add(sunLight);

    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0b0f19, 0.6);
    scene.add(hemiLight);

    // 7. Dynamic GPU-Shader Starfield, Volumetric Nebulae, Pulsar Beacons & Toroidal Quantum Dust
    const deepSpace = createDeepSpaceParticleSystem(isSoftwareGl, renderer.getPixelRatio());
    deepSpace.setColorPreset(colorGradePresetRef.current);
    celestialGroup.add(deepSpace.group);
    deepSpaceRef.current = deepSpace;

    // 8. The Sun with Animated GLSL Plasma Corona & Prominences
    const sunGeo = new THREE.SphereGeometry(PLANETS_DATA.sun.scale3D, 40, 40);
    const sunTex = getPlanetTexture('sun');
    const sunMat = new THREE.MeshBasicMaterial({
      map: sunTex,
      color: 0xffeedd,
    });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.userData = { id: 'sun', name: 'The Sun', type: 'planet' };
    celestialGroup.add(sunMesh);
    planetMeshesRef.current.set('sun', sunMesh);

    const solarCorona = createSolarCoronaGroup(PLANETS_DATA.sun.scale3D);
    sunMesh.add(solarCorona);
    coronaGroupRef.current = solarCorona;

    // 9. Asteroid Belt
    const asteroidCount = isSoftwareGl ? 350 : 1000;
    const asteroidGeo = new THREE.DodecahedronGeometry(0.12, 0);
    const asteroidMat = new THREE.MeshStandardMaterial({
      color: 0x887766,
      roughness: 0.9,
      metalness: 0.1,
    });
    const asteroidBelt = new THREE.InstancedMesh(asteroidGeo, asteroidMat, asteroidCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < asteroidCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 18.5 + (Math.random() - 0.5) * 3.5;
      const y = (Math.random() - 0.5) * 1.2;
      dummy.position.set(Math.cos(angle) * dist, y, Math.sin(angle) * dist);
      const s = 0.5 + Math.random() * 1.2;
      dummy.scale.set(s, s, s);
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      dummy.updateMatrix();
      asteroidBelt.setMatrixAt(i, dummy.matrix);
    }
    asteroidBelt.computeBoundingSphere();
    celestialGroup.add(asteroidBelt);

    // 10. Orbits Group & Enhanced PBR+Fresnel Planets
    const orbitLines = new THREE.Group();
    orbitLinesRef.current = orbitLines;
    celestialGroup.add(orbitLines);

    ORDERED_PLANETS.forEach(planetId => {
      const pData = PLANETS_DATA[planetId];

      const orbitCurve = new THREE.EllipseCurve(0, 0, pData.orbitRadius3D, pData.orbitRadius3D, 0, 2 * Math.PI, false, 0);
      const orbitPoints = orbitCurve.getPoints(120);
      const orbitGeo = new THREE.BufferGeometry().setFromPoints(
        orbitPoints.map(p => new THREE.Vector3(p.x, 0, p.y))
      );
      const orbitMat = new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.24,
      });
      const orbitLine = new THREE.Line(orbitGeo, orbitMat);
      orbitLines.add(orbitLine);

      const pMesh = createEnhancedPlanetAssembly(
        planetId,
        pData.scale3D,
        isSoftwareGl ? 32 : 48,
      );
      pMesh.userData = {
        id: planetId,
        type: 'planet',
        name: pData.name,
        orbitRadius: pData.orbitRadius3D,
        orbitSpeed: pData.orbitSpeed3D,
        angle: Math.random() * Math.PI * 2,
      };
      celestialGroup.add(pMesh);
      planetMeshesRef.current.set(planetId, pMesh);
    });

    // 11. Satellites and Spacecraft Fleet
    const spacecraftGroup = new THREE.Group();
    spacecraftGroupRef.current = spacecraftGroup;
    celestialGroup.add(spacecraftGroup);

    const earthMesh = planetMeshesRef.current.get('earth') as THREE.Mesh;
    const marsMesh = planetMeshesRef.current.get('mars') as THREE.Mesh;

    // ISS
    const issModel = createSpacecraftObject('iss');
    issModel.scale.set(0.6, 0.6, 0.6);
    issModel.userData = { id: 'iss', type: 'spacecraft', name: 'ISS', parentPlanet: 'earth', orbitDist: 1.6, speed: 2.2, angle: 0.2 };
    if (earthMesh) earthMesh.add(issModel);
    planetMeshesRef.current.set('iss', issModel);

    // Hubble Space Telescope
    const hubbleModel = createSpacecraftObject('hubble');
    hubbleModel.scale.set(0.7, 0.7, 0.7);
    hubbleModel.userData = { id: 'hubble', type: 'spacecraft', name: 'Hubble', parentPlanet: 'earth', orbitDist: 2.1, speed: 1.6, angle: 2.8 };
    if (earthMesh) earthMesh.add(hubbleModel);
    planetMeshesRef.current.set('hubble', hubbleModel);

    // Sputnik 1
    const sputnikModel = createSpacecraftObject('sputnik');
    sputnikModel.scale.set(0.5, 0.5, 0.5);
    sputnikModel.userData = { id: 'sputnik', type: 'spacecraft', name: 'Sputnik 1', parentPlanet: 'earth', orbitDist: 1.3, speed: 2.7, angle: 1.5 };
    if (earthMesh) earthMesh.add(sputnikModel);
    planetMeshesRef.current.set('sputnik', sputnikModel);

    // Space Shuttle Orbiter
    const shuttleModel = createSpacecraftObject('space-shuttle');
    shuttleModel.scale.set(0.65, 0.65, 0.65);
    shuttleModel.rotation.set(0.3, 0.5, 0.2);
    shuttleModel.userData = { id: 'space-shuttle', type: 'spacecraft', name: 'Space Shuttle', parentPlanet: 'earth', orbitDist: 1.85, speed: 1.9, angle: 4.8 };
    if (earthMesh) earthMesh.add(shuttleModel);
    planetMeshesRef.current.set('space-shuttle', shuttleModel);

    // JWST
    const jwstModel = createSpacecraftObject('jwst');
    jwstModel.scale.set(0.8, 0.8, 0.8);
    jwstModel.userData = { id: 'jwst', type: 'spacecraft', name: 'James Webb (JWST)', parentPlanet: 'earth', orbitDist: 3.3, speed: 0.8, angle: 3.8 };
    if (earthMesh) earthMesh.add(jwstModel);
    planetMeshesRef.current.set('jwst', jwstModel);

    // Apollo Lunar Lander
    const apolloModel = createSpacecraftObject('apollo-lander');
    apolloModel.scale.set(0.65, 0.65, 0.65);
    apolloModel.userData = { id: 'apollo-lander', type: 'spacecraft', name: 'Apollo Lander', parentPlanet: 'earth', orbitDist: 2.6, speed: 1.2, angle: 5.5 };
    if (earthMesh) earthMesh.add(apolloModel);
    planetMeshesRef.current.set('apollo-lander', apolloModel);

    // Perseverance Mars Rover
    const marsRoverModel = createSpacecraftObject('mars-rover');
    marsRoverModel.scale.set(0.7, 0.7, 0.7);
    marsRoverModel.userData = { id: 'mars-rover', type: 'spacecraft', name: 'Perseverance Rover', parentPlanet: 'mars', orbitDist: 1.5, speed: 1.5, angle: 1.0 };
    if (marsMesh) marsMesh.add(marsRoverModel);
    planetMeshesRef.current.set('mars-rover', marsRoverModel);

    // Saturn V
    const saturnVModel = createSpacecraftObject('saturn-v');
    saturnVModel.scale.set(0.55, 0.55, 0.55);
    saturnVModel.position.set(16, 2.2, -13);
    saturnVModel.rotation.set(-0.3, 0.8, 0.4);
    saturnVModel.userData = { id: 'saturn-v', name: 'Saturn V', type: 'spacecraft' };
    spacecraftGroup.add(saturnVModel);
    planetMeshesRef.current.set('saturn-v', saturnVModel);

    // SpaceX Starship
    const starshipModel = createSpacecraftObject('starship');
    starshipModel.scale.set(0.5, 0.5, 0.5);
    starshipModel.position.set(14.5, 1.2, 8);
    starshipModel.userData = { id: 'starship', name: 'Starship', type: 'spacecraft', orbitRadius: 15.5, speed: 0.22, angle: 0.8 };
    spacecraftGroup.add(starshipModel);
    planetMeshesRef.current.set('starship', starshipModel);

    // SLS Artemis
    const slsModel = createSpacecraftObject('sls');
    slsModel.scale.set(0.55, 0.55, 0.55);
    slsModel.position.set(19, -1.8, 15);
    slsModel.rotation.set(0.2, -0.6, -0.3);
    slsModel.userData = { id: 'sls', name: 'SLS Artemis', type: 'spacecraft' };
    spacecraftGroup.add(slsModel);
    planetMeshesRef.current.set('sls', slsModel);

    // Voyager 1
    const voyagerModel = createSpacecraftObject('voyager');
    voyagerModel.scale.set(0.9, 0.9, 0.9);
    voyagerModel.position.set(44, 7, -40);
    voyagerModel.lookAt(55, 9, -52);
    voyagerModel.userData = { id: 'voyager', name: 'Voyager 1', type: 'spacecraft' };
    spacecraftGroup.add(voyagerModel);
    planetMeshesRef.current.set('voyager', voyagerModel);

    // 12. Deep Galaxies, Cosmic Web & Observable Universe 3D Procedural Models
    const galaxiesGroup = new THREE.Group();
    galaxiesGroupRef.current = galaxiesGroup;
    celestialGroup.add(galaxiesGroup);

    ORDERED_GALAXIES.forEach(gId => {
      const galaxyId = gId as GalaxyId;
      const gConfig = GALAXY_COORDINATES[galaxyId];
      if (!gConfig) return;

      const pCount = isSoftwareGl ? 3500 : 7500;
      const gModel = create3DGalaxy(galaxyId, pCount);
      gModel.position.set(gConfig.pos[0], gConfig.pos[1], gConfig.pos[2]);
      gModel.scale.setScalar(gConfig.scale);
      gModel.userData = {
        id: gId,
        type: 'galaxy',
        name: GALAXIES_DATA[gId]?.name || gId,
        baseScale: gConfig.scale,
      };

      const coreColor = GALAXIES_DATA[gId]?.accentColor || '#38bdf8';
      const coreLight = new THREE.PointLight(new THREE.Color(coreColor), 1.2, 40);
      gModel.add(coreLight);

      galaxiesGroup.add(gModel);
      planetMeshesRef.current.set(gId, gModel);
    });

    // 12.5 Cannon.js Orbital Gravity & Rigid-Body Collision Engine
    const physics = new OrbitalPhysicsEngine(celestialGroup, (record, intensity) => {
      soundEffects.playCollisionImpact(intensity, record.isMetallic);
      setCollisionCount(c => c + 1);
      setRecentCollision(record);
    });
    physics.registerSun(sunMesh, PLANETS_DATA.sun.scale3D);

    ORDERED_PLANETS.forEach(pId => {
      const pMesh = planetMeshesRef.current.get(pId);
      if (pMesh) physics.registerPlanet(pId, pMesh);
    });

    (
      [
        { id: 'iss', parented: true, r: 0.35 },
        { id: 'hubble', parented: true, r: 0.35 },
        { id: 'sputnik', parented: true, r: 0.3 },
        { id: 'space-shuttle', parented: true, r: 0.4 },
        { id: 'jwst', parented: true, r: 0.45 },
        { id: 'apollo-lander', parented: true, r: 0.38 },
        { id: 'mars-rover', parented: true, r: 0.35 },
        { id: 'saturn-v', parented: false, r: 0.5 },
        { id: 'starship', parented: false, r: 0.5 },
        { id: 'sls', parented: false, r: 0.5 },
        { id: 'voyager', parented: false, r: 0.45 },
      ] as { id: SpacecraftId; parented: boolean; r: number }[]
    ).forEach(entry => {
      const craftMesh = planetMeshesRef.current.get(entry.id);
      if (craftMesh) {
        physics.registerSpacecraft(entry.id, craftMesh, entry.parented, entry.r);
      }
    });

    physics.seedOrbitalDebris(22);
    physicsRef.current = physics;

    // 13. Camera-Attached Starlight Warp Streaks VFX (camera mounted inside vrRig)
    const warpStreaks = createWarpStreaksVFX(isSoftwareGl ? 120 : 280);
    warpStreaksGroupRef.current = warpStreaks;
    camera.add(warpStreaks);
    vrRig.add(camera);

    // 14. Procedural 3D Holographic Emitter Pedestal & Dynamic 3D VFX Scanner Rig
    const holoEmitter = createHologramEmitter3D();
    holoEmitterRef.current = holoEmitter;
    celestialGroup.add(holoEmitter);

    const holoVfx = createHologramVFXAssembly();
    holoVfx.setTint(COLOR_GRADE_THEMES[colorGradePresetRef.current].accentHex);
    holoVfxRef.current = holoVfx;
    scene.add(holoVfx.group);

    // 15. High-Performance Raycaster for 2-Second Hover & Long-Press Detection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const interactiveObjects: THREE.Object3D[] = [];
    planetMeshesRef.current.forEach(obj => {
      interactiveObjects.push(obj);
      obj.traverse(c => {
        if ((c as THREE.Mesh).isMesh || (c as THREE.Points).isPoints) {
          interactiveObjects.push(c);
        }
      });
    });

    const projectWorldToScreen = (obj: THREE.Object3D): { x: number; y: number; visible: boolean } => {
      obj.getWorldPosition(_holoWorldPos);
      _holoProjVec.copy(_holoWorldPos).project(camera);
      const rect = renderer.domElement.getBoundingClientRect();
      return {
        x: rect.left + ((_holoProjVec.x + 1) * 0.5) * rect.width,
        y: rect.top + ((-_holoProjVec.y + 1) * 0.5) * rect.height,
        visible: _holoProjVec.z >= -1 && _holoProjVec.z <= 1,
      };
    };

    const pickTargetAtPointer = (clientX: number, clientY: number): { id: string; name: string; category: string } | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactiveObjects, false);
      if (intersects.length === 0) return null;

      let hitObj: THREE.Object3D | null = intersects[0].object;
      while (hitObj) {
        if (hitObj.userData?.id) {
          const id = hitObj.userData.id as string;
          const name = hitObj.userData.name || id;
          const category =
            id === 'sun'
              ? 'G2V STAR'
              : id in PLANETS_DATA
              ? 'PLANETARY SPHERE'
              : id in SPACECRAFTS_DATA
              ? SPACECRAFTS_DATA[id as SpacecraftId].category.toUpperCase()
              : 'COSMIC STRUCTURE';
          return { id, name, category };
        }
        hitObj = hitObj.parent;
      }
      return null;
    };

    const beginHoverOrPress = (hit: { id: string; name: string; category: string }) => {
      if (hoveredIdRef.current !== hit.id) {
        hoveredIdRef.current = hit.id;
        hoveredNameRef.current = hit.name;
        hoveredCatRef.current = hit.category;
        hoverStartTimeRef.current = performance.now();
        scanMilestoneRef.current = 0;
        soundEffects.playHoloDwell();

        const mesh = planetMeshesRef.current.get(hit.id);
        if (mesh) {
          const scr = projectWorldToScreen(mesh);
          setHoverReticle({
            id: hit.id,
            name: hit.name,
            category: hit.category,
            screenX: scr.x,
            screenY: scr.y,
            progress: 0,
          });
        }
      }
    };

    const cancelHoverScan = () => {
      if (hoveredIdRef.current) {
        hoveredIdRef.current = null;
        scanMilestoneRef.current = 0;
        setHoverReticle(null);
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      pointerDownOriginRef.current = { x: event.clientX, y: event.clientY };
      didPointerDragRef.current = false;

      if (hologramActiveIdRef.current) return;
      const hit = pickTargetAtPointer(event.clientX, event.clientY);
      if (hit) {
        beginHoverOrPress(hit);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (document.pointerLockElement === renderer.domElement) {
        cancelHoverScan();
        return;
      }

      if (pointerDownOriginRef.current) {
        const dist = Math.hypot(
          event.clientX - pointerDownOriginRef.current.x,
          event.clientY - pointerDownOriginRef.current.y,
        );
        if (dist > 8) {
          didPointerDragRef.current = true;
          cancelHoverScan();
          return;
        }
      }

      if (hologramActiveIdRef.current) return;

      const now = performance.now();
      if (now - lastRaycastTimeRef.current < 36) return;
      lastRaycastTimeRef.current = now;

      const hit = pickTargetAtPointer(event.clientX, event.clientY);
      if (hit) {
        renderer.domElement.style.cursor = 'pointer';
        // Don't re-scan if quick tooltip is already pinned to this exact object
        if (quickTooltipIdRef.current === hit.id) {
          cancelHoverScan();
          return;
        }
        beginHoverOrPress(hit);
      } else {
        renderer.domElement.style.cursor = 'grab';
        cancelHoverScan();
      }
    };

    const handlePointerUp = (event: PointerEvent) => {
      const wasDrag = didPointerDragRef.current;
      pointerDownOriginRef.current = null;
      didPointerDragRef.current = false;

      if (wasDrag || hologramActiveIdRef.current) return;

      const hit = pickTargetAtPointer(event.clientX, event.clientY);
      if (hit) {
        const mesh = planetMeshesRef.current.get(hit.id);
        focusOnObject(hit.id as PlanetId | SpacecraftId | GalaxyId);
        if (mesh) {
          const scr = projectWorldToScreen(mesh);
          quickTooltipIdRef.current = hit.id;
          setQuickTooltipAnchor({ id: hit.id, screenX: scr.x, screenY: scr.y });
          cancelHoverScan();
          soundEffects.playHoloTooltipReveal();
        }
      } else if (quickTooltipIdRef.current) {
        quickTooltipIdRef.current = null;
        setQuickTooltipAnchor(null);
        soundEffects.playHoloDismiss();
      }
    };

    const handlePointerLeaveOrCancel = () => {
      pointerDownOriginRef.current = null;
      didPointerDragRef.current = false;
      renderer.domElement.style.cursor = 'grab';
      cancelHoverScan();
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);
    renderer.domElement.addEventListener('pointercancel', handlePointerLeaveOrCancel);
    renderer.domElement.addEventListener('pointerleave', handlePointerLeaveOrCancel);

    // 15.5 Hardware Post-Processing Pipeline (Bloom + Filmic Color Grading)
    if (!isSoftwareGl) {
      pipelineRef.current = createCinematicComposer(
        renderer,
        scene,
        camera,
        container.clientWidth,
        container.clientHeight,
        colorGradePreset,
      );
    }

    // 16. Resize handler (preserves true 1:1 per-eye geometry in stereo split)
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      const effectiveWidth = stereoSplitRef.current && vrModeRef.current !== 'off' ? w * 0.5 : w;
      cameraRef.current.aspect = effectiveWidth / Math.max(1, h);
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
      pipelineRef.current?.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 17. WebXR-Compatible Animation Loop (zero-GC low-latency setAnimationLoop)
    const clock = new THREE.Clock();

    renderer.setAnimationLoop(() => {
      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();
      const speed = simSpeedRef.current;
      const activeVrMode = vrModeRef.current;

      // Smooth solar system scaling for Desktop / VR Tabletop Diorama vs True Cosmic Scale
      const targetSystemScale = activeVrMode === 'tabletop' ? 0.065 : 1.0;
      if (Math.abs(celestialGroup.scale.x - targetSystemScale) > 0.0004) {
        const nextScale = THREE.MathUtils.damp(celestialGroup.scale.x, targetSystemScale, 8.0, delta);
        celestialGroup.scale.setScalar(nextScale);
      }
      tableRig.update(elapsed);

      // Sun self rotation & GLSL plasma corona animation
      if (speed > 0) {
        sunMesh.rotation.y += delta * 0.15 * Math.max(0.2, speed * 0.5);
      }
      if (coronaGroupRef.current?.userData?.update) {
        coronaGroupRef.current.userData.update(elapsed);
      }

      // Dynamic Deep-Space Particle System: reacts smoothly to world camera velocity & warp jumps
      camera.getWorldPosition(_localCamPos);
      const camMoveDist = _localCamPos.distanceTo(_prevCamPos);
      _prevCamPos.copy(_localCamPos);
      const rawVelocityWarp = Math.min(1.1, (camMoveDist / Math.max(0.008, delta)) * 0.015);
      const speedWarp = speed >= 5 ? (speed >= 10 ? 0.85 : 0.45) : 0;
      const transitWarp = isTransitioningRef.current ? 0.65 : 0;
      const thrustWarp = vrThrustRef.current ? 0.55 : 0;
      const targetWarp = Math.min(1.4, Math.max(rawVelocityWarp, speedWarp, transitWarp, thrustWarp));
      smoothedWarpRef.current = THREE.MathUtils.damp(smoothedWarpRef.current, targetWarp, 4.5, delta);

      celestialGroup.worldToLocal(_localCamPos);
      deepSpaceRef.current?.update(elapsed, delta, speed, _localCamPos, smoothedWarpRef.current);

      // Asteroid belt subtle drift
      asteroidBelt.rotation.y += delta * 0.02 * speed;

      const activeGravityMode = physicsRef.current?.getGravityMode() || 'kepler';

      // Move planets in circular Kepler orbits (or let Cannon.js drive N-body trajectories)
      ORDERED_PLANETS.forEach(planetId => {
        const pMesh = planetMeshesRef.current.get(planetId);
        if (pMesh && pMesh.userData) {
          if (activeGravityMode === 'kepler') {
            pMesh.userData.angle += delta * pMesh.userData.orbitSpeed * speed * 0.25;
            const r = pMesh.userData.orbitRadius;
            const a = pMesh.userData.angle;
            pMesh.position.x = Math.cos(a) * r;
            pMesh.position.y = 0;
            pMesh.position.z = Math.sin(a) * r;
          }
          if (speed > 0) {
            pMesh.rotation.y += delta * 0.5 * Math.max(0.2, speed * 0.5);
          }
        }
      });

      // Move planetary orbiters
      ['iss', 'hubble', 'sputnik', 'space-shuttle', 'jwst', 'apollo-lander', 'mars-rover'].forEach(scId => {
        const scMesh = planetMeshesRef.current.get(scId);
        if (scMesh && scMesh.userData && scMesh.userData.orbitDist) {
          scMesh.userData.angle += delta * scMesh.userData.speed * speed;
          const d = scMesh.userData.orbitDist;
          const a = scMesh.userData.angle;
          scMesh.position.x = Math.cos(a) * d;
          scMesh.position.z = Math.sin(a) * d;
          if (speed > 0) {
            scMesh.rotation.y += delta * 0.6 * speed;
          }
        }
      });

      // Move Starship along its deep space solar orbit (when Kepler mode active)
      const starshipMesh = planetMeshesRef.current.get('starship');
      if (starshipMesh && starshipMesh.userData && starshipMesh.userData.orbitRadius) {
        if (activeGravityMode === 'kepler') {
          starshipMesh.userData.angle += delta * starshipMesh.userData.speed * speed;
          const r = starshipMesh.userData.orbitRadius;
          const a = starshipMesh.userData.angle;
          starshipMesh.position.x = Math.cos(a) * r;
          starshipMesh.position.z = Math.sin(a) * r;
          starshipMesh.rotation.y = a + Math.PI / 2;
        }
      }

      // Outbound rockets and probes drift
      if (speed > 0) {
        ['saturn-v', 'sls', 'voyager'].forEach(scId => {
          const scMesh = planetMeshesRef.current.get(scId);
          if (scMesh) {
            scMesh.rotation.y += delta * 0.05 * speed;
          }
        });
      }

      // Step Cannon.js Newtonian Gravity & Collision Simulation
      physicsRef.current?.step(delta, speed);
      const nowStatsMs = performance.now();
      if (physicsRef.current && nowStatsMs - lastDebrisSyncRef.current > 450) {
        lastDebrisSyncRef.current = nowStatsMs;
        setDebrisCount(physicsRef.current.getStats().debrisCount);
      }

      // Animated rotation of Deep Galaxies & Cosmic Web
      ORDERED_GALAXIES.forEach(gId => {
        const gMesh = planetMeshesRef.current.get(gId);
        if (gMesh) {
          gMesh.rotation.y += delta * 0.06 * Math.max(0.2, speed * 0.4);
        }
      });

      // Update Starlight Warp Streaks VFX
      if (warpStreaksGroupRef.current?.userData?.update) {
        warpStreaksGroupRef.current.userData.update(speed, delta);
      }

      // Animate 3D Hologram Emitter Ring Pedestal
      if (holoEmitterRef.current && holoEmitterRef.current.visible) {
        const u = holoEmitterRef.current.userData;
        if (u.ringMesh) u.ringMesh.rotation.z += delta * 1.2;
        if (u.outerMesh) u.outerMesh.rotation.z -= delta * 0.6;
        if (u.ringMat) {
          u.ringMat.opacity = Math.sin(clock.getElapsedTime() * 5) * 0.2 + 0.65;
        }
      }

      // Camera, Orbit, Mobile IMU Head-Tracking & WebXR Rig Control
      if (renderer.xr.isPresenting) {
        controls.enabled = false;
        vrInput.applyToCamera(camera, vrRig, delta, activeVrMode === 'tabletop' ? 2.4 : 18);
        if (vrThrustRef.current) {
          camera.getWorldDirection(_vrThrustForward).normalize();
          vrRig.position.addScaledVector(
            _vrThrustForward,
            (activeVrMode === 'tabletop' ? 2.2 : 18) * delta,
          );
        }
      } else if (activeVrMode === 'first-person') {
        controls.enabled = false;
        isTransitioningRef.current = false;
        vrInput.applyToCamera(camera, vrRig, delta, 18);
        if (vrThrustRef.current) {
          camera.getWorldDirection(_vrThrustForward).normalize();
          vrRig.position.addScaledVector(_vrThrustForward, 18 * delta);
        }
        if (Math.abs(camera.fov - 75) > 0.05) {
          camera.fov = THREE.MathUtils.lerp(camera.fov, 75, 0.14);
          camera.updateProjectionMatrix();
        }
      } else if (activeVrMode === 'tabletop' && (vrInput.hasHardwareIMU || stereoSplitRef.current)) {
        controls.enabled = false;
        isTransitioningRef.current = false;
        vrInput.applyToCamera(camera, vrRig, delta, 2.6);
        if (vrThrustRef.current) {
          camera.getWorldDirection(_vrThrustForward).normalize();
          vrRig.position.addScaledVector(_vrThrustForward, 2.2 * delta);
        }
        if (Math.abs(camera.fov - 62) > 0.05) {
          camera.fov = THREE.MathUtils.lerp(camera.fov, 62, 0.14);
          camera.updateProjectionMatrix();
        }
      } else {
        controls.enabled = true;

        // Smooth camera transition damping with dynamic warp FOV pulse
        if (isTransitioningRef.current) {
          const dist = camera.position.distanceTo(_targetCamPos);
          camera.position.lerp(_targetCamPos, 0.068);
          controls.target.lerp(_targetLookAt, 0.068);

          const targetFov = 45 + Math.min(4.2, dist * 0.06);
          if (Math.abs(camera.fov - targetFov) > 0.02) {
            camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 0.12);
            camera.updateProjectionMatrix();
          }

          if (dist < 0.25) {
            isTransitioningRef.current = false;
            setIsSlideFlying(false);
          }
        } else if (Math.abs(camera.fov - 45) > 0.05) {
          camera.fov = THREE.MathUtils.lerp(camera.fov, 45, 0.12);
          camera.updateProjectionMatrix();
        }

        controls.update();

        // Immersive cockpit gyroscope outside dedicated VR modes
        const gyro = deviceGyro.getState();
        if (gyro.isActive && !isTransitioningRef.current) {
          _gyroEuler.set(gyro.pitch * 0.45, gyro.yaw * 0.55, gyro.roll * 0.35, 'YXZ');
          _gyroQuat.setFromEuler(_gyroEuler);
          camera.quaternion.multiply(_gyroQuat);
        }
      }

      // Keep UI IMU badge accurate with zero overhead
      if (nowStatsMs - lastDebrisSyncRef.current < 60) {
        setVrHasImu(prev => (prev !== vrInput.hasHardwareIMU ? vrInput.hasHardwareIMU : prev));
      }

      // GPS Celestial Sky Alignment
      const isSkyLocked = deviceLocation.getState().isSkyAligned;
      if (isSkyLocked && celestialGroupRef.current) {
        deviceLocation.getCelestialAlignmentEuler(_celestialEuler);
        _celestialQuat.setFromEuler(_celestialEuler);
        celestialGroupRef.current.quaternion.slerp(_celestialQuat, 0.04);
      }

      // 2-Second Stationary Hover / Long-Press Dwell Progression & Live 3D Projection
      const nowMs = performance.now();
      let dwellProgress = 0;

      if (hoveredIdRef.current && !hologramActiveIdRef.current) {
        const hoverElapsed = nowMs - hoverStartTimeRef.current;
        dwellProgress = Math.min(1.0, hoverElapsed / HOLO_DWELL_MS);

        if (dwellProgress >= 0.33 && scanMilestoneRef.current === 0) {
          scanMilestoneRef.current = 1;
          soundEffects.playHoloScanTick(0.35);
        } else if (dwellProgress >= 0.66 && scanMilestoneRef.current === 1) {
          scanMilestoneRef.current = 2;
          soundEffects.playHoloScanTick(0.7);
        }

        const targetObj = planetMeshesRef.current.get(hoveredIdRef.current);
        if (targetObj) {
          const scr = projectWorldToScreen(targetObj);
          if (dwellProgress >= 1.0) {
            const lockedId = hoveredIdRef.current;
            quickTooltipIdRef.current = lockedId;
            setQuickTooltipAnchor({ id: lockedId, screenX: scr.x, screenY: scr.y });
            hoveredIdRef.current = null;
            scanMilestoneRef.current = 0;
            setHoverReticle(null);
            soundEffects.playHoloTooltipReveal();
          } else if (nowMs - lastUiSyncRef.current > 33) {
            lastUiSyncRef.current = nowMs;
            setHoverReticle({
              id: hoveredIdRef.current,
              name: hoveredNameRef.current,
              category: hoveredCatRef.current,
              screenX: scr.x,
              screenY: scr.y,
              progress: dwellProgress,
            });
          }
        }
      } else if (quickTooltipIdRef.current && !hologramActiveIdRef.current && nowMs - lastUiSyncRef.current > 33) {
        const lockedObj = planetMeshesRef.current.get(quickTooltipIdRef.current);
        if (lockedObj) {
          lastUiSyncRef.current = nowMs;
          const scr = projectWorldToScreen(lockedObj);
          if (scr.visible) {
            setQuickTooltipAnchor(prev =>
              prev && (Math.abs(prev.screenX - scr.x) > 1.2 || Math.abs(prev.screenY - scr.y) > 1.2)
                ? { id: prev.id, screenX: scr.x, screenY: scr.y }
                : prev
            );
          }
        }
      }

      // Sync Dynamic 3D Hologram VFX Rig onto hovered or tooltip-locked target
      const activeVfxId = hologramActiveIdRef.current || quickTooltipIdRef.current || hoveredIdRef.current;
      if (holoVfxRef.current) {
        const vfxObj = activeVfxId ? planetMeshesRef.current.get(activeVfxId) : null;
        if (vfxObj && activeVfxId) {
          vfxObj.getWorldPosition(_holoWorldPos);
          holoVfxRef.current.group.position.copy(_holoWorldPos);
          holoVfxRef.current.group.visible = true;

          const baseScale =
            activeVfxId in PLANETS_DATA
              ? PLANETS_DATA[activeVfxId as PlanetId].scale3D * 1.25
              : activeVfxId in GALAXIES_DATA
              ? (GALAXY_COORDINATES[activeVfxId as GalaxyId]?.scale || 2.0) * 3.0
              : 1.05;

          const isLocked = Boolean(quickTooltipIdRef.current || hologramActiveIdRef.current);
          holoVfxRef.current.update(elapsed, dwellProgress, isLocked, baseScale);
        } else {
          holoVfxRef.current.group.visible = false;
        }
      }

      // Dispatch frame: Native WebXR -> Cardboard Stereo Split -> Cinematic Post-Processing
      if (renderer.xr.isPresenting) {
        renderer.render(scene, camera);
      } else if (stereoSplitRef.current && activeVrMode !== 'off' && stereoCamRef.current) {
        renderer.getSize(_stereoSize);
        const w = _stereoSize.width;
        const h = _stereoSize.height;
        const halfW = Math.floor(w * 0.5);
        camera.updateMatrixWorld();
        stereoCamRef.current.update(camera);

        renderer.setScissorTest(true);
        renderer.setScissor(0, 0, halfW, h);
        renderer.setViewport(0, 0, halfW, h);
        renderer.render(scene, stereoCamRef.current.cameraL);

        renderer.setScissor(halfW, 0, w - halfW, h);
        renderer.setViewport(halfW, 0, w - halfW, h);
        renderer.render(scene, stereoCamRef.current.cameraR);

        renderer.setScissorTest(false);
        renderer.setViewport(0, 0, w, h);
      } else if (pipelineRef.current) {
        const warpPulse = speed >= 5 ? 0.35 + (speed / 10) * 0.25 : 0;
        const scanPulse = hoveredIdRef.current ? dwellProgress * 0.65 : quickTooltipIdRef.current ? 0.22 : 0;
        pipelineRef.current.setHoloPulse(Math.max(warpPulse, scanPulse));
        pipelineRef.current.composer.render();
      } else {
        renderer.render(scene, camera);
      }
    });

    return () => {
      renderer.setAnimationLoop(null);
      if (xrSessionRef.current) {
        xrSessionRef.current.end?.().catch(() => {});
        xrSessionRef.current = null;
      }
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('pointercancel', handlePointerLeaveOrCancel);
      renderer.domElement.removeEventListener('pointerleave', handlePointerLeaveOrCancel);
      vrInput.detach();
      vrInputRef.current = null;
      tableRig.dispose();
      tableRigRef.current = null;
      physicsRef.current?.dispose();
      physicsRef.current = null;
      deepSpaceRef.current?.dispose();
      deepSpaceRef.current = null;
      holoVfxRef.current?.dispose();
      holoVfxRef.current = null;
      pipelineRef.current?.dispose();
      pipelineRef.current = null;
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Sync hologramActiveId ref & pause reticle when modal opens
  useEffect(() => {
    hologramActiveIdRef.current = hologramActiveId;
    if (hologramActiveId) {
      hoveredIdRef.current = null;
      setHoverReticle(null);
    }
  }, [hologramActiveId]);

  // Sync live color grading preset + 3D Hologram VFX tint + Deep Space Nebula harmony
  useEffect(() => {
    colorGradePresetRef.current = colorGradePreset;
    pipelineRef.current?.applyPreset(colorGradePreset);
    holoVfxRef.current?.setTint(COLOR_GRADE_THEMES[colorGradePreset].accentHex);
    deepSpaceRef.current?.setColorPreset(colorGradePreset);
    setBloomIntensity(COLOR_GRADE_PRESETS[colorGradePreset].bloomStrength);
  }, [colorGradePreset]);

  // Sync fine-tuned bloom slider
  useEffect(() => {
    pipelineRef.current?.setBloomStrength(bloomIntensity);
  }, [bloomIntensity]);

  // Update orbit lines visibility
  useEffect(() => {
    if (orbitLinesRef.current) {
      orbitLinesRef.current.visible = showOrbits;
    }
  }, [showOrbits]);

  // Update spacecraft visibility
  useEffect(() => {
    if (spacecraftGroupRef.current) {
      spacecraftGroupRef.current.visible = showSpacecraft;
    }
  }, [showSpacecraft]);

  // Update galaxies visibility
  useEffect(() => {
    if (galaxiesGroupRef.current) {
      galaxiesGroupRef.current.visible = showGalaxies;
    }
  }, [showGalaxies]);

  // Update dynamic starfield & nebula particle backdrop visibility
  useEffect(() => {
    deepSpaceRef.current?.setVisible(showDeepSpace);
  }, [showDeepSpace]);

  // Update 3D Hologram Emitter position when hologramActiveId changes
  useEffect(() => {
    if (!holoEmitterRef.current) return;
    if (!hologramActiveId) {
      holoEmitterRef.current.visible = false;
      return;
    }

    const mesh = planetMeshesRef.current.get(hologramActiveId);
    if (mesh) {
      const worldPos = new THREE.Vector3();
      mesh.getWorldPosition(worldPos);
      holoEmitterRef.current.position.copy(worldPos);
      holoEmitterRef.current.position.y -= 0.8;
      holoEmitterRef.current.visible = true;
    }
  }, [hologramActiveId]);

  // Focus on Planet, Spacecraft, or Galaxy + UNIQUE PRESENTATION ANIMATION
  const focusOnObject = (targetId: PlanetId | SpacecraftId | GalaxyId | 'overview') => {
    setFocusedPlanet(targetId);
    isTransitioningRef.current = true;

    if (targetId === 'overview') {
      soundEffects.playPlanetSound('overview');
      soundEffects.speakPlanet('overview');
      _targetCamPos.set(0, 32, 60);
      _targetLookAt.set(0, 0, 0);
      return;
    }

    const mesh = planetMeshesRef.current.get(targetId);
    if (!mesh) return;

    // 1. Planet
    if (targetId in PLANETS_DATA) {
      const pId = targetId as PlanetId;
      setSelectedPlanetId(pId);
      markPlanetExplored(pId);

      soundEffects.playWarp();
      soundEffects.playPlanetSound(pId);

      const pData = PLANETS_DATA[pId];
      const offsetDist = Math.max(pData.scale3D * 3.5, 4.0);
      mesh.getWorldPosition(_targetLookAt);

      // Slide-specific unique angle presentations
      if (pId === 'sun') {
        _targetCamPos.copy(_targetLookAt).add(new THREE.Vector3(12, 4.5, 16));
      } else if (pId === 'venus' || pId === 'mercury') {
        _targetCamPos.copy(_targetLookAt).add(new THREE.Vector3(offsetDist * 0.9, offsetDist * 0.4, offsetDist * 0.7));
      } else if (pId === 'mars') {
        _targetCamPos.copy(_targetLookAt).add(new THREE.Vector3(offsetDist * 0.7, offsetDist * 0.35, offsetDist * 1.1));
      } else if (pId === 'saturn') {
        // Razor-thin ring grazing angle
        _targetCamPos.copy(_targetLookAt).add(new THREE.Vector3(offsetDist * 1.2, offsetDist * 0.25, offsetDist * 0.9));
      } else if (pId === 'uranus') {
        // Sideways axial tilt inspection angle
        _targetCamPos.copy(_targetLookAt).add(new THREE.Vector3(offsetDist * 0.4, offsetDist * 1.2, offsetDist * 0.8));
      } else {
        _targetCamPos.copy(_targetLookAt).add(new THREE.Vector3(offsetDist * 0.8, offsetDist * 0.5, offsetDist));
      }
    }
    // 2. Spacecraft
    else if (targetId in SPACECRAFTS_DATA) {
      const scId = targetId as SpacecraftId;
      soundEffects.playWarp();
      soundEffects.playSpacecraftSound(scId);

      mesh.getWorldPosition(_targetLookAt);
      _targetCamPos.copy(_targetLookAt).add(new THREE.Vector3(2.4, 1.4, 2.8));
    }
    // 3. Deep Galaxy, Cosmic Web, or Observable Universe
    else if (targetId in GALAXIES_DATA) {
      const gId = targetId as GalaxyId;
      soundEffects.playWarp();

      if (gId === 'cosmic-web' || gId === 'observable-universe') {
        soundEffects.playCosmicWeb();
      } else {
        soundEffects.playGalaxySound(gId);
      }

      mesh.getWorldPosition(_targetLookAt);
      const gConfig = GALAXY_COORDINATES[gId] || { scale: 2.0 };
      const viewDist = Math.max(gConfig.scale * 12.0, 18.0);
      _targetCamPos.copy(_targetLookAt).add(new THREE.Vector3(viewDist * 0.6, viewDist * 0.45, viewDist * 0.85));
    }
  };

  const handleInspectPlanet = () => {
    soundEffects.playClick();
    if (focusedPlanet !== 'overview' && focusedPlanet in PLANETS_DATA) {
      setSelectedPlanetId(focusedPlanet as PlanetId);
      setCurrentView('explorer');
    }
  };

  const handleLaunchAR = (targetId?: ArPlaceableId) => {
    soundEffects.playWarp();
    if (targetId && targetId in PLANETS_DATA) {
      setSelectedPlanetId(targetId as PlanetId);
    }
    setCurrentView('cameraAR');
  };

  // Cannon.js Interactive Physics Handlers
  const handleToggleGravityMode = (mode: PhysicsGravityMode) => {
    soundEffects.playClick();
    setGravityMode(mode);
    physicsRef.current?.setGravityMode(mode);
    if (simSpeedRef.current === 0) {
      handleSetSpeed(1);
    }
  };

  const handleGravityScaleChange = (scale: number) => {
    setGravityScale(scale);
    physicsRef.current?.setGravityScale(scale);
  };

  const handleTogglePhysicsWireframe = () => {
    soundEffects.playClick();
    setShowPhysicsWireframe(prev => {
      const next = !prev;
      physicsRef.current?.setDebugWireframeVisible(next);
      return next;
    });
  };

  // Update camera projection aspect cleanly when toggling Cardboard Stereo Split
  const syncCameraAspect = (isStereo: boolean, mode: VrExperienceMode) => {
    const cam = cameraRef.current;
    const container = mountRef.current;
    if (!cam || !container) return;
    const w = container.clientWidth;
    const h = Math.max(1, container.clientHeight);
    const effectiveW = isStereo && mode !== 'off' ? w * 0.5 : w;
    cam.aspect = effectiveW / h;
    cam.updateProjectionMatrix();
  };

  const handleSetVrMode = (nextMode: VrExperienceMode) => {
    soundEffects.playWarp();
    vrModeRef.current = nextMode;
    setVrMode(nextMode);
    isTransitioningRef.current = false;
    vrThrustRef.current = false;

    const cam = cameraRef.current;
    const vrRig = vrRigRef.current;
    const controls = controlsRef.current;
    const tableRig = tableRigRef.current;
    const vrInput = vrInputRef.current;

    if (nextMode === 'off') {
      if (xrSessionRef.current) {
        xrSessionRef.current.end?.().catch(() => {});
        xrSessionRef.current = null;
        setWebxrActive(false);
      }
      vrInput?.setActive(false);
      stereoSplitRef.current = false;
      setStereoSplit(false);
      if (tableRig) tableRig.group.visible = false;
      if (vrRig) vrRig.position.set(0, 0, 0);
      if (cam) {
        cam.position.set(0, 32, 60);
        cam.fov = 45;
      }
      controls?.target.set(0, 0, 0);
      setIsDockCollapsed(false);
      syncCameraAspect(false, 'off');
      return;
    }

    // Request iOS Motion/Orientation permission cleanly inside user gesture
    vrInput?.requestHardwareSensors();
    vrInput?.setActive(true);
    setIsDockCollapsed(true);

    if (nextMode === 'tabletop') {
      if (tableRig) tableRig.group.visible = true;
      if (xrSessionRef.current) {
        vrRig?.position.set(0, 0, 2.8);
        cam?.position.set(0, 0, 0);
      } else if (vrInput?.hasHardwareIMU || stereoSplitRef.current) {
        vrRig?.position.set(0, 1.35, 3.3);
        cam?.position.set(0, 0, 0);
        vrInput?.recenterForward();
      } else {
        vrRig?.position.set(0, 0, 0);
        cam?.position.set(0, 2.1, 4.1);
        controls?.target.set(0, -0.15, 0);
      }
      syncCameraAspect(stereoSplitRef.current, 'tabletop');
      return;
    }

    // First-Person Cosmic VR Mode
    if (tableRig) tableRig.group.visible = false;
    if (vrRig) {
      if (focusedPlanet !== 'overview') {
        const mesh = planetMeshesRef.current.get(focusedPlanet);
        if (mesh) {
          mesh.getWorldPosition(_targetLookAt);
          vrRig.position.copy(_targetLookAt).add(new THREE.Vector3(0, 1.8, 7.5));
        } else {
          vrRig.position.set(0, 3.2, 22);
        }
      } else {
        vrRig.position.set(0, 3.2, 22);
      }
    }
    cam?.position.set(0, 0, 0);
    vrInput?.recenterForward();
    syncCameraAspect(stereoSplitRef.current, 'first-person');
  };

  const handleToggleStereoSplit = () => {
    soundEffects.playClick();
    const nextStereo = !stereoSplitRef.current;
    stereoSplitRef.current = nextStereo;
    setStereoSplit(nextStereo);

    let activeMode = vrModeRef.current;
    if (nextStereo && activeMode === 'off') {
      activeMode = 'first-person';
      handleSetVrMode('first-person');
      return;
    }

    if (activeMode === 'tabletop') {
      if (nextStereo || vrInputRef.current?.hasHardwareIMU) {
        vrRigRef.current?.position.set(0, 1.35, 3.3);
        cameraRef.current?.position.set(0, 0, 0);
        vrInputRef.current?.recenterForward();
      } else if (!xrSessionRef.current) {
        vrRigRef.current?.position.set(0, 0, 0);
        cameraRef.current?.position.set(0, 2.1, 4.1);
        controlsRef.current?.target.set(0, -0.15, 0);
      }
    }
    syncCameraAspect(nextStereo, activeMode);
  };

  const handleLaunchWebXR = async () => {
    soundEffects.playWarp();
    const renderer = rendererRef.current;
    if (!renderer) return;

    if (xrSessionRef.current) {
      try {
        await xrSessionRef.current.end?.();
      } catch {
        // ignore session close error
      }
      xrSessionRef.current = null;
      setWebxrActive(false);
      return;
    }

    const targetMode: VrExperienceMode = vrModeRef.current === 'off' ? 'tabletop' : vrModeRef.current;
    if (vrModeRef.current === 'off') {
      handleSetVrMode(targetMode);
    }

    const session = await startWebXRVRSession(renderer, () => {
      xrSessionRef.current = null;
      setWebxrActive(false);
    });
    if (session) {
      xrSessionRef.current = session;
      setWebxrActive(true);
      if (targetMode === 'tabletop') {
        vrRigRef.current?.position.set(0, 0, 2.8);
      } else {
        vrRigRef.current?.position.set(0, 1.8, 22);
      }
      cameraRef.current?.position.set(0, 0, 0);
    }
  };

  const handleVrRecenter = () => {
    soundEffects.playClick();
    vrInputRef.current?.recenterForward();
  };

  const handleVrPointerLock = () => {
    soundEffects.playClick();
    if (vrModeRef.current === 'off') {
      handleSetVrMode('first-person');
    }
    vrInputRef.current?.requestPointerLock();
  };

  const handleLaunchMeteoroid = () => {
    if (!physicsRef.current || !cameraRef.current) return;
    soundEffects.playDebrisLaunch();
    if (simSpeedRef.current === 0) {
      handleSetSpeed(1);
    }

    const targetMesh =
      focusedPlanet !== 'overview' && focusedPlanet in PLANETS_DATA
        ? planetMeshesRef.current.get(focusedPlanet)
        : planetMeshesRef.current.get('earth');

    const targetPos = new THREE.Vector3(10, 0, 0);
    if (targetMesh) {
      targetMesh.getWorldPosition(targetPos);
      celestialGroupRef.current?.worldToLocal(targetPos);
    }

    // Launch from elevated perimeter vector toward target's forward orbital path
    const offsetAngle = Math.atan2(targetPos.z, targetPos.x) + (Math.random() - 0.5) * 0.7;
    const distOut = Math.max(14, targetPos.length() + 9.5);
    const origin = new THREE.Vector3(
      Math.cos(offsetAngle) * distOut,
      (Math.random() - 0.5) * 2.2,
      Math.sin(offsetAngle) * distOut,
    );

    physicsRef.current.launchMeteoroid(origin, targetPos, 1.05);
    setDebrisCount(physicsRef.current.getStats().debrisCount);
  };

  const handleSpawnDebrisSwarm = () => {
    if (!physicsRef.current) return;
    soundEffects.playDebrisLaunch();
    if (simSpeedRef.current === 0) {
      handleSetSpeed(1);
    }
    physicsRef.current.seedOrbitalDebris(10);
    setDebrisCount(physicsRef.current.getStats().debrisCount);
  };

  const handleResetPhysics = () => {
    soundEffects.playClick();
    setGravityMode('kepler');
    setGravityScale(1.0);
    physicsRef.current?.setGravityScale(1.0);
    physicsRef.current?.resetAll(22);

    // Restore planet & craft transforms cleanly
    ORDERED_PLANETS.forEach(planetId => {
      const pMesh = planetMeshesRef.current.get(planetId);
      if (pMesh && pMesh.userData) {
        const r = pMesh.userData.orbitRadius;
        const a = pMesh.userData.angle;
        pMesh.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      }
    });
    const saturnV = planetMeshesRef.current.get('saturn-v');
    saturnV?.position.set(16, 2.2, -13);
    const sls = planetMeshesRef.current.get('sls');
    sls?.position.set(19, -1.8, 15);
    const voyager = planetMeshesRef.current.get('voyager');
    voyager?.position.set(44, 7, -40);

    setCollisionCount(0);
    setRecentCollision(null);
    setDebrisCount(22);
  };

  const currentObjName =
    focusedPlanet === 'overview'
      ? 'All Celestial Objects'
      : focusedPlanet in PLANETS_DATA
      ? PLANETS_DATA[focusedPlanet as PlanetId].name
      : focusedPlanet in SPACECRAFTS_DATA
      ? SPACECRAFTS_DATA[focusedPlanet as SpacecraftId]?.name
      : GALAXIES_DATA[focusedPlanet as GalaxyId]?.name;

  const activeGradeTheme = COLOR_GRADE_THEMES[colorGradePreset];

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] overflow-hidden bg-slate-950 select-none">
      {/* 3D WebGL Canvas Container with multi-touch gestures */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Live 2-Second Holographic Acquisition Reticle (tracks moving 3D objects in real time) */}
      {hoverReticle && !hologramActiveId && (
        <div
          className="fixed pointer-events-none z-30 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
          style={{ left: hoverReticle.screenX, top: hoverReticle.screenY }}
        >
          {/* SVG Circular Radial Dwell Progress Ring */}
          <div className="relative w-16 h-16 flex items-center justify-center">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
              <circle
                cx="32"
                cy="32"
                r="26"
                fill="none"
                stroke="rgba(148,163,184,0.22)"
                strokeWidth="2"
              />
              <circle
                cx="32"
                cy="32"
                r="26"
                fill="none"
                stroke={activeGradeTheme.accentHex}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={163.36}
                strokeDashoffset={163.36 * (1 - hoverReticle.progress)}
              />
            </svg>
            <span
              style={{ color: activeGradeTheme.accentHex }}
              className="absolute font-mono tabular-nums text-[10px] font-bold"
            >
              {Math.round(hoverReticle.progress * 100)}%
            </span>
          </div>

          {/* Micro Acquisition Label */}
          <div
            style={{
              background: activeGradeTheme.tintCss,
              borderColor: activeGradeTheme.borderRgba,
            }}
            className="mt-1 px-2.5 py-1 rounded-lg border text-[10px] font-mono text-slate-200 whitespace-nowrap shadow-lg flex items-center gap-1.5"
          >
            <span className="font-bold text-white">{hoverReticle.name}</span>
            <span className="text-slate-500">·</span>
            <span style={{ color: activeGradeTheme.accentHex }}>
              {((1 - hoverReticle.progress) * 2).toFixed(1)}s
            </span>
          </div>
        </div>
      )}

      {/* Sci-Fi Advanced Stacks Holographic Quick-Fact Tooltip (appears after 2s hover/long-press or tap) */}
      <AnimatePresence>
        {quickTooltipAnchor && !hologramActiveId && (
          <HoloQuickTooltip
            anchor={quickTooltipAnchor}
            colorGradePreset={colorGradePreset}
            onClose={() => {
              quickTooltipIdRef.current = null;
              setQuickTooltipAnchor(null);
            }}
            onFocusObject={id => {
              focusOnObject(id);
            }}
            onOpenFullHUD={id => {
              quickTooltipIdRef.current = null;
              setQuickTooltipAnchor(null);
              setHologramActiveId(id);
            }}
            onLaunchAR={id => {
              handleLaunchAR(id as any);
            }}
          />
        )}
      </AnimatePresence>

      {/* Full Sci-Fi Hologram HUD Modal */}
      {hologramActiveId && (
        <SciFiHologramHUD
          modelId={hologramActiveId}
          onClose={() => setHologramActiveId(null)}
          onLaunchAR={(id) => handleLaunchAR(id as any)}
        />
      )}

      {/* TEACHER LECTURE PRESENTATION CONSOLE (Shown when Jump 3D Solar View is pressed) */}
      {isTeacherPresenting3D && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-2xl pointer-events-none">
          <div className="pointer-events-auto bg-slate-950/90 backdrop-blur-xl border border-indigo-500/40 rounded-2xl shadow-[0_0_35px_rgba(99,102,241,0.25)] p-4 text-slate-100 space-y-3 animate-in fade-in slide-in-from-top-4 duration-300">
            {/* Header: Slide Number, Theme & Close */}
            <div className="flex items-center justify-between border-b border-indigo-500/30 pb-2">
              <div className="flex items-center gap-2">
                <div className="px-2 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/40 text-[10px] font-mono font-bold text-indigo-300 flex items-center gap-1.5 tabular-nums">
                  <Presentation className="w-3.5 h-3.5 text-indigo-400" />
                  <span>SLIDE {safeTeacherIdx + 1} OF {teacherSlides.length}</span>
                </div>

                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[10px] font-mono font-bold">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  {currentTeacherSlide.theme === 'solar-corona'
                    ? 'CORONAL PLASMA DIVE'
                    : currentTeacherSlide.theme === 'terrestrial-survey'
                    ? 'TERRESTRIAL SURVEY'
                    : currentTeacherSlide.theme === 'asteroid-canyon'
                    ? 'ASTEROID CANYON TRANSIT'
                    : currentTeacherSlide.theme === 'gas-ring-sweep'
                    ? 'SATURN RING PLANE SWEEP'
                    : currentTeacherSlide.theme === 'ice-frontier'
                    ? 'ICE FRONTIER AXIAL SWOOP'
                    : currentTeacherSlide.theme === 'spacecraft-fleet'
                    ? 'ORBITAL FLEET RENDEZVOUS'
                    : 'DEEP COSMIC WEB MACRO ZOOM'}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleTogglePhysicsWireframe}
                  className={`px-2 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors ${
                    showPhysicsWireframe
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                  title="Overlay Cannon.js Wireframe Colliders & Gravity Vectors"
                >
                  <Box className="w-3.5 h-3.5" />
                  <span>Colliders</span>
                </button>

                <button
                  onClick={() => setIsPresentationPanelMinimized(!isPresentationPanelMinimized)}
                  className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white text-xs"
                  title={isPresentationPanelMinimized ? 'Expand Slide Notes' : 'Minimize Slide Notes'}
                >
                  {isPresentationPanelMinimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => {
                    soundEffects.playClick();
                    setIsTeacherPresenting3D(false);
                  }}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold"
                >
                  Exit Lecture
                </button>
              </div>
            </div>

            {/* Slide Title */}
            <div>
              <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                {currentTeacherSlide.title}
              </h3>
              {currentTeacherSlide.subheading && (
                <div className="text-xs text-indigo-300/90 font-mono mt-0.5">
                  {currentTeacherSlide.subheading}
                </div>
              )}
            </div>

            {/* Expandable Slide Content */}
            {!isPresentationPanelMinimized && (
              <div className="space-y-2.5 animate-in fade-in duration-150">
                {/* Custom Important Note when defined by educator */}
                {currentTeacherSlide.customImportant?.content && (
                  <div className="bg-amber-950/35 p-2.5 rounded-xl border border-amber-500/40 text-xs">
                    <span className="text-[10px] font-mono font-bold uppercase text-amber-300 block mb-0.5">
                      Important · {currentTeacherSlide.customImportant.heading}
                    </span>
                    <p className="text-amber-100 leading-relaxed">{currentTeacherSlide.customImportant.content}</p>
                  </div>
                )}

                {/* Talking Points Card */}
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                  <span className="text-[10px] font-mono font-bold uppercase text-indigo-400 block tracking-wider">
                    Educational Talking Points:
                  </span>
                  <ul className="space-y-1 text-slate-300">
                    {currentTeacherSlide.talkingPoints.slice(0, 2).map((point, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1 flex-shrink-0" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Class Question Prompt */}
                <div className="bg-indigo-950/40 p-2.5 rounded-xl border border-indigo-500/30 text-xs">
                  <span className="text-[10px] font-bold uppercase text-indigo-300 block mb-0.5">
                    Discussion Prompt:
                  </span>
                  <p className="text-slate-200 font-medium">{currentTeacherSlide.promptQuestion}</p>
                </div>
              </div>
            )}

            {/* Slide Navigation & Flyby Controls */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-xs">
              <button
                disabled={safeTeacherIdx === 0}
                onClick={() => {
                  soundEffects.playClick();
                  setTeacherSlideIndex(safeTeacherIdx - 1);
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 text-slate-300 text-xs font-semibold"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Prev Slide</span>
              </button>

              <button
                onClick={() => triggerSlidePresentation(safeTeacherIdx)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 text-white font-bold shadow-md shadow-indigo-600/25 hover:scale-105 transition-all text-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Re-fly Presentation</span>
              </button>

              <button
                disabled={safeTeacherIdx === teacherSlides.length - 1}
                onClick={() => {
                  soundEffects.playClick();
                  setTeacherSlideIndex(safeTeacherIdx + 1);
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 text-slate-300 text-xs font-semibold"
              >
                <span>Next Slide</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Minimal Exit Bar when Cardboard Stereo Split is Active */}
      {stereoSplit && vrMode !== 'off' && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/90 border border-cyan-500/40 shadow-xl">
          <button
            onClick={handleVrRecenter}
            className="text-[11px] font-semibold text-cyan-200 hover:text-white px-2 py-0.5 rounded-full bg-cyan-500/15"
          >
            Recenter
          </button>
          <button
            onPointerDown={() => {
              vrThrustRef.current = true;
            }}
            onPointerUp={() => {
              vrThrustRef.current = false;
            }}
            onPointerLeave={() => {
              vrThrustRef.current = false;
            }}
            className="text-[11px] font-semibold text-amber-200 hover:text-white px-2.5 py-0.5 rounded-full bg-amber-500/20"
          >
            Hold to Fly
          </button>
          <button
            onClick={handleToggleStereoSplit}
            className="text-[11px] font-semibold text-slate-200 hover:text-white px-2 py-0.5 rounded-full bg-slate-800"
          >
            Mono
          </button>
          <button
            onClick={() => handleSetVrMode('off')}
            className="text-[11px] font-bold text-rose-200 hover:text-white px-2 py-0.5 rounded-full bg-rose-500/25"
          >
            Exit VR
          </button>
        </div>
      )}

      {/* Top Floating Telemetry Hint & Live Collision Feed */}
      {!isTeacherPresenting3D && !stereoSplit && (
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 items-start">
          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 flex items-center gap-2 shadow-lg">
              <span className="font-semibold text-white">3D Space & Cosmos</span>
              <span className="text-slate-600" aria-hidden="true">·</span>
              <span className="text-[11px] text-slate-400">
                {vrMode === 'first-person'
                  ? 'First-Person VR: Drag / Tilt Head · WASD + Shift Fly'
                  : vrMode === 'tabletop'
                  ? 'Tabletop Diorama: Miniature Solar System Projector'
                  : 'Hover or hold 2s on any object for quick hologram'}
              </span>
            </div>

            {focusedPlanet !== 'overview' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setHologramActiveId(focusedPlanet);
                    soundEffects.playHoloActivate();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/20 border border-sky-400/50 hover:bg-sky-500/30 text-sky-200 font-bold text-xs shadow-lg transition-all hover:scale-105"
                >
                  <Scan className="w-3.5 h-3.5 text-sky-300" />
                  <span>Holo Intel</span>
                </button>

                {focusedPlanet in PLANETS_DATA && (
                  <button
                    onClick={handleInspectPlanet}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all hover:scale-105"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Deep Inspect {currentObjName}</span>
                  </button>
                )}

                <button
                  onClick={() => handleLaunchAR(focusedPlanet as any)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-semibold text-xs shadow-lg shadow-pink-600/30 transition-all hover:scale-105"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Project in AR</span>
                </button>
              </div>
            )}
          </div>

          {recentCollision && (
            <div className="px-3 py-1.5 rounded-xl bg-slate-950/90 border border-amber-500/40 text-xs flex items-center gap-2 shadow-lg">
              <Flame className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span className="font-semibold text-amber-200">
                Impact: {recentCollision.labelA} ↔ {recentCollision.labelB}
              </span>
              <span className="text-slate-500">·</span>
              <span className="font-mono text-[11px] text-sky-300 tabular-nums">
                {recentCollision.impactSpeed} km/s
              </span>
              <span className="text-slate-500">·</span>
              <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                {collisionCount} total
              </span>
            </div>
          )}
        </div>
      )}

      {/* Top Right Action Controls: VR Mode, Physics Lab, Color Grading, GPS Celestial & Audio Replay */}
      {!stereoSplit && (
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        {/* WebXR & Low-Latency Mobile/Desktop VR Mode Trigger */}
        <div className="relative">
          <button
            onClick={() => {
              soundEffects.playClick();
              setShowVrMenu(prev => !prev);
              setShowPhysicsMenu(false);
              setShowGradeMenu(false);
            }}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all shadow-lg ${
              vrMode !== 'off' || showVrMenu
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="WebXR, Mobile IMU Head-Tracking & Desktop Tabletop VR Mode"
          >
            <Glasses className="w-4 h-4 text-cyan-400" />
            <span className="hidden md:inline">
              {vrMode === 'first-person'
                ? 'VR First-Person'
                : vrMode === 'tabletop'
                ? 'VR Tabletop'
                : 'VR Mode'}
            </span>
          </button>

          {showVrMenu && (
            <div className="absolute right-0 mt-2 w-80 bg-slate-950/95 border border-slate-800 rounded-2xl p-4 z-50 space-y-3 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-300 font-bold">
                  Immersive VR & WebXR
                </span>
                <button
                  onClick={() => setShowVrMenu(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-1.5 text-xs">
                <button
                  onClick={() => {
                    handleSetVrMode('off');
                    setShowVrMenu(false);
                  }}
                  className={`w-full p-2.5 rounded-xl border text-left transition-colors ${
                    vrMode === 'off'
                      ? 'bg-sky-500/20 border-sky-400 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="font-bold flex items-center justify-between">
                    <span>Standard Orbit View</span>
                    {vrMode === 'off' && <span className="text-[10px] font-mono text-sky-300">Active</span>}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    3D planetary orbit camera with click-to-focus telemetry
                  </div>
                </button>

                <button
                  onClick={() => {
                    handleSetVrMode('tabletop');
                    setShowVrMenu(false);
                  }}
                  className={`w-full p-2.5 rounded-xl border text-left transition-colors ${
                    vrMode === 'tabletop'
                      ? 'bg-cyan-500/20 border-cyan-400 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="font-bold flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Table2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Desktop / VR Tabletop Diorama</span>
                    </span>
                    {vrMode === 'tabletop' && <span className="text-[10px] font-mono text-cyan-300">Active</span>}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Miniature solar system projected onto a holodeck observatory table
                  </div>
                </button>

                <button
                  onClick={() => {
                    handleSetVrMode('first-person');
                    setShowVrMenu(false);
                  }}
                  className={`w-full p-2.5 rounded-xl border text-left transition-colors ${
                    vrMode === 'first-person'
                      ? 'bg-emerald-500/20 border-emerald-400 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="font-bold flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                      <span>First-Person Cosmic VR</span>
                    </span>
                    {vrMode === 'first-person' && <span className="text-[10px] font-mono text-emerald-300">Active</span>}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Zero-latency IMU head-tracking & WASD / mouse-look 6-DoF flight
                  </div>
                </button>
              </div>

              <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={handleToggleStereoSplit}
                  className={`py-2 px-2.5 rounded-xl border font-semibold transition-colors ${
                    stereoSplit
                      ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  {stereoSplit ? 'Stereo Split: ON' : 'Cardboard Stereo'}
                </button>
                <button
                  onClick={handleVrPointerLock}
                  className={`py-2 px-2.5 rounded-xl border font-semibold transition-colors ${
                    vrPointerLocked
                      ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                  }`}
                  title="Lock mouse pointer for FPS-style look (Esc to release)"
                >
                  {vrPointerLocked ? 'Mouse Locked' : 'Lock Mouse-Look'}
                </button>
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-2">
                {webxrSupported ? (
                  <button
                    onClick={handleLaunchWebXR}
                    className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors ${
                      webxrActive
                        ? 'bg-rose-500 hover:bg-rose-400 text-white'
                        : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950'
                    }`}
                  >
                    <Glasses className="w-3.5 h-3.5" />
                    <span>{webxrActive ? 'Exit WebXR Headset' : 'Enter WebXR Headset (VR)'}</span>
                  </button>
                ) : (
                  <div className="text-[10px] text-slate-400 bg-slate-900/90 border border-slate-800 rounded-xl p-2 leading-relaxed">
                    Browser WebXR headset API not detected on this device; running direct zero-latency IMU & desktop 6-DoF VR engine.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Cannon.js Orbital Gravity & Collision Lab Trigger */}
        <div className="relative">
          <button
            onClick={() => {
              soundEffects.playClick();
              setShowPhysicsMenu(prev => !prev);
              setShowGradeMenu(false);
              setShowVrMenu(false);
            }}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all shadow-lg ${
              showPhysicsMenu || gravityMode === 'nbody'
                ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Cannon.js Orbital Gravity & Collision Physics"
          >
            <Atom className="w-4 h-4 text-amber-400" />
            <span className="hidden md:inline">
              {gravityMode === 'nbody' ? 'N-Body Physics' : 'Gravity & Collisions'}
            </span>
          </button>

          {showPhysicsMenu && (
            <div className="absolute right-0 mt-2 w-80 bg-slate-950/95 border border-slate-800 rounded-2xl p-4 z-50 space-y-3.5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-amber-300 font-bold">
                  Orbital Gravity & Collisions
                </span>
                <button
                  onClick={() => setShowPhysicsMenu(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <button
                  onClick={() => handleToggleGravityMode('kepler')}
                  className={`py-2 px-2.5 rounded-xl border font-semibold transition-colors ${
                    gravityMode === 'kepler'
                      ? 'bg-sky-500/20 border-sky-400 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Guided Orbits
                </button>
                <button
                  onClick={() => handleToggleGravityMode('nbody')}
                  className={`py-2 px-2.5 rounded-xl border font-semibold transition-colors ${
                    gravityMode === 'nbody'
                      ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Free N-Body
                </button>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                {gravityMode === 'nbody'
                  ? 'All planets, debris & free spacecraft move dynamically under Newtonian solar & planetary gravity.'
                  : 'Planets follow precision classroom orbits while rocky debris & launched meteoroids collide with real momentum.'}
              </p>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300">Gravity Strength</span>
                  <span className="font-mono text-amber-300 tabular-nums">{gravityScale.toFixed(1)}x G</span>
                </div>
                <input
                  type="range"
                  min={0.3}
                  max={2.5}
                  step={0.1}
                  value={gravityScale}
                  onChange={e => handleGravityScaleChange(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <button
                  onClick={handleLaunchMeteoroid}
                  className="py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Launch Meteor</span>
                </button>
                <button
                  onClick={handleSpawnDebrisSwarm}
                  className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  <span>+10 Debris</span>
                </button>
              </div>

              {/* Visual Wireframe Collider & Gravity Vectors Switch */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <button
                  onClick={handleTogglePhysicsWireframe}
                  className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-colors ${
                    showPhysicsWireframe
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Box className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Wireframe Colliders & Vectors</span>
                  </span>
                  <span className="font-mono text-[10px] uppercase">
                    {showPhysicsWireframe ? 'ON' : 'OFF'}
                  </span>
                </button>

                {showPhysicsWireframe && (
                  <div className="grid grid-cols-2 gap-1.5 px-1 text-[10px] text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-sky-400" />
                      <span>Planet / Sun Cage</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-400" />
                      <span>Spacecraft Bounds</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-300" />
                      <span>Velocity Vector</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span>Gravity Well & Pull</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px]">
                <div className="font-mono text-slate-400 tabular-nums">
                  Debris: <span className="text-white">{debrisCount}</span> · Hits:{' '}
                  <span className="text-amber-300">{collisionCount}</span>
                </div>
                <button
                  onClick={handleResetPhysics}
                  className="text-sky-300 hover:text-sky-200 font-semibold"
                >
                  Reset Orbits
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="relative">
          <button
            onClick={() => {
              soundEffects.playClick();
              setShowGradeMenu(prev => !prev);
              setShowPhysicsMenu(false);
              setShowVrMenu(false);
            }}
            className={`px-3 py-2 rounded-xl backdrop-blur-md border text-xs font-semibold flex items-center gap-1.5 transition-all shadow-lg ${
              showGradeMenu
                ? 'bg-sky-500/25 border-sky-400 text-sky-200'
                : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Cinematic Color Grading & Bloom Calibration"
          >
            <Palette className="w-4 h-4 text-sky-400" />
            <span className="hidden md:inline">{COLOR_GRADE_PRESETS[colorGradePreset].label}</span>
          </button>

          {showGradeMenu && (
            <div className="absolute right-0 mt-2 w-72 glass-panel-elevated rounded-2xl p-3.5 z-50 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-sky-300 font-bold">
                  Color Grading LUT
                </span>
                <button
                  onClick={() => setShowGradeMenu(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-1.5">
                {(Object.keys(COLOR_GRADE_PRESETS) as ColorGradePresetId[]).map(presetKey => {
                  const cfg = COLOR_GRADE_PRESETS[presetKey];
                  const active = colorGradePreset === presetKey;
                  return (
                    <button
                      key={presetKey}
                      onClick={() => {
                        soundEffects.playColorGradeShift();
                        setColorGradePreset(presetKey);
                      }}
                      className={`text-left p-2 rounded-xl border text-xs transition-all ${
                        active
                          ? 'bg-sky-500/20 border-sky-400 text-white'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="font-bold flex items-center justify-between">
                        <span>{cfg.label}</span>
                        {active && <span className="text-[10px] font-mono text-sky-300">Active</span>}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                        {cfg.description}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-1 border-t border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Celestial Bloom</span>
                  <span className="font-mono text-sky-300">{bloomIntensity.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1.35}
                  step={0.05}
                  value={bloomIntensity}
                  onChange={e => setBloomIntensity(Number(e.target.value))}
                  className="w-full accent-sky-400 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        <button
          onClick={toggleGpsSkyLock}
          className={`px-3 py-2 rounded-xl backdrop-blur-md border text-xs font-semibold flex items-center gap-1.5 transition-all shadow-lg ${
            gpsActive
              ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold shadow-emerald-500/30'
              : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="Toggle Real-World Phone GPS Celestial Alignment"
        >
          <Compass className={`w-4 h-4 ${gpsActive ? 'text-slate-950 animate-spin' : 'text-emerald-400'}`} />
          <span>{gpsActive ? 'GPS Sky Lock' : 'GPS Celestial'}</span>
        </button>

        {focusedPlanet !== 'overview' && (
          <button
            onClick={() => {
              if (focusedPlanet in PLANETS_DATA) {
                soundEffects.playPlanetSound(focusedPlanet as PlanetId);
                soundEffects.speakPlanet(focusedPlanet as PlanetId);
              } else if (focusedPlanet in SPACECRAFTS_DATA) {
                soundEffects.playSpacecraftSound(focusedPlanet as SpacecraftId);
                soundEffects.speakSpacecraft(focusedPlanet as SpacecraftId);
              } else if (focusedPlanet in GALAXIES_DATA) {
                if (focusedPlanet === 'cosmic-web' || focusedPlanet === 'observable-universe') {
                  soundEffects.playCosmicWeb();
                } else {
                  soundEffects.playGalaxySound(focusedPlanet as GalaxyId);
                }
                soundEffects.speakGalaxy(focusedPlanet as GalaxyId);
              }
            }}
            className="p-2.5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-800 text-amber-300 hover:text-white hover:bg-slate-800 transition-all shadow-lg flex items-center gap-1.5 text-xs font-semibold"
            title="Replay Audio Narration & Sound"
          >
            <Volume2 className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Play Sound</span>
          </button>
        )}

        <button
          onClick={() => focusOnObject('overview')}
          className="p-2.5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-all shadow-lg flex items-center gap-1.5 text-xs font-medium"
          title="Reset Camera Overview"
        >
          <RotateCcw className="w-4 h-4 text-sky-400" />
          <span className="hidden sm:inline">Reset View</span>
        </button>
      </div>
      )}

      {/* Compact Floating VR Cockpit HUD Strip (when VR Mode active in mono view) */}
      {vrMode !== 'off' && !stereoSplit && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 flex flex-wrap items-center justify-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-950/92 border border-cyan-500/40 shadow-2xl">
          <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-300 font-bold">
            {vrMode === 'tabletop' ? 'Tabletop VR' : 'First-Person VR'}
          </span>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <span className="text-[11px] text-slate-300">
            {vrHasImu ? 'IMU 1:1 Tracking' : vrMode === 'tabletop' ? 'Orbit Table · WASD' : 'WASD + Shift · Drag Look'}
          </span>
          {(vrMode === 'first-person' || vrHasImu) && (
            <button
              onPointerDown={() => {
                vrThrustRef.current = true;
              }}
              onPointerUp={() => {
                vrThrustRef.current = false;
              }}
              onPointerLeave={() => {
                vrThrustRef.current = false;
              }}
              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/50 text-amber-200 text-xs font-semibold transition-colors"
            >
              Hold to Fly
            </button>
          )}
          <button
            onClick={handleVrPointerLock}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            {vrPointerLocked ? 'Pointer Locked (Esc)' : 'Lock Mouse'}
          </button>
          <button
            onClick={handleVrRecenter}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-200 text-xs font-medium transition-colors"
          >
            Recenter
          </button>
          <button
            onClick={handleToggleStereoSplit}
            className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-200 text-xs font-semibold transition-colors"
          >
            Stereo Split
          </button>
          <button
            onClick={() => handleSetVrMode('off')}
            className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-rose-200 text-xs font-bold transition-colors"
          >
            Exit VR
          </button>
        </div>
      )}

      {/* GPS Celestial Alignment HUD Modal */}
      {showGpsModal && (
        <div className="absolute top-16 right-4 z-40 w-80 sm:w-96 bg-slate-900/95 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-4 shadow-2xl text-slate-100 space-y-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-emerald-400" />
                <span>GPS Celestial Sky Alignment</span>
              </h4>
            </div>
            <button
              onClick={() => setShowGpsModal(false)}
              className="p-1 rounded-full bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed">
            Aligns the 3D celestial sphere in real-time with your phone’s GPS location and Local Sidereal Time (LST).
          </p>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
              Observation Station / Presets:
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {OBSERVATORY_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => selectObservatoryPreset(preset.id)}
                  className={`text-left p-2 rounded-xl text-xs transition-all border ${
                    selectedObservatoryId === preset.id
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-semibold'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="font-bold truncate">{preset.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">{preset.region}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs pt-1">
            <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800/80">
              <span className="text-[10px] text-slate-400">Latitude</span>
              <div className="font-mono font-bold text-sky-300 text-[11px]">
                {gpsState.latitude.toFixed(3)}°
              </div>
            </div>
            <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800/80">
              <span className="text-[10px] text-slate-400">Longitude</span>
              <div className="font-mono font-bold text-amber-300 text-[11px]">
                {gpsState.longitude.toFixed(3)}°
              </div>
            </div>
            <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800/80">
              <span className="text-[10px] text-slate-400">Sidereal Time</span>
              <div className="font-mono font-bold text-emerald-300 text-[11px]">
                {gpsState.localSiderealTimeString}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-slate-400 font-mono">
              Status: {gpsActive ? 'Active Celestial Lock' : 'Standby'}
            </span>
            <button
              onClick={() => {
                const nextState = deviceLocation.toggleSkyAlignment();
                setGpsActive(nextState);
                if (nextState) soundEffects.playGpsLock();
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                gpsActive
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                  : 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
              }`}
            >
              {gpsActive ? 'Disengage Lock' : 'Engage Sky Lock'}
            </button>
          </div>
        </div>
      )}

      {/* Unified Bottom Control Dock (hidden in split-screen stereo VR) */}
      {!stereoSplit && (
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 w-[95%] max-w-4xl transition-all duration-300">
        {/* Collapse / Expand Tab */}
        <div className="flex justify-center -mb-2">
          <button
            onClick={() => setIsDockCollapsed(!isDockCollapsed)}
            className="px-4 py-1 rounded-t-lg bg-slate-900/90 border-t border-x border-slate-700/80 text-[11px] font-semibold text-slate-300 hover:text-white flex items-center gap-1 shadow-md hover:bg-slate-800 transition-all"
          >
            {isDockCollapsed ? (
              <>
                <ChevronUp className="w-3 h-3 text-sky-400" />
                <span>Show Space Flight Controls</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3 text-sky-400" />
                <span>Hide Controls (Cinema Mode)</span>
              </>
            )}
          </button>
        </div>

        {!isDockCollapsed && (
          <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-2xl space-y-3">
            {/* Top row: Category Selector Tabs */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                <button
                  onClick={() => {
                    soundEffects.playClick();
                    setActiveCategory('planets');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    activeCategory === 'planets'
                      ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Orbit className="w-3.5 h-3.5" />
                  <span>Planets & Sun</span>
                </button>

                <button
                  onClick={() => {
                    soundEffects.playClick();
                    setActiveCategory('spacecraft');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    activeCategory === 'spacecraft'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Satellite className="w-3.5 h-3.5" />
                  <span>Satellites & Fleet</span>
                </button>

                <button
                  onClick={() => {
                    soundEffects.playClick();
                    setActiveCategory('galaxies');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    activeCategory === 'galaxies'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Galaxies & Universe</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {focusedPlanet !== 'overview' && (
                  <button
                    onClick={() => {
                      setHologramActiveId(focusedPlanet);
                      soundEffects.playHoloActivate();
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/20 border border-sky-400/40 text-sky-300 font-bold text-xs hover:bg-sky-500/30 transition-all"
                  >
                    <Scan className="w-3 h-3 text-sky-400" />
                    <span>Sci-Fi Holo Specs</span>
                  </button>
                )}
                <div className="text-[11px] text-slate-400 hidden sm:flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Hold to scan specs</span>
                </div>
              </div>
            </div>

            {/* Jump Selector Row */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => focusOnObject('overview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  focusedPlanet === 'overview'
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                    : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                All Orbits
              </button>

              {activeCategory === 'planets' && (
                <>
                  <button
                    onClick={() => focusOnObject('sun')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      focusedPlanet === 'sun'
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'bg-slate-800/80 text-amber-300 hover:bg-slate-700'
                    }`}
                  >
                    ☀️ Sun
                  </button>

                  {ORDERED_PLANETS.map(id => {
                    const p = PLANETS_DATA[id];
                    const isSelected = focusedPlanet === id;
                    return (
                      <button
                        key={id}
                        onClick={() => focusOnObject(id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                          isSelected
                            ? 'bg-sky-500/20 text-sky-300 border border-sky-400 shadow-sm'
                            : 'bg-slate-800/60 text-slate-300 hover:text-white hover:bg-slate-700/80 border border-transparent'
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: p.color }}
                        />
                        <span>{p.name}</span>
                      </button>
                    );
                  })}
                </>
              )}

              {activeCategory === 'spacecraft' && (
                <>
                  {ORDERED_SPACECRAFT.map(sId => {
                    const sc = SPACECRAFTS_DATA[sId];
                    const isSelected = focusedPlanet === sId;
                    return (
                      <button
                        key={sId}
                        onClick={() => focusOnObject(sId)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                          isSelected
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-400 shadow-sm'
                            : 'bg-slate-800/60 text-slate-300 hover:text-white hover:bg-slate-700/80 border border-transparent'
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: sc.color }}
                        />
                        <span>{sc.name}</span>
                      </button>
                    );
                  })}
                </>
              )}

              {activeCategory === 'galaxies' && (
                <>
                  {ORDERED_GALAXIES.map(gId => {
                    const gx = GALAXIES_DATA[gId];
                    if (!gx) return null;
                    const isSelected = focusedPlanet === gId;
                    return (
                      <button
                        key={gId}
                        onClick={() => focusOnObject(gId as GalaxyId)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                          isSelected
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-400 shadow-sm'
                            : 'bg-slate-800/60 text-slate-300 hover:text-white hover:bg-slate-700/80 border border-transparent'
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: gx.accentColor }}
                        />
                        <span>{gx.name}</span>
                      </button>
                    );
                  })}
                </>
              )}
            </div>

            {/* Bottom row: Flight mechanics & simulation speeds (0x, 0.5x, 1x, 5x, 10x) */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-xs">
              <div className="flex items-center gap-1.5">
                {/* Quick Play/Pause toggle */}
                <button
                  onClick={() => handleSetSpeed(simSpeed === 0 ? 1 : 0)}
                  className={`p-1.5 rounded-lg border transition-all ${
                    simSpeed === 0
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                      : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  }`}
                  title={simSpeed === 0 ? 'Resume Orbits (1x)' : 'Pause Orbits (0x)'}
                >
                  {simSpeed === 0 ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
                </button>

                <span className="text-slate-400 font-medium mr-1">Speed:</span>
                {[
                  { label: '0x', val: 0 },
                  { label: '0.5x', val: 0.5 },
                  { label: '1x', val: 1 },
                  { label: '5x', val: 5 },
                  { label: '10x', val: 10 },
                ].map(item => (
                  <button
                    key={item.label}
                    onClick={() => handleSetSpeed(item.val)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                      simSpeed === item.val
                        ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold shadow-md shadow-sky-500/25 scale-105'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Cosmic Ambient Music Toggle */}
                <button
                  onClick={handleToggleCosmicMusic}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md border font-medium transition-all ${
                    isCosmicMusicOn
                      ? 'bg-purple-600/25 border-purple-500/60 text-purple-300 shadow-sm shadow-purple-500/30'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                  title="Toggle Procedural Cosmic Ambient Space Music"
                >
                  <Music className={`w-3.5 h-3.5 ${isCosmicMusicOn ? 'text-purple-400' : 'text-slate-400'}`} />
                  <span>{isCosmicMusicOn ? 'Cosmic Sound ON' : 'Cosmic Music'}</span>
                </button>

                {/* Gyroscope Motion Control */}
                <div className="flex items-center gap-1 bg-slate-800/90 p-0.5 rounded-lg border border-slate-700/60">
                  <button
                    onClick={toggleGyro}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                      isGyroActive
                        ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700'
                    }`}
                    title={isGyroActive ? 'Gyroscope Motion Active (Tilt phone or move mouse)' : 'Enable Gyroscope Motion'}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>{isGyroActive ? (isGyroHardware ? 'Gyro Active' : 'Virtual Gyro') : 'Gyro Mode'}</span>
                  </button>

                  {isGyroActive && (
                    <>
                      <button
                        onClick={calibrateGyro}
                        className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-700/80 text-slate-200 hover:bg-slate-600 hover:text-white"
                        title="Recenter zero reference to current phone orientation"
                      >
                        Recenter
                      </button>
                      <div className="flex items-center gap-0.5 text-[10px] text-slate-400 pl-1 border-l border-slate-700">
                        {[1, 1.5, 2].map(s => (
                          <button
                            key={s}
                            onClick={() => setGyroSensitivity(s)}
                            className={`px-1.5 py-0.5 rounded ${
                              gyroSensitivity === s ? 'bg-emerald-400 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {s}x
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Quick Launch Meteoroid */}
                <button
                  onClick={handleLaunchMeteoroid}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-semibold transition-all"
                  title="Launch Meteoroid toward focused target under Cannon.js gravity"
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Launch Meteor</span>
                </button>

                {/* Toggles */}
                <button
                  onClick={() => setShowOrbits(!showOrbits)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md border font-medium transition-all ${
                    showOrbits
                      ? 'bg-sky-500/20 border-sky-500/40 text-sky-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                  title="Toggle Planetary Orbit Rings"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Orbits</span>
                </button>

                <button
                  onClick={() => setShowGalaxies(!showGalaxies)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md border font-medium transition-all ${
                    showGalaxies
                      ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                  title="Toggle Deep Space Galaxies"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Galaxies</span>
                </button>

                <button
                  onClick={() => setShowDeepSpace(!showDeepSpace)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md border font-medium transition-all ${
                    showDeepSpace
                      ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                  title="Toggle Dynamic Starfield & Volumetric Nebulae"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Nebulae</span>
                </button>

                <button
                  onClick={handleTogglePhysicsWireframe}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md border font-medium transition-all ${
                    showPhysicsWireframe
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                  title="Toggle Cannon.js Physics Wireframe Colliders & Gravity Vectors"
                >
                  <Box className="w-3.5 h-3.5" />
                  <span>Colliders</span>
                </button>

                {focusedPlanet !== 'overview' && (
                  <button
                    onClick={() => handleLaunchAR(focusedPlanet as any)}
                    className="flex items-center gap-1 px-3 py-1 rounded-md bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-semibold transition-all shadow-md"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>View in AR</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
};

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useClassroom } from '../context/ClassroomContext';
import { PLANETS_DATA, ORDERED_PLANETS } from '../data/planetsData';
import { SPACECRAFTS_DATA, ORDERED_SPACECRAFT, SPACECRAFT_CATEGORIES } from '../data/spaceCraftData';
import { PlanetId, SpacecraftId, ArPlaceableId, SpacecraftCategory } from '../types/astronomy';
import { getPlanetTexture, getRingTexture } from '../utils/textureGenerator';
import { createSpacecraftObject } from '../utils/spaceCraftModels';
import { soundEffects } from '../utils/soundEffects';
import { WebXRAR } from '../ar/webxr-ar';
import { deviceGyro } from '../utils/deviceOrientation';
import { useGyroscope } from '../hooks/useGyroscope';

const _gyroEuler = new THREE.Euler(0, 0, 0, 'YXZ');
const _gyroQuat = new THREE.Quaternion();
import {
  Camera,
  RotateCw,
  Sliders,
  Info,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Download,
  Sparkles,
  Layers,
  RefreshCw,
  Sun,
  Maximize2,
  Minimize2,
  X,
  Scan,
  Smartphone,
  Flame,
  Orbit,
  Rocket,
  Satellite,
  Compass,
  Eye,
  Play,
  Pause,
  ChevronDown,
  ChevronUp,
  Move,
  History,
} from 'lucide-react';

const AR_ANCHOR_STORAGE_KEY = 'ar_smart_classroom_persistent_anchor_v1';

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
    setSelectedPlanetId,
    recordArPlacement,
    setCurrentView,
    markPlanetExplored,
  } = useClassroom();

  // AR Modes: 'checking' | 'webxr' | 'camera-stream' | 'unsupported'
  const [arCapability, setArCapability] = useState<'checking' | 'webxr' | 'camera-stream' | 'unsupported'>('checking');
  const [activeEngine, setActiveEngine] = useState<'webxr' | 'camera-stream'>('camera-stream');

  // Selected Model & Category
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'planet' | 'satellite' | 'rocket' | 'spacecraft'>('all');
  const [selectedModel, setSelectedModel] = useState<ArPlaceableId>('earth');

  // Device Gyroscope & Motion Tracking
  const {
    isActive: isGyroActive,
    isHardware: isGyroHardware,
    toggleGyro,
    calibrate: calibrateGyro,
  } = useGyroscope();

  const [isPlaced, setIsPlaced] = useState<boolean>(false);
  const [placedCount, setPlacedCount] = useState<number>(0);
  const [modelScale, setModelScale] = useState<number>(1.0);
  const [rotationSpeed, setRotationSpeed] = useState<number>(0.5);
  const [showFactSheet, setShowFactSheet] = useState<boolean>(false);
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [statusMessage, setStatusMessage] = useState<string>('Point camera at floor and tap to place');
  const [isPlaneDetected, setIsPlaneDetected] = useState<boolean>(false);
  const [hitTestResult, setHitTestResult] = useState<boolean | null>(null);
  const [showMoveDevicePrompt, setShowMoveDevicePrompt] = useState<boolean>(false);
  const [restoredFromSavedAnchor, setRestoredFromSavedAnchor] = useState<boolean>(false);

  // AR Shadow settings
  const [shadowsEnabled, setShadowsEnabled] = useState<boolean>(true);
  const [shadowOpacity, setShadowOpacity] = useState<number>(0.55);
  const [thrustersIgnited, setThrustersIgnited] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState<boolean>(true);
  const [isControlsExpanded, setIsControlsExpanded] = useState<boolean>(false);

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
  const webxrArInstanceRef = useRef<WebXRAR | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const thrusterFlameRef = useRef<THREE.Mesh | null>(null);
  const thrusterLightRef = useRef<THREE.PointLight | null>(null);

  // Touch Gesture Refs
  const touchStartDistRef = useRef<number | null>(null);
  const touchStartScaleRef = useRef<number>(1.0);
  const touchLastPosRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const mouseLastPosRef = useRef<{ x: number; y: number } | null>(null);

  // Helper to persist current anchor coordinates in localStorage
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
    } catch {}
  };

  // Helper to build 3D object for planets or spacecraft
  const createPlaceableObject = (id: ArPlaceableId): THREE.Group => {
    let group: THREE.Group;

    if (id === 'minisystem') {
      group = new THREE.Group();
      // Mini Sun
      const sunGeo = new THREE.SphereGeometry(0.12, 32, 32);
      const sunTex = getPlanetTexture('sun');
      const sunMat = new THREE.MeshBasicMaterial({ map: sunTex });
      const sunMesh = new THREE.Mesh(sunGeo, sunMat);
      sunMesh.castShadow = true;
      group.add(sunMesh);

      // Light from mini sun
      const miniLight = new THREE.PointLight(0xffeedd, 1.8, 3);
      miniLight.castShadow = true;
      group.add(miniLight);

      // Mini planets
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

        const pGeo = new THREE.SphereGeometry(mp.s, 24, 24);
        const pTex = getPlanetTexture(mp.id);
        const pMat = new THREE.MeshStandardMaterial({ map: pTex, roughness: 0.7, metalness: 0.1 });
        const pMesh = new THREE.Mesh(pGeo, pMat);
        pMesh.castShadow = true;
        pMesh.receiveShadow = true;
        pMesh.userData = { dist: mp.dist, speed: mp.speed, angle: Math.random() * Math.PI * 2 };
        group.add(pMesh);

        if (mp.id === 'saturn') {
          const rGeo = new THREE.RingGeometry(mp.s * 1.4, mp.s * 2.3, 32);
          rGeo.rotateX(Math.PI / 2);
          const rMat = new THREE.MeshBasicMaterial({
            map: getRingTexture('saturn'),
            side: THREE.DoubleSide,
            transparent: true,
          });
          pMesh.add(new THREE.Mesh(rGeo, rMat));
        }
      });
    } else if (id in PLANETS_DATA) {
      group = new THREE.Group();
      const pData = PLANETS_DATA[id as PlanetId];
      const radius = 0.2;
      const pGeo = new THREE.SphereGeometry(radius, 48, 48);
      const pTex = getPlanetTexture(id as PlanetId);
      const pMat = new THREE.MeshStandardMaterial({
        map: pTex,
        roughness: 0.7,
        metalness: 0.1,
      });
      const pMesh = new THREE.Mesh(pGeo, pMat);
      pMesh.rotation.z = THREE.MathUtils.degToRad(pData.tiltDegrees);
      pMesh.castShadow = true;
      pMesh.receiveShadow = true;
      group.add(pMesh);

      if (pData.hasRings) {
        const ringType = id === 'uranus' ? 'uranus' : 'saturn';
        const rGeo = new THREE.RingGeometry(radius * 1.35, radius * 2.5, 64);
        rGeo.rotateX(Math.PI / 2);
        const rTex = getRingTexture(ringType);
        const rMat = new THREE.MeshStandardMaterial({
          map: rTex,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.9,
        });
        const ringMesh = new THREE.Mesh(rGeo, rMat);
        ringMesh.castShadow = true;
        pMesh.add(ringMesh);
      }

      // Atmospheric Glow
      const glowGeo = new THREE.SphereGeometry(radius * 1.05, 32, 32);
      const glowMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(pData.accentColor),
        transparent: true,
        opacity: 0.25,
        side: THREE.BackSide,
      });
      group.add(new THREE.Mesh(glowGeo, glowMat));

      // Ground radial contact shadow
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
    } else {
      group = createSpacecraftObject(id as SpacecraftId);
    }

    group.userData.modelId = id;

    // Apply shadow casting and receiving across all child meshes
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
        } catch {}
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
          setStatusMessage('Scanning floor or desk surface...');
        }
      } catch (err) {
        console.warn('Camera stream permission denied or unavailable:', err);
        setCameraPermissionGranted(false);
        setStatusMessage('Camera access not granted. Displaying virtual AR studio mode.');
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

  // Display visual instruction card if hit-test result remains null for 3 seconds
  useEffect(() => {
    if (isPlaced || hitTestResult !== null) {
      setShowMoveDevicePrompt(false);
      return;
    }

    const timer = setTimeout(() => {
      if ((hitTestResult === null || !isPlaneDetected) && !isPlaced) {
        setShowMoveDevicePrompt(true);
        soundEffects.playScan();
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [isPlaced, hitTestResult, isPlaneDetected]);

  // Update shadow material opacity when state changes
  useEffect(() => {
    if (floorShadowMatRef.current) {
      floorShadowMatRef.current.opacity = shadowsEnabled ? shadowOpacity : 0;
      floorShadowMatRef.current.needsUpdate = true;
    }
  }, [shadowOpacity, shadowsEnabled]);

  // 3. Initialize Three.js Scene, Restore Persistent Anchor & Setup Gesture Handlers
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
    renderer.toneMappingExposure = 1.2;

    // Floor Shadow Projection
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // Realistic Lighting Rig
    const keyLight = new THREE.DirectionalLight(0xfffaed, 2.8);
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

    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x1e293b, 0.7);
    scene.add(hemiLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambientLight);

    // Real-World Floor Plane with ShadowMaterial (Shadow Receiver)
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

    // Reticle
    const reticleGeo = new THREE.RingGeometry(0.08, 0.12, 32);
    const reticleMat = new THREE.MeshBasicMaterial({
      color: 0x45e5ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const reticle = new THREE.Mesh(reticleGeo, reticleMat);
    reticle.rotation.x = -Math.PI / 2;
    reticle.position.set(0, -0.25, -0.7);
    scene.add(reticle);
    reticleMeshRef.current = reticle;

    const dotGeo = new THREE.CircleGeometry(0.02, 16);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide });
    const dot = new THREE.Mesh(dotGeo, dotMat);
    dot.position.z = 0.001;
    reticle.add(dot);

    // RESTORE SAVED PERSISTENT AR ANCHOR FROM LOCALSTORAGE
    try {
      const savedAnchorStr = localStorage.getItem(AR_ANCHOR_STORAGE_KEY);
      if (savedAnchorStr) {
        const savedAnchor: SavedArAnchor = JSON.parse(savedAnchorStr);
        if (savedAnchor && savedAnchor.modelId) {
          setSelectedModel(savedAnchor.modelId);
          setModelScale(savedAnchor.scale || 1.0);
          setRotationSpeed(savedAnchor.rotationSpeed || 0.5);

          const restoredModel = createPlaceableObject(savedAnchor.modelId);
          restoredModel.position.set(
            savedAnchor.position[0],
            savedAnchor.position[1],
            savedAnchor.position[2]
          );
          restoredModel.rotation.set(
            savedAnchor.rotation[0],
            savedAnchor.rotation[1],
            savedAnchor.rotation[2]
          );
          placedGroup.add(restoredModel);
          placedGroup.scale.set(savedAnchor.scale, savedAnchor.scale, savedAnchor.scale);

          floorShadowPlane.position.y = savedAnchor.position[1] - 0.002;
          floorShadowPlane.visible = true;
          reticle.visible = false;

          setIsPlaced(true);
          setIsPlaneDetected(true);
          setRestoredFromSavedAnchor(true);
          setStatusMessage('Restored placed 3D scene from previous session!');
        }
      }
    } catch (err) {
      console.warn('Could not restore AR anchor from localStorage:', err);
    }

    // Initialize WebXR AR if supported
    if (arCapability === 'webxr' || 'xr' in navigator) {
      try {
        const webxr = new WebXRAR(
          renderer,
          scene,
          () => createPlaceableObject(selectedModel),
          webxrButtonContainerRef.current || undefined
        );

        webxr.onHitTestResult = (hasHit: boolean) => {
          setHitTestResult(hasHit ? true : null);
          setIsPlaneDetected(hasHit);
          if (hasHit) {
            setShowMoveDevicePrompt(false);
            setStatusMessage('Real floor locked! Shadows active. Tap screen to anchor 3D asset');
          }
        };

        webxr.onPlaced = (obj) => {
          soundEffects.playSuccess();
          setIsPlaced(true);
          setIsPlaneDetected(true);
          setShowMoveDevicePrompt(false);
          setPlacedCount(prev => prev + 1);
          recordArPlacement();
          persistAnchorState(selectedModel, obj.position, obj.rotation, modelScale, rotationSpeed);
          setStatusMessage('3D Object anchored with real-world floor shadow projection!');
        };

        webxrArInstanceRef.current = webxr;

        if (webxrButtonContainerRef.current) {
          webxrButtonContainerRef.current.innerHTML = '';
          webxrButtonContainerRef.current.appendChild(webxr.button);
        }
      } catch (e) {
        console.warn('WebXR AR initialization bypassed for video passthrough:', e);
      }
    }

    // Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    const clock = new THREE.Clock();
    renderer.setAnimationLoop((time, frame) => {
      const delta = clock.getDelta();

      if (webxrArInstanceRef.current) {
        webxrArInstanceRef.current.update(frame);
      }

      // Dynamic Gyroscope orientation tracking
      const gyro = deviceGyro.getState();
      if (gyro.isActive && !renderer.xr?.isPresenting) {
        camera.position.x = THREE.MathUtils.clamp(gyro.roll * 0.45, -0.65, 0.65);
        camera.position.y = THREE.MathUtils.clamp(0.45 - gyro.pitch * 0.45, -0.2, 1.2);
        camera.lookAt(0, 0, -0.7);
        _gyroEuler.set(gyro.pitch * 0.25, gyro.yaw * 0.35, gyro.roll * 0.25, 'YXZ');
        _gyroQuat.setFromEuler(_gyroEuler);
        camera.quaternion.multiply(_gyroQuat);
      }

      if (reticle.visible) {
        const pulse = 1.0 + Math.sin(time * 0.004) * 0.08;
        reticle.scale.set(pulse, pulse, 1);
      }

      if (placedGroup.children.length > 0 && !isDraggingRef.current) {
        placedGroup.children.forEach(child => {
          if (isAnimating) {
            child.rotation.y += delta * rotationSpeed;
          }

          child.children.forEach(grandchild => {
            if (grandchild.userData.speed) {
              grandchild.userData.angle += delta * grandchild.userData.speed;
              const dist = grandchild.userData.dist;
              grandchild.position.x = Math.cos(grandchild.userData.angle) * dist;
              grandchild.position.z = Math.sin(grandchild.userData.angle) * dist;
            }
          });
        });
      }

      renderer.render(scene, camera);
    });

    return () => {
      renderer.setAnimationLoop(null);
      window.removeEventListener('resize', handleResize);
      if (webxrArInstanceRef.current) {
        webxrArInstanceRef.current.dispose();
      }
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update factory when selected model changes
  useEffect(() => {
    if (webxrArInstanceRef.current) {
      webxrArInstanceRef.current.setPlanetFactory(() => createPlaceableObject(selectedModel));
    }
  }, [selectedModel]);

  // Update scale of placed objects
  useEffect(() => {
    if (placedGroupRef.current) {
      placedGroupRef.current.scale.set(modelScale, modelScale, modelScale);
      if (isPlaced && placedGroupRef.current.children.length > 0) {
        const first = placedGroupRef.current.children[0];
        persistAnchorState(selectedModel, first.position, first.rotation, modelScale, rotationSpeed);
      }
    }
  }, [modelScale]);

  // Handle Thruster Flames
  useEffect(() => {
    if (!placedGroupRef.current) return;

    if (thrustersIgnited) {
      const fireGeo = new THREE.ConeGeometry(0.04, 0.16, 16);
      const fireMat = new THREE.MeshBasicMaterial({
        color: 0xff6600,
        transparent: true,
        opacity: 0.85,
      });
      const fireMesh = new THREE.Mesh(fireGeo, fireMat);
      fireMesh.rotation.x = Math.PI;
      fireMesh.position.y = -0.06;

      const pLight = new THREE.PointLight(0xff6600, 3, 1.5);
      pLight.position.y = -0.06;
      pLight.castShadow = true;

      fireMesh.add(pLight);
      placedGroupRef.current.add(fireMesh);
      thrusterFlameRef.current = fireMesh;
      thrusterLightRef.current = pLight;
      soundEffects.playWarp();
    } else {
      if (thrusterFlameRef.current && placedGroupRef.current) {
        placedGroupRef.current.remove(thrusterFlameRef.current);
        thrusterFlameRef.current = null;
      }
    }
  }, [thrustersIgnited]);

  // -------------------------------------------------------------
  // Touch Gestures: Pinch-to-Scale & Drag-to-Rotate for Placed Assets
  // -------------------------------------------------------------
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) return;

    if (!isPlaced) return;

    if (e.touches.length === 1) {
      touchLastPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      isDraggingRef.current = true;
    } else if (e.touches.length === 2) {
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
    if (!isPlaced || !placedGroupRef.current) return;

    // Two-finger Pinch to Scale
    if (e.touches.length === 2 && touchStartDistRef.current !== null) {
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = currentDist / touchStartDistRef.current;
      const newScale = THREE.MathUtils.clamp(touchStartScaleRef.current * factor, 0.25, 4.0);
      setModelScale(parseFloat(newScale.toFixed(2)));
      return;
    }

    // Single-finger Drag to Rotate around Y and slight tilt on X
    if (e.touches.length === 1 && touchLastPosRef.current) {
      const deltaX = e.touches[0].clientX - touchLastPosRef.current.x;
      const deltaY = e.touches[0].clientY - touchLastPosRef.current.y;

      placedGroupRef.current.rotation.y += deltaX * 0.015;
      placedGroupRef.current.rotation.x = THREE.MathUtils.clamp(
        placedGroupRef.current.rotation.x + deltaY * 0.005,
        -0.5,
        0.5
      );

      touchLastPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    touchLastPosRef.current = null;
    touchStartDistRef.current = null;

    // Persist updated rotation and scale to localStorage
    if (placedGroupRef.current && placedGroupRef.current.children.length > 0) {
      const first = placedGroupRef.current.children[0];
      persistAnchorState(selectedModel, first.position, placedGroupRef.current.rotation, modelScale, rotationSpeed);
    }
  };

  // Mouse drag support for desktop/simulator
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) return;

    if (isPlaced) {
      mouseLastPosRef.current = { x: e.clientX, y: e.clientY };
      isDraggingRef.current = true;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPlaced && isDraggingRef.current && mouseLastPosRef.current && placedGroupRef.current) {
      const deltaX = e.clientX - mouseLastPosRef.current.x;
      placedGroupRef.current.rotation.y += deltaX * 0.015;
      mouseLastPosRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    mouseLastPosRef.current = null;
    if (isPlaced && placedGroupRef.current && placedGroupRef.current.children.length > 0) {
      const first = placedGroupRef.current.children[0];
      persistAnchorState(selectedModel, first.position, placedGroupRef.current.rotation, modelScale, rotationSpeed);
    }
  };

  // Wheel to scale model
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!isPlaced) return;
    const delta = e.deltaY < 0 ? 0.05 : -0.05;
    setModelScale(prev => THREE.MathUtils.clamp(parseFloat((prev + delta).toFixed(2)), 0.3, 4.0));
  };

  // Tap-to-Place on Screen
  const handleTapToPlace = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) return;

    // If already placed, clicks don't re-anchor unless clicking reposition
    if (isPlaced) return;

    soundEffects.playWarp();

    if (!sceneRef.current || !placedGroupRef.current || !reticleMeshRef.current) return;

    placedGroupRef.current.clear();

    const newModel = createPlaceableObject(selectedModel);
    newModel.position.copy(reticleMeshRef.current.position);
    placedGroupRef.current.add(newModel);

    if (floorShadowPlaneRef.current) {
      floorShadowPlaneRef.current.position.y = newModel.position.y - 0.002;
      floorShadowPlaneRef.current.visible = true;
    }

    setIsPlaced(true);
    setIsPlaneDetected(true);
    setShowMoveDevicePrompt(false);
    setPlacedCount(prev => prev + 1);
    reticleMeshRef.current.visible = false;

    // Persist Anchor to localStorage
    persistAnchorState(selectedModel, newModel.position, newModel.rotation, modelScale, rotationSpeed);

    const modelName =
      selectedModel === 'minisystem'
        ? 'Mini Solar System'
        : selectedModel in PLANETS_DATA
        ? PLANETS_DATA[selectedModel as PlanetId].name
        : SPACECRAFTS_DATA[selectedModel as SpacecraftId].name;

    setStatusMessage(`${modelName} anchored with floor shadow! Touch & drag to rotate, pinch to scale.`);
    recordArPlacement();

    if (selectedModel in PLANETS_DATA) {
      markPlanetExplored(selectedModel as PlanetId);
      soundEffects.playPlanetSound(selectedModel as PlanetId);
      soundEffects.speakPlanet(selectedModel as PlanetId);
    } else if (selectedModel in SPACECRAFTS_DATA) {
      soundEffects.playSpacecraftSound(selectedModel as SpacecraftId);
      soundEffects.speakSpacecraft(selectedModel as SpacecraftId);
    }
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
    } catch {}

    setIsPlaced(false);
    setRestoredFromSavedAnchor(false);
    setHitTestResult(null);
    setIsPlaneDetected(false);
    setShowMoveDevicePrompt(false);
    setThrustersIgnited(false);
    setStatusMessage('Scanning floor or desk surface...');
  };

  const toggleCameraFacing = () => {
    soundEffects.playClick();
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Capture AR Photo
  const captureArSnapshot = () => {
    soundEffects.playSuccess();
    const video = videoRef.current;
    const renderer = rendererRef.current;
    if (!renderer) return;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 1280;
    exportCanvas.height = 720;
    const ctx = exportCanvas.getContext('2d')!;

    if (video && video.readyState >= 2) {
      ctx.drawImage(video, 0, 0, exportCanvas.width, exportCanvas.height);
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, exportCanvas.height);
      grad.addColorStop(0, '#050714');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    }

    ctx.drawImage(renderer.domElement, 0, 0, exportCanvas.width, exportCanvas.height);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.roundRect(24, exportCanvas.height - 76, 420, 52, 14);
    ctx.fill();

    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('AR Smart Classroom • Grounded WebAR', 40, exportCanvas.height - 46);

    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#94a3b8';
    const name =
      selectedModel === 'minisystem'
        ? 'Mini Solar System'
        : selectedModel in PLANETS_DATA
        ? PLANETS_DATA[selectedModel as PlanetId].name
        : SPACECRAFTS_DATA[selectedModel as SpacecraftId].name;
    const sub =
      selectedModel in SPACECRAFTS_DATA
        ? `${SPACECRAFTS_DATA[selectedModel as SpacecraftId].agency} • Floor Shadow Active`
        : 'Physical Floor Shadow Active';
    ctx.fillText(`${name} | ${sub}`, 40, exportCanvas.height - 28);

    const link = document.createElement('a');
    link.download = `AR-Grounded-${selectedModel}-${Date.now()}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
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
      filteredModels.push({
        id: sId,
        name: sc.name,
        category: 'satellite',
        color: sc.color,
        badge: 'Satellite',
      });
    });
  }

  if (selectedCategory === 'all' || selectedCategory === 'rocket') {
    ORDERED_SPACECRAFT.filter(sId => SPACECRAFTS_DATA[sId].category === 'rocket').forEach(sId => {
      const sc = SPACECRAFTS_DATA[sId];
      filteredModels.push({
        id: sId,
        name: sc.name,
        category: 'rocket',
        color: sc.color,
        badge: 'Rocket',
      });
    });
  }

  if (selectedCategory === 'all' || selectedCategory === 'spacecraft') {
    ORDERED_SPACECRAFT.filter(sId => SPACECRAFTS_DATA[sId].category === 'spacecraft').forEach(sId => {
      const sc = SPACECRAFTS_DATA[sId];
      filteredModels.push({
        id: sId,
        name: sc.name,
        category: 'spacecraft',
        color: sc.color,
        badge: 'Spacecraft',
      });
    });
  }

  const isPlanet = selectedModel in PLANETS_DATA;
  const isSpacecraft = selectedModel in SPACECRAFTS_DATA;
  const currentPlanetInfo = isPlanet ? PLANETS_DATA[selectedModel as PlanetId] : null;
  const currentSpacecraftInfo = isSpacecraft ? SPACECRAFTS_DATA[selectedModel as SpacecraftId] : null;

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] overflow-hidden bg-slate-950 select-none">
      {/* 1. Real Camera Video Background Feed */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
          cameraPermissionGranted ? 'opacity-100' : 'opacity-20'
        }`}
      />

      {!cameraPermissionGranted && (
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/40 via-slate-950/80 to-slate-950 pointer-events-none" />
      )}

      {/* 2. Transparent Three.js WebGL Canvas Overlay with Touch & Gesture Handlers */}
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
        className="absolute inset-0 w-full h-full cursor-crosshair z-10 touch-none"
      />

      {/* 3. Top Floating Navigation & Persistent Anchor Status */}
      <div className="absolute top-3 inset-x-3 sm:inset-x-6 z-20 flex items-center justify-between pointer-events-none">
        <button
          onClick={() => {
            soundEffects.playClick();
            setCurrentView('solarSystem');
          }}
          className="pointer-events-auto flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-800 transition-all shadow-lg text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4 text-sky-400" />
          <span>Exit to Lesson</span>
        </button>

        {/* Persistence Indicator / Shadow Status */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 backdrop-blur-md border border-slate-700 text-xs font-medium text-slate-200 shadow-lg">
          {restoredFromSavedAnchor ? (
            <>
              <History className="w-3.5 h-3.5 text-emerald-400" />
              <span>Scene Restored from Previous Session</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Floor Shadow Projection Active</span>
            </>
          )}
        </div>

        {/* Top-right action buttons */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Gyroscope Motion Mode */}
          <button
            onClick={toggleGyro}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all shadow-lg ${
              isGyroActive
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold shadow-emerald-500/20'
                : 'bg-slate-900/90 backdrop-blur-md border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title={isGyroActive ? 'Gyroscope Tracking Active (Tilt phone to view model)' : 'Enable Gyroscope Motion'}
          >
            <Smartphone className="w-4 h-4" />
            <span className="hidden sm:inline">{isGyroActive ? (isGyroHardware ? 'Gyro Active' : 'Virtual Gyro') : 'Gyro Mode'}</span>
          </button>

          {isGyroActive && (
            <button
              onClick={calibrateGyro}
              className="px-2.5 py-2 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold shadow-lg"
              title="Recenter Gyroscope Reference"
            >
              Recenter
            </button>
          )}

          <button
            onClick={toggleCameraFacing}
            className="p-2 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-800 transition-all shadow-lg"
            title="Switch Front/Back Camera"
          >
            <RefreshCw className="w-4 h-4 text-sky-400" />
          </button>

          <button
            onClick={captureArSnapshot}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-semibold text-xs shadow-lg shadow-pink-600/30 transition-all hover:scale-105"
            title="Capture AR Photo"
          >
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">Take Photo</span>
          </button>
        </div>
      </div>

      {/* 4. Native WebXR Button Mount Container */}
      <div
        id="ar-container"
        ref={webxrButtonContainerRef}
        className="absolute top-14 left-1/2 -translate-x-1/2 z-20 pointer-events-auto"
      />

      {/* 5. Category Selector & Models Horizontal Shelf */}
      <div className="absolute top-24 sm:top-20 inset-x-3 sm:inset-x-6 z-20 flex flex-col items-center gap-2 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-1 p-1 rounded-2xl bg-slate-950/85 backdrop-blur-xl border border-slate-800 shadow-xl overflow-x-auto max-w-full">
          <button
            onClick={() => {
              soundEffects.playClick();
              setSelectedCategory('all');
            }}
            className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === 'all'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Assets
          </button>
          <button
            onClick={() => {
              soundEffects.playClick();
              setSelectedCategory('planet');
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === 'planet'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Orbit className="w-3.5 h-3.5" />
            <span>Planets</span>
          </button>
          <button
            onClick={() => {
              soundEffects.playClick();
              setSelectedCategory('satellite');
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === 'satellite'
                ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Satellite className="w-3.5 h-3.5" />
            <span>Satellites</span>
          </button>
          <button
            onClick={() => {
              soundEffects.playClick();
              setSelectedCategory('rocket');
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === 'rocket'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Rocket className="w-3.5 h-3.5" />
            <span>Rockets</span>
          </button>
          <button
            onClick={() => {
              soundEffects.playClick();
              setSelectedCategory('spacecraft');
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === 'spacecraft'
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Spacecraft</span>
          </button>
        </div>

        {/* Model Selection Carousel */}
        <div className="pointer-events-auto flex items-center gap-1.5 overflow-x-auto p-1.5 rounded-2xl bg-slate-900/90 backdrop-blur-xl border border-slate-800 shadow-2xl max-w-3xl scrollbar-none">
          {filteredModels.map(item => {
            const isSelected = selectedModel === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  soundEffects.playClick();
                  setSelectedModel(item.id);
                  if (isPlaced) handleResetPlacement();
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-sky-500 text-white font-bold shadow-md shadow-sky-500/30 scale-105'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800 font-medium'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span>{item.name}</span>
                {item.badge && (
                  <span
                    className={`text-[9px] px-1 py-0.2 rounded font-normal ${
                      isSelected ? 'bg-sky-700/60 text-sky-100' : 'bg-slate-800 text-slate-400'
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

      {/* Touch Gesture Guidance Floating Banner when Placed */}
      {isPlaced && (
        <div className="absolute top-44 sm:top-36 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/85 backdrop-blur-md border border-slate-700/80 text-[11px] text-slate-300 shadow-lg">
            <Move className="w-3 h-3 text-sky-400" />
            <span>Touch & drag to rotate • Pinch to scale</span>
          </div>
        </div>
      )}

      {/* Visual scanning instruction card if floor not yet detected */}
      {showMoveDevicePrompt && !isPlaced && (
        <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 max-w-sm sm:max-w-md mx-auto z-40 pointer-events-auto animate-in fade-in zoom-in-95 duration-300">
          <div className="relative overflow-hidden bg-slate-900/95 backdrop-blur-2xl border-2 border-sky-400/80 rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 font-semibold border border-sky-500/30">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                <span>Floor Surface & Shadow Detection</span>
              </span>

              <button
                onClick={() => {
                  soundEffects.playClick();
                  setShowMoveDevicePrompt(false);
                }}
                className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Dismiss Guidance"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                Move device gently to scan the floor
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-xs mx-auto">
                Aim toward a flat floor or desk in good lighting. Real-time shadows will ground your 3D asset as soon as it's anchored!
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-2.5">
              <button
                onClick={() => {
                  soundEffects.playClick();
                  setHitTestResult(true);
                  setIsPlaneDetected(true);
                  setShowMoveDevicePrompt(false);
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
              >
                Dismiss
              </button>

              <button
                onClick={(e) => {
                  handleTapToPlace(e as any);
                  setShowMoveDevicePrompt(false);
                }}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg shadow-sky-600/30 transition-all hover:scale-105"
              >
                Anchor Model Here
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Learning Facts Sheet Modal */}
      {showFactSheet && (
        <div className="absolute bottom-28 inset-x-4 sm:inset-x-auto sm:right-6 sm:w-96 z-40 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-3xl p-5 shadow-2xl text-slate-100 space-y-3 animate-in fade-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-sky-500/20 text-sky-300">
                {currentPlanetInfo ? currentPlanetInfo.type : currentSpacecraftInfo?.category}
              </span>
              <h3 className="text-xl font-extrabold text-white mt-1">
                {currentPlanetInfo?.name || currentSpacecraftInfo?.name}
              </h3>
            </div>
            <button
              onClick={() => setShowFactSheet(false)}
              className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {currentPlanetInfo?.overview || currentSpacecraftInfo?.description}
          </p>

          {currentPlanetInfo && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-950/60 p-2 rounded-xl">
                <span className="text-slate-400 text-[10px]">Diameter</span>
                <div className="font-bold text-white">{currentPlanetInfo.diameterKm.toLocaleString()} km</div>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-xl">
                <span className="text-slate-400 text-[10px]">Gravity</span>
                <div className="font-bold text-amber-300">{currentPlanetInfo.surfaceGravityMs2} m/s²</div>
              </div>
            </div>
          )}

          {currentSpacecraftInfo && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-950/60 p-2 rounded-xl">
                <span className="text-slate-400 text-[10px]">Agency</span>
                <div className="font-bold text-sky-300 truncate">{currentSpacecraftInfo.agency}</div>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-xl">
                <span className="text-slate-400 text-[10px]">Top Speed</span>
                <div className="font-bold text-amber-300">{currentSpacecraftInfo.maxSpeed}</div>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-xl col-span-2">
                <span className="text-slate-400 text-[10px]">Dimensions</span>
                <div className="font-bold text-white">{currentSpacecraftInfo.dimensions}</div>
              </div>
            </div>
          )}

          <div className="bg-slate-950/60 p-2.5 rounded-xl text-xs space-y-1">
            <span className="text-[10px] text-amber-400 font-bold uppercase">Did You Know?</span>
            <p className="text-slate-300 text-[11px]">
              {currentPlanetInfo?.funFacts[0] || currentSpacecraftInfo?.funFacts[0]}
            </p>
          </div>
        </div>
      )}

      {/* Bottom Collapsible Flight Dock with Shadow Controls */}
      <div className="absolute bottom-4 inset-x-3 sm:inset-x-6 z-30 flex justify-center pointer-events-none">
        <div className="pointer-events-auto w-full max-w-xl bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-2xl space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              {isPlaced ? (
                <button
                  onClick={handleResetPlacement}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-all border border-slate-700"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
                  <span>Reposition</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 text-amber-300 font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>
                    Tap floor to anchor{' '}
                    {selectedModel === 'minisystem'
                      ? 'Solar System'
                      : selectedModel in PLANETS_DATA
                      ? PLANETS_DATA[selectedModel as PlanetId].name
                      : SPACECRAFTS_DATA[selectedModel as SpacecraftId].name}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isSpacecraft && (
                <button
                  onClick={() => {
                    soundEffects.playClick();
                    setThrustersIgnited(!thrustersIgnited);
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-semibold text-xs transition-all ${
                    thrustersIgnited
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/30'
                      : 'bg-slate-800 text-amber-300 hover:bg-slate-700 border border-slate-700'
                  }`}
                  title="Toggle Engine Thrusters Flame"
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Ignition</span>
                </button>
              )}

              <button
                onClick={() => {
                  soundEffects.playClick();
                  setShowFactSheet(!showFactSheet);
                }}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-semibold text-xs transition-all ${
                  showFactSheet
                    ? 'bg-sky-500 text-white'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                <Info className="w-3.5 h-3.5 text-sky-400" />
                <span>Specs</span>
              </button>

              <button
                onClick={() => setIsControlsExpanded(!isControlsExpanded)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
                title="Expand Shadow & Scale Settings"
              >
                {isControlsExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Sliders Row: Scale & Rotation */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800 text-xs">
            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Model Scale</span>
                <span className="font-semibold text-sky-300">{Math.round(modelScale * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.3"
                max="3.0"
                step="0.1"
                value={modelScale}
                onChange={e => setModelScale(parseFloat(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Rotation Speed</span>
                <span className="font-semibold text-sky-300">{rotationSpeed.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0"
                max="2.0"
                step="0.2"
                value={rotationSpeed}
                onChange={e => setRotationSpeed(parseFloat(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>
          </div>

          {/* Advanced Real-World Floor Shadow Controls */}
          {isControlsExpanded && (
            <div className="pt-2 border-t border-slate-800/80 space-y-2 text-xs animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  Floor Shadow Intensity
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShadowsEnabled(!shadowsEnabled)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      shadowsEnabled ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {shadowsEnabled ? 'Shadows ON' : 'Shadows OFF'}
                  </button>
                  <span className="font-semibold text-amber-300">{Math.round(shadowOpacity * 100)}%</span>
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
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { useClassroom } from '../context/ClassroomContext';
import { PLANETS_DATA, ORDERED_PLANETS } from '../data/planetsData';
import { SPACECRAFTS_DATA, ORDERED_SPACECRAFT } from '../data/spaceCraftData';
import { PlanetId, SpacecraftId, ArPlaceableId } from '../types/astronomy';
import { getPlanetTexture, getRingTexture } from '../utils/textureGenerator';
import { createSpacecraftObject } from '../utils/spaceCraftModels';
import { soundEffects } from '../utils/soundEffects';
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
} from 'lucide-react';
import { deviceGyro } from '../utils/deviceOrientation';
import { useGyroscope } from '../hooks/useGyroscope';

// Pre-allocated reusable math vectors & quaternions
const _tempVec = new THREE.Vector3();
const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();
const _gyroEuler = new THREE.Euler(0, 0, 0, 'YXZ');
const _gyroQuat = new THREE.Quaternion();

export const SolarSystemView: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const {
    setSelectedPlanetId,
    setCurrentView,
    markPlanetExplored,
    soundEnabled,
    toggleSound,
  } = useClassroom();

  // Dock state
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'planets' | 'spacecraft'>('planets');
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [showOrbits, setShowOrbits] = useState<boolean>(true);
  const [showSpacecraft, setShowSpacecraft] = useState<boolean>(true);
  const [focusedPlanet, setFocusedPlanet] = useState<PlanetId | 'overview' | SpacecraftId>('overview');

  // Device Gyroscope & Motion Tracking
  const {
    isActive: isGyroActive,
    isHardware: isGyroHardware,
    toggleGyro,
    calibrate: calibrateGyro,
    sensitivity: gyroSensitivity,
    setSensitivity: setGyroSensitivity,
  } = useGyroscope();

  // Three.js refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const planetMeshesRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const orbitLinesRef = useRef<THREE.Group | null>(null);
  const spacecraftGroupRef = useRef<THREE.Group | null>(null);
  const animationFrameRef = useRef<number>(0);

  // Focus transition animation flag
  const isTransitioningRef = useRef(false);

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
    scene.background = new THREE.Color(0x050711);
    scene.fog = new THREE.FogExp2(0x050711, 0.007);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 32, 60);
    cameraRef.current = camera;

    // 3. Renderer with soft shadows
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // 4. Room Environment for PBR reflection
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.05;
    controls.minDistance = 3;
    controls.maxDistance = 180;
    controls.maxPolarAngle = Math.PI / 2 + 0.15;
    controlsRef.current = controls;

    controls.addEventListener('start', () => {
      isTransitioningRef.current = false;
    });

    // 6. Lighting
    const sunLight = new THREE.PointLight(0xfffaed, 2.8, 300, 0.4);
    sunLight.position.set(0, 0, 0);
    sunLight.castShadow = true;
    scene.add(sunLight);

    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.5);
    scene.add(hemiLight);

    // 7. Background Starfield
    const starCount = isSoftwareGl ? 800 : 2500;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPos[i] = (Math.random() - 0.5) * 500;
      starPos[i + 1] = (Math.random() - 0.5) * 500;
      starPos[i + 2] = (Math.random() - 0.5) * 500;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.8,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.85,
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // 8. The Sun
    const sunGeo = new THREE.SphereGeometry(PLANETS_DATA.sun.scale3D, 32, 32);
    const sunTex = getPlanetTexture('sun');
    const sunMat = new THREE.MeshBasicMaterial({
      map: sunTex,
      color: 0xffeedd,
    });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.userData = { id: 'sun', name: 'The Sun', type: 'planet' };
    scene.add(sunMesh);
    planetMeshesRef.current.set('sun', sunMesh);

    // Sun atmospheric glow mesh
    const glowGeo = new THREE.SphereGeometry(PLANETS_DATA.sun.scale3D * 1.25, 24, 24);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.2,
      side: THREE.BackSide,
    });
    const sunGlow = new THREE.Mesh(glowGeo, glowMat);
    sunMesh.add(sunGlow);

    // 9. Asteroid Belt
    const asteroidCount = isSoftwareGl ? 300 : 900;
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
    scene.add(asteroidBelt);

    // 10. Orbits Group & Planets Group
    const orbitLines = new THREE.Group();
    orbitLinesRef.current = orbitLines;
    scene.add(orbitLines);

    ORDERED_PLANETS.forEach(planetId => {
      const pData = PLANETS_DATA[planetId];

      // Orbit circle line
      const orbitCurve = new THREE.EllipseCurve(0, 0, pData.orbitRadius3D, pData.orbitRadius3D, 0, 2 * Math.PI, false, 0);
      const orbitPoints = orbitCurve.getPoints(100);
      const orbitGeo = new THREE.BufferGeometry().setFromPoints(
        orbitPoints.map(p => new THREE.Vector3(p.x, 0, p.y))
      );
      const orbitMat = new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.22,
      });
      const orbitLine = new THREE.Line(orbitGeo, orbitMat);
      orbitLines.add(orbitLine);

      // Planet Mesh
      const pGeo = new THREE.SphereGeometry(pData.scale3D, 32, 32);
      const pTex = getPlanetTexture(planetId);
      const pMat = new THREE.MeshStandardMaterial({
        map: pTex,
        roughness: 0.7,
        metalness: 0.1,
      });
      const pMesh = new THREE.Mesh(pGeo, pMat);
      pMesh.rotation.z = THREE.MathUtils.degToRad(pData.tiltDegrees);
      pMesh.userData = {
        id: planetId,
        type: 'planet',
        orbitRadius: pData.orbitRadius3D,
        orbitSpeed: pData.orbitSpeed3D,
        angle: Math.random() * Math.PI * 2,
      };
      pMesh.castShadow = true;
      pMesh.receiveShadow = true;
      scene.add(pMesh);
      planetMeshesRef.current.set(planetId, pMesh);

      // Rings for Saturn or Uranus
      if (planetId === 'saturn' || planetId === 'uranus') {
        const innerR = pData.scale3D * 1.4;
        const outerR = pData.scale3D * 2.5;
        const ringGeo = new THREE.RingGeometry(innerR, outerR, 64);
        ringGeo.rotateX(Math.PI / 2);
        const ringTex = getRingTexture(planetId);
        const ringMat = new THREE.MeshStandardMaterial({
          map: ringTex,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.9,
          roughness: 0.6,
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.castShadow = true;
        pMesh.add(ringMesh);
      }
    });

    // 11. Satellites and Spacecraft in the Solar System
    const spacecraftGroup = new THREE.Group();
    spacecraftGroupRef.current = spacecraftGroup;
    scene.add(spacecraftGroup);

    // ISS & Hubble orbiting Earth
    const earthMesh = planetMeshesRef.current.get('earth') as THREE.Mesh;
    if (earthMesh) {
      // ISS in Low Earth Orbit
      const issModel = createSpacecraftObject('iss');
      issModel.scale.set(0.6, 0.6, 0.6);
      issModel.userData = { id: 'iss', type: 'spacecraft', parentPlanet: 'earth', orbitDist: 1.6, speed: 2.2, angle: 0.2 };
      earthMesh.add(issModel);
      planetMeshesRef.current.set('iss', issModel);

      // Hubble Space Telescope in slightly higher orbit
      const hubbleModel = createSpacecraftObject('hubble');
      hubbleModel.scale.set(0.7, 0.7, 0.7);
      hubbleModel.userData = { id: 'hubble', type: 'spacecraft', parentPlanet: 'earth', orbitDist: 2.1, speed: 1.6, angle: 2.8 };
      earthMesh.add(hubbleModel);
      planetMeshesRef.current.set('hubble', hubbleModel);
    }

    // Voyager 1 heading outbound past the planets
    const voyagerModel = createSpacecraftObject('voyager');
    voyagerModel.scale.set(0.9, 0.9, 0.9);
    voyagerModel.position.set(42, 6, -38);
    voyagerModel.lookAt(50, 8, -48);
    voyagerModel.userData = { id: 'voyager', type: 'spacecraft' };
    spacecraftGroup.add(voyagerModel);
    planetMeshesRef.current.set('voyager', voyagerModel);

    // James Webb at Sun-Earth L2 (trailing Earth orbit)
    const jwstModel = createSpacecraftObject('jwst');
    jwstModel.scale.set(0.8, 0.8, 0.8);
    jwstModel.userData = { id: 'jwst', type: 'spacecraft', parentPlanet: 'earth', orbitDist: 3.2, speed: 0.8, angle: 4.2 };
    if (earthMesh) earthMesh.add(jwstModel);
    planetMeshesRef.current.set('jwst', jwstModel);

    // 12. Raycaster for clicking on planets and spacecraft
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      // Collect all interactive meshes
      const interactiveObjects: THREE.Object3D[] = [];
      planetMeshesRef.current.forEach(obj => {
        interactiveObjects.push(obj);
        obj.traverse(c => {
          if ((c as THREE.Mesh).isMesh) interactiveObjects.push(c);
        });
      });

      const intersects = raycaster.intersectObjects(interactiveObjects, false);

      if (intersects.length > 0) {
        let hitObj: THREE.Object3D | null = intersects[0].object;
        let foundId: string | null = null;
        while (hitObj && !foundId) {
          if (hitObj.userData?.id) {
            foundId = hitObj.userData.id;
            break;
          }
          hitObj = hitObj.parent;
        }

        if (foundId) {
          focusOnObject(foundId as PlanetId | SpacecraftId);
        }
      }
    };

    renderer.domElement.addEventListener('click', handlePointerDown);

    // 13. Resize handler
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 14. Animation Loop
    const clock = new THREE.Clock();

    function animate() {
      animationFrameRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      // Sun self rotation
      sunMesh.rotation.y += delta * 0.15;

      // Asteroid belt subtle drift
      asteroidBelt.rotation.y += delta * 0.02 * simSpeed;

      // Move planets in orbits
      ORDERED_PLANETS.forEach(planetId => {
        const pMesh = planetMeshesRef.current.get(planetId);
        if (pMesh && pMesh.userData) {
          pMesh.userData.angle += delta * pMesh.userData.orbitSpeed * simSpeed * 0.25;
          const r = pMesh.userData.orbitRadius;
          const a = pMesh.userData.angle;
          pMesh.position.x = Math.cos(a) * r;
          pMesh.position.z = Math.sin(a) * r;
          pMesh.rotation.y += delta * 0.5;
        }
      });

      // Move Earth satellites in orbit
      ['iss', 'hubble', 'jwst'].forEach(scId => {
        const scMesh = planetMeshesRef.current.get(scId);
        if (scMesh && scMesh.userData && scMesh.userData.orbitDist) {
          scMesh.userData.angle += delta * scMesh.userData.speed * simSpeed;
          const d = scMesh.userData.orbitDist;
          const a = scMesh.userData.angle;
          scMesh.position.x = Math.cos(a) * d;
          scMesh.position.z = Math.sin(a) * d;
          scMesh.rotation.y += delta * 0.6;
        }
      });

      // Smooth camera transition damping
      if (isTransitioningRef.current) {
        camera.position.lerp(_targetCamPos, 0.05);
        controls.target.lerp(_targetLookAt, 0.05);

        if (camera.position.distanceTo(_targetCamPos) < 0.2) {
          isTransitioningRef.current = false;
        }
      }

      controls.update();

      // Dynamic immersive gyroscope & cockpit motion
      const gyro = deviceGyro.getState();
      if (gyro.isActive && !isTransitioningRef.current) {
        _gyroEuler.set(gyro.pitch * 0.45, gyro.yaw * 0.55, gyro.roll * 0.35, 'YXZ');
        _gyroQuat.setFromEuler(_gyroEuler);
        camera.quaternion.multiply(_gyroQuat);
      }

      renderer.render(scene, camera);
    }

    animate();

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', handlePointerDown);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

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

  // Focus on Planet or Spacecraft + SOUND & AUDIO NARRATION
  const focusOnObject = (targetId: PlanetId | SpacecraftId | 'overview') => {
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

    // Check if planet or spacecraft
    const isPlanet = targetId in PLANETS_DATA;
    if (isPlanet) {
      const pId = targetId as PlanetId;
      setSelectedPlanetId(pId);
      markPlanetExplored(pId);

      // Play unique planet electromagnetic sound AND spoken audio narration!
      soundEffects.playPlanetSound(pId);
      soundEffects.speakPlanet(pId);

      const pData = PLANETS_DATA[pId];
      const offsetDist = Math.max(pData.scale3D * 3.5, 4.0);
      mesh.getWorldPosition(_targetLookAt);
      _targetCamPos.copy(_targetLookAt).add(new THREE.Vector3(offsetDist * 0.8, offsetDist * 0.5, offsetDist));
    } else {
      // Spacecraft
      const scId = targetId as SpacecraftId;
      soundEffects.playSpacecraftSound(scId);
      soundEffects.speakSpacecraft(scId);

      mesh.getWorldPosition(_targetLookAt);
      _targetCamPos.copy(_targetLookAt).add(new THREE.Vector3(1.5, 1.0, 1.8));
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

  const currentObjName =
    focusedPlanet === 'overview'
      ? 'All Orbits'
      : focusedPlanet in PLANETS_DATA
      ? PLANETS_DATA[focusedPlanet as PlanetId].name
      : SPACECRAFTS_DATA[focusedPlanet as SpacecraftId]?.name;

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] overflow-hidden bg-slate-950">
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Floating Mini Info Pill */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2">
        <div className="px-3 py-1.5 rounded-xl bg-slate-900/85 backdrop-blur-md border border-slate-800 text-xs text-slate-300 flex items-center gap-2 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="font-semibold text-white">3D Solar System & Fleet</span>
          <span className="text-slate-500">|</span>
          <span className="text-[11px] text-slate-400">Click any planet or spacecraft for sound & audio</span>
        </div>

        {focusedPlanet !== 'overview' && (
          <div className="flex items-center gap-2">
            {focusedPlanet in PLANETS_DATA ? (
              <button
                onClick={handleInspectPlanet}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-lg shadow-sky-600/30 transition-all hover:scale-105"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Deep Inspect {currentObjName}</span>
              </button>
            ) : null}

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

      {/* Top Right Audio Narration Replay & View Reset */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        {focusedPlanet !== 'overview' && (
          <button
            onClick={() => {
              if (focusedPlanet in PLANETS_DATA) {
                soundEffects.playPlanetSound(focusedPlanet as PlanetId);
                soundEffects.speakPlanet(focusedPlanet as PlanetId);
              } else if (focusedPlanet in SPACECRAFTS_DATA) {
                soundEffects.playSpacecraftSound(focusedPlanet as SpacecraftId);
                soundEffects.speakSpacecraft(focusedPlanet as SpacecraftId);
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

      {/* Unified Bottom Control Dock */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 w-[94%] max-w-4xl transition-all duration-300">
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
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    soundEffects.playClick();
                    setActiveCategory('planets');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all ${
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
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                    activeCategory === 'spacecraft'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Satellite className="w-3.5 h-3.5" />
                  <span>Satellites & Craft</span>
                </button>
              </div>

              <div className="text-[11px] text-slate-400 hidden sm:flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Audio narration triggers on click</span>
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

              {activeCategory === 'planets' ? (
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
              ) : (
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
            </div>

            {/* Bottom row: Flight mechanics & simulation speeds */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-xs">
              <div className="flex items-center gap-1.5">
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
                    onClick={() => {
                      soundEffects.playClick();
                      setSimSpeed(item.val);
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                      simSpeed === item.val
                        ? 'bg-sky-500 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
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

                <button
                  onClick={() => setShowOrbits(!showOrbits)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md border font-medium transition-all ${
                    showOrbits
                      ? 'bg-sky-500/20 border-sky-500/40 text-sky-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Orbit Rings</span>
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
    </div>
  );
};

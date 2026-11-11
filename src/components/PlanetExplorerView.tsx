import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { useClassroom } from '../context/ClassroomContext';
import { PLANETS_DATA, ORDERED_PLANETS } from '../data/planetsData';
import { GALAXIES_DATA, ORDERED_GALAXIES, GalaxyInfo } from '../data/galaxiesData';
import { PlanetId } from '../types/astronomy';
import { getPlanetTexture, getRingTexture } from '../utils/textureGenerator';
import { create3DGalaxy } from '../utils/galaxyGenerator';
import { soundEffects } from '../utils/soundEffects';
import {
  Volume2,
  VolumeX,
  Camera,
  Layers,
  Globe,
  Wind,
  Calculator,
  BookOpen,
  ArrowLeft,
  ArrowRight,
  Plus,
  Sparkles,
  CheckCircle2,
  Orbit,
  Eye,
  RotateCcw,
  Compass,
  Smartphone,
} from 'lucide-react';
import { deviceGyro } from '../utils/deviceOrientation';
import { useGyroscope } from '../hooks/useGyroscope';

// Pre-allocated reusable math objects
const _gyroEuler = new THREE.Euler(0, 0, 0, 'YXZ');
const _gyroQuat = new THREE.Quaternion();

export const PlanetExplorerView: React.FC = () => {
  const {
    selectedPlanetId,
    setSelectedPlanetId,
    markPlanetExplored,
    setCurrentView,
    addStudentNote,
    progress,
  } = useClassroom();

  const mountRef = useRef<HTMLDivElement>(null);

  // Explorer Master Scope: 'planets' | 'galaxies'
  const [explorerScope, setExplorerScope] = useState<'planets' | 'galaxies'>('planets');
  const [selectedGalaxyId, setSelectedGalaxyId] = useState<string>('milky-way');
  const [galaxyTab, setGalaxyTab] = useState<'core' | 'arms' | 'halo' | 'merger'>('core');

  // Planet explorer state
  const [viewMode, setViewMode] = useState<'exterior' | 'interior' | 'atmosphere'>('exterior');
  const [earthWeight, setEarthWeight] = useState<number>(50); // kg
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [noteText, setNoteText] = useState<string>('');
  const [noteSaved, setNoteSaved] = useState<boolean>(false);

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
  const controlsRef = useRef<OrbitControls | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const planetMeshRef = useRef<THREE.Mesh | null>(null);
  const interiorGroupRef = useRef<THREE.Group | null>(null);
  const atmosphereMeshRef = useRef<THREE.Mesh | null>(null);
  const ringMeshRef = useRef<THREE.Mesh | null>(null);
  const currentGalaxyGroupRef = useRef<THREE.Group | null>(null);
  const animationFrameRef = useRef<number>(0);

  const planet = PLANETS_DATA[selectedPlanetId];
  const galaxy: GalaxyInfo = GALAXIES_DATA[selectedGalaxyId] || GALAXIES_DATA['milky-way'];

  // Mark explored on mount/change
  useEffect(() => {
    if (explorerScope === 'planets') {
      markPlanetExplored(selectedPlanetId);
    }
  }, [selectedPlanetId, explorerScope]);

  // Setup Three.js scene (Rebuilds when switching between planets and galaxy scope)
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
    scene.background = new THREE.Color(0x040612);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      200
    );
    if (explorerScope === 'planets') {
      camera.position.set(0, 1.5, 6.5);
    } else {
      camera.position.set(0, 7.5, 12);
    }
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.05;
    controls.minDistance = explorerScope === 'planets' ? 2.5 : 3.0;
    controls.maxDistance = explorerScope === 'planets' ? 14 : 35;
    controlsRef.current = controls;

    if (explorerScope === 'planets') {
      // -------------------------------------------------------------
      // Planet 3D Scene Architecture
      // -------------------------------------------------------------
      const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
      keyLight.position.set(5, 3, 5);
      scene.add(keyLight);

      const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.6);
      fillLight.position.set(-5, -2, -3);
      scene.add(fillLight);

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
      scene.add(ambientLight);

      // Starfield
      const starCount = isSoftwareGl ? 500 : 1200;
      const starGeo = new THREE.BufferGeometry();
      const starPos = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount * 3; i += 3) {
        starPos[i] = (Math.random() - 0.5) * 100;
        starPos[i + 1] = (Math.random() - 0.5) * 100;
        starPos[i + 2] = (Math.random() - 0.5) * 100;
      }
      starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
      const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.8, transparent: true, opacity: 0.8 });
      scene.add(new THREE.Points(starGeo, starMat));

      // Planet Mesh
      const pGeo = new THREE.SphereGeometry(1.5, 48, 48);
      const pTex = getPlanetTexture(selectedPlanetId);
      const pMat = new THREE.MeshStandardMaterial({
        map: pTex,
        roughness: 0.65,
        metalness: 0.1,
      });
      const planetMesh = new THREE.Mesh(pGeo, pMat);
      planetMesh.rotation.z = THREE.MathUtils.degToRad(planet.tiltDegrees);
      scene.add(planetMesh);
      planetMeshRef.current = planetMesh;

      // Rings
      if (planet.hasRings) {
        const ringType = selectedPlanetId === 'uranus' ? 'uranus' : 'saturn';
        const rGeo = new THREE.RingGeometry(2.1, 3.8, 64);
        rGeo.rotateX(Math.PI / 2);
        const rTex = getRingTexture(ringType);
        const rMat = new THREE.MeshStandardMaterial({
          map: rTex,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.9,
          roughness: 0.6,
        });
        const ringMesh = new THREE.Mesh(rGeo, rMat);
        planetMesh.add(ringMesh);
        ringMeshRef.current = ringMesh;
      }

      // Interior Layers Group
      const interiorGroup = new THREE.Group();
      interiorGroup.visible = false;
      scene.add(interiorGroup);
      interiorGroupRef.current = interiorGroup;

      const layerRadii = [1.25, 0.85, 0.45];
      planet.layers.forEach((layer, idx) => {
        const lRadius = layerRadii[idx] || 0.4;
        const lGeo = new THREE.SphereGeometry(lRadius, 32, 32);
        const lMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(layer.color),
          roughness: 0.5,
          metalness: 0.3,
        });
        const lMesh = new THREE.Mesh(lGeo, lMat);
        interiorGroup.add(lMesh);
      });

      // Atmosphere Glow
      const atmGeo = new THREE.SphereGeometry(1.56, 32, 32);
      const atmMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(planet.accentColor),
        transparent: true,
        opacity: 0.25,
        side: THREE.BackSide,
      });
      const atmosphereMesh = new THREE.Mesh(atmGeo, atmMat);
      scene.add(atmosphereMesh);
      atmosphereMeshRef.current = atmosphereMesh;
    } else {
      // -------------------------------------------------------------
      // Galaxy 3D Scene Architecture
      // -------------------------------------------------------------
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      const galaxyGroup = create3DGalaxy(selectedGalaxyId, isSoftwareGl ? 8000 : 22000);
      scene.add(galaxyGroup);
      currentGalaxyGroupRef.current = galaxyGroup;
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
    function animate() {
      animationFrameRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      if (explorerScope === 'planets') {
        if (planetMeshRef.current) planetMeshRef.current.rotation.y += delta * 0.2;
        if (atmosphereMeshRef.current) atmosphereMeshRef.current.rotation.y += delta * 0.15;
        if (interiorGroupRef.current && interiorGroupRef.current.visible) {
          interiorGroupRef.current.rotation.y += delta * 0.2;
        }
      } else {
        if (currentGalaxyGroupRef.current) {
          currentGalaxyGroupRef.current.rotation.y += delta * 0.06;
        }
      }

      controls.update();

      // Dynamic Gyroscope & Motion Parallax
      const gyro = deviceGyro.getState();
      if (gyro.isActive) {
        _gyroEuler.set(gyro.pitch * 0.45, gyro.yaw * 0.5, gyro.roll * 0.35, 'YXZ');
        _gyroQuat.setFromEuler(_gyroEuler);
        camera.quaternion.multiply(_gyroQuat);
      }

      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [selectedPlanetId, explorerScope, selectedGalaxyId]);

  // Update view mode display
  useEffect(() => {
    if (!planetMeshRef.current || !interiorGroupRef.current || !atmosphereMeshRef.current) return;

    if (viewMode === 'exterior') {
      planetMeshRef.current.visible = true;
      (planetMeshRef.current.material as THREE.MeshStandardMaterial).opacity = 1.0;
      (planetMeshRef.current.material as THREE.MeshStandardMaterial).transparent = false;
      interiorGroupRef.current.visible = false;
      atmosphereMeshRef.current.visible = true;
    } else if (viewMode === 'interior') {
      planetMeshRef.current.visible = true;
      (planetMeshRef.current.material as THREE.MeshStandardMaterial).transparent = true;
      (planetMeshRef.current.material as THREE.MeshStandardMaterial).opacity = 0.25;
      interiorGroupRef.current.visible = true;
      atmosphereMeshRef.current.visible = false;
    } else if (viewMode === 'atmosphere') {
      planetMeshRef.current.visible = true;
      (planetMeshRef.current.material as THREE.MeshStandardMaterial).opacity = 0.85;
      interiorGroupRef.current.visible = false;
      atmosphereMeshRef.current.visible = true;
      (atmosphereMeshRef.current.material as THREE.MeshStandardMaterial).opacity = 0.65;
    }
  }, [viewMode]);

  const handleSelectPlanet = (id: PlanetId) => {
    setSelectedPlanetId(id);
    soundEffects.playPlanetSound(id);
    soundEffects.speakPlanet(id);
  };

  const handleSelectGalaxy = (gId: string) => {
    setSelectedGalaxyId(gId);
    soundEffects.playGalaxySound(gId);
    soundEffects.speakGalaxy(gId);
  };

  // Camera presets for Galaxy
  const setGalaxyViewPreset = (preset: 'face-on' | 'edge-on' | 'core' | 'overview') => {
    soundEffects.playClick();
    if (!cameraRef.current || !controlsRef.current) return;

    if (preset === 'face-on') {
      cameraRef.current.position.set(0, 14, 0.1);
      controlsRef.current.target.set(0, 0, 0);
    } else if (preset === 'edge-on') {
      cameraRef.current.position.set(14, 0.4, 0);
      controlsRef.current.target.set(0, 0, 0);
    } else if (preset === 'core') {
      cameraRef.current.position.set(0, 1.2, 3.2);
      controlsRef.current.target.set(0, 0, 0);
    } else {
      cameraRef.current.position.set(0, 7.5, 12);
      controlsRef.current.target.set(0, 0, 0);
    }
  };

  const handlePrevPlanet = () => {
    const idx = ORDERED_PLANETS.indexOf(selectedPlanetId);
    const nextIdx = idx <= 0 ? ORDERED_PLANETS.length - 1 : idx - 1;
    handleSelectPlanet(ORDERED_PLANETS[nextIdx]);
  };

  const handleNextPlanet = () => {
    const idx = ORDERED_PLANETS.indexOf(selectedPlanetId);
    const nextIdx = idx >= ORDERED_PLANETS.length - 1 ? 0 : idx + 1;
    handleSelectPlanet(ORDERED_PLANETS[nextIdx]);
  };

  const calculatedWeight = Math.round(
    (earthWeight * (planet.surfaceGravityMs2 / 9.807)) * 10
  ) / 10;

  const handleSaveNote = () => {
    if (!noteText.trim()) return;
    addStudentNote(selectedPlanetId, noteText.trim());
    setNoteText('');
    setNoteSaved(true);
    soundEffects.playSuccess();
    setTimeout(() => setNoteSaved(false), 2500);
  };

  return (
    <div className="min-h-full pb-16 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-5 pt-4">
      {/* Primary Scope Toggle: Planets vs Galaxies */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3 rounded-2xl shadow-xl">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800">
          <button
            onClick={() => {
              soundEffects.playClick();
              setExplorerScope('planets');
              soundEffects.playPlanetSound(selectedPlanetId);
              soundEffects.speakPlanet(selectedPlanetId);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              explorerScope === 'planets'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Orbit className="w-4 h-4" />
            <span>Solar System Worlds</span>
          </button>

          <button
            onClick={() => {
              soundEffects.playClick();
              setExplorerScope('galaxies');
              soundEffects.playGalaxySound(selectedGalaxyId);
              soundEffects.speakGalaxy(selectedGalaxyId);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              explorerScope === 'galaxies'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md shadow-purple-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Deep Space Galaxies</span>
          </button>
        </div>

        {explorerScope === 'planets' ? (
          <button
            onClick={() => {
              soundEffects.playClick();
              setCurrentView('cameraAR');
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-semibold text-xs shadow-md shadow-pink-600/30 whitespace-nowrap transition-all"
          >
            <Camera className="w-4 h-4" />
            <span>Project Planet in AR</span>
          </button>
        ) : (
          <button
            onClick={() => {
              soundEffects.playGalaxySound(selectedGalaxyId);
              soundEffects.speakGalaxy(selectedGalaxyId);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold text-xs border border-slate-700 shadow-md transition-all"
          >
            <Volume2 className="w-4 h-4" />
            <span>Replay Cosmic Voice</span>
          </button>
        )}
      </div>

      {/* =========================================================================
          MODE 1: DEEP SPACE GALAXIES EXPLORER
         ========================================================================= */}
      {explorerScope === 'galaxies' && (
        <div className="space-y-5">
          {/* Galaxy Selection Shelf */}
          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {ORDERED_GALAXIES.map(gId => {
                const g = GALAXIES_DATA[gId];
                const isSelected = selectedGalaxyId === gId;
                return (
                  <button
                    key={gId}
                    onClick={() => handleSelectGalaxy(gId)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs whitespace-nowrap transition-all border ${
                      isSelected
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 border-purple-400 text-white font-bold shadow-lg shadow-purple-600/30 scale-[1.02]'
                        : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white font-medium'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: g.accentColor }} />
                    <span>{g.name}</span>
                    <span className="text-[10px] text-slate-400 font-normal">({g.type.split(' ')[0]})</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* 3D Galaxy Canvas */}
            <div className="lg:col-span-7 space-y-3">
              <div className="relative w-full h-[380px] sm:h-[460px] rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl">
                <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

                {/* Camera presets overlay */}
                <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/85 backdrop-blur-md border border-slate-800">
                  <button
                    onClick={() => setGalaxyViewPreset('face-on')}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-slate-800"
                  >
                    Face-on Spiral
                  </button>
                  <button
                    onClick={() => setGalaxyViewPreset('edge-on')}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-slate-800"
                  >
                    Edge-on Dust
                  </button>
                  <button
                    onClick={() => setGalaxyViewPreset('core')}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-slate-800"
                  >
                    Black Hole Core
                  </button>
                  <button
                    onClick={() => setGalaxyViewPreset('overview')}
                    className="p-1 rounded-lg text-slate-400 hover:text-white"
                    title="Reset Angle"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Gyroscope Motion HUD */}
                <div className="absolute top-4 right-4 z-10 flex items-center gap-1 bg-slate-900/85 backdrop-blur-md p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={toggleGyro}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isGyroActive
                        ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
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
                        className="px-2 py-1 rounded-md text-[11px] font-medium bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white"
                        title="Recenter zero reference"
                      >
                        Recenter
                      </button>
                      <div className="flex items-center gap-0.5 text-[10px] text-slate-400 pl-1 border-l border-slate-800">
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

                {/* Bottom title pill */}
                <div className="absolute bottom-4 left-4 z-10 bg-slate-900/90 backdrop-blur-md border border-slate-800 px-3.5 py-2 rounded-2xl shadow-lg">
                  <div className="text-xs font-extrabold text-white">{galaxy.name}</div>
                  <div className="text-[10px] text-purple-400 font-medium">{galaxy.type} • {galaxy.morphology}</div>
                </div>
              </div>
            </div>

            {/* Galaxy Scientific Breakdown & Tabs */}
            <div className="lg:col-span-5 space-y-4">
              {/* Header Spec Card */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {galaxy.morphology}
                  </span>
                  <span className="text-xs text-slate-400">{galaxy.constellation}</span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{galaxy.name}</h1>
                <p className="text-xs font-semibold text-amber-300">{galaxy.catalogName}</p>
                <p className="text-xs text-slate-300 leading-relaxed">{galaxy.overview}</p>
              </div>

              {/* Four Metrics Grid */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
                  <span className="text-slate-400 text-[11px]">Diameter</span>
                  <div className="font-bold text-white text-sm mt-0.5">
                    {galaxy.diameterLightYears.toLocaleString()} ly
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
                  <span className="text-slate-400 text-[11px]">Distance from Earth</span>
                  <div className="font-bold text-white text-sm mt-0.5">
                    {galaxy.distanceLightYears}
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
                  <span className="text-slate-400 text-[11px]">Estimated Stars</span>
                  <div className="font-bold text-amber-300 text-sm mt-0.5">
                    {galaxy.estimatedStars}
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
                  <span className="text-slate-400 text-[11px]">Supermassive Black Hole</span>
                  <div className="font-bold text-sky-300 text-sm mt-0.5 truncate">
                    {galaxy.blackHoleMass}
                  </div>
                </div>
              </div>

              {/* Dissector Tabs */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
                <div className="flex items-center gap-1 p-0.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                  <button
                    onClick={() => setGalaxyTab('core')}
                    className={`flex-1 py-1.5 rounded-lg font-semibold transition-all ${
                      galaxyTab === 'core' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Core & Black Hole
                  </button>
                  <button
                    onClick={() => setGalaxyTab('arms')}
                    className={`flex-1 py-1.5 rounded-lg font-semibold transition-all ${
                      galaxyTab === 'arms' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Arms & Stars
                  </button>
                  <button
                    onClick={() => setGalaxyTab('halo')}
                    className={`flex-1 py-1.5 rounded-lg font-semibold transition-all ${
                      galaxyTab === 'halo' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Halo & Dark Matter
                  </button>
                  <button
                    onClick={() => setGalaxyTab('merger')}
                    className={`flex-1 py-1.5 rounded-lg font-semibold transition-all ${
                      galaxyTab === 'merger' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Evolution
                  </button>
                </div>

                {galaxyTab === 'core' && (
                  <div className="space-y-2 text-xs text-slate-300 animate-in fade-in duration-150">
                    <p className="font-semibold text-white">Central Black Hole & Bulge:</p>
                    <p>{galaxy.blackHoleMass} governs the central galactic orbital dynamics.</p>
                    <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 text-[11px]">
                      <span className="text-amber-400 font-bold block mb-1">Stellar Velocity:</span>
                      {galaxy.scientificDetails.rotationVelocity}
                    </div>
                  </div>
                )}

                {galaxyTab === 'arms' && (
                  <div className="space-y-2 text-xs text-slate-300 animate-in fade-in duration-150">
                    <p className="font-semibold text-white">Spiral Arms & Star Formation:</p>
                    <p>{galaxy.scientificDetails.armCount > 0 ? `${galaxy.scientificDetails.armCount} primary spiral arm structures with compression density waves.` : 'Non-standard shockwave ring or starburst outflow configuration.'}</p>
                    <p className="text-[11px] text-slate-400">{galaxy.keyFeatures[0]}</p>
                  </div>
                )}

                {galaxyTab === 'halo' && (
                  <div className="space-y-2 text-xs text-slate-300 animate-in fade-in duration-150">
                    <p className="font-semibold text-white">Stellar Halo & Dark Matter:</p>
                    <p>{galaxy.scientificDetails.stellarHalo}</p>
                    <p className="text-[11px] text-slate-400">{galaxy.scientificDetails.metallicity}</p>
                  </div>
                )}

                {galaxyTab === 'merger' && (
                  <div className="space-y-2 text-xs text-slate-300 animate-in fade-in duration-150">
                    <p className="font-semibold text-white">Cosmic Merger History:</p>
                    <p>{galaxy.scientificDetails.mergerStatus}</p>
                    <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 text-[11px] text-amber-300">
                      💡 {galaxy.funFacts[0]}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODE 2: SOLAR SYSTEM WORLDS EXPLORER
         ========================================================================= */}
      {explorerScope === 'planets' && (
        <div className="space-y-5">
          {/* Planet Selector Bar */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleSelectPlanet('sun')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  selectedPlanetId === 'sun'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                    : 'bg-slate-900 border border-slate-800 text-amber-300 hover:bg-slate-800'
                }`}
              >
                ☀️ The Sun
              </button>

              {ORDERED_PLANETS.map(id => {
                const isSelected = selectedPlanetId === id;
                const p = PLANETS_DATA[id];
                return (
                  <button
                    key={id}
                    onClick={() => handleSelectPlanet(id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                      isSelected
                        ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                        : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                    <span>{p.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* 3D Planet Stage */}
            <div className="lg:col-span-7 space-y-4">
              <div className="relative w-full h-[360px] sm:h-[440px] rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl">
                <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

                {/* View mode toggle pill */}
                <div className="absolute top-4 left-4 z-10 flex items-center gap-1 bg-slate-900/85 backdrop-blur-md p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => {
                      soundEffects.playClick();
                      setViewMode('exterior');
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      viewMode === 'exterior' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Exterior</span>
                  </button>

                  <button
                    onClick={() => {
                      soundEffects.playClick();
                      setViewMode('interior');
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      viewMode === 'interior' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Internal Layers</span>
                  </button>

                  <button
                    onClick={() => {
                      soundEffects.playClick();
                      setViewMode('atmosphere');
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      viewMode === 'atmosphere' ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Wind className="w-3.5 h-3.5" />
                    <span>Atmosphere</span>
                  </button>
                </div>

                {/* Gyroscope Motion HUD */}
                <div className="absolute top-4 right-4 z-10 flex items-center gap-1 bg-slate-900/85 backdrop-blur-md p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={toggleGyro}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isGyroActive
                        ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
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
                        className="px-2 py-1 rounded-md text-[11px] font-medium bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white"
                        title="Recenter zero reference"
                      >
                        Recenter
                      </button>
                      <div className="flex items-center gap-0.5 text-[10px] text-slate-400 pl-1 border-l border-slate-800">
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

                {/* Left/Right Planet Pager */}
                <div className="absolute inset-y-0 inset-x-2 flex items-center justify-between pointer-events-none">
                  <button
                    onClick={handlePrevPlanet}
                    className="pointer-events-auto p-2 rounded-full bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800 shadow-lg"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleNextPlanet}
                    className="pointer-events-auto p-2 rounded-full bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800 shadow-lg"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Bottom title */}
                <div className="absolute bottom-4 left-4 z-10 bg-slate-900/90 backdrop-blur-md border border-slate-800 px-3.5 py-2 rounded-2xl shadow-lg">
                  <div className="text-xs font-extrabold text-white">{planet.name}</div>
                  <div className="text-[10px] text-amber-400 font-medium">{planet.tagline}</div>
                </div>
              </div>

              {/* Gravity & Weight Calculator */}
              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-sky-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Planetary Gravity Calculator
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg text-[10px]">
                    <button
                      onClick={() => setWeightUnit('kg')}
                      className={`px-2 py-0.5 rounded font-semibold ${
                        weightUnit === 'kg' ? 'bg-sky-500 text-white' : 'text-slate-400'
                      }`}
                    >
                      KG
                    </button>
                    <button
                      onClick={() => setWeightUnit('lbs')}
                      className={`px-2 py-0.5 rounded font-semibold ${
                        weightUnit === 'lbs' ? 'bg-sky-500 text-white' : 'text-slate-400'
                      }`}
                    >
                      LBS
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      Your weight on Earth ({weightUnit}):
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="300"
                      value={earthWeight}
                      onChange={e => setEarthWeight(Math.max(1, Number(e.target.value)))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white font-semibold focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400">On {planet.name} you weigh:</div>
                      <div className="text-lg font-extrabold text-amber-300">
                        {calculatedWeight} {weightUnit}
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-500 text-right">
                      {planet.surfaceGravityMs2} m/s²
                      <br />
                      ({Math.round((planet.surfaceGravityMs2 / 9.807) * 100)}% of Earth)
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Rich Planetary Facts & Layers */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    {planet.type} World
                  </span>
                  <span className="text-xs text-slate-400">
                    {planet.distanceFromSunKm > 0 ? `${planet.distanceFromSunKm}M km from Sun` : 'Center of System'}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{planet.name}</h1>
                <p className="text-xs font-medium text-amber-300">{planet.title}</p>
                <p className="text-xs text-slate-300 leading-relaxed pt-1">{planet.overview}</p>
              </div>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
                  <span className="text-slate-400 text-[11px]">Diameter</span>
                  <div className="font-bold text-white text-sm mt-0.5">
                    {planet.diameterKm.toLocaleString()} km
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
                  <span className="text-slate-400 text-[11px]">Surface Temp</span>
                  <div className="font-bold text-white text-sm mt-0.5">
                    {planet.avgTempCelsius > 0 ? `+${planet.avgTempCelsius}` : planet.avgTempCelsius}°C
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
                  <span className="text-slate-400 text-[11px]">Length of Day</span>
                  <div className="font-bold text-white text-sm mt-0.5">
                    {Math.abs(planet.rotationPeriodHours)} hrs
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
                  <span className="text-slate-400 text-[11px]">Orbital Year</span>
                  <div className="font-bold text-white text-sm mt-0.5">
                    {planet.orbitPeriodDays > 0 ? `${planet.orbitPeriodDays} days` : 'N/A (Center)'}
                  </div>
                </div>
              </div>

              {/* Internal Layers Dissector List */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  Internal Structure & Composition
                </span>

                <div className="space-y-2">
                  {planet.layers.map((layer, idx) => (
                    <div key={idx} className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: layer.color }} />
                          <span className="text-xs font-bold text-white">{layer.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">{layer.depth}</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">{layer.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

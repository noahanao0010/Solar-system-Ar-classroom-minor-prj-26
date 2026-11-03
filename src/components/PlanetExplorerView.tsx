import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { useClassroom } from '../context/ClassroomContext';
import { PLANETS_DATA, ORDERED_PLANETS } from '../data/planetsData';
import { PlanetId } from '../types/astronomy';
import { getPlanetTexture, getRingTexture } from '../utils/textureGenerator';
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
} from 'lucide-react';

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
  const [viewMode, setViewMode] = useState<'exterior' | 'interior' | 'atmosphere'>('exterior');
  const [earthWeight, setEarthWeight] = useState<number>(50); // kg
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [noteText, setNoteText] = useState<string>('');
  const [noteSaved, setNoteSaved] = useState<boolean>(false);

  // Three.js refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const planetMeshRef = useRef<THREE.Mesh | null>(null);
  const interiorGroupRef = useRef<THREE.Group | null>(null);
  const atmosphereMeshRef = useRef<THREE.Mesh | null>(null);
  const ringMeshRef = useRef<THREE.Mesh | null>(null);
  const animationFrameRef = useRef<number>(0);

  const planet = PLANETS_DATA[selectedPlanetId];

  // Mark explored on mount/change
  useEffect(() => {
    markPlanetExplored(selectedPlanetId);
  }, [selectedPlanetId]);

  // Setup Three.js scene
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

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060919);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 1.5, 6.5);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    // Environment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Lighting
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
    keyLight.position.set(5, 3, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.6);
    fillLight.position.set(-5, -2, -3);
    scene.add(fillLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
    scene.add(ambientLight);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.05;
    controls.minDistance = 3.0;
    controls.maxDistance = 14;

    // Contact Ground Shadow
    const shadowGeo = new THREE.PlaneGeometry(6, 6);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext('2d')!;
    const radGrad = sCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
    radGrad.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
    radGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.2)');
    radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sCtx.fillStyle = radGrad;
    sCtx.fillRect(0, 0, 128, 128);
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
    });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -2.2;
    scene.add(shadowPlane);

    // Main Planet Group
    const planetGroup = new THREE.Group();
    planetGroup.rotation.z = THREE.MathUtils.degToRad(planet.tiltDegrees);
    scene.add(planetGroup);

    // 1. Exterior Surface Mesh
    const sphereRadius = 1.8;
    const sphereGeo = new THREE.SphereGeometry(sphereRadius, 48, 48);
    const pTex = getPlanetTexture(selectedPlanetId);
    const pMat = new THREE.MeshStandardMaterial({
      map: pTex,
      roughness: 0.6,
      metalness: 0.1,
    });
    const planetMesh = new THREE.Mesh(sphereGeo, pMat);
    planetGroup.add(planetMesh);
    planetMeshRef.current = planetMesh;

    // 2. Rings for Saturn / Uranus
    if (planet.hasRings) {
      const ringType = selectedPlanetId === 'uranus' ? 'uranus' : 'saturn';
      const ringGeo = new THREE.RingGeometry(sphereRadius * 1.35, sphereRadius * 2.4, 64);
      ringGeo.rotateX(Math.PI / 2);
      const ringTex = getRingTexture(ringType);
      const ringMat = new THREE.MeshStandardMaterial({
        map: ringTex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      planetGroup.add(ringMesh);
      ringMeshRef.current = ringMesh;
    }

    // 3. Atmospheric Outer Glow
    const atmosGeo = new THREE.SphereGeometry(sphereRadius * 1.05, 32, 32);
    const atmosMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(planet.accentColor),
      transparent: true,
      opacity: 0.25,
      side: THREE.BackSide,
    });
    const atmosphereMesh = new THREE.Mesh(atmosGeo, atmosMat);
    planetGroup.add(atmosphereMesh);
    atmosphereMeshRef.current = atmosphereMesh;

    // 4. Interior Cutaway Layers (Concentric cut sphere for interior mode)
    const interiorGroup = new THREE.Group();
    interiorGroup.visible = false;
    interiorGroupRef.current = interiorGroup;
    planetGroup.add(interiorGroup);

    // Core layer
    const coreGeo = new THREE.SphereGeometry(sphereRadius * 0.45, 32, 32);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffaa00,
      emissiveIntensity: 0.6,
      roughness: 0.3,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    interiorGroup.add(coreMesh);

    // Mantle layer (wireframe shell or translucent shell)
    const mantleGeo = new THREE.SphereGeometry(sphereRadius * 0.75, 32, 32);
    const mantleMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.4,
      wireframe: true,
    });
    const mantleMesh = new THREE.Mesh(mantleGeo, mantleMat);
    interiorGroup.add(mantleMesh);

    // Crust layer
    const crustGeo = new THREE.SphereGeometry(sphereRadius * 0.98, 32, 32);
    const crustMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.3,
      wireframe: true,
    });
    const crustMesh = new THREE.Mesh(crustGeo, crustMat);
    interiorGroup.add(crustMesh);

    // Resize
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Render loop
    const clock = new THREE.Clock();
    function animate() {
      animationFrameRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      // Slow rotation
      planetMesh.rotation.y += delta * 0.2;
      if (atmosphereMesh) atmosphereMesh.rotation.y += delta * 0.15;
      if (interiorGroup.visible) interiorGroup.rotation.y += delta * 0.2;

      controls.update();
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
  }, [selectedPlanetId]);

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

  // Audio guide speech synthesis
  const toggleSpeechNarration = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const narrationText = `${planet.name}. ${planet.title}. ${planet.tagline}. ${planet.overview} It has an equatorial diameter of ${planet.diameterKm.toLocaleString()} kilometers, and its surface gravity is ${planet.surfaceGravityMs2} meters per second squared.`;
    const utterance = new SpeechSynthesisUtterance(narrationText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const handleSelectPlanet = (id: PlanetId) => {
    setSelectedPlanetId(id);
    soundEffects.playPlanetSound(id);
    soundEffects.speakPlanet(id);
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

  // Weight calculation
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
    <div className="min-h-full pb-16 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 pt-4">
      {/* Top Selector Bar */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2 scrollbar-none">
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
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: p.color }}
                />
                <span>{p.name}</span>
              </button>
            );
          })}
        </div>

        {/* View in AR Button */}
        <button
          onClick={() => {
            soundEffects.playClick();
            setCurrentView('cameraAR');
          }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-semibold text-xs shadow-md shadow-pink-600/30 whitespace-nowrap transition-all flex-shrink-0"
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Project in AR</span>
        </button>
      </div>

      {/* Main Split Layout: 3D Canvas on Left, Rich Fact Sheets on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 3D Planet Viewport */}
        <div className="lg:col-span-7 flex flex-col space-y-3">
          <div className="relative w-full h-[380px] sm:h-[480px] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-xl">
            {/* Three.js Canvas Container */}
            <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

            {/* Top View Mode Switcher */}
            <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-800 shadow-md">
              <button
                onClick={() => {
                  soundEffects.playClick();
                  setViewMode('exterior');
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  viewMode === 'exterior'
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
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
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  viewMode === 'interior'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
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
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  viewMode === 'atmosphere'
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Wind className="w-3.5 h-3.5" />
                <span>Atmosphere</span>
              </button>
            </div>

            {/* Top Right Audio Guide Button */}
            <div className="absolute top-3 right-3 z-20">
              <button
                onClick={toggleSpeechNarration}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl backdrop-blur-md border text-xs font-medium transition-all shadow-md ${
                  isSpeaking
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold animate-pulse'
                    : 'bg-slate-900/90 border-slate-800 text-slate-200 hover:bg-slate-800'
                }`}
              >
                {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                <span>{isSpeaking ? 'Stop Audio Guide' : 'Listen Guide'}</span>
              </button>
            </div>

            {/* Bottom Floating Navigation Arrows */}
            <div className="absolute bottom-3 inset-x-3 z-20 flex items-center justify-between pointer-events-none">
              <button
                onClick={handlePrevPlanet}
                className="pointer-events-auto p-2 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-all shadow-md"
                title="Previous Planet"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div className="px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-800 text-[11px] font-semibold text-slate-300">
                Axial Tilt: {planet.tiltDegrees}°
              </div>

              <button
                onClick={handleNextPlanet}
                className="pointer-events-auto p-2 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-all shadow-md"
                title="Next Planet"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Interactive Weight on this Planet Calculator */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-sky-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Planetary Gravity & Weight Calculator
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
          {/* Header Card */}
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
                {planet.orbitPeriodDays > 0 ? `${planet.orbitPeriodDays} days` : 'N/A'}
              </div>
            </div>
          </div>

          {/* Internal Layers Accordion */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Internal Structure & Layers</span>
            </h3>

            <div className="space-y-2">
              {planet.layers.map((layer, idx) => (
                <div key={idx} className="bg-slate-950/60 border border-slate-800/80 p-2.5 rounded-xl text-xs space-y-1">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-white flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: layer.color }}
                      />
                      {layer.name}
                    </span>
                    <span className="text-slate-400 text-[11px]">{layer.depth}</span>
                  </div>
                  <div className="text-slate-400 text-[11px]">{layer.description}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Atmospheric Composition */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <Wind className="w-3.5 h-3.5 text-sky-400" />
              <span>Atmospheric Profile</span>
            </h3>

            <div className="space-y-1.5">
              {planet.atmosphericComposition.map((comp, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">{comp.gas}</span>
                    <span className="font-semibold text-sky-300">{comp.percentage}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-sky-500 to-indigo-500"
                      style={{ width: `${Math.min(comp.percentage, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Student Field Journal Note */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
              <span>Log Note in Field Journal</span>
            </h3>

            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder={`Write your research observation about ${planet.name}...`}
              rows={2}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />

            <div className="flex items-center justify-between">
              {noteSaved && (
                <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Note saved to journal!
                </span>
              )}
              <div className="ml-auto">
                <button
                  onClick={handleSaveNote}
                  disabled={!noteText.trim()}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold text-xs flex items-center gap-1 transition-all"
                >
                  <Plus className="w-3 h-3" />
                  <span>Save Note</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

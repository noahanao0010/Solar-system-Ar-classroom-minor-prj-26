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
  Scale,
  Plus,
  Trash2,
  Sparkles,
  ArrowRight,
  Maximize2,
  Minimize2,
  Check,
} from 'lucide-react';

export const CompareView: React.FC = () => {
  const {
    comparePlanets,
    setComparePlanets,
    addComparePlanet,
    removeComparePlanet,
    recordCompareUsed,
    setCurrentView,
    setSelectedPlanetId,
  } = useClassroom();

  const mountRef = useRef<HTMLDivElement>(null);
  const [useTrueScale, setUseTrueScale] = useState<boolean>(true);

  // Three.js refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const planetsGroupRef = useRef<THREE.Group | null>(null);
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    recordCompareUsed();
  }, []);

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
    camera.position.set(0, 1.5, 9);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.05;
    controls.minDistance = 4;
    controls.maxDistance = 25;

    // Studio Lights
    const keyLight = new THREE.DirectionalLight(0xfffaed, 2.5);
    keyLight.position.set(5, 5, 5);
    scene.add(keyLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const planetsGroup = new THREE.Group();
    scene.add(planetsGroup);
    planetsGroupRef.current = planetsGroup;

    // Build side-by-side models
    const count = comparePlanets.length;
    const spacing = count === 2 ? 4.2 : 3.4;
    const startX = -((count - 1) * spacing) / 2;

    comparePlanets.forEach((pId, idx) => {
      const pData = PLANETS_DATA[pId];
      const pGroup = new THREE.Group();
      pGroup.position.x = startX + idx * spacing;

      // Scale calculation
      let r = 1.0;
      if (useTrueScale) {
        // Logarithmic or bounded true scale relative to Earth
        const earthKm = 12742;
        const ratio = pData.diameterKm / earthKm;
        r = THREE.MathUtils.clamp(0.4 * Math.pow(ratio, 0.65), 0.3, 2.4);
      } else {
        r = 1.2;
      }

      const pGeo = new THREE.SphereGeometry(r, 36, 36);
      const pTex = getPlanetTexture(pId);
      const pMat = new THREE.MeshStandardMaterial({
        map: pTex,
        roughness: 0.65,
        metalness: 0.1,
      });
      const mesh = new THREE.Mesh(pGeo, pMat);
      mesh.rotation.z = THREE.MathUtils.degToRad(pData.tiltDegrees);
      mesh.userData = { id: pId };
      pGroup.add(mesh);

      // Rings if applicable
      if (pData.hasRings) {
        const ringGeo = new THREE.RingGeometry(r * 1.35, r * 2.3, 48);
        ringGeo.rotateX(Math.PI / 2);
        const ringMat = new THREE.MeshStandardMaterial({
          map: getRingTexture(pId === 'uranus' ? 'uranus' : 'saturn'),
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.9,
        });
        mesh.add(new THREE.Mesh(ringGeo, ringMat));
      }

      // Atmospheric Glow
      const glowGeo = new THREE.SphereGeometry(r * 1.04, 24, 24);
      const glowMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(pData.accentColor),
        transparent: true,
        opacity: 0.25,
        side: THREE.BackSide,
      });
      pGroup.add(new THREE.Mesh(glowGeo, glowMat));

      // Ground Shadow
      const shadowGeo = new THREE.PlaneGeometry(r * 3.5, r * 3.5);
      const shadowCanvas = document.createElement('canvas');
      shadowCanvas.width = 128;
      shadowCanvas.height = 128;
      const sCtx = shadowCanvas.getContext('2d')!;
      const radGrad = sCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
      radGrad.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
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
      shadowPlane.position.y = -r * 1.02;
      pGroup.add(shadowPlane);

      planetsGroup.add(pGroup);
    });

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

      planetsGroup.children.forEach(pg => {
        const mesh = pg.children[0];
        if (mesh) mesh.rotation.y += delta * 0.3;
      });

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
  }, [comparePlanets, useTrueScale]);

  return (
    <div className="min-h-full pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 pt-4">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-4 sm:p-5 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-purple-400" />
            <h1 className="text-xl sm:text-2xl font-bold text-white">Planetary Compare Mode</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Compare 2 or 3 worlds side-by-side in 3D to understand scale, mass, gravity, and atmospheres.
          </p>
        </div>

        {/* Proportional Scale Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              soundEffects.playClick();
              setUseTrueScale(!useTrueScale);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              useTrueScale
                ? 'bg-purple-600/30 border-purple-500 text-purple-300'
                : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{useTrueScale ? 'Proportional 3D Scale: ON' : 'Uniform 3D Size'}</span>
          </button>
        </div>
      </div>

      {/* 3D Comparative Canvas */}
      <div className="relative w-full h-[320px] sm:h-[400px] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-xl">
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Planet labels floating above */}
        <div className="absolute top-4 inset-x-4 flex justify-around pointer-events-none">
          {comparePlanets.map(id => (
            <div
              key={id}
              className="px-3 py-1 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700 text-xs font-bold text-white shadow-lg pointer-events-auto"
            >
              {PLANETS_DATA[id].name}
            </div>
          ))}
        </div>
      </div>

      {/* Planet Pickers Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {comparePlanets.map((currentId, slotIdx) => (
          <div key={slotIdx} className="bg-slate-900/70 border border-slate-800 p-3 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-300">Planet {slotIdx + 1}</span>
              {comparePlanets.length > 2 && (
                <button
                  onClick={() => removeComparePlanet(currentId)}
                  className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                  title="Remove Planet"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={currentId}
              onChange={e => {
                soundEffects.playClick();
                const nextList = [...comparePlanets];
                nextList[slotIdx] = e.target.value as PlanetId;
                setComparePlanets(nextList);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-purple-500"
            >
              {ORDERED_PLANETS.map(pId => (
                <option key={pId} value={pId}>
                  {PLANETS_DATA[pId].name} ({PLANETS_DATA[pId].type})
                </option>
              ))}
            </select>
          </div>
        ))}

        {comparePlanets.length < 3 && (
          <button
            onClick={() => {
              soundEffects.playClick();
              const unused = ORDERED_PLANETS.find(p => !comparePlanets.includes(p)) || 'jupiter';
              addComparePlanet(unused);
            }}
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-dashed border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 hover:bg-slate-900/50 transition-all text-xs font-semibold"
          >
            <Plus className="w-4 h-4 mb-1 text-purple-400" />
            <span>Add 3rd Planet for Comparison</span>
          </button>
        )}
      </div>

      {/* Comparative Data Matrix Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl overflow-x-auto">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <span>Side-by-Side Physical Characteristics</span>
        </h3>

        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400">
              <th className="py-2.5 px-3 font-semibold">Attribute</th>
              {comparePlanets.map(id => (
                <th key={id} className="py-2.5 px-3 font-bold text-white">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: PLANETS_DATA[id].color }}
                    />
                    <span>{PLANETS_DATA[id].name}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 text-slate-300">
            <tr>
              <td className="py-3 px-3 font-medium text-slate-400">Planet Category</td>
              {comparePlanets.map(id => (
                <td key={id} className="py-3 px-3 font-semibold text-purple-300">
                  {PLANETS_DATA[id].type}
                </td>
              ))}
            </tr>

            <tr>
              <td className="py-3 px-3 font-medium text-slate-400">Diameter (km)</td>
              {comparePlanets.map(id => (
                <td key={id} className="py-3 px-3 font-bold text-white">
                  {PLANETS_DATA[id].diameterKm.toLocaleString()} km
                </td>
              ))}
            </tr>

            <tr>
              <td className="py-3 px-3 font-medium text-slate-400">Surface Gravity</td>
              {comparePlanets.map(id => (
                <td key={id} className="py-3 px-3 font-semibold text-amber-300">
                  {PLANETS_DATA[id].surfaceGravityMs2} m/s²
                  <span className="text-[10px] text-slate-400 ml-1">
                    ({Math.round((PLANETS_DATA[id].surfaceGravityMs2 / 9.807) * 100)}% of Earth)
                  </span>
                </td>
              ))}
            </tr>

            <tr>
              <td className="py-3 px-3 font-medium text-slate-400">Average Temp (°C)</td>
              {comparePlanets.map(id => (
                <td key={id} className="py-3 px-3 font-semibold">
                  <span
                    className={
                      PLANETS_DATA[id].avgTempCelsius > 0
                        ? 'text-orange-400'
                        : 'text-sky-400'
                    }
                  >
                    {PLANETS_DATA[id].avgTempCelsius > 0
                      ? `+${PLANETS_DATA[id].avgTempCelsius}`
                      : PLANETS_DATA[id].avgTempCelsius}°C
                  </span>
                </td>
              ))}
            </tr>

            <tr>
              <td className="py-3 px-3 font-medium text-slate-400">Distance from Sun</td>
              {comparePlanets.map(id => (
                <td key={id} className="py-3 px-3">
                  {PLANETS_DATA[id].distanceFromSunKm} Million km
                </td>
              ))}
            </tr>

            <tr>
              <td className="py-3 px-3 font-medium text-slate-400">Length of Day</td>
              {comparePlanets.map(id => (
                <td key={id} className="py-3 px-3">
                  {Math.abs(PLANETS_DATA[id].rotationPeriodHours)} hours
                </td>
              ))}
            </tr>

            <tr>
              <td className="py-3 px-3 font-medium text-slate-400">Confirmed Moons</td>
              {comparePlanets.map(id => (
                <td key={id} className="py-3 px-3 font-semibold text-sky-300">
                  {PLANETS_DATA[id].moonsCount} moons
                </td>
              ))}
            </tr>

            <tr>
              <td className="py-3 px-3 font-medium text-slate-400">Primary Atmospheric Gases</td>
              {comparePlanets.map(id => (
                <td key={id} className="py-3 px-3 text-[11px] text-slate-400">
                  {PLANETS_DATA[id].atmosphericComposition.map(g => `${g.gas} (${g.percentage}%)`).join(', ')}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

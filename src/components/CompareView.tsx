import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { useClassroom } from '../context/ClassroomContext';
import { PLANETS_DATA, ORDERED_PLANETS } from '../data/planetsData';
import { SPACECRAFTS_DATA, ORDERED_SPACECRAFT } from '../data/spaceCraftData';
import { PlanetId, SpacecraftId } from '../types/astronomy';
import { getPlanetTexture } from '../utils/textureGenerator';
import { createSpacecraftObject } from '../utils/spaceCraftModels';
import {
  CinematicPipeline,
  createCinematicComposer,
  createEnhancedPlanetAssembly,
  createSolarCoronaGroup,
  createSpectralStarfield,
} from '../utils/coreAssetsEngine';
import { soundEffects } from '../utils/soundEffects';
import { PageShell, SegmentedTabs } from './ui/ObservatoryPrimitives';
import {
  Scale,
  Plus,
  Trash2,
  Sparkles,
  ArrowRight,
  Maximize2,
  Minimize2,
  Check,
  Volume2,
  Camera,
  Satellite,
  Rocket,
  Compass,
  Orbit,
} from 'lucide-react';

type CompareItemKey = PlanetId | SpacecraftId;

export const CompareView: React.FC = () => {
  const {
    recordCompareUsed,
    setCurrentView,
    setSelectedPlanetId,
    colorGradePreset,
  } = useClassroom();

  const mountRef = useRef<HTMLDivElement>(null);
  const [compareItems, setCompareItems] = useState<CompareItemKey[]>(['earth', 'iss', 'saturn-v']);
  const [itemCategoryFilter, setItemCategoryFilter] = useState<'all' | 'planets' | 'satellites' | 'rockets' | 'spacecraft'>('all');
  const [useTrueScale, setUseTrueScale] = useState<boolean>(false);

  // Three.js refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const itemsGroupRef = useRef<THREE.Group | null>(null);
  const pipelineRef = useRef<CinematicPipeline | null>(null);
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    recordCompareUsed();
  }, []);

  const addItemToCompare = (id: CompareItemKey) => {
    soundEffects.playClick();
    if (compareItems.includes(id)) return;
    if (compareItems.length >= 3) {
      // Replace last item
      setCompareItems(prev => [prev[0], prev[1], id]);
    } else {
      setCompareItems(prev => [...prev, id]);
    }
  };

  const removeItemFromCompare = (id: CompareItemKey) => {
    soundEffects.playClick();
    if (compareItems.length <= 1) return;
    setCompareItems(prev => prev.filter(item => item !== id));
  };

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
    scene.background = new THREE.Color(0x060919);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 1.8, 10);

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
    container.appendChild(renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.05;
    controls.minDistance = 4;
    controls.maxDistance = 30;

    // Studio Lights with shadows
    const keyLight = new THREE.DirectionalLight(0xfffaed, 2.5);
    keyLight.position.set(5, 6, 5);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.5);
    fillLight.position.set(-5, 2, -3);
    scene.add(fillLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    // Subtle multi-spectral deep space backdrop
    scene.add(createSpectralStarfield(isSoftwareGl ? 500 : 1200, 140));

    const itemsGroup = new THREE.Group();
    scene.add(itemsGroup);
    itemsGroupRef.current = itemsGroup;

    // Build side-by-side models
    const count = compareItems.length;
    const spacing = count === 2 ? 4.5 : 3.6;
    const startX = -((count - 1) * spacing) / 2;

    const coronaGroups: THREE.Group[] = [];

    compareItems.forEach((itemId, idx) => {
      const itemGroup = new THREE.Group();
      itemGroup.position.x = startX + idx * spacing;

      if (itemId in PLANETS_DATA) {
        // Celestial Planet / Sun
        const pId = itemId as PlanetId;
        const pData = PLANETS_DATA[pId];

        let r = 1.1;
        if (useTrueScale) {
          const earthKm = 12742;
          const ratio = pData.diameterKm / earthKm;
          r = THREE.MathUtils.clamp(0.4 * Math.pow(ratio, 0.65), 0.35, 2.4);
        }

        if (pId === 'sun') {
          const sunGeo = new THREE.SphereGeometry(r, 40, 40);
          const sunMat = new THREE.MeshBasicMaterial({
            map: getPlanetTexture('sun'),
            color: 0xffeedd,
          });
          const sunMesh = new THREE.Mesh(sunGeo, sunMat);
          const solarCorona = createSolarCoronaGroup(r);
          sunMesh.add(solarCorona);
          coronaGroups.push(solarCorona);
          itemGroup.add(sunMesh);
        } else {
          const mesh = createEnhancedPlanetAssembly(pId, r, isSoftwareGl ? 32 : 44);
          itemGroup.add(mesh);
        }

        // Ground shadow
        const shadowGeo = new THREE.PlaneGeometry(r * 3.5, r * 3.5);
        const shadowCanvas = document.createElement('canvas');
        shadowCanvas.width = 128;
        shadowCanvas.height = 128;
        const sCtx = shadowCanvas.getContext('2d')!;
        const radGrad = sCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
        radGrad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
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
        itemGroup.add(shadowPlane);
      } else if (itemId in SPACECRAFTS_DATA) {
        // Satellite, Rocket, or Spacecraft model!
        const scId = itemId as SpacecraftId;
        const craftModel = createSpacecraftObject(scId);

        // Normalize scale for aesthetic side-by-side comparison
        craftModel.scale.set(4.2, 4.2, 4.2);
        craftModel.position.y = -0.6;
        craftModel.traverse(c => {
          if ((c as THREE.Mesh).isMesh) {
            c.castShadow = true;
            c.receiveShadow = true;
          }
        });
        itemGroup.add(craftModel);
      }

      itemsGroup.add(itemGroup);
    });

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

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      pipelineRef.current?.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    const clock = new THREE.Clock();
    function animate() {
      animationFrameRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      itemsGroup.children.forEach(ig => {
        ig.rotation.y += delta * 0.35;
      });

      coronaGroups.forEach(cg => {
        if (cg.userData?.update) cg.userData.update(elapsed);
      });

      controls.update();
      if (pipelineRef.current) {
        pipelineRef.current.composer.render();
      } else {
        renderer.render(scene, camera);
      }
    }
    animate();

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener('resize', handleResize);
      pipelineRef.current?.dispose();
      pipelineRef.current = null;
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [compareItems, useTrueScale]);

  useEffect(() => {
    pipelineRef.current?.applyPreset(colorGradePreset);
  }, [colorGradePreset]);

  const handlePlaySound = (id: CompareItemKey) => {
    if (id in PLANETS_DATA) {
      soundEffects.playPlanetSound(id as PlanetId);
      soundEffects.speakPlanet(id as PlanetId);
    } else if (id in SPACECRAFTS_DATA) {
      soundEffects.playSpacecraftSound(id as SpacecraftId);
      soundEffects.speakSpacecraft(id as SpacecraftId);
    }
  };

  const handleLaunchAR = (id: CompareItemKey) => {
    soundEffects.playWarp();
    if (id in PLANETS_DATA) {
      setSelectedPlanetId(id as PlanetId);
    }
    setCurrentView('cameraAR');
  };

  // Filter pickable items
  const availableItems: { id: CompareItemKey; name: string; category: string; color: string }[] = [];

  if (itemCategoryFilter === 'all' || itemCategoryFilter === 'planets') {
    ORDERED_PLANETS.forEach(pId => {
      availableItems.push({
        id: pId,
        name: PLANETS_DATA[pId].name,
        category: 'Planet',
        color: PLANETS_DATA[pId].color,
      });
    });
  }

  if (itemCategoryFilter === 'all' || itemCategoryFilter === 'satellites') {
    ORDERED_SPACECRAFT.filter(sId => SPACECRAFTS_DATA[sId].category === 'satellite').forEach(sId => {
      availableItems.push({
        id: sId,
        name: SPACECRAFTS_DATA[sId].name,
        category: 'Satellite',
        color: SPACECRAFTS_DATA[sId].color,
      });
    });
  }

  if (itemCategoryFilter === 'all' || itemCategoryFilter === 'rockets') {
    ORDERED_SPACECRAFT.filter(sId => SPACECRAFTS_DATA[sId].category === 'rocket').forEach(sId => {
      availableItems.push({
        id: sId,
        name: SPACECRAFTS_DATA[sId].name,
        category: 'Rocket',
        color: SPACECRAFTS_DATA[sId].color,
      });
    });
  }

  if (itemCategoryFilter === 'all' || itemCategoryFilter === 'spacecraft') {
    ORDERED_SPACECRAFT.filter(sId => SPACECRAFTS_DATA[sId].category === 'spacecraft').forEach(sId => {
      availableItems.push({
        id: sId,
        name: SPACECRAFTS_DATA[sId].name,
        category: 'Spacecraft',
        color: SPACECRAFTS_DATA[sId].color,
      });
    });
  }

  return (
    <PageShell maxWidth="7xl">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 glass-panel-elevated p-5 sm:p-6 rounded-3xl">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-purple-300 mb-1">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <span>Scale Comparator · Side-by-Side 3D</span>
          </div>
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-purple-400" />
            <h1 className="font-display text-xl sm:text-2xl font-bold text-white">Planetary & Spacecraft Compare</h1>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Compare worlds, satellites, and heavy-lift rockets side-by-side in real-time 3D PBR with authentic acoustics and scale metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              soundEffects.playClick();
              setUseTrueScale(!useTrueScale);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
              useTrueScale
                ? 'bg-purple-500/20 border-purple-400/60 text-purple-200 shadow-md shadow-purple-500/15'
                : 'bg-slate-900/90 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            {useTrueScale ? 'Proportional True Scale: ON' : 'Normalized Scale: ON'}
          </button>
        </div>
      </div>

      {/* 3D Visual Stage */}
      <div className="relative w-full h-80 sm:h-96 rounded-3xl overflow-hidden bg-slate-950 border border-slate-800/90 shadow-2xl">
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Labels over compared items */}
        <div className="absolute bottom-4 inset-x-4 flex justify-around pointer-events-none gap-2">
          {compareItems.map(itemId => {
            const isPlanet = itemId in PLANETS_DATA;
            const name = isPlanet ? PLANETS_DATA[itemId as PlanetId].name : SPACECRAFTS_DATA[itemId as SpacecraftId].name;
            const sub = isPlanet ? PLANETS_DATA[itemId as PlanetId].type : SPACECRAFTS_DATA[itemId as SpacecraftId].category;
            const color = isPlanet ? PLANETS_DATA[itemId as PlanetId].color : SPACECRAFTS_DATA[itemId as SpacecraftId].color;

            return (
              <div
                key={itemId}
                className="pointer-events-auto glass-panel px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-2"
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <div className="text-left">
                  <div className="font-display text-xs font-bold text-white">{name}</div>
                  <div className="text-[10px] font-mono text-slate-400 uppercase">{sub}</div>
                </div>
                <button
                  onClick={() => handlePlaySound(itemId)}
                  className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 transition-colors ml-1"
                  title="Play Sound & Audio Narration"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Item Picker Shelf */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-purple-400" />
            Add to Compare (Up to 3 items)
          </span>

          <SegmentedTabs
            layoutId="compare-filter-tabs"
            value={itemCategoryFilter}
            onChange={val => {
              soundEffects.playClick();
              setItemCategoryFilter(val);
            }}
            accentClass="bg-purple-500/25 border border-purple-400/50 shadow-sm shadow-purple-500/15"
            compact
            items={[
              { id: 'all', label: 'All' },
              { id: 'planets', label: 'Planets' },
              { id: 'satellites', label: 'Satellites' },
              { id: 'rockets', label: 'Rockets' },
              { id: 'spacecraft', label: 'Craft' },
            ]}
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {availableItems.map(item => {
            const isAlreadyCompared = compareItems.includes(item.id);
            return (
              <button
                key={item.id}
                onClick={() => (isAlreadyCompared ? removeItemFromCompare(item.id) : addItemToCompare(item.id))}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                  isAlreadyCompared
                    ? 'bg-purple-600/25 border-purple-400/60 text-purple-200'
                    : 'bg-slate-950/75 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span>{item.name}</span>
                {isAlreadyCompared ? <Check className="w-3.5 h-3.5 text-purple-400" /> : <Plus className="w-3.5 h-3.5 text-slate-500" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Side-by-Side Comparison Table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60">
                <th className="p-4 text-slate-400 font-semibold w-40">Attribute</th>
                {compareItems.map(itemId => {
                  const isPlanet = itemId in PLANETS_DATA;
                  const name = isPlanet ? PLANETS_DATA[itemId as PlanetId].name : SPACECRAFTS_DATA[itemId as SpacecraftId].name;
                  const category = isPlanet ? PLANETS_DATA[itemId as PlanetId].type : SPACECRAFTS_DATA[itemId as SpacecraftId].category;
                  const color = isPlanet ? PLANETS_DATA[itemId as PlanetId].color : SPACECRAFTS_DATA[itemId as SpacecraftId].color;

                  return (
                    <th key={itemId} className="p-4 min-w-[200px]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                          <div>
                            <div className="font-extrabold text-sm text-white">{name}</div>
                            <div className="text-[10px] text-purple-400 uppercase font-semibold">{category}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handlePlaySound(itemId)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 transition-colors"
                            title="Play Audio Sound & Narration"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleLaunchAR(itemId)}
                            className="p-1.5 rounded-lg bg-pink-600/30 hover:bg-pink-600 text-pink-300 transition-colors"
                            title="Project in AR"
                          >
                            <Camera className="w-3.5 h-3.5" />
                          </button>
                          {compareItems.length > 1 && (
                            <button
                              onClick={() => removeItemFromCompare(itemId)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-400 transition-colors"
                              title="Remove"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60">
              {/* Dimensions */}
              <tr>
                <td className="p-4 font-semibold text-slate-400">Dimensions / Diameter</td>
                {compareItems.map(itemId => {
                  const isPlanet = itemId in PLANETS_DATA;
                  const val = isPlanet
                    ? `${PLANETS_DATA[itemId as PlanetId].diameterKm.toLocaleString()} km`
                    : SPACECRAFTS_DATA[itemId as SpacecraftId].dimensions;
                  return (
                    <td key={itemId} className="p-4 font-bold text-white">
                      {val}
                    </td>
                  );
                })}
              </tr>

              {/* Mass */}
              <tr>
                <td className="p-4 font-semibold text-slate-400">Mass</td>
                {compareItems.map(itemId => {
                  const isPlanet = itemId in PLANETS_DATA;
                  const val = isPlanet
                    ? PLANETS_DATA[itemId as PlanetId].massKg
                    : SPACECRAFTS_DATA[itemId as SpacecraftId].massKg;
                  return (
                    <td key={itemId} className="p-4 text-slate-200">
                      {val}
                    </td>
                  );
                })}
              </tr>

              {/* Speed / Velocity */}
              <tr>
                <td className="p-4 font-semibold text-slate-400">Speed / Velocity</td>
                {compareItems.map(itemId => {
                  const isPlanet = itemId in PLANETS_DATA;
                  const val = isPlanet
                    ? `${PLANETS_DATA[itemId as PlanetId].rotationPeriodHours}h rotation`
                    : SPACECRAFTS_DATA[itemId as SpacecraftId].maxSpeed;
                  return (
                    <td key={itemId} className="p-4 text-amber-300 font-semibold">
                      {val}
                    </td>
                  );
                })}
              </tr>

              {/* Distance / Orbit */}
              <tr>
                <td className="p-4 font-semibold text-slate-400">Orbit or Location</td>
                {compareItems.map(itemId => {
                  const isPlanet = itemId in PLANETS_DATA;
                  const val = isPlanet
                    ? `${PLANETS_DATA[itemId as PlanetId].distanceFromSunKm}M km from Sun`
                    : SPACECRAFTS_DATA[itemId as SpacecraftId].orbitOrDestination;
                  return (
                    <td key={itemId} className="p-4 text-slate-300">
                      {val}
                    </td>
                  );
                })}
              </tr>

              {/* Agency / Operator */}
              <tr>
                <td className="p-4 font-semibold text-slate-400">Operator / Type</td>
                {compareItems.map(itemId => {
                  const isPlanet = itemId in PLANETS_DATA;
                  const val = isPlanet
                    ? `${PLANETS_DATA[itemId as PlanetId].type} Astronomical Body`
                    : SPACECRAFTS_DATA[itemId as SpacecraftId].agency;
                  return (
                    <td key={itemId} className="p-4 text-sky-300">
                      {val}
                    </td>
                  );
                })}
              </tr>

              {/* Highlights & Trivia */}
              <tr>
                <td className="p-4 font-semibold text-slate-400">Key Highlight</td>
                {compareItems.map(itemId => {
                  const isPlanet = itemId in PLANETS_DATA;
                  const val = isPlanet
                    ? PLANETS_DATA[itemId as PlanetId].funFacts[0]
                    : SPACECRAFTS_DATA[itemId as SpacecraftId].funFacts[0];
                  return (
                    <td key={itemId} className="p-4 text-slate-300 text-[11px] leading-relaxed">
                      {val}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
};

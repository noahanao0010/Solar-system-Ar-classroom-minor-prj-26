import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { soundEffects } from '../utils/soundEffects';
import {
  Hammer,
  Pickaxe,
  RotateCcw,
  Zap,
  Wind,
  Radio,
  Flame,
  Copy,
  Check,
  Upload,
  Sparkles,
} from 'lucide-react';

export type VoxelBlockType =
  | 'habitat'
  | 'solar'
  | 'oxygen'
  | 'ice'
  | 'dish'
  | 'thruster'
  | 'regolith'
  | 'dome';

export type SandboxBiomeId = 'moon' | 'mars' | 'orbital' | 'titan';

export interface VoxelBlockItem {
  x: number;
  y: number;
  z: number;
  type: VoxelBlockType;
}

export interface ColonySynergyStatus {
  powerGrid: boolean;
  lifeSupport: boolean;
  commsUplink: boolean;
  propulsionReady: boolean;
  connectedLinks: number;
}

interface BlockSpec {
  id: VoxelBlockType;
  label: string;
  shortDesc: string;
  color: string;
  hex: number;
  emissiveHex: number;
  accentCss: string;
}

export const VOXEL_BLOCK_SPECS: Record<VoxelBlockType, BlockSpec> = {
  habitat: {
    id: 'habitat',
    label: 'Habitat Pod',
    shortDesc: 'Pressurized crew quarters',
    color: '#e2e8f0',
    hex: 0xe2e8f0,
    emissiveHex: 0x38bdf8,
    accentCss: 'bg-slate-200 text-slate-950',
  },
  solar: {
    id: 'solar',
    label: 'Solar Array',
    shortDesc: 'Powers neighboring modules',
    color: '#0284c7',
    hex: 0x0284c7,
    emissiveHex: 0x0369a1,
    accentCss: 'bg-sky-500 text-slate-950',
  },
  oxygen: {
    id: 'oxygen',
    label: 'O2 Extractor',
    shortDesc: 'Splits H2O ice into O2',
    color: '#10b981',
    hex: 0x10b981,
    emissiveHex: 0x059669,
    accentCss: 'bg-emerald-500 text-slate-950',
  },
  ice: {
    id: 'ice',
    label: 'Water Ice',
    shortDesc: 'Raw frozen H2O resource',
    color: '#67e8f9',
    hex: 0x67e8f9,
    emissiveHex: 0x0891b2,
    accentCss: 'bg-cyan-300 text-slate-950',
  },
  dish: {
    id: 'dish',
    label: 'Radio Relay',
    shortDesc: 'Deep-space telemetry link',
    color: '#a855f7',
    hex: 0xa855f7,
    emissiveHex: 0x7e22ce,
    accentCss: 'bg-purple-500 text-white',
  },
  thruster: {
    id: 'thruster',
    label: 'Ion Thruster',
    shortDesc: 'Orbital station propulsion',
    color: '#f59e0b',
    hex: 0xf59e0b,
    emissiveHex: 0xd97706,
    accentCss: 'bg-amber-500 text-slate-950',
  },
  regolith: {
    id: 'regolith',
    label: 'Regolith Brick',
    shortDesc: 'Radiation & micrometeor shield',
    color: '#64748b',
    hex: 0x64748b,
    emissiveHex: 0x1e293b,
    accentCss: 'bg-slate-600 text-white',
  },
  dome: {
    id: 'dome',
    label: 'Bio Dome',
    shortDesc: 'Glass greenhouse & lab cupola',
    color: '#34d399',
    hex: 0x34d399,
    emissiveHex: 0x047857,
    accentCss: 'bg-teal-400 text-slate-950',
  },
};

const BIOME_CONFIG: Record<
  SandboxBiomeId,
  { label: string; gravity: string; skyHex: number; floorHex: number; gridHex: number; summary: string }
> = {
  moon: {
    label: 'Lunar Crater',
    gravity: '1.62 m/s²',
    skyHex: 0x050914,
    floorHex: 0x1e293b,
    gridHex: 0x38bdf8,
    summary: 'Harvest polar ice and build a shielded base.',
  },
  mars: {
    label: 'Mars Regolith',
    gravity: '3.72 m/s²',
    skyHex: 0x180d0b,
    floorHex: 0x451a14,
    gridHex: 0xf97316,
    summary: 'Link domes with O2 extractors for dust-storm survival.',
  },
  orbital: {
    label: 'Zero-G Orbit',
    gravity: '0.00 m/s²',
    skyHex: 0x030712,
    floorHex: 0x0f172a,
    gridHex: 0x818cf8,
    summary: 'Assemble modular orbital trusses and ion propulsion.',
  },
  titan: {
    label: 'Titan Cryo Lab',
    gravity: '1.35 m/s²',
    skyHex: 0x120f07,
    floorHex: 0x2b2112,
    gridHex: 0xfbbf24,
    summary: 'Connect thermal habitats over cryogenic hydrocarbon plains.',
  },
};

const STARTER_BLUEPRINTS: Record<'moon-outpost' | 'mars-greenhouse' | 'orbital-relay', VoxelBlockItem[]> = {
  'moon-outpost': [
    { x: 0, y: 0, z: 0, type: 'habitat' },
    { x: 1, y: 0, z: 0, type: 'oxygen' },
    { x: 2, y: 0, z: 0, type: 'ice' },
    { x: 0, y: 0, z: 1, type: 'solar' },
    { x: 1, y: 0, z: 1, type: 'solar' },
    { x: 0, y: 1, z: 0, type: 'dish' },
  ],
  'mars-greenhouse': [
    { x: -1, y: 0, z: 0, type: 'regolith' },
    { x: 0, y: 0, z: 0, type: 'dome' },
    { x: 1, y: 0, z: 0, type: 'habitat' },
    { x: 0, y: 0, z: 1, type: 'oxygen' },
    { x: 1, y: 0, z: 1, type: 'solar' },
    { x: -1, y: 0, z: 1, type: 'ice' },
  ],
  'orbital-relay': [
    { x: 0, y: 0, z: 0, type: 'habitat' },
    { x: -1, y: 0, z: 0, type: 'thruster' },
    { x: 1, y: 0, z: 0, type: 'solar' },
    { x: 0, y: 1, z: 0, type: 'dish' },
    { x: 0, y: 0, z: 1, type: 'dome' },
  ],
};

function blockKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

export function computeColonySynergies(blocks: VoxelBlockItem[]): {
  status: ColonySynergyStatus;
  links: [VoxelBlockItem, VoxelBlockItem][];
} {
  const map = new Map<string, VoxelBlockItem>();
  blocks.forEach(b => map.set(blockKey(b.x, b.y, b.z), b));

  const offsets = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ];

  let powerGrid = false;
  let lifeSupport = false;
  let commsUplink = false;
  let propulsionReady = false;
  const links: [VoxelBlockItem, VoxelBlockItem][] = [];
  const seenPairs = new Set<string>();

  for (const b of blocks) {
    for (const [dx, dy, dz] of offsets) {
      const n = map.get(blockKey(b.x + dx, b.y + dy, b.z + dz));
      if (!n) continue;

      const pairId = [blockKey(b.x, b.y, b.z), blockKey(n.x, n.y, n.z)].sort().join('|');
      if (!seenPairs.has(pairId)) {
        seenPairs.add(pairId);
        links.push([b, n]);
      }

      if (
        (b.type === 'solar' && ['habitat', 'oxygen', 'dish', 'thruster', 'dome'].includes(n.type)) ||
        (n.type === 'solar' && ['habitat', 'oxygen', 'dish', 'thruster', 'dome'].includes(b.type))
      ) {
        powerGrid = true;
      }
      if (
        (b.type === 'oxygen' && (n.type === 'ice' || n.type === 'habitat' || n.type === 'dome')) ||
        (n.type === 'oxygen' && (b.type === 'ice' || b.type === 'habitat' || b.type === 'dome'))
      ) {
        if (blocks.some(x => x.type === 'ice') && blocks.some(x => x.type === 'habitat' || x.type === 'dome')) {
          lifeSupport = true;
        }
      }
      if (
        (b.type === 'dish' && (n.type === 'solar' || n.type === 'habitat')) ||
        (n.type === 'dish' && (b.type === 'solar' || b.type === 'habitat'))
      ) {
        commsUplink = true;
      }
      if (
        (b.type === 'thruster' && (n.type === 'solar' || n.type === 'habitat')) ||
        (n.type === 'thruster' && (b.type === 'solar' || b.type === 'habitat'))
      ) {
        propulsionReady = true;
      }
    }
  }

  return {
    status: {
      powerGrid,
      lifeSupport,
      commsUplink,
      propulsionReady,
      connectedLinks: links.length,
    },
    links,
  };
}

interface SpaceVoxelSandboxProps {
  initialBlocks?: VoxelBlockItem[];
  onUnlockSynergy: (synergyKey: string, title: string, xp: number, badge?: string) => void;
  onBlocksChange?: (blocks: VoxelBlockItem[], status: ColonySynergyStatus) => void;
}

export const SpaceVoxelSandbox: React.FC<SpaceVoxelSandboxProps> = ({
  initialBlocks,
  onUnlockSynergy,
  onBlocksChange,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  const [biome, setBiome] = useState<SandboxBiomeId>('moon');
  const [selectedBlock, setSelectedBlock] = useState<VoxelBlockType>('solar');
  const [toolMode, setToolMode] = useState<'place' | 'mine'>('place');
  const [blocks, setBlocks] = useState<VoxelBlockItem[]>(() => {
    if (initialBlocks && initialBlocks.length > 0) return initialBlocks;
    try {
      const saved = localStorage.getItem('ar_smart_classroom_voxel_colony_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return STARTER_BLUEPRINTS['moon-outpost'];
  });

  const [synergy, setSynergy] = useState<ColonySynergyStatus>(() => computeColonySynergies(blocks).status);
  const [copiedBlueprint, setCopiedBlueprint] = useState(false);
  const [importCode, setImportCode] = useState('');
  const [showImportBox, setShowImportBox] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<string>('Left-click grid or block face to place · Right-click or Mine tool to break');

  const selectedBlockRef = useRef<VoxelBlockType>(selectedBlock);
  const toolModeRef = useRef<'place' | 'mine'>(toolMode);
  const blocksRef = useRef<VoxelBlockItem[]>(blocks);

  useEffect(() => {
    selectedBlockRef.current = selectedBlock;
  }, [selectedBlock]);
  useEffect(() => {
    toolModeRef.current = toolMode;
  }, [toolMode]);

  // Update external & localStorage whenever initialBlocks changes
  useEffect(() => {
    if (initialBlocks && initialBlocks.length > 0) {
      setBlocks(initialBlocks);
    }
  }, [initialBlocks]);

  // Three.js scene refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const voxelsGroupRef = useRef<THREE.Group | null>(null);
  const linksLineRef = useRef<THREE.LineSegments | null>(null);
  const floorMeshRef = useRef<THREE.Mesh | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const blockMeshMapRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const materialsCacheRef = useRef<Map<VoxelBlockType, THREE.MeshStandardMaterial>>(new Map());
  const boxGeoRef = useRef<THREE.BoxGeometry | null>(null);
  const edgeGeoRef = useRef<THREE.EdgesGeometry | null>(null);

  // Sync blocks into 3D scene & evaluate synergies
  const syncVoxelsToScene = (currentBlocks: VoxelBlockItem[]) => {
    const group = voxelsGroupRef.current;
    const linksLine = linksLineRef.current;
    const boxGeo = boxGeoRef.current;
    const edgeGeo = edgeGeoRef.current;
    if (!group || !boxGeo || !edgeGeo) return;

    // Clear existing block meshes cleanly
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }
    blockMeshMapRef.current.clear();

    currentBlocks.forEach(item => {
      const mat = materialsCacheRef.current.get(item.type);
      if (!mat) return;
      const mesh = new THREE.Mesh(boxGeo, mat);
      mesh.position.set(item.x, item.y + 0.5, item.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { voxel: item };

      // Crisp Minecraft-style subtle edge highlight
      const edges = new THREE.LineSegments(
        edgeGeo,
        new THREE.LineBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.42 }),
      );
      mesh.add(edges);

      group.add(mesh);
      blockMeshMapRef.current.set(blockKey(item.x, item.y, item.z), mesh);
    });

    // Compute glowing energy/oxygen conduit connections
    const { status, links } = computeColonySynergies(currentBlocks);
    setSynergy(status);
    onBlocksChange?.(currentBlocks, status);

    if (status.powerGrid) {
      onUnlockSynergy('synergy-power', 'Lunar Solar Grid Connected', 30);
    }
    if (status.lifeSupport) {
      onUnlockSynergy('synergy-o2', 'Oxygen Life-Support Loop', 40, 'Colony Architect');
    }
    if (status.commsUplink) {
      onUnlockSynergy('synergy-comms', 'Deep-Space Telemetry Link', 30);
    }
    if (status.propulsionReady) {
      onUnlockSynergy('synergy-propulsion', 'Orbital Ion Drive Rigged', 35);
    }

    if (linksLine) {
      const pts: number[] = [];
      links.forEach(([a, b]) => {
        pts.push(a.x, a.y + 0.5, a.z, b.x, b.y + 0.5, b.z);
      });
      linksLine.geometry.dispose();
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      linksLine.geometry = geo;
      linksLine.visible = pts.length > 0;
    }

    try {
      localStorage.setItem('ar_smart_classroom_voxel_colony_v1', JSON.stringify(currentBlocks));
    } catch {}
  };

  useEffect(() => {
    blocksRef.current = blocks;
    syncVoxelsToScene(blocks);
  }, [blocks]);

  useEffect(() => {
    const cfg = BIOME_CONFIG[biome];
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(cfg.skyHex);
    }
    if (floorMeshRef.current) {
      (floorMeshRef.current.material as THREE.MeshStandardMaterial).color.setHex(cfg.floorHex);
    }
    if (gridHelperRef.current && Array.isArray(gridHelperRef.current.material)) {
      gridHelperRef.current.material.forEach(m => {
        (m as THREE.LineBasicMaterial).color.setHex(cfg.gridHex);
      });
    } else if (gridHelperRef.current) {
      (gridHelperRef.current.material as THREE.LineBasicMaterial).color.setHex(cfg.gridHex);
    }
  }, [biome]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const cfg = BIOME_CONFIG[biome];
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(cfg.skyHex);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 120);
    camera.position.set(7.5, 6.8, 8.8);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI * 0.47;
    controls.minDistance = 4.5;
    controls.maxDistance = 20;
    controls.target.set(0, 0.7, 0);

    // Lighting
    const hemi = new THREE.HemisphereLight(0xe0f2fe, 0x0f172a, 0.9);
    scene.add(hemi);
    const dirLight = new THREE.DirectionalLight(0xfffaed, 1.85);
    dirLight.position.set(8, 14, 9);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(1024, 1024);
    scene.add(dirLight);

    // Ground platform (11x11 buildable biome)
    const floorGeo = new THREE.BoxGeometry(11, 0.3, 11);
    const floorMat = new THREE.MeshStandardMaterial({
      color: cfg.floorHex,
      roughness: 0.85,
      metalness: 0.15,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.set(0, -0.15, 0);
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);
    floorMeshRef.current = floorMesh;

    const gridHelper = new THREE.GridHelper(11, 11, cfg.gridHex, cfg.gridHex);
    gridHelper.position.y = 0.005;
    if (!Array.isArray(gridHelper.material)) {
      gridHelper.material.opacity = 0.28;
      gridHelper.material.transparent = true;
    }
    scene.add(gridHelper);
    gridHelperRef.current = gridHelper;

    // Subtle hover ghost preview cube
    const hoverGeo = new THREE.BoxGeometry(1.02, 1.02, 1.02);
    const hoverMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    });
    const hoverRollOver = new THREE.Mesh(hoverGeo, hoverMat);
    hoverRollOver.visible = false;
    scene.add(hoverRollOver);

    // Cache block geometry & materials
    const boxGeo = new THREE.BoxGeometry(0.96, 0.96, 0.96);
    const edgeGeo = new THREE.EdgesGeometry(boxGeo);
    boxGeoRef.current = boxGeo;
    edgeGeoRef.current = edgeGeo;

    (Object.keys(VOXEL_BLOCK_SPECS) as VoxelBlockType[]).forEach(t => {
      const spec = VOXEL_BLOCK_SPECS[t];
      const mat = new THREE.MeshStandardMaterial({
        color: spec.hex,
        emissive: spec.emissiveHex,
        emissiveIntensity: t === 'solar' || t === 'thruster' || t === 'dome' ? 0.35 : 0.12,
        roughness: t === 'ice' || t === 'dome' ? 0.2 : 0.55,
        metalness: t === 'solar' || t === 'dish' ? 0.6 : 0.18,
        transparent: t === 'dome' || t === 'ice',
        opacity: t === 'dome' ? 0.78 : t === 'ice' ? 0.92 : 1.0,
      });
      materialsCacheRef.current.set(t, mat);
    });

    const voxelsGroup = new THREE.Group();
    scene.add(voxelsGroup);
    voxelsGroupRef.current = voxelsGroup;

    const linksMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
    });
    const linksLine = new THREE.LineSegments(new THREE.BufferGeometry(), linksMat);
    scene.add(linksLine);
    linksLineRef.current = linksLine;

    syncVoxelsToScene(blocksRef.current);

    let pointerDownPos: { x: number; y: number } | null = null;
    const mouse = new THREE.Vector2();

    const getHitTarget = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycasterRef.current.setFromCamera(mouse, camera);

      const targets: THREE.Object3D[] = [...voxelsGroup.children, floorMesh];
      const hits = raycasterRef.current.intersectObjects(targets, false);
      return hits[0] || null;
    };

    const handlePointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const handlePointerMove = (e: PointerEvent) => {
      const hit = getHitTarget(e.clientX, e.clientY);
      if (!hit || !hit.face) {
        hoverRollOver.visible = false;
        return;
      }

      if (toolModeRef.current === 'mine') {
        if (hit.object !== floorMesh) {
          hoverRollOver.position.copy(hit.object.position);
          hoverMat.color.setHex(0xf43f5e);
          hoverRollOver.visible = true;
        } else {
          hoverRollOver.visible = false;
        }
        return;
      }

      const pos = hit.point.clone().addScaledVector(hit.face.normal, 0.5);
      const gx = Math.round(pos.x);
      const gy = Math.max(0, Math.floor(pos.y));
      const gz = Math.round(pos.z);

      if (Math.abs(gx) <= 5 && Math.abs(gz) <= 5 && gy <= 6) {
        hoverRollOver.position.set(gx, gy + 0.5, gz);
        hoverMat.color.setHex(VOXEL_BLOCK_SPECS[selectedBlockRef.current].hex);
        hoverRollOver.visible = true;
      } else {
        hoverRollOver.visible = false;
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!pointerDownPos) return;
      const moveDist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      pointerDownPos = null;
      if (moveDist > 6) return; // Ignore orbit camera drags

      const hit = getHitTarget(e.clientX, e.clientY);
      if (!hit || !hit.face) return;

      const isBreakAction = e.button === 2 || toolModeRef.current === 'mine';

      if (isBreakAction) {
        if (hit.object !== floorMesh && hit.object.userData?.voxel) {
          const targetVoxel = hit.object.userData.voxel as VoxelBlockItem;
          soundEffects.playBlockBreak();
          setBlocks(prev =>
            prev.filter(
              b => !(b.x === targetVoxel.x && b.y === targetVoxel.y && b.z === targetVoxel.z),
            ),
          );
          setStatusFeedback(`Mined ${VOXEL_BLOCK_SPECS[targetVoxel.type].label}`);
        }
        return;
      }

      const pos = hit.point.clone().addScaledVector(hit.face.normal, 0.5);
      const gx = Math.round(pos.x);
      const gy = Math.max(0, Math.floor(pos.y));
      const gz = Math.round(pos.z);

      if (Math.abs(gx) > 5 || Math.abs(gz) > 5 || gy > 6) return;

      const k = blockKey(gx, gy, gz);
      if (blocksRef.current.some(b => blockKey(b.x, b.y, b.z) === k)) return;

      const bType = selectedBlockRef.current;
      soundEffects.playBlockPlace();
      setBlocks(prev => [...prev, { x: gx, y: gy, z: gz, type: bType }]);
      setStatusFeedback(`Placed ${VOXEL_BLOCK_SPECS[bType].label} at (${gx}, ${gy}, ${gz})`);
    };

    const preventContextMenu = (e: MouseEvent) => e.preventDefault();

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);
    renderer.domElement.addEventListener('contextmenu', preventContextMenu);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    let rafId = 0;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('contextmenu', preventContextMenu);
      controls.dispose();
      floorGeo.dispose();
      floorMat.dispose();
      hoverGeo.dispose();
      hoverMat.dispose();
      boxGeo.dispose();
      edgeGeo.dispose();
      linksLine.geometry.dispose();
      linksMat.dispose();
      materialsCacheRef.current.forEach(m => m.dispose());
      materialsCacheRef.current.clear();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const handleCopyBlueprint = () => {
    const encoded = btoa(JSON.stringify(blocks));
    navigator.clipboard?.writeText(encoded);
    setCopiedBlueprint(true);
    soundEffects.playSuccess();
    setTimeout(() => setCopiedBlueprint(false), 2000);
  };

  const handleLoadBlueprintCode = () => {
    try {
      const decoded = JSON.parse(atob(importCode.trim()));
      if (Array.isArray(decoded) && decoded.every(x => typeof x.x === 'number' && typeof x.type === 'string')) {
        setBlocks(decoded);
        setShowImportBox(false);
        setImportCode('');
        soundEffects.playCraftSuccess();
        setStatusFeedback(`Loaded ${decoded.length} shared colony blocks`);
      }
    } catch {
      setStatusFeedback('Invalid blueprint code — check your classmate code string.');
    }
  };

  const loadPreset = (key: 'moon-outpost' | 'mars-greenhouse' | 'orbital-relay' | 'clear') => {
    soundEffects.playClick();
    if (key === 'clear') {
      setBlocks([]);
      setStatusFeedback('Cleared build plot — start placing blocks!');
      return;
    }
    setBlocks(STARTER_BLUEPRINTS[key]);
    soundEffects.playCraftSuccess();
    setStatusFeedback(`Loaded ${key.replace('-', ' ')} blueprint`);
  };

  return (
    <div className="space-y-4">
      {/* Top Toolbar: Biomes, Build/Mine Tool & Blueprints */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {(Object.keys(BIOME_CONFIG) as SandboxBiomeId[]).map(bKey => {
            const active = biome === bKey;
            return (
              <button
                key={bKey}
                onClick={() => {
                  soundEffects.playClick();
                  setBiome(bKey);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-sky-500/20 border-sky-400 text-white'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {BIOME_CONFIG[bKey].label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center p-0.5 rounded-xl bg-slate-950 border border-slate-800">
            <button
              onClick={() => {
                soundEffects.playClick();
                setToolMode('place');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                toolMode === 'place' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Hammer className="w-3.5 h-3.5" />
              <span>Place</span>
            </button>
            <button
              onClick={() => {
                soundEffects.playClick();
                setToolMode('mine');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                toolMode === 'mine' ? 'bg-rose-500 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Pickaxe className="w-3.5 h-3.5" />
              <span>Mine</span>
            </button>
          </div>

          <button
            onClick={() => loadPreset('moon-outpost')}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700"
          >
            Moon Starter
          </button>
          <button
            onClick={() => loadPreset('mars-greenhouse')}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700"
          >
            Mars Bio-Base
          </button>
          <button
            onClick={() => loadPreset('clear')}
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-300 border border-slate-800"
            title="Clear Plot"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Split: 3D Voxel Canvas (8 cols) + Live Connection Telemetry & Blueprints (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 space-y-3">
          <div className="relative h-[380px] sm:h-[440px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
            <div ref={mountRef} className="w-full h-full cursor-crosshair" />

            <div className="absolute top-3 left-3 px-3 py-1.5 rounded-xl bg-slate-950/90 border border-slate-800 text-[11px] text-slate-300 pointer-events-none flex items-center gap-2">
              <span className="font-semibold text-white">{BIOME_CONFIG[biome].label}</span>
              <span className="text-slate-600" aria-hidden="true">·</span>
              <span className="font-mono text-sky-300 tabular-nums">{BIOME_CONFIG[biome].gravity}</span>
              <span className="text-slate-600" aria-hidden="true">·</span>
              <span className="font-mono text-slate-400 tabular-nums">{blocks.length} blocks</span>
            </div>

            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
              <div className="px-3 py-1 rounded-lg bg-slate-950/90 border border-slate-800 text-[11px] text-slate-300 truncate">
                {statusFeedback}
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-slate-950/90 border border-slate-800 text-[11px] font-mono text-emerald-300 tabular-nums whitespace-nowrap">
                {synergy.connectedLinks} links
              </div>
            </div>
          </div>

          {/* Minecraft-Style Hotbar Selector */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.keys(VOXEL_BLOCK_SPECS) as VoxelBlockType[]).map(bKey => {
              const spec = VOXEL_BLOCK_SPECS[bKey];
              const active = selectedBlock === bKey && toolMode === 'place';
              return (
                <button
                  key={bKey}
                  onClick={() => {
                    soundEffects.playClick();
                    setSelectedBlock(bKey);
                    setToolMode('place');
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                    active
                      ? 'bg-sky-500/20 border-sky-400 text-white shadow-md'
                      : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <span
                    className="w-5 h-5 rounded-md flex-shrink-0 border border-white/20"
                    style={{ backgroundColor: spec.color }}
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">{spec.label}</div>
                    <div className="text-[10px] text-slate-400 truncate">{spec.shortDesc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Live Connected System Status & Classmate Blueprint Share */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-sky-300 font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Colony System Synergies</span>
            </h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Place complementary blocks next to each other to form real engineering links and earn bonus XP.
            </p>

            <div className="space-y-2 text-xs">
              <div
                className={`p-2.5 rounded-xl border flex items-center justify-between ${
                  synergy.powerGrid
                    ? 'bg-sky-500/15 border-sky-400/50 text-sky-100'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Zap className={`w-4 h-4 ${synergy.powerGrid ? 'text-sky-400' : 'text-slate-600'}`} />
                  <div>
                    <div className="font-semibold">Solar Power Bus</div>
                    <div className="text-[10px] opacity-80">Solar Array adjacent to Habitat/Lab</div>
                  </div>
                </div>
                <span className="font-mono text-[10px] font-bold">
                  {synergy.powerGrid ? 'ACTIVE' : '+30 XP'}
                </span>
              </div>

              <div
                className={`p-2.5 rounded-xl border flex items-center justify-between ${
                  synergy.lifeSupport
                    ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-100'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Wind className={`w-4 h-4 ${synergy.lifeSupport ? 'text-emerald-400' : 'text-slate-600'}`} />
                  <div>
                    <div className="font-semibold">Closed O2 Loop</div>
                    <div className="text-[10px] opacity-80">Water Ice + O2 Extractor + Habitat</div>
                  </div>
                </div>
                <span className="font-mono text-[10px] font-bold">
                  {synergy.lifeSupport ? 'ACTIVE' : '+40 XP'}
                </span>
              </div>

              <div
                className={`p-2.5 rounded-xl border flex items-center justify-between ${
                  synergy.commsUplink
                    ? 'bg-purple-500/15 border-purple-400/50 text-purple-100'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Radio className={`w-4 h-4 ${synergy.commsUplink ? 'text-purple-400' : 'text-slate-600'}`} />
                  <div>
                    <div className="font-semibold">Telemetry Uplink</div>
                    <div className="text-[10px] opacity-80">Radio Relay linked to Solar/Habitat</div>
                  </div>
                </div>
                <span className="font-mono text-[10px] font-bold">
                  {synergy.commsUplink ? 'ACTIVE' : '+30 XP'}
                </span>
              </div>

              <div
                className={`p-2.5 rounded-xl border flex items-center justify-between ${
                  synergy.propulsionReady
                    ? 'bg-amber-500/15 border-amber-400/50 text-amber-100'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Flame className={`w-4 h-4 ${synergy.propulsionReady ? 'text-amber-400' : 'text-slate-600'}`} />
                  <div>
                    <div className="font-semibold">Ion Propulsion</div>
                    <div className="text-[10px] opacity-80">Ion Thruster paired with Power/Pod</div>
                  </div>
                </div>
                <span className="font-mono text-[10px] font-bold">
                  {synergy.propulsionReady ? 'ACTIVE' : '+35 XP'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2.5">
            <div className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold">
              Share & Connect Blueprint
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleCopyBlueprint}
                className="py-2 px-3 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                {copiedBlueprint ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedBlueprint ? 'Copied!' : 'Copy Seed'}</span>
              </button>
              <button
                onClick={() => setShowImportBox(v => !v)}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5 text-amber-400" />
                <span>Load Peer</span>
              </button>
            </div>

            {showImportBox && (
              <div className="space-y-2 pt-1">
                <input
                  type="text"
                  value={importCode}
                  onChange={e => setImportCode(e.target.value)}
                  placeholder="Paste classmate colony code..."
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                />
                <button
                  onClick={handleLoadBlueprintCode}
                  className="w-full py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold"
                >
                  Import Into Sandbox
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

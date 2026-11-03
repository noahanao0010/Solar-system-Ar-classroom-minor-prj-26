import * as THREE from 'three';
import { SpacecraftId } from '../types/astronomy';

// Procedural textures generator cache
const textureCache: Record<string, THREE.CanvasTexture> = {};

export function getSolarPanelTexture(): THREE.CanvasTexture {
  if (textureCache['solar_panel']) return textureCache['solar_panel'];

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Deep photovoltaic space blue
  ctx.fillStyle = '#0a1936';
  ctx.fillRect(0, 0, 256, 256);

  // Solar cells grid
  const cols = 8;
  const rows = 8;
  const cellW = 256 / cols;
  const cellH = 256 / rows;

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const x = c * cellW + 2;
      const y = r * cellH + 2;
      const w = cellW - 4;
      const h = cellH - 4;

      const grad = ctx.createLinearGradient(x, y, x + w, y + h);
      grad.addColorStop(0, '#13356e');
      grad.addColorStop(0.5, '#1e40af');
      grad.addColorStop(1, '#0f2956');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, w, h);

      // Micro grid lines within cell
      ctx.strokeStyle = 'rgba(147, 197, 253, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y + h * 0.33);
      ctx.lineTo(x + w, y + h * 0.33);
      ctx.moveTo(x, y + h * 0.66);
      ctx.lineTo(x + w, y + h * 0.66);
      ctx.stroke();
    }
  }

  // Silver electrical busbars
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  for (let c = 1; c < cols; c++) {
    ctx.beginPath();
    ctx.moveTo(c * cellW, 0);
    ctx.lineTo(c * cellW, 256);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  textureCache['solar_panel'] = texture;
  return texture;
}

export function getGoldFoilTexture(): THREE.CanvasTexture {
  if (textureCache['gold_foil']) return textureCache['gold_foil'];

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Base metallic gold
  ctx.fillStyle = '#d4af37';
  ctx.fillRect(0, 0, 256, 256);

  // Wrinkles / Mylar facets
  for (let i = 0; i < 400; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const rad = 4 + Math.random() * 18;
    const alpha = 0.15 + Math.random() * 0.25;

    const grad = ctx.createRadialGradient(x, y, 0, x, y, rad);
    grad.addColorStop(0, Math.random() > 0.5 ? `rgba(255, 235, 130, ${alpha})` : `rgba(160, 110, 20, ${alpha})`);
    grad.addColorStop(1, 'rgba(212, 175, 55, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  // Crinkle lines
  ctx.strokeStyle = 'rgba(100, 70, 10, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 30; i++) {
    ctx.moveTo(Math.random() * 256, Math.random() * 256);
    ctx.lineTo(Math.random() * 256, Math.random() * 256);
  }
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  textureCache['gold_foil'] = texture;
  return texture;
}

export function getThermalTileTexture(): THREE.CanvasTexture {
  if (textureCache['thermal_tile']) return textureCache['thermal_tile'];

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#111317';
  ctx.fillRect(0, 0, 256, 256);

  // Black silica tiles grid
  ctx.strokeStyle = '#23272e';
  ctx.lineWidth = 1.5;
  const step = 16;
  for (let x = 0; x <= 256; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  for (let y = 0; y <= 256; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache['thermal_tile'] = texture;
  return texture;
}

export function getRocketRollPatternTexture(): THREE.CanvasTexture {
  if (textureCache['rocket_roll']) return textureCache['rocket_roll'];

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // White base
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 256, 256);

  // Alternating black roll quadrants
  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillRect(128, 128, 128, 128);

  // NASA Red Worm accent line
  ctx.fillStyle = '#e11d48';
  ctx.fillRect(0, 240, 256, 16);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache['rocket_roll'] = texture;
  return texture;
}

// Helper to enable shadow on all meshes within group
function applyShadows(root: THREE.Object3D) {
  root.traverse(child => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

// Add grounded contact shadow disc at base
function addContactShadow(group: THREE.Group, radius: number, opacity = 0.55) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, `rgba(0, 0, 0, ${opacity})`);
  g.addColorStop(0.5, `rgba(0, 0, 0, ${opacity * 0.4})`);
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);

  const tex = new THREE.CanvasTexture(canvas);
  const geo = new THREE.PlaneGeometry(radius * 2, radius * 2);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.001; // Rest slightly above 0 to prevent z-fighting with floor
  group.add(mesh);
}

// -------------------------------------------------------------
// 1. ISS (International Space Station)
// -------------------------------------------------------------
export function createIssModel(): THREE.Group {
  const group = new THREE.Group();

  const metalMat = new THREE.MeshStandardMaterial({
    color: 0xd4d8e2,
    metalness: 0.85,
    roughness: 0.25,
  });
  const trussMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.9,
    roughness: 0.4,
    wireframe: false,
  });
  const solarTex = getSolarPanelTexture();
  const solarMat = new THREE.MeshStandardMaterial({
    map: solarTex,
    metalness: 0.7,
    roughness: 0.2,
    side: THREE.DoubleSide,
  });
  const radiatorMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.6,
    metalness: 0.1,
  });

  // Base elevation so the whole station sits majestically above its contact shadow
  const baseElev = 0.18;

  // Integrated Truss Structure (ITS)
  const trussGeo = new THREE.BoxGeometry(0.72, 0.024, 0.024);
  const truss = new THREE.Mesh(trussGeo, trussMat);
  truss.position.y = baseElev;
  group.add(truss);

  // Pressurized Living Modules (Zarya, Unity, Destiny, Harmony, Columbus, Kibo)
  const moduleGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.28, 16);
  moduleGeo.rotateZ(Math.PI / 2);
  const mainModule = new THREE.Mesh(moduleGeo, metalMat);
  mainModule.position.set(0, baseElev, 0.04);
  group.add(mainModule);

  // Cross module
  const crossGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.14, 16);
  const crossModule = new THREE.Mesh(crossGeo, metalMat);
  crossModule.position.set(-0.02, baseElev, 0.04);
  group.add(crossModule);

  // Cupola observation bubble
  const cupolaGeo = new THREE.SphereGeometry(0.012, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  const cupolaMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1, metalness: 0.9 });
  const cupola = new THREE.Mesh(cupolaGeo, cupolaMat);
  cupola.rotation.x = Math.PI;
  cupola.position.set(0.04, baseElev - 0.02, 0.04);
  group.add(cupola);

  // 4 Solar Array Wings (Twin panels on each side)
  const wingGeo = new THREE.PlaneGeometry(0.12, 0.26);
  const wingOffsets = [-0.28, -0.2, 0.2, 0.28];
  wingOffsets.forEach(x => {
    // Upper wing
    const wingTop = new THREE.Mesh(wingGeo, solarMat);
    wingTop.position.set(x, baseElev + 0.14, 0);
    wingTop.rotation.x = Math.PI / 6;
    group.add(wingTop);

    // Lower wing
    const wingBot = new THREE.Mesh(wingGeo, solarMat);
    wingBot.position.set(x, baseElev - 0.14, 0);
    wingBot.rotation.x = Math.PI / 6;
    group.add(wingBot);
  });

  // Thermal Radiator Panels
  const radGeo = new THREE.BoxGeometry(0.004, 0.08, 0.14);
  const rad1 = new THREE.Mesh(radGeo, radiatorMat);
  rad1.position.set(-0.08, baseElev, -0.06);
  group.add(rad1);
  const rad2 = new THREE.Mesh(radGeo, radiatorMat);
  rad2.position.set(0.08, baseElev, -0.06);
  group.add(rad2);

  // Communication dishes
  const dishGeo = new THREE.SphereGeometry(0.015, 16, 8, 0, Math.PI * 2, 0, Math.PI / 3);
  const dishMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.8, side: THREE.DoubleSide });
  const dish = new THREE.Mesh(dishGeo, dishMat);
  dish.rotation.x = -Math.PI / 4;
  dish.position.set(0.05, baseElev + 0.03, 0.06);
  group.add(dish);

  // Support pedestal stand to ground it cleanly on AR floor
  const standGeo = new THREE.CylinderGeometry(0.004, 0.006, baseElev, 12);
  const standMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
  const stand = new THREE.Mesh(standGeo, standMat);
  stand.position.y = baseElev / 2;
  group.add(stand);

  addContactShadow(group, 0.35, 0.6);
  applyShadows(group);
  return group;
}

// -------------------------------------------------------------
// 2. Hubble Space Telescope
// -------------------------------------------------------------
export function createHubbleModel(): THREE.Group {
  const group = new THREE.Group();

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xeeeeee,
    metalness: 0.95,
    roughness: 0.15,
  });
  const goldTex = getGoldFoilTexture();
  const goldMat = new THREE.MeshStandardMaterial({
    map: goldTex,
    color: 0xd4af37,
    metalness: 0.85,
    roughness: 0.35,
  });
  const solarTex = getSolarPanelTexture();
  const solarMat = new THREE.MeshStandardMaterial({
    map: solarTex,
    metalness: 0.7,
    roughness: 0.2,
    side: THREE.DoubleSide,
  });

  const baseElev = 0.16;

  // Forward Mirror Cylinder
  const bodyGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.22, 32);
  const body = new THREE.Mesh(bodyGeo, chromeMat);
  body.rotation.z = Math.PI / 2;
  body.position.set(-0.03, baseElev, 0);
  group.add(body);

  // Aft Equipment Section wrapped in gold insulation
  const aftGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.12, 32);
  const aft = new THREE.Mesh(aftGeo, goldMat);
  aft.rotation.z = Math.PI / 2;
  aft.position.set(0.12, baseElev, 0);
  group.add(aft);

  // Aperture Door (Open at 45 degrees)
  const doorGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.005, 32);
  const door = new THREE.Mesh(doorGeo, chromeMat);
  door.rotation.z = Math.PI / 2;
  door.rotation.y = -Math.PI / 4;
  door.position.set(-0.14, baseElev + 0.03, 0);
  group.add(door);

  // Interior dark baffle & secondary mirror
  const darkMat = new THREE.MeshBasicMaterial({ color: 0x05070d });
  const innerGeo = new THREE.CircleGeometry(0.042, 32);
  const inner = new THREE.Mesh(innerGeo, darkMat);
  inner.rotation.y = -Math.PI / 2;
  inner.position.set(-0.138, baseElev, 0);
  group.add(inner);

  // Twin Solar Panel Wings
  const panelGeo = new THREE.PlaneGeometry(0.06, 0.18);
  const panel1 = new THREE.Mesh(panelGeo, solarMat);
  panel1.position.set(0.02, baseElev, 0.14);
  panel1.rotation.x = Math.PI / 4;
  group.add(panel1);

  const panel2 = new THREE.Mesh(panelGeo, solarMat);
  panel2.position.set(0.02, baseElev, -0.14);
  panel2.rotation.x = Math.PI / 4;
  group.add(panel2);

  // Booms connecting solar arrays
  const boomGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.32, 12);
  boomGeo.rotateX(Math.PI / 2);
  const boomMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });
  const boom = new THREE.Mesh(boomGeo, boomMat);
  boom.position.set(0.02, baseElev, 0);
  group.add(boom);

  // High gain antenna dishes
  const dishGeo = new THREE.SphereGeometry(0.018, 16, 8, 0, Math.PI * 2, 0, Math.PI / 3);
  const dishMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.8, side: THREE.DoubleSide });
  const dish1 = new THREE.Mesh(dishGeo, dishMat);
  dish1.rotation.y = Math.PI / 4;
  dish1.position.set(0.12, baseElev + 0.07, 0.05);
  group.add(dish1);

  // Minimal museum-style acrylic/metal stand to rest on floor
  const standGeo = new THREE.CylinderGeometry(0.004, 0.006, baseElev, 12);
  const stand = new THREE.Mesh(standGeo, boomMat);
  stand.position.set(0, baseElev / 2, 0);
  group.add(stand);

  addContactShadow(group, 0.25, 0.6);
  applyShadows(group);
  return group;
}

// -------------------------------------------------------------
// 3. JWST (James Webb Space Telescope)
// -------------------------------------------------------------
export function createJwstModel(): THREE.Group {
  const group = new THREE.Group();

  const baseElev = 0.15;

  // 5-Layer Diamond Kite Sunshield Base
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.25);
  shape.lineTo(0.15, 0);
  shape.lineTo(0, -0.25);
  shape.lineTo(-0.15, 0);
  shape.closePath();

  const sunshieldMat = new THREE.MeshStandardMaterial({
    color: 0xc4b5fd, // Iridescent kapton lavender/silver
    metalness: 0.9,
    roughness: 0.25,
    side: THREE.DoubleSide,
  });

  // Layered sunshield stack
  for (let l = 0; l < 4; l++) {
    const shieldGeo = new THREE.ShapeGeometry(shape);
    const shieldMesh = new THREE.Mesh(shieldGeo, sunshieldMat);
    shieldMesh.rotation.x = -Math.PI / 2;
    shieldMesh.position.y = baseElev + l * 0.006;
    shieldMesh.scale.set(1 - l * 0.02, 1 - l * 0.02, 1);
    group.add(shieldMesh);
  }

  // Golden Honeycomb Primary Mirror (18 Hexagonal Segments)
  const goldTex = getGoldFoilTexture();
  const mirrorMat = new THREE.MeshPhysicalMaterial({
    color: 0xffd700,
    metalness: 0.98,
    roughness: 0.1,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
  });

  const mirrorGroup = new THREE.Group();
  const hexRadius = 0.022;

  // Coordinates for the 18 hexagonal primary mirror segments
  const hexCoords: [number, number][] = [
    [-1, -1], [0, -1], [1, -1],
    [-2, 0], [-1, 0], [1, 0], [2, 0], // Center left out for instrument tower
    [-2, 1], [-1, 1], [0, 1], [1, 1], [2, 1],
    [-1, 2], [0, 2], [1, 2],
    [-1, -2], [0, -2], [1, -2]
  ];

  const hexShape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    const x = hexRadius * Math.cos(a);
    const y = hexRadius * Math.sin(a);
    if (i === 0) hexShape.moveTo(x, y);
    else hexShape.lineTo(x, y);
  }
  hexShape.closePath();
  const hexGeo = new THREE.ShapeGeometry(hexShape);

  hexCoords.forEach(([hx, hy]) => {
    const hexMesh = new THREE.Mesh(hexGeo, mirrorMat);
    const posX = hx * (hexRadius * 1.55);
    const posY = hy * (hexRadius * 1.74) + (Math.abs(hx) % 2 === 1 ? (hexRadius * 0.87) : 0);
    hexMesh.position.set(posX, posY, 0);
    mirrorGroup.add(hexMesh);
  });

  mirrorGroup.rotation.x = -Math.PI / 5; // Tilt up toward deep cosmos
  mirrorGroup.position.set(0, baseElev + 0.06, 0.02);
  group.add(mirrorGroup);

  // Secondary Mirror Tripod Struts
  const strutMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 });
  const strutGeo = new THREE.CylinderGeometry(0.002, 0.002, 0.18);

  const strut1 = new THREE.Mesh(strutGeo, strutMat);
  strut1.position.set(0, baseElev + 0.12, 0.1);
  strut1.rotation.x = Math.PI / 6;
  group.add(strut1);

  // Secondary mirror tiny disc
  const secGeo = new THREE.CircleGeometry(0.012, 16);
  const secMesh = new THREE.Mesh(secGeo, mirrorMat);
  secMesh.position.set(0, baseElev + 0.16, 0.06);
  secMesh.rotation.x = Math.PI - Math.PI / 5;
  group.add(secMesh);

  // Spacecraft bus below sunshield
  const busGeo = new THREE.BoxGeometry(0.06, 0.04, 0.08);
  const busMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.85, roughness: 0.3 });
  const bus = new THREE.Mesh(busGeo, busMat);
  bus.position.set(0, baseElev - 0.02, 0);
  group.add(bus);

  // Ground stand
  const standGeo = new THREE.CylinderGeometry(0.004, 0.008, baseElev, 12);
  const stand = new THREE.Mesh(standGeo, busMat);
  stand.position.y = baseElev / 2;
  group.add(stand);

  addContactShadow(group, 0.28, 0.6);
  applyShadows(group);
  return group;
}

// -------------------------------------------------------------
// 4. Sputnik 1
// -------------------------------------------------------------
export function createSputnikModel(): THREE.Group {
  const group = new THREE.Group();

  const baseElev = 0.14;

  // Mirror-polished aluminum sphere
  const sphereMat = new THREE.MeshStandardMaterial({
    color: 0xeeeeee,
    metalness: 0.98,
    roughness: 0.08,
  });
  const sphereGeo = new THREE.SphereGeometry(0.07, 32, 32);
  const sphere = new THREE.Mesh(sphereGeo, sphereMat);
  sphere.position.y = baseElev;
  group.add(sphere);

  // Equatorial seam flange with bolts
  const flangeGeo = new THREE.TorusGeometry(0.071, 0.003, 16, 32);
  flangeGeo.rotateX(Math.PI / 2);
  const flange = new THREE.Mesh(flangeGeo, sphereMat);
  flange.position.y = baseElev;
  group.add(flange);

  // 4 Trailing Whip Antennas extending backward
  const antennaMat = new THREE.MeshStandardMaterial({
    color: 0xc0c8d4,
    metalness: 0.95,
    roughness: 0.2,
  });
  const antGeo = new THREE.CylinderGeometry(0.0018, 0.0018, 0.32, 8);

  const angles = [
    { yaw: 0.4, pitch: -0.6 },
    { yaw: -0.4, pitch: -0.6 },
    { yaw: 2.7, pitch: -0.6 },
    { yaw: 3.5, pitch: -0.6 },
  ];

  angles.forEach(({ yaw, pitch }) => {
    const ant = new THREE.Mesh(antGeo, antennaMat);
    ant.position.set(0, baseElev, 0);
    ant.rotation.y = yaw;
    ant.rotation.x = pitch;
    ant.translateY(-0.16);
    group.add(ant);
  });

  // Display Ring Stand
  const ringGeo = new THREE.TorusGeometry(0.05, 0.004, 16, 32);
  ringGeo.rotateX(Math.PI / 2);
  const ringStand = new THREE.Mesh(ringGeo, antennaMat);
  ringStand.position.y = 0.004;
  group.add(ringStand);

  // 3 Stand Leg Struts
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3;
    const legGeo = new THREE.CylinderGeometry(0.002, 0.002, baseElev, 8);
    const leg = new THREE.Mesh(legGeo, antennaMat);
    leg.position.set(Math.cos(a) * 0.035, baseElev / 2, Math.sin(a) * 0.035);
    group.add(leg);
  }

  addContactShadow(group, 0.2, 0.65);
  applyShadows(group);
  return group;
}

// -------------------------------------------------------------
// 5. Saturn V Rocket
// -------------------------------------------------------------
export function createSaturnVModel(): THREE.Group {
  const group = new THREE.Group();

  const rollTex = getRocketRollPatternTexture();
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35, metalness: 0.2 });
  const blackMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.3 });
  const rollMat = new THREE.MeshStandardMaterial({ map: rollTex, roughness: 0.3, metalness: 0.2 });
  const engineMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.85 });

  let curY = 0;

  // 5 F-1 Engine Nozzles at Base (resting on ground)
  const enginePositions = [
    [0, 0],
    [0.032, 0.032],
    [-0.032, 0.032],
    [0.032, -0.032],
    [-0.032, -0.032],
  ];
  enginePositions.forEach(([ex, ez]) => {
    const nozzleGeo = new THREE.ConeGeometry(0.02, 0.045, 16, 1, true);
    const nozzle = new THREE.Mesh(nozzleGeo, engineMat);
    nozzle.position.set(ex, 0.0225, ez);
    group.add(nozzle);
  });
  curY += 0.045;

  // S-IC First Stage
  const s1Geo = new THREE.CylinderGeometry(0.055, 0.055, 0.18, 32);
  const s1 = new THREE.Mesh(s1Geo, rollMat);
  s1.position.y = curY + 0.09;
  group.add(s1);

  // 4 Aerodynamic base fins
  for (let i = 0; i < 4; i++) {
    const finShape = new THREE.Shape();
    finShape.moveTo(0, 0);
    finShape.lineTo(0.04, 0);
    finShape.lineTo(0, 0.06);
    finShape.closePath();
    const finGeo = new THREE.ShapeGeometry(finShape);
    const fin = new THREE.Mesh(finGeo, blackMat);
    fin.rotation.y = (i * Math.PI) / 2;
    fin.position.set(0, curY + 0.01, 0);
    fin.translateX(0.054);
    group.add(fin);
  }
  curY += 0.18;

  // Interstage Ring
  const ringGeo = new THREE.CylinderGeometry(0.052, 0.055, 0.02, 32);
  const ring = new THREE.Mesh(ringGeo, blackMat);
  ring.position.y = curY + 0.01;
  group.add(ring);
  curY += 0.02;

  // S-II Second Stage
  const s2Geo = new THREE.CylinderGeometry(0.05, 0.05, 0.12, 32);
  const s2 = new THREE.Mesh(s2Geo, whiteMat);
  s2.position.y = curY + 0.06;
  group.add(s2);
  curY += 0.12;

  // S-IVB Third Stage
  const s3Geo = new THREE.CylinderGeometry(0.04, 0.048, 0.08, 32);
  const s3 = new THREE.Mesh(s3Geo, rollMat);
  s3.position.y = curY + 0.04;
  group.add(s3);
  curY += 0.08;

  // Apollo CSM / Service Module
  const csmGeo = new THREE.CylinderGeometry(0.032, 0.04, 0.05, 32);
  const csmMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.9, roughness: 0.2 });
  const csm = new THREE.Mesh(csmGeo, csmMat);
  csm.position.y = curY + 0.025;
  group.add(csm);
  curY += 0.05;

  // Command Module Cone (Capsule)
  const cmGeo = new THREE.ConeGeometry(0.032, 0.03, 32);
  const cmMat = new THREE.MeshStandardMaterial({ color: 0xe5e7eb, metalness: 0.8, roughness: 0.3 });
  const cm = new THREE.Mesh(cmGeo, cmMat);
  cm.position.y = curY + 0.015;
  group.add(cm);
  curY += 0.03;

  // Launch Escape Tower (LET)
  const towerGeo = new THREE.CylinderGeometry(0.003, 0.008, 0.06, 12);
  const towerMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, metalness: 0.7, roughness: 0.3 });
  const tower = new THREE.Mesh(towerGeo, towerMat);
  tower.position.y = curY + 0.03;
  group.add(tower);

  // Escape Rocket Cone
  const escConeGeo = new THREE.ConeGeometry(0.006, 0.02, 12);
  const escCone = new THREE.Mesh(escConeGeo, whiteMat);
  escCone.position.y = curY + 0.06 + 0.01;
  group.add(escCone);

  addContactShadow(group, 0.18, 0.75);
  applyShadows(group);
  return group;
}

// -------------------------------------------------------------
// 6. Starship & Super Heavy
// -------------------------------------------------------------
export function createStarshipModel(): THREE.Group {
  const group = new THREE.Group();

  const steelMat = new THREE.MeshPhysicalMaterial({
    color: 0xd8e0eb,
    metalness: 0.95,
    roughness: 0.18,
    clearcoat: 0.6,
  });
  const tileMat = new THREE.MeshStandardMaterial({
    map: getThermalTileTexture(),
    metalness: 0.2,
    roughness: 0.8,
  });
  const engineMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.4 });

  let curY = 0;

  // Super Heavy Raptor Engines (33 engines ring at base)
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI * 2) / 12;
    const nozzleGeo = new THREE.ConeGeometry(0.012, 0.035, 12, 1, true);
    const nozzle = new THREE.Mesh(nozzleGeo, engineMat);
    nozzle.position.set(Math.cos(a) * 0.04, 0.0175, Math.sin(a) * 0.04);
    group.add(nozzle);
  }
  curY += 0.035;

  // Super Heavy Booster (Stainless steel body)
  const boosterGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.28, 32);
  const booster = new THREE.Mesh(boosterGeo, steelMat);
  booster.position.y = curY + 0.14;
  group.add(booster);

  // 4 Grid Fins on Booster
  for (let i = 0; i < 4; i++) {
    const finGeo = new THREE.BoxGeometry(0.035, 0.02, 0.004);
    const fin = new THREE.Mesh(finGeo, engineMat);
    fin.rotation.y = (i * Math.PI) / 2;
    fin.position.set(0, curY + 0.27, 0);
    fin.translateX(0.068);
    group.add(fin);
  }
  curY += 0.28;

  // Interstage Hot-Staging Ring
  const stageGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.02, 32, 1, true);
  const stageRing = new THREE.Mesh(stageGeo, engineMat);
  stageRing.position.y = curY + 0.01;
  group.add(stageRing);
  curY += 0.02;

  // Starship Upper Stage Body
  const shipGeo = new THREE.CylinderGeometry(0.053, 0.053, 0.16, 32);
  const ship = new THREE.Mesh(shipGeo, steelMat);
  ship.position.y = curY + 0.08;
  group.add(ship);

  // Black Heat Shield half on Starship belly
  const shieldGeo = new THREE.CylinderGeometry(0.0535, 0.0535, 0.16, 16, 1, false, 0, Math.PI);
  const shield = new THREE.Mesh(shieldGeo, tileMat);
  shield.position.y = curY + 0.08;
  group.add(shield);

  // 2 Aft Flaps
  const flapGeo = new THREE.BoxGeometry(0.035, 0.06, 0.004);
  const aftFlapL = new THREE.Mesh(flapGeo, steelMat);
  aftFlapL.position.set(-0.068, curY + 0.04, 0);
  group.add(aftFlapL);
  const aftFlapR = new THREE.Mesh(flapGeo, steelMat);
  aftFlapR.position.set(0.068, curY + 0.04, 0);
  group.add(aftFlapR);
  curY += 0.16;

  // Nosecone with conical taper
  const noseGeo = new THREE.ConeGeometry(0.053, 0.1, 32);
  const nose = new THREE.Mesh(noseGeo, steelMat);
  nose.position.y = curY + 0.05;
  group.add(nose);

  // Forward Flaps (Canards)
  const canardGeo = new THREE.BoxGeometry(0.025, 0.03, 0.003);
  const canardL = new THREE.Mesh(canardGeo, steelMat);
  canardL.position.set(-0.055, curY + 0.03, 0);
  group.add(canardL);
  const canardR = new THREE.Mesh(canardGeo, steelMat);
  canardR.position.set(0.055, curY + 0.03, 0);
  group.add(canardR);

  addContactShadow(group, 0.18, 0.7);
  applyShadows(group);
  return group;
}

// -------------------------------------------------------------
// 7. Space Launch System (SLS / Artemis)
// -------------------------------------------------------------
export function createSlsModel(): THREE.Group {
  const group = new THREE.Group();

  const orangeMat = new THREE.MeshStandardMaterial({
    color: 0xc86428, // Burnt orange spray foam
    roughness: 0.7,
    metalness: 0.1,
  });
  const srbMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.35,
    metalness: 0.2,
  });
  const blackMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.3 });
  const engineMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.85 });

  let curY = 0;

  // 4 RS-25 Core Engines
  const enginePos = [
    [0.02, 0.02],
    [-0.02, 0.02],
    [0.02, -0.02],
    [-0.02, -0.02],
  ];
  enginePos.forEach(([ex, ez]) => {
    const nozzleGeo = new THREE.ConeGeometry(0.014, 0.032, 16, 1, true);
    const nozzle = new THREE.Mesh(nozzleGeo, engineMat);
    nozzle.position.set(ex, 0.016, ez);
    group.add(nozzle);
  });
  curY += 0.032;

  // Orange Core Stage
  const coreGeo = new THREE.CylinderGeometry(0.048, 0.048, 0.34, 32);
  const core = new THREE.Mesh(coreGeo, orangeMat);
  core.position.y = curY + 0.17;
  group.add(core);

  // Twin Solid Rocket Boosters (SRBs)
  [-0.07, 0.07].forEach(srbX => {
    // SRB Nozzle resting near ground
    const srbNozzleGeo = new THREE.ConeGeometry(0.016, 0.03, 16, 1, true);
    const srbNozzle = new THREE.Mesh(srbNozzleGeo, engineMat);
    srbNozzle.position.set(srbX, 0.015, 0);
    group.add(srbNozzle);

    // SRB White Cylinder
    const srbBodyGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.34, 24);
    const srbBody = new THREE.Mesh(srbBodyGeo, srbMat);
    srbBody.position.set(srbX, curY + 0.16, 0);
    group.add(srbBody);

    // SRB Nose cone
    const srbNoseGeo = new THREE.ConeGeometry(0.024, 0.05, 24);
    const srbNose = new THREE.Mesh(srbNoseGeo, srbMat);
    srbNose.position.set(srbX, curY + 0.33 + 0.025, 0);
    group.add(srbNose);
  });
  curY += 0.34;

  // Orion Spacecraft adapter & capsule
  const orionGeo = new THREE.ConeGeometry(0.042, 0.04, 32);
  const orion = new THREE.Mesh(orionGeo, srbMat);
  orion.position.y = curY + 0.02;
  group.add(orion);
  curY += 0.04;

  // Launch Abort System (LAS) Tower
  const lasTowerGeo = new THREE.CylinderGeometry(0.003, 0.008, 0.06, 12);
  const lasTower = new THREE.Mesh(lasTowerGeo, srbMat);
  lasTower.position.y = curY + 0.03;
  group.add(lasTower);

  const lasNoseGeo = new THREE.ConeGeometry(0.006, 0.02, 12);
  const lasNose = new THREE.Mesh(lasNoseGeo, blackMat);
  lasNose.position.y = curY + 0.06 + 0.01;
  group.add(lasNose);

  addContactShadow(group, 0.22, 0.7);
  applyShadows(group);
  return group;
}

// -------------------------------------------------------------
// 8. Apollo Lunar Lander ("Eagle")
// -------------------------------------------------------------
export function createApolloLanderModel(): THREE.Group {
  const group = new THREE.Group();

  const goldTex = getGoldFoilTexture();
  const goldMat = new THREE.MeshStandardMaterial({
    map: goldTex,
    color: 0xd4af37,
    roughness: 0.38,
    metalness: 0.85,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.5,
    metalness: 0.5,
  });
  const grayMat = new THREE.MeshStandardMaterial({
    color: 0xd1d5db,
    roughness: 0.35,
    metalness: 0.75,
  });
  const padMat = new THREE.MeshStandardMaterial({
    color: 0xe5e7eb,
    metalness: 0.8,
    roughness: 0.3,
  });

  // Leg Height and geometry
  const legHeight = 0.075;
  const legSpan = 0.14;

  // 4 Landing Struts and Footpads resting on floor (y=0)
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const px = Math.cos(a) * legSpan;
    const pz = Math.sin(a) * legSpan;

    // Circular footpad touching y=0
    const padGeo = new THREE.CylinderGeometry(0.022, 0.024, 0.004, 16);
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.set(px, 0.002, pz);
    group.add(pad);

    // Primary strut from cabin down to footpad
    const strutGeo = new THREE.CylinderGeometry(0.003, 0.004, legHeight * 1.5, 8);
    const strut = new THREE.Mesh(strutGeo, padMat);
    strut.position.set(px * 0.65, legHeight * 0.55, pz * 0.65);
    strut.lookAt(px, 0.002, pz);
    strut.rotateX(Math.PI / 2);
    group.add(strut);
  }

  // Octagonal Gold Descent Stage
  const descentGeo = new THREE.CylinderGeometry(0.08, 0.088, 0.055, 8);
  const descentStage = new THREE.Mesh(descentGeo, goldMat);
  descentStage.position.y = legHeight + 0.0275;
  group.add(descentStage);

  // Descent Engine Bell pointing downward
  const bellGeo = new THREE.ConeGeometry(0.028, 0.045, 16, 1, true);
  const bell = new THREE.Mesh(bellGeo, darkMat);
  bell.position.y = legHeight - 0.01;
  group.add(bell);

  // Faceted Ascent Stage Cabin (Neil & Buzz cabin)
  const cabinGeo = new THREE.DodecahedronGeometry(0.065, 0);
  const cabin = new THREE.Mesh(cabinGeo, grayMat);
  cabin.position.y = legHeight + 0.055 + 0.05;
  cabin.scale.set(1.1, 0.9, 1.0);
  group.add(cabin);

  // Triangular Cockpit Windows
  const winGeo = new THREE.PlaneGeometry(0.02, 0.015);
  const winMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
  const winL = new THREE.Mesh(winGeo, winMat);
  winL.position.set(-0.022, legHeight + 0.11, 0.062);
  winL.rotation.y = -0.2;
  group.add(winL);
  const winR = new THREE.Mesh(winGeo, winMat);
  winR.position.set(0.022, legHeight + 0.11, 0.062);
  winR.rotation.y = 0.2;
  group.add(winR);

  // Rendezvous Radar Antenna Dish
  const radarGeo = new THREE.SphereGeometry(0.014, 16, 8, 0, Math.PI * 2, 0, Math.PI / 3);
  const radar = new THREE.Mesh(radarGeo, padMat);
  radar.rotation.x = -Math.PI / 3;
  radar.position.set(0.035, legHeight + 0.16, 0.02);
  group.add(radar);

  // 4 RCS Thruster Quads
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    const rcsBase = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.012), darkMat);
    rcsBase.position.set(Math.cos(a) * 0.075, legHeight + 0.1, Math.sin(a) * 0.075);
    group.add(rcsBase);
  }

  addContactShadow(group, 0.26, 0.7);
  applyShadows(group);
  return group;
}

// -------------------------------------------------------------
// 9. Voyager 1 Interstellar Probe
// -------------------------------------------------------------
export function createVoyagerModel(): THREE.Group {
  const group = new THREE.Group();

  const baseElev = 0.14;

  const whiteMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.35,
    metalness: 0.2,
    side: THREE.DoubleSide,
  });
  const goldTex = getGoldFoilTexture();
  const goldMat = new THREE.MeshPhysicalMaterial({
    map: goldTex,
    color: 0xf59e0b,
    metalness: 0.95,
    roughness: 0.15,
  });
  const busMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.85,
    roughness: 0.3,
  });

  // 3.7m Parabolic High-Gain Dish Antenna
  const dishGeo = new THREE.SphereGeometry(0.12, 32, 16, 0, Math.PI * 2, 0, Math.PI / 3.5);
  const dish = new THREE.Mesh(dishGeo, whiteMat);
  dish.rotation.x = -Math.PI / 4;
  dish.position.set(0, baseElev + 0.04, 0);
  group.add(dish);

  // Sub-reflector Feed Horn Tripod
  const feedGeo = new THREE.CylinderGeometry(0.002, 0.002, 0.07, 8);
  const feed = new THREE.Mesh(feedGeo, busMat);
  feed.rotation.x = -Math.PI / 4;
  feed.position.set(0, baseElev + 0.09, 0.05);
  group.add(feed);

  // Decagonal Spacecraft Bus Body
  const busGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.035, 10);
  const bus = new THREE.Mesh(busGeo, busMat);
  bus.position.set(0, baseElev - 0.02, 0);
  group.add(bus);

  // Golden Record attached to bus side
  const recordGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.002, 32);
  recordGeo.rotateZ(Math.PI / 2);
  const record = new THREE.Mesh(recordGeo, goldMat);
  record.position.set(0.046, baseElev - 0.02, 0);
  group.add(record);

  // RTG Power Boom with cooling fins
  const boomMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9, roughness: 0.3 });
  const rtgBoomGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.16, 8);
  rtgBoomGeo.rotateZ(Math.PI / 2.5);
  const rtgBoom = new THREE.Mesh(rtgBoomGeo, boomMat);
  rtgBoom.position.set(-0.09, baseElev - 0.03, 0);
  group.add(rtgBoom);

  // RTG Canister
  const rtgCanGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.04, 12);
  rtgCanGeo.rotateZ(Math.PI / 2);
  const rtgCan = new THREE.Mesh(rtgCanGeo, busMat);
  rtgCan.position.set(-0.16, baseElev - 0.05, 0);
  group.add(rtgCan);

  // Magnetometer Boom (Long thin boom)
  const magBoomGeo = new THREE.CylinderGeometry(0.0015, 0.0015, 0.28, 8);
  magBoomGeo.rotateX(Math.PI / 2);
  const magBoom = new THREE.Mesh(magBoomGeo, boomMat);
  magBoom.position.set(0, baseElev - 0.02, -0.14);
  group.add(magBoom);

  // Clean support pedestal on floor
  const standGeo = new THREE.CylinderGeometry(0.004, 0.008, baseElev, 12);
  const stand = new THREE.Mesh(standGeo, busMat);
  stand.position.y = baseElev / 2;
  group.add(stand);

  addContactShadow(group, 0.26, 0.6);
  applyShadows(group);
  return group;
}

// -------------------------------------------------------------
// 10. Perseverance Mars Rover
// -------------------------------------------------------------
export function createMarsRoverModel(): THREE.Group {
  const group = new THREE.Group();

  const chassisMat = new THREE.MeshStandardMaterial({
    color: 0xf4f4f5,
    roughness: 0.45,
    metalness: 0.35,
  });
  const wheelMat = new THREE.MeshStandardMaterial({
    color: 0x3f3f46,
    metalness: 0.8,
    roughness: 0.4,
  });
  const goldTex = getGoldFoilTexture();
  const rtgMat = new THREE.MeshStandardMaterial({
    map: goldTex,
    color: 0xd97706,
    metalness: 0.8,
    roughness: 0.35,
  });
  const cameraMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.1,
    metalness: 0.9,
  });

  const wheelRadius = 0.024;
  const wheelWidth = 0.016;

  // 6 Wheels on Rocker-Bogie touching y=0
  const wheelPositions: [number, number][] = [
    [-0.08, 0.08],
    [0.08, 0.08],
    [-0.09, 0],
    [0.09, 0],
    [-0.08, -0.08],
    [0.08, -0.08],
  ];

  wheelPositions.forEach(([wx, wz]) => {
    const wGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 16);
    wGeo.rotateZ(Math.PI / 2);
    const wheel = new THREE.Mesh(wGeo, wheelMat);
    wheel.position.set(wx, wheelRadius, wz);
    group.add(wheel);

    // Tread lines
    const treadGeo = new THREE.TorusGeometry(wheelRadius, 0.002, 8, 16);
    treadGeo.rotateY(Math.PI / 2);
    const tread = new THREE.Mesh(treadGeo, wheelMat);
    tread.position.set(wx, wheelRadius, wz);
    group.add(tread);
  });

  // Suspension Rocker Struts
  const strutMat = new THREE.MeshStandardMaterial({ color: 0x27272a, metalness: 0.9, roughness: 0.3 });
  const strutL = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.01, 0.17), strutMat);
  strutL.position.set(-0.065, wheelRadius + 0.015, 0);
  group.add(strutL);
  const strutR = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.01, 0.17), strutMat);
  strutR.position.set(0.065, wheelRadius + 0.015, 0);
  group.add(strutR);

  // Main Rover Chassis Body
  const chassisY = wheelRadius + 0.038;
  const chassisGeo = new THREE.BoxGeometry(0.11, 0.045, 0.15);
  const chassis = new THREE.Mesh(chassisGeo, chassisMat);
  chassis.position.set(0, chassisY, 0);
  group.add(chassis);

  // Remote Sensing Mast (Neck & Mastcam Head)
  const mastGeo = new THREE.CylinderGeometry(0.004, 0.005, 0.12, 12);
  const mast = new THREE.Mesh(mastGeo, chassisMat);
  mast.position.set(0.032, chassisY + 0.06, 0.05);
  group.add(mast);

  // Mastcam Head
  const headGeo = new THREE.BoxGeometry(0.032, 0.02, 0.02);
  const head = new THREE.Mesh(headGeo, chassisMat);
  head.position.set(0.032, chassisY + 0.12, 0.05);
  group.add(head);

  // Dual camera lenses
  const lensGeo = new THREE.CircleGeometry(0.004, 16);
  const lens1 = new THREE.Mesh(lensGeo, cameraMat);
  lens1.position.set(0.025, chassisY + 0.12, 0.061);
  group.add(lens1);
  const lens2 = new THREE.Mesh(lensGeo, cameraMat);
  lens2.position.set(0.039, chassisY + 0.12, 0.061);
  group.add(lens2);

  // Articulated Robotic Arm in front
  const armMat = new THREE.MeshStandardMaterial({ color: 0x52525b, metalness: 0.85, roughness: 0.3 });
  const arm1 = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.06, 8), armMat);
  arm1.position.set(-0.035, chassisY, 0.09);
  arm1.rotation.x = Math.PI / 3;
  group.add(arm1);

  // Drill Turret at end of arm
  const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.02, 12), armMat);
  turret.position.set(-0.035, chassisY - 0.015, 0.12);
  turret.rotation.z = Math.PI / 2;
  group.add(turret);

  // MMRTG Nuclear Generator at rear
  const rtgGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.055, 12);
  rtgGeo.rotateX(Math.PI / 2);
  const rtg = new THREE.Mesh(rtgGeo, rtgMat);
  rtg.position.set(0, chassisY + 0.01, -0.09);
  group.add(rtg);

  addContactShadow(group, 0.22, 0.7);
  applyShadows(group);
  return group;
}

// -------------------------------------------------------------
// 11. Space Shuttle Orbiter
// -------------------------------------------------------------
export function createSpaceShuttleModel(): THREE.Group {
  const group = new THREE.Group();

  const whiteMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.35,
    metalness: 0.25,
  });
  const blackTileMat = new THREE.MeshStandardMaterial({
    map: getThermalTileTexture(),
    metalness: 0.3,
    roughness: 0.7,
  });
  const cockpitMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.9,
    roughness: 0.15,
  });
  const engineMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.4 });

  const elevY = 0.05;

  // Main Fuselage
  const fuseGeo = new THREE.CylinderGeometry(0.04, 0.042, 0.26, 32);
  fuseGeo.rotateX(Math.PI / 2);
  const fuselage = new THREE.Mesh(fuseGeo, whiteMat);
  fuselage.position.set(0, elevY + 0.04, 0);
  group.add(fuselage);

  // Black Thermal Tile Belly Underbody
  const bellyGeo = new THREE.CylinderGeometry(0.0405, 0.0425, 0.26, 16, 1, false, Math.PI / 2, Math.PI);
  bellyGeo.rotateX(Math.PI / 2);
  const belly = new THREE.Mesh(bellyGeo, blackTileMat);
  belly.position.set(0, elevY + 0.04, 0);
  group.add(belly);

  // Conical Nose Cap
  const noseGeo = new THREE.ConeGeometry(0.04, 0.07, 32);
  noseGeo.rotateX(-Math.PI / 2);
  const nose = new THREE.Mesh(noseGeo, blackTileMat);
  nose.position.set(0, elevY + 0.04, 0.165);
  group.add(nose);

  // Cockpit Windshield (angled black glass strips)
  const windshieldGeo = new THREE.PlaneGeometry(0.035, 0.016);
  const windshield = new THREE.Mesh(windshieldGeo, cockpitMat);
  windshield.rotation.x = -Math.PI / 3;
  windshield.position.set(0, elevY + 0.072, 0.12);
  group.add(windshield);

  // Double-Delta Wings
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0.06);
  wingShape.lineTo(0.14, -0.08);
  wingShape.lineTo(0.14, -0.12);
  wingShape.lineTo(-0.14, -0.12);
  wingShape.lineTo(-0.14, -0.08);
  wingShape.closePath();

  const wingGeo = new THREE.ShapeGeometry(wingShape);
  const wings = new THREE.Mesh(wingGeo, whiteMat);
  wings.rotation.x = -Math.PI / 2;
  wings.position.set(0, elevY + 0.02, 0);
  group.add(wings);

  // Vertical Tail Fin & Rudder
  const tailShape = new THREE.Shape();
  tailShape.moveTo(0, 0);
  tailShape.lineTo(0, 0.09);
  tailShape.lineTo(0.04, 0.09);
  tailShape.lineTo(0.08, 0);
  tailShape.closePath();
  const tailGeo = new THREE.ShapeGeometry(tailShape);
  const tail = new THREE.Mesh(tailGeo, whiteMat);
  tail.rotation.y = Math.PI / 2;
  tail.position.set(0, elevY + 0.07, -0.08);
  group.add(tail);

  // 3 SSME Main Rocket Engines
  const ssmePos = [
    [0, elevY + 0.06, -0.145],
    [-0.022, elevY + 0.03, -0.145],
    [0.022, elevY + 0.03, -0.145],
  ];
  ssmePos.forEach(([ex, ey, ez]) => {
    const nozzleGeo = new THREE.ConeGeometry(0.014, 0.03, 16, 1, true);
    nozzleGeo.rotateX(Math.PI / 2);
    const nozzle = new THREE.Mesh(nozzleGeo, engineMat);
    nozzle.position.set(ex, ey, ez);
    group.add(nozzle);
  });

  // Tricycle Landing Gear resting on floor (y=0)
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9, metalness: 0.1 });
  const gearMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8, roughness: 0.3 });

  // Front Nose Gear
  const noseTireGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.008, 16);
  noseTireGeo.rotateZ(Math.PI / 2);
  const noseTire = new THREE.Mesh(noseTireGeo, tireMat);
  noseTire.position.set(0, 0.01, 0.11);
  group.add(noseTire);

  const noseStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, elevY + 0.02, 8), gearMat);
  noseStrut.position.set(0, (elevY + 0.02) / 2, 0.11);
  group.add(noseStrut);

  // Rear Main Landing Gear
  [-0.05, 0.05].forEach(rx => {
    const mainTire = new THREE.Mesh(noseTireGeo, tireMat);
    mainTire.position.set(rx, 0.01, -0.03);
    group.add(mainTire);

    const mainStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, elevY, 8), gearMat);
    mainStrut.position.set(rx, elevY / 2, -0.03);
    group.add(mainStrut);
  });

  addContactShadow(group, 0.26, 0.7);
  applyShadows(group);
  return group;
}

// -------------------------------------------------------------
// Master Factory for Spacecraft
// -------------------------------------------------------------
export function createSpacecraftObject(id: SpacecraftId): THREE.Group {
  switch (id) {
    case 'iss':
      return createIssModel();
    case 'hubble':
      return createHubbleModel();
    case 'jwst':
      return createJwstModel();
    case 'sputnik':
      return createSputnikModel();
    case 'saturn-v':
      return createSaturnVModel();
    case 'starship':
      return createStarshipModel();
    case 'sls':
      return createSlsModel();
    case 'apollo-lander':
      return createApolloLanderModel();
    case 'voyager':
      return createVoyagerModel();
    case 'mars-rover':
      return createMarsRoverModel();
    case 'space-shuttle':
      return createSpaceShuttleModel();
    default:
      return createIssModel();
  }
}

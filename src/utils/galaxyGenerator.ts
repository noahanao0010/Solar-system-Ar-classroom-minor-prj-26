import * as THREE from 'three';

// Generate a soft round star glow texture for points
let starTextureCache: THREE.CanvasTexture | null = null;
export function getStarPointTexture(): THREE.CanvasTexture {
  if (starTextureCache) return starTextureCache;

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.2, 'rgba(220, 240, 255, 0.8)');
  grad.addColorStop(0.5, 'rgba(120, 180, 255, 0.25)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);

  starTextureCache = new THREE.CanvasTexture(canvas);
  return starTextureCache;
}

export function create3DGalaxy(galaxyId: string, particleCount = 18000): THREE.Group {
  const group = new THREE.Group();
  const starTex = getStarPointTexture();

  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);

  // Core colors
  const colorInside = new THREE.Color('#ffddaa'); // Warm amber core
  const colorMiddle = new THREE.Color('#67e8f9'); // Cyan-blue spiral arms
  const colorOutside = new THREE.Color('#3b82f6'); // Deep blue outer halo
  const colorNebula = new THREE.Color('#f43f5e'); // Pink H-II regions
  const colorDust = new THREE.Color('#292524'); // Dark dust

  let armCount = 2;
  let radius = 6.0;
  let spin = 1.0;
  let randomness = 0.35;
  let randomnessPower = 3;
  let hasBar = false;
  let isRing = false;
  let isCigarStarburst = false;
  let hasEdgeDustRing = false;
  const isCosmicWeb = galaxyId === 'cosmic-web';
  const isObservableUniverse = galaxyId === 'observable-universe';

  // Cosmic Web supercluster anchors
  const superclusterNodes = [
    new THREE.Vector3(0, 0, 0),          // Laniakea Core
    new THREE.Vector3(2.8, 1.2, -1.8),   // Perseus-Pisces
    new THREE.Vector3(-3.2, 0.8, 2.1),   // Shapley Attractor
    new THREE.Vector3(1.5, -2.4, 2.6),   // Coma Supercluster
    new THREE.Vector3(-2.1, -1.6, -2.8), // Hercules
    new THREE.Vector3(3.6, -0.6, 0.9),   // Great Attractor
    new THREE.Vector3(-1.2, 2.9, -1.4),  // Corona Borealis
    new THREE.Vector3(0.5, 3.2, 2.2),    // Virgo Node
  ];

  // Customize based on galaxy type
  if (galaxyId === 'milky-way') {
    armCount = 4;
    hasBar = true;
    spin = 1.2;
    radius = 6.0;
  } else if (galaxyId === 'andromeda') {
    armCount = 2;
    spin = 1.4;
    radius = 7.5;
    randomness = 0.25;
  } else if (galaxyId === 'triangulum') {
    armCount = 3;
    spin = 0.8;
    radius = 5.2;
    randomness = 0.55; // flocculent, loose
  } else if (galaxyId === 'sombrero') {
    hasEdgeDustRing = true;
    armCount = 2;
    radius = 6.2;
    randomness = 0.2;
  } else if (galaxyId === 'whirlpool') {
    armCount = 2;
    spin = 1.6;
    radius = 6.0;
    randomness = 0.22;
  } else if (galaxyId === 'cartwheel') {
    isRing = true;
    radius = 6.5;
  } else if (galaxyId === 'cigar') {
    isCigarStarburst = true;
    radius = 5.5;
  } else if (galaxyId === 'large-magellanic-cloud') {
    armCount = 1;
    hasBar = true;
    radius = 4.8;
    randomness = 0.6;
  } else if (isCosmicWeb) {
    radius = 8.5;
  } else if (isObservableUniverse) {
    radius = 9.0;
  }

  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;

    // Special: Intergalactic Cosmic Web Network Architecture
    if (isCosmicWeb) {
      const mode = i % 10;
      if (mode < 4) {
        // Clustered around supercluster nodes
        const node = superclusterNodes[i % superclusterNodes.length];
        const spread = 0.7 + Math.random() * 0.5;
        positions[i3] = node.x + (Math.random() - 0.5) * spread;
        positions[i3 + 1] = node.y + (Math.random() - 0.5) * spread;
        positions[i3 + 2] = node.z + (Math.random() - 0.5) * spread;

        // Radiant violet/cyan node cores
        colors[i3] = 0.88;
        colors[i3 + 1] = 0.65;
        colors[i3 + 2] = 1.0;
        sizes[i] = 2.0;
      } else if (mode < 8) {
        // Connecting filament strands between nodes
        const nA = superclusterNodes[i % superclusterNodes.length];
        const nB = superclusterNodes[(i + 1 + (i % 3)) % superclusterNodes.length];
        const t = Math.random();
        const strandDisplacement = 0.35 * Math.sin(t * Math.PI);

        positions[i3] = THREE.MathUtils.lerp(nA.x, nB.x, t) + (Math.random() - 0.5) * strandDisplacement;
        positions[i3 + 1] = THREE.MathUtils.lerp(nA.y, nB.y, t) + (Math.random() - 0.5) * strandDisplacement;
        positions[i3 + 2] = THREE.MathUtils.lerp(nA.z, nB.z, t) + (Math.random() - 0.5) * strandDisplacement;

        // Cyan / Electric Blue gas filaments
        colors[i3] = 0.35;
        colors[i3 + 1] = 0.85;
        colors[i3 + 2] = 1.0;
        sizes[i] = 1.4;
      } else {
        // Diffuse intergalactic void matter
        const r = Math.pow(Math.random(), 0.7) * radius;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        positions[i3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i3 + 2] = r * Math.cos(phi);

        colors[i3] = 0.6;
        colors[i3 + 1] = 0.4;
        colors[i3 + 2] = 0.9;
        sizes[i] = 0.9;
      }
      continue;
    }

    // Special: Observable Universe Spherical Horizon Architecture
    if (isObservableUniverse) {
      const mode = i % 10;
      if (mode < 4) {
        // Outer CMB boundary sphere
        const r = 8.0 + Math.random() * 0.5;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        positions[i3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i3 + 2] = r * Math.cos(phi);

        const fluctuation = Math.sin(positions[i3] * 1.5) * Math.cos(positions[i3 + 1] * 1.5);
        if (fluctuation > 0.25) {
          colors[i3] = 1.0; colors[i3 + 1] = 0.45; colors[i3 + 2] = 0.3; // Warm orange CMB spot
        } else if (fluctuation < -0.25) {
          colors[i3] = 0.25; colors[i3 + 1] = 0.75; colors[i3 + 2] = 1.0; // Cool cyan CMB spot
        } else {
          colors[i3] = 0.75; colors[i3 + 1] = 0.45; colors[i3 + 2] = 0.95; // Mid purple
        }
        sizes[i] = 1.8;
      } else if (mode < 7) {
        // Intermediate cosmic epochs
        const r = 4.5 + Math.random() * 2.2;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        positions[i3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i3 + 2] = r * Math.cos(phi);

        colors[i3] = 0.95;
        colors[i3 + 1] = 0.8;
        colors[i3 + 2] = 0.4;
        sizes[i] = 1.3;
      } else {
        // Local volume and nearby galaxy clusters
        const r = Math.pow(Math.random(), 1.5) * 3.5;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        positions[i3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i3 + 2] = r * Math.cos(phi);

        colors[i3] = 0.4;
        colors[i3 + 1] = 0.88;
        colors[i3 + 2] = 1.0;
        sizes[i] = 1.5;
      }
      continue;
    }

    // Special: Cartwheel Galaxy Ring Architecture
    if (isRing) {
      const isCore = i < particleCount * 0.15;
      const isSpoke = i >= particleCount * 0.15 && i < particleCount * 0.35;

      if (isCore) {
        // Inner dense core
        const r = Math.pow(Math.random(), 2) * 1.2;
        const theta = Math.random() * Math.PI * 2;
        positions[i3] = Math.cos(theta) * r;
        positions[i3 + 1] = (Math.random() - 0.5) * 0.4 * (1.2 - r);
        positions[i3 + 2] = Math.sin(theta) * r;

        colors[i3] = 1.0;
        colors[i3 + 1] = 0.85;
        colors[i3 + 2] = 0.6;
        sizes[i] = 1.8;
      } else if (isSpoke) {
        // Connecting spokes
        const spokeIndex = Math.floor(Math.random() * 6);
        const spokeAngle = (spokeIndex * Math.PI * 2) / 6;
        const r = 1.2 + Math.random() * (radius - 1.2);
        const theta = spokeAngle + (Math.random() - 0.5) * 0.2;
        positions[i3] = Math.cos(theta) * r;
        positions[i3 + 1] = (Math.random() - 0.5) * 0.2;
        positions[i3 + 2] = Math.sin(theta) * r;

        colors[i3] = 0.7;
        colors[i3 + 1] = 0.6;
        colors[i3 + 2] = 0.9;
        sizes[i] = 1.2;
      } else {
        // Outer brilliant starburst ring
        const r = radius * 0.85 + (Math.random() - 0.5) * 0.8;
        const theta = Math.random() * Math.PI * 2;
        positions[i3] = Math.cos(theta) * r;
        positions[i3 + 1] = (Math.random() - 0.5) * 0.25;
        positions[i3 + 2] = Math.sin(theta) * r;

        // Glowing purple/cyan/pink ring
        const mixed = colorNebula.clone().lerp(colorMiddle, Math.random());
        colors[i3] = mixed.r;
        colors[i3 + 1] = mixed.g;
        colors[i3 + 2] = mixed.b;
        sizes[i] = 1.5 + Math.random() * 1.5;
      }
      continue;
    }

    // Special: Cigar Galaxy (M82) Edge-on disk + Perpendicular Superwind Jets
    if (isCigarStarburst) {
      const isJet = i < particleCount * 0.4;
      if (isJet) {
        // Perpendicular glowing red/pink hydrogen gas jets
        const ySign = Math.random() > 0.5 ? 1 : -1;
        const yDist = Math.pow(Math.random(), 1.5) * 3.5 * ySign;
        const spread = (Math.abs(yDist) * 0.5) + 0.2;
        positions[i3] = (Math.random() - 0.5) * spread;
        positions[i3 + 1] = yDist;
        positions[i3 + 2] = (Math.random() - 0.5) * spread;

        // Radiant hydrogen red / magenta
        colors[i3] = 0.95;
        colors[i3 + 1] = 0.2 + Math.random() * 0.2;
        colors[i3 + 2] = 0.3 + Math.random() * 0.2;
        sizes[i] = 1.6 + Math.random() * 1.2;
      } else {
        // Elongated cigar disk
        const xDist = (Math.random() - 0.5) * radius * 1.8;
        const zDist = (Math.random() - 0.5) * 0.8;
        const yDist = (Math.random() - 0.5) * 0.4;
        positions[i3] = xDist;
        positions[i3 + 1] = yDist;
        positions[i3 + 2] = zDist;

        colors[i3] = 0.95;
        colors[i3 + 1] = 0.85;
        colors[i3 + 2] = 0.7;
        sizes[i] = 1.2;
      }
      continue;
    }

    // Special: Sombrero Galaxy (M104) Huge central bulge + dark dust rim
    if (hasEdgeDustRing) {
      const isBulge = i < particleCount * 0.6;
      if (isBulge) {
        // Massive spherical / ellipsoidal bulge
        const r = Math.pow(Math.random(), 2.2) * 2.8;
        const theta = Math.random() * Math.PI * 2;
        const phi = (Math.random() - 0.5) * Math.PI;
        positions[i3] = Math.cos(theta) * Math.cos(phi) * r * 1.4;
        positions[i3 + 1] = Math.sin(phi) * r * 0.8; // flattened spheroid
        positions[i3 + 2] = Math.sin(theta) * Math.cos(phi) * r * 1.4;

        // Warm brilliant white-gold light
        colors[i3] = 1.0;
        colors[i3 + 1] = 0.92;
        colors[i3 + 2] = 0.8;
        sizes[i] = 1.4;
      } else {
        // Thin outer disk with prominent dark dust rim
        const r = 2.8 + Math.random() * (radius - 2.8);
        const theta = Math.random() * Math.PI * 2;
        positions[i3] = Math.cos(theta) * r;
        positions[i3 + 1] = (Math.random() - 0.5) * 0.12;
        positions[i3 + 2] = Math.sin(theta) * r;

        if (r > 3.6 && r < 4.4 && Math.random() > 0.3) {
          // Dark absorption dust lane
          colors[i3] = 0.15;
          colors[i3 + 1] = 0.12;
          colors[i3 + 2] = 0.1;
          sizes[i] = 1.8;
        } else {
          colors[i3] = 0.85;
          colors[i3 + 1] = 0.8;
          colors[i3 + 2] = 0.95;
          sizes[i] = 1.1;
        }
      }
      continue;
    }

    // Standard & Barred Spiral Galaxies (Milky Way, Andromeda, Whirlpool, Triangulum, LMC)
    const isBulge = i < particleCount * 0.18;

    if (isBulge) {
      // Core bulge
      const r = Math.pow(Math.random(), 2.5) * 1.3;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;

      positions[i3] = Math.cos(theta) * Math.cos(phi) * r;
      positions[i3 + 1] = Math.sin(phi) * r * 0.65;
      positions[i3 + 2] = Math.sin(theta) * Math.cos(phi) * r;

      colors[i3] = colorInside.r;
      colors[i3 + 1] = colorInside.g;
      colors[i3 + 2] = colorInside.b;
      sizes[i] = 1.8;
      continue;
    }

    // Central stellar bar (for Milky Way and LMC)
    if (hasBar && i < particleCount * 0.32) {
      const barLen = (Math.random() - 0.5) * 2.8;
      const barWidth = (Math.random() - 0.5) * 0.5;
      positions[i3] = barLen;
      positions[i3 + 1] = (Math.random() - 0.5) * 0.25;
      positions[i3 + 2] = barWidth;

      colors[i3] = 1.0;
      colors[i3 + 1] = 0.88;
      colors[i3 + 2] = 0.65;
      sizes[i] = 1.3;
      continue;
    }

    // Logarithmic Spiral Arms
    const r = Math.pow(Math.random(), 1.4) * radius;
    const spinAngle = r * spin;
    const branchAngle = ((i % armCount) * Math.PI * 2) / armCount;

    const randomX = Math.pow(Math.random(), randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * randomness * r;
    const randomY = Math.pow(Math.random(), randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * (randomness * 0.4) * r;
    const randomZ = Math.pow(Math.random(), randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * randomness * r;

    positions[i3] = Math.cos(branchAngle + spinAngle) * r + randomX;
    positions[i3 + 1] = randomY;
    positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * r + randomZ;

    // Color gradient by radius
    const mixedColor = colorInside.clone();
    if (r < radius * 0.4) {
      mixedColor.lerp(colorMiddle, r / (radius * 0.4));
    } else {
      mixedColor.copy(colorMiddle).lerp(colorOutside, (r - radius * 0.4) / (radius * 0.6));
    }

    // Occasional starburst pink nebula along arms
    if (Math.random() < 0.08) {
      mixedColor.lerp(colorNebula, 0.7);
      sizes[i] = 2.2;
    } else {
      sizes[i] = 1.0 + Math.random() * 0.8;
    }

    colors[i3] = mixedColor.r;
    colors[i3 + 1] = mixedColor.g;
    colors[i3 + 2] = mixedColor.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.PointsMaterial({
    size: 0.16,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    map: starTex,
    transparent: true,
    opacity: 0.9,
  });

  const points = new THREE.Points(geometry, material);
  group.add(points);

  // Central Supermassive Black Hole (for individual galaxies) or Cosmic Web Nodes / CMB Horizon
  if (isCosmicWeb) {
    // Add glowing nodal spheres for major superclusters
    superclusterNodes.forEach((node, nIdx) => {
      const nodeGeo = new THREE.SphereGeometry(0.22, 16, 16);
      const nodeMat = new THREE.MeshBasicMaterial({
        color: nIdx === 0 ? 0xffea77 : 0xa855f7,
        transparent: true,
        opacity: 0.85,
      });
      const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
      nodeMesh.position.copy(node);
      group.add(nodeMesh);

      // Soft node glow halo
      const haloGeo = new THREE.SphereGeometry(0.42, 16, 16);
      const haloMat = new THREE.MeshBasicMaterial({
        color: nIdx === 0 ? 0xffddaa : 0x38bdf8,
        transparent: true,
        opacity: 0.25,
        side: THREE.BackSide,
      });
      const haloMesh = new THREE.Mesh(haloGeo, haloMat);
      nodeMesh.add(haloMesh);
    });
  } else if (isObservableUniverse) {
    // Outer CMB Horizon Shell with procedural thermal map
    const cmbCanvas = document.createElement('canvas');
    cmbCanvas.width = 256;
    cmbCanvas.height = 128;
    const ctx = cmbCanvas.getContext('2d')!;
    const imgData = ctx.createImageData(256, 128);
    for (let py = 0; py < 128; py++) {
      for (let px = 0; px < 256; px++) {
        const idx = (py * 256 + px) * 4;
        const val =
          Math.sin(px * 0.12) * Math.cos(py * 0.15) +
          Math.sin(px * 0.24 + py * 0.18) * 0.5;
        // Thermal fluctuation colormap: cool cyan to warm red
        if (val > 0.2) {
          imgData.data[idx] = 230;     // R
          imgData.data[idx + 1] = 100; // G
          imgData.data[idx + 2] = 50;  // B
        } else if (val < -0.2) {
          imgData.data[idx] = 40;
          imgData.data[idx + 1] = 160;
          imgData.data[idx + 2] = 240;
        } else {
          imgData.data[idx] = 120;
          imgData.data[idx + 1] = 70;
          imgData.data[idx + 2] = 180;
        }
        imgData.data[idx + 3] = 75; // subtle translucency
      }
    }
    ctx.putImageData(imgData, 0, 0);
    const cmbTex = new THREE.CanvasTexture(cmbCanvas);

    const cmbGeo = new THREE.SphereGeometry(8.6, 32, 32);
    const cmbMat = new THREE.MeshBasicMaterial({
      map: cmbTex,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const cmbSphere = new THREE.Mesh(cmbGeo, cmbMat);
    group.add(cmbSphere);

    // Central Observer Node (Earth / Milky Way position)
    const obsGeo = new THREE.SphereGeometry(0.15, 16, 16);
    const obsMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const obsMesh = new THREE.Mesh(obsGeo, obsMat);
    group.add(obsMesh);

    // Pulse beacon ring around observer
    const pRingGeo = new THREE.RingGeometry(0.18, 0.28, 32);
    pRingGeo.rotateX(Math.PI / 2);
    const pRingMat = new THREE.MeshBasicMaterial({
      color: 0x67e8f9,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    obsMesh.add(new THREE.Mesh(pRingGeo, pRingMat));
  } else {
    // Central Supermassive Black Hole event horizon sphere
    const smbhGeo = new THREE.SphereGeometry(0.12, 24, 24);
    const smbhMat = new THREE.MeshBasicMaterial({ color: 0x020308 });
    const smbh = new THREE.Mesh(smbhGeo, smbhMat);
    group.add(smbh);

    // Glowing photon ring around black hole
    const ringGeo = new THREE.RingGeometry(0.13, 0.22, 32);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xfff0aa,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    group.add(ring);
  }

  // For Whirlpool M51, add companion dwarf galaxy NGC 5195
  if (galaxyId === 'whirlpool') {
    const companionGeo = new THREE.SphereGeometry(0.4, 16, 16);
    const companionMat = new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.75,
    });
    const companion = new THREE.Mesh(companionGeo, companionMat);
    companion.position.set(4.5, 0.5, -3.2);
    group.add(companion);

    // Companion tidal bridge points
    const bridgeCount = 600;
    const bPos = new Float32Array(bridgeCount * 3);
    const bCol = new Float32Array(bridgeCount * 3);
    for (let b = 0; b < bridgeCount; b++) {
      const frac = b / bridgeCount;
      const bx = 3.0 + frac * 1.5 + (Math.random() - 0.5) * 0.4;
      const by = frac * 0.5 + (Math.random() - 0.5) * 0.2;
      const bz = -1.5 - frac * 1.7 + (Math.random() - 0.5) * 0.4;
      bPos[b * 3] = bx;
      bPos[b * 3 + 1] = by;
      bPos[b * 3 + 2] = bz;

      bCol[b * 3] = 0.9;
      bCol[b * 3 + 1] = 0.85;
      bCol[b * 3 + 2] = 0.6;
    }
    const bGeo = new THREE.BufferGeometry();
    bGeo.setAttribute('position', new THREE.BufferAttribute(bPos, 3));
    bGeo.setAttribute('color', new THREE.BufferAttribute(bCol, 3));
    const bMat = new THREE.PointsMaterial({
      size: 0.12,
      map: starTex,
      transparent: true,
      opacity: 0.6,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
    });
    group.add(new THREE.Points(bGeo, bMat));
  }

  // Tag group for animation
  group.userData = {
    galaxyId,
    points,
    rotationSpeed: 0.05,
  };

  return group;
}

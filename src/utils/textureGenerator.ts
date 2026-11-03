import * as THREE from 'three';
import { PlanetId } from '../types/astronomy';

const textureCache = new Map<string, THREE.CanvasTexture>();

/**
 * Creates a procedural 2D canvas texture for a planet
 */
export function getPlanetTexture(id: PlanetId): THREE.CanvasTexture {
  if (textureCache.has(id)) {
    return textureCache.get(id)!;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  switch (id) {
    case 'sun':
      generateSunTexture(ctx, canvas.width, canvas.height);
      break;
    case 'mercury':
      generateMercuryTexture(ctx, canvas.width, canvas.height);
      break;
    case 'venus':
      generateVenusTexture(ctx, canvas.width, canvas.height);
      break;
    case 'earth':
      generateEarthTexture(ctx, canvas.width, canvas.height);
      break;
    case 'mars':
      generateMarsTexture(ctx, canvas.width, canvas.height);
      break;
    case 'jupiter':
      generateJupiterTexture(ctx, canvas.width, canvas.height);
      break;
    case 'saturn':
      generateSaturnTexture(ctx, canvas.width, canvas.height);
      break;
    case 'uranus':
      generateUranusTexture(ctx, canvas.width, canvas.height);
      break;
    case 'neptune':
      generateNeptuneTexture(ctx, canvas.width, canvas.height);
      break;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  textureCache.set(id, texture);
  return texture;
}

function generateSunTexture(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#FFE600');
  grad.addColorStop(0.5, '#FF8A00');
  grad.addColorStop(1, '#FF3D00');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Solar granules and flare loops
  for (let i = 0; i < 600; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const radius = Math.random() * 25 + 5;
    const alpha = Math.random() * 0.4 + 0.1;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 220, ${alpha})`;
    ctx.fill();
  }

  // Darker sunspots
  for (let i = 0; i < 18; i++) {
    const x = Math.random() * w;
    const y = (h * 0.3) + Math.random() * (h * 0.4);
    const r = Math.random() * 12 + 4;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(80, 20, 0, 0.7)';
    ctx.fill();
    // Penumbra
    ctx.beginPath();
    ctx.arc(x, y, r * 1.8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(150, 40, 0, 0.35)';
    ctx.fill();
  }
}

function generateMercuryTexture(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#8E8E93';
  ctx.fillRect(0, 0, w, h);

  // Cratered lunar-like terrain
  for (let i = 0; i < 800; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = Math.random() * 16 + 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(50, 50, 50, 0.3)' : 'rgba(210, 210, 210, 0.25)';
    ctx.fill();
  }

  // Large impact basins with ray systems
  for (let b = 0; b < 10; b++) {
    const bx = Math.random() * w;
    const by = Math.random() * h;
    const br = Math.random() * 30 + 15;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(230, 230, 230, 0.5)';
    ctx.lineWidth = 3;
    ctx.stroke();

    for (let ray = 0; ray < 8; ray++) {
      const angle = (Math.PI * 2 / 8) * ray;
      ctx.beginPath();
      ctx.moveTo(bx + Math.cos(angle) * br, by + Math.sin(angle) * br);
      ctx.lineTo(bx + Math.cos(angle) * (br + 60), by + Math.sin(angle) * (br + 60));
      ctx.strokeStyle = 'rgba(240, 240, 240, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
}

function generateVenusTexture(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#E8C78B');
  grad.addColorStop(0.3, '#DDB473');
  grad.addColorStop(0.7, '#C5934C');
  grad.addColorStop(1, '#E8C78B');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Thick swirling sulfur-acid haze bands
  for (let i = 0; i < 40; i++) {
    const y = (h / 40) * i;
    const thickness = Math.random() * 20 + 8;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= w; x += 30) {
      const offset = Math.sin((x / 80) + i) * 12 + Math.cos(x / 40) * 6;
      ctx.lineTo(x, y + offset);
    }
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(255, 230, 180, 0.25)' : 'rgba(160, 110, 40, 0.2)';
    ctx.lineWidth = thickness;
    ctx.stroke();
  }
}

function generateEarthTexture(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Deep oceans
  ctx.fillStyle = '#0F4D8A';
  ctx.fillRect(0, 0, w, h);

  // Continents (procedural organic shapes)
  const continents = [
    { x: w * 0.25, y: h * 0.35, rx: 90, ry: 60 }, // North America
    { x: w * 0.32, y: h * 0.65, rx: 60, ry: 80 }, // South America
    { x: w * 0.52, y: h * 0.30, rx: 70, ry: 50 }, // Europe
    { x: w * 0.54, y: h * 0.55, rx: 80, ry: 80 }, // Africa
    { x: w * 0.72, y: h * 0.32, rx: 110, ry: 70 }, // Asia
    { x: w * 0.82, y: h * 0.70, rx: 55, ry: 45 }, // Australia
  ];

  continents.forEach(c => {
    ctx.fillStyle = '#2E7D32';
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, c.rx, c.ry, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Terrain textures (mountains & deserts)
    ctx.fillStyle = '#D4A373';
    ctx.beginPath();
    ctx.ellipse(c.x + c.rx * 0.2, c.y + c.ry * 0.1, c.rx * 0.5, c.ry * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // White swirl clouds
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * w;
    const y = (h * 0.15) + Math.random() * (h * 0.7);
    ctx.beginPath();
    ctx.ellipse(x, y, Math.random() * 60 + 20, Math.random() * 15 + 5, Math.random() * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.fill();
  }

  // Polar ice caps
  ctx.fillStyle = '#F0F9FF';
  ctx.fillRect(0, 0, w, h * 0.08);
  ctx.fillRect(0, h * 0.92, w, h * 0.08);
}

function generateMarsTexture(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Rusty reddish-orange
  ctx.fillStyle = '#C1440E';
  ctx.fillRect(0, 0, w, h);

  // Darker basaltic volcanic regions
  for (let i = 0; i < 35; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    ctx.beginPath();
    ctx.ellipse(x, y, Math.random() * 80 + 20, Math.random() * 40 + 10, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(90, 25, 5, 0.35)';
    ctx.fill();
  }

  // Valles Marineris canyon cut
  ctx.beginPath();
  ctx.moveTo(w * 0.35, h * 0.55);
  ctx.bezierCurveTo(w * 0.45, h * 0.53, w * 0.55, h * 0.58, w * 0.65, h * 0.54);
  ctx.strokeStyle = '#450A0A';
  ctx.lineWidth = 8;
  ctx.stroke();

  // White polar caps
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.ellipse(w * 0.5, 0, w * 0.3, h * 0.07, 0, 0, Math.PI);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h, w * 0.25, h * 0.06, 0, Math.PI, 0);
  ctx.fill();
}

function generateJupiterTexture(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Horizontal banded gas giant
  const bandColors = [
    '#E3BB88', '#B07548', '#CFA775', '#8E4924', '#F4E0C0',
    '#B5774E', '#E6C697', '#93542E', '#DFC196', '#7F3C18',
  ];

  const bandHeight = h / bandColors.length;
  bandColors.forEach((color, idx) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, idx * bandHeight, w, bandHeight);

    // Turbulence between bands
    ctx.beginPath();
    ctx.moveTo(0, idx * bandHeight);
    for (let x = 0; x <= w; x += 15) {
      const y = idx * bandHeight + Math.sin(x / 20 + idx) * 4;
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 3;
    ctx.stroke();
  });

  // The Great Red Spot (22° South latitude ~ 65% down)
  const spotX = w * 0.55;
  const spotY = h * 0.66;
  ctx.beginPath();
  ctx.ellipse(spotX, spotY, 55, 30, 0.05, 0, Math.PI * 2);
  ctx.fillStyle = '#C2410C';
  ctx.fill();

  // Spot inner swirling eye
  ctx.beginPath();
  ctx.ellipse(spotX, spotY, 35, 18, 0.05, 0, Math.PI * 2);
  ctx.fillStyle = '#9A3412';
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(spotX, spotY, 15, 8, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#EA580C';
  ctx.fill();
}

function generateSaturnTexture(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const bands = [
    '#F2E2BE', '#E5CE9F', '#DAC28E', '#CFB67C', '#DAC28E',
    '#E5CE9F', '#F4E5C7', '#E0C792', '#D3B87F', '#E5CE9F',
  ];

  const bh = h / bands.length;
  bands.forEach((col, idx) => {
    ctx.fillStyle = col;
    ctx.fillRect(0, idx * bh, w, bh);

    // Subtle atmospheric ripple
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(0, idx * bh + 2, w, 2);
  });
}

function generateUranusTexture(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#B3F0FF');
  grad.addColorStop(0.3, '#7BE0F6');
  grad.addColorStop(0.7, '#64D3EC');
  grad.addColorStop(1, '#B3F0FF');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Very delicate high-altitude hazes
  for (let i = 0; i < 15; i++) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.fillRect(0, (h / 15) * i, w, 6);
  }
}

function generateNeptuneTexture(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#2563EB');
  grad.addColorStop(0.4, '#1D4ED8');
  grad.addColorStop(0.6, '#1E40AF');
  grad.addColorStop(1, '#2563EB');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Bright white high-altitude methane cirrus streaks
  for (let i = 0; i < 12; i++) {
    const x = Math.random() * w;
    const y = (h * 0.2) + Math.random() * (h * 0.6);
    ctx.beginPath();
    ctx.ellipse(x, y, Math.random() * 80 + 30, Math.random() * 4 + 2, 0.05, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fill();
  }

  // The Great Dark Spot
  ctx.beginPath();
  ctx.ellipse(w * 0.4, h * 0.45, 40, 22, -0.1, 0, Math.PI * 2);
  ctx.fillStyle = '#0F2B66';
  ctx.fill();
}

/**
 * Creates realistic concentric ring texture for Saturn or Uranus
 */
export function getRingTexture(type: 'saturn' | 'uranus'): THREE.CanvasTexture {
  const key = `ring-${type}`;
  if (textureCache.has(key)) return textureCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (type === 'saturn') {
    // Outer C Ring (faint)
    drawRingSection(ctx, 0, 200, 'rgba(160, 140, 100, 0.3)');
    // Dense B Ring (bright)
    drawRingSection(ctx, 220, 560, 'rgba(235, 215, 170, 0.85)');
    // Cassini Division (gap)
    drawRingSection(ctx, 560, 610, 'rgba(0, 0, 0, 0.02)');
    // A Ring (bright, with Encke division)
    drawRingSection(ctx, 610, 920, 'rgba(210, 190, 150, 0.7)');
    // Outer F Ring
    drawRingSection(ctx, 940, 980, 'rgba(180, 160, 130, 0.4)');
  } else {
    // Uranus faint narrow rings
    drawRingSection(ctx, 300, 360, 'rgba(180, 230, 255, 0.4)');
    drawRingSection(ctx, 500, 580, 'rgba(160, 220, 250, 0.6)');
    drawRingSection(ctx, 750, 850, 'rgba(140, 210, 245, 0.5)');
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(key, texture);
  return texture;
}

function drawRingSection(
  ctx: CanvasRenderingContext2D,
  startX: number,
  endX: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.fillRect(startX, 0, endX - startX, ctx.canvas.height);

  // Micro-grooves in ring structure
  for (let x = startX; x < endX; x += 3) {
    if (Math.random() > 0.4) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.fillRect(x, 0, 1, ctx.canvas.height);
    }
  }
}

/**
 * Procedural target reticle texture for AR placement
 */
export function getArReticleTexture(): THREE.CanvasTexture {
  const key = 'ar-reticle';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 256, 256);

  // Outer glowing ring
  ctx.beginPath();
  ctx.arc(128, 128, 100, 0, Math.PI * 2);
  ctx.strokeStyle = '#38BDF8';
  ctx.lineWidth = 6;
  ctx.stroke();

  // Dotted secondary ring
  ctx.beginPath();
  ctx.setLineDash([8, 8]);
  ctx.arc(128, 128, 75, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.setLineDash([]);

  // Center crosshair
  ctx.beginPath();
  ctx.arc(128, 128, 12, 0, Math.PI * 2);
  ctx.fillStyle = '#38BDF8';
  ctx.fill();

  // 4 corner ticks
  const ticks = [
    [128, 8, 128, 28],
    [128, 228, 128, 248],
    [8, 128, 28, 128],
    [228, 128, 248, 128],
  ];
  ctx.strokeStyle = '#38BDF8';
  ctx.lineWidth = 4;
  ticks.forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  });

  const texture = new THREE.CanvasTexture(canvas);
  textureCache.set(key, texture);
  return texture;
}

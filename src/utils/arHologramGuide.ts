/**
 * Procedural 3D Holographic AR Guide Character ("ASTRA") & Surface/Placement Demo Rig
 * Demonstrates surface scanning, tap-to-anchor shockwaves, and spatial manipulation live in WebGL.
 */

import * as THREE from 'three';

export type HowToArStep = 'scan' | 'place' | 'manipulate';

export interface ArHologramGuideRig {
  group: THREE.Group;
  setVisible: (visible: boolean) => void;
  setStep: (step: HowToArStep) => void;
  setTint: (hexColor: string) => void;
  update: (elapsed: number, delta: number, surfaceY: number) => void;
  dispose: () => void;
}

export function createArHologramGuideRig(): ArHologramGuideRig {
  const root = new THREE.Group();
  root.name = 'ArHologramGuideASTRA';
  root.visible = false;

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  // Shared holographic & solid PBR materials (varied roughness & metalness >= 0.25 contrast)
  const armorMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.34,
      metalness: 0.72,
      emissive: new THREE.Color(0x0284c7),
      emissiveIntensity: 0.22,
    }),
  );

  const trimMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.65,
      metalness: 0.35,
    }),
  );

  const holoGlowMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );

  const visorMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      roughness: 0.12,
      metalness: 0.9,
      emissive: new THREE.Color(0x38bdf8),
      emissiveIntensity: 0.75,
    }),
  );

  const holoShellMat = trackMat(
    new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0x38bdf8) },
      },
      vertexShader: /* glsl */ `
        varying vec3 vNormalView;
        varying vec3 vViewDir;
        varying float vLocalY;
        void main() {
          vLocalY = position.y;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          vNormalView = normalize(normalMatrix * normal);
          vViewDir = normalize(-mvPos.xyz);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uColor;
        varying vec3 vNormalView;
        varying vec3 vViewDir;
        varying float vLocalY;
        void main() {
          float fresnel = pow(1.0 - max(dot(normalize(vNormalView), normalize(vViewDir)), 0.0), 2.1);
          float scanline = 0.72 + 0.28 * sin(vLocalY * 75.0 - uTime * 6.5);
          float alpha = clamp((0.14 + fresnel * 0.72) * scanline, 0.0, 0.88);
          gl_FragColor = vec4(uColor * (0.9 + fresnel * 0.55), alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.FrontSide,
    }),
  );

  // =========================================================================
  // 1. Floating Holographic Character Assembly ("ASTRA")
  // =========================================================================
  const character = new THREE.Group();
  character.position.set(-0.28, -0.02, -0.72);
  root.add(character);

  // Torso (tapered lathe/cylinder hull + collar + chest reactor core)
  const torsoGeo = trackGeo(new THREE.CylinderGeometry(0.044, 0.032, 0.11, 20));
  const torso = new THREE.Mesh(torsoGeo, armorMat);
  character.add(torso);

  const beltGeo = trackGeo(new THREE.TorusGeometry(0.034, 0.005, 8, 24));
  beltGeo.rotateX(Math.PI / 2);
  const belt = new THREE.Mesh(beltGeo, trimMat);
  belt.position.y = -0.042;
  character.add(belt);

  const reactorGeo = trackGeo(new THREE.OctahedronGeometry(0.015, 0));
  const reactor = new THREE.Mesh(reactorGeo, holoGlowMat);
  reactor.position.set(0, 0.014, 0.038);
  character.add(reactor);

  // Thruster hover skirt
  const skirtGeo = trackGeo(new THREE.ConeGeometry(0.036, 0.045, 20, 1, true));
  skirtGeo.rotateX(Math.PI);
  const skirt = new THREE.Mesh(skirtGeo, holoShellMat);
  skirt.position.y = -0.072;
  character.add(skirt);

  // Head assembly (helmet + curved visor + twin comms antennas)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.095, 0);
  character.add(headGroup);

  const helmetGeo = trackGeo(new THREE.SphereGeometry(0.042, 24, 20));
  const helmet = new THREE.Mesh(helmetGeo, armorMat);
  helmet.scale.set(1.05, 0.95, 1.0);
  headGroup.add(helmet);

  const visorGeo = trackGeo(new THREE.SphereGeometry(0.036, 20, 16, -Math.PI * 0.35, Math.PI * 0.7, Math.PI * 0.25, Math.PI * 0.48));
  const visor = new THREE.Mesh(visorGeo, visorMat);
  visor.position.set(0, -0.002, 0.011);
  headGroup.add(visor);

  const earGeo = trackGeo(new THREE.CylinderGeometry(0.004, 0.004, 0.038, 8));
  const leftEar = new THREE.Mesh(earGeo, holoGlowMat);
  leftEar.position.set(-0.044, 0.018, 0);
  leftEar.rotation.z = 0.22;
  headGroup.add(leftEar);

  const rightEar = new THREE.Mesh(earGeo, holoGlowMat);
  rightEar.position.set(0.044, 0.018, 0);
  rightEar.rotation.z = -0.22;
  headGroup.add(rightEar);

  // Articulated Right Arm (aims laser scan beam & points at AR anchor)
  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.056, 0.032, 0);
  character.add(rightArmPivot);

  const shoulderGeo = trackGeo(new THREE.SphereGeometry(0.013, 12, 12));
  const rShoulder = new THREE.Mesh(shoulderGeo, trimMat);
  rightArmPivot.add(rShoulder);

  const forearmGeo = trackGeo(new THREE.CylinderGeometry(0.009, 0.011, 0.078, 12));
  forearmGeo.translate(0, -0.039, 0);
  const rForearm = new THREE.Mesh(forearmGeo, armorMat);
  rightArmPivot.add(rForearm);

  const emitterTipGeo = trackGeo(new THREE.TorusGeometry(0.013, 0.003, 8, 20));
  emitterTipGeo.rotateX(Math.PI / 2);
  const rEmitterTip = new THREE.Mesh(emitterTipGeo, holoGlowMat);
  rEmitterTip.position.set(0, -0.082, 0);
  rightArmPivot.add(rEmitterTip);

  // Articulated Left Arm (balances & gestures during manipulation step)
  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.056, 0.032, 0);
  character.add(leftArmPivot);

  const lShoulder = new THREE.Mesh(shoulderGeo, trimMat);
  leftArmPivot.add(lShoulder);

  const lForearm = new THREE.Mesh(forearmGeo, armorMat);
  leftArmPivot.add(lForearm);

  // Dual Orbiting Hologram Projector Pedestal Rings under character
  const pedRingGeo = trackGeo(new THREE.RingGeometry(0.065, 0.078, 36));
  pedRingGeo.rotateX(-Math.PI / 2);
  const pedRingMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const pedRing = new THREE.Mesh(pedRingGeo, pedRingMat);
  pedRing.position.set(0, -0.145, 0);
  character.add(pedRing);

  // =========================================================================
  // 2. Volumetric Holographic Scan Cone & Surface Sweep Reticle
  // =========================================================================
  const scanBeamGeo = trackGeo(new THREE.ConeGeometry(0.11, 0.34, 24, 1, true));
  // Pivot cone tip at top (emitter) pointing downward -Y
  scanBeamGeo.translate(0, -0.17, 0);
  const scanBeamMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const scanBeam = new THREE.Mesh(scanBeamGeo, scanBeamMat);
  scanBeam.position.set(0, -0.082, 0);
  rightArmPivot.add(scanBeam);

  // Floor Surface Target Ring & Tap Impulse Pulse (moves on virtual desk)
  const floorTargetGroup = new THREE.Group();
  floorTargetGroup.position.set(0.05, -0.246, -0.72);
  root.add(floorTargetGroup);

  const guideReticleGeo = trackGeo(new THREE.RingGeometry(0.075, 0.095, 40));
  guideReticleGeo.rotateX(-Math.PI / 2);
  const guideReticleMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const guideReticle = new THREE.Mesh(guideReticleGeo, guideReticleMat);
  floorTargetGroup.add(guideReticle);

  const pulseRingGeo = trackGeo(new THREE.RingGeometry(0.11, 0.135, 40));
  pulseRingGeo.rotateX(-Math.PI / 2);
  const pulseRingMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const pulseRing = new THREE.Mesh(pulseRingGeo, pulseRingMat);
  floorTargetGroup.add(pulseRing);

  // =========================================================================
  // 3. Holographic Demo Planet (materializes during Step 2 & animates in Step 3)
  // =========================================================================
  const demoPlanetGroup = new THREE.Group();
  demoPlanetGroup.position.set(0.05, -0.14, -0.72);
  demoPlanetGroup.visible = false;
  root.add(demoPlanetGroup);

  const demoSphereGeo = trackGeo(new THREE.SphereGeometry(0.085, 24, 24));
  const demoSphere = new THREE.Mesh(demoSphereGeo, holoShellMat);
  demoPlanetGroup.add(demoSphere);

  const demoWireGeo = trackGeo(new THREE.IcosahedronGeometry(0.089, 1));
  const demoWireMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      wireframe: true,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const demoWire = new THREE.Mesh(demoWireGeo, demoWireMat);
  demoPlanetGroup.add(demoWire);

  const demoOrbitRingGeo = trackGeo(new THREE.RingGeometry(0.118, 0.155, 48));
  demoOrbitRingGeo.rotateX(Math.PI * 0.42);
  const demoOrbitRing = new THREE.Mesh(demoOrbitRingGeo, pedRingMat);
  demoPlanetGroup.add(demoOrbitRing);

  let currentStep: HowToArStep = 'scan';
  let stepAge = 0;

  return {
    group: root,
    setVisible: (visible: boolean) => {
      root.visible = visible;
    },
    setStep: (step: HowToArStep) => {
      currentStep = step;
      stepAge = 0;
    },
    setTint: (hexColor: string) => {
      const c = new THREE.Color(hexColor);
      holoGlowMat.color.copy(c);
      pedRingMat.color.copy(c);
      scanBeamMat.color.copy(c);
      guideReticleMat.color.copy(c);
      pulseRingMat.color.copy(c);
      demoWireMat.color.copy(c).lerp(new THREE.Color('#ffffff'), 0.35);
      (holoShellMat.uniforms.uColor.value as THREE.Color).copy(c);
    },
    update: (elapsed: number, delta: number, surfaceY: number) => {
      if (!root.visible) return;
      stepAge += delta;
      holoShellMat.uniforms.uTime.value = elapsed;

      const baseSurface = THREE.MathUtils.clamp(surfaceY, -0.45, 0.05);
      const bob = Math.sin(elapsed * 2.6) * 0.016;

      // Floating ASTRA avatar hover + reactor spin
      character.position.y = baseSurface + 0.21 + bob;
      reactor.rotation.y = elapsed * 1.8;
      pedRing.rotation.z = elapsed * 1.1;

      if (currentStep === 'scan') {
        // Step 1: Sweep surface left-to-right with scan cone tracing a figure-8 over the floor
        character.position.x = THREE.MathUtils.damp(character.position.x, -0.26, 6, delta);
        character.rotation.y = THREE.MathUtils.damp(character.rotation.y, 0.55 + Math.sin(elapsed * 1.6) * 0.25, 6, delta);
        headGroup.rotation.y = Math.sin(elapsed * 1.9) * 0.35;
        headGroup.rotation.x = 0.22;

        rightArmPivot.rotation.z = 0.68 + Math.sin(elapsed * 2.2) * 0.16;
        rightArmPivot.rotation.x = -0.35 + Math.cos(elapsed * 1.5) * 0.14;
        leftArmPivot.rotation.z = -0.25 - Math.sin(elapsed * 1.8) * 0.08;

        scanBeam.visible = true;
        scanBeamMat.opacity = 0.2 + Math.sin(elapsed * 5.0) * 0.07;

        const sweepX = 0.06 + Math.sin(elapsed * 1.6) * 0.18;
        const sweepZ = -0.72 + Math.sin(elapsed * 3.2) * 0.06;
        floorTargetGroup.position.set(sweepX, baseSurface + 0.004, sweepZ);
        guideReticle.scale.setScalar(1.0 + Math.sin(elapsed * 4.5) * 0.08);
        pulseRing.visible = false;
        demoPlanetGroup.visible = false;
      } else if (currentStep === 'place') {
        // Step 2: Aim at center reticle -> periodic tap pulse -> materialize demo holographic planet!
        const cycle = (stepAge % 2.8) / 2.8; // 0..1 loop
        character.position.x = THREE.MathUtils.damp(character.position.x, -0.28, 6, delta);
        character.rotation.y = THREE.MathUtils.damp(character.rotation.y, 0.62, 6, delta);
        headGroup.rotation.y = 0.18;
        headGroup.rotation.x = 0.16;

        // Point right arm toward anchor point with gentle downward tap nod around cycle 0.25
        const tapNod = cycle > 0.18 && cycle < 0.36 ? Math.sin(((cycle - 0.18) / 0.18) * Math.PI) * 0.18 : 0;
        rightArmPivot.rotation.z = 0.85 - tapNod;
        rightArmPivot.rotation.x = -0.18;
        leftArmPivot.rotation.z = -0.22;

        floorTargetGroup.position.set(0.08, baseSurface + 0.004, -0.72);
        guideReticle.scale.setScalar(1.0 + Math.sin(elapsed * 3.5) * 0.04);

        scanBeam.visible = cycle < 0.42;
        scanBeamMat.opacity = cycle < 0.42 ? 0.32 : 0;

        // Expanding anchor lock shockwave ring from 0.28 -> 0.82
        if (cycle >= 0.28) {
          const ringT = Math.min(1, (cycle - 0.28) / 0.48);
          pulseRing.visible = true;
          pulseRing.scale.setScalar(0.5 + ringT * 2.1);
          pulseRingMat.opacity = (1 - ringT) * 0.85;
        } else {
          pulseRing.visible = false;
        }

        // Demo planet materializes cleanly with elastic bounce after tap!
        if (cycle >= 0.28) {
          const matT = Math.min(1, (cycle - 0.28) / 0.32);
          const bounce = 1 - Math.pow(1 - matT, 3);
          demoPlanetGroup.visible = true;
          demoPlanetGroup.position.set(0.08, baseSurface + 0.125, -0.72);
          demoPlanetGroup.scale.setScalar(Math.max(0.05, bounce));
          demoPlanetGroup.rotation.y += delta * 1.2;
        } else {
          demoPlanetGroup.visible = false;
        }
      } else {
        // Step 3: Demonstrate moving, scaling & rotating the anchored holographic asset
        character.position.x = THREE.MathUtils.damp(character.position.x, -0.32, 6, delta);
        character.rotation.y = THREE.MathUtils.damp(character.rotation.y, 0.52, 6, delta);
        headGroup.rotation.y = 0.22;
        headGroup.rotation.x = 0.05;

        // Expressive twin-arm holographic manipulation gestures
        rightArmPivot.rotation.z = 0.65 + Math.sin(elapsed * 2.5) * 0.22;
        rightArmPivot.rotation.x = Math.cos(elapsed * 2.5) * 0.22;
        leftArmPivot.rotation.z = -0.52 - Math.sin(elapsed * 2.5) * 0.18;
        leftArmPivot.rotation.x = -Math.cos(elapsed * 2.5) * 0.18;

        scanBeam.visible = false;
        pulseRing.visible = false;

        // Demo planet glides softly left/right, scales smoothly, and spins
        const glideX = 0.08 + Math.sin(elapsed * 1.4) * 0.11;
        const demoScale = 1.0 + Math.sin(elapsed * 2.1) * 0.22;
        floorTargetGroup.position.set(glideX, baseSurface + 0.004, -0.72);
        guideReticle.scale.setScalar(demoScale);

        demoPlanetGroup.visible = true;
        demoPlanetGroup.position.set(glideX, baseSurface + 0.125 * demoScale, -0.72);
        demoPlanetGroup.scale.setScalar(demoScale);
        demoPlanetGroup.rotation.y += delta * 1.85;
        demoWire.rotation.y -= delta * 0.6;
      }
    },
    dispose: () => {
      geometries.forEach(g => g.dispose());
      materials.forEach(m => m.dispose());
    },
  };
}

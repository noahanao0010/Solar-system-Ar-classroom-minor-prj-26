/**
 * Low-Latency WebXR & Mobile/Desktop VR Controller
 * Supports:
 * 1. Native WebXR ('immersive-vr') Headset Mode with xrRig spatial anchoring
 * 2. First-Person Cosmic Flight (Mobile 1:1 IMU Head-Tracking + Optional Stereo Split + Desktop Mouse-Look/WASD)
 * 3. Desktop & VR Tabletop Diorama Mode (Room-scale miniature solar table at eye-level with holodeck projector base)
 */

import * as THREE from 'three';

export type VrExperienceMode = 'off' | 'tabletop' | 'first-person';

export interface VrControllerState {
  mode: VrExperienceMode;
  stereoSplit: boolean;
  webxrSupported: boolean;
  webxrActive: boolean;
  hasHardwareOrientation: boolean;
  pointerLocked: boolean;
}

// Pre-allocated math helpers for zero-GC, zero-latency head-tracking
const _zee = new THREE.Vector3(0, 0, 1);
const _euler = new THREE.Euler();
const _q0 = new THREE.Quaternion();
const _q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // -PI/2 around X
const _yawOffsetQuat = new THREE.Quaternion();
const _targetWorldQuat = new THREE.Quaternion();
const _moveForward = new THREE.Vector3();
const _moveRight = new THREE.Vector3();
const _moveUp = new THREE.Vector3(0, 1, 0);

/**
 * Procedural Holodeck Observatory Projector Table for Desktop / VR Tabletop Mode
 */
export function createHolodeckTableRig(): {
  group: THREE.Group;
  update: (elapsed: number) => void;
  dispose: () => void;
} {
  const group = new THREE.Group();
  group.name = 'VRTabletopProjectorRig';
  group.visible = false;

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  // 1. Matte obsidian holographic table disc (y = -0.38)
  const discGeo = new THREE.CylinderGeometry(2.85, 2.95, 0.08, 64);
  geometries.push(discGeo);
  const discMat = new THREE.MeshStandardMaterial({
    color: 0x070d1d,
    roughness: 0.72,
    metalness: 0.35,
    transparent: true,
    opacity: 0.88,
  });
  materials.push(discMat);
  const discMesh = new THREE.Mesh(discGeo, discMat);
  discMesh.position.y = -0.42;
  discMesh.receiveShadow = true;
  group.add(discMesh);

  // 2. Crisp glowing cyan perimeter calibration ring
  const outerRingGeo = new THREE.RingGeometry(2.76, 2.84, 72);
  outerRingGeo.rotateX(-Math.PI / 2);
  geometries.push(outerRingGeo);
  const outerRingMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  materials.push(outerRingMat);
  const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
  outerRing.position.y = -0.375;
  group.add(outerRing);

  // 3. Inner segmented orbital telemetry bezel
  const innerRingGeo = new THREE.RingGeometry(1.65, 1.68, 64, 1, 0, Math.PI * 1.6);
  innerRingGeo.rotateX(-Math.PI / 2);
  geometries.push(innerRingGeo);
  const innerRingMat = new THREE.MeshBasicMaterial({
    color: 0x818cf8,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.42,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  materials.push(innerRingMat);
  const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
  innerRing.position.y = -0.373;
  group.add(innerRing);

  // 4. Radial degree calibration spokes
  const spokePts: THREE.Vector3[] = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const innerR = i % 3 === 0 ? 0.55 : 2.35;
    spokePts.push(new THREE.Vector3(Math.cos(a) * innerR, -0.374, Math.sin(a) * innerR));
    spokePts.push(new THREE.Vector3(Math.cos(a) * 2.75, -0.374, Math.sin(a) * 2.75));
  }
  const spokeGeo = new THREE.BufferGeometry().setFromPoints(spokePts);
  geometries.push(spokeGeo);
  const spokeMat = new THREE.LineBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.24,
  });
  materials.push(spokeMat);
  const spokes = new THREE.LineSegments(spokeGeo, spokeMat);
  group.add(spokes);

  return {
    group,
    update: (elapsed: number) => {
      if (!group.visible) return;
      innerRing.rotation.y = elapsed * 0.08;
      outerRingMat.opacity = 0.56 + Math.sin(elapsed * 2.2) * 0.1;
    },
    dispose: () => {
      geometries.forEach(g => g.dispose());
      materials.forEach(m => m.dispose());
    },
  };
}

/**
 * Low-Latency Head-Tracking & 6-DoF VR Input Controller
 * Uses direct synchronous quaternion transforms without slow low-pass filtering
 * to achieve near-zero motion-to-photon latency on mobile IMUs & desktop mice.
 */
export class LowLatencyVRInput {
  public yaw = 0;
  public pitch = -0.1;
  public hasHardwareIMU = false;

  private rawAlpha = 0;
  private rawBeta = 0;
  private rawGamma = 0;
  private yawZeroOffset = 0;
  private hasZeroedYaw = false;
  private screenOrientationRad = 0;

  private keysDown = new Set<string>();
  private pointerDragging = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private pointerLocked = false;
  private attachedElement: HTMLElement | null = null;
  private active = false;
  private onPointerLockChangeCb?: (locked: boolean) => void;

  // Touch swipe look + thrust support for mobile VR without pointer lock
  private activeTouchId: number | null = null;
  private lastTouchX = 0;
  private lastTouchY = 0;

  constructor(onPointerLockChange?: (locked: boolean) => void) {
    this.onPointerLockChangeCb = onPointerLockChange;
  }

  public attach(domElement: HTMLElement) {
    if (this.attachedElement === domElement) return;
    this.detach();
    this.attachedElement = domElement;

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('deviceorientation', this.handleDeviceOrientation, true);
    window.addEventListener('orientationchange', this.handleScreenOrientation);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);

    domElement.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
    domElement.addEventListener('touchstart', this.handleTouchStart, { passive: true });
    domElement.addEventListener('touchmove', this.handleTouchMove, { passive: true });
    domElement.addEventListener('touchend', this.handleTouchEnd);

    this.handleScreenOrientation();
  }

  public detach() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('deviceorientation', this.handleDeviceOrientation, true);
    window.removeEventListener('orientationchange', this.handleScreenOrientation);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);

    if (this.attachedElement) {
      this.attachedElement.removeEventListener('pointerdown', this.handlePointerDown);
      this.attachedElement.removeEventListener('touchstart', this.handleTouchStart);
      this.attachedElement.removeEventListener('touchmove', this.handleTouchMove);
      this.attachedElement.removeEventListener('touchend', this.handleTouchEnd);
      this.attachedElement = null;
    }
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    this.exitPointerLock();
  }

  public setActive(active: boolean) {
    this.active = active;
    if (!active) {
      this.keysDown.clear();
      this.pointerDragging = false;
      this.exitPointerLock();
    }
  }

  public async requestHardwareSensors(): Promise<boolean> {
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof (DeviceOrientationEvent as any).requestPermission === 'function'
    ) {
      try {
        const res = await (DeviceOrientationEvent as any).requestPermission();
        return res === 'granted';
      } catch {
        return false;
      }
    }
    return true;
  }

  public requestPointerLock() {
    if (!this.attachedElement) return;
    try {
      this.attachedElement.requestPointerLock?.();
    } catch {
      // Safe fallback to click-drag look in sandboxed iframes
    }
  }

  public exitPointerLock() {
    try {
      if (document.pointerLockElement) {
        document.exitPointerLock?.();
      }
    } catch {
      // Ignore exit errors
    }
  }

  public recenterForward() {
    this.yawZeroOffset = this.rawAlpha;
    this.hasZeroedYaw = true;
    this.yaw = 0;
    this.pitch = -0.08;
  }

  private handleScreenOrientation = () => {
    const angle =
      (window.screen?.orientation && typeof window.screen.orientation.angle === 'number'
        ? window.screen.orientation.angle
        : (window as any).orientation) || 0;
    this.screenOrientationRad = THREE.MathUtils.degToRad(angle);
  };

  private handleDeviceOrientation = (e: DeviceOrientationEvent) => {
    if (e.alpha === null || e.beta === null || e.gamma === null) return;
    this.hasHardwareIMU = true;
    this.rawAlpha = THREE.MathUtils.degToRad(e.alpha);
    this.rawBeta = THREE.MathUtils.degToRad(e.beta);
    this.rawGamma = THREE.MathUtils.degToRad(e.gamma);

    if (!this.hasZeroedYaw) {
      this.yawZeroOffset = this.rawAlpha;
      this.hasZeroedYaw = true;
    }
  };

  private handlePointerLockChange = () => {
    this.pointerLocked = Boolean(
      this.attachedElement && document.pointerLockElement === this.attachedElement,
    );
    this.onPointerLockChangeCb?.(this.pointerLocked);
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.active) return;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    this.keysDown.add(e.code);
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keysDown.delete(e.code);
  };

  private handlePointerDown = (e: PointerEvent) => {
    if (!this.active || e.pointerType === 'touch') return;
    this.pointerDragging = true;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
  };

  private handlePointerMove = (e: PointerEvent) => {
    if (!this.active || e.pointerType === 'touch') return;
    if (this.pointerLocked) {
      this.yaw -= e.movementX * 0.0024;
      this.pitch = THREE.MathUtils.clamp(
        this.pitch - e.movementY * 0.0024,
        -Math.PI * 0.48,
        Math.PI * 0.48,
      );
    } else if (this.pointerDragging) {
      const dx = e.clientX - this.lastPointerX;
      const dy = e.clientY - this.lastPointerY;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      this.yaw -= dx * 0.0032;
      this.pitch = THREE.MathUtils.clamp(
        this.pitch - dy * 0.0032,
        -Math.PI * 0.48,
        Math.PI * 0.48,
      );
    }
  };

  private handlePointerUp = () => {
    this.pointerDragging = false;
  };

  private handleTouchStart = (e: TouchEvent) => {
    if (!this.active || e.touches.length !== 1) return;
    const t = e.touches[0];
    this.activeTouchId = t.identifier;
    this.lastTouchX = t.clientX;
    this.lastTouchY = t.clientY;
  };

  private handleTouchMove = (e: TouchEvent) => {
    if (!this.active || this.activeTouchId === null) return;
    for (let i = 0; i < e.touches.length; i++) {
      const t = e.touches[i];
      if (t.identifier === this.activeTouchId) {
        const dx = t.clientX - this.lastTouchX;
        const dy = t.clientY - this.lastTouchY;
        this.lastTouchX = t.clientX;
        this.lastTouchY = t.clientY;
        this.yaw -= dx * 0.0035;
        this.pitch = THREE.MathUtils.clamp(
          this.pitch - dy * 0.0035,
          -Math.PI * 0.48,
          Math.PI * 0.48,
        );
        break;
      }
    }
  };

  private handleTouchEnd = () => {
    this.activeTouchId = null;
  };

  /**
   * Apply direct zero-latency head orientation onto camera & WASD flight onto rig/camera.
   */
  public applyToCamera(
    camera: THREE.PerspectiveCamera,
    vrRig: THREE.Group,
    delta: number,
    moveSpeed: number,
  ) {
    if (this.hasHardwareIMU) {
      // Exact DeviceOrientationControls intrinsic ZXY -> YXZ + forward yaw zero offset
      const alpha = this.rawAlpha - this.yawZeroOffset + this.yaw;
      _euler.set(this.rawBeta, alpha, -this.rawGamma, 'YXZ');
      _targetWorldQuat.setFromEuler(_euler);
      _targetWorldQuat.multiply(_q1);
      _q0.setFromAxisAngle(_zee, -this.screenOrientationRad);
      _targetWorldQuat.multiply(_q0);
      camera.quaternion.copy(_targetWorldQuat);
    } else {
      // Zero-latency direct Euler orientation from desktop mouse-look / touch
      _yawOffsetQuat.setFromEuler(_euler.set(this.pitch, this.yaw, 0, 'YXZ'));
      camera.quaternion.copy(_yawOffsetQuat);
    }

    // 6-DoF WASD / Arrow flight translation along camera heading
    const boost = this.keysDown.has('ShiftLeft') || this.keysDown.has('ShiftRight') ? 2.8 : 1.0;
    const stepDist = moveSpeed * boost * Math.min(delta, 0.05);
    if (stepDist <= 0) return;

    camera.getWorldDirection(_moveForward).normalize();
    _moveRight.crossVectors(_moveForward, _moveUp).normalize();

    if (this.keysDown.has('KeyW') || this.keysDown.has('ArrowUp')) {
      vrRig.position.addScaledVector(_moveForward, stepDist);
    }
    if (this.keysDown.has('KeyS') || this.keysDown.has('ArrowDown')) {
      vrRig.position.addScaledVector(_moveForward, -stepDist);
    }
    if (this.keysDown.has('KeyD') || this.keysDown.has('ArrowRight')) {
      vrRig.position.addScaledVector(_moveRight, stepDist);
    }
    if (this.keysDown.has('KeyA') || this.keysDown.has('ArrowLeft')) {
      vrRig.position.addScaledVector(_moveRight, -stepDist);
    }
    if (this.keysDown.has('Space') || this.keysDown.has('KeyE')) {
      vrRig.position.y += stepDist * 0.75;
    }
    if (this.keysDown.has('KeyC') || this.keysDown.has('KeyQ')) {
      vrRig.position.y -= stepDist * 0.75;
    }
  }
}

/**
 * Helper to probe & launch a native WebXR ('immersive-vr') headset session cleanly.
 */
export async function probeWebXRVRSupport(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('xr' in navigator)) return false;
  try {
    return Boolean(await (navigator as any).xr?.isSessionSupported?.('immersive-vr'));
  } catch {
    return false;
  }
}

export async function startWebXRVRSession(
  renderer: THREE.WebGLRenderer,
  onEnded: () => void,
): Promise<any | null> {
  if (typeof navigator === 'undefined' || !('xr' in navigator)) return null;
  const xr = (navigator as any).xr;

  const configs: any[] = [
    { optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'] },
    { optionalFeatures: ['local-floor'] },
    {},
  ];

  let session: any = null;
  for (const cfg of configs) {
    try {
      session = await xr.requestSession('immersive-vr', cfg);
      if (session) break;
    } catch {
      // Try next safer config
    }
  }
  if (!session) return null;

  try {
    renderer.xr.enabled = true;
    try {
      renderer.xr.setReferenceSpaceType('local-floor');
    } catch {
      try {
        renderer.xr.setReferenceSpaceType('local');
      } catch {}
    }
    session.addEventListener('end', onEnded, { once: true });
    await renderer.xr.setSession(session);
    return session;
  } catch {
    try {
      await session.end();
    } catch {}
    return null;
  }
}

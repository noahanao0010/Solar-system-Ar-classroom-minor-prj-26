/**
 * Device Orientation & Gyroscope Motion Controller
 * Implements real-world IMU sensor tracking (iOS 13+ permission, Android, Chrome)
 * with zero-drift calibration, smooth exponential damping, screen-orientation compensation,
 * and seamless Desktop/Laptop Virtual Gyro (mouse/touch parallax).
 */

export type GyroPermissionStatus = 'unknown' | 'granted' | 'denied' | 'prompt' | 'unsupported';

export interface GyroOrientationState {
  isSupported: boolean;
  isHardware: boolean;
  isActive: boolean;
  permission: GyroPermissionStatus;
  // Raw angles (degrees)
  alpha: number; // compass heading 0..360
  beta: number;  // pitch front/back -180..180
  gamma: number; // roll left/right -90..90
  // Calibrated, smoothed normalized values (-1 to +1 or radians)
  pitch: number; // tilt up/down (radians)
  roll: number;  // tilt left/right (radians)
  yaw: number;   // azimuth pan (radians)
  sensitivity: number;
}

type Listener = (state: GyroOrientationState) => void;

class DeviceOrientationManager {
  private static instance: DeviceOrientationManager;

  private isSupported: boolean = false;
  private isHardware: boolean = false;
  private isActive: boolean = false;
  private permission: GyroPermissionStatus = 'unknown';

  // Raw readings
  private rawAlpha: number = 0;
  private rawBeta: number = 0;
  private rawGamma: number = 0;

  // Calibrated reference zero point
  private refAlpha: number = 0;
  private refBeta: number = 45; // Default natural comfortable holding angle ~45 deg
  private refGamma: number = 0;
  private hasCalibrated: boolean = false;

  // Smoothed output values (radians)
  private currentPitch: number = 0;
  private currentRoll: number = 0;
  private currentYaw: number = 0;

  private targetPitch: number = 0;
  private targetRoll: number = 0;
  private targetYaw: number = 0;

  private sensitivity: number = 1.0;
  private listeners: Set<Listener> = new Set();
  private rafId: number | null = null;
  private lastTimestamp: number = 0;

  // Desktop virtual gyro fallback
  private mouseX: number = 0;
  private mouseY: number = 0;
  private isMouseMoving: boolean = false;
  private mouseIdleTimeout: number | null = null;

  private constructor() {
    if (typeof window !== 'undefined') {
      this.checkSupport();
    }
  }

  public static getInstance(): DeviceOrientationManager {
    if (!DeviceOrientationManager.instance) {
      DeviceOrientationManager.instance = new DeviceOrientationManager();
    }
    return DeviceOrientationManager.instance;
  }

  private checkSupport() {
    if (typeof window === 'undefined') return;

    if ('DeviceOrientationEvent' in window) {
      this.isSupported = true;
      // Check for iOS 13+ permission requirement
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        this.permission = 'prompt';
      } else {
        this.permission = 'granted';
      }
    } else {
      this.isSupported = false;
      this.permission = 'unsupported';
    }

    // Attach desktop fallback listeners by default
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('pointermove', this.handleMouseMove);
  }

  private handleMouseMove = (e: MouseEvent) => {
    // Convert to normalized coordinates [-1, 1]
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    this.mouseX = (e.clientX - cx) / cx;
    this.mouseY = (e.clientY - cy) / cy;

    this.isMouseMoving = true;
    if (this.mouseIdleTimeout) window.clearTimeout(this.mouseIdleTimeout);
    this.mouseIdleTimeout = window.setTimeout(() => {
      this.isMouseMoving = false;
    }, 2500);

    // If hardware gyro is not actively delivering events, use virtual pointer gyro
    if (!this.isHardware && this.isActive) {
      this.targetYaw = this.mouseX * 0.45 * this.sensitivity;
      this.targetPitch = -this.mouseY * 0.35 * this.sensitivity;
      this.targetRoll = -this.mouseX * 0.12 * this.sensitivity;
    }
  };

  private handleDeviceOrientation = (event: DeviceOrientationEvent) => {
    if (event.beta === null && event.gamma === null) {
      // Event fired without valid sensor hardware
      return;
    }

    this.isHardware = true;
    this.rawAlpha = event.alpha || 0;
    this.rawBeta = event.beta || 0;
    this.rawGamma = event.gamma || 0;

    if (!this.hasCalibrated) {
      this.calibrate();
    }

    // Delta relative to reference zero
    let dBeta = this.rawBeta - this.refBeta;
    let dGamma = this.rawGamma - this.refGamma;
    let dAlpha = this.rawAlpha - this.refAlpha;

    // Handle alpha 360 wrap
    if (dAlpha > 180) dAlpha -= 360;
    if (dAlpha < -180) dAlpha += 360;

    // Screen orientation offset (portrait vs landscape)
    let screenAngle = 0;
    if (window.screen && window.screen.orientation && typeof window.screen.orientation.angle === 'number') {
      screenAngle = window.screen.orientation.angle;
    } else if (typeof (window as any).orientation === 'number') {
      screenAngle = (window as any).orientation;
    }

    let pitchDeg = dBeta;
    let rollDeg = dGamma;
    let yawDeg = dAlpha;

    if (screenAngle === 90) {
      pitchDeg = -dGamma;
      rollDeg = dBeta;
    } else if (screenAngle === -90 || screenAngle === 270) {
      pitchDeg = dGamma;
      rollDeg = -dBeta;
    } else if (screenAngle === 180) {
      pitchDeg = -dBeta;
      rollDeg = -dGamma;
    }

    // Convert degrees to radians and clamp for comfort
    const deg2rad = Math.PI / 180;
    this.targetPitch = Math.max(-1.4, Math.min(1.4, pitchDeg * deg2rad * this.sensitivity));
    this.targetRoll = Math.max(-1.2, Math.min(1.2, rollDeg * deg2rad * this.sensitivity));
    this.targetYaw = Math.max(-2.0, Math.min(2.0, yawDeg * deg2rad * this.sensitivity));
  };

  /**
   * Re-zero current physical posture as the neutral horizon center
   */
  public calibrate() {
    this.refAlpha = this.rawAlpha;
    this.refBeta = this.rawBeta !== 0 ? this.rawBeta : 45;
    this.refGamma = this.rawGamma;
    this.hasCalibrated = true;
    this.currentPitch = 0;
    this.currentRoll = 0;
    this.currentYaw = 0;
    this.targetPitch = 0;
    this.targetRoll = 0;
    this.targetYaw = 0;
    this.emit();
  }

  /**
   * Request iOS 13+ permission or activate orientation tracking
   */
  public async requestEnable(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    // iOS 13+ DeviceOrientationEvent permission request
    if (
      typeof (DeviceOrientationEvent as any) !== 'undefined' &&
      typeof (DeviceOrientationEvent as any).requestPermission === 'function'
    ) {
      try {
        const response = await (DeviceOrientationEvent as any).requestPermission();
        if (response === 'granted') {
          this.permission = 'granted';
          this.startListening();
          return true;
        } else {
          this.permission = 'denied';
          this.startListening(); // fallback to virtual gyro
          return false;
        }
      } catch (err) {
        console.warn('Gyro permission request error:', err);
        this.permission = 'denied';
        this.startListening();
        return false;
      }
    } else {
      // Standard Android/Chrome or non-prompt devices
      this.permission = 'granted';
      this.startListening();
      return true;
    }
  }

  public startListening() {
    this.isActive = true;
    window.addEventListener('deviceorientation', this.handleDeviceOrientation, true);
    if (!this.rafId) {
      this.lastTimestamp = performance.now();
      this.startSmoothLoop();
    }
    this.calibrate();
  }

  public stopListening() {
    this.isActive = false;
    window.removeEventListener('deviceorientation', this.handleDeviceOrientation, true);
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.currentPitch = 0;
    this.currentRoll = 0;
    this.currentYaw = 0;
    this.targetPitch = 0;
    this.targetRoll = 0;
    this.targetYaw = 0;
    this.emit();
  }

  public setSensitivity(factor: number) {
    this.sensitivity = Math.max(0.2, Math.min(3.0, factor));
    this.emit();
  }

  private startSmoothLoop = () => {
    const loop = (now: number) => {
      if (!this.isActive) return;

      const dt = Math.min((now - this.lastTimestamp) / 1000, 0.1);
      this.lastTimestamp = now;

      // Exponential damping / smoothing (smooths out accelerometer/gyro jitter)
      const smoothingFactor = this.isHardware ? 12 : 6;
      const factor = 1 - Math.exp(-smoothingFactor * dt);

      this.currentPitch += (this.targetPitch - this.currentPitch) * factor;
      this.currentRoll += (this.targetRoll - this.currentRoll) * factor;
      this.currentYaw += (this.targetYaw - this.currentYaw) * factor;

      this.emit();
      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  };

  private emit() {
    const state = this.getState();
    this.listeners.forEach(fn => fn(state));
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getState(): GyroOrientationState {
    return {
      isSupported: this.isSupported,
      isHardware: this.isHardware,
      isActive: this.isActive,
      permission: this.permission,
      alpha: this.rawAlpha,
      beta: this.rawBeta,
      gamma: this.rawGamma,
      pitch: this.currentPitch,
      roll: this.currentRoll,
      yaw: this.currentYaw,
      sensitivity: this.sensitivity,
    };
  }
}

export const deviceGyro = DeviceOrientationManager.getInstance();

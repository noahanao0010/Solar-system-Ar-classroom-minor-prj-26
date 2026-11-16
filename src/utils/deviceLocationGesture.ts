/**
 * Phone GPS Location & Celestial Alignment & Gesture Control Manager
 * Provides real-time GPS Geolocation tracking, Local Sidereal Time (LST) calculation,
 * celestial sphere sky alignment, and multi-touch gesture motion control.
 */

import * as THREE from 'three';

export interface GpsLocationState {
  isSupported: boolean;
  isTracking: boolean;
  hasPermission: boolean;
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
  locationName: string;
  localSiderealTimeHours: number; // 0..24
  localSiderealTimeString: string;
  horizonAngleRad: number; // latitude in radians
  isSkyAligned: boolean;
}

export interface ObservatoryPreset {
  id: string;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  altitudeMeters: number;
  description: string;
}

export const OBSERVATORY_PRESETS: ObservatoryPreset[] = [
  {
    id: 'current-gps',
    name: 'My Device GPS Location',
    region: 'Live Geolocation',
    latitude: 28.5728, // Default fallback Cape Canaveral until GPS locks
    longitude: -80.649,
    altitudeMeters: 15,
    description: 'Live sensor tracking from your phone or device GPS',
  },
  {
    id: 'mauna-kea',
    name: 'Mauna Kea Observatory',
    region: 'Hawaii, USA',
    latitude: 19.8206,
    longitude: -155.4681,
    altitudeMeters: 4205,
    description: 'Premier astronomical observatory perched at 13,796 ft above Pacific inversion layer',
  },
  {
    id: 'atacama-alma',
    name: 'ALMA Observatory',
    region: 'Atacama Desert, Chile',
    latitude: -23.0293,
    longitude: -67.7551,
    altitudeMeters: 5058,
    description: 'High-altitude submillimeter telescope array on Chajnantor plateau',
  },
  {
    id: 'greenwich',
    name: 'Royal Observatory Greenwich',
    region: 'London, UK',
    latitude: 51.4769,
    longitude: 0.0005,
    altitudeMeters: 46,
    description: 'Historic Prime Meridian home (Longitude 0° 0′ 0″)',
  },
  {
    id: 'cape-canaveral',
    name: 'Kennedy Space Center',
    region: 'Florida, USA',
    latitude: 28.5729,
    longitude: -80.649,
    altitudeMeters: 3,
    description: 'America’s premier spaceport for Apollo, Shuttle, and Artemis launches',
  },
  {
    id: 'south-pole',
    name: 'South Pole Telescope',
    region: 'Amundsen-Scott Station, Antarctica',
    latitude: -90.0,
    longitude: 0.0,
    altitudeMeters: 2800,
    description: 'Submillimeter telescope studying the Cosmic Microwave Background and Dark Energy',
  },
];

type LocationListener = (state: GpsLocationState) => void;

class DeviceLocationGestureManager {
  private static instance: DeviceLocationGestureManager;

  private state: GpsLocationState = {
    isSupported: false,
    isTracking: false,
    hasPermission: false,
    latitude: 28.5728,
    longitude: -80.649,
    altitude: 15,
    accuracy: null,
    heading: null,
    speed: null,
    timestamp: Date.now(),
    locationName: 'Kennedy Space Center (Default)',
    localSiderealTimeHours: 0,
    localSiderealTimeString: '00h 00m',
    horizonAngleRad: THREE.MathUtils.degToRad(28.5728),
    isSkyAligned: false,
  };

  private watchId: number | null = null;
  private listeners: Set<LocationListener> = new Set();
  private selectedPresetId: string = 'current-gps';

  private constructor() {
    if (typeof window !== 'undefined') {
      this.state.isSupported = 'geolocation' in navigator;
      this.updateSiderealTime();
    }
  }

  public static getInstance(): DeviceLocationGestureManager {
    if (!DeviceLocationGestureManager.instance) {
      DeviceLocationGestureManager.instance = new DeviceLocationGestureManager();
    }
    return DeviceLocationGestureManager.instance;
  }

  public getState(): GpsLocationState {
    return { ...this.state };
  }

  public subscribe(listener: LocationListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const s = this.getState();
    this.listeners.forEach(fn => fn(s));
  }

  /**
   * Request user GPS position and start real-time tracking
   */
  public async startGpsTracking(): Promise<boolean> {
    if (!this.state.isSupported || typeof navigator === 'undefined' || !navigator.geolocation) {
      return false;
    }

    return new Promise(resolve => {
      this.state.isTracking = true;

      // First one-shot high accuracy query
      navigator.geolocation.getCurrentPosition(
        pos => {
          this.handlePositionUpdate(pos, 'Live Device GPS');
          this.state.hasPermission = true;
          this.notify();
          resolve(true);
        },
        err => {
          console.warn('GPS position query error:', err.message);
          this.state.isTracking = false;
          this.state.hasPermission = false;
          this.notify();
          resolve(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000,
        }
      );

      // Watch continuous movement & heading
      try {
        if (this.watchId !== null) {
          navigator.geolocation.clearWatch(this.watchId);
        }
        this.watchId = navigator.geolocation.watchPosition(
          pos => {
            this.handlePositionUpdate(pos, 'Live Device GPS');
            this.notify();
          },
          () => {},
          {
            enableHighAccuracy: true,
            maximumAge: 3000,
          }
        );
      } catch {}
    });
  }

  public stopGpsTracking() {
    if (this.watchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.state.isTracking = false;
    this.notify();
  }

  private handlePositionUpdate(pos: GeolocationPosition, label: string) {
    const coords = pos.coords;
    this.state.latitude = coords.latitude;
    this.state.longitude = coords.longitude;
    this.state.altitude = coords.altitude;
    this.state.accuracy = coords.accuracy;
    this.state.heading = coords.heading;
    this.state.speed = coords.speed;
    this.state.timestamp = pos.timestamp;
    this.state.locationName = label;
    this.state.horizonAngleRad = THREE.MathUtils.degToRad(coords.latitude);
    this.updateSiderealTime();
  }

  /**
   * Apply an observatory preset location
   */
  public setObservatoryPreset(presetId: string) {
    this.selectedPresetId = presetId;
    if (presetId === 'current-gps') {
      this.startGpsTracking();
      return;
    }

    const preset = OBSERVATORY_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    this.stopGpsTracking();
    this.state.latitude = preset.latitude;
    this.state.longitude = preset.longitude;
    this.state.altitude = preset.altitudeMeters;
    this.state.accuracy = 1;
    this.state.locationName = preset.name;
    this.state.horizonAngleRad = THREE.MathUtils.degToRad(preset.latitude);
    this.updateSiderealTime();
    this.notify();
  }

  public startWatching() {
    return this.startGpsTracking();
  }

  public setSkyAligned(aligned: boolean) {
    this.state.isSkyAligned = aligned;
    this.notify();
    return this.state.isSkyAligned;
  }

  public toggleSkyAlignment(): boolean {
    this.state.isSkyAligned = !this.state.isSkyAligned;
    this.notify();
    return this.state.isSkyAligned;
  }

  /**
   * Calculate Greenwich Mean Sidereal Time (GMST) and Local Sidereal Time (LST)
   */
  public updateSiderealTime() {
    const now = new Date();
    // Julian Day Calculation
    const jd = now.getTime() / 86400000 + 2440587.5;
    const d = jd - 2451545.0; // days since J2000.0

    // GMST in degrees
    let gmst = 280.46061837 + 360.98564736629 * d;
    gmst = ((gmst % 360) + 360) % 360;

    // Local Sidereal Time in degrees
    let lstDeg = gmst + this.state.longitude;
    lstDeg = ((lstDeg % 360) + 360) % 360;

    const lstHours = lstDeg / 15;
    this.state.localSiderealTimeHours = lstHours;

    const h = Math.floor(lstHours);
    const m = Math.floor((lstHours - h) * 60);
    this.state.localSiderealTimeString = `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m`;
  }

  /**
   * Compute Celestial Orientation Quaternions based on GPS location & LST
   */
  public getCelestialAlignmentEuler(targetEuler: THREE.Euler) {
    this.updateSiderealTime();
    const latRad = this.state.horizonAngleRad;
    const lstRad = THREE.MathUtils.degToRad(this.state.localSiderealTimeHours * 15);

    // Tilt celestial pole by latitude on X, rotate by local sidereal time on Y
    targetEuler.set(Math.PI / 2 - latRad, lstRad, 0, 'YXZ');
  }
}

export const deviceLocation = DeviceLocationGestureManager.getInstance();

/**
 * Procedural Warp Speed Particle Streaks (VFX when simulation is accelerated or on gesture zoom)
 */
export function createWarpStreaksVFX(streakCount = 200): THREE.Group {
  const group = new THREE.Group();

  const positions = new Float32Array(streakCount * 6); // 2 vertices per line
  const colors = new Float32Array(streakCount * 6);

  const radius = 30;
  for (let i = 0; i < streakCount; i++) {
    const idx = i * 6;
    const angle = Math.random() * Math.PI * 2;
    const r = 2.0 + Math.random() * radius;
    const z = (Math.random() - 0.5) * 80;
    const len = 4.0 + Math.random() * 8.0;

    // Start point
    positions[idx] = Math.cos(angle) * r;
    positions[idx + 1] = Math.sin(angle) * r;
    positions[idx + 2] = z;

    // End point trailing backwards
    positions[idx + 3] = Math.cos(angle) * r;
    positions[idx + 4] = Math.sin(angle) * r;
    positions[idx + 5] = z - len;

    // Cyan / Ice Blue starlight warp colors
    colors[idx] = 0.4;
    colors[idx + 1] = 0.85;
    colors[idx + 2] = 1.0;

    colors[idx + 3] = 0.1;
    colors[idx + 4] = 0.3;
    colors[idx + 5] = 0.8;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.0, // starts invisible until warp speed triggers
    blending: THREE.AdditiveBlending,
  });

  const lines = new THREE.LineSegments(geometry, material);
  group.add(lines);

  group.userData = {
    lines,
    material,
    update: (speedMultiplier: number, delta: number) => {
      if (speedMultiplier >= 5) {
        material.opacity = THREE.MathUtils.lerp(material.opacity, speedMultiplier >= 10 ? 0.85 : 0.45, 0.1);
        const posAttr = geometry.attributes.position as THREE.BufferAttribute;
        const arr = posAttr.array as Float32Array;
        const advance = delta * 45 * speedMultiplier;

        for (let i = 0; i < streakCount; i++) {
          const idx = i * 6;
          arr[idx + 2] += advance;
          arr[idx + 5] += advance;
          if (arr[idx + 2] > 40) {
            arr[idx + 2] -= 80;
            arr[idx + 5] -= 80;
          }
        }
        posAttr.needsUpdate = true;
      } else {
        material.opacity = THREE.MathUtils.lerp(material.opacity, 0.0, 0.15);
      }
    },
  };

  return group;
}

/**
 * Cannon.js (cannon-es) Orbital Gravity & Rigid-Body Collision Engine
 * Powers real-time Newtonian N-body gravity, rigid-body asteroid/debris collisions,
 * spacecraft deflections, and procedural 3D impact shockwave VFX in SolarSystemView.
 */

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PLANETS_DATA, ORDERED_PLANETS } from '../data/planetsData';
import { SPACECRAFTS_DATA } from '../data/spaceCraftData';
import { PlanetId, SpacecraftId } from '../types/astronomy';

export type PhysicsGravityMode = 'kepler' | 'nbody';

export interface CollisionRecord {
  id: number;
  bodyA: string;
  bodyB: string;
  labelA: string;
  labelB: string;
  impactSpeed: number;
  isMetallic: boolean;
  isSolar: boolean;
  timestamp: number;
}

export interface PhysicsStats {
  activeBodies: number;
  debrisCount: number;
  collisionCount: number;
  gravityMode: PhysicsGravityMode;
  gravityScale: number;
  lastCollision: CollisionRecord | null;
}

interface TrackedBody {
  id: string;
  label: string;
  kind: 'sun' | 'planet' | 'spacecraft' | 'debris';
  body: CANNON.Body;
  mesh: THREE.Object3D;
  radius: number;
  mass: number;
  isParentedOrbiter?: boolean;
  hasCustomScale?: boolean;
  debugWireMesh?: THREE.Group;
  debugCage?: THREE.LineSegments;
  lastForceX?: number;
  lastForceY?: number;
  lastForceZ?: number;
  flashRemaining?: number;
}

interface ImpactBurst {
  group: THREE.Group;
  ring: THREE.Mesh;
  ringMat: THREE.MeshBasicMaterial;
  sparks: THREE.Points;
  sparkMat: THREE.PointsMaterial;
  sparkDirs: Float32Array;
  age: number;
  maxAge: number;
}

// Gravitational constant tuned cleanly for Three.js solar scene radii (5.5 .. 42 units)
const G_CONST = 0.045;
const SUN_MASS = 4200;

const PLANET_PHYSICS_MASS: Record<PlanetId, number> = {
  sun: SUN_MASS,
  mercury: 1.6,
  venus: 8.5,
  earth: 10.0,
  mars: 3.4,
  jupiter: 165.0,
  saturn: 95.0,
  uranus: 26.0,
  neptune: 29.0,
};

// Pre-allocated math helpers for zero GC in step()
const _cDiff = new CANNON.Vec3();
const _cForce = new CANNON.Vec3();
const _tWorldPos = new THREE.Vector3();
const _tWorldQuat = new THREE.Quaternion();
const _tImpactPos = new THREE.Vector3();

function createAsteroidVisualGroup(radius: number, isBolide: boolean): THREE.Group {
  const group = new THREE.Group();

  // 1. Primary irregular silicate/iron core (perturbed dodecahedron)
  const coreGeo = new THREE.DodecahedronGeometry(radius, 0);
  const posAttr = coreGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const jitter = 0.84 + ((Math.sin(i * 17.3 + radius * 11) + 1) * 0.5) * 0.3;
    posAttr.setXYZ(
      i,
      posAttr.getX(i) * jitter,
      posAttr.getY(i) * (jitter * 0.92),
      posAttr.getZ(i) * jitter,
    );
  }
  coreGeo.computeVertexNormals();

  const coreMat = new THREE.MeshStandardMaterial({
    color: isBolide ? 0x8b6f5c : 0x64748b,
    roughness: isBolide ? 0.82 : 0.88,
    metalness: 0.22,
    emissive: isBolide ? new THREE.Color(0x9a3412) : new THREE.Color(0x0f172a),
    emissiveIntensity: isBolide ? 0.55 : 0.12,
  });
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  coreMesh.castShadow = true;
  coreMesh.receiveShadow = true;
  group.add(coreMesh);

  // 2. Secondary mineral ridge / boulder outcrop (varied roughness >= 0.25)
  const shardGeo = new THREE.OctahedronGeometry(radius * 0.52, 0);
  const shardMat = new THREE.MeshStandardMaterial({
    color: isBolide ? 0xf59e0b : 0x94a3b8,
    roughness: 0.45,
    metalness: 0.65,
    emissive: isBolide ? new THREE.Color(0xf97316) : new THREE.Color(0x000000),
    emissiveIntensity: isBolide ? 0.65 : 0,
  });
  const shardMesh = new THREE.Mesh(shardGeo, shardMat);
  shardMesh.position.set(radius * 0.48, radius * 0.18, -radius * 0.2);
  shardMesh.rotation.set(0.6, 1.1, 0.3);
  group.add(shardMesh);

  // 3. Accent plasma coma halo for launched meteoroids or metallic ice cap for belt rocks
  const accentGeo = new THREE.IcosahedronGeometry(radius * (isBolide ? 1.28 : 0.34), 1);
  const accentMat = isBolide
    ? new THREE.MeshBasicMaterial({
        color: 0xfb923c,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    : new THREE.MeshStandardMaterial({
        color: 0xbae6fd,
        roughness: 0.28,
        metalness: 0.15,
      });
  const accentMesh = new THREE.Mesh(accentGeo, accentMat);
  if (!isBolide) {
    accentMesh.position.set(-radius * 0.42, -radius * 0.25, radius * 0.35);
  }
  group.add(accentMesh);

  return group;
}

export class OrbitalPhysicsEngine {
  public world: CANNON.World;
  private scene: THREE.Object3D;
  private debrisGroup: THREE.Group;
  private vfxGroup: THREE.Group;

  private bodiesMap = new Map<string, TrackedBody>();
  private bodyIdToTracked = new Map<number, TrackedBody>();
  private debrisList: TrackedBody[] = [];
  private activeBursts: ImpactBurst[] = [];

  private gravityMode: PhysicsGravityMode = 'kepler';
  private gravityScale = 1.0;
  private collisionCount = 0;
  private collisionIdSeq = 0;
  private debrisSeq = 0;
  private lastCollision: CollisionRecord | null = null;
  private lastCollisionPairTime = new Map<string, number>();

  private spaceMaterial: CANNON.Material;
  private onCollisionCallback?: (record: CollisionRecord, intensity: number) => void;

  // Visual Wireframe Collider & Gravity Vector Overlay
  private debugGroup: THREE.Group;
  private debugWireframeEnabled = false;
  private sharedSphereWireGeo: THREE.WireframeGeometry;
  private sharedGravityRingGeo: THREE.BufferGeometry;
  private debugMats: Record<'sun' | 'planetKepler' | 'planetNbody' | 'spacecraft' | 'debris' | 'flash' | 'wellRing', THREE.LineBasicMaterial>;
  private vectorGeo: THREE.BufferGeometry;
  private vectorPosAttr: THREE.BufferAttribute;
  private vectorColAttr: THREE.BufferAttribute;
  private vectorLines: THREE.LineSegments;
  private readonly maxDebugBodies = 128;

  constructor(
    scene: THREE.Object3D,
    onCollision?: (record: CollisionRecord, intensity: number) => void,
  ) {
    this.scene = scene;
    this.onCollisionCallback = onCollision;

    this.world = new CANNON.World();
    this.world.gravity.set(0, 0, 0);
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.allowSleep = false;

    this.spaceMaterial = new CANNON.Material('celestial');
    const contactMat = new CANNON.ContactMaterial(this.spaceMaterial, this.spaceMaterial, {
      friction: 0.12,
      restitution: 0.76,
    });
    this.world.addContactMaterial(contactMat);
    this.world.defaultContactMaterial = contactMat;

    this.debrisGroup = new THREE.Group();
    this.debrisGroup.name = 'CannonPhysicsDebris';
    this.scene.add(this.debrisGroup);

    this.vfxGroup = new THREE.Group();
    this.vfxGroup.name = 'CannonCollisionVFX';
    this.scene.add(this.vfxGroup);

    // Wireframe Collider & Gravity Vector Overlay Rig (zero duplicate sphere geometry allocations)
    this.debugGroup = new THREE.Group();
    this.debugGroup.name = 'CannonDebugWireframes';
    this.debugGroup.visible = false;
    this.scene.add(this.debugGroup);

    const baseSphere = new THREE.SphereGeometry(1, 16, 12);
    this.sharedSphereWireGeo = new THREE.WireframeGeometry(baseSphere);
    baseSphere.dispose();

    const ringPts: THREE.Vector3[] = [];
    const ringSegs = 40;
    for (let i = 0; i < ringSegs; i++) {
      const a0 = (i / ringSegs) * Math.PI * 2;
      const a1 = ((i + 1) / ringSegs) * Math.PI * 2;
      ringPts.push(new THREE.Vector3(Math.cos(a0), 0, Math.sin(a0)));
      ringPts.push(new THREE.Vector3(Math.cos(a1), 0, Math.sin(a1)));
    }
    this.sharedGravityRingGeo = new THREE.BufferGeometry().setFromPoints(ringPts);

    this.debugMats = {
      sun: new THREE.LineBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.78 }),
      planetKepler: new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.78 }),
      planetNbody: new THREE.LineBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.85 }),
      spacecraft: new THREE.LineBasicMaterial({ color: 0xc084fc, transparent: true, opacity: 0.85 }),
      debris: new THREE.LineBasicMaterial({ color: 0xfb7185, transparent: true, opacity: 0.82 }),
      flash: new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.98 }),
      wellRing: new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.34 }),
    };

    // Pre-allocated dynamic buffer for Velocity (cyan) + Net Gravity Force (amber) vectors
    const maxVerts = this.maxDebugBodies * 4;
    const posBuf = new Float32Array(maxVerts * 3);
    const colBuf = new Float32Array(maxVerts * 3);
    this.vectorPosAttr = new THREE.BufferAttribute(posBuf, 3);
    this.vectorPosAttr.setUsage(THREE.DynamicDrawUsage);
    this.vectorColAttr = new THREE.BufferAttribute(colBuf, 3);
    this.vectorColAttr.setUsage(THREE.DynamicDrawUsage);
    this.vectorGeo = new THREE.BufferGeometry();
    this.vectorGeo.setAttribute('position', this.vectorPosAttr);
    this.vectorGeo.setAttribute('color', this.vectorColAttr);
    this.vectorGeo.setDrawRange(0, 0);

    const vectorMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.vectorLines = new THREE.LineSegments(this.vectorGeo, vectorMat);
    this.vectorLines.frustumCulled = false;
    this.debugGroup.add(this.vectorLines);
  }

  public isDebugWireframeVisible(): boolean {
    return this.debugWireframeEnabled;
  }

  public setDebugWireframeVisible(visible: boolean) {
    this.debugWireframeEnabled = visible;
    this.debugGroup.visible = visible;
    if (visible) {
      this.syncDebugWireframes(0);
    }
  }

  private getDebugMat(tracked: TrackedBody): THREE.LineBasicMaterial {
    if ((tracked.flashRemaining || 0) > 0) return this.debugMats.flash;
    if (tracked.kind === 'sun') return this.debugMats.sun;
    if (tracked.kind === 'spacecraft') return this.debugMats.spacecraft;
    if (tracked.kind === 'debris') return this.debugMats.debris;
    return this.gravityMode === 'nbody' ? this.debugMats.planetNbody : this.debugMats.planetKepler;
  }

  private attachDebugOverlay(tracked: TrackedBody) {
    const holder = new THREE.Group();
    const cage = new THREE.LineSegments(this.sharedSphereWireGeo, this.getDebugMat(tracked));
    cage.scale.setScalar(tracked.radius);
    holder.add(cage);

    // Gravitational sphere-of-influence ring for Sun & planets
    if (tracked.kind === 'sun' || tracked.kind === 'planet') {
      const wellRing = new THREE.LineSegments(this.sharedGravityRingGeo, this.debugMats.wellRing);
      wellRing.scale.setScalar(tracked.radius * (tracked.kind === 'sun' ? 2.1 : 2.35));
      holder.add(wellRing);
    }

    holder.position.set(tracked.body.position.x, tracked.body.position.y, tracked.body.position.z);
    this.debugGroup.add(holder);
    tracked.debugWireMesh = holder;
    tracked.debugCage = cage;
  }

  private readLocalPos(mesh: THREE.Object3D, out: THREE.Vector3): THREE.Vector3 {
    mesh.getWorldPosition(out);
    this.scene.worldToLocal(out);
    return out;
  }

  public getGravityMode(): PhysicsGravityMode {
    return this.gravityMode;
  }

  public getGravityScale(): number {
    return this.gravityScale;
  }

  public setGravityScale(scale: number) {
    this.gravityScale = THREE.MathUtils.clamp(scale, 0.2, 3.0);
  }

  public getStats(): PhysicsStats {
    return {
      activeBodies: this.bodiesMap.size + this.debrisList.length,
      debrisCount: this.debrisList.length,
      collisionCount: this.collisionCount,
      gravityMode: this.gravityMode,
      gravityScale: this.gravityScale,
      lastCollision: this.lastCollision,
    };
  }

  public registerSun(sunMesh: THREE.Object3D, radius: number = 3.05) {
    const body = new CANNON.Body({
      mass: 0, // Anchored heliocentric gravitational core
      type: CANNON.Body.STATIC,
      material: this.spaceMaterial,
      position: new CANNON.Vec3(0, 0, 0),
      shape: new CANNON.Sphere(radius),
    });

    const tracked: TrackedBody = {
      id: 'sun',
      label: 'Sun',
      kind: 'sun',
      body,
      mesh: sunMesh,
      radius,
      mass: SUN_MASS,
    };
    this.attachDebugOverlay(tracked);
    this.attachCollisionListener(tracked);
    this.world.addBody(body);
    this.bodiesMap.set('sun', tracked);
    this.bodyIdToTracked.set(body.id, tracked);
  }

  public registerPlanet(planetId: PlanetId, mesh: THREE.Object3D) {
    const pData = PLANETS_DATA[planetId];
    if (!pData || planetId === 'sun') return;
    const radius = pData.scale3D;
    const mass = PLANET_PHYSICS_MASS[planetId] || 5;

    this.readLocalPos(mesh, _tWorldPos);
    const body = new CANNON.Body({
      mass,
      type: CANNON.Body.KINEMATIC,
      material: this.spaceMaterial,
      position: new CANNON.Vec3(_tWorldPos.x, _tWorldPos.y, _tWorldPos.z),
      shape: new CANNON.Sphere(radius),
      linearDamping: 0,
      angularDamping: 0.02,
    });

    const tracked: TrackedBody = {
      id: planetId,
      label: pData.name,
      kind: 'planet',
      body,
      mesh,
      radius,
      mass,
    };
    this.attachDebugOverlay(tracked);
    this.attachCollisionListener(tracked);
    this.world.addBody(body);
    this.bodiesMap.set(planetId, tracked);
    this.bodyIdToTracked.set(body.id, tracked);
  }

  public registerSpacecraft(
    id: SpacecraftId,
    mesh: THREE.Object3D,
    isParentedOrbiter: boolean,
    radius: number = 0.45,
  ) {
    const info = SPACECRAFTS_DATA[id];
    this.readLocalPos(mesh, _tWorldPos);

    const body = new CANNON.Body({
      mass: 0.15,
      type: CANNON.Body.KINEMATIC,
      material: this.spaceMaterial,
      position: new CANNON.Vec3(_tWorldPos.x, _tWorldPos.y, _tWorldPos.z),
      shape: new CANNON.Sphere(radius),
      linearDamping: 0,
      angularDamping: 0.04,
    });

    const tracked: TrackedBody = {
      id,
      label: info?.name || id,
      kind: 'spacecraft',
      body,
      mesh,
      radius,
      mass: 0.15,
      isParentedOrbiter,
    };
    this.attachDebugOverlay(tracked);
    this.attachCollisionListener(tracked);
    this.world.addBody(body);
    this.bodiesMap.set(id, tracked);
    this.bodyIdToTracked.set(body.id, tracked);
  }

  /**
   * Switch between Guided Keplerian mode (exact classroom orbits + live debris physics)
   * and Full N-Body Newtonian Cannon.js Gravity mode (dynamic mutually-attracting planets & craft).
   */
  public setGravityMode(mode: PhysicsGravityMode) {
    if (this.gravityMode === mode) return;
    this.gravityMode = mode;

    ORDERED_PLANETS.forEach(pId => {
      const tracked = this.bodiesMap.get(pId);
      if (!tracked || pId === 'sun') return;

      if (mode === 'nbody') {
        this.readLocalPos(tracked.mesh, _tWorldPos);
        tracked.body.position.set(_tWorldPos.x, _tWorldPos.y, _tWorldPos.z);
        tracked.body.type = CANNON.Body.DYNAMIC;
        tracked.body.mass = tracked.mass;
        tracked.body.updateMassProperties();

        // Exact circular tangential speed: v = sqrt(G * M_sun * gScale / r)
        const r = Math.max(2.0, Math.hypot(_tWorldPos.x, _tWorldPos.z));
        const vMag = Math.sqrt((G_CONST * SUN_MASS * this.gravityScale) / r);
        const tangentX = -_tWorldPos.z / r;
        const tangentZ = _tWorldPos.x / r;
        tracked.body.velocity.set(tangentX * vMag, 0, tangentZ * vMag);
        tracked.body.force.set(0, 0, 0);
        tracked.body.wakeUp();
      } else {
        tracked.body.type = CANNON.Body.KINEMATIC;
        tracked.body.mass = 0;
        tracked.body.updateMassProperties();
        tracked.body.velocity.set(0, 0, 0);
        tracked.body.angularVelocity.set(0, 0, 0);
      }
    });

    // Free solar-orbiting spacecraft (starship, saturn-v, sls) enter dynamic gravity in nbody mode
    this.bodiesMap.forEach(tracked => {
      if (tracked.kind !== 'spacecraft' || tracked.isParentedOrbiter) return;
      if (mode === 'nbody') {
        this.readLocalPos(tracked.mesh, _tWorldPos);
        tracked.body.position.set(_tWorldPos.x, _tWorldPos.y, _tWorldPos.z);
        tracked.body.type = CANNON.Body.DYNAMIC;
        tracked.body.mass = tracked.mass;
        tracked.body.updateMassProperties();
        const r = Math.max(3.0, Math.hypot(_tWorldPos.x, _tWorldPos.z));
        const vMag = Math.sqrt((G_CONST * SUN_MASS * this.gravityScale) / r);
        tracked.body.velocity.set((-_tWorldPos.z / r) * vMag, 0, (_tWorldPos.x / r) * vMag);
        tracked.body.wakeUp();
      } else {
        tracked.body.type = CANNON.Body.KINEMATIC;
        tracked.body.mass = 0;
        tracked.body.updateMassProperties();
        tracked.body.velocity.set(0, 0, 0);
        tracked.body.angularVelocity.set(0, 0, 0);
      }
    });
  }

  /**
   * Seed rocky orbital debris & belt asteroids orbiting dynamically under Cannon.js gravity.
   */
  public seedOrbitalDebris(count: number = 24) {
    for (let i = 0; i < count; i++) {
      const beltRadius = 11 + Math.random() * 11; // Earth to Asteroid Belt zone
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
      const y = (Math.random() - 0.5) * 1.4;
      const px = Math.cos(angle) * beltRadius;
      const pz = Math.sin(angle) * beltRadius;
      const vMag = Math.sqrt((G_CONST * SUN_MASS * this.gravityScale) / beltRadius) * (0.94 + Math.random() * 0.12);
      const vx = (-Math.sin(angle)) * vMag;
      const vz = (Math.cos(angle)) * vMag;

      this.spawnDebrisBody(
        new THREE.Vector3(px, y, pz),
        new THREE.Vector3(vx, (Math.random() - 0.5) * 0.35, vz),
        0.16 + Math.random() * 0.14,
        false,
        `Belt Rock #${this.debrisSeq + 1}`,
      );
    }
  }

  /**
   * Launch an incoming high-velocity meteoroid aimed toward a target world position (or focused planet).
   */
  public launchMeteoroid(
    origin: THREE.Vector3,
    target: THREE.Vector3,
    speedMultiplier: number = 1.0,
  ): string {
    const dir = target.clone().sub(origin);
    const dist = Math.max(1, dir.length());
    dir.normalize();

    // Add tangential orbital deflection + aiming speed so it arcs realistically through gravity wells
    const launchSpeed = Math.min(24, Math.max(9.5, dist * 0.52)) * speedMultiplier;
    const velocity = dir.multiplyScalar(launchSpeed);

    const id = this.spawnDebrisBody(
      origin,
      velocity,
      0.26 + Math.random() * 0.12,
      true,
      `Meteor #${this.debrisSeq + 1}`,
    );
    return id;
  }

  private spawnDebrisBody(
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    radius: number,
    isBolide: boolean,
    label: string,
  ): string {
    // Cap active dynamic debris at 72 bodies to keep broadphase silky smooth on all devices
    if (this.debrisList.length >= 72) {
      const oldest = this.debrisList.shift();
      if (oldest) this.removeDebris(oldest);
    }

    const id = `debris-${++this.debrisSeq}`;
    const mass = Math.max(0.08, radius * radius * 2.2);
    const mesh = createAsteroidVisualGroup(radius, isBolide);
    mesh.position.copy(position);
    mesh.userData = { id, kind: 'debris', name: label };
    this.debrisGroup.add(mesh);

    const body = new CANNON.Body({
      mass,
      type: CANNON.Body.DYNAMIC,
      material: this.spaceMaterial,
      position: new CANNON.Vec3(position.x, position.y, position.z),
      velocity: new CANNON.Vec3(velocity.x, velocity.y, velocity.z),
      angularVelocity: new CANNON.Vec3(
        (Math.random() - 0.5) * 3.5,
        (Math.random() - 0.5) * 3.5,
        (Math.random() - 0.5) * 3.5,
      ),
      shape: new CANNON.Sphere(radius),
      linearDamping: 0,
      angularDamping: 0.01,
    });

    const tracked: TrackedBody = {
      id,
      label,
      kind: 'debris',
      body,
      mesh,
      radius,
      mass,
    };

    this.attachDebugOverlay(tracked);
    this.attachCollisionListener(tracked);
    this.world.addBody(body);
    this.debrisList.push(tracked);
    this.bodyIdToTracked.set(body.id, tracked);
    return id;
  }

  private removeDebris(tracked: TrackedBody) {
    this.world.removeBody(tracked.body);
    this.bodyIdToTracked.delete(tracked.body.id);
    if (tracked.debugWireMesh) {
      this.debugGroup.remove(tracked.debugWireMesh);
    }
    this.debrisGroup.remove(tracked.mesh);
    tracked.mesh.traverse(child => {
      const m = child as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      if (m.material) {
        if (Array.isArray(m.material)) m.material.forEach(mt => mt.dispose());
        else m.material.dispose();
      }
    });
  }

  public clearDebris() {
    while (this.debrisList.length > 0) {
      const item = this.debrisList.pop();
      if (item) this.removeDebris(item);
    }
  }

  public resetAll(reseedCount: number = 22) {
    this.setGravityMode('kepler');
    this.clearDebris();
    this.collisionCount = 0;
    this.lastCollision = null;
    this.lastCollisionPairTime.clear();
    this.seedOrbitalDebris(reseedCount);
  }

  private attachCollisionListener(tracked: TrackedBody) {
    tracked.body.addEventListener('collide', (event: { body: CANNON.Body; contact: CANNON.ContactEquation }) => {
      const other = this.bodyIdToTracked.get(event.body.id);
      if (!other) return;

      // Deduplicate bi-directional Cannon.js collide trigger (lowest body id handles event once)
      if (tracked.body.id > other.body.id) return;

      const relImpact = Math.abs(event.contact.getImpactVelocityAlongNormal());
      if (relImpact < 0.7) return;

      const pairKey = `${tracked.id}::${other.id}`;
      const now = performance.now();
      const prevTime = this.lastCollisionPairTime.get(pairKey) || 0;
      if (now - prevTime < 260) return;
      this.lastCollisionPairTime.set(pairKey, now);

      this.collisionCount += 1;
      tracked.flashRemaining = 0.42;
      other.flashRemaining = 0.42;
      const isSolar = tracked.kind === 'sun' || other.kind === 'sun';
      const isMetallic = tracked.kind === 'spacecraft' || other.kind === 'spacecraft';

      _tImpactPos.set(
        tracked.body.position.x + event.contact.ri.x,
        tracked.body.position.y + event.contact.ri.y,
        tracked.body.position.z + event.contact.ri.z,
      );

      const intensity = THREE.MathUtils.clamp(relImpact / 14, 0.25, 1.0);
      this.spawnImpactVfx(_tImpactPos, intensity, isSolar, isMetallic);

      const record: CollisionRecord = {
        id: ++this.collisionIdSeq,
        bodyA: tracked.id,
        bodyB: other.id,
        labelA: tracked.label,
        labelB: other.label,
        impactSpeed: parseFloat(relImpact.toFixed(1)),
        isMetallic,
        isSolar,
        timestamp: now,
      };
      this.lastCollision = record;
      this.onCollisionCallback?.(record, intensity);
    });
  }

  private spawnImpactVfx(
    worldPos: THREE.Vector3,
    intensity: number,
    isSolar: boolean,
    isMetallic: boolean,
  ) {
    const group = new THREE.Group();
    group.position.copy(worldPos);

    const accentColor = isSolar ? 0xfb923c : isMetallic ? 0x38bdf8 : 0xfbbf24;

    // 1. Expanding radial shockwave ring
    const ringGeo = new THREE.RingGeometry(0.18, 0.34, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: accentColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.random() * Math.PI;
    ring.rotation.y = Math.random() * Math.PI;
    group.add(ring);

    // 2. Additive ejecta sparks burst
    const sparkCount = 18;
    const positions = new Float32Array(sparkCount * 3);
    const sparkDirs = new Float32Array(sparkCount * 3);
    for (let i = 0; i < sparkCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = (1.6 + Math.random() * 2.8) * (0.6 + intensity);
      sparkDirs[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      sparkDirs[i * 3 + 1] = Math.cos(phi) * speed;
      sparkDirs[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;
    }

    const sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const sparkMat = new THREE.PointsMaterial({
      color: accentColor,
      size: 0.22 + intensity * 0.16,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sparks = new THREE.Points(sparkGeo, sparkMat);
    group.add(sparks);

    this.vfxGroup.add(group);
    this.activeBursts.push({
      group,
      ring,
      ringMat,
      sparks,
      sparkMat,
      sparkDirs,
      age: 0,
      maxAge: 0.85,
    });
  }

  /**
   * Apply central solar + planetary Newtonian gravity & step Cannon.js physics world.
   */
  public step(delta: number, simSpeed: number) {
    // Always animate impact burst VFX even if simulation paused
    for (let i = this.activeBursts.length - 1; i >= 0; i--) {
      const burst = this.activeBursts[i];
      burst.age += Math.min(delta, 0.05);
      const t = Math.min(1, burst.age / burst.maxAge);
      const eased = 1 - Math.pow(1 - t, 3);

      burst.ring.scale.setScalar(1 + eased * 4.5);
      burst.ringMat.opacity = (1 - t) * 0.9;

      const posAttr = burst.sparks.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let s = 0; s < posAttr.count; s++) {
        posAttr.setXYZ(
          s,
          burst.sparkDirs[s * 3] * eased * 0.75,
          burst.sparkDirs[s * 3 + 1] * eased * 0.75,
          burst.sparkDirs[s * 3 + 2] * eased * 0.75,
        );
      }
      posAttr.needsUpdate = true;
      burst.sparkMat.opacity = 1 - t;

      if (burst.age >= burst.maxAge) {
        this.vfxGroup.remove(burst.group);
        burst.ring.geometry.dispose();
        burst.ringMat.dispose();
        burst.sparks.geometry.dispose();
        burst.sparkMat.dispose();
        this.activeBursts.splice(i, 1);
      }
    }

    if (simSpeed <= 0) {
      if (this.debugWireframeEnabled) {
        this.syncDebugWireframes(delta);
      }
      return;
    }

    const clampedDt = Math.min(delta, 0.05);
    const scaledDt = clampedDt * Math.min(simSpeed, 4.0);

    // 1. Sync kinematic bodies in Kepler mode (planets & orbiters) so debris collides with moving planets
    this.bodiesMap.forEach(tracked => {
      if (tracked.body.type === CANNON.Body.KINEMATIC) {
        this.readLocalPos(tracked.mesh, _tWorldPos);
        tracked.body.position.set(_tWorldPos.x, _tWorldPos.y, _tWorldPos.z);

        // Give planets approximate orbital velocity so collisions impart realistic slingshot momentum
        if (tracked.kind === 'planet') {
          const r = Math.max(1.5, Math.hypot(_tWorldPos.x, _tWorldPos.z));
          const vMag = Math.sqrt((G_CONST * SUN_MASS * this.gravityScale) / r);
          tracked.body.velocity.set((-_tWorldPos.z / r) * vMag, 0, (_tWorldPos.x / r) * vMag);
        }
      }
    });

    // 2. Apply N-Body Gravitational Forces onto all DYNAMIC bodies (debris + N-body planets + free craft)
    const gScaled = G_CONST * this.gravityScale;
    const dynamicTargets: TrackedBody[] = [...this.debrisList];
    this.bodiesMap.forEach(t => {
      t.lastForceX = 0;
      t.lastForceY = 0;
      t.lastForceZ = 0;
      if (t.body.type === CANNON.Body.DYNAMIC) dynamicTargets.push(t);
    });

    // Massive attractors: Sun + all planets
    const attractors: TrackedBody[] = [];
    const sunTracked = this.bodiesMap.get('sun');
    if (sunTracked) attractors.push(sunTracked);
    ORDERED_PLANETS.forEach(pId => {
      const pt = this.bodiesMap.get(pId);
      if (pt) attractors.push(pt);
    });

    for (let i = 0; i < dynamicTargets.length; i++) {
      const target = dynamicTargets[i];
      let netFx = 0;
      let netFy = 0;
      let netFz = 0;
      for (let j = 0; j < attractors.length; j++) {
        const attr = attractors[j];
        if (attr.id === target.id) continue;

        _cDiff.set(
          attr.body.position.x - target.body.position.x,
          attr.body.position.y - target.body.position.y,
          attr.body.position.z - target.body.position.z,
        );
        const distSq = _cDiff.lengthSquared();
        const minSoftSq = Math.pow(attr.radius + target.radius + 0.35, 2);
        const softDistSq = Math.max(distSq, minSoftSq);
        const dist = Math.sqrt(softDistSq);

        // F = G * m1 * m2 / r^2
        const forceMag = (gScaled * attr.mass * target.mass) / softDistSq;
        _cDiff.scale(forceMag / dist, _cForce);
        target.body.applyForce(_cForce, target.body.position);
        netFx += _cForce.x;
        netFy += _cForce.y;
        netFz += _cForce.z;
      }
      target.lastForceX = netFx;
      target.lastForceY = netFy;
      target.lastForceZ = netFz;
    }

    // 3. Step Cannon.js Physics World with sub-stepping for orbital precision
    const fixedStep = 1 / 60;
    this.world.step(fixedStep, scaledDt, 4);

    // 4. Write Dynamic Cannon.js Transforms Back to Three.js Meshes
    for (let i = this.debrisList.length - 1; i >= 0; i--) {
      const d = this.debrisList[i];
      const distFromOrigin = Math.hypot(d.body.position.x, d.body.position.y, d.body.position.z);

      // Vaporize inside solar core or prune far runaway ejecta (> 140 units)
      if (distFromOrigin < 2.85 || distFromOrigin > 140) {
        if (distFromOrigin < 2.85) {
          _tImpactPos.set(d.body.position.x, d.body.position.y, d.body.position.z);
          this.spawnImpactVfx(_tImpactPos, 0.85, true, false);
        }
        this.removeDebris(d);
        this.debrisList.splice(i, 1);
        continue;
      }

      d.mesh.position.set(d.body.position.x, d.body.position.y, d.body.position.z);
      _tWorldQuat.set(d.body.quaternion.x, d.body.quaternion.y, d.body.quaternion.z, d.body.quaternion.w);
      d.mesh.quaternion.copy(_tWorldQuat);
    }

    if (this.gravityMode === 'nbody') {
      this.bodiesMap.forEach(tracked => {
        if (tracked.body.type !== CANNON.Body.DYNAMIC) return;
        tracked.mesh.position.set(tracked.body.position.x, tracked.body.position.y, tracked.body.position.z);
      });
    }

    // 5. Update Visual Wireframe Colliders & Velocity / Gravity Force Vector Overlay
    if (this.debugWireframeEnabled) {
      this.syncDebugWireframes(delta);
    }
  }

  private syncDebugWireframes(delta: number) {
    const posArr = this.vectorPosAttr.array as Float32Array;
    const colArr = this.vectorColAttr.array as Float32Array;
    let vertIdx = 0;

    const processBody = (tracked: TrackedBody) => {
      if ((tracked.flashRemaining || 0) > 0) {
        tracked.flashRemaining = Math.max(0, (tracked.flashRemaining || 0) - delta);
      }

      if (tracked.debugWireMesh && tracked.debugCage) {
        tracked.debugWireMesh.position.set(
          tracked.body.position.x,
          tracked.body.position.y,
          tracked.body.position.z,
        );
        if (tracked.kind === 'debris' || tracked.body.type === CANNON.Body.DYNAMIC) {
          _tWorldQuat.set(
            tracked.body.quaternion.x,
            tracked.body.quaternion.y,
            tracked.body.quaternion.z,
            tracked.body.quaternion.w,
          );
          tracked.debugWireMesh.quaternion.copy(_tWorldQuat);
        }
        tracked.debugCage.material = this.getDebugMat(tracked);
      }

      if (vertIdx + 4 > this.maxDebugBodies * 4) return;

      const bx = tracked.body.position.x;
      const by = tracked.body.position.y;
      const bz = tracked.body.position.z;

      // Velocity Vector (Cyan)
      const vx = tracked.body.velocity.x;
      const vy = tracked.body.velocity.y;
      const vz = tracked.body.velocity.z;
      const vLen = Math.hypot(vx, vy, vz);
      if (vLen > 0.05) {
        const scaleV = Math.min(3.8, vLen * 0.24);
        const invV = scaleV / vLen;
        const pOff = vertIdx * 3;
        posArr[pOff] = bx;
        posArr[pOff + 1] = by;
        posArr[pOff + 2] = bz;
        posArr[pOff + 3] = bx + vx * invV;
        posArr[pOff + 4] = by + vy * invV;
        posArr[pOff + 5] = bz + vz * invV;
        colArr[pOff] = 0.22;
        colArr[pOff + 1] = 0.88;
        colArr[pOff + 2] = 0.98;
        colArr[pOff + 3] = 0.22;
        colArr[pOff + 4] = 0.88;
        colArr[pOff + 5] = 0.98;
        vertIdx += 2;
      }

      // Gravity Attraction Force Vector (Amber pointing toward net gravitational pull)
      let fx = tracked.lastForceX || 0;
      let fy = tracked.lastForceY || 0;
      let fz = tracked.lastForceZ || 0;

      // In Kepler mode, show Sun's instantaneous inward gravitational pull on planets for educational clarity
      if (fx === 0 && fy === 0 && fz === 0 && tracked.kind === 'planet') {
        const r = Math.max(1.5, Math.hypot(bx, by, bz));
        fx = -bx / r;
        fy = -by / r;
        fz = -bz / r;
      }

      const fLen = Math.hypot(fx, fy, fz);
      if (fLen > 0.0001 && vertIdx + 2 <= this.maxDebugBodies * 4) {
        const arrowLen = tracked.radius + Math.min(3.2, 0.9 + Math.log1p(fLen) * 0.45);
        const invF = arrowLen / fLen;
        const pOff = vertIdx * 3;
        posArr[pOff] = bx;
        posArr[pOff + 1] = by;
        posArr[pOff + 2] = bz;
        posArr[pOff + 3] = bx + fx * invF;
        posArr[pOff + 4] = by + fy * invF;
        posArr[pOff + 5] = bz + fz * invF;
        colArr[pOff] = 0.98;
        colArr[pOff + 1] = 0.65;
        colArr[pOff + 2] = 0.12;
        colArr[pOff + 3] = 0.98;
        colArr[pOff + 4] = 0.65;
        colArr[pOff + 5] = 0.12;
        vertIdx += 2;
      }
    };

    this.bodiesMap.forEach(processBody);
    for (let i = 0; i < this.debrisList.length; i++) {
      processBody(this.debrisList[i]);
    }

    this.vectorPosAttr.needsUpdate = true;
    this.vectorColAttr.needsUpdate = true;
    this.vectorGeo.setDrawRange(0, vertIdx);
  }

  public dispose() {
    this.clearDebris();
    this.activeBursts.forEach(burst => {
      this.vfxGroup.remove(burst.group);
      burst.ring.geometry.dispose();
      burst.ringMat.dispose();
      burst.sparks.geometry.dispose();
      burst.sparkMat.dispose();
    });
    this.activeBursts = [];
    this.bodiesMap.forEach(t => {
      this.world.removeBody(t.body);
      if (t.debugWireMesh) this.debugGroup.remove(t.debugWireMesh);
    });
    this.bodiesMap.clear();
    this.bodyIdToTracked.clear();
    this.sharedSphereWireGeo.dispose();
    this.sharedGravityRingGeo.dispose();
    this.vectorGeo.dispose();
    (this.vectorLines.material as THREE.Material).dispose();
    Object.values(this.debugMats).forEach(m => m.dispose());
    this.scene.remove(this.debugGroup);
    this.scene.remove(this.debrisGroup);
    this.scene.remove(this.vfxGroup);
  }
}

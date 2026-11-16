import { PLANETS_DATA, ORDERED_PLANETS } from '../data/planetsData';
import { SPACECRAFTS_DATA } from '../data/spaceCraftData';
import { GALAXIES_DATA } from '../data/galaxiesData';
import { PlanetId, SpacecraftId, GalaxyId, ArPlaceableId } from '../types/astronomy';

export interface HologramSpec {
  id: string;
  name: string;
  classification: string;
  specCode: string;
  accentColor: string;
  statusBadge: string;
  coordinates: string;
  distanceMetric: { label: string; value: string };
  dimensionMetric: { label: string; value: string };
  velocityMetric: { label: string; value: string };
  tempOrMassMetric: { label: string; value: string };
  compositionOrPower: { label: string; value: string };
  primaryOverview: string;
  telemetryStream: { label: string; val: string }[];
  deepScanDetails: string[];
  intelBriefing: string;
  audioSonarFrequency: number;
}

export function getHologramSpec(id: string): HologramSpec {
  // 1. Mini Solar System
  if (id === 'minisystem') {
    return {
      id: 'minisystem',
      name: 'Solar System Collective',
      classification: 'STAR-SYSTEM // G2V MULTI-PLANETARY COMPACT',
      specCode: 'SYS-SOL-001-MACRO',
      accentColor: '#f59e0b',
      statusBadge: 'HARMONIC ORBITAL RESONANCE // ACTIVE',
      coordinates: 'RA 17h 57m | Dec +04° 24′ (Local Bubble)',
      distanceMetric: { label: 'Galactic Center', value: '26,670 ly' },
      dimensionMetric: { label: 'Heliopause Diameter', value: '120 AU' },
      velocityMetric: { label: 'Galactic Orbital Speed', value: '220 km/s' },
      tempOrMassMetric: { label: 'Combined System Mass', value: '1.0014 M☉' },
      compositionOrPower: { label: 'Primary Mass Anchor', value: '99.86% Hydrogen/Helium Star' },
      primaryOverview:
        'A gravitationally bound planetary system comprising the Sun, eight major planets, hundreds of moons, millions of asteroids, and trillions of Oort cloud comets orbiting within the Orion-Cygnus Arm.',
      telemetryStream: [
        { label: 'INNER WORLDS', val: '4 Terrestrial (Silicate/Iron)' },
        { label: 'OUTER WORLDS', val: '4 Jovian (Gas & Ice Giants)' },
        { label: 'ORBITAL INCLINATION', val: '60.2° to Galactic Plane' },
        { label: 'STELLAR METALLICITY', val: '[Fe/H] = +0.00 (Solar Standard)' },
      ],
      deepScanDetails: [
        'Heliopause termination shock situated ~120 AU, shielding planets from interstellar galactic cosmic rays.',
        'Planetary orbital planes aligned within 7 degrees of the solar invariable plane.',
        'Gravitational resonance stabilized over 4.568 billion years through Jupiter-Saturn harmonic balance.',
      ],
      intelBriefing:
        'If the Solar System were scaled down to the size of a standard classroom, the Sun would be a grain of sand and Earth an invisible dust particle 15 feet away.',
      audioSonarFrequency: 440,
    };
  }

  // 2. Planets & Sun
  if (id in PLANETS_DATA) {
    const p = PLANETS_DATA[id as PlanetId];
    const isSun = id === 'sun';
    const orderIdx = isSun ? 0 : ORDERED_PLANETS.indexOf(id as PlanetId) + 1;
    return {
      id: p.id,
      name: p.name,
      classification: isSun ? 'STELLAR CORE // G2V MAIN-SEQUENCE' : `PLANETARY SPHERE // ${p.type.toUpperCase()}`,
      specCode: `PLN-${p.id.toUpperCase()}-0${orderIdx}`,
      accentColor: p.accentColor,
      statusBadge: isSun ? 'CORE THERMONUCLEAR FUSION // STABLE' : 'HYDROSTATIC EQUILIBRIUM // VERIFIED',
      coordinates: `Solar Dist: ${p.distanceFromSunKm.toLocaleString()} km`,
      distanceMetric: { label: 'Distance from Sun', value: `${(p.distanceFromSunKm / 1e6).toFixed(1)}M km` },
      dimensionMetric: { label: 'Equatorial Diameter', value: `${p.diameterKm.toLocaleString()} km` },
      velocityMetric: { label: 'Orbital Period', value: isSun ? '220 km/s (Galactic)' : `${p.orbitPeriodDays} Earth Days` },
      tempOrMassMetric: { label: 'Surface Gravity', value: `${p.surfaceGravityMs2} m/s²` },
      compositionOrPower: { label: 'Planetary Moons', value: `${p.moonsCount} Known Satellites` },
      primaryOverview: p.overview,
      telemetryStream: [
        { label: 'AXIAL TILT', val: `${p.tiltDegrees}°` },
        { label: 'SURFACE GRAVITY', val: `${p.surfaceGravityMs2} m/s²` },
        { label: 'ORBIT RADIUS', val: `${p.orbitRadius3D.toFixed(1)} AU Virtual` },
        { label: 'SOLAR ORDER', val: isSun ? 'Central Star' : `Position #${orderIdx}` },
      ],
      deepScanDetails: [
        `Atmosphere: ${p.tagline}`,
        p.funFacts[0] || 'Atmospheric telemetry confirms high-density planetary equilibrium.',
        p.funFacts[1] || 'Magnetic dynamo induces stable field lines across magnetosphere.',
      ],
      intelBriefing: p.funFacts[2] || p.funFacts[0] || p.overview,
      audioSonarFrequency: isSun ? 110 : 320 + orderIdx * 65,
    };
  }

  // 3. Spacecraft & Satellites
  if (id in SPACECRAFTS_DATA) {
    const sc = SPACECRAFTS_DATA[id as SpacecraftId];
    return {
      id: sc.id,
      name: sc.name,
      classification: `AEROSPACE VEHICLE // ${sc.category.toUpperCase()}`,
      specCode: `SC-${sc.id.toUpperCase()}-v3`,
      accentColor: sc.accentColor,
      statusBadge: 'FLIGHT TELEMETRY LINK // ACTIVE',
      coordinates: `${sc.altitudeOrDistance} (${sc.orbitOrDestination})`,
      distanceMetric: { label: 'Operational Orbit', value: sc.altitudeOrDistance },
      dimensionMetric: { label: 'Craft Dimensions', value: sc.dimensions },
      velocityMetric: { label: 'Maximum Velocity', value: sc.maxSpeed },
      tempOrMassMetric: { label: 'Vehicle Mass', value: sc.massKg },
      compositionOrPower: { label: 'Operator / Agency', value: sc.agency },
      primaryOverview: sc.description,
      telemetryStream: [
        { label: 'MISSION ERA', val: sc.era },
        { label: 'OPERATOR', val: sc.agency },
        { label: 'TARGET ZONE', val: sc.orbitOrDestination },
        { label: 'TELEMETRY STATUS', val: 'Nominal 100%' },
      ],
      deepScanDetails: sc.keyMilestones.length > 0 ? sc.keyMilestones : [
        'Propulsion and attitude control thrusters operating with full precision.',
        'High-gain antenna arrays transmitting telemetry continuously to ground stations.',
      ],
      intelBriefing: sc.funFacts[0] || sc.tagline,
      audioSonarFrequency: 520,
    };
  }

  // 4. Galaxies & Cosmic Structures
  if (id in GALAXIES_DATA) {
    const gx = GALAXIES_DATA[id];
    return {
      id: gx.id,
      name: gx.name,
      classification: `DEEP COSMIC STRUCTURE // ${gx.type.toUpperCase()}`,
      specCode: `GLX-${gx.id.toUpperCase()}-EXT`,
      accentColor: gx.accentColor,
      statusBadge: 'COSMIC REDSHIFT SPECTRA // IDENTIFIED',
      coordinates: `${gx.constellation} | ${gx.distanceLightYears}`,
      distanceMetric: { label: 'Distance from Earth', value: gx.distanceLightYears },
      dimensionMetric: { label: 'Spatial Diameter', value: `${gx.diameterLightYears.toLocaleString()} ly` },
      velocityMetric: { label: 'Stellar Population', value: gx.estimatedStars },
      tempOrMassMetric: { label: 'Gravitational Core', value: gx.blackHoleMass },
      compositionOrPower: { label: 'Morphology Type', value: gx.morphology },
      primaryOverview: gx.overview,
      telemetryStream: [
        { label: 'CATALOG DESIGNATION', val: gx.catalogName },
        { label: 'MORPHOLOGY CLASS', val: gx.morphology },
        { label: 'ROTATION DYNAMICS', val: gx.scientificDetails.rotationVelocity },
        { label: 'MERGER STATUS', val: gx.scientificDetails.mergerStatus },
      ],
      deepScanDetails: gx.keyFeatures.length > 0 ? gx.keyFeatures : [
        'Massive star formation nursery identified within spiral arm gas reserves.',
        'Dark matter halo profile dominates rotational curve at outer radii.',
      ],
      intelBriefing: gx.funFacts[0] || gx.tagline,
      audioSonarFrequency: 180,
    };
  }

  // Default Fallback
  return {
    id,
    name: 'Unknown Cosmic Artifact',
    classification: 'UNRESOLVED CELESTIAL TARGET',
    specCode: 'UNK-OBJ-X',
    accentColor: '#38bdf8',
    statusBadge: 'SPECTRAL SIGNATURE PENDING',
    coordinates: 'Equatorial J2000 System',
    distanceMetric: { label: 'Distance', value: 'Variable' },
    dimensionMetric: { label: 'Diameter', value: 'Unspecified' },
    velocityMetric: { label: 'Velocity', value: 'Sub-light' },
    tempOrMassMetric: { label: 'Mass', value: 'Uncalculated' },
    compositionOrPower: { label: 'Composition', value: 'Baryonic / Dark Matter' },
    primaryOverview: 'Celestial object captured on deep astronomical surveys.',
    telemetryStream: [{ label: 'SENSOR STATUS', val: 'Calibrating...' }],
    deepScanDetails: ['Telemetry stream syncing with ground observatory network.'],
    intelBriefing: 'Exploration data pending further teacher and student observation.',
    audioSonarFrequency: 440,
  };
}

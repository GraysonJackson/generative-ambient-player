import { SceneId } from '../types/ambient';

/**
 * Deterministic 32-bit PRNG: Mulberry32
 * Given an initial seed integer, produces high-quality pseudo-random floats in [0, 1).
 * Reproducible across all platforms and execution environments.
 */
export function createMulberry32(seedNum: number): () => number {
  let s = seedNum >>> 0;
  return function mulberry32(): number {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministically hash any seed string into a 32-bit unsigned integer.
 */
export function hashStringToSeed(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Generate a new hexadecimal seed formatted as #xxxxxx.
 */
export function generateRandomSeed(): string {
  const hex = Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, '0');
  return `#${hex}`;
}

export interface LayerScheduledEvent {
  step: number; // Step index within sequence (e.g. 0 to 31)
  timeOffset: number; // Offset in 16th notes
  layerId: string;
  note?: string;
  duration: string;
  velocity: number;
  probability: number;
  filterMod?: number; // Normalized filter sweep delta
}

export interface DeterministicSoundscapePlan {
  seed: string;
  seedNumber: number;
  sceneId: SceneId;
  totalSteps: number;
  layerEvents: Record<string, LayerScheduledEvent[]>;
}

/**
 * Scale definition maps for scenes
 */
const SCENE_SCALES: Record<SceneId, { roots: string[]; notes: string[]; bassNotes: string[] }> = {
  rain: {
    roots: ['D3', 'F3', 'A3', 'C4'],
    notes: ['D4', 'E4', 'F4', 'G4', 'A4', 'C5', 'D5', 'F5'],
    bassNotes: ['D2', 'F2', 'G2', 'A2', 'Bb2', 'C3'],
  },
  library: {
    roots: ['C3', 'G3', 'Bb3', 'D4'],
    notes: ['C4', 'Eb4', 'F4', 'G4', 'Bb4', 'C5', 'Eb5', 'G5'],
    bassNotes: ['C2', 'Eb2', 'F2', 'G2', 'Bb2'],
  },
  space: {
    roots: ['A2', 'E3', 'A3', 'B3'],
    notes: ['E4', 'F#4', 'A4', 'B4', 'D5', 'E5', 'G#5', 'B5'],
    bassNotes: ['A1', 'E2', 'F#2', 'A2', 'C#3'],
  },
  tavern: {
    roots: ['G3', 'D4', 'G4', 'B4'],
    notes: ['G4', 'A4', 'B4', 'D5', 'E5', 'G5', 'A5'],
    bassNotes: ['G2', 'B2', 'C3', 'D3', 'E3'],
  },
};

/**
 * Deterministically generates a 32-step musical/acoustic scheduling plan
 * using Mulberry32 seeded with the input seed.
 * Identical seeds are guaranteed to yield identical plans.
 */
export function generateDeterministicPlan(
  sceneId: SceneId,
  seedString: string,
  totalSteps = 32
): DeterministicSoundscapePlan {
  const seedNum = hashStringToSeed(seedString);
  const rng = createMulberry32(seedNum);

  const scale = SCENE_SCALES[sceneId] || SCENE_SCALES.rain;
  const eventsByLayer: Record<string, LayerScheduledEvent[]> = {
    layer_1: [],
    layer_2: [],
    layer_3: [],
    layer_4: [],
  };

  // Pre-generate layer event schedules deterministically
  for (let step = 0; step < totalSteps; step++) {
    // Layer 1: Ambient texture / crackle / patter / sweep
    const roll1 = rng();
    if (roll1 > 0.3) {
      eventsByLayer.layer_1.push({
        step,
        timeOffset: step,
        layerId: 'layer_1',
        duration: '16n',
        velocity: 0.3 + rng() * 0.4,
        probability: roll1,
        filterMod: 0.2 + rng() * 0.6,
      });
    }

    // Layer 2: Drone / resonant pad / harmonic foundation
    // Triggered less frequently on musical step boundaries (every 4 or 8 steps)
    if (step % 4 === 0) {
      const bassNote = scale.bassNotes[Math.floor(rng() * scale.bassNotes.length)];
      eventsByLayer.layer_2.push({
        step,
        timeOffset: step,
        layerId: 'layer_2',
        note: bassNote,
        duration: '2n',
        velocity: 0.5 + rng() * 0.3,
        probability: 0.9,
        filterMod: rng(),
      });
    }

    // Layer 3: Acoustic transients / ticks / impulses / thunder rumble
    const roll3 = rng();
    if (roll3 > 0.65) {
      eventsByLayer.layer_3.push({
        step,
        timeOffset: step,
        layerId: 'layer_3',
        duration: '8n',
        velocity: 0.4 + rng() * 0.5,
        probability: roll3,
        filterMod: rng(),
      });
    }

    // Layer 4: Melodic droplets / pulsar pings / bells / whispers
    const roll4 = rng();
    if (roll4 > 0.5) {
      const melodyNote = scale.notes[Math.floor(rng() * scale.notes.length)];
      eventsByLayer.layer_4.push({
        step,
        timeOffset: step,
        layerId: 'layer_4',
        note: melodyNote,
        duration: rng() > 0.5 ? '8n' : '16n',
        velocity: 0.35 + rng() * 0.45,
        probability: roll4,
      });
    }
  }

  return {
    seed: seedString,
    seedNumber: seedNum,
    sceneId,
    totalSteps,
    layerEvents: eventsByLayer,
  };
}

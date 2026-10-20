import { describe, it, expect } from 'vitest';
import {
  createMulberry32,
  hashStringToSeed,
  generateDeterministicPlan,
  generateRandomSeed,
} from '../audio/prng';

describe('Mulberry32 PRNG & Seeded Scheduling', () => {
  it('produces identical pseudo-random sequence for identical integer seeds', () => {
    const seed = 133742;
    const rngA = createMulberry32(seed);
    const rngB = createMulberry32(seed);

    const valuesA = Array.from({ length: 100 }, () => rngA());
    const valuesB = Array.from({ length: 100 }, () => rngB());

    expect(valuesA).toEqual(valuesB);
    expect(valuesA.every((v) => v >= 0 && v < 1)).toBe(true);
  });

  it('produces distinct sequences for different seeds', () => {
    const rng1 = createMulberry32(1111);
    const rng2 = createMulberry32(2222);

    const values1 = Array.from({ length: 20 }, () => rng1());
    const values2 = Array.from({ length: 20 }, () => rng2());

    expect(values1).not.toEqual(values2);
  });

  it('deterministically hashes seed strings to 32-bit unsigned integers', () => {
    const hash1 = hashStringToSeed('#8f3a1c');
    const hash2 = hashStringToSeed('#8f3a1c');
    const hashOther = hashStringToSeed('#4a82e1');

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hashOther);
    expect(hash1).toBeGreaterThanOrEqual(0);
    expect(hash1).toBeLessThanOrEqual(4294967295);
  });

  it('generates reproducible soundscape event plans for identical seeds', () => {
    const seed = '#deepspace42';
    const planA = generateDeterministicPlan('space', seed, 32);
    const planB = generateDeterministicPlan('space', seed, 32);

    expect(planA.totalSteps).toBe(32);
    expect(planA.layerEvents).toEqual(planB.layerEvents);
    expect(planA.layerEvents.layer_1.length).toBeGreaterThan(0);
    expect(planA.layerEvents.layer_2.length).toBeGreaterThan(0);
  });

  it('generates different event plans when reseeded', () => {
    const plan1 = generateDeterministicPlan('rain', '#seed111', 32);
    const plan2 = generateDeterministicPlan('rain', '#seed999', 32);

    expect(plan1.layerEvents).not.toEqual(plan2.layerEvents);
  });

  it('generates valid hex formatted random seeds', () => {
    const seed = generateRandomSeed();
    expect(seed).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

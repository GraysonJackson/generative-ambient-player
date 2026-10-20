import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoomtoneAudioEngine } from '../audio/engine';

describe('RoomtoneAudioEngine Lifecycle & AudioContext Contracts', () => {
  let engine: RoomtoneAudioEngine;

  beforeEach(() => {
    vi.restoreAllMocks();
    engine = new RoomtoneAudioEngine();
  });

  it('strictly defers audio graph initialization on creation (silent on load)', () => {
    expect(engine.getInitialized()).toBe(false);
    expect(engine.getIsRunning()).toBe(false);
  });

  it('tracks current seed and scene ID cleanly', () => {
    expect(engine.getCurrentSceneId()).toBe('rain');
    expect(engine.getCurrentSeed()).toBe('#8f3a1c');
  });

  it('stops and cleans up idempotently without errors', () => {
    expect(() => {
      engine.stopAudio();
    }).not.toThrow();

    expect(engine.getIsRunning()).toBe(false);

    expect(() => {
      engine.dispose();
    }).not.toThrow();

    expect(engine.getInitialized()).toBe(false);
    expect(engine.getIsRunning()).toBe(false);
  });

  it('supports scene switching idempotently when stopped', () => {
    expect(() => {
      engine.switchScene('space', '#newseed', {
        layer_1: { volume: 0.5, muted: false, tone: 0.5 },
        layer_2: { volume: 0.5, muted: false, tone: 0.5 },
        layer_3: { volume: 0.5, muted: false, tone: 0.5 },
        layer_4: { volume: 0.5, muted: false, tone: 0.5 },
      });
    }).not.toThrow();

    expect(engine.getCurrentSceneId()).toBe('space');
    expect(engine.getCurrentSeed()).toBe('#newseed');
  });
});

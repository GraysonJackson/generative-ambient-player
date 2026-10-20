import { describe, it, expect } from 'vitest';
import { SCENES, SCENE_LIST } from '../audio/scenes';
import { SceneId } from '../types/ambient';

describe('Scene Configurations', () => {
  const expectedSceneIds: SceneId[] = ['rain', 'library', 'space', 'tavern'];

  it('contains exactly 4 launch scenes', () => {
    expect(SCENE_LIST.length).toBe(4);
    expectedSceneIds.forEach((id) => {
      expect(SCENES[id]).toBeDefined();
    });
  });

  it('defines the correct bank numbers and titles for all 4 scenes', () => {
    expect(SCENES.rain.name).toBe('Rain on a Window');
    expect(SCENES.rain.bankNumber).toContain('01');

    expect(SCENES.library.name).toBe('Empty Library');
    expect(SCENES.library.bankNumber).toContain('02');

    expect(SCENES.space.name).toBe('Deep Space');
    expect(SCENES.space.bankNumber).toContain('03');

    expect(SCENES.tavern.name).toBe('Tavern Before Opening');
    expect(SCENES.tavern.bankNumber).toContain('04');
  });

  it('provides exactly 4 independent layer lanes per scene with valid controls', () => {
    expectedSceneIds.forEach((id) => {
      const scene = SCENES[id];
      expect(scene.layers.length).toBe(4);
      scene.layers.forEach((layer) => {
        expect(layer.id).toMatch(/^layer_[1-4]$/);
        expect(layer.name).toBeTruthy();
        expect(layer.defaultVolume).toBeGreaterThan(0);
        expect(layer.defaultVolume).toBeLessThanOrEqual(1);
        expect(typeof layer.defaultMuted).toBe('boolean');
        expect(layer.defaultTone).toBeGreaterThan(0);
        expect(layer.defaultTone).toBeLessThanOrEqual(1);
      });
    });
  });
});

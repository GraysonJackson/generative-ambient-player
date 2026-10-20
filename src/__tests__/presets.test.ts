import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import {
  PRESETS_STORAGE_KEY,
  DEFAULT_PRESETS,
  getStoredPresets,
  savePresetToStorage,
  deletePresetFromStorage,
} from '../storage/presets';
import { RoomtonePreset } from '../types/ambient';

describe('Local Preset Persistence (roomtone.presets.v1)', () => {
  let mockStore: Record<string, string> = {};

  beforeAll(() => {
    const mockStorage = {
      getItem: (key: string) => mockStore[key] ?? null,
      setItem: (key: string, value: string) => {
        mockStore[key] = value.toString();
      },
      removeItem: (key: string) => {
        delete mockStore[key];
      },
      clear: () => {
        mockStore = {};
      },
      key: (i: number) => Object.keys(mockStore)[i] ?? null,
      get length() {
        return Object.keys(mockStore).length;
      },
    };

    (global as any).localStorage = mockStorage;
    (global as any).window = {
      localStorage: mockStorage,
    };
  });

  beforeEach(() => {
    localStorage.clear();
  });

  it('uses storage key roomtone.presets.v1', () => {
    expect(PRESETS_STORAGE_KEY).toBe('roomtone.presets.v1');
  });

  it('returns default presets when localStorage is unpopulated', () => {
    const presets = getStoredPresets();
    expect(presets.length).toBe(DEFAULT_PRESETS.length);
    expect(presets[0].id).toBe('rt_rain_01');
    expect(localStorage.getItem(PRESETS_STORAGE_KEY)).toBeNull();
  });

  it('saves a new preset to localStorage', () => {
    const customPreset: RoomtonePreset = {
      id: 'rt_custom_test',
      name: 'Test Ambient Preset',
      sceneId: 'space',
      seed: '#998877',
      tempo: 52,
      masterVolume: 0.9,
      layers: {
        layer_1: { volume: 0.8, muted: false, tone: 0.5 },
        layer_2: { volume: 0.6, muted: true, tone: 0.3 },
        layer_3: { volume: 0.4, muted: false, tone: 0.7 },
        layer_4: { volume: 0.7, muted: false, tone: 0.6 },
      },
      updatedAt: Date.now(),
    };

    const updated = savePresetToStorage(customPreset);
    expect(updated.some((p) => p.id === 'rt_custom_test')).toBe(true);

    const raw = localStorage.getItem(PRESETS_STORAGE_KEY);
    expect(raw).toContain('Test Ambient Preset');
    expect(raw).toContain('#998877');
  });

  it('updates an existing preset when matching ID is saved', () => {
    const initial = getStoredPresets();
    const toUpdate = { ...initial[0], name: 'Updated Rain Preset', tempo: 80 };

    savePresetToStorage(toUpdate);
    const reloaded = getStoredPresets();
    const found = reloaded.find((p) => p.id === initial[0].id);

    expect(found?.name).toBe('Updated Rain Preset');
    expect(found?.tempo).toBe(80);
  });

  it('deletes a preset from localStorage', () => {
    const presets = getStoredPresets();
    const idToDelete = presets[0].id;

    const remaining = deletePresetFromStorage(idToDelete);
    expect(remaining.some((p) => p.id === idToDelete)).toBe(false);

    const reloaded = getStoredPresets();
    expect(reloaded.some((p) => p.id === idToDelete)).toBe(false);
  });
});

describe('invalid saved state',()=>{
 it('rejects malformed preset objects and preserves an explicitly empty list',()=>{
  localStorage.setItem(PRESETS_STORAGE_KEY,JSON.stringify([{sceneId:'unknown',masterVolume:99}]));
  expect(getStoredPresets()).toEqual([]);
  localStorage.setItem(PRESETS_STORAGE_KEY,'[]');
  expect(getStoredPresets()).toEqual([]);
 });
});

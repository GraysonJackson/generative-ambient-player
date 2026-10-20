export type SceneId = 'rain' | 'library' | 'space' | 'tavern';

export interface LayerConfig {
  id: string;
  name: string;
  description: string;
  defaultVolume: number; // 0.0 - 1.0
  defaultMuted: boolean;
  defaultTone: number; // 0.0 - 1.0 (filter brightness)
}

export interface SceneConfig {
  id: SceneId;
  bankNumber: string;
  name: string;
  description: string;
  defaultTempo: number; // BPM
  layers: LayerConfig[];
}

export interface LayerState {
  volume: number; // 0.0 - 1.0
  muted: boolean;
  tone: number; // 0.0 - 1.0
}

export interface RoomtonePreset {
  id: string;
  name: string;
  sceneId: SceneId;
  seed: string;
  tempo: number;
  masterVolume: number;
  layers: Record<string, { volume: number; muted: boolean; tone: number }>;
  updatedAt: number;
}

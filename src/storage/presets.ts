import { RoomtonePreset } from '../types/ambient';

export const PRESETS_STORAGE_KEY = 'roomtone.presets.v1';

export const DEFAULT_PRESETS: RoomtonePreset[] = [
  {
    id: 'rt_rain_01',
    name: 'Deep Rain Sanctuary',
    sceneId: 'rain',
    seed: '#4a82e1',
    tempo: 72,
    masterVolume: 0.35,
    layers: {
      layer_1: { volume: 0.75, muted: false, tone: 0.65 },
      layer_2: { volume: 0.6, muted: false, tone: 0.4 },
      layer_3: { volume: 0.45, muted: false, tone: 0.3 },
      layer_4: { volume: 0.68, muted: false, tone: 0.75 },
    },
    updatedAt: 1729460000000,
  },
  {
    id: 'rt_lib_02',
    name: 'Midnight Library Focus',
    sceneId: 'library',
    seed: '#b2c89f',
    tempo: 60,
    masterVolume: 0.35,
    layers: {
      layer_1: { volume: 0.7, muted: false, tone: 0.45 },
      layer_2: { volume: 0.55, muted: false, tone: 0.6 },
      layer_3: { volume: 0.4, muted: false, tone: 0.35 },
      layer_4: { volume: 0.65, muted: false, tone: 0.5 },
    },
    updatedAt: 1729461000000,
  },
  {
    id: 'rt_spc_03',
    name: 'Stellar Drift Voyager',
    sceneId: 'space',
    seed: '#8f3a1c',
    tempo: 48,
    masterVolume: 0.35,
    layers: {
      layer_1: { volume: 0.8, muted: false, tone: 0.55 },
      layer_2: { volume: 0.75, muted: false, tone: 0.3 },
      layer_3: { volume: 0.5, muted: false, tone: 0.8 },
      layer_4: { volume: 0.6, muted: false, tone: 0.7 },
    },
    updatedAt: 1729462000000,
  },
  {
    id: 'rt_tav_04',
    name: 'Tavern Before Opening',
    sceneId: 'tavern',
    seed: '#e79c3d',
    tempo: 84,
    masterVolume: 0.35,
    layers: {
      layer_1: { volume: 0.65, muted: false, tone: 0.7 },
      layer_2: { volume: 0.5, muted: false, tone: 0.4 },
      layer_3: { volume: 0.6, muted: false, tone: 0.5 },
      layer_4: { volume: 0.55, muted: false, tone: 0.65 },
    },
    updatedAt: 1729463000000,
  },
];

export function validatePreset(value:unknown): value is RoomtonePreset {
  if(!value||typeof value!=='object')return false;
  const p=value as RoomtonePreset;
  const unit=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1;
  return typeof p.id==='string'&&p.id.length>0&&p.id.length<=100&&typeof p.name==='string'&&p.name.trim().length>0&&p.name.length<=80&&['rain','library','space','tavern'].includes(p.sceneId)&&typeof p.seed==='string'&&p.seed.length<=100&&Number.isFinite(p.tempo)&&p.tempo>=40&&p.tempo<=140&&unit(p.masterVolume)&&Number.isFinite(p.updatedAt)&&!!p.layers&&['layer_1','layer_2','layer_3','layer_4'].every(id=>{const l=p.layers[id];return !!l&&unit(l.volume)&&unit(l.tone)&&typeof l.muted==='boolean';});
}
export function getStoredPresets():RoomtonePreset[]{
  try{if(typeof window==='undefined')return DEFAULT_PRESETS;const raw=window.localStorage.getItem(PRESETS_STORAGE_KEY);if(!raw)return DEFAULT_PRESETS;const parsed=JSON.parse(raw);return Array.isArray(parsed)?parsed.filter(validatePreset).slice(0,50):DEFAULT_PRESETS;}catch{return DEFAULT_PRESETS;}
}
export function savePresetToStorage(preset:RoomtonePreset):RoomtonePreset[]{
  const current=getStoredPresets();if(!validatePreset(preset))return current;const updated=[...current.filter(p=>p.id!==preset.id),{...preset,updatedAt:Date.now()}].slice(-50);window.localStorage.setItem(PRESETS_STORAGE_KEY,JSON.stringify(updated));return updated;
}
export function deletePresetFromStorage(id:string):RoomtonePreset[]{const updated=getStoredPresets().filter(p=>p.id!==id);window.localStorage.setItem(PRESETS_STORAGE_KEY,JSON.stringify(updated));return updated;}

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SceneId, LayerState, RoomtonePreset } from './types/ambient';
import { SCENES, SCENE_LIST } from './audio/scenes';
import { RoomtoneAudioEngine } from './audio/engine';
import { generateRandomSeed } from './audio/prng';
import {
  getStoredPresets,
  savePresetToStorage,
  deletePresetFromStorage,
} from './storage/presets';
import { OscilloscopeCanvas } from './components/OscilloscopeCanvas';
import { MasterTransport } from './components/MasterTransport';
import { SceneSelector } from './components/SceneSelector';
import { LayerLane } from './components/LayerLane';
import { PresetsBar } from './components/PresetsBar';

export default function App() {
  const [activeSceneId, setActiveSceneId] = useState<SceneId>('rain');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [masterVolume, setMasterVolume] = useState<number>(0.35);
  const [isStarting,setIsStarting]=useState(false);
  const startPending=useRef(false);
  const [tempo, setTempo] = useState<number>(72);
  const [seed, setSeed] = useState<string>('#8f3a1c');

  // Layer States for each layer: layer_1, layer_2, layer_3, layer_4
  const [layerStates, setLayerStates] = useState<Record<string, LayerState>>(() => {
    const initial: Record<string, LayerState> = {};
    SCENES.rain.layers.forEach((l) => {
      initial[l.id] = {
        volume: l.defaultVolume,
        muted: l.defaultMuted,
        tone: l.defaultTone,
      };
    });
    return initial;
  });

  // Live VU Meter levels (0.0 - 1.0)
  const [meterLevels, setMeterLevels] = useState<Record<string, number>>({
    layer_1: 0,
    layer_2: 0,
    layer_3: 0,
    layer_4: 0,
  });

  // Presets State
  const [presets, setPresets] = useState<RoomtonePreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('rt_rain_01');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Audio Engine Instance
  const engineRef = useRef<RoomtoneAudioEngine | null>(null);
  const animFrameRef = useRef<number>(0);

  // Initialize presets on mount
  useEffect(() => {
    const loaded = getStoredPresets();
    setPresets(loaded);
    if (loaded.length > 0) {
      setSelectedPresetId(loaded[0].id);
    }
  }, []);

  // Initialize engine reference lazily
  if (!engineRef.current) {
    engineRef.current = new RoomtoneAudioEngine();
  }

  // Component unmount cleanup: ensures zero orphaned Web Audio nodes or runaway loops
  useEffect(() => {
    const engine = engineRef.current;
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      if (engine) {
        engine.dispose();
      }
    };
  }, []);

  // Live Signal Meter animation loop
  useEffect(() => {
    let lastUpdate=0;
    function updateMeters(time=0) {
      if (!isPlaying || document.hidden) return;
      if (time-lastUpdate>66) {
        lastUpdate=time;
        setMeterLevels(Object.fromEntries(['layer_1','layer_2','layer_3','layer_4'].map(id=>[id,engineRef.current?.getLayerMeterLevel(id)||0])));
      }
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) animFrameRef.current=requestAnimationFrame(updateMeters);
    }
    function resume(){cancelAnimationFrame(animFrameRef.current);if(isPlaying&&!document.hidden)updateMeters();}
    document.addEventListener('visibilitychange',resume);
    if(isPlaying) updateMeters(); else setMeterLevels({layer_1:0,layer_2:0,layer_3:0,layer_4:0});
    return ()=>{cancelAnimationFrame(animFrameRef.current);document.removeEventListener('visibilitychange',resume);};
  }, [isPlaying]);

  // Master Play / Stop toggle
  const togglePlay = async () => {
    const engine=engineRef.current;
    if(!engine||startPending.current)return;
    if(isPlaying){engine.stopAudio();setIsPlaying(false);return;}
    startPending.current=true;setIsStarting(true);
    try{engine.setMasterVolume(masterVolume);await engine.startAudio(activeSceneId,seed,layerStates,tempo);setIsPlaying(true);}
    catch{engine.stopAudio();setIsPlaying(false);showFeedback('Audio could not start. Check browser sound permissions, then try Play again.');}
    finally{startPending.current=false;setIsStarting(false);}
  };

  // Scene Switching: Idempotent teardown without audio stacking
  const handleSelectScene = (newSceneId: SceneId) => {
    setActiveSceneId(newSceneId);
    const newConfig = SCENES[newSceneId];
    if (!newConfig) return;

    // Reset default layer states for the new scene
    const newLayers: Record<string, LayerState> = {};
    newConfig.layers.forEach((l) => {
      newLayers[l.id] = {
        volume: l.defaultVolume,
        muted: l.defaultMuted,
        tone: l.defaultTone,
      };
    });
    setLayerStates(newLayers);
    setTempo(newConfig.defaultTempo);

    if (engineRef.current) {
      engineRef.current.switchScene(newSceneId, seed, newLayers, newConfig.defaultTempo);
    }
  };

  // Reseed Mulberry32 deterministic engine
  const handleReseed = () => {
    const newSeed = generateRandomSeed();
    setSeed(newSeed);
    if (engineRef.current) {
      engineRef.current.reseed(newSeed, layerStates);
    }
  };

  // Master Volume handler
  const handleMasterVolumeChange = (vol: number) => {
    setMasterVolume(vol);
    if (engineRef.current) {
      engineRef.current.setMasterVolume(vol);
    }
  };

  // Tempo BPM handler
  const handleTempoChange = (bpm: number) => {
    setTempo(bpm);
    if (engineRef.current) {
      engineRef.current.setTempo(bpm);
    }
  };

  // Layer Update handler (faders, knobs, mute)
  const handleUpdateLayer = (layerId: string, updatedState: LayerState) => {
    const updated = { ...layerStates, [layerId]: updatedState };
    setLayerStates(updated);
    if (engineRef.current) {
      engineRef.current.updateLayer(layerId, updatedState);
    }
  };

  // Waveform Getter for CRT Canvas
  const getMasterWaveform = useCallback(() => {
    if (engineRef.current) {
      return engineRef.current.getMasterWaveform();
    }
    return new Float32Array(256);
  }, []);

  // Save Current Preset
  const handleSavePreset = (name: string) => {
    const newPreset: RoomtonePreset = {
      id: `rt_custom_${Date.now()}`,
      name,
      sceneId: activeSceneId,
      seed,
      tempo,
      masterVolume,
      layers: { ...layerStates },
      updatedAt: Date.now(),
    };
    let updatedList:RoomtonePreset[];
    try{updatedList=savePresetToStorage(newPreset);}catch{showFeedback("Browser storage is unavailable. Preset was not saved.");return;}
    setPresets(updatedList);
    setSelectedPresetId(newPreset.id);
    showFeedback('Preset saved on this browser.');
  };

  // Restore Preset: Updates settings but does NOT start playback automatically
  const handleRestorePreset = () => {
    const target = presets.find((p) => p.id === selectedPresetId);
    if (!target) return;

    setActiveSceneId(target.sceneId);
    setSeed(target.seed);
    setTempo(target.tempo);
    setMasterVolume(target.masterVolume);
    setLayerStates(target.layers);

    if (engineRef.current) {
      engineRef.current.setMasterVolume(target.masterVolume);
      engineRef.current.setTempo(target.tempo);
      // If currently playing, update running scene and layers without restarting
      if (isPlaying) {
        engineRef.current.switchScene(target.sceneId, target.seed, target.layers, target.tempo);
      }
    }

    showFeedback(`Preset "${target.name}" restored (playback untouched)`);
  };

  // Delete Preset
  const handleDeletePreset = (id: string) => {
    const target = presets.find((p) => p.id === id);
    let updatedList:RoomtonePreset[];
    try{updatedList=deletePresetFromStorage(id);}catch{showFeedback("Browser storage is unavailable. Preset was not deleted.");return;}
    setPresets(updatedList);
    if (updatedList.length > 0) {
      setSelectedPresetId(updatedList[0].id);
    }
    showFeedback(`Preset "${target?.name || id}" deleted`);
  };

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 3500);
  };

  const activeSceneConfig = SCENES[activeSceneId] || SCENES.rain;

  return (
    <div className="min-h-screen bg-[#e8ebe4] text-[#243629] flex flex-col items-center py-6 px-3 sm:px-6">
      {/* 19-inch Studio Audio Rack Container */}
      <div className="w-full max-w-[1360px] bg-[#f7f7f1] border-2 sm:border-[3px] border-[#b3c2af] rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.9),inset_0_2px_4px_rgba(255,255,255,0.05)] relative flex">
        {/* Left Rack Ear (Hidden on mobile) */}
        <div className="hidden md:flex w-9 bg-[#d4dfd2] border-r-2 border-black flex-col justify-between py-6 items-center shrink-0">
          <div className="hex-screw" />
          <div className="hex-screw" />
          <div className="hex-screw" />
          <div className="hex-screw" />
        </div>

        {/* Main Rack Faceplate */}
        <div className="flex-1 p-4 sm:p-6 lg:p-7 flex flex-col gap-5 overflow-hidden">
          {/* Rack Top Strip */}
          <div className="flex flex-wrap justify-between items-center border-b-2 border-[#85977f] pb-3.5 gap-2">
            <div className="flex items-baseline gap-3">
              <span className="font-display text-2xl sm:text-3xl text-[#2d6659] tracking-widest drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]">
                Roomtone
              </span>
              <span className="font-mono-tech text-xs sm:text-xs text-[#98502e] tracking-wider uppercase">
                Soundscapes for work and tabletop sessions
              </span>
            </div>
            <div className="flex items-center gap-4 font-mono-tech text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#356b44] shadow-[0_0_6px_#356b44]" />
                <span className="text-[#4a6049]">Ready to play</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-2 h-2 rounded-full transition-colors ${
                    isPlaying
                      ? 'bg-[#356b44] shadow-[0_0_8px_#356b44]'
                      : 'bg-[#85977f]'
                  }`}
                />
                <span className={isPlaying ? 'text-[#356b44]' : 'text-[#52684e]'}>
                  Audio {isPlaying ? 'ACTIVE' : 'IDLE'}
                </span>
              </div>
            </div>
          </div>

          {/* Top Matrix: CRT Oscilloscope & Master Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-[540px_1fr] gap-5 items-stretch">
            {/* CRT Oscilloscope Screen */}
            <OscilloscopeCanvas
              getWaveform={getMasterWaveform}
              isRunning={isPlaying}
            />

            {/* Master Controls & PRNG Engine */}
            <MasterTransport
              isRunning={isPlaying}
              isStarting={isStarting}
              onTogglePlay={togglePlay}
              masterVolume={masterVolume}
              onMasterVolumeChange={handleMasterVolumeChange}
              tempo={tempo}
              onTempoChange={handleTempoChange}
              seed={seed}
              onReseed={handleReseed}
            />
          </div>

          {/* 4 Launch Scene Selector Tabs */}
          <SceneSelector
            scenes={SCENE_LIST}
            activeSceneId={activeSceneId}
            onSelectScene={handleSelectScene}
          />

          {/* 4 Independent Layer Lanes */}
          <div className="bg-[#f0f2e9] border-2 border-[#85977f] rounded-md p-4 sm:p-5 flex flex-col gap-3 shadow-md">
            <div className="flex justify-between items-center">
              <span className="font-mono-tech text-xs text-[#98502e] tracking-wider uppercase font-semibold">
                Layer mixer (scene:{' '}
                <span className="text-[#356b44]">{activeSceneConfig.name}</span>)
              </span>
              <span className="font-mono-tech text-xs text-[#52684e]">
                Four independent layers
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 mt-1">
              {activeSceneConfig.layers.map((layerConfig) => {
                const state = layerStates[layerConfig.id] || {
                  volume: layerConfig.defaultVolume,
                  muted: layerConfig.defaultMuted,
                  tone: layerConfig.defaultTone,
                };
                return (
                  <LayerLane
                    key={layerConfig.id}
                    config={layerConfig}
                    state={state}
                    meterLevel={meterLevels[layerConfig.id] || 0}
                    onUpdate={(updated) => handleUpdateLayer(layerConfig.id, updated)}
                  />
                );
              })}
            </div>
          </div>

          {/* Bottom Preset Persistence Bar */}
          <PresetsBar
            presets={presets}
            selectedPresetId={selectedPresetId}
            onSelectPreset={setSelectedPresetId}
            onSaveCurrent={handleSavePreset}
            onRestore={handleRestorePreset}
            onDelete={handleDeletePreset}
            feedbackMessage={feedbackMessage}
          />
        </div>

        {/* Right Rack Ear (Hidden on mobile) */}
        <div className="hidden md:flex w-9 bg-[#d4dfd2] border-l-2 border-black flex-col justify-between py-6 items-center shrink-0">
          <div className="hex-screw" />
          <div className="hex-screw" />
          <div className="hex-screw" />
          <div className="hex-screw" />
        </div>
      </div>
    </div>
  );
}

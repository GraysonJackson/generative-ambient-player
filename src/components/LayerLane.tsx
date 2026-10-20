import React from 'react';
import { LayerConfig, LayerState } from '../types/ambient';
import { VuMeter } from './VuMeter';

interface LayerLaneProps {
  config: LayerConfig;
  state: LayerState;
  meterLevel: number;
  onUpdate: (state: LayerState) => void;
}

export const LayerLane: React.FC<LayerLaneProps> = ({
  config,
  state,
  meterLevel,
  onUpdate,
}) => {
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value) / 100;
    onUpdate({ ...state, volume: val });
  };

  const handleToneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value) / 100;
    onUpdate({ ...state, tone: val });
  };

  const toggleMute = () => {
    onUpdate({ ...state, muted: !state.muted });
  };

  // Calculate rotation for knob indicator (-135deg to +135deg)
  const rotationDeg = -135 + state.tone * 270;

  return (
    <div className="bg-[#f7f7f1] border border-[#85977f] rounded p-3.5 flex flex-col justify-between gap-3 shadow-md">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[#b3c2af] pb-2">
        <div>
          <h4 className="font-mono-tech text-xs font-bold text-[#2d6659] tracking-wide">
            {config.name}
          </h4>
          <p className="text-xs text-[#52684e] truncate max-w-[160px]" title={config.description}>
            {config.description}
          </p>
        </div>
        <button
          onClick={toggleMute}
          className={`font-mono-tech text-xs px-2 py-0.5 rounded border transition-colors ${
            state.muted
              ? 'bg-[#7f1d1d] border-[#ef4444] text-[#fecaca] shadow-[0_0_8px_rgba(239,68,68,0.5)]'
              : 'bg-[#b3c2af] border-[#475569] text-[#4a6049] hover:border-[#4a6049]'
          }`}
          aria-label={`Toggle mute for ${config.name}`}
        >
          {state.muted ? 'MUTED' : 'MUTE'}
        </button>
      </div>

      {/* Controls Row: Fader, Tone Knob, VU Meter */}
      <div className="grid grid-cols-[1fr_54px_34px] gap-2.5 items-center">
        {/* Level Fader */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between font-mono-tech text-[9.5px] text-[#4a6049]">
            <span>LEVEL</span>
            <span className="text-[#2d6659]">{(state.volume * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(state.volume * 100)}
            onChange={handleVolumeChange}
            disabled={state.muted}
            className="w-full h-1.5 bg-[#b3c2af] rounded-lg appearance-none cursor-pointer accent-[#2d6659] disabled:opacity-40"
            aria-label={`Volume level for ${config.name}`}
          />
        </div>

        {/* Tone Rotary Dial / Slider */}
        <div className="flex flex-col items-center gap-1">
          <div
            className="relative w-9 h-9 rounded-full bg-gradient-to-b from-[#85977f] to-[#0f172a] border border-[#52684e] shadow-[0_2px_4px_rgba(0,0,0,0.6)] flex items-center justify-center cursor-pointer select-none"
            title={`Tone Cutoff: ${(state.tone * 100).toFixed(0)}%`}
          >
            {/* Notch */}
            <div
              className="absolute w-[2.5px] h-[10px] bg-[#98502e] rounded-[1px] origin-bottom shadow-[0_0_3px_#98502e]"
              style={{
                bottom: '16px',
                transform: `rotate(${rotationDeg}deg)`,
                transformOrigin: '50% 100%',
              }}
            />
          </div>
          <div className="flex flex-col items-center">
            <span className="font-mono-tech text-[9px] text-[#4a6049]">TONE</span>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(state.tone * 100)}
              onChange={handleToneChange}
              className="w-10 h-1 bg-[#b3c2af] appearance-none rounded accent-[#98502e] cursor-pointer"
              aria-label={`Tone brightness for ${config.name}`}
            />
          </div>
        </div>

        {/* Live VU Meter */}
        <div className="flex justify-center">
          <VuMeter level={state.muted ? 0 : meterLevel} />
        </div>
      </div>
    </div>
  );
};

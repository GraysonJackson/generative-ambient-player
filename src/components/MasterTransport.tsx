import React from 'react';

interface MasterTransportProps {
  isRunning: boolean;
  isStarting: boolean;
  onTogglePlay: () => void;
  masterVolume: number;
  onMasterVolumeChange: (vol: number) => void;
  tempo: number;
  onTempoChange: (bpm: number) => void;
  seed: string;
  onReseed: () => void;
}

export const MasterTransport: React.FC<MasterTransportProps> = ({
  isRunning,
  isStarting,
  onTogglePlay,
  masterVolume,
  onMasterVolumeChange,
  tempo,
  onTempoChange,
  seed,
  onReseed,
}) => {
  return (
    <div className="bg-[#f0f2e9] border-2 border-[#85977f] rounded-md p-4 flex flex-col justify-between gap-3 shadow-md">
      {/* Transport Button & Master Gain */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <button
          disabled={isStarting}
          onClick={onTogglePlay}
          className={`font-mono-tech text-xs font-bold px-5 py-2.5 rounded border flex items-center gap-2 cursor-pointer transition-all duration-150 ${
            isRunning
              ? 'bg-[#b3c2af] border-[#98502e] text-[#98502e] shadow-[0_0_12px_rgba(245,158,11,0.3)] hover:bg-[#283548]'
              : 'bg-[#064e3b] border-[#356b44] text-[#ffffff] shadow-[0_0_14px_rgba(16,185,129,0.35)] hover:bg-[#047857]'
          }`}
          aria-label={isRunning ? 'Stop soundscape playback' : 'Play soundscape'}
        >
          {isRunning ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
              <span>Stop soundscape</span>
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              <span>{isStarting?'Starting…':'Play soundscape'}</span>
            </>
          )}
        </button>

        <button onClick={()=>onMasterVolumeChange(masterVolume>0?0:0.35)} aria-label={masterVolume>0?"Mute all layers":"Unmute all layers"} className="border p-2">{masterVolume>0?"Mute":"Unmute"}</button>
        {/* Master Gain & BPM */}
        <div className="flex flex-wrap items-center gap-4 font-mono-tech text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[#4a6049]">TEMPO:</span>
            <input
              type="range"
              min="40"
              max="140"
              aria-label="Tempo"
              value={tempo}
              onChange={(e) => onTempoChange(parseInt(e.target.value, 10))}
              className="w-16 h-1.5 bg-[#b3c2af] rounded accent-[#2d6659] cursor-pointer"
            />
            <span className="text-[#2d6659] font-semibold w-10 text-right">{tempo} BPM</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[#4a6049]">VOLUME:</span>
            <input
              type="range"
              min="0"
              max="100"
              aria-label="Master volume"
              value={Math.round(masterVolume * 100)}
              onChange={(e) => onMasterVolumeChange(parseFloat(e.target.value) / 100)}
              className="w-20 h-1.5 bg-[#b3c2af] rounded accent-[#356b44] cursor-pointer"
            />
            <span className="text-[#356b44] font-semibold w-9 text-right">
              {Math.round(masterVolume * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Mulberry32 PRNG Seed Engine */}
      <div className="bg-[#e4e9dd] border border-[#85977f] rounded p-2.5 flex flex-wrap justify-between items-center gap-2">
        <div className="font-mono-tech text-xs flex items-center gap-2">
          <span className="text-[#4a6049]">Seed:</span>
          <span className="bg-[#e4e9dd]/40 border border-[#85977f]/50 text-[#243629] font-bold px-2 py-0.5 rounded text-xs tracking-wider">
            {seed}
          </span>
          <span className="text-xs text-[#52684e]">Repeatable event sequence</span>
        </div>
        <button
          onClick={onReseed}
          className="bg-[#dfe9da] border border-[#85977f] text-[#243629] hover:bg-[#b3c2af] font-mono-tech text-xs px-3 py-1 rounded cursor-pointer transition-colors"
        >
          New variation
        </button>
      </div>

      {/* Informational Subtext */}
      <div className="font-mono-tech text-xs text-[#52684e] leading-relaxed flex flex-wrap gap-2 justify-between">
        <span>Sound starts only when you press Play.</span>
        <span>Seeds repeat events; synthesized noise can vary.</span>
      </div>
    </div>
  );
};

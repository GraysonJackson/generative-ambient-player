import React, { useState } from 'react';
import { RoomtonePreset } from '../types/ambient';

interface PresetsBarProps {
  presets: RoomtonePreset[];
  selectedPresetId: string;
  onSelectPreset: (id: string) => void;
  onSaveCurrent: (name: string) => void;
  onRestore: () => void;
  onDelete: (id: string) => void;
  feedbackMessage: string | null;
}

export const PresetsBar: React.FC<PresetsBarProps> = ({
  presets,
  selectedPresetId,
  onSelectPreset,
  onSaveCurrent,
  onRestore,
  onDelete,
  feedbackMessage,
}) => {
  const [isNamingNew, setIsNamingNew] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  const handleSaveClick = () => {
    if (isNamingNew) {
      if (newPresetName.trim()) {
        onSaveCurrent(newPresetName.trim());
        setNewPresetName('');
        setIsNamingNew(false);
      }
    } else {
      setIsNamingNew(true);
    }
  };

  const handleCancelSave = () => {
    setIsNamingNew(false);
    setNewPresetName('');
  };

  return (
    <div className="bg-[#e4e9dd] border border-[#85977f] rounded p-3 flex flex-wrap justify-between items-center gap-3">
      {/* Preset Selector */}
      <div className="flex flex-wrap items-center gap-3 font-mono-tech text-xs">
        <span className="text-[#4a6049]">STORED PRESET:</span>
        <select
          aria-label="Saved preset"
          value={selectedPresetId}
          onChange={(e) => onSelectPreset(e.target.value)}
          className="bg-[#0f172a] border border-[#85977f] text-white px-2.5 py-1 rounded text-xs focus:border-[#2d6659] outline-none"
        >
          {presets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.sceneId.toUpperCase()})
            </option>
          ))}
        </select>
        <span className="text-xs text-[#52684e] bg-[#e4e9dd] px-2 py-0.5 rounded border border-[#b3c2af]">
          Stored on this browser
        </span>
        {feedbackMessage && (
          <span className="text-xs text-[#356b44] font-semibold animate-pulse">
            {feedbackMessage}
          </span>
        )}
      </div>

      {/* Preset Actions */}
      <div className="flex items-center gap-2">
        {isNamingNew ? (
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              aria-label="Preset name" maxLength={80}
              placeholder="Preset name"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              className="bg-[#0f172a] border border-[#2d6659] text-white px-2 py-1 rounded text-xs w-36 outline-none font-mono-tech"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveClick();
                if (e.key === 'Escape') handleCancelSave();
              }}
            />
            <button
              onClick={handleSaveClick}
              className="bg-[#064e3b] border border-[#356b44] text-[#ffffff] hover:bg-[#047857] font-mono-tech text-xs px-2.5 py-1 rounded cursor-pointer"
            >
              CONFIRM
            </button>
            <button
              onClick={handleCancelSave}
              className="bg-[#b3c2af] text-[#4a6049] hover:text-white font-mono-tech text-xs px-2 py-1 rounded cursor-pointer"
            >
              CANCEL
            </button>
          </div>
        ) : (
          <button
            onClick={handleSaveClick}
            className="bg-[#e4e9dd] border border-[#85977f] text-[#243629] hover:bg-[#85977f] font-mono-tech text-xs px-3 py-1 rounded cursor-pointer transition-colors"
          >
            SAVE CURRENT
          </button>
        )}

        <button
          onClick={onRestore}
          className="bg-[#e4e9dd] border border-[#85977f] text-[#243629] hover:bg-[#85977f] font-mono-tech text-xs px-3 py-1 rounded cursor-pointer transition-colors"
          title="Restore settings without starting playback"
        >
          RESTORE
        </button>

        <button
          onClick={() => onDelete(selectedPresetId)}
          disabled={presets.length <= 1}
          className="bg-[#e4e9dd] border border-[#85977f] text-[#ef4444] hover:bg-[#7f1d1d] hover:border-[#ef4444] font-mono-tech text-xs px-3 py-1 rounded cursor-pointer transition-colors disabled:opacity-40"
        >
          DELETE
        </button>
      </div>
    </div>
  );
};

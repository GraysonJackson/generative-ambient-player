import React from 'react';
import { SceneConfig, SceneId } from '../types/ambient';

interface SceneSelectorProps {
  scenes: SceneConfig[];
  activeSceneId: SceneId;
  onSelectScene: (sceneId: SceneId) => void;
}

export const SceneSelector: React.FC<SceneSelectorProps> = ({
  scenes,
  activeSceneId,
  onSelectScene,
}) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <span className="font-mono-tech text-xs text-[#98502e] tracking-wider uppercase font-semibold">
          Choose a scene
        </span>
        <span className="font-mono-tech text-xs text-[#52684e]">
          ACTIVE BANK: {scenes.find((s) => s.id === activeSceneId)?.bankNumber.split(' ')[1] || '01'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {scenes.map((scene) => {
          const isActive = scene.id === activeSceneId;
          return (
            <button
              key={scene.id}
              onClick={() => onSelectScene(scene.id)}
              className={`p-3.5 text-left rounded border transition-all duration-150 flex flex-col gap-1.5 cursor-pointer ${
                isActive
                  ? 'bg-[#dfe9da] border-[#356b44] shadow-[0_0_14px_rgba(16,185,129,0.25)]'
                  : 'bg-[#f0f2e9] border-[#85977f] hover:border-[#2d6659]'
              }`}
            >
              <span className="font-mono-tech text-xs text-[#52684e]">
                {scene.bankNumber}
              </span>
              <span
                className={`font-display text-xl tracking-wide leading-tight ${
                  isActive ? 'text-[#356b44]' : 'text-[#243629]'
                }`}
              >
                {scene.name}
              </span>
              <p className="text-xs text-[#4a6049] line-clamp-2 leading-relaxed">
                {scene.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

import React from 'react';

interface VuMeterProps {
  level: number; // 0.0 to 1.0
}

export const VuMeter: React.FC<VuMeterProps> = ({ level }) => {
  // 7 LED segments: 4 green, 2 amber, 1 red
  // Thresholds:
  // 0: > 0.05 (green)
  // 1: > 0.18 (green)
  // 2: > 0.32 (green)
  // 3: > 0.48 (green)
  // 4: > 0.65 (amber)
  // 5: > 0.80 (amber)
  // 6: > 0.92 (red)
  const segments = [
    { type: 'red', threshold: 0.92 },
    { type: 'amber', threshold: 0.8 },
    { type: 'amber', threshold: 0.65 },
    { type: 'green', threshold: 0.48 },
    { type: 'green', threshold: 0.32 },
    { type: 'green', threshold: 0.18 },
    { type: 'green', threshold: 0.05 },
  ];

  return (
    <div
      className="flex flex-col gap-[3px] h-[72px] w-[32px] bg-black p-[3px] rounded border border-[#85977f] justify-between"
      title={`Signal Meter: ${(level * 100).toFixed(0)}%`}
    >
      {segments.map((seg, idx) => {
        const isLit = level >= seg.threshold;
        let colorClass = 'bg-[#f0f2e9]';

        if (isLit) {
          if (seg.type === 'red') {
            colorClass = 'bg-[#ef4444] shadow-[0_0_6px_#ef4444]';
          } else if (seg.type === 'amber') {
            colorClass = 'bg-[#98502e] shadow-[0_0_5px_#98502e]';
          } else {
            colorClass = 'bg-[#356b44] shadow-[0_0_4px_#356b44]';
          }
        }

        return (
          <div
            key={idx}
            className={`w-full h-[6px] rounded-[1px] transition-colors duration-75 ${colorClass}`}
          />
        );
      })}
    </div>
  );
};

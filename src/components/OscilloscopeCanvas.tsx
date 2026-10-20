import React, { useEffect, useRef } from 'react';

interface OscilloscopeCanvasProps {
  getWaveform: () => Float32Array;
  isRunning: boolean;
}

export const OscilloscopeCanvas: React.FC<OscilloscopeCanvasProps> = ({
  getWaveform,
  isRunning,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function render() {
      if (!canvas || !ctx) return;
      const width = canvas.width;
      const height = canvas.height;

      ctx.fillStyle = '#172b20';
      ctx.fillRect(0, 0, width, height);

      // Draw subtle phosphor green grid
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.08)';
      ctx.lineWidth = 1;
      const gridCols = 16;
      const gridRows = 8;
      for (let x = 0; x <= width; x += width / gridCols) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += height / gridRows) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw center baseline
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.2)';
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      // Read audio waveform
      const buffer = isRunning ? getWaveform() : null;
      ctx.beginPath();
      ctx.strokeStyle = '#b9ddab';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(16, 185, 129, 0.8)';
      ctx.shadowBlur = 8;

      if (!isRunning || !buffer || buffer.length === 0) {
        // Flat line when stopped
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
      } else {
        const sliceWidth = width / (buffer.length - 1);
        for (let i = 0; i < buffer.length; i++) {
          const val = buffer[i];
          const y = ((val + 1) / 2) * height;
          if (i === 0) {
            ctx.moveTo(0, y);
          } else {
            ctx.lineTo(i * sliceWidth, y);
          }
        }
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      if(isRunning&&!document.hidden&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches) animFrameRef.current = requestAnimationFrame(render);
    }

    const onVisibility=()=>{cancelAnimationFrame(animFrameRef.current);render();};
    document.addEventListener('visibilitychange',onVisibility);
    render();

    return () => {
      document.removeEventListener('visibilitychange',onVisibility);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [getWaveform, isRunning]);

  return (
    <div className="relative rounded bg-[#020705] p-2 border-2 border-[#b3c2af] shadow-[inset_0_0_20px_rgba(0,0,0,0.9)]">
      <div className="relative w-full h-[180px] bg-[#172b20] rounded overflow-hidden border border-[#064e3b] crt-scanlines">
        <div className="absolute top-2 left-3 font-mono-tech text-xs text-[#b9ddab] tracking-wider z-20 select-none">
          Waveform · {isRunning ? 'Live signal' : 'STANDBY'}
        </div>
        <canvas
          ref={canvasRef}
          width={540}
          height={180}
          className="w-full h-full block"
        />
      </div>
    </div>
  );
};

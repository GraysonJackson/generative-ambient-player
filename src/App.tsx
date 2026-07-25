import { useState, useEffect, useRef } from "react";
import * as Tone from "tone";
import { Volume2, VolumeX } from "lucide-react";

interface GeneratorParams {
  tempo: number;
  key: string;
  density: number;
}

const SCALE_NOTES: Record<string, string[]> = {
  C: ["C3", "D3", "E3", "F3", "G3", "A3", "B3"],
  "C#": ["C#3", "D#3", "F3", "F#3", "G#3", "A#3", "C4"],
  D: ["D3", "E3", "F#3", "G3", "A3", "B3", "C#4"],
  "D#": ["D#3", "F3", "G3", "G#3", "A#3", "C4", "D4"],
  E: ["E3", "F#3", "G#3", "A3", "B3", "C#4", "D#4"],
  F: ["F3", "G3", "A3", "A#3", "C4", "D4", "E4"],
  "F#": ["F#3", "G#3", "A#3", "B3", "C#4", "D#4", "F4"],
  G: ["G3", "A3", "B3", "C4", "D4", "E4", "F#4"],
  "G#": ["G#3", "A#3", "C4", "C#4", "D#4", "F4", "G4"],
  A: ["A3", "B3", "C#4", "D4", "E4", "F#4", "G#4"],
  "A#": ["A#3", "C4", "D4", "D#4", "F4", "G4", "A4"],
  B: ["B3", "C#4", "D#4", "E4", "F#4", "G#4", "A#4"],
};

const KEYS = Object.keys(SCALE_NOTES);

export default function App() {
  const [params, setParams] = useState<GeneratorParams>({
    tempo: 120,
    key: "C",
    density: 0.5,
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const synthRef = useRef<Tone.PolySynth | null>(null);
  const loopRef = useRef<Tone.Loop | null>(null);
  const analyserRef = useRef<Tone.Analyser | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const synth = new Tone.PolySynth().toDestination();
    const analyser = new Tone.Analyser("waveform", 256);
    synth.connect(analyser);
    synthRef.current = synth;
    analyserRef.current = analyser;

    function drawWaveform() {
      if (!canvasRef.current || !analyserRef.current) {
        animFrameRef.current = requestAnimationFrame(drawWaveform);
        return;
      }
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const width = canvas.width;
      const height = canvas.height;
      const values = analyserRef.current.getValue() as Float32Array;
      ctx.clearRect(0, 0, width, height);
      ctx.beginPath();
      ctx.strokeStyle = "#818cf8";
      ctx.lineWidth = 1.5;
      for (let i = 0; i < values.length; i++) {
        const x = (i / values.length) * width;
        const y = ((values[i] as number) + 1) / 2 * height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      animFrameRef.current = requestAnimationFrame(drawWaveform);
    }
    drawWaveform();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      loopRef.current?.stop();
      loopRef.current?.dispose();
      synth.dispose();
      analyser.dispose();
    };
  }, []);

  useEffect(() => {
    if (!isPlaying || !synthRef.current) return;
    const notes = SCALE_NOTES[params.key] || SCALE_NOTES.C;
    let step = 0;
    const pattern: (string | null)[] = [];
    for (let i = 0; i < 16; i++) {
      pattern.push(
        Math.random() < params.density
          ? notes[Math.floor(Math.random() * notes.length)]
          : null
      );
    }
    loopRef.current?.stop();
    loopRef.current?.dispose();
    const loop = new Tone.Loop((time) => {
      const note = pattern[step % pattern.length];
      if (note && synthRef.current) {
        synthRef.current.triggerAttackRelease(note, "8n", time, 0.6);
      }
      step++;
    }, "8n").start(0);
    Tone.Transport.bpm.value = params.tempo;
    Tone.Transport.start();
    loopRef.current = loop;

    return () => {
      loop.stop();
      loop.dispose();
      Tone.Transport.stop();
      synthRef.current?.releaseAll();
    };
  }, [isPlaying, params]);

  function togglePlay() {
    setIsPlaying((p) => !p);
  }

  function toggleMute() {
    Tone.Destination.mute = !Tone.Destination.mute;
    setIsMuted((m) => !m);
  }

  function handleParamChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setParams((prev) => ({
      ...prev,
      [name]: name === "key" ? value : parseFloat(value),
    }));
  }

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white p-8 font-mono">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl tracking-tight mb-2">Generative Ambient Player</h1>
        <p className="text-gray-500 text-sm mb-8">all audio generated in-browser via Tone.js — no samples needed</p>

        <div className="mb-8 border border-gray-800 rounded-lg overflow-hidden">
          <canvas
            ref={canvasRef}
            width={800}
            height={200}
            className="w-full h-48 bg-[#0d1220]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="border border-gray-800 rounded-lg p-4">
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-3">Tempo</label>
            <input
              type="range"
              name="tempo"
              min="60"
              max="180"
              value={params.tempo}
              onChange={handleParamChange}
              className="w-full accent-indigo-400"
            />
            <div className="text-right text-sm text-gray-400 mt-1">{params.tempo} BPM</div>
          </div>

          <div className="border border-gray-800 rounded-lg p-4">
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-3">Key</label>
            <select
              name="key"
              value={params.key}
              onChange={handleParamChange}
              className="w-full bg-[#0d1220] border border-gray-700 rounded px-3 py-2 text-sm"
            >
              {KEYS.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>

          <div className="border border-gray-800 rounded-lg p-4">
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-3">Density</label>
            <input
              type="range"
              name="density"
              min="0"
              max="1"
              step="0.1"
              value={params.density}
              onChange={handleParamChange}
              className="w-full accent-indigo-400"
            />
            <div className="text-right text-sm text-gray-400 mt-1">{(params.density * 100).toFixed(0)}%</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={togglePlay}
            className="bg-indigo-500 hover:bg-indigo-400 text-white px-6 py-3 rounded-full text-sm font-medium tracking-wide transition-colors"
          >
            {isPlaying ? "Stop" : "Start Generative Loop"}
          </button>
          <button
            onClick={toggleMute}
            className="border border-gray-700 hover:border-gray-500 p-3 rounded-full transition-colors"
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>

        <div className="mt-12 text-xs text-gray-600 max-w-md">
          <p className="mb-2">Adjust tempo, key, and note density to shape the evolving pattern. Each time you start the loop, a new 16-step sequence is generated based on your current settings.</p>
          <p>Canvas visualization renders the live waveform from the Web Audio API AnalyserNode in real time.</p>
        </div>
      </div>
    </div>
  );
}
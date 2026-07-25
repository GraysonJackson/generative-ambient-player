# Generative Ambient Player retro-futurism synthwave-adjacent generative ambient music player. Deep navy canvas, thin glowing line-art, CRT-scanline texture applied subtly. Monospace numerals for timestamps and frequencies.

[Live Demo](https://graysonjackson.github.io/generative-ambient-player/)

## What It Does Adjust parameters tempo, key, density feed generative algorithm produces evolving ambient loop. Canvas-based waveform/oscilloscope visualization synced actual audio output. ## Design Decisions Retro-futurism vibe restrained not neon overload, more 1980s scientific instrument. Monospace numerals for timestamps and frequencies. Controls are physical-metaphor dials (rotate-to-adjust), not sliders -- deliberate, slightly risky interaction choice. ## Tech Stack - **React** -- Core framework - **Tone.js** -- Audio synthesis - **Web Audio API** -- Real-time audio processing - **Canvas API** -- Waveform visualization ## Getting Started

```bash
npm install
npm run dev
```


Open [http://localhost:3000](http://localhost:3000).

## Build


```bash
npm run build
npm start
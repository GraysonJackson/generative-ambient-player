# Generative Ambient Player — Retro-Futurist Tone.js Audio Generator

A browser-based ambient sound generator built with Tone.js that creates evolving audio patterns without any samples. The design mimics 1980s scientific instrument aesthetics with a CRT scanline texture and monospace typography.

## What It Does

Adjust tempo, key, and note density to generate evolving 16-step patterns. Each time you start the loop, a new sequence is created based on your current settings. The canvas visualization renders the live waveform from the Web Audio API's AnalyserNode in real time.

## Tech Stack

- **React + TypeScript** — Component-based UI with type safety
- **Tone.js** — Web Audio API wrapper for generating audio
- **Framer Motion** — For future animations (currently unused)
- **Lucide React** — Minimal icon set (volume controls)
- **Vite** — Build tooling and dev server

## Design Decisions

I wanted the interface to feel like a physical device rather than a digital app. The monospace font, CRT scanline texture, and physical dial metaphors create a tactile feel. The waveform visualization shows the actual audio output, making the generative process tangible.

The key technical challenge was making the audio generation truly generative — each play-through produces a new pattern based on the current settings. This required careful state management and the Tone.js scheduling API.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Build and Run

```bash
npm run build
npm start
```

---

## Presentation Guidelines

### Case Study Summary

This project demonstrates how to build a generative audio application with real-time visualization. The core challenge was creating a system that produces different output each time it runs while maintaining user control over the generation parameters.

### What to Highlight in an Interview

- **The generative pattern creation.** How the system produces different output each time based on user parameters.
- **The real-time visualization.** How the waveform visualization stays perfectly synced with the audio.
- **The physical UI metaphors.** How the dial controls and CRT aesthetic create a tactile feel.
- **The Tone.js integration.** How the Web Audio API wrapper simplifies complex audio programming.

### Design Problem

How do you make a generative audio application feel like a physical device rather than a digital app?

### Constraint

The design had to work without any audio samples — all sound generation had to be done algorithmically.
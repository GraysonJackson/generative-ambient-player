# Roomtone

A browser soundscape instrument with four scenes, independent layer volume/tone/mute controls, reproducible note-event plans, and locally saved presets.

[Open Roomtone](https://graysonjackson.github.io/generative-ambient-player/)

```sh
npm ci
npm test
npm run typecheck
npm run build
npm run preview
```

Use Node 24. The Vite build emits `out/` and uses `/generative-ambient-player/`. GitHub Actions publishes that static artifact.

Audio starts from a user gesture. Gain changes ramp, the master path is limited, and Stop releases sound and silences the master. The same seed/configuration repeats the logical event plan; stochastic noise and browser audio rendering are not promised to be bit-identical. Presets are validated before loading and never restore playback state.

Unit tests cover the event planner, scene configuration, preset behavior, and basic lifecycle methods. Real browser checks are also needed to establish audio startup and cleanup. No generated images or external music recordings are used. Tone.js synthesizes the audio locally.

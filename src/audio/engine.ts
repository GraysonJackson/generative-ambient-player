import * as Tone from 'tone';
import { SceneId, LayerState } from '../types/ambient';
import { SCENES } from './scenes';
import { generateDeterministicPlan, DeterministicSoundscapePlan } from './prng';

export interface LayerNodeGroup {
  id: string;
  filter: Tone.Filter;
  volumeNode: Tone.Volume;
  analyser: Tone.Analyser;
}

export class RoomtoneAudioEngine {
  private isInitialized = false;
  private isRunning = false;
  private currentSceneId: SceneId = 'rain';
  private currentSeed = '#8f3a1c';
  private currentTempo = 72;
  private masterVolumeLevel = 0.35;

  // Master audio nodes
  private masterVolumeNode: Tone.Volume | null = null;
  private masterAnalyser: Tone.Analyser | null = null;
  private limiter: Tone.Limiter | null = null;

  // Layer audio nodes (layer_1, layer_2, layer_3, layer_4)
  private layerNodes: Record<string, LayerNodeGroup> = {};

  // Active synths and sound generators for current scene
  private activeInstruments: Tone.ToneAudioNode[] = [];
  private activeLoop: Tone.Loop | null = null;
  private plan: DeterministicSoundscapePlan | null = null;
  private currentStep = 0;

  constructor() {
    // Audio graph is STRICTLY deferred until user gesture via startAudio()
  }

  public getInitialized(): boolean {
    return this.isInitialized;
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }

  public getCurrentSeed(): string {
    return this.currentSeed;
  }

  public getCurrentSceneId(): SceneId {
    return this.currentSceneId;
  }

  /**
   * Initializes master audio graph only upon explicit user gesture.
   */
  public async startAudio(
    sceneId: SceneId,
    seed: string,
    layerStates: Record<string, LayerState>,
    tempo?: number
  ): Promise<void> {
    if(this.isRunning)return;
    // Explicit user gesture requirement
    if (Tone.context.state !== 'running') {
      await Tone.start();
    }

    if (!this.isInitialized) {
      this.initMasterGraph();
      this.isInitialized = true;
    }

    this.currentSceneId = sceneId;
    this.currentSeed = seed;
    this.currentTempo = tempo || SCENES[sceneId]?.defaultTempo || 72;

    this.applyMasterVolume(this.masterVolumeLevel);
    this.updateAllLayers(layerStates);
    this.setupSceneInstruments(sceneId, seed);

    const transport = Tone.getTransport ? Tone.getTransport() : Tone.Transport;
    if (transport && (transport as any).bpm) {
      (transport as any).bpm.value = this.currentTempo;
    }
    if (transport && typeof (transport as any).start === 'function') {
      (transport as any).start();
    }
    this.isRunning = true;
  }

  /**
   * Stops playback idempotently without tearing down the entire audio graph.
   */
  public stopAudio(): void {
    if (this.activeLoop) {
      this.activeLoop.stop();
      this.activeLoop.dispose();
      this.activeLoop = null;
    }
    const transport = Tone.getTransport ? Tone.getTransport() : Tone.Transport;
    if (transport && typeof (transport as any).stop === 'function') {
      (transport as any).stop();
    }
    if (transport && typeof (transport as any).cancel === 'function') {
      (transport as any).cancel();
    }

    // Release all active voices
    this.silenceAllInstruments();
    this.masterVolumeNode?.volume.rampTo(-80,0.04);
    this.isRunning = false;
  }

  /**
   * Idempotent scene switching: cleanly cancels scheduled loops and voices
   * without audio stacking or node leaks.
   */
  public switchScene(
    newSceneId: SceneId,
    seed: string,
    layerStates: Record<string, LayerState>,
    tempo?: number
  ): void {
    this.currentSceneId = newSceneId;
    this.currentSeed = seed;
    if (tempo) {
      this.currentTempo = tempo;
    } else {
      this.currentTempo = SCENES[newSceneId]?.defaultTempo || 72;
    }

    if (!this.isRunning) {
      // Just update seed and scene if not running
      return;
    }

    // Cancel existing loop and clean up existing scene instruments
    if (this.activeLoop) {
      this.activeLoop.stop();
      this.activeLoop.dispose();
      this.activeLoop = null;
    }
    const transport = Tone.getTransport ? Tone.getTransport() : Tone.Transport;
    if (transport && typeof (transport as any).cancel === 'function') {
      (transport as any).cancel();
    }
    this.disposeInstruments();

    // Update layer filters and levels for new scene
    this.updateAllLayers(layerStates);

    // Setup new instruments and deterministic plan
    this.setupSceneInstruments(newSceneId, seed);
    if (transport && (transport as any).bpm) {
      (transport as any).bpm.value = this.currentTempo;
    }
  }

  /**
   * Reseeds the deterministic event generator.
   */
  public reseed(
    newSeed: string,
    layerStates: Record<string, LayerState>
  ): void {
    this.currentSeed = newSeed;
    if (this.isRunning) {
      this.switchScene(this.currentSceneId, newSeed, layerStates, this.currentTempo);
    }
  }

  public setTempo(bpm: number): void {
    this.currentTempo = bpm;
    if (this.isInitialized) {
      const transport = Tone.getTransport ? Tone.getTransport() : Tone.Transport;
      if (transport && (transport as any).bpm) {
        (transport as any).bpm.value = bpm;
      }
    }
  }

  public setMasterVolume(level: number): void {
    this.masterVolumeLevel = Math.max(0, Math.min(1, level));
    this.applyMasterVolume(this.masterVolumeLevel);
  }

  private applyMasterVolume(level: number): void {
    if (!this.masterVolumeNode) return;
    if (level <= 0.001) {
      this.masterVolumeNode.volume.rampTo(-80,0.04);
    } else {
      // Scale logarithmic-like: 0 to 1 -> -40dB to 0dB
      const db = Tone.gainToDb(level * 0.9);
      this.masterVolumeNode.volume.rampTo(db,0.04);
    }
  }

  public updateLayer(layerId: string, state: LayerState): void {
    const nodeGroup = this.layerNodes[layerId];
    if (!nodeGroup) return;

    // Volume & Mute
    if (state.muted || state.volume <= 0.001) {
      nodeGroup.volumeNode.volume.rampTo(-80,0.04);
    } else {
      const db = Tone.gainToDb(state.volume);
      nodeGroup.volumeNode.volume.rampTo(db,0.04);
    }

    // Tone Filter Cutoff: Map 0.0 - 1.0 to 150 Hz - 14000 Hz exponentially
    const minFreq = 150;
    const maxFreq = 14000;
    const freq = minFreq * Math.pow(maxFreq / minFreq, Math.max(0.01, Math.min(1, state.tone)));
    nodeGroup.filter.frequency.rampTo(freq, 0.05);
  }

  public updateAllLayers(layerStates: Record<string, LayerState>): void {
    Object.entries(layerStates).forEach(([layerId, state]) => {
      this.updateLayer(layerId, state);
    });
  }

  /**
   * Reads current live signal level (0.0 to 1.0) for a given layer.
   */
  public getLayerMeterLevel(layerId: string): number {
    const nodeGroup = this.layerNodes[layerId];
    if (!nodeGroup || !this.isRunning) return 0;
    try {
      const values = nodeGroup.analyser.getValue();
      if (Array.isArray(values) || values instanceof Float32Array) {
        let sum = 0;
        const len = values.length;
        for (let i = 0; i < len; i++) {
          const val = values[i] as number;
          sum += val * val;
        }
        const rms = Math.sqrt(sum / len);
        // Normalize RMS to 0.0 - 1.0
        return Math.min(1, Math.max(0, rms * 3.5));
      }
      return 0;
    } catch {
      return 0;
    }
  }

  /**
   * Returns Float32Array of master oscilloscope waveform for canvas rendering.
   */
  public getMasterWaveform(): Float32Array {
    if (!this.masterAnalyser || !this.isRunning) {
      return new Float32Array(256);
    }
    try {
      return this.masterAnalyser.getValue() as Float32Array;
    } catch {
      return new Float32Array(256);
    }
  }

  /**
   * Master audio graph setup:
   * Layer Buses -> Master Volume -> Master Analyser -> Tone.Destination
   */
  private initMasterGraph(): void {
    this.masterVolumeNode = new Tone.Volume(0);
    this.masterAnalyser = new Tone.Analyser('waveform', 256);

    this.limiter = new Tone.Limiter(-6);
    this.masterVolumeNode.connect(this.limiter);
    this.limiter.connect(this.masterAnalyser);
    this.masterAnalyser.toDestination();

    const layerIds = ['layer_1', 'layer_2', 'layer_3', 'layer_4'];
    layerIds.forEach((id) => {
      const filter = new Tone.Filter({
        frequency: 2500,
        type: 'lowpass',
        rolloff: -12,
        Q: 1.2,
      });
      const volumeNode = new Tone.Volume(0);
      const analyser = new Tone.Analyser('waveform', 128);

      filter.connect(volumeNode);
      volumeNode.connect(analyser);
      analyser.connect(this.masterVolumeNode!);

      this.layerNodes[id] = {
        id,
        filter,
        volumeNode,
        analyser,
      };
    });
  }

  /**
   * Sets up instruments and scheduling loop for the given scene and seed.
   */
  private setupSceneInstruments(sceneId: SceneId, seed: string): void {
    this.disposeInstruments();
    this.plan = generateDeterministicPlan(sceneId, seed, 32);
    this.currentStep = 0;

    const layer1 = this.layerNodes['layer_1'];
    const layer2 = this.layerNodes['layer_2'];
    const layer3 = this.layerNodes['layer_3'];
    const layer4 = this.layerNodes['layer_4'];

    if (!layer1 || !layer2 || !layer3 || !layer4) return;

    if (sceneId === 'rain') {
      // Layer 1: Glass Patter (Filtered Pink Noise with snappy envelope)
      const rainNoise = new Tone.NoiseSynth({
        noise: { type: 'pink' },
        envelope: { attack: 0.005, decay: 0.06, sustain: 0.01, release: 0.05 },
      }).connect(layer1.filter);

      // Layer 2: Resonant Sine Drone
      const sineSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: { attack: 1.5, decay: 2.0, sustain: 0.8, release: 2.5 },
      }).connect(layer2.filter);

      // Layer 3: Thunder Rumble (Lowpass Brown Noise + Membrane)
      const thunderSynth = new Tone.MembraneSynth({
        pitchDecay: 0.2,
        octaves: 3,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.05, decay: 1.2, sustain: 0.1, release: 1.8 },
      }).connect(layer3.filter);

      // Layer 4: Piano Droplets (Delicate bell/droplet tone)
      const pianoSynth = new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 2,
        modulationIndex: 1.2,
        envelope: { attack: 0.01, decay: 0.8, sustain: 0.05, release: 1.2 },
        modulationEnvelope: { attack: 0.02, decay: 0.4, sustain: 0, release: 0.4 },
      }).connect(layer4.filter);

      this.activeInstruments.push(rainNoise, sineSynth, thunderSynth, pianoSynth);

      // Deterministic schedule step callback
      this.activeLoop = new Tone.Loop((time) => {
        const step = this.currentStep % this.plan!.totalSteps;
        this.currentStep++;

        // Execute scheduled events for this step
        const l1Events = this.plan!.layerEvents.layer_1.filter((e) => e.step === step);
        l1Events.forEach((ev) => {
          rainNoise.triggerAttackRelease(ev.duration, time, ev.velocity);
        });

        const l2Events = this.plan!.layerEvents.layer_2.filter((e) => e.step === step);
        l2Events.forEach((ev) => {
          if (ev.note) {
            sineSynth.triggerAttackRelease(ev.note, ev.duration, time, ev.velocity * 0.7);
          }
        });

        const l3Events = this.plan!.layerEvents.layer_3.filter((e) => e.step === step);
        l3Events.forEach((ev) => {
          thunderSynth.triggerAttackRelease('C1', ev.duration, time, ev.velocity * 0.9);
        });

        const l4Events = this.plan!.layerEvents.layer_4.filter((e) => e.step === step);
        l4Events.forEach((ev) => {
          if (ev.note) {
            pianoSynth.triggerAttackRelease(ev.note, ev.duration, time, ev.velocity * 0.6);
          }
        });
      }, '16n').start(0);

    } else if (sceneId === 'library') {
      // Layer 1: Dust-Mote Pad (Soft AMSynth chorus pad)
      const padSynth = new Tone.PolySynth(Tone.AMSynth, {
        harmonicity: 1.5,
        envelope: { attack: 1.8, decay: 2.5, sustain: 0.8, release: 2.5 },
      }).connect(layer1.filter);

      // Layer 2: Mechanical Pendulum Tick
      const tickSynth = new Tone.MembraneSynth({
        pitchDecay: 0.01,
        octaves: 1.5,
        envelope: { attack: 0.001, decay: 0.07, sustain: 0, release: 0.04 },
      }).connect(layer2.filter);

      // Layer 3: Warm Wood Impulses
      const woodSynth = new Tone.MetalSynth({
        envelope: { attack: 0.005, decay: 0.12, release: 0.1 },
        harmonicity: 2.8,
        modulationIndex: 12,
        resonance: 2500,
        octaves: 1.2,
      }).connect(layer3.filter);

      // Layer 4: Page Whispers (Airy noise puffs)
      const pageSynth = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.15, decay: 0.4, sustain: 0.05, release: 0.35 },
      }).connect(layer4.filter);

      this.activeInstruments.push(padSynth, tickSynth, woodSynth, pageSynth);

      this.activeLoop = new Tone.Loop((time) => {
        const step = this.currentStep % this.plan!.totalSteps;
        this.currentStep++;

        const l1Events = this.plan!.layerEvents.layer_2.filter((e) => e.step === step);
        l1Events.forEach((ev) => {
          if (ev.note) {
            padSynth.triggerAttackRelease(ev.note, '2n', time, ev.velocity * 0.6);
          }
        });

        // Steady pendulum tick on alternating beats
        if (step % 2 === 0) {
          tickSynth.triggerAttackRelease('G2', '32n', time, 0.45);
        }

        const l3Events = this.plan!.layerEvents.layer_3.filter((e) => e.step === step);
        l3Events.forEach((ev) => {
          woodSynth.triggerAttackRelease('C2', '16n', time, ev.velocity * 0.4);
        });

        const l4Events = this.plan!.layerEvents.layer_1.filter((e) => e.step === step);
        l4Events.forEach((ev) => {
          pageSynth.triggerAttackRelease('16n', time, ev.velocity * 0.35);
        });
      }, '16n').start(0);

    } else if (sceneId === 'space') {
      // Layer 1: Void Drift (Brown noise slow sweeps)
      const voidSynth = new Tone.NoiseSynth({
        noise: { type: 'brown' },
        envelope: { attack: 0.8, decay: 1.5, sustain: 0.6, release: 1.8 },
      }).connect(layer1.filter);

      // Layer 2: Open 5th Drone
      const droneSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 2.2, decay: 3.0, sustain: 0.9, release: 3.5 },
      }).connect(layer2.filter);

      // Layer 3: Pulsar Blips
      const pulsarSynth = new Tone.FMSynth({
        harmonicity: 3.0,
        modulationIndex: 8,
        envelope: { attack: 0.005, decay: 0.25, sustain: 0, release: 0.3 },
      }).connect(layer3.filter);

      // Layer 4: Cosmic Shimmer
      const shimmerSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.3, decay: 1.5, sustain: 0.2, release: 2.0 },
      }).connect(layer4.filter);

      this.activeInstruments.push(voidSynth, droneSynth, pulsarSynth, shimmerSynth);

      this.activeLoop = new Tone.Loop((time) => {
        const step = this.currentStep % this.plan!.totalSteps;
        this.currentStep++;

        const l1Events = this.plan!.layerEvents.layer_1.filter((e) => e.step === step);
        l1Events.forEach((ev) => {
          voidSynth.triggerAttackRelease('8n', time, ev.velocity * 0.7);
        });

        const l2Events = this.plan!.layerEvents.layer_2.filter((e) => e.step === step);
        l2Events.forEach((ev) => {
          if (ev.note) {
            droneSynth.triggerAttackRelease(ev.note, '1m', time, ev.velocity * 0.65);
          }
        });

        const l3Events = this.plan!.layerEvents.layer_3.filter((e) => e.step === step);
        l3Events.forEach((ev) => {
          pulsarSynth.triggerAttackRelease('A4', '16n', time, ev.velocity * 0.5);
        });

        const l4Events = this.plan!.layerEvents.layer_4.filter((e) => e.step === step);
        l4Events.forEach((ev) => {
          if (ev.note) {
            shimmerSynth.triggerAttackRelease(ev.note, '4n', time, ev.velocity * 0.45);
          }
        });
      }, '16n').start(0);

    } else if (sceneId === 'tavern') {
      // Layer 1: Hearth Crackle (Sparks & micro-pops)
      const hearthSynth = new Tone.NoiseSynth({
        noise: { type: 'pink' },
        envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.03 },
      }).connect(layer1.filter);

      // Layer 2: Window Breeze
      const breezeSynth = new Tone.NoiseSynth({
        noise: { type: 'pink' },
        envelope: { attack: 1.0, decay: 1.8, sustain: 0.4, release: 1.5 },
      }).connect(layer2.filter);

      // Layer 3: Floorboard Thumps
      const thumpSynth = new Tone.MembraneSynth({
        pitchDecay: 0.1,
        octaves: 1.8,
        envelope: { attack: 0.01, decay: 0.35, sustain: 0, release: 0.2 },
      }).connect(layer3.filter);

      // Layer 4: Morning Birds (gentle FM whistles)
      const fluteSynth = new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 1,
        modulationIndex: 0.5,
        envelope: { attack: 0.08, decay: 0.4, sustain: 0.1, release: 0.5 },
      }).connect(layer4.filter);

      this.activeInstruments.push(hearthSynth, breezeSynth, thumpSynth, fluteSynth);

      this.activeLoop = new Tone.Loop((time) => {
        const step = this.currentStep % this.plan!.totalSteps;
        this.currentStep++;

        const l1Events = this.plan!.layerEvents.layer_1.filter((e) => e.step === step);
        l1Events.forEach((ev) => {
          hearthSynth.triggerAttackRelease('32n', time, ev.velocity * 0.5);
        });

        if (step % 8 === 0) {
          breezeSynth.triggerAttackRelease('4n', time, 0.4);
        }

        const l3Events = this.plan!.layerEvents.layer_3.filter((e) => e.step === step);
        l3Events.forEach((ev) => {
          thumpSynth.triggerAttackRelease('F1', '8n', time, ev.velocity * 0.55);
        });

        const l4Events = this.plan!.layerEvents.layer_4.filter((e) => e.step === step);
        l4Events.forEach((ev) => {
          if (ev.note) {
            fluteSynth.triggerAttackRelease(ev.note, '8n', time, ev.velocity * 0.5);
          }
        });
      }, '16n').start(0);
    }
  }

  private silenceAllInstruments(): void {
    this.activeInstruments.forEach((inst) => {
      if ('releaseAll' in inst && typeof (inst as any).releaseAll === 'function') {
        try {
          (inst as any).releaseAll();
        } catch {
          // ignore
        }
      }
    });
  }

  private disposeInstruments(): void {
    this.silenceAllInstruments();
    this.activeInstruments.forEach((inst) => {
      try {
        inst.dispose();
      } catch {
        // ignore
      }
    });
    this.activeInstruments = [];
  }

  /**
   * Complete teardown on component unmount:
   * Prevents runaway audio loops or orphaned Web Audio nodes.
   */
  public dispose(): void {
    this.stopAudio();
    this.disposeInstruments();

    Object.values(this.layerNodes).forEach((group) => {
      try {
        group.filter.dispose();
        group.volumeNode.dispose();
        group.analyser.dispose();
      } catch {
        // ignore
      }
    });
    this.layerNodes = {};

    try {
      this.masterVolumeNode?.dispose();
      this.masterAnalyser?.dispose();
    } catch {
      // ignore
    }
    this.masterVolumeNode = null;
    this.masterAnalyser = null;
    this.isInitialized = false;
  }
}

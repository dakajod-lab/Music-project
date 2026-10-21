import type { AudioOutput, Clock, Playback } from '../ports';

const TICK_MS = 100;

export interface PlayerState {
  status: 'stopped' | 'playing';
  positionMs: number;
  durationMs: number;
}

export interface PlayableRecording {
  samples: Float32Array;
  sampleRate: number;
}

const STOPPED: PlayerState = { status: 'stopped', positionMs: 0, durationMs: 0 };

/** Plays back a recording (PLY-001). Always plays from the start; stops by itself at the end. */
export class Player {
  private state: PlayerState = STOPPED;
  private listeners = new Set<() => void>();
  private playback: Playback | null = null;
  private stopTicking: () => void = () => {};
  /** Increases with every play(), so a late "ended" from an older playback is ignored. */
  private generation = 0;

  constructor(
    private readonly output: AudioOutput,
    private readonly clock: Clock,
  ) {}

  getState = (): PlayerState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  async play(recording: PlayableRecording): Promise<void> {
    this.stop();
    const generation = ++this.generation;
    const durationMs = (recording.samples.length / recording.sampleRate) * 1000;
    this.set({ status: 'playing', positionMs: 0, durationMs });
    const playback = await this.output.play(recording.samples, recording.sampleRate, () => {
      if (generation === this.generation) this.finish();
    });
    if (generation !== this.generation) {
      playback.stop(); // stopped (or restarted) while the output was starting
      return;
    }
    this.playback = playback;
    this.stopTicking = this.clock.every(TICK_MS, () => {
      this.set({ ...this.state, positionMs: Math.min(playback.positionMs(), durationMs) });
    });
  }

  stop(): void {
    if (this.state.status !== 'playing') return;
    this.generation++;
    this.playback?.stop();
    this.finish();
  }

  private finish(): void {
    this.stopTicking();
    this.stopTicking = () => {};
    this.playback = null;
    this.set({ ...this.state, status: 'stopped', positionMs: 0 });
  }

  private set(state: PlayerState): void {
    this.state = state;
    this.listeners.forEach((listener) => listener());
  }
}

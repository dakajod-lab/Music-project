import type { AudioInput, AudioOutput, AudioSession, Clock, Playback } from '../../src/core/ports';
import { MicrophoneError, type MicrophoneProblem } from '../../src/core/ports';

/** Manually advanced clock: lets tests "wait" 5 minutes in a few milliseconds. */
export class FakeClock implements Clock {
  private time = 0;
  private timers = new Set<{ ms: number; next: number; callback: () => void }>();

  now = () => this.time;

  every = (ms: number, callback: () => void) => {
    const timer = { ms, next: this.time + ms, callback };
    this.timers.add(timer);
    return () => this.timers.delete(timer);
  };

  /** Number of running timers (to check that nothing keeps ticking when it should not). */
  get activeTimers(): number {
    return this.timers.size;
  }

  advance(ms: number): void {
    const end = this.time + ms;
    for (;;) {
      const due = [...this.timers].filter((t) => t.next <= end).sort((a, b) => a.next - b.next)[0];
      if (!due) break;
      this.time = due.next;
      due.next += due.ms;
      due.callback();
    }
    this.time = end;
  }
}

/**
 * Fake microphone. The recording contains one sample (value 0.25) per 1/sampleRate of fake-clock time
 * between beginRecording() and stop(). Level blocks are pushed by the test with emit().
 */
export class FakeAudioInput implements AudioInput {
  problem: MicrophoneProblem | null = null;
  /** Any other error the browser might throw. */
  unexpectedError: Error | null = null;
  /** When set, start() waits for this promise first (simulates a slow permission prompt). */
  gate: Promise<void> | null = null;
  startCalls = 0;
  openSessions = 0;
  private endListeners: (() => void)[] = [];
  private sampleListeners: ((samples: Float32Array) => void)[] = [];

  constructor(
    private readonly clock: FakeClock,
    readonly sampleRate = 48_000,
  ) {}

  async start(): Promise<AudioSession> {
    this.startCalls++;
    if (this.gate) await this.gate;
    if (this.unexpectedError) throw this.unexpectedError;
    if (this.problem) throw new MicrophoneError(this.problem);
    this.openSessions++;
    let recordingSince: number | null = null;
    this.endListeners = [];
    this.sampleListeners = [];
    return {
      sampleRate: this.sampleRate,
      onEnded: (listener) => this.endListeners.push(listener),
      onSamples: (listener) => this.sampleListeners.push(listener),
      beginRecording: () => {
        recordingSince = this.clock.now();
      },
      stop: async () => {
        this.openSessions--;
        if (recordingSince === null) return new Float32Array(0);
        const length = Math.round(((this.clock.now() - recordingSince) / 1000) * this.sampleRate);
        return new Float32Array(length).fill(0.25);
      },
    };
  }

  /** Delivers a block of samples, as the microphone would (level meter input). */
  emit(...values: number[]): void {
    const block = Float32Array.from(values);
    this.sampleListeners.forEach((listener) => listener(block));
  }

  /** Simulates the microphone being taken away (phone call, unplugged). */
  end(): void {
    this.endListeners.forEach((listener) => listener());
  }
}

/** Fake speaker: playback position follows the fake clock; the test decides when each playback ends. */
export class FakeAudioOutput implements AudioOutput {
  played: Float32Array[] = [];
  /** When set, play() waits for this promise first (simulates a slow audio start). */
  gate: Promise<void> | null = null;
  private playbacks: { playing: boolean; onEnded: () => void }[] = [];

  constructor(private readonly clock: FakeClock) {}

  /** Whether any playback is still producing sound. */
  get playing(): boolean {
    return this.playbacks.some((p) => p.playing);
  }

  async play(samples: Float32Array, _sampleRate: number, onEnded: () => void): Promise<Playback> {
    if (this.gate) await this.gate;
    const startedAt = this.clock.now();
    const entry = { playing: true, onEnded };
    this.played.push(samples);
    this.playbacks.push(entry);
    return {
      positionMs: () => this.clock.now() - startedAt,
      stop: () => {
        entry.playing = false;
      },
    };
  }

  /** Simulates a playback reaching its end. Default: the latest one. */
  finish(index = this.playbacks.length - 1): void {
    const entry = this.playbacks[index];
    if (!entry) return;
    entry.playing = false;
    entry.onEnded();
  }
}

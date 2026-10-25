import type {
  AudioInput,
  AudioOutput,
  AudioSession,
  Clock,
  Lifecycle,
  Playback,
  RecordingStore,
  StoredRecording,
} from '../../src/core/ports';
import { MicrophoneError, type MicrophoneProblem, StorageFullError } from '../../src/core/ports';

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

/** Block size of the fake microphone: 100 ms at 48 kHz. */
export const FAKE_BLOCK_MS = 100;

/**
 * Fake microphone. While recording it delivers one block of samples (value 0.25) every 100 ms of fake-clock
 * time, like a real microphone; stop() returns all recorded blocks. Level-only blocks are pushed with emit().
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
    this.endListeners = [];
    this.sampleListeners = [];
    const recordedListeners: ((samples: Float32Array) => void)[] = [];
    const recorded: Float32Array[] = [];
    let stopBlocks: (() => void) | null = null;
    const blockLength = (this.sampleRate * FAKE_BLOCK_MS) / 1000;
    return {
      sampleRate: this.sampleRate,
      onEnded: (listener) => this.endListeners.push(listener),
      onSamples: (listener) => this.sampleListeners.push(listener),
      onRecordedSamples: (listener) => recordedListeners.push(listener),
      beginRecording: () => {
        stopBlocks = this.clock.every(FAKE_BLOCK_MS, () => {
          const block = new Float32Array(blockLength).fill(0.25);
          recorded.push(block);
          recordedListeners.forEach((listener) => listener(block));
        });
      },
      stop: async () => {
        stopBlocks?.();
        this.openSessions--;
        const out = new Float32Array(recorded.reduce((n, b) => n + b.length, 0));
        let offset = 0;
        for (const block of recorded) {
          out.set(block, offset);
          offset += block.length;
        }
        return out;
      },
    };
  }

  /** Delivers a block of samples to the level meter, as the microphone would. */
  emit(...values: number[]): void {
    const block = Float32Array.from(values);
    this.sampleListeners.forEach((listener) => listener(block));
  }

  /** Simulates the microphone being taken away (phone call, unplugged). */
  end(): void {
    this.endListeners.forEach((listener) => listener());
  }
}

/** In-memory recording store with an optional size limit (simulates a full device). */
export class FakeRecordingStore implements RecordingStore {
  stored: { sampleRate: number; chunks: Float32Array[]; complete: boolean } | null = null;
  /** Maximum number of samples that fit; null = unlimited. */
  capacitySamples: number | null = null;
  free: number | null = 1e12;
  appendCalls = 0;

  async begin(sampleRate: number): Promise<void> {
    this.stored = { sampleRate, chunks: [], complete: false };
  }

  async append(samples: Float32Array): Promise<void> {
    this.appendCalls++;
    if (!this.stored) throw new Error('append() before begin()');
    const used = this.stored.chunks.reduce((n, c) => n + c.length, 0);
    if (this.capacitySamples !== null && used + samples.length > this.capacitySamples)
      throw new StorageFullError();
    this.stored.chunks.push(samples.slice());
  }

  async finish(): Promise<void> {
    if (this.stored) this.stored.complete = true;
  }

  async load(): Promise<StoredRecording | null> {
    if (!this.stored) return null;
    const samples = new Float32Array(this.stored.chunks.reduce((n, c) => n + c.length, 0));
    let offset = 0;
    for (const chunk of this.stored.chunks) {
      samples.set(chunk, offset);
      offset += chunk.length;
    }
    return { samples, sampleRate: this.stored.sampleRate, complete: this.stored.complete };
  }

  async clear(): Promise<void> {
    this.stored = null;
  }

  async freeBytes(): Promise<number | null> {
    return this.free;
  }

  /** Number of samples saved so far. */
  get savedSamples(): number {
    return this.stored?.chunks.reduce((n, c) => n + c.length, 0) ?? 0;
  }
}

/** Lifecycle the test controls: hide() simulates switching to another app. */
export class FakeLifecycle implements Lifecycle {
  private listeners: (() => void)[] = [];

  onHidden(listener: () => void): void {
    this.listeners.push(listener);
  }

  hide(): void {
    this.listeners.forEach((listener) => listener());
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

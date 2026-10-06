import type { AudioInput, AudioSession, Clock } from '../../src/core/ports';
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

/** Fake microphone: produces one sample per 1/sampleRate of fake-clock time, value 0.25. */
export class FakeAudioInput implements AudioInput {
  problem: MicrophoneProblem | null = null;
  /** Any other error the browser might throw. */
  unexpectedError: Error | null = null;
  /** When set, start() waits for this promise first (simulates a slow permission prompt). */
  gate: Promise<void> | null = null;
  startCalls = 0;
  private endListeners: (() => void)[] = [];

  constructor(
    private readonly clock: FakeClock,
    readonly sampleRate = 48_000,
  ) {}

  async start(): Promise<AudioSession> {
    this.startCalls++;
    if (this.gate) await this.gate;
    if (this.unexpectedError) throw this.unexpectedError;
    if (this.problem) throw new MicrophoneError(this.problem);
    const startedAt = this.clock.now();
    this.endListeners = [];
    return {
      sampleRate: this.sampleRate,
      onEnded: (listener) => this.endListeners.push(listener),
      stop: async () => {
        const length = Math.round(((this.clock.now() - startedAt) / 1000) * this.sampleRate);
        return new Float32Array(length).fill(0.25);
      },
    };
  }

  /** Simulates the microphone being taken away (phone call, unplugged). */
  end(): void {
    this.endListeners.forEach((listener) => listener());
  }
}

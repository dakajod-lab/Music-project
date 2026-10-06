import type { AudioInput, AudioSession, Clock } from '../ports';
import { MicrophoneError } from '../ports';
import { type RecorderEvent, type RecorderState, initialState, transition } from './recorderMachine';

const TICK_MS = 100;

export interface Recording {
  samples: Float32Array;
  sampleRate: number;
}

/**
 * Connects the pure state machine to the outside world (microphone, clock).
 * Side effects happen only here, triggered by state changes.
 */
export class RecorderController {
  private state: RecorderState = initialState;
  private listeners = new Set<() => void>();
  private session: AudioSession | null = null;
  private stopTicking: () => void = () => {};
  private recording: Recording | null = null;
  private pending: Promise<void> = Promise.resolve();

  constructor(
    private readonly audioInput: AudioInput,
    private readonly clock: Clock,
  ) {}

  getState = (): RecorderState => this.state;

  getRecording = (): Recording | null => this.recording;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Resolves when all side effects started so far have finished (used by tests and the UI). */
  settled = (): Promise<void> => this.pending;

  dispatch = (event: RecorderEvent): void => {
    const before = this.state;
    const after = transition(before, event);
    if (after === before) return;
    this.state = after;
    this.onChange(before, after, event);
    this.listeners.forEach((listener) => listener());
  };

  private onChange(before: RecorderState, after: RecorderState, event: RecorderEvent): void {
    if (event.type === 'CONFIRM') this.recording = null; // REC-004.2
    // The machine never "re-enters" requestingPermission, so entering it always means: open the microphone.
    if (after.status === 'requestingPermission') this.track(this.openMicrophone());
    if (after.status === 'recording' && before.status !== 'recording') this.startTicking();
    // Reviewed equivalent mutant (`before.status === 'recording'` → true): finishRecording() does nothing without a session.
    if (before.status === 'recording' && after.status !== 'recording') this.track(this.finishRecording());
  }

  private track(work: Promise<void>): void {
    this.pending = this.pending.then(() => work);
  }

  private async openMicrophone(): Promise<void> {
    try {
      this.session = await this.audioInput.start();
    } catch (error) {
      // Anything other than an explicit "denied" means the microphone is not usable.
      const denied = error instanceof MicrophoneError && error.problem === 'denied';
      this.dispatch({ type: denied ? 'PERMISSION_DENIED' : 'NO_MICROPHONE' });
      return;
    }
    this.session.onEnded(() => this.dispatch({ type: 'INTERRUPTED' }));
    this.dispatch({ type: 'PERMISSION_GRANTED' });
  }

  private startTicking(): void {
    let last = this.clock.now();
    this.stopTicking = this.clock.every(TICK_MS, () => {
      const now = this.clock.now();
      this.dispatch({ type: 'TICK', deltaMs: now - last });
      last = now;
    });
  }

  private async finishRecording(): Promise<void> {
    this.stopTicking();
    this.stopTicking = () => {};
    const session = this.session;
    this.session = null;
    // Reviewed equivalent mutants here: a session always exists when a recording ends; the guard is defensive.
    if (!session) return;
    const samples = await session.stop();
    this.recording = { samples, sampleRate: session.sampleRate };
    this.listeners.forEach((listener) => listener());
  }
}

import { ClippingDetector, peakLevel } from '../level/levels';
import type { AudioInput, AudioSession, Clock } from '../ports';
import { MicrophoneError } from '../ports';
import { type RecorderEvent, type RecorderState, initialState, transition } from './recorderMachine';

const TICK_MS = 100;
/** The clipping warning stays visible this long after the last clipped block, so it cannot be missed (REC-005.2). */
export const CLIPPING_HOLD_MS = 2_000;

export interface InputLevel {
  /** Peak of the latest block, 0..1. */
  peak: number;
  clipping: boolean;
}

const SILENT: InputLevel = { peak: 0, clipping: false };

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
  private level: InputLevel = SILENT;
  private levelListeners = new Set<() => void>();
  private clippingDetector = new ClippingDetector();
  private lastClipAt: number | null = null;

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

  /** Input level of the open microphone (REC-005). Separate from the state: it changes many times per second. */
  getLevel = (): InputLevel => this.level;

  subscribeLevel = (listener: () => void): (() => void) => {
    this.levelListeners.add(listener);
    return () => this.levelListeners.delete(listener);
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
    if (after.status === 'recording' && before.status !== 'recording') {
      this.session?.beginRecording();
      this.startTicking();
    }
    // Leaving a level check without recording closes the microphone again (privacy, REC-005.3 decision).
    if (before.status === 'monitoring' && after.status !== 'recording') this.track(this.closeSession());
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
    this.session.onSamples((samples) => this.measure(samples));
    this.dispatch({ type: 'PERMISSION_GRANTED' });
  }

  private measure(samples: Float32Array): void {
    const now = this.clock.now();
    if (this.clippingDetector.push(samples)) this.lastClipAt = now;
    const clipping = this.lastClipAt !== null && now - this.lastClipAt <= CLIPPING_HOLD_MS;
    this.setLevel({ peak: peakLevel(samples), clipping });
  }

  private setLevel(level: InputLevel): void {
    this.level = level;
    this.levelListeners.forEach((listener) => listener());
  }

  private resetLevel(): void {
    this.clippingDetector.reset();
    this.lastClipAt = null;
    this.setLevel(SILENT);
  }

  private async closeSession(): Promise<void> {
    const session = this.session;
    this.session = null;
    this.resetLevel();
    await session?.stop();
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
    this.resetLevel();
    // Reviewed equivalent mutants here: a session always exists when a recording ends; the guard is defensive.
    if (!session) return;
    const samples = await session.stop();
    this.recording = { samples, sampleRate: session.sampleRate };
    this.listeners.forEach((listener) => listener());
  }
}

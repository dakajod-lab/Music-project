import { ClippingDetector, peakLevel } from '../level/levels';
import type { AudioInput, AudioSession, Clock, Lifecycle, RecordingStore } from '../ports';
import { MicrophoneError, StorageFullError } from '../ports';
import {
  MAX_RECORDING_MS,
  type RecorderEvent,
  type RecorderState,
  initialState,
  transition,
} from './recorderMachine';

const TICK_MS = 100;
/** The clipping warning stays visible this long after the last clipped block, so it cannot be missed (REC-005.2). */
export const CLIPPING_HOLD_MS = 2_000;
/** Audio is saved to the device this often while recording: at most this much is lost in a crash (ADR-005, ≤ 2 s). */
export const SAVE_INTERVAL_MS = 1_000;
/** Storage needed for a full-length recording: 5 min × 48 000 samples/s × 4 bytes (STO-001.4). */
export const FULL_RECORDING_BYTES = (MAX_RECORDING_MS / 1000) * 48_000 * 4;

export interface InputLevel {
  /** Peak of the latest block, 0..1. */
  peak: number;
  clipping: boolean;
}

export interface Notices {
  /** Free storage was below a full-length recording when the recording started (STO-001.4). */
  lowStorage: boolean;
  /** Saving failed for another reason than a full device; the recording is only kept in memory. */
  saveFailed: boolean;
}

export interface Recording {
  samples: Float32Array;
  sampleRate: number;
}

export interface RecorderDependencies {
  audioInput: AudioInput;
  clock: Clock;
  store: RecordingStore;
  lifecycle: Lifecycle;
}

const SILENT: InputLevel = { peak: 0, clipping: false };
const NO_NOTICES: Notices = { lowStorage: false, saveFailed: false };

/**
 * Connects the pure state machine to the outside world (microphone, clock, storage, app lifecycle).
 * Side effects happen only here, triggered by state changes.
 */
export class RecorderController {
  private state: RecorderState = initialState;
  private listeners = new Set<() => void>();
  private session: AudioSession | null = null;
  private stopTicking: () => void = () => {};
  private stopSaving: () => void = () => {};
  private recording: Recording | null = null;
  private pending: Promise<void> = Promise.resolve();
  private saveQueue: Promise<void> = Promise.resolve();
  private unsaved: Float32Array[] = [];
  private storageFull = false;
  private notices: Notices = NO_NOTICES;
  private level: InputLevel = SILENT;
  private levelListeners = new Set<() => void>();
  private clippingDetector = new ClippingDetector();
  private lastClipAt: number | null = null;
  private readonly audioInput: AudioInput;
  private readonly clock: Clock;
  private readonly store: RecordingStore;

  constructor({ audioInput, clock, store, lifecycle }: RecorderDependencies) {
    this.audioInput = audioInput;
    this.clock = clock;
    this.store = store;
    // REC-003: going to the background stops a recording (keeping the audio) or ends a level check.
    lifecycle.onHidden(() => {
      if (this.state.status === 'recording') this.dispatch({ type: 'INTERRUPTED' });
      if (this.state.status === 'monitoring') this.dispatch({ type: 'STOP_CHECK' });
    });
  }

  /** Loads a recording kept on the device from an earlier session (STO-001.1, STO-001.3). */
  restore = (): Promise<void> => {
    this.track(this.restoreFromStore());
    return this.settled();
  };

  getState = (): RecorderState => this.state;

  getRecording = (): Recording | null => this.recording;

  getNotices = (): Notices => this.notices;

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
  settled = (): Promise<void> => this.pending.then(() => this.saveQueue);

  dispatch = (event: RecorderEvent): void => {
    const before = this.state;
    const after = transition(before, event);
    if (after === before) return;
    this.state = after;
    this.onChange(before, after, event);
    this.notify();
  };

  private onChange(before: RecorderState, after: RecorderState, event: RecorderEvent): void {
    if (event.type === 'CONFIRM') {
      this.recording = null; // REC-004.2
      this.save(() => this.store.clear());
    }
    // The machine never "re-enters" requestingPermission, so entering it always means: open the microphone.
    if (after.status === 'requestingPermission') this.track(this.openMicrophone());
    if (after.status === 'recording' && before.status !== 'recording') this.startRecording();
    // Leaving a level check without recording closes the microphone again (privacy, REC-005.3 decision).
    if (before.status === 'monitoring' && after.status !== 'recording') this.track(this.closeSession());
    // Reviewed equivalent mutant (`before.status === 'recording'` → true): finishRecording() does nothing without a session.
    if (before.status === 'recording' && after.status !== 'recording') this.track(this.finishRecording());
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }

  private track(work: Promise<void>): void {
    this.pending = this.pending.then(() => work);
  }

  /** Storage operations run one after another, in order. */
  private save(operation: () => Promise<void>): void {
    this.saveQueue = this.saveQueue.then(operation).catch((error: unknown) => this.onSaveError(error));
  }

  private onSaveError(error: unknown): void {
    if (error instanceof StorageFullError) {
      if (this.storageFull) return;
      this.storageFull = true;
      this.dispatch({ type: 'STORAGE_FULL' });
    } else {
      this.setNotices({ ...this.notices, saveFailed: true });
    }
  }

  private setNotices(notices: Notices): void {
    this.notices = notices;
    this.notify();
  }

  private async restoreFromStore(): Promise<void> {
    const stored = await this.store.load();
    if (!stored || stored.samples.length === 0) return;
    this.recording = { samples: stored.samples, sampleRate: stored.sampleRate };
    const recordingMs = (stored.samples.length / stored.sampleRate) * 1000;
    this.dispatch({ type: 'RESTORED', recordingMs, recovered: !stored.complete });
    // Recovered once: from now on it is an ordinary stored recording.
    if (!stored.complete) this.save(() => this.store.finish());
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
    this.session.onRecordedSamples((samples) => this.unsaved.push(samples));
    this.dispatch({ type: 'PERMISSION_GRANTED' });
  }

  private startRecording(): void {
    // Reviewed equivalent mutant (no `?.`): a session always exists when recording starts.
    const session = this.session;
    if (!session) return;
    this.unsaved = [];
    this.storageFull = false;
    this.setNotices(NO_NOTICES);
    this.save(() => this.store.begin(session.sampleRate));
    this.track(this.checkFreeStorage());
    session.beginRecording();
    this.startTicking();
    this.stopSaving = this.clock.every(SAVE_INTERVAL_MS, () => this.saveUnsaved());
  }

  private async checkFreeStorage(): Promise<void> {
    const free = await this.store.freeBytes();
    if (free !== null && free < FULL_RECORDING_BYTES) this.setNotices({ ...this.notices, lowStorage: true });
  }

  private saveUnsaved(): void {
    if (this.unsaved.length === 0 || this.storageFull) return;
    const samples = concat(this.unsaved);
    this.unsaved = [];
    this.save(() => (this.storageFull ? Promise.resolve() : this.store.append(samples)));
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
    // Reviewed equivalent mutant (no `?.`): a session always exists while monitoring.
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
    this.stopSaving();
    this.stopSaving = () => {};
    const session = this.session;
    this.session = null;
    this.resetLevel();
    // Reviewed equivalent mutants here: a session always exists when a recording ends; the guard is defensive.
    if (!session) return;
    const samples = await session.stop();
    this.saveUnsaved(); // the last part, recorded since the previous save
    this.save(() => this.store.finish());
    this.recording = { samples, sampleRate: session.sampleRate };
    this.notify();
  }
}

function concat(chunks: Float32Array[]): Float32Array {
  const out = new Float32Array(chunks.reduce((n, c) => n + c.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

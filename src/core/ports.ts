/** Ports (ADR-006): what the core needs from the outside world. Browser adapters implement them; tests use fakes. */

export type MicrophoneProblem = 'denied' | 'noMicrophone';

export class MicrophoneError extends Error {
  constructor(readonly problem: MicrophoneProblem) {
    super(`Microphone cannot be used: ${problem}`);
    this.name = 'MicrophoneError';
  }
}

export interface AudioSession {
  readonly sampleRate: number;
  /** Called when the microphone stops by itself (call, unplugged, permission revoked). */
  onEnded(listener: () => void): void;
  /** Called with every block of incoming samples, also before recording begins (level meter, REC-005). */
  onSamples(listener: (samples: Float32Array) => void): void;
  /** Called with every block that belongs to the recording (after beginRecording()), for saving while recording. */
  onRecordedSamples(listener: (samples: Float32Array) => void): void;
  /** From now on, incoming samples are kept for the recording. */
  beginRecording(): void;
  /** Closes the microphone and returns the samples kept since beginRecording() (mono, -1..1). */
  stop(): Promise<Float32Array>;
}

export interface AudioInput {
  /** Opens the microphone. Rejects with MicrophoneError when it cannot be used. */
  start(): Promise<AudioSession>;
}

export interface Clock {
  now(): number;
  /** Calls `callback` repeatedly; returns a function that stops it. */
  every(ms: number, callback: () => void): () => void;
}

/** A recording being played back. */
export interface Playback {
  /** Current position in milliseconds from the start of the recording. */
  positionMs(): number;
  stop(): void;
}

export interface AudioOutput {
  /** Starts playing from the beginning. `onEnded` is called when playback reaches the end by itself. */
  play(samples: Float32Array, sampleRate: number, onEnded: () => void): Promise<Playback>;
}

/** Thrown by RecordingStore when the device has no space left (STO-001.2). */
export class StorageFullError extends Error {
  constructor() {
    super('Device storage is full');
    this.name = 'StorageFullError';
  }
}

export interface StoredRecording {
  samples: Float32Array;
  sampleRate: number;
  /** false when the app closed before the recording was finished (crash, tab closed). */
  complete: boolean;
}

/** Keeps the recording on the device between sessions (STO-001, ADR-005). One recording slot in 0.1. */
export interface RecordingStore {
  /** Starts a new recording, replacing any stored one. */
  begin(sampleRate: number): Promise<void>;
  /** Appends samples to the recording being made. Rejects with StorageFullError when there is no space. */
  append(samples: Float32Array): Promise<void>;
  /** Marks the recording as complete. */
  finish(): Promise<void>;
  load(): Promise<StoredRecording | null>;
  clear(): Promise<void>;
  /** Free bytes available to the app, or null when the browser cannot tell. */
  freeBytes(): Promise<number | null>;
}

/** App lifecycle events (REC-003). */
export interface Lifecycle {
  /** Called when the app goes to the background (other app, screen off, tab hidden). */
  onHidden(listener: () => void): void;
}

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

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
  /** Stops capturing and returns all samples (mono, -1..1). */
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

import { describe, expect, it } from 'vitest';
import { MicrophoneError } from './ports';

describe('MicrophoneError', () => {
  it('carries the problem and a readable message', () => {
    const error = new MicrophoneError('denied');
    expect(error).toBeInstanceOf(Error);
    expect(error.problem).toBe('denied');
    expect(error.name).toBe('MicrophoneError');
    expect(error.message).toBe('Microphone cannot be used: denied');
  });
});

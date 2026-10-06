import { describe, expect, it } from 'vitest';
import { parseWav } from '../../../tests/support/parseWav';
import { encodeWav } from './encodeWav';

const MAX_24 = 0x7fffff; // 8 388 607
const MIN_24 = -0x800000; // -8 388 608

describe('EXP-001 / R5 WAV encoder: header', () => {
  it('writes a 48 kHz, 24-bit, mono PCM header by default', () => {
    const wav = parseWav(encodeWav(new Float32Array(10)));
    expect(wav).toMatchObject({
      fmtSize: 16, // found by mutation testing: the parser did not check this field
      format: 1, // PCM
      channels: 1,
      sampleRate: 48_000,
      bitsPerSample: 24,
      blockAlign: 3,
      byteRate: 48_000 * 3,
    });
  });

  it('uses the given sample rate', () => {
    const wav = parseWav(encodeWav(new Float32Array(10), 44_100));
    expect(wav.sampleRate).toBe(44_100);
    expect(wav.byteRate).toBe(44_100 * 3);
  });

  it('declares the data size and RIFF size correctly', () => {
    const bytes = encodeWav(new Float32Array(1000));
    const wav = parseWav(bytes);
    expect(wav.dataSize).toBe(3000);
    expect(wav.riffSize).toBe(bytes.length - 8);
    expect(bytes.length).toBe(44 + 3000);
  });

  it('writes a valid file for an empty recording', () => {
    const bytes = encodeWav(new Float32Array(0));
    expect(bytes.length).toBe(44);
    expect(parseWav(bytes)).toMatchObject({ dataSize: 0, riffSize: 36, samples: [] });
  });

  it('adds a pad byte when the data size is odd (RIFF chunks must have even length)', () => {
    const bytes = encodeWav(new Float32Array(3)); // 9 data bytes
    const wav = parseWav(bytes);
    expect(wav.dataSize).toBe(9); // the real size, without the pad byte
    expect(bytes.length).toBe(44 + 9 + 1);
    expect(bytes[bytes.length - 1]).toBe(0);
    expect(wav.riffSize).toBe(bytes.length - 8);
  });

  it('rejects an invalid sample rate', () => {
    expect(() => encodeWav(new Float32Array(1), 0)).toThrow(new RangeError('Invalid sample rate: 0'));
    expect(() => encodeWav(new Float32Array(1), 44_100.5)).toThrow(
      new RangeError('Invalid sample rate: 44100.5'),
    );
  });
});

describe('EXP-001 / R5 WAV encoder: samples', () => {
  // Equivalence partitions + boundary values of the float → 24-bit conversion.
  it.each([
    { input: 0, expected: 0, case: 'silence' },
    { input: 1, expected: MAX_24, case: 'positive full scale' },
    { input: -1, expected: MIN_24, case: 'negative full scale' },
    { input: 0.5, expected: Math.round(0.5 * MAX_24), case: 'half scale' },
    { input: -0.5, expected: -0x400000, case: 'negative half scale' },
    { input: 1.5, expected: MAX_24, case: 'above full scale is clamped (clipped input)' },
    { input: -2, expected: MIN_24, case: 'below full scale is clamped' },
    { input: Number.NaN, expected: 0, case: 'NaN becomes silence' },
  ])('$case: $input → $expected', ({ input, expected }) => {
    expect(parseWav(encodeWav(Float32Array.of(input))).samples).toEqual([expected]);
  });

  it('stores samples little-endian', () => {
    const value = 0x123456 / MAX_24;
    const bytes = encodeWav(Float32Array.of(value));
    expect(Array.from(bytes.slice(44, 47))).toEqual([0x56, 0x34, 0x12]);
  });

  it('round-trips a sine wave within 1 step of 24-bit resolution', () => {
    const input = Float32Array.from(
      { length: 4800 },
      (_, i) => 0.8 * Math.sin((2 * Math.PI * 440 * i) / 48_000),
    );
    const { samples } = parseWav(encodeWav(input));
    expect(samples).toHaveLength(input.length);
    const maxError = Math.max(...samples.map((s, i) => Math.abs(s / MAX_24 - (input[i] ?? Number.NaN))));
    expect(maxError).toBeLessThanOrEqual(1 / MAX_24);
  });

  it('keeps the order of samples', () => {
    const { samples } = parseWav(encodeWav(Float32Array.of(0, 1, -1, 0)));
    expect(samples).toEqual([0, MAX_24, MIN_24, 0]);
  });
});

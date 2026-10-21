import { describe, expect, it } from 'vitest';
import { CLIPPING_RUN, CLIPPING_THRESHOLD, ClippingDetector, peakLevel } from './levels';

const block = (...values: number[]) => Float32Array.from(values);

describe('REC-005.1 peak level', () => {
  it.each([
    { input: block(), expected: 0, case: 'empty block' },
    { input: block(0, 0, 0), expected: 0, case: 'silence' },
    { input: block(0.1, -0.25, 0.2), expected: 0.25, case: 'negative peak counts' },
    { input: block(1.5, 0), expected: 1, case: 'above full scale is capped at 1' },
  ])('$case → $expected', ({ input, expected }) => {
    expect(peakLevel(input)).toBe(expected);
  });
});

describe('REC-005.2 / R11 clipping detection', () => {
  const loud = CLIPPING_THRESHOLD;

  it('uses a threshold just below full scale and a run of consecutive samples', () => {
    expect(CLIPPING_THRESHOLD).toBe(0.99);
    expect(CLIPPING_RUN).toBe(3);
  });

  // Equivalence partitions + boundaries (test strategy §4).
  it.each([
    { input: block(0, 0.5, -0.5), clipped: false, case: 'normal level' },
    { input: block(0, loud, 0), clipped: false, case: 'a single full-scale sample is a peak, not clipping' },
    { input: block(loud, loud, 0), clipped: false, case: '2 in a row: just below the run length' },
    { input: block(loud, loud, loud), clipped: true, case: '3 in a row: exactly the run length' },
    { input: block(-1, -1, -1, 0), clipped: true, case: 'negative clipping counts too' },
    { input: block(0.989, 0.989, 0.989), clipped: false, case: 'just below the threshold' },
    { input: block(loud, -loud, loud), clipped: true, case: 'flat-topped on both sides still counts' },
  ])('$case', ({ input, clipped }) => {
    expect(new ClippingDetector().push(input)).toBe(clipped);
  });

  it('finds a clipped run that spans two blocks', () => {
    const detector = new ClippingDetector();
    expect(detector.push(block(0, loud, loud))).toBe(false);
    expect(detector.push(block(loud, 0))).toBe(true);
  });

  it('a quiet sample breaks the run', () => {
    const detector = new ClippingDetector();
    expect(detector.push(block(loud, loud))).toBe(false);
    expect(detector.push(block(0.1, loud, loud))).toBe(false);
  });

  it('reset() forgets a run in progress', () => {
    const detector = new ClippingDetector();
    detector.push(block(loud, loud));
    detector.reset();
    expect(detector.push(block(loud))).toBe(false);
  });
});

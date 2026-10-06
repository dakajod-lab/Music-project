import { describe, expect, it } from 'vitest';
import { formatTime } from './formatTime';

describe('REC-001.1 elapsed time display', () => {
  it.each([
    [0, '0:00'],
    [999, '0:00'],
    [1000, '0:01'],
    [59_999, '0:59'],
    [60_000, '1:00'],
    [65_000, '1:05'],
    [299_999, '4:59'],
    [300_000, '5:00'],
    [-500, '0:00'],
  ])('%i ms → %s', (ms, text) => {
    expect(formatTime(ms)).toBe(text);
  });
});

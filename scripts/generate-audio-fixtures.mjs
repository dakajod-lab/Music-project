// Generates deterministic test audio (see docs/06-test-strategy.md §5).
// Deliberately independent of the app's own WAV encoder, so it can act as a test oracle for it.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SAMPLE_RATE = 48_000;
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'tests', 'fixtures', 'audio');

/** Encodes mono float samples (-1..1) as a 16-bit PCM WAV file. */
function wav16(samples) {
  const dataSize = samples.length * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0, 'ascii');
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8, 'ascii');
  buf.write('fmt ', 12, 'ascii');
  buf.writeUInt32LE(16, 16); // fmt chunk size
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  buf.writeUInt16LE(2, 32); // block align
  buf.writeUInt16LE(16, 34); // bits per sample
  buf.write('data', 36, 'ascii');
  buf.writeUInt32LE(dataSize, 40);
  samples.forEach((s, i) => {
    const clamped = Math.max(-1, Math.min(1, s));
    buf.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  });
  return buf;
}

const seconds = (s) => Math.round(s * SAMPLE_RATE);
const dbToGain = (db) => 10 ** (db / 20);
const sine = (freq, gain, length) =>
  Array.from({ length }, (_, i) => gain * Math.sin((2 * Math.PI * freq * i) / SAMPLE_RATE));

/** A click (short 1 kHz burst, 5 ms) on every beat, starting at sample 0. */
function clickTrack(bpm, length) {
  const out = new Array(length).fill(0);
  const beat = Math.round((60 / bpm) * SAMPLE_RATE);
  const clickLen = seconds(0.005);
  for (let start = 0; start < length; start += beat) {
    for (let i = 0; i < clickLen && start + i < length; i++) {
      out[start + i] = 0.8 * Math.sin((2 * Math.PI * 1000 * i) / SAMPLE_RATE);
    }
  }
  return out;
}

export const FIXTURES = {
  'silence.wav': () => new Array(seconds(2)).fill(0),
  'sine-440-normal.wav': () => sine(440, dbToGain(-12), seconds(2)),
  // Driven 2x past full scale, then clamped: flat-topped peaks = clipping.
  'sine-440-clipped.wav': () => sine(440, 2, seconds(2)),
  'click-120bpm.wav': () => clickTrack(120, seconds(4)),
};

mkdirSync(OUT_DIR, { recursive: true });
for (const [name, make] of Object.entries(FIXTURES)) {
  writeFileSync(join(OUT_DIR, name), wav16(make()));
}
console.log(`Generated ${Object.keys(FIXTURES).length} audio fixtures in ${OUT_DIR}`);

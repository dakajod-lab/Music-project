const HEADER_SIZE = 44;
const BYTES_PER_SAMPLE = 3; // 24-bit
const MAX_POSITIVE = 0x7fffff;
const MAX_NEGATIVE = 0x800000;

/**
 * Encodes mono float samples (-1..1) as a 24-bit PCM WAV file (EXP-001, ADR-004).
 * Values outside -1..1 are clamped; NaN becomes silence.
 */
export function encodeWav(samples: Float32Array, sampleRate = 48_000): Uint8Array {
  if (!Number.isInteger(sampleRate) || sampleRate <= 0) {
    throw new RangeError(`Invalid sample rate: ${sampleRate}`);
  }

  const dataSize = samples.length * BYTES_PER_SAMPLE;
  const padding = dataSize % 2; // RIFF chunks must have an even length
  const bytes = new Uint8Array(HEADER_SIZE + dataSize + padding);
  const view = new DataView(bytes.buffer);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, bytes.length - 8, true);
  writeAscii(view, 8, 'WAVE');

  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * BYTES_PER_SAMPLE, true); // byte rate
  view.setUint16(32, BYTES_PER_SAMPLE, true); // block align
  view.setUint16(34, BYTES_PER_SAMPLE * 8, true); // bits per sample

  writeAscii(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = HEADER_SIZE;
  for (const sample of samples) {
    const value = toInt24(sample);
    bytes[offset] = value & 0xff;
    bytes[offset + 1] = (value >> 8) & 0xff;
    bytes[offset + 2] = (value >> 16) & 0xff;
    offset += BYTES_PER_SAMPLE;
  }
  return bytes;
}

function toInt24(sample: number): number {
  // Reviewed equivalent mutant (`if (false)`): NaN would also become 0 through the bitwise byte writes. Kept for clarity.
  if (Number.isNaN(sample)) return 0;
  const clamped = Math.max(-1, Math.min(1, sample));
  // Reviewed equivalent mutant (`clamped <= 0`): 0 gives 0 with either scale factor.
  return Math.round(clamped < 0 ? clamped * MAX_NEGATIVE : clamped * MAX_POSITIVE);
}

function writeAscii(view: DataView, offset: number, text: string): void {
  new Uint8Array(view.buffer, offset, text.length).set(Array.from(text, (char) => char.charCodeAt(0)));
}

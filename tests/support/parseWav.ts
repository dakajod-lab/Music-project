// Minimal WAV reader for tests. Deliberately separate from the app's encoder, so it acts as an independent check.
export interface ParsedWav {
  riffSize: number;
  fmtSize: number;
  format: number;
  channels: number;
  sampleRate: number;
  byteRate: number;
  blockAlign: number;
  bitsPerSample: number;
  dataSize: number;
  /** Signed integer samples, as stored in the file. */
  samples: number[];
}

const ascii = (view: DataView, offset: number, length: number) =>
  String.fromCharCode(...Array.from({ length }, (_, i) => view.getUint8(offset + i)));

export function parseWav(bytes: Uint8Array): ParsedWav {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (ascii(view, 0, 4) !== 'RIFF' || ascii(view, 8, 4) !== 'WAVE') throw new Error('Not a RIFF/WAVE file');
  if (ascii(view, 12, 4) !== 'fmt ' || ascii(view, 36, 4) !== 'data')
    throw new Error('Unexpected chunk layout');

  const bitsPerSample = view.getUint16(34, true);
  const dataSize = view.getUint32(40, true);
  const bytesPerSample = bitsPerSample / 8;
  const samples: number[] = [];
  for (let offset = 44; offset < 44 + dataSize; offset += bytesPerSample) {
    if (bitsPerSample === 24) {
      const unsigned =
        view.getUint8(offset) | (view.getUint8(offset + 1) << 8) | (view.getUint8(offset + 2) << 16);
      samples.push(unsigned & 0x800000 ? unsigned - 0x1000000 : unsigned);
    } else if (bitsPerSample === 16) {
      samples.push(view.getInt16(offset, true));
    } else {
      throw new Error(`Unsupported bit depth ${bitsPerSample}`);
    }
  }
  return {
    riffSize: view.getUint32(4, true),
    fmtSize: view.getUint32(16, true),
    format: view.getUint16(20, true),
    channels: view.getUint16(22, true),
    sampleRate: view.getUint32(24, true),
    byteRate: view.getUint32(28, true),
    blockAlign: view.getUint16(32, true),
    bitsPerSample,
    dataSize,
    samples,
  };
}

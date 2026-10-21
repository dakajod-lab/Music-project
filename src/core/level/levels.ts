/** Input level and clipping detection (REC-005, risk R11). Pure functions on raw samples (-1..1). */

/** |sample| at or above this counts as "at full scale". */
export const CLIPPING_THRESHOLD = 0.99;
/** This many full-scale samples in a row means the signal was clipped (a single one is just a peak). */
export const CLIPPING_RUN = 3;

/** Highest absolute sample value in the block, capped at 1. */
export function peakLevel(samples: Float32Array): number {
  let peak = 0;
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  return Math.min(peak, 1);
}

/** Detects clipping across consecutive blocks (a clipped run may span a block boundary). */
export class ClippingDetector {
  private run = 0;

  /** Returns true when the block completes a clipped run. */
  push(samples: Float32Array): boolean {
    let clipped = false;
    for (const sample of samples) {
      this.run = Math.abs(sample) >= CLIPPING_THRESHOLD ? this.run + 1 : 0;
      if (this.run >= CLIPPING_RUN) clipped = true;
    }
    return clipped;
  }

  reset(): void {
    this.run = 0;
  }
}

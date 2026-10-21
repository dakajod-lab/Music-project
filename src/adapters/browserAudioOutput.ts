import type { AudioOutput } from '../core/ports';

/** Speaker adapter (PLY-001): plays raw samples with the Web Audio API. Position follows the audio clock. */
export const browserAudioOutput: AudioOutput = {
  async play(samples, sampleRate, onEnded) {
    const context = new AudioContext({ sampleRate });
    const buffer = context.createBuffer(1, Math.max(samples.length, 1), sampleRate);
    buffer.getChannelData(0).set(samples);
    const source = new AudioBufferSourceNode(context, { buffer });
    source.connect(context.destination);

    let stopped = false;
    const close = () => {
      if (stopped) return;
      stopped = true;
      void context.close();
    };
    source.onended = () => {
      const byItself = !stopped;
      close();
      if (byItself) onEnded();
    };

    await context.resume();
    const startedAt = context.currentTime;
    source.start();
    return {
      positionMs: () => (stopped ? 0 : (context.currentTime - startedAt) * 1000),
      stop() {
        if (stopped) return;
        close();
        source.stop();
      },
    };
  },
};

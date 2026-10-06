import { type AudioInput, type AudioSession, MicrophoneError } from '../core/ports';

const workletUrl = new URL('./capture-processor.js', import.meta.url);

/** Microphone adapter (ADR-004, ADR-006): getUserMedia + AudioWorklet, raw samples, no browser processing (R2). */
export function createBrowserAudioInput(): AudioInput {
  return {
    async start(): Promise<AudioSession> {
      if (!navigator.mediaDevices?.getUserMedia) throw new MicrophoneError('noMicrophone');

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            // R2: all speech processing off by default.
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
      } catch (error) {
        throw new MicrophoneError(
          error instanceof DOMException &&
            (error.name === 'NotAllowedError' || error.name === 'SecurityError')
            ? 'denied'
            : 'noMicrophone',
        );
      }

      const context = new AudioContext({ sampleRate: 48_000 });
      await context.audioWorklet.addModule(workletUrl);
      const source = context.createMediaStreamSource(stream);
      const capture = new AudioWorkletNode(context, 'capture-processor');
      // Keep the graph pulled by the output without making any sound.
      const silence = new GainNode(context, { gain: 0 });
      source.connect(capture).connect(silence).connect(context.destination);

      const chunks: Float32Array[] = [];
      let flushed: (() => void) | null = null;
      capture.port.onmessage = (event: MessageEvent<Float32Array | 'flushed'>) => {
        if (event.data === 'flushed') flushed?.();
        else chunks.push(event.data);
      };

      const track = stream.getAudioTracks()[0];
      return {
        sampleRate: context.sampleRate,
        onEnded(listener) {
          track?.addEventListener('ended', listener);
        },
        async stop() {
          await new Promise<void>((resolve) => {
            flushed = resolve;
            capture.port.postMessage('flush');
            setTimeout(resolve, 500); // never hang if the audio thread is gone
          });
          source.disconnect();
          stream.getTracks().forEach((t) => t.stop());
          await context.close();
          return concat(chunks);
        },
      };
    },
  };
}

function concat(chunks: Float32Array[]): Float32Array {
  const out = new Float32Array(chunks.reduce((sum, c) => sum + c.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

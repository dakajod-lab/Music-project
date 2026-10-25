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
      const sampleListeners: ((samples: Float32Array) => void)[] = [];
      const recordedListeners: ((samples: Float32Array) => void)[] = [];
      let recording = false;
      // Flushes are numbered: the worklet answers { flushed: id } after posting its partly filled block.
      let lastFlush = 0;
      let recordFromFlush = 0;
      const flushWaiters = new Map<number, () => void>();
      const flush = (): number => {
        const id = ++lastFlush;
        capture.port.postMessage({ flush: id });
        return id;
      };
      let acknowledged = 0;
      capture.port.onmessage = (event: MessageEvent<Float32Array | { flushed: number }>) => {
        const data = event.data;
        if (!(data instanceof Float32Array)) {
          acknowledged = data.flushed;
          flushWaiters.get(data.flushed)?.();
          flushWaiters.delete(data.flushed);
          return;
        }
        // Blocks that arrive before the beginRecording() flush is acknowledged are from before the start.
        if (recording && acknowledged >= recordFromFlush) {
          chunks.push(data);
          recordedListeners.forEach((listener) => listener(data));
        }
        sampleListeners.forEach((listener) => listener(data));
      };

      const track = stream.getAudioTracks()[0];
      return {
        sampleRate: context.sampleRate,
        onEnded(listener) {
          track?.addEventListener('ended', listener);
        },
        onSamples(listener) {
          sampleListeners.push(listener);
        },
        onRecordedSamples(listener) {
          recordedListeners.push(listener);
        },
        beginRecording() {
          chunks.length = 0;
          recording = true;
          recordFromFlush = flush();
        },
        async stop() {
          await new Promise<void>((resolve) => {
            flushWaiters.set(flush(), resolve);
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

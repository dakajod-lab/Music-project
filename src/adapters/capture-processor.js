// AudioWorklet processor (ADR-004): forwards raw microphone samples to the main thread in blocks.
// Plain JavaScript on purpose: it runs in the audio thread and is loaded as a separate file.
const BLOCK_SIZE = 4096;

class CaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(BLOCK_SIZE);
    this.filled = 0;
    this.port.onmessage = (event) => {
      if (event.data === 'flush') {
        this.port.postMessage(this.buffer.slice(0, this.filled));
        this.filled = 0;
        this.port.postMessage('flushed');
      }
    };
  }

  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (channel) {
      for (let i = 0; i < channel.length; i++) {
        this.buffer[this.filled++] = channel[i];
        if (this.filled === BLOCK_SIZE) {
          this.port.postMessage(this.buffer.slice());
          this.filled = 0;
        }
      }
    }
    return true;
  }
}

registerProcessor('capture-processor', CaptureProcessor);

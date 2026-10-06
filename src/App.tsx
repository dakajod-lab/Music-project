import { useState } from 'react';
import { browserClock } from './adapters/browserClock';
import { createBrowserAudioInput } from './adapters/browserAudioInput';
import { RecorderController } from './core/recorder/RecorderController';
import { Recorder } from './ui/Recorder';

export function App({ createRecorder = defaultRecorder }: { createRecorder?: () => RecorderController }) {
  const [recorder] = useState(createRecorder);
  return (
    <main>
      <h1>Music Recorder</h1>
      <Recorder recorder={recorder} />
    </main>
  );
}

function defaultRecorder() {
  return new RecorderController(createBrowserAudioInput(), browserClock);
}

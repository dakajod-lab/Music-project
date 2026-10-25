import { useEffect, useState } from 'react';
import { browserAudioOutput } from './adapters/browserAudioOutput';
import { browserClock } from './adapters/browserClock';
import { createBrowserAudioInput } from './adapters/browserAudioInput';
import { browserLifecycle } from './adapters/browserLifecycle';
import { createIndexedDbStore } from './adapters/indexedDbStore';
import { Player } from './core/player/Player';
import { RecorderController } from './core/recorder/RecorderController';
import { Recorder } from './ui/Recorder';

export interface AppServices {
  recorder: RecorderController;
  player: Player;
}

export function App({ createServices = defaultServices }: { createServices?: () => AppServices }) {
  const [{ recorder, player }] = useState(createServices);
  useEffect(() => {
    void recorder.restore(); // STO-001: bring back the recording kept on this device
  }, [recorder]);
  return (
    <main>
      <h1>Music Recorder</h1>
      <Recorder recorder={recorder} player={player} />
    </main>
  );
}

function defaultServices(): AppServices {
  return {
    recorder: new RecorderController({
      audioInput: createBrowserAudioInput(),
      clock: browserClock,
      store: createIndexedDbStore(),
      lifecycle: browserLifecycle,
    }),
    player: new Player(browserAudioOutput, browserClock),
  };
}

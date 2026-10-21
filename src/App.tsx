import { useState } from 'react';
import { browserAudioOutput } from './adapters/browserAudioOutput';
import { browserClock } from './adapters/browserClock';
import { createBrowserAudioInput } from './adapters/browserAudioInput';
import { Player } from './core/player/Player';
import { RecorderController } from './core/recorder/RecorderController';
import { Recorder } from './ui/Recorder';

export interface AppServices {
  recorder: RecorderController;
  player: Player;
}

export function App({ createServices = defaultServices }: { createServices?: () => AppServices }) {
  const [{ recorder, player }] = useState(createServices);
  return (
    <main>
      <h1>Music Recorder</h1>
      <Recorder recorder={recorder} player={player} />
    </main>
  );
}

function defaultServices(): AppServices {
  return {
    recorder: new RecorderController(createBrowserAudioInput(), browserClock),
    player: new Player(browserAudioOutput, browserClock),
  };
}

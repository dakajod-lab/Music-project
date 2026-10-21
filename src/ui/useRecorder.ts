import { useSyncExternalStore } from 'react';
import type { Player } from '../core/player/Player';
import type { RecorderController } from '../core/recorder/RecorderController';

export function useRecorderState(recorder: RecorderController) {
  return useSyncExternalStore(recorder.subscribe, recorder.getState);
}

export function useInputLevel(recorder: RecorderController) {
  return useSyncExternalStore(recorder.subscribeLevel, recorder.getLevel);
}

export function usePlayerState(player: Player) {
  return useSyncExternalStore(player.subscribe, player.getState);
}

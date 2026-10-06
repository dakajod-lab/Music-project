import { useSyncExternalStore } from 'react';
import type { RecorderController } from '../core/recorder/RecorderController';

export function useRecorderState(recorder: RecorderController) {
  return useSyncExternalStore(recorder.subscribe, recorder.getState);
}

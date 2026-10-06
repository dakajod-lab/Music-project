import type { Clock } from '../core/ports';

export const browserClock: Clock = {
  now: () => performance.now(),
  every(ms, callback) {
    const id = setInterval(callback, ms);
    return () => clearInterval(id);
  },
};

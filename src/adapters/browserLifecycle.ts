import type { Lifecycle } from '../core/ports';

/** REC-003: the page becoming hidden means the user switched app, locked the screen or changed tab. */
export const browserLifecycle: Lifecycle = {
  onHidden(listener) {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') listener();
    });
  },
};

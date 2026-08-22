import { bootstrapApplication } from '@angular/platform-browser';
import { registerAtlasGrid } from '@shared';
import { appConfig } from './app/app.config';
import { App } from './app/app';

/**
 * Artificial delay (ms) before the app bootstraps, so the pre-bootstrap spinner in
 * `index.html` stays visible long enough to inspect. Defaults to 0 (no delay).
 *
 * Override at runtime WITHOUT rebuilding — handy for testing the loader:
 *   • URL query param:  ?loaderDelay=3000
 *   • localStorage:     localStorage.setItem('bmo-atlas-loader-delay', '3000')
 * (query param wins; both are ignored if unset/invalid.)
 */
const INITIAL_LOAD_DELAY_MS = 0;

function resolveStartupDelay(): number {
  try {
    const q = new URLSearchParams(location.search).get('loaderDelay');
    if (q) return Math.max(0, Number(q) || 0);
    const stored = localStorage.getItem('bmo-atlas-loader-delay');
    if (stored) return Math.max(0, Number(stored) || 0);
  } catch { /* SSR / restricted storage — fall back to the constant */ }
  return INITIAL_LOAD_DELAY_MS;
}

// Register AG Grid modules + install the token-driven Atlas grid theme.
registerAtlasGrid();

const startApp = (): void => {
  bootstrapApplication(App, appConfig).catch((err) => console.error(err));
};

const delay = resolveStartupDelay();
if (delay > 0) {
  setTimeout(startApp, delay);
} else {
  startApp();
}

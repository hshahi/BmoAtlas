import { bootstrapApplication } from '@angular/platform-browser';
import { registerAtlasGrid } from '@shared';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Register AG Grid modules + install the token-driven Atlas grid theme.
registerAtlasGrid();

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));

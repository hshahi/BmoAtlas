import { ApplicationConfig, ErrorHandler, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideLuxonDateAdapter } from '@angular/material-luxon-adapter';
import { errorInterceptor, mockApiInterceptor, GlobalErrorHandler, buildLuxonFormats } from '@shared';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    // mockApiInterceptor first so it can serve /api/* (incl. the data-grid demo).
    provideHttpClient(withInterceptors([mockApiInterceptor, errorInterceptor])),
    provideAnimationsAsync(),
    // App-wide default: Material datepickers use the Luxon adapter with dd-MMM-yyyy.
    provideLuxonDateAdapter(buildLuxonFormats()),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
  ],
};

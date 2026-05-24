import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { delay, of } from 'rxjs';

/**
 * Mock API interceptor that intercepts requests to `/api/*` endpoints
 * and returns simulated responses with a realistic delay.
 *
 * This allows {@link HttpData} to go through its natural lifecycle
 * (`loading` → `resolved`) so that `load-wrapper` spinners display correctly.
 *
 * Remove this interceptor when connecting to a real backend.
 */
export const mockApiInterceptor: HttpInterceptorFn = (req, next) => {

  // ── /api/dashboard/stats ─────────────────────────────────────────
  if (req.url === '/api/dashboard/stats' && req.method === 'GET') {
    const body = {
      totalUsers: 12_450,
      activeUsers: 8_320,
      revenue: 1_250_000,
      growth: 12.5,
    };

    return of(new HttpResponse({ status: 200, body })).pipe(delay(800));
  }

  // ── /api/settings ────────────────────────────────────────────────
  if (req.url === '/api/settings' && req.method === 'GET') {
    const body = {
      notifications: true,
      language: 'en',
      timezone: 'UTC',
      theme: 'system',
    };

    return of(new HttpResponse({ status: 200, body })).pipe(delay(600));
  }

  // ── Pass through all other requests ──────────────────────────────
  return next(req);
};

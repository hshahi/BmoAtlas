import { HttpInterceptorFn, HttpResponse, HttpRequest } from '@angular/common/http';
import { delay, of } from 'rxjs';

/**
 * Mock API interceptor that intercepts requests to `/api/*` endpoints
 * and returns simulated responses with a realistic delay.
 *
 * This allows {@link HttpData} / {@link HttpClientData} to go through their
 * natural lifecycle (`loading` → `resolved`) so that loaders display correctly.
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

  // ── /api/positions* (generic data-grid demo backend) ─────────────
  const positionsResponse = handlePositions(req);
  if (positionsResponse) {
    return of(new HttpResponse({ status: 200, body: positionsResponse.body })).pipe(
      delay(positionsResponse.delayMs),
    );
  }

  // ── Pass through all other requests ──────────────────────────────
  return next(req);
};

// ═══════════════════════════════════════════════════════════════════
//  In-memory "positions" store powering the generic data-grid demo.
//  Supports: paged GET, POST (create), PUT (update), DELETE, and a
//  per-row change-history GET.
// ═══════════════════════════════════════════════════════════════════

interface Position {
  id: string;
  symbol: string;
  quantity: number;
  price: number;
  side: 'BUY' | 'SELL';
  trader: string;
}

interface PositionHistory {
  changedAt: string;
  field: string;
  from: string;
  to: string;
  user: string;
}

const SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM', 'BAC', 'V'];
const TRADERS = ['A. Chen', 'R. Patel', 'M. Owusu', 'L. Rossi', 'K. Novak'];

/** Seeded position list (deterministic — no Math.random at module scope). */
const POSITIONS: Position[] = Array.from({ length: 84 }, (_, i) => ({
  id: `P-${1000 + i}`,
  symbol: SYMBOLS[i % SYMBOLS.length],
  quantity: 100 + ((i * 37) % 900),
  price: Number((50 + ((i * 13) % 450) + (i % 100) / 100).toFixed(2)),
  side: i % 3 === 0 ? 'SELL' : 'BUY',
  trader: TRADERS[i % TRADERS.length],
}));

/** Per-id change history, appended to as rows are edited. */
const HISTORY = new Map<string, PositionHistory[]>();
let idSeq = 2000;

// Seed dummy history for the first row (P-1000) so the popup grid shows data
// without having to edit a row first. Newest first (matches recordHistory()).
HISTORY.set('P-1000', [
  { changedAt: '2026-07-29T15:42:00', field: 'price', from: '49.10', to: '50.00', user: 'A. Chen' },
  { changedAt: '2026-07-29T11:08:00', field: 'quantity', from: '80', to: '100', user: 'R. Patel' },
  { changedAt: '2026-07-28T17:20:00', field: 'side', from: 'BUY', to: 'SELL', user: 'A. Chen' },
  { changedAt: '2026-07-28T09:55:00', field: 'trader', from: 'M. Owusu', to: 'A. Chen', user: 'system' },
  { changedAt: '2026-07-27T14:03:00', field: 'price', from: '48.25', to: '49.10', user: 'L. Rossi' },
  { changedAt: '2026-07-27T10:31:00', field: 'quantity', from: '60', to: '80', user: 'R. Patel' },
  { changedAt: '2026-07-26T16:12:00', field: 'price', from: '47.90', to: '48.25', user: 'K. Novak' },
  { changedAt: '2026-07-26T09:47:00', field: 'trader', from: 'L. Rossi', to: 'M. Owusu', user: 'system' },
  { changedAt: '2026-07-25T13:29:00', field: 'side', from: 'SELL', to: 'BUY', user: 'A. Chen' },
  { changedAt: '2026-07-25T08:15:00', field: 'price', from: '47.10', to: '47.90', user: 'K. Novak' },
]);

function handlePositions(req: HttpRequest<unknown>): { body: unknown; delayMs: number } | null {
  const url = req.url;

  // GET /api/positions/:id/history
  const histMatch = url.match(/^\/api\/positions\/([^/]+)\/history$/);
  if (histMatch && req.method === 'GET') {
    return { body: (HISTORY.get(histMatch[1]) ?? []).map(h => ({ ...h })), delayMs: 500 };
  }

  // GET /api/positions?page=&pageSize=  (paged)
  // Return CLONES — a real backend serializes its response, so client-side edits
  // must not mutate the store by shared reference.
  if (url === '/api/positions' && req.method === 'GET') {
    const page = Number(req.params.get('page') ?? '0');
    const pageSize = Number(req.params.get('pageSize') ?? '20');
    const start = page * pageSize;
    const items = POSITIONS.slice(start, start + pageSize).map(p => ({ ...p }));
    return { body: items, delayMs: 700 };
  }

  // POST /api/positions  (create)
  if (url === '/api/positions' && req.method === 'POST') {
    const input = (req.body ?? {}) as Partial<Position>;
    const created: Position = {
      id: `P-${idSeq++}`,
      symbol: input.symbol ?? 'NEW',
      quantity: Number(input.quantity ?? 0),
      price: Number(input.price ?? 0),
      side: input.side === 'SELL' ? 'SELL' : 'BUY',
      trader: input.trader ?? 'unassigned',
    };
    POSITIONS.unshift(created);
    return { body: { ...created }, delayMs: 500 };
  }

  const idMatch = url.match(/^\/api\/positions\/([^/]+)$/);
  if (idMatch) {
    const id = idMatch[1];
    const index = POSITIONS.findIndex(p => p.id === id);

    // PUT /api/positions/:id  (update + record history)
    if (req.method === 'PUT') {
      const input = (req.body ?? {}) as Position;
      if (index >= 0) {
        const before = POSITIONS[index];
        recordHistory(id, before, input);
        POSITIONS[index] = { ...before, ...input, id };
        return { body: { ...POSITIONS[index] }, delayMs: 500 };
      }
      return { body: { ...input }, delayMs: 500 };
    }

    // DELETE /api/positions/:id
    if (req.method === 'DELETE') {
      if (index >= 0) POSITIONS.splice(index, 1);
      return { body: { id }, delayMs: 500 };
    }
  }

  return null;
}

/** Record a change-history entry for each field that differs. */
function recordHistory(id: string, before: Position, after: Position): void {
  const entries = HISTORY.get(id) ?? [];
  const stamp = new Date().toISOString();
  (['symbol', 'quantity', 'price', 'side', 'trader'] as const).forEach(field => {
    const from = String(before[field]);
    const to = String(after[field]);
    if (from !== to) {
      entries.unshift({ changedAt: stamp, field, from, to, user: 'you' });
    }
  });
  HISTORY.set(id, entries);
}

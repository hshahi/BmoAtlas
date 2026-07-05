import { Domain, DomainList, DomainConstructor } from '@core';

/**
 * Raw API response from Alpha Vantage TIME_SERIES_MONTHLY endpoint.
 */
export interface AlphaVantageMonthlyResponse {
  'Meta Data': {
    '1. Information': string;
    '2. Symbol': string;
    '3. Last Refreshed': string;
    '4. Output Size': string;
    '5. Time Zone': string;
  };
  'Monthly Time Series': {
    [date: string]: {
      '1. open': string;
      '2. high': string;
      '3. low': string;
      '4. close': string;
      '5. volume': string;
    };
  };
}

// ── Domain Models ───────────────────────────────────────────────────

/**
 * A single time-series entry (one month of OHLCV data).
 *
 * Extends `Domain<StockEntry>` so it participates in the core
 * `clone()`, `equals()`, `toJson()`, and `fromJson()` lifecycle.
 */
export class StockEntry extends Domain<StockEntry> {
  id: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  change: number;
  changePercent: number;

  constructor(data?: Partial<StockEntry>) {
    super(StockEntry);
    this.id            = data?.date ?? data?.id ?? '';
    this.date          = data?.date ?? '';
    this.open          = data?.open ?? 0;
    this.high          = data?.high ?? 0;
    this.low           = data?.low ?? 0;
    this.close         = data?.close ?? 0;
    this.volume        = data?.volume ?? 0;
    this.change        = data?.change ?? 0;
    this.changePercent = data?.changePercent ?? 0;
  }
}

/**
 * Typed list of `StockEntry` items.
 * Provides `DomainList.fromJson(data)` support via the static `itemType`.
 */
export class StockEntryList extends DomainList<StockEntry> {
  static override readonly itemType: DomainConstructor<StockEntry> = StockEntry;

  constructor(items?: Array<Partial<StockEntry> | StockEntry>) {
    super(StockEntry, StockEntryList as any, items);
  }
}

/**
 * Parsed metadata from the API response.
 */
export class StockMeta extends Domain<StockMeta> {
  id: string;
  information: string;
  symbol: string;
  lastRefreshed: string;
  timeZone: string;

  constructor(data?: Partial<StockMeta>) {
    super(StockMeta);
    this.id            = data?.symbol ?? data?.id ?? '';
    this.information   = data?.information ?? '';
    this.symbol        = data?.symbol ?? '';
    this.lastRefreshed = data?.lastRefreshed ?? '';
    this.timeZone      = data?.timeZone ?? '';
  }
}

/**
 * Fully parsed stock data ready for display.
 *
 * Demonstrates `Domain.fromJson()` used inside `HttpClientData`'s `parse` option:
 *
 * ```ts
 * new HttpClientData<StockData>(this.injector, {
 *   url: API_URL,
 *   parse: parseMonthlyResponse,   // ← uses StockData.fromJson internally
 * });
 * ```
 */
export class StockData extends Domain<StockData> {
  id: string;
  meta: StockMeta;
  entries: StockEntryList;

  constructor(data?: Partial<StockData>) {
    super(StockData);
    this.meta    = data?.meta instanceof StockMeta ? data.meta : StockMeta.fromJson(data?.meta ?? {});
    this.id      = this.meta.symbol;
    this.entries = data?.entries instanceof StockEntryList
      ? data.entries
      : new StockEntryList(data?.entries as Array<Partial<StockEntry>> | undefined);
  }
}

// ── Parse Function (used as HttpClientData `parse` callback) ────────

/**
 * Parse the raw Alpha Vantage response into clean domain models.
 *
 * Throws a descriptive error when the API returns an unexpected shape
 * (e.g. rate-limit notice, invalid API key, or malformed payload).
 *
 * Internally uses `Domain.fromJson()` to construct each domain object,
 * demonstrating how the core `Domain` base class integrates with
 * `HttpClientData`'s `parse` option.
 */
export function parseMonthlyResponse(raw: unknown): StockData {
  const response = raw as Record<string, unknown>;

  const metaRaw = response?.['Meta Data'] as AlphaVantageMonthlyResponse['Meta Data'] | undefined;
  const seriesRaw = response?.['Monthly Time Series'] as AlphaVantageMonthlyResponse['Monthly Time Series'] | undefined;

  if (!metaRaw || !seriesRaw) {
    // Alpha Vantage returns { "Note": "..." } on rate-limit
    // or { "Information": "..." } on invalid calls
    const apiNote = (response?.['Note'] ?? response?.['Information'] ?? 'Unknown API error') as string;
    throw new Error(`Alpha Vantage API error: ${apiNote}`);
  }

  // Use Domain.fromJson to construct the meta object
  const meta = StockMeta.fromJson({
    information:   metaRaw['1. Information'],
    symbol:        metaRaw['2. Symbol'],
    lastRefreshed: metaRaw['3. Last Refreshed'],
    timeZone:      metaRaw['5. Time Zone'],
  });

  const dates = Object.keys(seriesRaw).sort((a, b) => b.localeCompare(a));

  // Use StockEntry.fromJson for each entry
  const entryPartials = dates.map((date, index) => {
    const entry = seriesRaw[date];
    const close = parseFloat(entry['4. close']);
    const open = parseFloat(entry['1. open']);

    // Calculate change from previous period's close
    const prevDate = dates[index + 1];
    const prevClose = prevDate ? parseFloat(seriesRaw[prevDate]['4. close']) : open;
    const change = close - prevClose;
    const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;

    return StockEntry.fromJson({
      date,
      open,
      high: parseFloat(entry['2. high']),
      low: parseFloat(entry['3. low']),
      close,
      volume: parseInt(entry['5. volume'], 10),
      change,
      changePercent,
    });
  });

  const entries = new StockEntryList(entryPartials);

  // Use StockData.fromJson to construct the top-level domain object
  return StockData.fromJson({ meta, entries } as Partial<StockData>);
}

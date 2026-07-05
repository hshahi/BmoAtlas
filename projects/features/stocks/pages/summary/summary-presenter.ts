import { Component, ChangeDetectionStrategy, input, inject, signal, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import { AgGridAngular } from 'ag-grid-angular';
import type {
  ColDef,
  ValueFormatterParams,
  CellClassParams,
  GridApi,
  GridReadyEvent,
  GetRowIdParams,
} from 'ag-grid-community';
import { HttpClientData } from '@core';
import { LoadWrapperClientData, AtlasLoader } from '@shared';
import { StockData, StockEntry } from '../../models/stock.models';
import '@aejkatappaja/phantom-ui';

const money = (p: ValueFormatterParams<StockEntry, number>): string =>
  p.value == null ? '' : Number(p.value).toFixed(2);

const volume = (p: ValueFormatterParams<StockEntry, number>): string => {
  const v = p.value ?? 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toString();
};

const percent = (p: ValueFormatterParams<StockEntry, number>): string => {
  const v = p.value ?? 0;
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
};

const changeClass = (p: CellClassParams<StockEntry, number>): string =>
  `font-mono ${(p.value ?? 0) >= 0 ? 'text-gain' : 'text-loss'}`;

@Component({
  selector: 'app-summary-presenter',
  imports: [LoadWrapperClientData, AgGridAngular, AtlasLoader],
  template: `
    <div class="summary">
      <div class="summary__header">
        <h2 class="summary__title">Monthly Stock Summary</h2>
        <div class="summary__filter">
          <button class="summary__filter-btn summary__filter-btn--active" (click)="goTo('summary')">Summary</button>
          <button class="summary__filter-btn" (click)="goTo('breakdown')">Breakdown</button>
        </div>
      </div>

      <!-- showReloadingState=false keeps the content mounted during refresh so the
           phantom-ui overlays below can shimmer over it. Each section is wrapped in
           its own <phantom-ui>, all driven by the resource's reloading state. -->
      <load-wrapper-client-data [source]="stockData()" [showReloadingState]="false">

        <!-- First load — composed loader (the wrapper no longer ships a default). -->
        <ng-template #loading>
          <atlas-loader class="summary__first-load" message="Loading stock data…" />
        </ng-template>

        <ng-template #content let-data>
          <phantom-ui [attr.loading]="stockData().isReloading() ? '' : null" animation="shimmer" mode="overlay">
            <div class="summary__meta card">
              <div class="summary__meta-item">
                <span class="summary__meta-label">Symbol</span>
                <span class="summary__meta-value">{{ data.meta.symbol }}</span>
              </div>
              <div class="summary__meta-item">
                <span class="summary__meta-label">Last Refreshed</span>
                <span class="summary__meta-value">{{ data.meta.lastRefreshed }}</span>
              </div>
              <div class="summary__meta-item">
                <span class="summary__meta-label">Time Zone</span>
                <span class="summary__meta-value">{{ data.meta.timeZone }}</span>
              </div>
              <div class="summary__meta-item">
                <span class="summary__meta-label">Periods</span>
                <span class="summary__meta-value">{{ data.entries.length }}</span>
              </div>
            </div>
          </phantom-ui>

          <phantom-ui [attr.loading]="stockData().isReloading() ? '' : null" animation="shimmer" mode="overlay">
            <div class="summary__toolbar">
              <input
                class="form-input summary__search"
                type="text"
                placeholder="Filter rows…"
                [value]="quickFilter()"
                (input)="onQuickFilter($event)"
                aria-label="Filter table rows"
              />
              <button class="btn summary__export" (click)="exportCsv(data)">⬇ Export CSV</button>
            </div>
          </phantom-ui>

          <!-- data-shimmer-no-children: AG Grid's virtualized cells can't be measured
               as leaves, so capture the whole grid as one shimmer block. -->
          <atlas-loader [loading]="stockData().isReloading()">
              <ag-grid-angular
                class="summary__grid card"
                data-shimmer-no-children
                [rowData]="getTopEntries(data)"
                [columnDefs]="columnDefs"
                [defaultColDef]="defaultColDef"
                [pinnedBottomRowData]="summaryRow(data)"
                [quickFilterText]="quickFilter()"
                [getRowId]="getRowId"
                [domLayout]="'autoHeight'"
                (gridReady)="onGridReady($event)"
              />
            </atlas-loader>

          <!-- <phantom-ui [attr.loading]="stockData().isReloading() ? '' : null" animation="shimmer" mode="overlay">
            <ag-grid-angular
              class="summary__grid card"
              data-shimmer-no-children
              [rowData]="getTopEntries(data)"
              [columnDefs]="columnDefs"
              [defaultColDef]="defaultColDef"
              [pinnedBottomRowData]="summaryRow(data)"
              [quickFilterText]="quickFilter()"
              [getRowId]="getRowId"
              [domLayout]="'autoHeight'"
              (gridReady)="onGridReady($event)"
            />
          </phantom-ui> -->
        </ng-template>

        <ng-template #error let-error="error" let-retry="retry">
          <div class="summary__error card">
            <span class="summary__error-icon">⚠️</span>
            <p>Failed to load stock data</p>
            <p class="summary__error-detail">{{ error }}</p>
            <div class="summary__error-actions">
              <button class="btn" (click)="retry()">Retry</button>
              @if (onLoadLocal()) {
                <button class="btn btn--local" (click)="onLoadLocal()!()">Use Local Data</button>
              }
            </div>
          </div>
        </ng-template>
      </load-wrapper-client-data>
    </div>
  `,
  styles: [`
    :host { display: block; container-type: inline-size; container-name: summary; }

    .summary__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--space-lg);
      flex-wrap: wrap;
      gap: var(--space-md);
    }
    .summary__title {
      font-size: var(--text-2xl);
      font-weight: var(--weight-bold);
    }
    .summary__filter {
      display: flex;
      gap: var(--space-xs);
    }
    .summary__filter-btn {
      padding: var(--space-xs) var(--space-md);
      border-radius: var(--radius-md);
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      color: var(--color-text-secondary);
      border: 1px solid var(--color-border);
      background: var(--color-bg-surface);
      cursor: pointer;
      transition: all var(--transition-fast);
    }
    .summary__filter-btn:hover {
      background: var(--color-bg-muted);
      color: var(--color-text);
    }
    .summary__filter-btn--active {
      color: var(--color-primary);
      border-color: var(--color-primary);
      background: color-mix(in srgb, var(--color-primary) 10%, transparent);
    }

    .summary__loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--space-2xl);
      gap: var(--space-md);
      color: var(--color-text-secondary);
    }
    .summary__spinner {
      width: 48px;
      height: 48px;
    }
    .summary__spinner svg {
      width: 100%;
      height: 100%;
    }
    .summary__arc--outer {
      stroke: var(--color-primary, #60a5fa);
      stroke-dasharray: 54 109.4;
      transform-origin: center;
      animation: arc-cw 1.2s linear infinite;
    }
    .summary__arc--inner {
      stroke: var(--color-accent, #7dd3fc);
      stroke-dasharray: 34 66.5;
      transform-origin: center;
      animation: arc-ccw 1s linear infinite;
    }

    .summary__meta {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: var(--space-md);
      padding: var(--space-md) var(--space-lg);
      margin-bottom: var(--space-lg);
    }
    .summary__meta-item {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
    }
    .summary__meta-label {
      font-size: var(--text-xs);
      color: var(--color-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .summary__meta-value {
      font-size: var(--text-lg);
      font-weight: var(--weight-semibold);
      font-family: var(--font-mono);
    }

    .summary__toolbar {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      margin-bottom: var(--space-md);
      flex-wrap: wrap;
    }
    .summary__search {
      flex: 1 1 220px;
      max-width: 340px;
    }
    .summary__export {
      flex-shrink: 0;
    }

    .summary__grid {
      display: block;
      width: 100%;
      padding: 0;
      overflow: hidden;
    }

    /* Standalone first-load loader needs height so the centered spinner shows. */
    .summary__first-load {
      display: block;
      min-height: 16rem;
    }

    /* Each section is wrapped in <phantom-ui>; make the element a block so it
       doesn't collapse, and space the sections like the old direct children.
       position + overflow contain and clip phantom-ui's absolutely-positioned
       shimmer overlay so it can't spawn stray scroll bars. */
    phantom-ui {
      display: block;
      position: relative;
      overflow: hidden;
      margin-bottom: var(--space-lg);
    }

    /* While shimmering, AG Grid re-measures and can flip its OWN internal scroll
       bars on. They live inside the grid (below the host clip above), so clip them
       here — only during loading (phantom-ui[loading]) and only for these grids.
       ::ng-deep reaches AG Grid's runtime-generated DOM. */
    :host ::ng-deep phantom-ui[loading] .ag-body-horizontal-scroll,
    :host ::ng-deep phantom-ui[loading] .ag-body-vertical-scroll {
      display: none;
    }
    :host ::ng-deep phantom-ui[loading] .ag-body-viewport,
    :host ::ng-deep phantom-ui[loading] .ag-center-cols-viewport {
      overflow: hidden;
      scrollbar-width: none;
    }

    /* ── Shimmer loader tuning (phantom-ui) ─────────────────────────────
       Set HERE on the phantom-ui element and read by the web component.
       Colours derive from --color-text, so they stay theme-adaptive
       (darker on light themes, lighter on dark themes) automatically.
         --shimmer-bg              Background of each shimmer block (lower % = subtler).
         --shimmer-color           Colour of the moving sweep (animation="shimmer").
         --shimmer-duration        Animation cycle time (higher = calmer).
         --phantom-content-opacity Overlay mode — how visible the underlying
                                   controls stay (higher → 1 = more visible).
       The animation TYPE is the "animation" attribute on phantom-ui in the
       template above, not here. */
    phantom-ui {
      --shimmer-bg: color-mix(in srgb, var(--color-text, #888) 8%, transparent);
      --shimmer-color: color-mix(in srgb, var(--color-text, #888) 20%, transparent);
      --shimmer-duration: 1.4s;
      --phantom-content-opacity: 0.85;
    }

    .summary__error {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: var(--space-2xl);
      gap: var(--space-md);
      text-align: center;
    }
    .summary__error-icon { font-size: 2rem; }
    .summary__error-detail {
      font-size: var(--text-sm);
      color: var(--color-text-secondary);
    }
    .summary__error-actions {
      display: flex;
      gap: var(--space-sm);
      flex-wrap: wrap;
      justify-content: center;
    }

    .text-right { text-align: right; }
    .font-mono { font-family: var(--font-mono); }
    .font-bold { font-weight: var(--weight-bold); }
    .text-gain { color: var(--color-success, #16a34a); }
    .text-loss { color: var(--color-danger, #dc2626); }
    .btn {
      padding: var(--space-sm) var(--space-lg);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-bg-surface);
      cursor: pointer;
      font-weight: var(--weight-medium);
    }
    .btn:hover { background: var(--color-bg-muted); }

    @container summary (max-width: 600px) {
      .summary__header { flex-direction: column; align-items: flex-start; }
      .summary__title { font-size: var(--text-xl); }
      .summary__meta { grid-template-columns: repeat(2, 1fr); }
    }

    @keyframes arc-cw { to { transform: rotate(360deg); } }
    @keyframes arc-ccw { to { transform: rotate(-360deg); } }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class SummaryPresenter {
  stockData = input.required<HttpClientData<StockData>>();
  onLoadLocal = input<(() => void) | undefined>(undefined);

  private readonly router = inject(Router);

  /** Global quick-filter term (searches across all columns). */
  protected readonly quickFilter = signal('');

  private gridApi: GridApi<StockEntry> | null = null;

  protected readonly defaultColDef: ColDef<StockEntry> = {
    sortable: true,
    resizable: true,
    filter: true,
    floatingFilter: true,
    enableCellChangeFlash: true,
    flex: 1,
    minWidth: 80,
  };

  protected readonly columnDefs: ColDef<StockEntry>[] = [
    { field: 'date', headerName: 'Date', minWidth: 110, cellClass: 'font-mono', filter: 'agTextColumnFilter' },
    { field: 'open', headerName: 'Open', type: 'rightAligned', valueFormatter: money, cellClass: 'font-mono', filter: 'agNumberColumnFilter' },
    { field: 'high', headerName: 'High', type: 'rightAligned', valueFormatter: money, cellClass: 'font-mono', filter: 'agNumberColumnFilter' },
    { field: 'low', headerName: 'Low', type: 'rightAligned', valueFormatter: money, cellClass: 'font-mono', filter: 'agNumberColumnFilter' },
    { field: 'close', headerName: 'Close', type: 'rightAligned', valueFormatter: money, cellClass: 'font-mono font-bold', filter: 'agNumberColumnFilter' },
    { field: 'volume', headerName: 'Volume', type: 'rightAligned', valueFormatter: volume, cellClass: 'font-mono', filter: 'agNumberColumnFilter' },
    { field: 'changePercent', headerName: 'Change', type: 'rightAligned', valueFormatter: percent, cellClass: changeClass, filter: 'agNumberColumnFilter' },
  ];

  /** Stable row identity so refreshed data flashes changed cells (not full re-render). */
  protected readonly getRowId = (p: GetRowIdParams<StockEntry>): string => p.data.date;

  getTopEntries(data: StockData): StockEntry[] {
    return data.entries.slice(0, 12);
  }

  /** Pinned footer row: average O/H/L/C, total volume, net % change over the period. */
  protected summaryRow(data: StockData): StockEntry[] {
    const rows = this.getTopEntries(data);
    if (rows.length === 0) return [];

    const avg = (pick: (e: StockEntry) => number): number =>
      rows.reduce((sum, e) => sum + pick(e), 0) / rows.length;

    // Entries are newest-first; net change = (latest close − oldest close) / oldest close.
    const latestClose = rows[0].close;
    const oldestClose = rows[rows.length - 1].close;
    const netChangePct = oldestClose !== 0 ? ((latestClose - oldestClose) / oldestClose) * 100 : 0;

    return [
      new StockEntry({
        date: 'Avg / Total',
        open: avg(e => e.open),
        high: avg(e => e.high),
        low: avg(e => e.low),
        close: avg(e => e.close),
        volume: rows.reduce((sum, e) => sum + e.volume, 0),
        changePercent: netChangePct,
      }),
    ];
  }

  protected onGridReady(event: GridReadyEvent<StockEntry>): void {
    this.gridApi = event.api;
  }

  protected onQuickFilter(event: Event): void {
    this.quickFilter.set((event.target as HTMLInputElement).value);
  }

  protected exportCsv(data: StockData): void {
    this.gridApi?.exportDataAsCsv({
      fileName: `${data.meta.symbol || 'stock'}-summary.csv`,
    });
  }

  goTo(page: string): void {
    this.router.navigate(['../', page], { relativeTo: this.getActivatedRoute() });
  }

  private getActivatedRoute() {
    let route = this.router.routerState.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    return route;
  }
}

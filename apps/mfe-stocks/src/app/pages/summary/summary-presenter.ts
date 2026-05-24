import { Component, ChangeDetectionStrategy, input, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClientData } from '@core';
import { LoadWrapperClientData } from '@shared';
import { StockData, StockEntry } from '../../models/stock.models';

@Component({
  selector: 'app-summary-presenter',
  imports: [LoadWrapperClientData],
  template: `
    <div class="summary">
      <div class="summary__header">
        <h2 class="summary__title">Monthly Stock Summary</h2>
        <div class="summary__filter">
          <button class="summary__filter-btn summary__filter-btn--active" (click)="goTo('summary')">Summary</button>
          <button class="summary__filter-btn" (click)="goTo('breakdown')">Breakdown</button>
        </div>
      </div>

      <load-wrapper-client-data [source]="stockData()">
       
        <ng-template #content let-data>
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

          <div class="summary__table-wrapper card">
            <table class="summary__table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th class="text-right">Open</th>
                  <th class="text-right">High</th>
                  <th class="text-right">Low</th>
                  <th class="text-right">Close</th>
                  <th class="text-right">Volume</th>
                  <th class="text-right">Change</th>
                </tr>
              </thead>
              <tbody>
                @for (entry of getTopEntries(data); track entry.date) {
                  <tr>
                    <td>{{ entry.date }}</td>
                    <td class="text-right font-mono">{{ entry.open.toFixed(2) }}</td>
                    <td class="text-right font-mono">{{ entry.high.toFixed(2) }}</td>
                    <td class="text-right font-mono">{{ entry.low.toFixed(2) }}</td>
                    <td class="text-right font-mono font-bold">{{ entry.close.toFixed(2) }}</td>
                    <td class="text-right font-mono">{{ formatVolume(entry.volume) }}</td>
                    <td class="text-right font-mono" [class.text-gain]="entry.change >= 0" [class.text-loss]="entry.change < 0">
                      {{ entry.change >= 0 ? '+' : '' }}{{ entry.changePercent.toFixed(2) }}%
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
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

    .summary__table-wrapper {
      overflow-x: auto;
      padding: 0;
    }
    .summary__table {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--text-sm);
    }
    .summary__table th {
      padding: var(--space-sm) var(--space-md);
      text-align: left;
      font-weight: var(--weight-semibold);
      color: var(--color-text-secondary);
      border-bottom: 2px solid var(--color-border);
      white-space: nowrap;
    }
    .summary__table td {
      padding: var(--space-sm) var(--space-md);
      border-bottom: 1px solid var(--color-border);
      white-space: nowrap;
    }
    .summary__table tbody tr:hover {
      background: var(--color-bg-muted);
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
})
export class SummaryPresenter {
  stockData = input.required<HttpClientData<StockData>>();
  onLoadLocal = input<(() => void) | undefined>(undefined);

  private readonly router = inject(Router);

  getTopEntries(data: StockData): StockEntry[] {
    return data.entries.slice(0, 12);
  }

  formatVolume(volume: number): string {
    if (volume >= 1_000_000) return (volume / 1_000_000).toFixed(1) + 'M';
    if (volume >= 1_000) return (volume / 1_000).toFixed(0) + 'K';
    return volume.toString();
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

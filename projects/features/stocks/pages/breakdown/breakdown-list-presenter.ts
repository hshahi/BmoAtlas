import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { HttpClientData } from '@core';
import { LoadWrapperClientData } from '@shared';
import { StockData, StockEntry } from '../../models/stock.models';

@Component({
  selector: 'app-breakdown-list',
  imports: [LoadWrapperClientData],
  template: `
    <div class="panel card">
      <h3 class="panel__title">{{ title() }}</h3>

      <load-wrapper-client-data [source]="stockData()">
        
        <ng-template #content let-data>
          <ul class="volume-list">
            @for (entry of getEntries(data); track entry.date) {
              <li class="volume-list__item">
                <div class="volume-list__header">
                  <span class="volume-list__date">{{ entry.date }}</span>
                  <span class="volume-list__close font-mono"
                        [class.text-gain]="entry.change >= 0"
                        [class.text-loss]="entry.change < 0">
                    {{ entry.close.toFixed(2) }}
                    <small>({{ entry.change >= 0 ? '+' : '' }}{{ entry.changePercent.toFixed(2) }}%)</small>
                  </span>
                </div>
                <div class="volume-list__bar-wrapper">
                  <div class="volume-list__bar"
                       [style.width.%]="getBarWidth(entry, data)"
                       [class.volume-list__bar--gain]="entry.change >= 0"
                       [class.volume-list__bar--loss]="entry.change < 0">
                  </div>
                  <span class="volume-list__volume font-mono">{{ formatVolume(entry.volume) }}</span>
                </div>
              </li>
            }
          </ul>
        </ng-template>

        <ng-template #error let-error="error" let-retry="retry">
          <div class="panel__error">
            <span>⚠️ Failed to load volume data</span>
            <div class="panel__error-actions">
              <button class="panel__retry" (click)="retry()">Retry</button>
              @if (onLoadLocal()) {
                <button class="panel__retry panel__retry--local" (click)="onLoadLocal()!()">Use Local Data</button>
              }
            </div>
          </div>
        </ng-template>
      </load-wrapper-client-data>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .panel { padding: 0; overflow: hidden; }
    .panel__title {
      padding: var(--space-md) var(--space-lg);
      font-size: var(--text-lg);
      font-weight: var(--weight-semibold);
      border-bottom: 1px solid var(--color-border);
    }

    .panel__loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--space-2xl);
      gap: var(--space-md);
      color: var(--color-text-secondary);
    }
    .panel__spinner {
      width: 48px;
      height: 48px;
    }
    .panel__spinner svg {
      width: 100%;
      height: 100%;
    }
    .panel__arc--outer {
      stroke: var(--color-primary, #60a5fa);
      stroke-dasharray: 54 109.4;
      transform-origin: center;
      animation: arc-cw 1.2s linear infinite;
    }
    .panel__arc--inner {
      stroke: var(--color-accent, #7dd3fc);
      stroke-dasharray: 34 66.5;
      transform-origin: center;
      animation: arc-ccw 1s linear infinite;
    }

    .volume-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .volume-list__item {
      padding: var(--space-sm) var(--space-lg);
      border-bottom: 1px solid var(--color-border);
    }
    .volume-list__item:last-child {
      border-bottom: none;
    }
    .volume-list__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-xs);
    }
    .volume-list__date {
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
    }
    .volume-list__close {
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
    }
    .volume-list__close small {
      font-size: var(--text-xs);
      font-weight: var(--weight-normal);
    }
    .volume-list__bar-wrapper {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
    }
    .volume-list__bar {
      height: 8px;
      border-radius: 4px;
      transition: width 0.3s ease;
      min-width: 4px;
    }
    .volume-list__bar--gain {
      background: var(--color-success, #16a34a);
    }
    .volume-list__bar--loss {
      background: var(--color-danger, #dc2626);
    }
    .volume-list__volume {
      font-size: var(--text-xs);
      color: var(--color-text-secondary);
      white-space: nowrap;
    }

    .panel__error {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: var(--space-xl);
      gap: var(--space-md);
      color: var(--color-text-secondary);
    }
    .panel__error-actions {
      display: flex;
      gap: var(--space-sm);
      flex-wrap: wrap;
      justify-content: center;
    }
    .panel__retry {
      padding: var(--space-xs) var(--space-md);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-bg-surface);
      cursor: pointer;
    }
    .panel__retry:hover { background: var(--color-bg-muted); }

    .font-mono { font-family: var(--font-mono); }
    .text-gain { color: var(--color-success, #16a34a); }
    .text-loss { color: var(--color-danger, #dc2626); }

    @keyframes arc-cw { to { transform: rotate(360deg); } }
    @keyframes arc-ccw { to { transform: rotate(-360deg); } }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreakdownListPresenter {
  stockData = input.required<HttpClientData<StockData>>();
  title = input<string>('Volume Analysis');
  onLoadLocal = input<(() => void) | undefined>(undefined);

  getEntries(data: StockData): StockEntry[] {
    return data.entries.slice(0, 10);
  }

  getBarWidth(entry: StockEntry, data: StockData): number {
    const maxVolume = Math.max(...data.entries.slice(0, 10).map(e => e.volume));
    return maxVolume > 0 ? (entry.volume / maxVolume) * 100 : 0;
  }

  formatVolume(volume: number): string {
    if (volume >= 1_000_000) return (volume / 1_000_000).toFixed(1) + 'M';
    if (volume >= 1_000) return (volume / 1_000).toFixed(0) + 'K';
    return volume.toString();
  }
}

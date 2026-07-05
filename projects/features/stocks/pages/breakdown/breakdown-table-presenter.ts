import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { HttpClientData } from '@core';
import { LoadWrapperClientData } from '@shared';
import { StockData } from '../../models/stock.models';
import { StockPriceTable } from '../../components/stock-price-table';

@Component({
  selector: 'app-breakdown-table',
  imports: [LoadWrapperClientData, StockPriceTable],
  template: `
    <div class="panel card">
      <h3 class="panel__title">{{ title() }}</h3>

      <load-wrapper-client-data [source]="stockData()">
      
        <ng-template #content let-data>
          <stock-price-table [data]="data" [limit]="10" />
        </ng-template>

        <ng-template #error let-error="error" let-retry="retry">
          <div class="panel__error">
            <span>⚠️ Failed to load price data</span>
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

    @keyframes arc-cw { to { transform: rotate(360deg); } }
    @keyframes arc-ccw { to { transform: rotate(-360deg); } }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreakdownTablePresenter {
  stockData = input.required<HttpClientData<StockData>>();
  title = input<string>('Price Data');
  onLoadLocal = input<(() => void) | undefined>(undefined);
}

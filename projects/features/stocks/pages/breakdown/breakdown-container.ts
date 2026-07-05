import { Component, ChangeDetectionStrategy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ComponentBase, HttpClientData } from '@core';
import { StockData, parseMonthlyResponse } from '../../models/stock.models';
import { DataStreamService } from '../../service/data-stream.service';
import { BreakdownTablePresenter } from './breakdown-table-presenter';
import { BreakdownListPresenter } from './breakdown-list-presenter';

// Replace 'demo' with your own free Alpha Vantage API key from https://www.alphavantage.co/support/#api-key
// The 'demo' key has very limited rate limits. If the API fails, click "Use Local Data" to use generated data.
const API_BASE = 'https://www.alphavantage.co/query?function=TIME_SERIES_MONTHLY&apikey=demo';

@Component({
  selector: 'app-breakdown-container',
  imports: [BreakdownTablePresenter, BreakdownListPresenter],
  template: `
    <div class="breakdown">
      <div class="breakdown__header">
        <h2 class="breakdown__title">Stock Breakdown</h2>
        <div class="breakdown__filter">
          <button class="breakdown__filter-btn" (click)="goTo('summary')">Summary</button>
          <button class="breakdown__filter-btn breakdown__filter-btn--active" (click)="goTo('breakdown')">Breakdown</button>
        </div>
      </div>

      <div class="breakdown__grid">
        <app-breakdown-table [stockData]="stockDataPrimary" [onLoadLocal]="loadLocalPrimary" title="TSCO.LON — Price Data" />
        <app-breakdown-list [stockData]="stockDataSecondary" [onLoadLocal]="loadLocalSecondary" title="TSCO.LON — Volume Analysis" />
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; container-type: inline-size; container-name: breakdown; }

    .breakdown__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--space-lg);
      flex-wrap: wrap;
      gap: var(--space-md);
    }
    .breakdown__title {
      font-size: var(--text-2xl);
      font-weight: var(--weight-bold);
    }
    .breakdown__filter {
      display: flex;
      gap: var(--space-xs);
    }
    .breakdown__filter-btn {
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
    .breakdown__filter-btn:hover {
      background: var(--color-bg-muted);
      color: var(--color-text);
    }
    .breakdown__filter-btn--active {
      color: var(--color-primary);
      border-color: var(--color-primary);
      background: color-mix(in srgb, var(--color-primary) 10%, transparent);
    }

    .breakdown__grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-lg);
    }

    @container breakdown (max-width: 800px) {
      .breakdown__grid {
        grid-template-columns: 1fr;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreakdownContainer extends ComponentBase implements OnInit {
  private readonly router = inject(Router);
  private readonly dataStream = inject(DataStreamService);

  /** First data source — loads independently, shows its own loader */
  readonly stockDataPrimary = new HttpClientData<StockData>(this.injector, {
    url: `${API_BASE}&symbol=TSCO.LON`,
    parse: parseMonthlyResponse,
  });

  /** Second data source — same API but treated as separate load, shows its own loader */
  readonly stockDataSecondary = new HttpClientData<StockData>(this.injector, {
    url: `${API_BASE}&symbol=TSCO.LON`,
    parse: parseMonthlyResponse,
    delay: 300,
  });

  ngOnInit(): void {
    // Load both data sources — each will show its own spinner independently
    this.stockDataPrimary.load();
    this.stockDataSecondary.load();

    // Publish the current page info to the toolbar
    this.publish('stocks:symbol-changed', { symbol: 'TSCO.LON', page: 'Breakdown' });

    // Listen for toolbar refresh requests
    this.subscribe<{ action: string }>('toolbar:stocks-action', (msg) => {
      if (msg.action === 'refresh') {
        this.stockDataPrimary.reload();
        this.stockDataSecondary.reload();
      }
    });
  }

  readonly loadLocalPrimary = (): void => {
    this.stockDataPrimary.loadFrom(this.dataStream.generateLocalData('TSCO.LON'));
  };

  readonly loadLocalSecondary = (): void => {
    this.stockDataSecondary.loadFrom(this.dataStream.generateLocalData('TSCO.LON'));
  };

  goTo(page: string): void {
    let route = this.router.routerState.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    this.router.navigate(['../', page], { relativeTo: route });
  }
}

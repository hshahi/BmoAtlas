import { Component, ChangeDetectionStrategy, inject, Injector, OnInit } from '@angular/core';
import { ComponentBase, HttpClientData } from '@core';
import { StockData, parseMonthlyResponse } from '../../models/stock.models';
import { DataStreamService } from '../../service/data-stream.service';
import { SummaryPresenter } from './summary-presenter';

// Replace 'demo' with your own free Alpha Vantage API key from https://www.alphavantage.co/support/#api-key
// The 'demo' key has very limited rate limits. If the API fails, click "Use Local Data" to use generated data.
const API_URL = 'https://www.alphavantage.co/query?function=TIME_SERIES_MONTHLY&symbol=TSCO.LON&apikey=demo';

@Component({
  selector: 'app-summary-container',
  imports: [SummaryPresenter],
  template: `
    <app-summary-presenter [stockData]="stockData" [onLoadLocal]="loadLocal" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SummaryContainer extends ComponentBase implements OnInit {
  private readonly dataStream = inject(DataStreamService);

  readonly stockData = new HttpClientData<StockData>(this.injector, {
    url: API_URL,
    parse: parseMonthlyResponse,
  });

  ngOnInit(): void {
    this.stockData.load();

    // Publish the current symbol to the toolbar
    this.publish('stocks:symbol-changed', { symbol: 'TSCO.LON', page: 'Summary' });

    // Listen for toolbar refresh requests
    this.subscribe<{ action: string }>('toolbar:stocks-action', (msg) => {
      if (msg.action === 'refresh') {
        this.stockData.reload();
      }
    });
  }

  readonly loadLocal = (): void => {
    this.stockData.loadFrom(this.dataStream.generateLocalData('TSCO.LON'));
  };
}

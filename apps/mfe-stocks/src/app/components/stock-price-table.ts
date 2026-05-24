import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { StockData, StockEntry } from '../models/stock.models';

@Component({
  selector: 'stock-price-table',
  template: `
    <div class="table-wrapper">
      <table class="price-table">
        <thead>
          <tr>
            <th>Date</th>
            <th class="text-right">Open</th>
            <th class="text-right">Close</th>
            <th class="text-right">High</th>
            <th class="text-right">Low</th>
            <th class="text-right">Change</th>
          </tr>
        </thead>
        <tbody>
          @for (entry of visibleEntries(); track entry.date) {
            <tr>
              <td class="font-mono">{{ entry.date }}</td>
              <td class="text-right font-mono">{{ entry.open.toFixed(2) }}</td>
              <td class="text-right font-mono font-bold">{{ entry.close.toFixed(2) }}</td>
              <td class="text-right font-mono text-gain">{{ entry.high.toFixed(2) }}</td>
              <td class="text-right font-mono text-loss">{{ entry.low.toFixed(2) }}</td>
              <td class="text-right font-mono"
                  [class.text-gain]="entry.change >= 0"
                  [class.text-loss]="entry.change < 0">
                {{ entry.change >= 0 ? '+' : '' }}{{ entry.changePercent.toFixed(2) }}%
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .table-wrapper { overflow-x: auto; }
    .price-table {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--text-sm);
    }
    .price-table th {
      padding: var(--space-sm) var(--space-md);
      text-align: left;
      font-weight: var(--weight-semibold);
      color: var(--color-text-secondary);
      border-bottom: 2px solid var(--color-border);
      white-space: nowrap;
      font-size: var(--text-xs);
    }
    .price-table td {
      padding: var(--space-xs) var(--space-md);
      border-bottom: 1px solid var(--color-border);
      white-space: nowrap;
      font-size: var(--text-xs);
    }
    .price-table tbody tr:hover {
      background: var(--color-bg-muted);
    }

    .text-right { text-align: right; }
    .font-mono { font-family: var(--font-mono); }
    .font-bold { font-weight: var(--weight-bold); }
    .text-gain { color: var(--color-success, #16a34a); }
    .text-loss { color: var(--color-danger, #dc2626); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockPriceTable {
  /** The resolved stock data to render. */
  data = input.required<StockData>();

  /** Maximum number of rows to display (default: 10). */
  limit = input<number>(10);

  /** Sliced entries based on the limit. */
  visibleEntries(): StockEntry[] {
    return this.data().entries.slice(0, this.limit());
  }
}

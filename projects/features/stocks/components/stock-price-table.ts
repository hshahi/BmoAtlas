import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import type { ColDef, ValueFormatterParams, CellClassParams } from 'ag-grid-community';
import { StockData, StockEntry } from '../models/stock.models';

const money = (p: ValueFormatterParams<StockEntry, number>): string =>
  p.value == null ? '' : Number(p.value).toFixed(2);

const percent = (p: ValueFormatterParams<StockEntry, number>): string => {
  const v = p.value ?? 0;
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
};

const changeClass = (p: CellClassParams<StockEntry, number>): string =>
  `font-mono ${(p.value ?? 0) >= 0 ? 'text-gain' : 'text-loss'}`;

@Component({
  selector: 'stock-price-table',
  imports: [AgGridAngular],
  template: `
    <ag-grid-angular
      class="price-grid"
      [rowData]="visibleEntries()"
      [columnDefs]="columnDefs"
      [defaultColDef]="defaultColDef"
      [domLayout]="'autoHeight'"
    />
  `,
  styles: [`
    :host { display: block; }
    .price-grid { width: 100%; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockPriceTable {
  /** The resolved stock data to render. */
  data = input.required<StockData>();

  /** Maximum number of rows to display (default: 10). */
  limit = input<number>(10);

  protected readonly defaultColDef: ColDef<StockEntry> = {
    sortable: true,
    resizable: true,
    flex: 1,
    minWidth: 80,
  };

  protected readonly columnDefs: ColDef<StockEntry>[] = [
    { field: 'date', headerName: 'Date', minWidth: 110, cellClass: 'font-mono' },
    { field: 'open', headerName: 'Open', type: 'rightAligned', valueFormatter: money, cellClass: 'font-mono' },
    { field: 'close', headerName: 'Close', type: 'rightAligned', valueFormatter: money, cellClass: 'font-mono font-bold' },
    { field: 'high', headerName: 'High', type: 'rightAligned', valueFormatter: money, cellClass: 'font-mono text-gain' },
    { field: 'low', headerName: 'Low', type: 'rightAligned', valueFormatter: money, cellClass: 'font-mono text-loss' },
    { field: 'changePercent', headerName: 'Change', type: 'rightAligned', valueFormatter: percent, cellClass: changeClass },
  ];

  /** Sliced entries based on the limit. */
  visibleEntries(): StockEntry[] {
    return this.data().entries.slice(0, this.limit());
  }
}

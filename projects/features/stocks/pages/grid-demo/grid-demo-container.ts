import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  signal,
  effect,
  runInInjectionContext,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import type { ValueFormatterParams, ValueParserParams } from 'ag-grid-community';
import { ComponentBase, HttpClientData } from '@core';
import { DataGridPresenter, DataGridConfig, DataGridEditMode } from '@shared';

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

const money = (p: ValueFormatterParams<Position, number>): string =>
  p.value == null ? '' : Number(p.value).toFixed(2);

const toNumber = (p: ValueParserParams<Position, number>): number => Number(p.newValue) || 0;

/**
 * Demo container for the generic {@link DataGridPresenter}. Owns the paged list
 * and performs every CRUD/history action via {@link HttpClientData} (served by
 * the mock interceptor), then feeds rows + action callbacks to the presenter.
 */
@Component({
  selector: 'app-grid-demo-container',
  imports: [DataGridPresenter, MatButtonModule],
  template: `
    <div class="grid-demo">
      <div class="grid-demo__bar">
        <button matButton="outlined" (click)="toggleMode()">
          Editing: {{ editMode() === 'inline' ? 'Inline' : 'Popup' }} — switch to
          {{ editMode() === 'inline' ? 'Popup' : 'Inline' }}
        </button>
      </div>
      <app-data-grid-presenter
        [config]="config"
        [editMode]="editMode()"
        [rows]="rows()"
        [loading]="listLoading()"
        [onEdit]="onEdit"
        [onDelete]="onDelete"
        [onAdd]="onAdd"
        [onLoadMore]="onLoadMore"
        [historyLoader]="historyLoader"
      />
    </div>
  `,
  styles: [`
    .grid-demo { padding: var(--space-lg); }
    .grid-demo__bar { margin-bottom: var(--space-md); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GridDemoContainer extends ComponentBase implements OnInit {
  protected readonly rows = signal<Position[]>([]);
  protected readonly listLoading = signal(false);
  protected readonly editMode = signal<DataGridEditMode>('inline');

  protected toggleMode(): void {
    this.editMode.update(m => (m === 'inline' ? 'popup' : 'inline'));
  }

  private page = 0;
  private readonly pageSize = 20;
  private hasMore = true;
  private tmpSeq = 0;

  ngOnInit(): void {
    this.fetchNext();
    this.publish('stocks:symbol-changed', { symbol: 'Positions', page: 'Grid' });
  }

  // ── Presenter config ────────────────────────────────────────────
  protected readonly config: DataGridConfig<Position, PositionHistory> = {
    label: 'Positions',
    gridHeight: '520px',
    getRowKey: (r: Position) => r.id,
    features: {
      add: true, edit: true, delete: true, new: true,
      history: true, export: true, loadMore: true, filter: true, sort: true,
    },
    newRowFactory: (): Position => ({
      id: `TMP-${++this.tmpSeq}`,
      symbol: '',
      quantity: 0,
      price: 0,
      side: 'BUY',
      trader: 'you',
    }),
    columns: [
      { field: 'id', headerName: 'ID', editable: false, minWidth: 90, cellClass: 'font-mono' },
      { field: 'symbol', headerName: 'Symbol', minWidth: 100 },
      { field: 'side', headerName: 'Side', minWidth: 90 },
      { field: 'quantity', headerName: 'Qty', type: 'rightAligned', minWidth: 90, valueParser: toNumber },
      { field: 'price', headerName: 'Price', type: 'rightAligned', minWidth: 100, valueFormatter: money, valueParser: toNumber },
      { field: 'trader', headerName: 'Trader', minWidth: 120, editable: false },
    ],
    history: {
      title: 'Change history',
      columns: [
        { field: 'changedAt', headerName: 'When', minWidth: 190,
          valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleString() : '') },
        { field: 'field', headerName: 'Field', minWidth: 100 },
        { field: 'from', headerName: 'From', minWidth: 100 },
        { field: 'to', headerName: 'To', minWidth: 100 },
        { field: 'user', headerName: 'By', minWidth: 90 },
      ],
    },
    // Field descriptors for the popup edit form (Material controls + validation).
    editFields: [
      { key: 'symbol', label: 'Symbol', type: 'text', required: true },
      { key: 'side', label: 'Side', type: 'select', required: true,
        options: [{ value: 'BUY', label: 'Buy' }, { value: 'SELL', label: 'Sell' }] },
      { key: 'quantity', label: 'Quantity', type: 'number', required: true, min: 0 },
      { key: 'price', label: 'Price', type: 'number', required: true, min: 0, step: 0.01 },
      { key: 'trader', label: 'Trader', type: 'text' },
    ],
    confirmDelete: true,
  };

  // ── Action handlers (wired to HttpClientData) ───────────────────
  protected readonly onEdit = (row: Position): void => {
    const data = HttpClientData.put<Position, Position>(this.injector, {
      url: `/api/positions/${row.id}`,
      body: row,
    });
    this.onSettled(data, updated => {
      if (updated) this.rows.update(rs => rs.map(r => (r.id === updated.id ? updated : r)));
    });
    data.load();
  };

  protected readonly onDelete = (row: Position): void => {
    const data = new HttpClientData<{ id: string }>(this.injector, {
      url: `/api/positions/${row.id}`,
      method: 'DELETE',
    });
    this.onSettled(data, () => this.rows.update(rs => rs.filter(r => r.id !== row.id)));
    data.load();
  };

  protected readonly onAdd = (row: Position): void => {
    const data = HttpClientData.post<Position, Position>(this.injector, {
      url: '/api/positions',
      body: row,
    });
    this.onSettled(data, created => {
      if (created) this.rows.update(rs => [created, ...rs]);
    });
    data.load();
  };

  protected readonly onLoadMore = (): void => this.fetchNext();

  protected readonly historyLoader = (row: Position): HttpClientData<PositionHistory[]> =>
    HttpClientData.get<PositionHistory[]>(this.injector, {
      url: `/api/positions/${row.id}/history`,
    });

  // ── Paged list fetch (accumulating) ─────────────────────────────
  private fetchNext(): void {
    if (this.listLoading() || !this.hasMore) return;
    this.listLoading.set(true);

    const data = HttpClientData.get<Position[]>(this.injector, {
      url: '/api/positions',
      params: { page: this.page, pageSize: this.pageSize },
    });

    this.onSettled(
      data,
      items => {
        this.listLoading.set(false);
        const list = items ?? [];
        this.rows.update(rs => [...rs, ...list]);
        this.page++;
        if (list.length < this.pageSize) this.hasMore = false;
      },
      () => this.listLoading.set(false),
    );
    data.load();
  }

  /** Run `onOk`/`onErr` once when a one-shot HttpClientData request settles. */
  private onSettled<R>(
    data: HttpClientData<R>,
    onOk: (value: R | undefined) => void,
    onErr: () => void = () => {},
  ): void {
    runInInjectionContext(this.injector, () => {
      const ref = effect(() => {
        if (data.isSuccess()) {
          onOk(data.value());
          ref.destroy();
        } else if (data.isError()) {
          onErr();
          ref.destroy();
        }
      });
    });
  }
}

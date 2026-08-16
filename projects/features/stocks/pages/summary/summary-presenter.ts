import { Component, ChangeDetectionStrategy, input, inject, signal, computed, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import { AgGridAngular } from 'ag-grid-angular';
import type {
  ColDef,
  ValueFormatterParams,
  ValueGetterParams,
  ValueParserParams,
  EditableCallbackParams,
  CellClassParams,
  GridApi,
  GridReadyEvent,
  GetRowIdParams,
  IRowNode,
} from 'ag-grid-community';
import { HttpClientData } from '@core';
import {
  DialogService,
  DateCellEditor, DateFilter, DateFloatingFilter,
  formatDate, compareDatesByDay, DEFAULT_DATE_FORMAT,
} from '@shared';
import { StockData, StockEntry } from '../../models/stock.models';
import { SummaryActionCell, SummaryActionCellParams } from './summary-action-cell';
import { SummaryActionHeader, SummaryActionHeaderParams } from './summary-action-header';
import '@aejkatappaja/phantom-ui';

/** Date column display: dd-MMM-yyyy, with the pinned footer showing a label. */
const dateFmt = (p: ValueFormatterParams<StockEntry, Date>): string =>
  p.node?.rowPinned ? 'Avg / Total' : formatDate(p.value, DEFAULT_DATE_FORMAT);

/** A derived-date formatter (blank on the pinned footer / when empty). */
const derivedDateFmt = (fmt: string) => (p: ValueFormatterParams<StockEntry, Date>): string =>
  formatDate(p.value, fmt);

/** Add whole days to a date (used to derive the demo date columns). Null-safe. */
const addDays = (d: Date | null | undefined, n: number): Date | null =>
  d ? new Date(d.getFullYear(), d.getMonth(), d.getDate() + n) : null;

const dateValueGetter = (offset: number) =>
  (p: ValueGetterParams<StockEntry>): Date | null => addDays(p.data?.date, offset);

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

/** Keep edited numeric cells numeric; fall back to the old value on junk input. */
const numberParser = (p: ValueParserParams<StockEntry, number>): number => {
  const n = Number(p.newValue);
  return Number.isNaN(n) ? (p.oldValue ?? 0) : n;
};

@Component({
  selector: 'app-summary-presenter',
  imports: [AgGridAngular],
  // SummaryActionCell is referenced imperatively as an AG Grid cellRenderer (not in
  // the template), so it doesn't need to be listed in `imports`.
  template: `
    <div class="summary">
      <div class="summary__header">
        <h2 class="summary__title">Monthly Stock Summary</h2>
        <div class="summary__filter">
          <button class="summary__filter-btn summary__filter-btn--active" (click)="goTo('summary')">Summary</button>
          <button class="summary__filter-btn" (click)="goTo('breakdown')">Breakdown</button>
        </div>
      </div>

      <!-- Sections are rendered regardless of load state (data is empty until it
           resolves), and each section drives its own loader from isPending() — so
           the per-section loaders show on BOTH initial load and refresh. -->
      @if (stockData().isError()) {
        <div class="summary__error card">
          <span class="summary__error-icon">⚠️</span>
          <p>Failed to load stock data</p>
          <p class="summary__error-detail">{{ stockData().error() }}</p>
          <div class="summary__error-actions">
            <button class="btn" (click)="stockData().reload()">Retry</button>
            @if (onLoadLocal()) {
              <button class="btn btn--local" (click)="onLoadLocal()!()">Use Local Data</button>
            }
          </div>
        </div>
      } @else {
        <!-- Meta card — shimmer overlay -->
        <phantom-ui [attr.loading]="stockData().isPending() ? '' : null" animation="shimmer" mode="overlay">
          <div class="summary__meta card">
            <div class="summary__meta-item">
              <span class="summary__meta-label">Symbol</span>
              <span class="summary__meta-value">{{ data()?.meta?.symbol }}</span>
            </div>
            <div class="summary__meta-item">
              <span class="summary__meta-label">Last Refreshed</span>
              <span class="summary__meta-value">{{ data()?.meta?.lastRefreshed }}</span>
            </div>
            <div class="summary__meta-item">
              <span class="summary__meta-label">Time Zone</span>
              <span class="summary__meta-value">{{ data()?.meta?.timeZone }}</span>
            </div>
            <div class="summary__meta-item">
              <span class="summary__meta-label">Periods</span>
              <span class="summary__meta-value">{{ data()?.entries?.length }}</span>
            </div>
          </div>
        </phantom-ui>

        <!-- Toolbar — shimmer overlay -->
        <phantom-ui [attr.loading]="stockData().isPending() ? '' : null" animation="shimmer" mode="overlay">
          <div class="summary__toolbar">
            <input
              class="form-input summary__search"
              type="text"
              placeholder="Filter rows…"
              [value]="quickFilter()"
              (input)="onQuickFilter($event)"
              aria-label="Filter table rows"
            />
            <button class="btn summary__export" (click)="exportCsv()">⬇ Export CSV</button>
          </div>
        </phantom-ui>
        <!-- <atlas-loader [loading]="stockData().isPending()">
          <div class="summary__toolbar">
            <input
              class="form-input summary__search"
              type="text"
              placeholder="Filter rows…"
              [value]="quickFilter()"
              (input)="onQuickFilter($event)"
              aria-label="Filter table rows"
            />
            <button class="btn summary__export" (click)="exportCsv()">⬇ Export CSV</button>
          </div>
        </atlas-loader> -->

        <!-- Grid — atlas-loader spinner overlay. min-height (see styles) keeps the
             spinner visible on first load while the grid has no rows yet. -->
        <phantom-ui [attr.loading]="stockData().isPending() ? '' : null" animation="shimmer" mode="overlay">
             <ag-grid-angular
            class="summary__grid card"
            data-shimmer-no-children
            [rowData]="rows()"
            [columnDefs]="columnDefs"
            [defaultColDef]="defaultColDef"
            [pinnedBottomRowData]="pinnedRows()"
            [quickFilterText]="quickFilter()"
            [getRowId]="getRowId"
            [domLayout]="'autoHeight'"
            [singleClickEdit]="true"
            [stopEditingWhenCellsLoseFocus]="false"
            (gridReady)="onGridReady($event)"
          />
        </phantom-ui>
        <!-- <atlas-loader class="summary__grid-loader" [loading]="stockData().isPending()">
          <ag-grid-angular
            class="summary__grid card"
            [rowData]="rows()"
            [columnDefs]="columnDefs"
            [defaultColDef]="defaultColDef"
            [pinnedBottomRowData]="pinnedRows()"
            [quickFilterText]="quickFilter()"
            [getRowId]="getRowId"
            [domLayout]="'autoHeight'"
            (gridReady)="onGridReady($event)"
          />
        </atlas-loader> -->
      }
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

    /* The grid's loader wrapper. min-height keeps the loader visible on first load
       while the grid has no rows yet (empty autoHeight grid collapses). */
    .summary__grid-loader {
      display: block;
      margin-bottom: var(--space-lg);
      min-height: 16rem;
    }

    /* Meta card + toolbar are wrapped in <phantom-ui>; make the element a block so
       it doesn't collapse, and space the sections. position + overflow contain and
       clip phantom-ui's absolutely-positioned shimmer overlay. */
    phantom-ui {
      display: block;
      position: relative;
      overflow: hidden;
      margin-bottom: var(--space-lg);
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
  private readonly dialog = inject(DialogService);

  /** id of the row currently in an edit session (null = none). Drives which
   *  action icons show (edit/delete vs save/cancel) and which cells are editable. */
  private readonly editingKey = signal<string | null>(null);

  /** True when the current edit session is a freshly-added row (Cancel removes it
   *  instead of reverting). */
  private readonly editingIsNew = signal(false);

  /** Snapshot of a row's values when an *existing* row's edit session opens. */
  private editSnapshot: StockEntry | null = null;

  /** Monotonic counter for unique blank-row ids. */
  private newRowCounter = 0;

  /** A data cell is editable only while its own row is in an edit session — so
   *  editing is entered exclusively via the Edit button, never a stray click. */
  private readonly cellEditable = (p: EditableCallbackParams<StockEntry>): boolean =>
    !!p.data && !p.node?.rowPinned && this.editingKey() === p.data.id;

  /** Global quick-filter term (searches across all columns). */
  protected readonly quickFilter = signal('');

  /** Resolved data (undefined until it loads) — sections render regardless. */
  protected readonly data = computed(() => this.stockData().value());

  /** Grid rows — empty until data arrives. */
  protected readonly rows = computed<StockEntry[]>(() => this.data()?.entries.slice(0, 12) ?? []);

  /** Pinned footer row (avg/total), empty until data arrives. */
  protected readonly pinnedRows = computed<StockEntry[]>(() => {
    const d = this.data();
    return d ? this.summaryRow(d) : [];
  });

  private gridApi: GridApi<StockEntry> | null = null;

  protected readonly defaultColDef: ColDef<StockEntry> = {
    sortable: true,
    resizable: true,
    filter: true,
    floatingFilter: false,
    enableCellChangeFlash: true,
    flex: 1,
    minWidth: 80,
  };

  protected readonly columnDefs: ColDef<StockEntry>[] = [
    // Pinned-left action column: no header; per-row Edit/Delete (idle) or
    // Save/Cancel (while editing). Bespoke to this grid — see SummaryActionCell.
    {
      colId: '__actions',
      headerName: '',
      pinned: 'left',
      width: 92, minWidth: 92,
      sortable: false, filter: false, resizable: false, editable: false,
      suppressMovable: true, lockPosition: 'left',
      // Header holds the "New row" (+) button, above the first column.
      headerComponent: SummaryActionHeader,
      headerComponentParams: {
        onNew: () => this.insertNewRow(),
      } as Partial<SummaryActionHeaderParams>,
      cellRenderer: SummaryActionCell,
      cellRendererParams: {
        isEditing: (row: StockEntry) => this.editingKey() === row.id,
        onEdit: (row: StockEntry) => this.startEdit(row),
        onDelete: (row: StockEntry) => this.requestDelete(row),
        onSave: (row: StockEntry) => this.saveRow(row),
        onCancel: (row: StockEntry) => this.cancelRow(row),
      } as Partial<SummaryActionCellParams>,
    },

    {
      field: 'date', headerName: 'Date', minWidth: 185, cellClass: 'font-mono',
      valueFormatter: dateFmt,
      comparator: compareDatesByDay,
      // Editable only during an edit session (like the numeric cells): the Material
      // date-picker editor opens so a date can be selected, and it persists on Save.
      editable: this.cellEditable,
      cellEditor: DateCellEditor,
      cellEditorParams: { dateFormat: DEFAULT_DATE_FORMAT },
      // ① Live: selecting a date applies + closes the popup; Cancel clears + closes.
      filter: DateFilter,
      filterParams: { dateFormat: DEFAULT_DATE_FORMAT, buttons: ['cancel'], closeOnSelect: true },
      floatingFilter: false,
      floatingFilterComponent: DateFloatingFilter,
      floatingFilterComponentParams: { dateFormat: DEFAULT_DATE_FORMAT },
    },

    // ② Settlement — typed entry + Apply/Clear (buffered; no auto-open calendar).
    {
      colId: 'settlement', headerName: 'Settlement · type+Apply', minWidth: 190, cellClass: 'font-mono',
      valueGetter: dateValueGetter(2),
      valueFormatter: derivedDateFmt(DEFAULT_DATE_FORMAT),
      comparator: compareDatesByDay,
      filter: DateFilter,
      // Popup stays open while you type/pick; only Apply or Cancel closes it.
      filterParams: { dateFormat: DEFAULT_DATE_FORMAT, allowTyping: true, buttons: ['cancel', 'apply'] },
      floatingFilter: false,
      floatingFilterComponent: DateFloatingFilter,
      floatingFilterComponentParams: { dateFormat: DEFAULT_DATE_FORMAT },
    },

    // ③ Value Date — In-range by default, bounded by min/max, custom comparator.
    {
      colId: 'valueDate', headerName: 'Value Date · range+bounds', minWidth: 200, cellClass: 'font-mono',
      valueGetter: dateValueGetter(30),
      valueFormatter: derivedDateFmt(DEFAULT_DATE_FORMAT),
      comparator: compareDatesByDay,
      filter: DateFilter,
      filterParams: {
        dateFormat: DEFAULT_DATE_FORMAT,
        defaultCondition: 'inRange',
        min: new Date(2015, 0, 1),
        max: new Date(2030, 11, 31),
        comparator: (filterDate: Date, cellDate: Date) => compareDatesByDay(cellDate, filterDate),
        // Waits for the user: Apply commits, Cancel discards; either closes the popup.
        buttons: ['cancel', 'apply'],
      },
      floatingFilter: false,
      floatingFilterComponent: DateFloatingFilter,
      floatingFilterComponentParams: { dateFormat: DEFAULT_DATE_FORMAT },
    },

    // ④ Reported — two conditions with a Material AND/OR toggle + Apply/Clear.
    {
      colId: 'reported', headerName: 'Reported · AND/OR', minWidth: 190, cellClass: 'font-mono',
      valueGetter: dateValueGetter(-1),
      valueFormatter: derivedDateFmt(DEFAULT_DATE_FORMAT),
      comparator: compareDatesByDay,
      filter: DateFilter,
      filterParams: {
        dateFormat: DEFAULT_DATE_FORMAT,
        maxConditions: 2,
        defaultJoinOperator: 'OR',
        // Popup stays open until Apply or Cancel.
        buttons: ['cancel', 'apply'],
      },
      floatingFilter: false,
      floatingFilterComponent: DateFloatingFilter,
      floatingFilterComponentParams: { dateFormat: DEFAULT_DATE_FORMAT },
    },

    // ⑤ Ex-Div — per-column format (yyyy/MM/dd) + no floating filter (header funnel).
    {
      colId: 'exDiv', headerName: 'Ex-Div · yyyy/MM/dd · menu', minWidth: 180, cellClass: 'font-mono',
      valueGetter: dateValueGetter(15),
      valueFormatter: derivedDateFmt('yyyy/MM/dd'),
      comparator: compareDatesByDay,
      filter: DateFilter,
      filterParams: { dateFormat: 'yyyy/MM/dd', closeOnSelect: true },
      floatingFilter: false,
    },

    // Numeric OHLCV columns are editable during an edit session (agNumberCellEditor).
    { field: 'open', headerName: 'Open', type: 'rightAligned', valueFormatter: money, cellClass: 'font-mono', filter: 'agNumberColumnFilter', editable: this.cellEditable, cellEditor: 'agNumberCellEditor', valueParser: numberParser },
    { field: 'high', headerName: 'High', type: 'rightAligned', valueFormatter: money, cellClass: 'font-mono', filter: 'agNumberColumnFilter', editable: this.cellEditable, cellEditor: 'agNumberCellEditor', valueParser: numberParser },
    { field: 'low', headerName: 'Low', type: 'rightAligned', valueFormatter: money, cellClass: 'font-mono', filter: 'agNumberColumnFilter', editable: this.cellEditable, cellEditor: 'agNumberCellEditor', valueParser: numberParser },
    { field: 'close', headerName: 'Close', type: 'rightAligned', valueFormatter: money, cellClass: 'font-mono font-bold', filter: 'agNumberColumnFilter', editable: this.cellEditable, cellEditor: 'agNumberCellEditor', valueParser: numberParser },
    { field: 'volume', headerName: 'Volume', type: 'rightAligned', valueFormatter: volume, cellClass: 'font-mono', filter: 'agNumberColumnFilter', editable: this.cellEditable, cellEditor: 'agNumberCellEditor', valueParser: numberParser },
    // Change % is derived — left read-only.
    { field: 'changePercent', headerName: 'Change', type: 'rightAligned', valueFormatter: percent, cellClass: changeClass, filter: 'agNumberColumnFilter' },
  ];

  /** Stable row identity so refreshed data flashes changed cells (not full re-render). */
  protected readonly getRowId = (p: GetRowIdParams<StockEntry>): string => p.data.id;

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
        // No date on the footer — the column's valueFormatter labels it 'Avg / Total'.
        id: 'summary',
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

  // ── Row edit session (Edit → Save/Cancel), mirroring the data-grid feature ──
  // Editing is a session: the Edit button opens it (a snapshot is taken, the row's
  // numeric cells become editable, the first opens for editing, icons switch to
  // Save/Cancel). It ends only on Save (commit) or Cancel (restore snapshot).
  // Mutations are local to the grid — this feed is a read-only GET.

  /** New — insert a blank row at the top and open its edit session on the date. */
  private insertNewRow(): void {
    const api = this.gridApi;
    if (!api || this.editingKey() !== null) return; // one session at a time

    const row = new StockEntry({ id: `__new-${++this.newRowCounter}`, date: null });
    api.applyTransaction({ add: [row], addIndex: 0 });

    this.editingKey.set(row.id);
    this.editingIsNew.set(true);
    this.editSnapshot = null;

    const node = api.getRowNode(row.id);
    if (node) this.refreshActions(node);
    this.beginEditingCell(node?.rowIndex ?? 0, 'date');
  }

  private startEdit(row: StockEntry): void {
    const api = this.gridApi;
    if (!api) return;

    this.editingKey.set(row.id);
    this.editingIsNew.set(false);
    this.editSnapshot = { ...row } as StockEntry;

    const node = api.getRowNode(row.id);
    if (node) this.refreshActions(node);
    this.beginEditingCell(node?.rowIndex ?? null, 'open');
  }

  /**
   * Open a cell editor on the next tick. Deferring matters because edits are
   * triggered from icon-button clicks: starting synchronously opens the editor,
   * then focus returns to the button and `stopEditingWhenCellsLoseFocus` closes
   * it. Running after the click settles lets the editor keep focus — and lets the
   * `editable` callback re-evaluate now that the session is open.
   */
  private beginEditingCell(rowIndex: number | null, colKey: string): void {
    if (rowIndex == null) return;
    setTimeout(() => {
      const api = this.gridApi;
      if (!api) return;
      api.ensureIndexVisible(rowIndex);
      api.setFocusedCell(rowIndex, colKey);
      api.startEditingCell({ rowIndex, colKey });
    });
  }

  /** Save — commit the open editor into the row and close the session. */
  private saveRow(row: StockEntry): void {
    const api = this.gridApi;
    if (!api) return;
    api.stopEditing(false); // commit the editor's value into the node
    this.endEditSession(api.getRowNode(row.id));
  }

  /** Cancel — a new row is removed; an existing row reverts to its snapshot. */
  private cancelRow(row: StockEntry): void {
    const api = this.gridApi;
    if (!api) return;
    api.stopEditing(true); // cancel the open editor

    if (this.editingIsNew()) {
      api.applyTransaction({ remove: [row] });
      this.endEditSession(undefined);
      return;
    }

    const node = api.getRowNode(row.id);
    // Clicking Cancel may have already committed the open editor, and tabbing
    // across cells commits each — so an explicit snapshot restore is what reverts.
    if (node && this.editSnapshot) node.setData(this.editSnapshot);
    this.endEditSession(node);
  }

  private endEditSession(node: IRowNode<StockEntry> | undefined): void {
    this.editingKey.set(null);
    this.editingIsNew.set(false);
    this.editSnapshot = null;
    if (node) this.refreshActions(node);
  }

  /** Re-render one row's action cell so it reflects the idle/editing state. */
  private refreshActions(node: IRowNode<StockEntry>): void {
    this.gridApi?.refreshCells({ rowNodes: [node], columns: ['__actions'], force: true });
  }

  /** Delete — confirm, then remove the row locally. */
  private async requestDelete(row: StockEntry): Promise<void> {
    const ok = await this.dialog.confirm({
      title: 'Delete row',
      message: 'Are you sure you want to delete this row? This action cannot be undone.',
      confirmText: 'Delete',
      danger: true,
    });
    if (ok) this.gridApi?.applyTransaction({ remove: [row] });
  }

  protected onQuickFilter(event: Event): void {
    this.quickFilter.set((event.target as HTMLInputElement).value);
  }

  protected exportCsv(): void {
    this.gridApi?.exportDataAsCsv({
      fileName: `${this.data()?.meta.symbol || 'stock'}-summary.csv`,
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

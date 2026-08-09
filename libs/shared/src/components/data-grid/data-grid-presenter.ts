import {
  Component,
  ChangeDetectionStrategy,
  input,
  inject,
  signal,
  computed,
} from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { MatDialog } from '@angular/material/dialog';
import type {
  ColDef,
  GridApi,
  GridReadyEvent,
  GetRowIdParams,
  CellEditingStartedEvent,
  IRowNode,
  BodyScrollEndEvent,
} from 'ag-grid-community';
import { HttpClientData } from '@core';

import { AtlasLoader } from '../atlas-loader/atlas-loader';
import {
  DataGridConfig,
  DataGridFeatures,
  DataGridEditMode,
  DataGridFieldConfig,
  MaybeNewRow,
  NEW_ROW,
} from './data-grid.types';
import { ActionCell, ActionCellParams } from './renderers/action-cell';
import { ActionHeader, ActionHeaderParams } from './renderers/action-header';
import { HistoryDialog, HistoryDialogData } from './history-dialog/history-dialog';
import { EditFormDialog, EditFormDialogData } from './edit-form-dialog/edit-form-dialog';
import { ConfirmDialog } from '../dialog/confirm-dialog/confirm-dialog';
import type { ConfirmDialogData } from '../dialog/dialog.types';

/**
 * Generic, reusable AG Grid presenter (container/presenter). Renders any row type
 * from a {@link DataGridConfig}: variable columns, sort/filter, inline editing, a
 * pinned-left action column (per-row history/edit; header cell holds export/new),
 * a history popup, and scroll-to-end "load more".
 *
 * The presenter owns NO data. The container fetches rows and performs every
 * mutation via `HttpData`, passing the results back through the `rows` input and
 * the action callbacks (`onEdit`, `onDelete`, `onAdd`, `onLoadMore`,
 * `historyLoader`). This mirrors the existing `[onLoadLocal]` convention.
 */
@Component({
  selector: 'app-data-grid-presenter',
  imports: [AgGridAngular, AtlasLoader],
  template: `
    <div class="data-grid">
      @if (config().label) {
        <div class="data-grid__label">{{ config().label }}</div>
      }

      <atlas-loader [loading]="loading()">
        <ag-grid-angular
          class="data-grid__grid"
          [style.height]="gridHeight()"
          [rowData]="rows()"
          [columnDefs]="effectiveColumnDefs()"
          [defaultColDef]="defaultColDef()"
          [getRowId]="getRowId"
          [stopEditingWhenCellsLoseFocus]="false"
          (gridReady)="onGridReady($event)"
          (cellEditingStarted)="onCellEditingStarted($event)"
          (bodyScrollEnd)="onBodyScrollEnd($event)"
        />
      </atlas-loader>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .data-grid { display: block; width: 100%; }
    .data-grid__label {
      font-size: var(--text-lg);
      font-weight: var(--weight-semibold);
      color: var(--color-text);
      margin-bottom: var(--space-sm);
    }
    .data-grid__grid { display: block; width: 100%; }
    atlas-loader { display: block; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataGridPresenter<T = any, H = any> {
  private readonly dialog = inject(MatDialog);

  readonly config = input.required<DataGridConfig<T, H>>();
  readonly rows = input.required<T[]>();
  readonly loading = input<boolean>(false);
  /** 'inline' edits in the grid; 'popup' opens the generic Material form dialog. */
  readonly editMode = input<DataGridEditMode>('inline');

  // Action handlers — the container wires these to HttpData calls.
  readonly onEdit = input<(row: T) => void>();
  readonly onDelete = input<(row: T) => void>();
  readonly onAdd = input<(row: T) => void>();
  readonly onLoadMore = input<() => void>();
  readonly historyLoader = input<(row: T) => HttpClientData<H[]>>();

  private gridApi: GridApi<T> | null = null;

  /** True while an unsaved "new" row is being edited (pauses load-more). */
  private readonly editingNew = signal(false);

  /** Key of the existing row currently in edit mode (drives save/cancel icons). */
  private readonly editingKey = signal<string | null>(null);

  protected readonly features = computed<DataGridFeatures>(() => this.config().features ?? {});
  protected readonly gridHeight = computed(() => this.config().gridHeight ?? '480px');

  /** Fields for the popup form — explicit config, or derived from editable columns. */
  private readonly editFieldList = computed<DataGridFieldConfig[]>(() => {
    const cfg = this.config();
    if (cfg.editFields?.length) return cfg.editFields;
    return cfg.columns
      .filter(c => c.editable !== false && (c.colId ?? c.field))
      .map(c => ({
        key: (c.colId ?? c.field) as string,
        label: c.headerName ?? ((c.field as string | undefined) ?? ''),
        type: 'text' as const,
      }));
  });

  protected readonly defaultColDef = computed<ColDef<T>>(() => {
    const f = this.features();
    return {
      resizable: true,
      sortable: f.sort ?? true,
      filter: f.filter ?? true,
      floatingFilter: f.filter ?? true,
      editable: f.edit ?? false,
      enableCellChangeFlash: true,
      flex: 1,
      minWidth: 80,
    };
  });

  /** Data columns with the pinned action column prepended. */
  protected readonly effectiveColumnDefs = computed<ColDef<T>[]>(() => {
    const cfg = this.config();
    const f = this.features();

    const actionCol: ColDef<T> = {
      colId: '__actions',
      pinned: 'left',
      width: 104,
      minWidth: 104,
      resizable: false,
      sortable: false,
      filter: false,
      editable: false,
      suppressMovable: true,
      lockPosition: 'left',
      headerComponent: ActionHeader,
      headerComponentParams: {
        features: f,
        onExport: () => this.exportCsv(),
        onNew: () => this.insertNewRow(),
      } as Partial<ActionHeaderParams<T>>,
      cellRenderer: ActionCell,
      cellRendererParams: {
        features: f,
        isNew: (row: T) => this.isNewRow(row),
        isEditing: (row: T) => this.editingKey() === cfg.getRowKey(row),
        onHistory: (row: T) => this.openHistory(row),
        onEdit: (row: T) => this.startEdit(row),
        onDelete: (row: T) => this.requestDelete(row),
        onSave: (row: T) => this.saveRow(row),
        onCancel: (row: T) => this.cancelRow(row),
      } as Partial<ActionCellParams<T>>,
    };

    return [actionCol, ...cfg.columns];
  });

  /** Stable identity so refreshed data flashes changed cells instead of re-rendering. */
  protected readonly getRowId = (p: GetRowIdParams<T>): string => this.config().getRowKey(p.data);

  protected onGridReady(event: GridReadyEvent<T>): void {
    this.gridApi = event.api;
  }

  // ── Inline editing (controlled row-edit session) ────────────────
  // Editing an existing row is a session: the first cell edit opens the session
  // (save/cancel icons appear, a snapshot is taken), and it ends ONLY when the
  // user clicks Save (commit → PUT) or Cancel (restore snapshot → no PUT). We
  // don't auto-PUT on cell commit, because clicking an action button commits the
  // open editor as a side effect — we don't want that to persist on Cancel.

  /** Snapshot of the row's original data, captured when its edit session opens. */
  private editSnapshot: MaybeNewRow<T> | null = null;

  /** A row's cell entered edit mode → open the session (once) for existing rows. */
  protected onCellEditingStarted(event: CellEditingStartedEvent<T>): void {
    const row = event.data;
    if (!row || this.isNewRow(row)) return;
    const key = this.config().getRowKey(row);
    if (this.editingKey() !== key) {
      this.editingKey.set(key);
      this.editSnapshot = { ...(row as MaybeNewRow<T>) };
      this.refreshActions(event.node);
    }
  }

  /** Re-render a single row's action cell so it reflects the new/editing state. */
  private refreshActions(node: IRowNode<T>): void {
    this.gridApi?.refreshCells({ rowNodes: [node], columns: ['__actions'], force: true });
  }

  private startEdit(row: T): void {
    if (this.editMode() === 'popup') {
      this.openEditForm(row, false);
      return;
    }
    const api = this.gridApi;
    const col = this.firstEditableColId();
    if (!api || !col) return;
    const node = api.getRowNode(this.config().getRowKey(row));
    if (node?.rowIndex != null) {
      this.beginEdit(node.rowIndex, col);
    }
  }

  /**
   * Open a cell editor on the next tick. Deferring matters because these edits
   * are triggered from icon-button clicks: if we start editing synchronously the
   * editor opens but focus then returns to the button, and
   * `stopEditingWhenCellsLoseFocus` closes it immediately. Running after the
   * click settles lets the editor take and keep focus.
   */
  private beginEdit(rowIndex: number, colKey: string): void {
    setTimeout(() => {
      const api = this.gridApi;
      if (!api) return;
      api.ensureIndexVisible(rowIndex);
      api.setFocusedCell(rowIndex, colKey);
      api.startEditingCell({ rowIndex, colKey });
    });
  }

  // ── New row (inline: insert blank → save/cancel; popup: open form) ──
  private insertNewRow(): void {
    const factory = this.config().newRowFactory;
    if (!factory) return;

    if (this.editMode() === 'popup') {
      this.openEditForm(factory(), true);
      return;
    }

    const api = this.gridApi;
    if (!api) return;

    const row = { ...factory(), [NEW_ROW]: true } as MaybeNewRow<T>;
    api.applyTransaction({ add: [row as T], addIndex: 0 });
    this.editingNew.set(true);

    const col = this.firstEditableColId();
    if (col) {
      this.beginEdit(0, col);
    }
  }

  // ── Popup edit / new (generic signal-forms Material dialog) ─────
  private openEditForm(value: T, isNew: boolean): void {
    const ref = this.dialog.open<
      EditFormDialog<Record<string, unknown>>,
      EditFormDialogData<Record<string, unknown>>,
      Record<string, unknown>
    >(EditFormDialog, {
      width: '420px',
      maxWidth: '92vw',
      data: {
        title: isNew ? 'New record' : 'Edit record',
        fields: this.editFieldList(),
        value: { ...(value as Record<string, unknown>) },
      },
    });

    ref.afterClosed().subscribe(result => {
      if (!result) return;
      const clean = { ...result } as MaybeNewRow<T>;
      delete clean[NEW_ROW];
      if (isNew) {
        this.onAdd()?.(clean as T);
      } else {
        this.onEdit()?.(clean as T);
      }
    });
  }

  // ── Delete (with optional confirmation popup) ───────────────────
  private requestDelete(row: T): void {
    const confirm = this.config().confirmDelete ?? true;
    if (!confirm) {
      this.onDelete()?.(row);
      return;
    }

    const ref = this.dialog.open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
      data: {
        title: 'Delete row',
        message: 'Are you sure you want to delete this row? This action cannot be undone.',
        confirmText: 'Delete',
        danger: true,
      },
    });

    ref.afterClosed().subscribe(ok => {
      if (ok) this.onDelete()?.(row);
    });
  }

  /** Commit — save a new row (POST) or the current edit (PUT). */
  private saveRow(row: T): void {
    const api = this.gridApi;
    if (!api) return;
    const key = this.config().getRowKey(row);

    // Commit the open editor's value into the node's data.
    api.stopEditing(false);

    const node = api.getRowNode(key);
    const data = { ...((node?.data ?? row) as MaybeNewRow<T>) };

    if (this.isNewRow(data)) {
      delete data[NEW_ROW];
      api.applyTransaction({ remove: [node?.data ?? row] });
      this.editingNew.set(false);
      this.onAdd()?.(data as T); // container POSTs and appends the saved row
    } else {
      this.endEditSession(node);
      this.onEdit()?.(data as T); // container PUTs the committed row
    }
  }

  /** Discard — remove a new row or revert the current edit to its snapshot. */
  private cancelRow(row: T): void {
    const api = this.gridApi;
    if (!api) return;

    if (this.isNewRow(row)) {
      api.stopEditing(true);
      api.applyTransaction({ remove: [row] });
      this.editingNew.set(false);
      return;
    }

    api.stopEditing(true);
    const node = api.getRowNode(this.config().getRowKey(row));
    // Restore the original values — clicking Cancel may have already committed the
    // open editor, so an explicit snapshot restore is what actually reverts.
    if (node && this.editSnapshot) {
      node.setData(this.editSnapshot as T);
    }
    this.endEditSession(node);
  }

  /** Close the edit session and restore the idle action icons for the row. */
  private endEditSession(node: IRowNode<T> | undefined): void {
    this.editingKey.set(null);
    this.editSnapshot = null;
    if (node) this.refreshActions(node);
  }

  // ── Export ──────────────────────────────────────────────────────
  private exportCsv(): void {
    const name = this.config().label?.trim() || 'data-grid';
    this.gridApi?.exportDataAsCsv({ fileName: `${name}.csv` });
  }

  // ── History popup ───────────────────────────────────────────────
  private openHistory(row: T): void {
    const loader = this.historyLoader();
    const cfg = this.config().history;
    if (!loader || !cfg) return;

    const source = loader(row);
    source.load();

    // No fixed width — the dialog auto-fits the grid (which sizes to its columns).
    // Cap at the viewport so a wide, many-column grid can't overflow the screen.
    this.dialog.open<HistoryDialog<H>, HistoryDialogData<H>>(HistoryDialog, {
      maxWidth: '92vw',
      data: { title: cfg.title ?? 'History', columns: cfg.columns, source },
    });
  }

  // ── Load more (client-side append on scroll-to-end) ─────────────
  protected onBodyScrollEnd(event: BodyScrollEndEvent<T>): void {
    if (event.direction !== 'vertical') return;
    const f = this.features();
    const api = this.gridApi;
    if (!f.loadMore || this.loading() || this.editingNew() || this.editingKey() !== null || !api) return;

    const total = api.getDisplayedRowCount();
    const last = api.getLastDisplayedRowIndex();
    if (total > 0 && last >= total - 5) {
      this.onLoadMore()?.();
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────
  private isNewRow(row: T): boolean {
    return !!(row as MaybeNewRow<T>)[NEW_ROW];
  }

  private firstEditableColId(): string | undefined {
    const col = this.config().columns.find(c => c.editable !== false);
    return col?.colId ?? (col?.field as string | undefined);
  }
}

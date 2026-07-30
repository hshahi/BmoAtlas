import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { AgGridAngular } from 'ag-grid-angular';
import type { ColDef } from 'ag-grid-community';
import { HttpClientData } from '@core';

/** Data handed to the history dialog when it is opened. */
export interface HistoryDialogData<H> {
  title: string;
  columns: ColDef<H>[];
  /** Source owned by the container; already `.load()`-ed by the presenter. */
  source: HttpClientData<H[]>;
  /** Fixed grid height (the dialog height follows this). Default '360px'. */
  height?: string;
}

/** Fallback width used when a column defines neither width nor minWidth. */
const DEFAULT_COL_WIDTH = 150;
/** Allowance for the vertical scrollbar + borders so the last column isn't clipped. */
const SCROLLBAR_ALLOWANCE = 18;

/**
 * Read-only popup grid showing the change-history of a row. Sorting and filtering
 * are intentionally disabled and the only action is Close.
 *
 * The grid height is fixed (scrolls internally); its width is derived from the
 * column definitions so the dialog auto-fits however many columns are passed —
 * generic for tables with few or many columns.
 */
@Component({
  selector: 'app-data-grid-history-dialog',
  imports: [MatDialogModule, MatButtonModule, AgGridAngular],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>

    <mat-dialog-content>
      <!-- Reserve the final grid footprint (width from columns, fixed height) for
           every state, so the dialog opens at its final size and never resizes /
           reflows when the data arrives — the open stays smooth. -->
      <div class="history-frame" [style.width]="frameWidth()" [style.height]="gridHeight">
        @if (source.isError()) {
          <p class="msg msg--error">⚠️ Failed to load history.</p>
        } @else if (source.isPending() && rows().length === 0) {
          <p class="msg">Loading history…</p>
        } @else if (rows().length === 0) {
          <p class="msg">No history recorded for this row.</p>
        } @else {
          <ag-grid-angular
            class="history-grid"
            [rowData]="rows()"
            [columnDefs]="columns()"
            [defaultColDef]="defaultColDef"
            [suppressCellFocus]="true"
          />
        }
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button matButton="outlined" mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host { display: block; }
    /* Stable footprint across loading / empty / content states → no reflow on open. */
    .history-frame { display: grid; place-items: center; }
    .history-grid { display: block; width: 100%; height: 100%; }
    .msg { padding: var(--space-lg); color: var(--color-text-secondary); text-align: center; }
    .msg--error { color: var(--color-danger); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryDialog<H> {
  protected readonly data = inject<HistoryDialogData<H>>(MAT_DIALOG_DATA);
  protected readonly source = this.data.source;

  /** Fixed grid height — the dialog height follows this. */
  protected readonly gridHeight = this.data.height ?? '360px';

  protected readonly rows = computed<H[]>(() => this.source.value() ?? []);

  /** Read-only: no sort, no filter. Each column keeps an explicit width (no flex)
      so the grid's natural width is the sum of columns. */
  protected readonly columns = computed<ColDef<H>[]>(() =>
    this.data.columns.map(c => ({
      ...c,
      width: c.width ?? c.minWidth ?? DEFAULT_COL_WIDTH,
      flex: undefined,
    })),
  );

  /** Natural grid width = sum of column widths (+ scrollbar allowance). */
  protected readonly gridWidth = computed<number>(() =>
    this.columns().reduce((sum, c) => sum + (c.width ?? DEFAULT_COL_WIDTH), 0) + SCROLLBAR_ALLOWANCE,
  );

  /**
   * Width the dialog reserves: the grid's natural width, but capped at the
   * viewport (`min(…, 88vw)`) so a wide, many-column table doesn't overflow the
   * screen — instead the grid (fixed column widths, no flex) scrolls
   * horizontally inside the capped frame. Few columns → narrow dialog.
   */
  protected readonly frameWidth = computed<string>(() => `min(${this.gridWidth()}px, 88vw)`);

  protected readonly defaultColDef: ColDef<H> = {
    sortable: false,
    filter: false,
    resizable: true,
    editable: false,
  };
}

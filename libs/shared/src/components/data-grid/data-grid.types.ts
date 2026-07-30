import type { ColDef } from 'ag-grid-community';

/**
 * Transient flag written onto a row while it is a freshly-inserted, not-yet-saved
 * "new" row. The action cell renders save/cancel icons for such rows instead of
 * history/edit, and the presenter strips the flag when the row is committed.
 */
export const NEW_ROW = '__isNew' as const;

/** A row that may carry the transient new-row flag. */
export type MaybeNewRow<T> = T & { [NEW_ROW]?: boolean };

/** Which capabilities the grid exposes. All optional; sort/filter default to true. */
export interface DataGridFeatures {
  /** Allow committing a new inline row (POST). */
  add?: boolean;
  /** Inline cell editing (PUT/PATCH). */
  edit?: boolean;
  /** Per-row delete (DELETE). */
  delete?: boolean;
  /** Insert a blank editable row from the header "+" icon. */
  new?: boolean;
  /** Per-row history icon that opens the history popup. */
  history?: boolean;
  /** Export-to-CSV icon in the header. */
  export?: boolean;
  /** Fetch + append the next page when scrolled near the bottom. */
  loadMore?: boolean;
  /** Column filtering (default true). */
  filter?: boolean;
  /** Column sorting (default true). */
  sort?: boolean;
}

/** Configuration for the history popup grid. */
export interface DataGridHistoryConfig<H> {
  /** Columns for the read-only history grid (no sort/filter is applied). */
  columns: ColDef<H>[];
  /** Optional dialog title. */
  title?: string;
}

/**
 * Everything the generic {@link DataGridPresenter} needs to render. The action
 * column (pinned-left, header-less body with history/edit icons; header cell with
 * export/new icons) is prepended automatically — supply only your data columns.
 */
export interface DataGridConfig<T, H = unknown> {
  /** Optional label shown in the header area. */
  label?: string;
  /** Data columns (the action column is added automatically). */
  columns: ColDef<T>[];
  /** Stable row identity — used for cell-change flash, delete and new-row tracking. */
  getRowKey: (row: T) => string;
  /** Capability toggles. */
  features?: DataGridFeatures;
  /** Factory for a blank row used by the "new" action. */
  newRowFactory?: () => T;
  /** History popup configuration (required when features.history is on). */
  history?: DataGridHistoryConfig<H>;
  /** Bounded grid height (must NOT be autoHeight for load-more to work). Default '480px'. */
  gridHeight?: string;
}

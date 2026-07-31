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

/** How add/edit are performed. */
export type DataGridEditMode = 'inline' | 'popup';

/** Control type rendered for a field in the popup edit form. */
export type DataGridFieldType = 'text' | 'number' | 'textarea' | 'select' | 'checkbox' | 'date';

/** An option for a select field. */
export interface DataGridSelectOption {
  value: unknown;
  label: string;
}

/**
 * Describes one editable property for the generic popup form. The form renders a
 * matching Angular Material control per `type` and adjusts to however many fields
 * are supplied.
 */
export interface DataGridFieldConfig {
  /** Property name on the row. */
  key: string;
  /** Field label. */
  label: string;
  /** Material control to render (default 'text'). */
  type?: DataGridFieldType;
  /** Options for `type: 'select'`. */
  options?: DataGridSelectOption[];
  /** Mark the field required (signal-forms validator). */
  required?: boolean;
  /** Min / max / step for `type: 'number'`. */
  min?: number;
  max?: number;
  step?: number;
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
  /**
   * Field descriptors for the popup edit form (add/edit). If omitted, the form
   * falls back to the editable columns rendered as text inputs.
   */
  editFields?: DataGridFieldConfig[];
  /** Show a confirmation popup before delete. Default true. */
  confirmDelete?: boolean;
}

// Components
export { ErrorToast } from './components/error-toast/error-toast';
export { LoadWrapper } from './components/load-wrapper/load-wrapper';
export type { ContentContext, ErrorContext, ReloadingContext, IdleContext } from './components/load-wrapper/load-wrapper';
export { LoadWrapperClientData } from './components/load-wrapper-client-data/load-wrapper-client-data';
export type {
  ContentContext as ClientDataContentContext,
  ErrorContext as ClientDataErrorContext,
  ReloadingContext as ClientDataReloadingContext,
  IdleContext as ClientDataIdleContext,
} from './components/load-wrapper-client-data/load-wrapper-client-data';
export { AtlasLoader } from './components/atlas-loader/atlas-loader';

// Reusable dialogs (confirm / warning / signal-form) + service
export { DialogService } from './components/dialog/dialog.service';
export { ConfirmDialog } from './components/dialog/confirm-dialog/confirm-dialog';
export { WarningDialog } from './components/dialog/warning-dialog/warning-dialog';
export { FormDialog } from './components/dialog/form-dialog/form-dialog';
export { DEFAULT_FORM_BUTTONS } from './components/dialog/dialog.types';
export type {
  ConfirmDialogData,
  WarningDialogData,
  DialogButton,
  DialogButtonRole,
  SignalForm,
  FormDialogContent,
  FormDialogConfig,
} from './components/dialog/dialog.types';

// Generic data grid (container/presenter)
export { DataGridPresenter } from './components/data-grid/data-grid-presenter';
export { HistoryDialog } from './components/data-grid/history-dialog/history-dialog';
export { EditFormDialog } from './components/data-grid/edit-form-dialog/edit-form-dialog';
export { ActionCell } from './components/data-grid/renderers/action-cell';
export { ActionHeader } from './components/data-grid/renderers/action-header';
export { NEW_ROW } from './components/data-grid/data-grid.types';
export type {
  DataGridConfig,
  DataGridFeatures,
  DataGridHistoryConfig,
  DataGridEditMode,
  DataGridFieldConfig,
  DataGridFieldType,
  DataGridSelectOption,
  MaybeNewRow,
} from './components/data-grid/data-grid.types';
export type { HistoryDialogData } from './components/data-grid/history-dialog/history-dialog';
export type { EditFormDialogData } from './components/data-grid/edit-form-dialog/edit-form-dialog';

// Services
export { ErrorService } from './services/error/error.service';
export type { AppError } from './services/error/error.service';
export { ThemeService, THEMES, THEME_LABELS } from './services/theme/theme.service';
export type { Theme } from './services/theme/theme.service';

// Interceptors
export { errorInterceptor } from './interceptors/error.interceptor';
export { mockApiInterceptor } from './interceptors/mock-api.interceptor';

// Handlers
export { GlobalErrorHandler } from './handlers/global-error.handler';

// AG Grid
export { atlasGridTheme, registerAtlasGrid } from './ag-grid/atlas-grid';

// AG Grid — Material date components (Luxon adapter)
export { DateCellEditor } from './ag-grid/date/date-cell-editor';
export { DateFilter } from './ag-grid/date/date-filter';
export { DateFloatingFilter } from './ag-grid/date/date-floating-filter';
export {
  DEFAULT_DATE_FORMAT,
  buildLuxonFormats,
  applyDateFormat,
  toDateTime,
  toJsDate,
  formatDate,
  compareDatesByDay,
  toModelString,
  fromModelString,
} from './ag-grid/date/date-support';
export type { DateFilterModel } from './ag-grid/date/date-support';
export type { DateCellEditorParams } from './ag-grid/date/date-cell-editor';
export type { DateFilterParams, DateFilterComparator } from './ag-grid/date/date-filter';
export type { DateFloatingFilterParams } from './ag-grid/date/date-floating-filter';

import type { Type } from '@angular/core';

// ── Confirm ─────────────────────────────────────────────────────
export interface ConfirmDialogData {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  /** Style the confirm button as destructive. */
  danger?: boolean;
}

// ── Warning ─────────────────────────────────────────────────────
export interface WarningDialogData {
  title?: string;
  message: string;
  okText?: string;
}

// ── Form ────────────────────────────────────────────────────────
export type DialogButtonRole = 'save' | 'cancel' | 'custom';

export interface DialogButton {
  label: string;
  role: DialogButtonRole;
  /** For `role: 'custom'` — the value the dialog resolves with when clicked. */
  value?: unknown;
}

/**
 * Minimal structural view of an Angular signal-form tree (`FieldTree`): call it to
 * read the root field state's value / validity. Kept structural so the dialog
 * doesn't depend on signal-forms' internal types.
 */
export type SignalForm<T> = () => { value(): T; valid(): boolean; invalid(): boolean };

/** Contract a component must implement to be hosted inside the form dialog. */
export interface FormDialogContent<T = unknown> {
  /** The component's Angular signal form; the dialog reads validity + value from it. */
  readonly form: SignalForm<T>;
}

/** Config passed to {@link DialogService.openForm}. */
export interface FormDialogConfig<T, C extends FormDialogContent<T> = FormDialogContent<T>> {
  /** The form component to host (built lazily, destroyed on close). */
  component: Type<C>;
  /** Draggable header title. */
  title: string;
  /** Inputs to set on the hosted form component (via `setInput`). */
  inputs?: Record<string, unknown>;
  /** Footer buttons. Defaults to Cancel + Save. */
  buttons?: DialogButton[];
  width?: string;
  /** Block backdrop/ESC dismiss (default true — protects unsaved edits). */
  disableClose?: boolean;
}

/** Default footer for the form dialog. */
export const DEFAULT_FORM_BUTTONS: DialogButton[] = [
  { label: 'Cancel', role: 'cancel' },
  { label: 'Save', role: 'save' },
];

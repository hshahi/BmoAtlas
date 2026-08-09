import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';

import { ConfirmDialog } from './confirm-dialog/confirm-dialog';
import { WarningDialog } from './warning-dialog/warning-dialog';
import { FormDialog } from './form-dialog/form-dialog';
import {
  ConfirmDialogData,
  WarningDialogData,
  FormDialogConfig,
  FormDialogContent,
} from './dialog.types';

/**
 * Reusable Material dialog service. Stateless singleton — it only opens dialogs
 * on demand; `MatDialog` builds each dialog (and, for the form, the caller's form
 * component) lazily on open and destroys it on close, so nothing is retained
 * between opens.
 *
 * ```ts
 * if (await dialog.confirm({ message: 'Delete this row?' , danger: true })) { … }
 * await dialog.warn({ message: 'Rate limit reached.' });
 * const value = await dialog.openForm({ component: EditPositionForm, title: 'Edit' });
 * if (value) { … save … }
 * ```
 */
@Injectable({ providedIn: 'root' })
export class DialogService {
  private readonly dialog = inject(MatDialog);

  /** Confirm/cancel. Resolves `true` only when confirmed. Closes only via a button. */
  async confirm(data: ConfirmDialogData): Promise<boolean> {
    const ref = this.dialog.open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
      data,
      panelClass: 'sh-dialog-pane',
      disableClose: true, // no backdrop/ESC dismiss — must click Cancel or Confirm
    });
    return (await firstValueFrom(ref.afterClosed())) === true;
  }

  /** Warning with a single OK button. Closes only via OK. */
  async warn(data: WarningDialogData): Promise<void> {
    const ref = this.dialog.open<WarningDialog, WarningDialogData, void>(WarningDialog, {
      data,
      panelClass: ['sh-dialog-pane', 'sh-dialog-pane--warning'],
      disableClose: true, // no backdrop/ESC dismiss — must click OK
    });
    await firstValueFrom(ref.afterClosed());
  }

  /**
   * Open a signal-form in a draggable dialog. Resolves with the form's value on
   * Save (`form().value()`), or `undefined` on Cancel / dismiss.
   */
  async openForm<T, C extends FormDialogContent<T> = FormDialogContent<T>>(
    config: FormDialogConfig<T, C>,
  ): Promise<T | undefined> {
    const ref = this.dialog.open<FormDialog<T>, FormDialogConfig<T, C>, T | undefined>(FormDialog, {
      data: config,
      width: config.width,
      disableClose: config.disableClose ?? true,
      autoFocus: 'first-tabbable',
      panelClass: 'sh-dialog-pane',
    });
    return await firstValueFrom(ref.afterClosed());
  }
}

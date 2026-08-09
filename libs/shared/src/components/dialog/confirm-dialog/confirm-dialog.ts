import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { DialogShell } from '../dialog-shell/dialog-shell';
import { ConfirmDialogData } from '../dialog.types';

/** Generic confirm/cancel dialog. Closes with `true` (confirm) or `false`. */
@Component({
  selector: 'sh-confirm-dialog',
  imports: [MatDialogModule, MatButtonModule, DialogShell],
  template: `
    <sh-dialog-shell [title]="data.title ?? 'Please confirm'">
      <p class="msg">{{ data.message }}</p>
      <button matButton="outlined" shDialogActions [mat-dialog-close]="false">{{ data.cancelText ?? 'Cancel' }}</button>
      <button matButton="outlined" shDialogActions class="confirm" [class.confirm--danger]="data.danger"
              [mat-dialog-close]="true">{{ data.confirmText ?? 'Confirm' }}</button>
    </sh-dialog-shell>
  `,
  styles: [`
    .msg { margin: 0; min-width: 18rem; max-width: 34rem; color: var(--color-text); }
    .confirm--danger { --mat-sys-primary: var(--color-danger); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialog {
  protected readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
}

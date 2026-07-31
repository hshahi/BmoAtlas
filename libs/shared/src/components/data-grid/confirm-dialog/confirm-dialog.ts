import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

/** Data for the generic confirmation dialog. Returns `true` when confirmed. */
export interface ConfirmDialogData {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  /** Style the confirm button as destructive. */
  danger?: boolean;
}

/** Generic confirm/cancel dialog. Closes with `true` (confirm) or `false`/undefined. */
@Component({
  selector: 'app-data-grid-confirm-dialog',
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.title ?? 'Please confirm' }}</h2>
    <mat-dialog-content>
      <p class="msg">{{ data.message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton="outlined" [mat-dialog-close]="false">{{ data.cancelText ?? 'Cancel' }}</button>
      <button matButton="outlined" class="confirm" [class.confirm--danger]="data.danger"
              [mat-dialog-close]="true">{{ data.confirmText ?? 'Confirm' }}</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .msg { margin: 0; min-width: 18rem; max-width: 32rem; color: var(--color-text); }
    .confirm--danger { color: var(--color-danger) !important; border-color: var(--color-danger) !important; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialog {
  protected readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
}

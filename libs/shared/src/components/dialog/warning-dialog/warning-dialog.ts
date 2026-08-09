import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { DialogShell } from '../dialog-shell/dialog-shell';
import { WarningDialogData } from '../dialog.types';

/** Warning dialog (yellow tone) with a single OK button. Closes with no value. */
@Component({
  selector: 'sh-warning-dialog',
  imports: [MatDialogModule, MatButtonModule, DialogShell],
  template: `
    <sh-dialog-shell variant="warning" [title]="'⚠️ ' + (data.title ?? 'Warning')">
      <p class="msg">{{ data.message }}</p>
      <button matButton="outlined" shDialogActions class="ok--warning" mat-dialog-close>{{ data.okText ?? 'OK' }}</button>
    </sh-dialog-shell>
  `,
  styles: [`
    .msg { margin: 0; min-width: 18rem; max-width: 34rem; color: var(--color-text); }
    /* Yellow-toned OK button (outline + label). */
    .ok--warning {
      --mat-sys-primary: var(--color-warning);
      --mdc-outlined-button-outline-color: var(--color-warning);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WarningDialog {
  protected readonly data = inject<WarningDialogData>(MAT_DIALOG_DATA);
}

import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

/** Data passed into the dialog when it is opened. */
export interface ShowcaseDialogData {
  title: string;
  initialNote: string;
}

/** Result returned to the opener via afterClosed(). */
export interface ShowcaseDialogResult {
  note: string;
}

@Component({
  selector: 'app-showcase-dialog',
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>

    <mat-dialog-content>
      <p>Edit the note below and choose an action. The value is returned to the
        opener through <code>afterClosed()</code>.</p>

      <mat-form-field appearance="outline" class="dialog__field">
        <mat-label>Note</mat-label>
        <input matInput [ngModel]="note()" (ngModelChange)="note.set($event)" />
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <!-- mat-dialog-close returns undefined (cancel) -->
      <button matButton="outlined" mat-dialog-close>Cancel</button>
      <!-- explicit close with a typed result -->
      <button matButton="outlined" (click)="save()">Save</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog__field { width: 100%; margin-top: var(--space-sm); }
    code { font-family: var(--font-mono); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowcaseDialog {
  private readonly ref = inject<MatDialogRef<ShowcaseDialog, ShowcaseDialogResult>>(MatDialogRef);
  protected readonly data = inject<ShowcaseDialogData>(MAT_DIALOG_DATA);

  protected readonly note = signal(this.data.initialNote);

  protected save(): void {
    this.ref.close({ note: this.note() });
  }
}

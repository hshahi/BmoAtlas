import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { form, required, min, max, FormField } from '@angular/forms/signals';

import { DataGridFieldConfig } from '../data-grid.types';

/** Data for the generic edit/new form. Closes with the edited value, or undefined. */
export interface EditFormDialogData<T> {
  title: string;
  fields: DataGridFieldConfig[];
  value: T;
}

/**
 * Generic add/edit form built with **Angular signal forms** and Angular Material.
 * It renders one Material control per {@link DataGridFieldConfig} — so the popup
 * adjusts to however many editable properties are supplied — with signal-forms
 * validation (required / min / max) driving the Save button, plus Cancel.
 */
@Component({
  selector: 'app-data-grid-edit-form-dialog',
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatDatepickerModule,
    FormField,
  ],
  providers: [provideNativeDateAdapter()],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>

    <mat-dialog-content>
      <div class="form">
        @for (f of fields; track f.key) {
          @switch (f.type ?? 'text') {
            @case ('select') {
              <mat-form-field appearance="outline" class="ff">
                <mat-label>{{ f.label }}</mat-label>
                <mat-select [formField]="fieldFor(f.key)">
                  @for (o of f.options ?? []; track o.value) {
                    <mat-option [value]="o.value">{{ o.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            }
            @case ('checkbox') {
              <mat-checkbox class="ff ff--check" [formField]="fieldFor(f.key)">{{ f.label }}</mat-checkbox>
            }
            @case ('date') {
              <mat-form-field appearance="outline" class="ff">
                <mat-label>{{ f.label }}</mat-label>
                <input matInput [matDatepicker]="dp" [formField]="fieldFor(f.key)" />
                <mat-datepicker-toggle matIconSuffix [for]="dp" />
                <mat-datepicker #dp />
              </mat-form-field>
            }
            @case ('textarea') {
              <mat-form-field appearance="outline" class="ff">
                <mat-label>{{ f.label }}</mat-label>
                <textarea matInput rows="3" [formField]="fieldFor(f.key)"></textarea>
              </mat-form-field>
            }
            @case ('number') {
              <mat-form-field appearance="outline" class="ff">
                <mat-label>{{ f.label }}</mat-label>
                <input matInput type="number" [step]="f.step ?? 1" [formField]="fieldFor(f.key)" />
              </mat-form-field>
            }
            @default {
              <mat-form-field appearance="outline" class="ff">
                <mat-label>{{ f.label }}</mat-label>
                <input matInput [formField]="fieldFor(f.key)" />
              </mat-form-field>
            }
          }
        }
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button matButton="outlined" (click)="cancel()">Cancel</button>
      <button matButton="outlined" [disabled]="tree().invalid()" (click)="save()">Save</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .form { display: flex; flex-direction: column; gap: var(--space-sm); min-width: 22rem; }
    .ff { width: 100%; }
    .ff--check { margin: var(--space-xs) 0; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditFormDialog<T extends object = Record<string, unknown>> {
  protected readonly data = inject<EditFormDialogData<T>>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<EditFormDialog<T>, T>>(MatDialogRef);

  protected readonly fields = this.data.fields;

  /** Editable working copy — bound fields mutate this signal. */
  private readonly model = signal<Record<string, unknown>>({ ...(this.data.value as Record<string, unknown>) });

  /** Signal form over the model, with per-field validators from the config. */
  protected readonly tree = form(this.model, (p: Record<string, any>) => {
    for (const f of this.fields) {
      if (f.required) required(p[f.key]);
      if (f.type === 'number') {
        if (f.min != null) min(p[f.key], f.min);
        if (f.max != null) max(p[f.key], f.max);
      }
    }
  });

  /** Subfield accessor for `[formField]` (dynamic keys → untyped by necessity). */
  protected fieldFor(key: string): any {
    return (this.tree as any)[key];
  }

  protected save(): void {
    if (this.tree().invalid()) return;
    this.ref.close(this.model() as T);
  }

  protected cancel(): void {
    this.ref.close(undefined);
  }
}

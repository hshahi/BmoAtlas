import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  viewChild,
  AfterViewInit,
  ElementRef,
} from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
  MatDatepickerModule,
  MatDatepicker,
  MatDatepickerInputEvent,
} from '@angular/material/datepicker';
import { MAT_DATE_FORMATS } from '@angular/material/core';
import { provideLuxonDateAdapter } from '@angular/material-luxon-adapter';
import type { ICellEditorAngularComp } from 'ag-grid-angular';
import type { ICellEditorParams } from 'ag-grid-community';
import { DateTime } from 'luxon';

import { applyDateFormat, buildLuxonFormats, toDateTime, toJsDate } from './date-support';

/** Params understood by the date cell editor (in addition to AG Grid's own). */
export interface DateCellEditorParams extends ICellEditorParams {
  /** Luxon display/parse format (e.g. 'dd-MMM-yyyy'). */
  dateFormat?: string;
}

/**
 * AG Grid inline cell editor backed by the Material datepicker (Luxon adapter).
 *
 * Use as a popup editor and pair with `singleClickEdit` so a single click on the
 * cell opens the calendar (see {@link DateCellEditor.afterGuiAttached}). Picking a
 * date commits and closes; closing without a pick reverts. Invalid typed text is
 * rejected via {@link DateCellEditor.isCancelAfterEnd}.
 */
@Component({
  selector: 'app-date-cell-editor',
  imports: [MatFormFieldModule, MatInputModule, MatDatepickerModule],
  // Self-contained: provide the Luxon adapter, then override MAT_DATE_FORMATS with
  // a fresh (mutable) instance so agInit can honour a per-column dateFormat.
  providers: [
    provideLuxonDateAdapter(),
    { provide: MAT_DATE_FORMATS, useFactory: () => buildLuxonFormats() },
  ],
  template: `
    <mat-form-field appearance="outline" class="editor" subscriptSizing="dynamic">
      <input
        matInput
        #input
        [matDatepicker]="picker"
        [value]="value()"
        (dateChange)="onPick($event)"
      />
      <mat-datepicker-toggle matIconSuffix [for]="picker" />
      <mat-datepicker #picker (closed)="onClosed()" />
    </mat-form-field>
  `,
  styles: [`
    :host { display: block; }
    .editor { width: 100%; }
    /* Keep the field flush inside the AG Grid popup cell. */
    .editor .mat-mdc-form-field-subscript-wrapper { display: none; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateCellEditor implements ICellEditorAngularComp, AfterViewInit {
  private readonly formats = inject(MAT_DATE_FORMATS);
  private readonly picker = viewChild.required<MatDatepicker<DateTime>>('picker');
  private readonly input = viewChild.required<ElementRef<HTMLInputElement>>('input');

  protected readonly value = signal<DateTime | null>(null);

  private params!: DateCellEditorParams;
  private committed = false;
  private stopped = false;

  agInit(params: DateCellEditorParams): void {
    this.params = params;
    if (params.dateFormat) applyDateFormat(this.formats, params.dateFormat);
    this.value.set(toDateTime(params.value));
  }

  ngAfterViewInit(): void {
    // One click → focus + open the calendar (no second click needed).
    setTimeout(() => {
      this.input().nativeElement.focus();
      this.picker().open();
    });
  }

  /** Selecting a date (calendar or valid typed value) commits and closes the editor. */
  protected onPick(event: MatDatepickerInputEvent<DateTime>): void {
    this.value.set(event.value);
    this.committed = true;
    this.stop(false);
  }

  /** Closing the calendar without a selection reverts the edit. */
  protected onClosed(): void {
    if (!this.committed) this.stop(true);
  }

  private stop(cancel: boolean): void {
    if (this.stopped) return;
    this.stopped = true;
    this.params.stopEditing(cancel);
  }

  getValue(): Date | null {
    return toJsDate(this.value());
  }

  /** Reject an invalid/unparseable typed value (AG Grid has no built-in date check). */
  isCancelAfterEnd(): boolean {
    const raw = this.input().nativeElement.value?.trim();
    return !!raw && this.value() == null;
  }
}

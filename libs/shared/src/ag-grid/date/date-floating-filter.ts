import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule, MatDatepickerInputEvent } from '@angular/material/datepicker';
import { MAT_DATE_FORMATS } from '@angular/material/core';
import { provideLuxonDateAdapter } from '@angular/material-luxon-adapter';
import type { IFloatingFilterAngularComp } from 'ag-grid-angular';
import type { IFloatingFilterParams } from 'ag-grid-community';
import { DateTime } from 'luxon';

import { applyDateFormat, buildLuxonFormats, toDateTime, toJsDate, fromModelString, DateFilterModel } from './date-support';
import { DateFilter } from './date-filter';

/** Extra params understood by the floating filter. */
export interface DateFloatingFilterParams extends IFloatingFilterParams<DateFilter> {
  dateFormat?: string;
}

/**
 * Compact floating filter backed by the Material datepicker (Luxon adapter).
 * Reflects the parent {@link DateFilter} model and, on pick, pushes a single
 * (equals) date back to the parent. One click opens the calendar.
 */
@Component({
  selector: 'app-date-floating-filter',
  imports: [MatFormFieldModule, MatInputModule, MatDatepickerModule],
  providers: [
    provideLuxonDateAdapter(),
    { provide: MAT_DATE_FORMATS, useFactory: () => buildLuxonFormats() },
  ],
  template: `
    <mat-form-field appearance="outline" subscriptSizing="dynamic" class="ff">
      <!-- No toggle: clicking the input opens the calendar (one-click), which also
           frees width so the full date fits in the narrow floating-filter cell. -->
      <input matInput [matDatepicker]="picker" [value]="value()"
             (dateChange)="onChange($event)" (click)="picker.open()" />
      <mat-datepicker #picker />
    </mat-form-field>
  `,
  styles: [`
    /* Fill the AG floating-filter body and vertically centre a compact field so it
       lines up with the native (Open/High/…) floating filters. */
    :host {
      display: flex;
      align-items: center;
      width: 100%;
      height: 100%;
      min-width: 0;
      --mat-form-field-container-height: 26px;
      --mat-form-field-container-vertical-padding: 2px;
    }
    .ff { width: 100%; min-width: 0; }
    /* Material form fields have an intrinsic ~180px min-width that overflows a
       narrow grid cell and shoves the funnel out — force it to shrink to the cell. */
    :host ::ng-deep .mat-mdc-text-field-wrapper { min-width: 0; }
    :host ::ng-deep .mat-mdc-form-field-infix { min-width: 0; width: auto; }
    /* The toggle makes the flex row taller than the compact infix; centre the
       items so the selected date text is vertically centred (not baseline-high). */
    :host ::ng-deep .mat-mdc-form-field-flex { align-items: center; }
    :host ::ng-deep .mat-mdc-form-field-subscript-wrapper { display: none; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateFloatingFilter implements IFloatingFilterAngularComp {
  private readonly formats = inject(MAT_DATE_FORMATS);
  protected readonly value = signal<DateTime | null>(null);

  private params!: DateFloatingFilterParams;

  agInit(params: DateFloatingFilterParams): void {
    this.params = params;
    if (params.dateFormat) applyDateFormat(this.formats, params.dateFormat);
  }

  /** Reflect the parent filter model (shows the 'from'/equals date). */
  onParentModelChanged(model: DateFilterModel | null): void {
    this.value.set(model ? toDateTime(fromModelString(model.dateFrom)) : null);
  }

  protected onChange(event: MatDatepickerInputEvent<DateTime>): void {
    this.value.set(event.value);
    const date = toJsDate(event.value);
    this.params.parentFilterInstance(instance => instance.onFloatingFilterChanged(date));
  }
}

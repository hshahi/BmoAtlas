import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule, MatDatepickerInputEvent } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MAT_DATE_FORMATS } from '@angular/material/core';
import { provideLuxonDateAdapter } from '@angular/material-luxon-adapter';
import type { IFilterAngularComp } from 'ag-grid-angular';
import type { IFilterParams, IDoesFilterPassParams, IAfterGuiAttachedParams } from 'ag-grid-community';
import { DateTime } from 'luxon';

import {
  applyDateFormat, buildLuxonFormats, compareDatesByDay,
  toDateTime, toJsDate, toModelString, fromModelString,
  DateFilterModel, AnyDateFilterModel, isCombinedModel,
} from './date-support';

type ConditionType = DateFilterModel['type'];
type JoinOperator = 'AND' | 'OR';
type FilterButton = 'apply' | 'clear' | 'cancel' | 'reset';

/** One condition's working state (JS Dates for fast matching). */
interface Condition {
  type: ConditionType;
  from: Date | null;
  to: Date | null;
}

/** Comparator convention: 0 equal, <0 if cell is before filter, >0 if after. */
export type DateFilterComparator = (filterDate: Date, cellDate: Date) => number;

/** All configuration for the date filter (via colDef.filterParams). */
export interface DateFilterParams extends IFilterParams {
  /** Luxon display/parse format (e.g. 'dd-MMM-yyyy'). */
  dateFormat?: string;
  /** Condition selected when the filter first opens (default 'equals'). */
  defaultCondition?: ConditionType;
  /** Override day-granularity comparison. */
  comparator?: DateFilterComparator;
  /** Show Apply/Clear/Reset buttons → filter applies on Apply instead of live. */
  buttons?: FilterButton[];
  /** Let the input be typed freely (don't auto-open the calendar on click). */
  allowTyping?: boolean;
  /** Bound the selectable dates. */
  min?: Date;
  max?: Date;
  /** 1 (default) or 2 conditions joined by AND/OR. */
  maxConditions?: 1 | 2;
  /** Default join when maxConditions = 2 (default 'AND'). */
  defaultJoinOperator?: JoinOperator;
  /** Live mode only: close the popup as soon as a date is selected. */
  closeOnSelect?: boolean;
}

/**
 * AG Grid column filter backed by Material datepickers (Luxon adapter). Everything
 * is driven by `filterParams`: condition type, live vs Apply/Clear, typed entry,
 * min/max bounds, custom comparator, and an optional second condition with a
 * Material AND/OR toggle. Emits an AG-Grid-compatible (single or combined) model.
 */
@Component({
  selector: 'app-date-filter',
  imports: [
    NgTemplateOutlet,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatDatepickerModule, MatButtonModule, MatRadioModule,
  ],
  providers: [
    provideLuxonDateAdapter(),
    { provide: MAT_DATE_FORMATS, useFactory: () => buildLuxonFormats() },
  ],
  template: `
    <div class="date-filter">
      <!-- Condition 1 -->
      <ng-container
        [ngTemplateOutlet]="conditionTpl"
        [ngTemplateOutletContext]="{ n: 1, type: c1Type(), from: c1From(), to: c1To() }" />

      @if (maxConditions === 2) {
        <mat-radio-group class="join" [value]="joinOp()" (change)="setJoin($event.value)">
          <mat-radio-button value="AND">AND</mat-radio-button>
          <mat-radio-button value="OR">OR</mat-radio-button>
        </mat-radio-group>

        <!-- Condition 2 -->
        <ng-container
          [ngTemplateOutlet]="conditionTpl"
          [ngTemplateOutletContext]="{ n: 2, type: c2Type(), from: c2From(), to: c2To() }" />
      }

      @if (buttons.length) {
        <div class="buttons">
          @if (buttons.includes('reset')) { <button matButton (click)="reset()">Reset</button> }
          @if (buttons.includes('cancel')) { <button matButton (click)="cancel()">Cancel</button> }
          @if (buttons.includes('clear')) { <button matButton (click)="clear()">Clear</button> }
          @if (buttons.includes('apply')) {
            <button matButton="outlined" (click)="apply()">Apply</button>
          }
        </div>
      }
    </div>

    <!-- Reusable condition row (select + from [+ to]). panelClass tags the Material
         overlays as part of the grid popup so interacting with the calendar/select
         doesn't auto-close the filter popup (it waits for Apply/Cancel). -->
    <ng-template #conditionTpl let-n="n" let-type="type" let-from="from" let-to="to">
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-select panelClass="ag-custom-component-popup"
                    [value]="type" (selectionChange)="setType(n, $event.value)">
          <mat-option value="equals">Equals</mat-option>
          <mat-option value="before">Before</mat-option>
          <mat-option value="after">After</mat-option>
          <mat-option value="inRange">In range</mat-option>
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>{{ type === 'inRange' ? 'From' : 'Date' }}</mat-label>
        <input matInput [matDatepicker]="fromP" [value]="from" [min]="minDt()" [max]="maxDt()"
               (dateChange)="setFrom(n, $event)" (click)="allowTyping ? null : fromP.open()" />
        <mat-datepicker-toggle matIconSuffix [for]="fromP" />
        <mat-datepicker #fromP panelClass="ag-custom-component-popup" />
      </mat-form-field>

      @if (type === 'inRange') {
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>To</mat-label>
          <input matInput [matDatepicker]="toP" [value]="to" [min]="minDt()" [max]="maxDt()"
                 (dateChange)="setTo(n, $event)" (click)="allowTyping ? null : toP.open()" />
          <mat-datepicker-toggle matIconSuffix [for]="toP" />
          <mat-datepicker #toP panelClass="ag-custom-component-popup" />
        </mat-form-field>
      }
    </ng-template>
  `,
  styles: [`
    .date-filter { display: flex; flex-direction: column; gap: var(--space-sm); padding: var(--space-sm); min-width: 16rem; }
    mat-form-field { width: 100%; }
    .join { display: flex; gap: var(--space-md); }
    .buttons { display: flex; justify-content: flex-end; gap: var(--space-xs); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateFilter implements IFilterAngularComp {
  private readonly formats = inject(MAT_DATE_FORMATS);

  // Condition 1 UI
  protected readonly c1Type = signal<ConditionType>('equals');
  protected readonly c1From = signal<DateTime | null>(null);
  protected readonly c1To = signal<DateTime | null>(null);
  // Condition 2 UI
  protected readonly c2Type = signal<ConditionType>('equals');
  protected readonly c2From = signal<DateTime | null>(null);
  protected readonly c2To = signal<DateTime | null>(null);
  protected readonly joinOp = signal<JoinOperator>('AND');

  // Config
  protected maxConditions: 1 | 2 = 1;
  protected buttons: FilterButton[] = [];
  protected allowTyping = false;
  private closeOnSelect = false;
  private minDate: Date | null = null;
  private maxDate: Date | null = null;

  /** Set by AG Grid each time the popup opens; closes it on Apply/Cancel. */
  private hidePopup?: () => void;
  protected readonly minDt = computed(() => (this.minDate ? toDateTime(this.minDate) : null));
  protected readonly maxDt = computed(() => (this.maxDate ? toDateTime(this.maxDate) : null));

  /** Effective (applied) filter — what actually matches rows. */
  private readonly applied = signal<{ conds: Condition[]; op: JoinOperator } | null>(null);

  private params!: DateFilterParams;
  private userComparator: DateFilterComparator | undefined;

  agInit(params: DateFilterParams): void {
    this.params = params;
    if (params.dateFormat) applyDateFormat(this.formats, params.dateFormat);
    this.userComparator = params.comparator;
    this.maxConditions = params.maxConditions ?? 1;
    this.buttons = params.buttons ?? [];
    this.allowTyping = params.allowTyping ?? false;
    this.minDate = params.min ?? null;
    this.maxDate = params.max ?? null;
    this.closeOnSelect = params.closeOnSelect ?? false;
    this.joinOp.set(params.defaultJoinOperator ?? 'AND');
    const dc = params.defaultCondition ?? 'equals';
    this.c1Type.set(dc);
    this.c2Type.set(dc);
  }

  /** AG Grid calls this whenever the filter popup opens — capture how to close it. */
  afterGuiAttached(params?: IAfterGuiAttachedParams): void {
    this.hidePopup = params?.hidePopup;
  }

  private get live(): boolean {
    return !this.buttons.includes('apply');
  }

  // ── UI events (n = condition index 1|2) ─────────────────────────
  protected setType(n: number, type: ConditionType): void {
    (n === 1 ? this.c1Type : this.c2Type).set(type);
    if (type !== 'inRange') (n === 1 ? this.c1To : this.c2To).set(null);
    this.onChange(false);
  }
  protected setFrom(n: number, e: MatDatepickerInputEvent<DateTime>): void {
    (n === 1 ? this.c1From : this.c2From).set(e.value);
    this.onChange(true);
  }
  protected setTo(n: number, e: MatDatepickerInputEvent<DateTime>): void {
    (n === 1 ? this.c1To : this.c2To).set(e.value);
    this.onChange(true);
  }
  protected setJoin(op: JoinOperator): void {
    this.joinOp.set(op);
    this.onChange(false);
  }

  /**
   * Live mode commits immediately (and, if closeOnSelect, closes the popup once a
   * date is picked). Apply mode buffers and waits for the Apply button.
   */
  private onChange(dateSelected: boolean): void {
    if (!this.live) return;
    this.commit();
    if (dateSelected && this.closeOnSelect) this.hidePopup?.();
  }

  protected apply(): void {
    this.commit();
    this.hidePopup?.();
  }

  /** Cancel: clear the dates + the active filter, then close the popup. */
  protected cancel(): void {
    this.clear();
  }

  protected clear(): void {
    this.resetUi();
    this.applied.set(null);
    this.params.filterChangedCallback();
    this.hidePopup?.();
  }

  protected reset(): void { this.clear(); }

  private resetUi(): void {
    const dc = this.params?.defaultCondition ?? 'equals';
    this.c1Type.set(dc); this.c1From.set(null); this.c1To.set(null);
    this.c2Type.set(dc); this.c2From.set(null); this.c2To.set(null);
    this.joinOp.set(this.params?.defaultJoinOperator ?? 'AND');
  }

  private commit(): void {
    this.applied.set(this.buildApplied());
    this.params.filterChangedCallback();
  }

  private buildApplied(): { conds: Condition[]; op: JoinOperator } | null {
    const conds: Condition[] = [];
    const a1 = this.activeCondition(this.c1Type(), this.c1From(), this.c1To());
    if (a1) conds.push(a1);
    if (this.maxConditions === 2) {
      const a2 = this.activeCondition(this.c2Type(), this.c2From(), this.c2To());
      if (a2) conds.push(a2);
    }
    return conds.length ? { conds, op: this.joinOp() } : null;
  }

  private activeCondition(type: ConditionType, from: DateTime | null, to: DateTime | null): Condition | null {
    const f = toJsDate(from);
    if (!f) return null;
    return { type, from: f, to: toJsDate(to) };
  }

  // ── IFilterAngularComp ──────────────────────────────────────────
  isFilterActive(): boolean {
    return this.applied() !== null;
  }

  doesFilterPass(p: IDoesFilterPassParams): boolean {
    const applied = this.applied();
    if (!applied) return true;
    const cell = toJsDate(toDateTime(this.params.getValue(p.node)));
    if (!cell) return false;
    const results = applied.conds.map(c => this.passes(cell, c));
    return applied.op === 'AND' ? results.every(Boolean) : results.some(Boolean);
  }

  getModel(): AnyDateFilterModel | null {
    const a = this.applied();
    if (!a) return null;
    const models = a.conds.map(c => this.toModel(c));
    if (models.length === 1) return models[0];
    return { filterType: 'date', operator: a.op, conditions: models };
  }

  setModel(model: AnyDateFilterModel | null): void {
    if (!model) {
      this.resetUi();
      this.applied.set(null);
      return;
    }
    if (isCombinedModel(model)) {
      this.applyModelToUi(1, model.conditions[0]);
      this.applyModelToUi(2, model.conditions[1]);
      this.joinOp.set(model.operator);
    } else {
      this.applyModelToUi(1, model);
      this.c2Type.set(this.params?.defaultCondition ?? 'equals');
      this.c2From.set(null);
      this.c2To.set(null);
    }
    this.applied.set(this.buildApplied());
  }

  /** Called by the floating filter (single date → equals). */
  onFloatingFilterChanged(date: Date | null): void {
    this.c1Type.set('equals');
    this.c1From.set(toDateTime(date));
    this.c1To.set(null);
    this.commit();
  }

  // ── helpers ─────────────────────────────────────────────────────
  private passes(cell: Date, cond: Condition): boolean {
    if (!cond.from) return true;
    const cmpFrom = this.cmp(cond.from, cell);
    switch (cond.type) {
      case 'equals': return cmpFrom === 0;
      case 'before': return cmpFrom < 0;
      case 'after':  return cmpFrom > 0;
      case 'inRange':
        if (!cond.to) return cmpFrom >= 0;
        return cmpFrom >= 0 && this.cmp(cond.to, cell) <= 0;
    }
  }

  private cmp(filterDate: Date, cellDate: Date): number {
    return this.userComparator ? this.userComparator(filterDate, cellDate) : compareDatesByDay(cellDate, filterDate);
  }

  private toModel(c: Condition): DateFilterModel {
    return { filterType: 'date', type: c.type, dateFrom: toModelString(c.from), dateTo: toModelString(c.to) };
  }

  private applyModelToUi(n: number, m: DateFilterModel | undefined): void {
    const type = m?.type ?? 'equals';
    const from = toDateTime(fromModelString(m?.dateFrom));
    const to = toDateTime(fromModelString(m?.dateTo));
    if (n === 1) { this.c1Type.set(type); this.c1From.set(from); this.c1To.set(to); }
    else { this.c2Type.set(type); this.c2From.set(from); this.c2To.set(to); }
  }
}

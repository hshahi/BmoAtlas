import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import type { IHeaderAngularComp } from 'ag-grid-angular';
import type { IHeaderParams } from 'ag-grid-community';
import type { StockEntry } from '../../models/stock.models';

/** Params passed to the summary action header via `headerComponentParams`. */
export interface SummaryActionHeaderParams extends IHeaderParams<StockEntry> {
  /** Insert a blank row at the top and open it for editing. */
  onNew: () => void;
}

/**
 * Header cell for the pinned-left action column: a single "New" (+) button that
 * sits above the first column. Bespoke to the summary grid (mirrors the data-grid
 * new-row feature without pulling in the generic component).
 */
@Component({
  selector: 'app-summary-action-header',
  imports: [MatButtonModule],
  template: `
    <button matIconButton type="button" class="icon icon--new" title="Add new row" (click)="add()">
      <i class="fa-solid fa-plus"></i>
    </button>
  `,
  styles: [`
    :host { --mat-icon-button-state-layer-size: 28px; display: inline-flex; align-items: center; height: 100%; }
    .icon { font-size: 13px; color: var(--color-text-secondary); }
    .icon--new:hover { color: var(--color-success); }
    :host ::ng-deep .mat-mdc-button-touch-target { display: none; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SummaryActionHeader implements IHeaderAngularComp {
  private params!: SummaryActionHeaderParams;

  agInit(params: SummaryActionHeaderParams): void { this.params = params; }

  refresh(params: SummaryActionHeaderParams): boolean { this.params = params; return true; }

  protected add(): void { this.params.onNew(); }
}

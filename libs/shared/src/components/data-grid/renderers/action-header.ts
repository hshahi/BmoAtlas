import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import type { IHeaderAngularComp } from 'ag-grid-angular';
import type { IHeaderParams } from 'ag-grid-community';
import type { DataGridFeatures } from '../data-grid.types';

/** Params passed to the action header via `headerComponentParams`. */
export interface ActionHeaderParams<T> extends IHeaderParams<T> {
  features: DataGridFeatures;
  onExport: () => void;
  onNew: () => void;
}

/**
 * Header cell for the pinned-left action column. Holds the export-to-CSV and
 * "new" (insert blank row) icons in place of a column title.
 */
@Component({
  selector: 'app-data-grid-action-header',
  imports: [MatButtonModule],
  template: `
    <div class="hdr">
      @if (features().export) {
        <button matIconButton type="button" class="icon" title="Export to CSV" (click)="exportCsv()">
          <i class="fa-solid fa-file-csv"></i>
        </button>
      }
      @if (features().new) {
        <button matIconButton type="button" class="icon icon--new" title="New row" (click)="create()">
          <i class="fa-solid fa-plus"></i>
        </button>
      }
    </div>
  `,
  styles: [`
    /* Compact icon buttons; drop Material's 48px invisible touch target so the
       two header icons don't overlap in the narrow action column. */
    :host { --mat-icon-button-state-layer-size: 28px; }
    .hdr { display: inline-flex; align-items: center; gap: 2px; height: 100%; }
    .icon { font-size: 13px; color: var(--color-text-secondary); }
    .icon:hover { color: var(--color-primary); }
    .icon--new:hover { color: var(--color-success); }
    :host ::ng-deep .mat-mdc-button-touch-target { display: none; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionHeader<T> implements IHeaderAngularComp {
  protected readonly features = signal<DataGridFeatures>({});

  private params!: ActionHeaderParams<T>;

  agInit(params: ActionHeaderParams<T>): void {
    this.params = params;
    this.features.set(params.features ?? {});
  }

  refresh(params: ActionHeaderParams<T>): boolean {
    this.params = params;
    this.features.set(params.features ?? {});
    return true;
  }

  protected exportCsv(): void { this.params.onExport(); }
  protected create(): void { this.params.onNew(); }
}
